import { rodapeAntigo } from "@/lib/leads/analiseSite"
import { ROTULO_TIPO_DE_LINK, classificarLink, ehLinkDeWhatsApp } from "@/lib/leads/presencaDigital"
import type { Lead } from "@/types/lead"

// "Por que esse lead": as mesmas pistas que pesam no score
// (public.calcular_score_lead), em texto que serve de argumento na abordagem.
// oportunidade = o que dá pra vender; potencial = por que vale a pena tentar.
export type TipoMotivo = "oportunidade" | "potencial"

// Abaixo disso a nota do Google não diz muita coisa (5,0 com 1 avaliação).
// Mesmo limite do score em public.calcular_score_lead.
export const MINIMO_AVALIACOES_CONFIAVEIS = 5

export type MotivoDoLead = {
  id: string
  texto: string
  tipo: TipoMotivo
  detalhe?: string
}

export type CamposDosMotivos = Pick<
  Lead,
  | "tem_site"
  | "site_url"
  | "instagram_handle"
  | "instagram_seguidores"
  | "instagram_ultimo_post_dias"
  | "perfil_reivindicado"
  | "fotos_count"
  | "tem_descricao"
  | "tem_horario"
  | "google_avaliacoes_count"
  | "google_avaliacoes_sem_resposta"
  | "google_rating"
  | "site_status"
  | "site_detalhe"
  | "site_url_final"
  | "site_https"
  | "site_responsivo"
  | "site_tem_whatsapp"
  | "site_plataforma"
  | "site_dominio_gratuito"
  | "site_ano_rodape"
  | "site_nota_celular"
  | "site_carregamento_ms"
  | "site_analisado_em"
>

const inteiro = new Intl.NumberFormat("pt-BR")
const nota = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function motivoDeSite(lead: CamposDosMotivos): MotivoDoLead | null {
  if (lead.tem_site !== false) return null

  // O link do Google redirecionava para rede social: vale o destino.
  const link = classificarLink(
    lead.site_status === "nao_e_site" && lead.site_url_final ? lead.site_url_final : lead.site_url
  )
  if (!link || link.tipo === "site") {
    return { id: "sem_site", texto: "Sem site", tipo: "oportunidade" }
  }
  if (ehLinkDeWhatsApp(link.url)) {
    return {
      id: "so_whatsapp",
      texto: "Só WhatsApp",
      tipo: "oportunidade",
      detalhe: `No lugar do site, o Google mostra: ${link.url}`,
    }
  }
  if (link.tipo === "rede_social") {
    return {
      id: "so_rede_social",
      texto: link.instagramHandle || lead.instagram_handle ? "Só Instagram" : "Só rede social",
      tipo: "oportunidade",
      detalhe: `No lugar do site, o Google mostra: ${link.url}`,
    }
  }
  return {
    id: link.tipo,
    texto: ROTULO_TIPO_DE_LINK[link.tipo],
    tipo: "oportunidade",
    detalhe: `No lugar do site, o Google mostra: ${link.url}`,
  }
}

const segundos = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })

function detalheDaVelocidade(lead: CamposDosMotivos): string {
  const partes = [`Nota ${lead.site_nota_celular} de 100 no PageSpeed (celular)`]
  if (lead.site_carregamento_ms !== null) {
    partes.push(`o conteúdo principal aparece em ${segundos.format(lead.site_carregamento_ms / 1000)} s`)
  }
  return partes.join("; ") + "."
}

