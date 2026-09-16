"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeftIcon, DownloadIcon, SendIcon } from "lucide-react"
import { toast } from "sonner"

import { BuscaStatusBadge } from "@/components/minerador/BuscaStatusBadge"
import { ResultadosTable } from "@/components/minerador/ResultadosTable"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useBusca, useBuscaLeads, useEnviarAoCrm } from "@/hooks/useBuscas"
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

type FiltroResultado = "fora_do_crm" | "sem_site" | "com_telefone"

const FILTROS: { id: FiltroResultado; label: string }[] = [
  { id: "fora_do_crm", label: "Só fora do CRM" },
  { id: "sem_site", label: "Só sem site" },
  { id: "com_telefone", label: "Só com telefone" },
]

export function BuscaResultadosView({ id }: { id: string }) {
  const { data: busca, isLoading, error } = useBusca(id)
  const concluida = busca?.status === "concluida"
  const { data: leads, isLoading: carregandoLeads, error: erroLeads } = useBuscaLeads(id, concluida)
  const enviar = useEnviarAoCrm(id)

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [filtros, setFiltros] = useState<Set<FiltroResultado>>(new Set())

  const visiveis = useMemo(
    () =>
      (leads ?? []).filter((l) => {
        if (filtros.has("fora_do_crm") && l.no_funil) return false
        if (filtros.has("sem_site") && l.tem_site !== false) return false
        if (filtros.has("com_telefone") && !l.telefone) return false
        return true
      }),
    [leads, filtros]
  )

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
