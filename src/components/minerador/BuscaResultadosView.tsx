"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeftIcon, DownloadIcon, GlobeIcon, Loader2Icon, SendIcon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import { BuscaStatusBadge } from "@/components/minerador/BuscaStatusBadge"
import { ResultadosTable } from "@/components/minerador/ResultadosTable"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useBusca, useBuscaLeads, useEnviarAoCrm } from "@/hooks/useBuscas"
import { CHAVE_FUNIL } from "@/hooks/useLeads"
import { analisarSiteDoLead } from "@/lib/leads/api"
import { MINIMO_AVALIACOES_CONFIAVEIS, temSiteComProblema } from "@/lib/leads/motivos"
import { classificarLink } from "@/lib/leads/presencaDigital"
import { baixarCsv, leadsParaCsv, nomeArquivoCsv } from "@/lib/minerador/exportCsv"
import { descreverFiltros, formatarDataHora, formatarUsd } from "@/lib/minerador/formatacao"
import { descreverLocal } from "@/lib/minerador/regras"
import { cn } from "@/lib/utils"
import { buscaEmAndamento } from "@/types/busca"

function Stat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value ?? "—"}</dd>
    </div>
  )
}

type FiltroResultado =
  | "fora_do_crm"
  | "sem_site"
  | "perfil_sem_dono"
  | "com_telefone"
  | "estabelecido"
  | "site_com_problema"

const FILTROS: { id: FiltroResultado; label: string }[] = [
  { id: "fora_do_crm", label: "Só fora do CRM" },
  { id: "sem_site", label: "Só sem site" },
  { id: "perfil_sem_dono", label: "Só perfil Google sem dono" },
  { id: "com_telefone", label: "Só com telefone" },
  { id: "estabelecido", label: "Só com 5+ avaliações" },
  { id: "site_com_problema", label: "Só site com problema" },
]

// Cada análise abre o site e espera o PageSpeed (até ~1 min): poucas de cada vez.
const ANALISES_SIMULTANEAS = 3

// "Melhores leads" para vender site: sem site próprio, dá pra ligar e já tem
// clientela (5+ avaliações). Poucas avaliações ainda não dizem se a nota é real.
const MELHORES_LEADS: FiltroResultado[] = ["sem_site", "com_telefone", "estabelecido"]