// Problemas encontrados na análise do site (só de quem tem site próprio).
function motivosDoSite(lead: CamposDosMotivos): MotivoDoLead[] {
  if (lead.tem_site !== true) return []
  const detalhe = lead.site_detalhe ?? undefined

  switch (lead.site_status) {
    case "fora_do_ar":
      return [{ id: "site_fora_do_ar", texto: "Site fora do ar", tipo: "oportunidade", detalhe }]
    case "sem_conteudo":
      return [{ id: "site_sem_conteudo", texto: "Site sem conteúdo", tipo: "oportunidade", detalhe }]
    case "certificado_invalido":
      return [{ id: "site_inseguro", texto: "Site com alerta de inseguro", tipo: "oportunidade", detalhe }]
    case "ok":
      break
    default:
      return []
  }

  const motivos: MotivoDoLead[] = []
  const nota = lead.site_nota_celular
  if (nota !== null && nota < 70) {
    motivos.push({
      id: "site_lento",
      texto: nota < 50 ? "Site lento no celular" : "Site um pouco lento no celular",
      tipo: "oportunidade",
      detalhe: detalheDaVelocidade(lead),
    })
  }
  if (lead.site_responsivo === false) {
    motivos.push({
      id: "site_nao_responsivo",
      texto: "Site não se adapta ao celular",
      tipo: "oportunidade",
      detalhe: "A página não tem ajuste para celular: aparece a versão de computador, miúda.",
    })
  }
  if (lead.site_https === false) {
    motivos.push({
      id: "site_sem_https",
      texto: "Site sem HTTPS",
      tipo: "oportunidade",
      detalhe: "O navegador mostra \"Não seguro\" ao lado do endereço.",
    })
  }
  if (lead.site_dominio_gratuito) {
    motivos.push({
      id: "site_dominio_gratuito",
      texto: "Site em endereço gratuito",
      tipo: "oportunidade",
      detalhe: `Feito no ${lead.site_plataforma ?? "construtor"}, sem domínio próprio.`,
    })
  }
  if (lead.site_tem_whatsapp === false) {
    motivos.push({ id: "site_sem_whatsapp", texto: "Site sem botão de WhatsApp", tipo: "oportunidade" })
  }
  if (rodapeAntigo(lead.site_ano_rodape, lead.site_analisado_em)) {
    motivos.push({
      id: "site_rodape_antigo",
      texto: `Rodapé de ${lead.site_ano_rodape}`,
      tipo: "oportunidade",
      detalhe: "O ano no rodapé sugere que o site não é atualizado há tempo.",
    })
  }
  return motivos
}

export function motivosDoLead(lead: CamposDosMotivos): MotivoDoLead[] {
  const motivos: MotivoDoLead[] = []
  const add = (m: MotivoDoLead | null) => {
    if (m) motivos.push(m)
  }

  // Oportunidades, na ordem do peso no score
  add(motivoDeSite(lead))
  motivosDoSite(lead).forEach(add)

  if (lead.perfil_reivindicado === false) {
    add({
      id: "perfil_sem_dono",
      texto: "Perfil Google sem dono",
      tipo: "oportunidade",
      detalhe: "O dono nunca reivindicou o perfil da empresa no Google.",
    })
  }

  if (lead.fotos_count !== null && lead.fotos_count < 5) {
    add({
      id: "poucas_fotos",
      texto:
        lead.fotos_count === 0
          ? "Nenhuma foto no Google"
          : `Só ${lead.fotos_count} ${lead.fotos_count === 1 ? "foto" : "fotos"} no Google`,
      tipo: "oportunidade",
    })
  }

  if (lead.tem_descricao === false || lead.tem_horario === false) {
    add({
      id: "perfil_incompleto",
      texto: "Perfil incompleto",
      tipo: "oportunidade",
      detalhe: [
        lead.tem_descricao === false ? "sem descrição" : null,
        lead.tem_horario === false ? "sem horário de funcionamento" : null,
      ]
        .filter(Boolean)
        .join(", "),
    })
  }

  if ((lead.google_avaliacoes_sem_resposta ?? 0) >= 5) {
    add({
      id: "avaliacoes_sem_resposta",
      texto: `${lead.google_avaliacoes_sem_resposta} avaliações sem resposta`,
      tipo: "oportunidade",
    })
  }

  if ((lead.instagram_ultimo_post_dias ?? 0) >= 30) {
    add({
      id: "instagram_parado",
      texto: `Instagram parado há ${lead.instagram_ultimo_post_dias} dias`,
      tipo: "oportunidade",
    })
  }

  // Potencial
  if ((lead.google_avaliacoes_count ?? 0) >= 30) {
    add({
      id: "muitas_avaliacoes",
      texto: `${inteiro.format(lead.google_avaliacoes_count ?? 0)} avaliações`,
      tipo: "potencial",
      detalhe: "Muitas avaliações indicam movimento real.",
    })
  }

  if (
    (lead.google_rating ?? 0) >= 4 &&
    (lead.google_avaliacoes_count ?? 0) >= MINIMO_AVALIACOES_CONFIAVEIS
  ) {
    add({ id: "boa_nota", texto: `Nota ${nota.format(lead.google_rating ?? 0)}`, tipo: "potencial" })
  }

  if (lead.instagram_handle && (lead.instagram_seguidores ?? 0) >= 1000) {
    add({
      id: "audiencia",
      texto: `${inteiro.format(lead.instagram_seguidores ?? 0)} seguidores`,
      tipo: "potencial",
    })
  }

  return motivos
}

// Tem site próprio, mas a análise achou defeito (fora do ar, lento, sem HTTPS...).
export function temSiteComProblema(lead: CamposDosMotivos): boolean {
  return lead.tem_site === true && motivosDoSite(lead).length > 0
}
