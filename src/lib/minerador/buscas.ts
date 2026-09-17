import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { ANALISE_DE_SITE_VAZIA, type AtualizacaoDeSite } from "@/lib/leads/analiseSite"
import {
  STATUS_TERMINAIS_APIFY,
  baixarDataset,
  buscarRun,
  iniciarRunGoogleMaps,
  type ApifyRun,
} from "@/lib/minerador/apify"
import {
  estimarCustoUsd,
  limiteCobrancaUsd,
  montarInputApify,
  montarOrigem,
  prepararLeads,
  type LeadMinerado,
  type NovaBusca,
} from "@/lib/minerador/regras"
import type { Database, Tables, TablesInsert } from "@/types/database.types"

type Admin = SupabaseClient<Database>
type Busca = Tables<"buscas">

// Busca em 'processando' sem atualização há mais que isso é considerada
// abandonada (a função morreu no meio) e pode ser retomada — o processamento é
// idempotente, repetir não duplica leads.
const PROCESSAMENTO_TRAVADO_MS = 5 * 60 * 1000
const LOTE_ESCRITA = 500
// maps_url é longa e vai na query string do PostgREST: lotes pequenos.
const LOTE_CONSULTA_URL = 40
const LOTE_CONSULTA_PLACE = 150

function chunks<T>(lista: T[], tamanho: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < lista.length; i += tamanho) out.push(lista.slice(i, i + tamanho))
  return out
}

function mensagemDeErro(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "object" && err !== null && "message" in err) return String(err.message)
  return String(err)
}

// URL do webhook só quando o app tem endereço público (em dev local o Apify não
// alcança localhost; aí a tela sincroniza sozinha).
export function urlDoWebhook(): string | null {
  const appUrl = process.env.APP_URL?.replace(/\/+$/, "")
  const segredo = process.env.APIFY_WEBHOOK_SECRET
  if (!appUrl || !segredo || !appUrl.startsWith("https://")) return null
  return `${appUrl}/api/apify/webhook?segredo=${encodeURIComponent(segredo)}`
}

export async function iniciarBusca(
  admin: Admin,
  { orgId, userId, nova }: { orgId: string; userId: string; nova: NovaBusca }
): Promise<Busca> {
  const { data: busca, error } = await admin
    .from("buscas")
    .insert({
      org_id: orgId,
      criado_por: userId,
      nicho: nova.nicho,
      uf: nova.uf,
      cidade: nova.cidade,
      bairro: nova.bairro,
      max_resultados: nova.maxResultados,
      filtros: nova.filtros,
      status: "iniciando",
      custo_estimado_usd: estimarCustoUsd(nova),
    })
    .select()
    .single()
  if (error) throw error

  let run: ApifyRun
  try {
    run = await iniciarRunGoogleMaps(montarInputApify(nova), {
      limiteCobrancaUsd: limiteCobrancaUsd(nova),
      webhookUrl: urlDoWebhook(),
    })
  } catch (err) {
    const { data: comErro } = await admin
      .from("buscas")
      .update({
        status: "erro",
        erro: `Não foi possível iniciar a busca no Apify. ${mensagemDeErro(err)}`,
        concluido_em: new Date().toISOString(),
      })
      .eq("id", busca.id)
      .select()
      .single()
    return comErro ?? busca
  }

  const { data: rodando, error: updError } = await admin
    .from("buscas")
    .update({ status: "rodando", apify_run_id: run.id, apify_dataset_id: run.defaultDatasetId })
    .eq("id", busca.id)
    .select()
    .single()
  if (updError) throw updError
  return rodando
}

function processamentoTravado(busca: Busca): boolean {
  return (
    busca.status === "processando" &&
    Date.now() - new Date(busca.atualizado_em).getTime() > PROCESSAMENTO_TRAVADO_MS
  )
}

// Leva a busca adiante se a run do Apify já terminou. Chamada tanto pelo
// webhook quanto pela tela (sincronização); segura contra chamadas simultâneas.
export async function avancarBusca(admin: Admin, buscaId: string): Promise<Busca | null> {
  const { data: busca, error } = await admin.from("buscas").select().eq("id", buscaId).maybeSingle()
  if (error) throw error
  if (!busca) return null

  const precisaAvancar = busca.status === "rodando" || processamentoTravado(busca)
  if (!precisaAvancar || !busca.apify_run_id) return busca

  const run = await buscarRun(busca.apify_run_id)
  if (!STATUS_TERMINAIS_APIFY.includes(run.status)) return busca

  // Reserva atômica: só um processo passa daqui por vez.
  const limiteTravado = new Date(Date.now() - PROCESSAMENTO_TRAVADO_MS).toISOString()
  const { data: reservada, error: reservaError } = await admin
    .from("buscas")
    .update({ status: "processando" })
    .eq("id", busca.id)
    .or(`status.eq.rodando,and(status.eq.processando,atualizado_em.lt."${limiteTravado}")`)
    .select()
    .maybeSingle()
  if (reservaError) throw reservaError
  if (!reservada) {
    const { data: atual } = await admin.from("buscas").select().eq("id", busca.id).single()
    return atual
  }

  const avisoRun =
    run.status === "SUCCEEDED"
      ? null
      : `A execução no Apify terminou com status ${run.status}; foi salvo o que já tinha sido encontrado.`

  let final: Database["public"]["Tables"]["buscas"]["Update"]
  try {
    const resultado = await salvarResultados(admin, reservada, run.defaultDatasetId)
    final = {
      ...resultado,
      status: avisoRun && resultado.total_encontrados === 0 ? "erro" : "concluida",
      erro: avisoRun,
      concluido_em: new Date().toISOString(),
    }
  } catch (err) {
    console.error("Erro ao processar busca", busca.id, err)
    final = {
      status: "erro",
      erro: `Erro ao salvar os leads: ${mensagemDeErro(err)}`,
      concluido_em: new Date().toISOString(),
    }
  }

  const { data: finalizada, error: finalError } = await admin
    .from("buscas")
    .update(final)
    .eq("id", busca.id)
    .select()
    .single()
  if (finalError) throw finalError
  return finalizada
}