export function BuscaResultadosView({ id }: { id: string }) {
  const { data: busca, isLoading, error } = useBusca(id)
  const concluida = busca?.status === "concluida"
  const { data: leads, isLoading: carregandoLeads, error: erroLeads } = useBuscaLeads(id, concluida)
  const enviar = useEnviarAoCrm(id)
  const queryClient = useQueryClient()
  const [analise, setAnalise] = useState<{ feitos: number; total: number } | null>(null)

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [filtros, setFiltros] = useState<Set<FiltroResultado>>(new Set())

  const visiveis = useMemo(
    () =>
      (leads ?? []).filter((l) => {
        if (filtros.has("fora_do_crm") && l.no_funil) return false
        if (filtros.has("sem_site") && l.tem_site !== false) return false
        if (filtros.has("perfil_sem_dono") && l.perfil_reivindicado !== false) return false
        if (filtros.has("com_telefone") && !l.telefone) return false
        if (filtros.has("site_com_problema") && !temSiteComProblema(l)) return false
        if (
          filtros.has("estabelecido") &&
          (l.google_avaliacoes_count ?? 0) < MINIMO_AVALIACOES_CONFIAVEIS
        ) {
          return false
        }
        return true
      }),
    [leads, filtros]
  )

  // Sites próprios ainda não analisados entre os resultados visíveis.
  const sitesParaAnalisar = visiveis.filter(
    (l) => !l.site_analisado_em && classificarLink(l.site_url)?.tipo === "site"
  )

  async function analisarSites() {
    const fila = [...sitesParaAnalisar]
    const total = fila.length
    let feitos = 0
    let falhas = 0
    let semChave = false
    setAnalise({ feitos, total })

    async function trabalhar() {
      for (let lead = fila.shift(); lead; lead = fila.shift()) {
        try {
          const resposta = await analisarSiteDoLead(lead.id)
          if (resposta.velocidade === "sem_chave") semChave = true
        } catch {
          falhas++
        }
        feitos++
        setAnalise({ feitos, total })
        void queryClient.invalidateQueries({ queryKey: ["buscas", id, "leads"] })
      }
    }

    await Promise.all(Array.from({ length: Math.min(ANALISES_SIMULTANEAS, total) }, trabalhar))
    setAnalise(null)
    void queryClient.invalidateQueries({ queryKey: CHAVE_FUNIL })

    const analisados = total - falhas
    const resumo = `${analisados} ${analisados === 1 ? "site analisado" : "sites analisados"}${
      falhas > 0 ? `, ${falhas} com erro` : ""
    }.`
    const descricao = semChave ? "A velocidade no celular não foi medida: falta a chave do PageSpeed." : undefined
    if (falhas > 0) toast.warning(resumo, { description: descricao })
    else toast.success(resumo, { description: descricao })
  }

  // Só conta seleção de leads visíveis e ainda fora do CRM.
  const idsParaEnviar = visiveis.filter((l) => !l.no_funil && selecionados.has(l.id)).map((l) => l.id)
  const foraDoCrm = (leads ?? []).filter((l) => !l.no_funil).length

  function alternar(leadId: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(leadId)) novo.delete(leadId)
      else novo.add(leadId)
      return novo
    })
  }

  function alternarTodos() {
    const selecionaveis = visiveis.filter((l) => !l.no_funil).map((l) => l.id)
    const todos = selecionaveis.every((leadId) => selecionados.has(leadId))
    setSelecionados((atual) => {
      const novo = new Set(atual)
      selecionaveis.forEach((leadId) => (todos ? novo.delete(leadId) : novo.add(leadId)))
      return novo
    })
  }

  const melhoresAtivos = MELHORES_LEADS.every((f) => filtros.has(f))

  function alternarMelhores() {
    setFiltros((atual) => {
      const novo = new Set(atual)
      MELHORES_LEADS.forEach((f) => (melhoresAtivos ? novo.delete(f) : novo.add(f)))
      return novo
    })
  }

  function alternarFiltro(filtro: FiltroResultado) {
    setFiltros((atual) => {
      const novo = new Set(atual)
      if (novo.has(filtro)) novo.delete(filtro)
      else novo.add(filtro)
      return novo
    })
  }

  function enviarSelecionados() {
    enviar.mutate(idsParaEnviar, {
      onSuccess: (total) => {
        toast.success(total === 1 ? "1 lead enviado ao CRM." : `${total} leads enviados ao CRM.`)
        setSelecionados(new Set())
      },
      onError: (err) => toast.error(`Erro ao enviar ao CRM: ${err.message}`),
    })
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (!busca) {
    return (
      <p className="text-sm text-destructive">
        {error ? `Erro ao carregar a busca: ${error.message}` : "Busca não encontrada."}
      </p>
    )
  }

  const descricaoFiltros = descreverFiltros(busca.filtros)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/buscar" aria-label="Voltar para as buscas">
            <ArrowLeftIcon />
          </Link>
        </Button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">
              {busca.nicho} <span className="font-normal text-muted-foreground">em</span>{" "}
              {descreverLocal(busca)}
            </h1>
            <BuscaStatusBadge status={busca.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatarDataHora(busca.criado_em)} · até {busca.max_resultados} leads
            {descricaoFiltros.length > 0 && ` · ${descricaoFiltros.join(" · ")}`}
          </p>
        </div>
      </div>

      {buscaEmAndamento(busca.status) && (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Buscando no Google Maps. Costuma levar de 1 a 5 minutos, dependendo da quantidade. Pode
            sair desta página: a busca continua e os resultados ficam salvos aqui.
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">Erro ao atualizar a busca: {error.message}</p>}

      {busca.erro && (
        <p className={cn("text-sm", busca.status === "erro" ? "text-destructive" : "text-muted-foreground")}>
          {busca.erro}
        </p>
      )}

      {busca.total_encontrados !== null && (
        <Card>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Stat label="Encontrados" value={busca.total_encontrados} />
              <Stat label="Novos" value={busca.novos} />
              <Stat label="Já estavam salvos" value={busca.ja_existiam} />
              <Stat label="Ignorados" value={busca.ignorados} />
              <Stat label="Custo máx. estimado" value={formatarUsd(busca.custo_estimado_usd)} />
            </dl>
          </CardContent>
        </Card>
      )}

      {concluida && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={melhoresAtivos ? "default" : "secondary"}
                aria-pressed={melhoresAtivos}
                title="Sem site próprio, com telefone e com 5 ou mais avaliações"
                onClick={alternarMelhores}
              >
                <SparklesIcon />
                Melhores leads
              </Button>
              {FILTROS.map((f) => (
                <Button
                  key={f.id}
                  size="sm"
                  variant={filtros.has(f.id) ? "default" : "outline"}
                  aria-pressed={filtros.has(f.id)}
                  onClick={() => alternarFiltro(f.id)}
                >
                  {f.label}
                </Button>
              ))}
              {leads && (
                <span className="text-sm text-muted-foreground">
                  {visiveis.length} de {leads.length} · {foraDoCrm} fora do CRM
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={analise !== null || sitesParaAnalisar.length === 0}
                title={
                  sitesParaAnalisar.length === 0
                    ? "Nenhum site próprio sem análise entre os resultados visíveis"
                    : "Abre cada site: se está no ar, HTTPS, celular, WhatsApp e velocidade"
                }
                onClick={() => void analisarSites()}
              >
                {analise ? <Loader2Icon className="animate-spin" /> : <GlobeIcon />}
                {analise
                  ? `Analisando ${analise.feitos} de ${analise.total}...`
                  : `Analisar sites (${sitesParaAnalisar.length})`}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={visiveis.length === 0}
                onClick={() =>
                  baixarCsv(leadsParaCsv(visiveis), nomeArquivoCsv(busca.nicho, busca.cidade))
                }
              >
                <DownloadIcon />
                Exportar CSV
              </Button>
              <Button
                size="sm"
                disabled={idsParaEnviar.length === 0 || enviar.isPending}
                onClick={enviarSelecionados}
              >
                <SendIcon />
                {enviar.isPending
                  ? "Enviando..."
                  : idsParaEnviar.length === 0
                    ? "Enviar ao CRM"
                    : `Enviar ${idsParaEnviar.length} ao CRM`}
              </Button>
            </div>
          </div>

          {carregandoLeads && <p className="text-sm text-muted-foreground">Carregando resultados...</p>}
          {erroLeads && (
            <p className="text-sm text-destructive">Erro ao carregar resultados: {erroLeads.message}</p>
          )}
          {leads && (
            <ResultadosTable
              leads={visiveis}
              selecionados={selecionados}
              onAlternar={alternar}
              onAlternarTodos={alternarTodos}
            />
          )}
        </div>
      )}
    </div>
  )
}