// Inclui a análise do site: o upsert em lote manda as mesmas colunas em todas
// as linhas, então quem não muda precisa ir com o valor atual.
const CAMPOS_DO_EXISTENTE =
  "id, place_id, maps_url, instagram_handle, site_url, site_analisado_em, site_status, site_detalhe, site_url_final, site_https, site_responsivo, site_tem_whatsapp, site_plataforma, site_dominio_gratuito, site_ano_rodape, site_nota_celular, site_carregamento_ms"

type LeadExistente = {
  id: string
  place_id: string | null
  maps_url: string | null
  instagram_handle: string | null
  site_url: string | null
} & Omit<AtualizacaoDeSite, "tem_site">

async function buscarExistentes(admin: Admin, orgId: string, leads: LeadMinerado[]) {
  const porPlace = new Map<string, LeadExistente>()
  const porUrl = new Map<string, LeadExistente>()

  const guardar = (rows: LeadExistente[] | null) => {
    for (const row of rows ?? []) {
      if (row.place_id) porPlace.set(row.place_id, row)
      if (row.maps_url) porUrl.set(row.maps_url, row)
    }
  }

  const placeIds = leads.map((l) => l.place_id).filter((p): p is string => !!p)
  for (const lote of chunks(placeIds, LOTE_CONSULTA_PLACE)) {
    const { data, error } = await admin
      .from("leads")
      .select(CAMPOS_DO_EXISTENTE)
      .eq("org_id", orgId)
      .in("place_id", lote)
    if (error) throw error
    guardar(data)
  }

  for (const lote of chunks(leads.map((l) => l.maps_url), LOTE_CONSULTA_URL)) {
    const { data, error } = await admin
      .from("leads")
      .select(CAMPOS_DO_EXISTENTE)
      .eq("org_id", orgId)
      .in("maps_url", lote)
    if (error) throw error
    guardar(data)
  }

  return (lead: LeadMinerado): LeadExistente | undefined =>
    (lead.place_id ? porPlace.get(lead.place_id) : undefined) ?? porUrl.get(lead.maps_url)
}

async function salvarResultados(admin: Admin, busca: Busca, datasetId: string) {
  const itens = await baixarDataset(datasetId)
  const { leads, ignorados } = prepararLeads(itens)
  const existente = await buscarExistentes(admin, busca.org_id, leads)

  const novos: TablesInsert<"leads">[] = []
  const atualizacoes: TablesInsert<"leads">[] = []

  for (const lead of leads) {
    const achado = existente(lead)
    if (!achado) {
      // Lead novo fica fora do CRM até alguém escolher enviá-lo (no_funil).
      novos.push({
        ...lead,
        // Negócio sem endereço público (atende na casa do cliente, online...)
        // vem sem cidade; ele apareceu na busca daquela cidade.
        cidade: lead.cidade ?? busca.cidade,
        org_id: busca.org_id,
        origem: montarOrigem(busca),
        no_funil: false,
        etapa: "novo",
      })
      continue
    }

    // Já existia: atualiza só os dados do Google. Etapa, observações, origem e
    // no_funil ficam como estão; maps_url também (evita colidir com outra linha).
    const { maps_url: _mapsUrl, place_id, instagram_handle, ...dadosGoogle } = lead
    const {
      id: _id,
      place_id: _placeId,
      maps_url: _mapsUrlAtual,
      instagram_handle: _instagram,
      site_url: linkAtual,
      ...analiseAtual
    } = achado
    const mesmoLink = linkAtual === dadosGoogle.site_url
    atualizacoes.push({
      ...dadosGoogle,
      // Análise do site vale enquanto o link for o mesmo; link novo, análise zerada.
      ...(mesmoLink ? analiseAtual : ANALISE_DE_SITE_VAZIA),
      // Link que redireciona para rede social continua contando como sem site.
      ...(mesmoLink && achado.site_status === "nao_e_site" ? { tem_site: false } : {}),
      id: achado.id,
      org_id: busca.org_id,
      place_id: achado.place_id ?? place_id,
      // @ digitado à mão vale mais que o deduzido do link do Google
      instagram_handle: achado.instagram_handle ?? instagram_handle,
    })
  }

  const idsVinculados: string[] = []

  for (const lote of chunks(novos, LOTE_ESCRITA)) {
    const { data, error } = await admin.from("leads").insert(lote).select("id")
    if (error) throw error
    idsVinculados.push(...data.map((r) => r.id))
  }

  for (const lote of chunks(atualizacoes, LOTE_ESCRITA)) {
    const { data, error } = await admin.from("leads").upsert(lote, { onConflict: "id" }).select("id")
    if (error) throw error
    idsVinculados.push(...data.map((r) => r.id))
  }

  for (const lote of chunks(idsVinculados, LOTE_ESCRITA)) {
    const { error } = await admin
      .from("buscas_leads")
      .upsert(
        lote.map((leadId) => ({ busca_id: busca.id, lead_id: leadId, org_id: busca.org_id })),
        { onConflict: "busca_id,lead_id", ignoreDuplicates: true }
      )
    if (error) throw error
  }

  return {
    total_encontrados: itens.length,
    novos: novos.length,
    ja_existiam: atualizacoes.length,
    ignorados,
  }
}
