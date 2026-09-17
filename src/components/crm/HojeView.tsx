"use client"

import Link from "next/link"
import { CalendarCheckIcon, CheckIcon } from "lucide-react"
import { toast } from "sonner"

import { ContatoBotoes } from "@/components/leads/ContatoBotoes"
import { EtapaBadge } from "@/components/leads/EtapaBadge"
import { MotivosChips } from "@/components/leads/MotivosChips"
import { RetornoBadge } from "@/components/leads/RetornoBadge"
import { Button } from "@/components/ui/button"
import { useAgendarRetorno, useLeadsDoFunil } from "@/hooks/useLeads"
import {
  ATALHOS_DE_RETORNO,
  dataLocalIso,
  descreverRetorno,
  diasEntre,
  retornoPendente,
  somarDias,
} from "@/lib/leads/proximoContato"
import type { Lead } from "@/types/lead"

const DIAS_A_FRENTE = 7

function porDataEScore(a: Lead, b: Lead): number {
  return (a.proximo_contato ?? "").localeCompare(b.proximo_contato ?? "") || (b.score ?? -1) - (a.score ?? -1)
}

type ItemProps = {
  lead: Lead
  hoje: string
  onAdiar: (lead: Lead, dias: number) => void
  onConcluir: (lead: Lead) => void
}

function ItemDeRetorno({ lead, hoje, onAdiar, onConcluir }: ItemProps) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
            {lead.nome}
          </Link>
          <EtapaBadge etapa={lead.etapa} />
          <RetornoBadge proximoContato={lead.proximo_contato} />
        </div>
        <p className="text-xs text-muted-foreground">
          {[lead.categoria, lead.bairro ?? lead.cidade, lead.telefone].filter(Boolean).join(" · ") || "—"}
        </p>
        {lead.observacoes && (
          <p className="line-clamp-2 text-sm whitespace-pre-line text-muted-foreground">{lead.observacoes}</p>
        )}
        <MotivosChips lead={lead} limite={3} />
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        <ContatoBotoes lead={lead} />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Remarcar retorno de ${lead.nome}`}>
          {ATALHOS_DE_RETORNO.slice(0, 3).map((atalho) => (
            <Button
              key={atalho.dias}
              size="xs"
              variant="outline"
              disabled={somarDias(hoje, atalho.dias) === lead.proximo_contato}
              onClick={() => onAdiar(lead, atalho.dias)}
            >
              {atalho.label}
            </Button>
          ))}
          <Button size="xs" variant="secondary" onClick={() => onConcluir(lead)}>
            <CheckIcon />
            Concluído
          </Button>
        </div>
      </div>
    </li>
  )
}

// Lista do dia: retornos de hoje e atrasados, com contato e remarcação a um clique.
export function HojeView() {
  const { data: leads, isLoading, error } = useLeadsDoFunil()
  const agendar = useAgendarRetorno()
  const hoje = dataLocalIso(new Date())

  const pendentes = (leads ?? []).filter((l) => retornoPendente(l.proximo_contato, hoje)).sort(porDataEScore)
  const atrasados = pendentes.filter((l) => l.proximo_contato !== hoje).length
  const proximos = (leads ?? [])
    .filter((l) => {
      if (!l.proximo_contato) return false
      const dias = diasEntre(hoje, l.proximo_contato)
      return dias >= 1 && dias <= DIAS_A_FRENTE
    })
    .sort(porDataEScore)

  function adiar(lead: Lead, dias: number) {
    const data = somarDias(hoje, dias)
    agendar.mutate(
      { id: lead.id, proximoContato: data },
      {
        onSuccess: () => toast.success(`${lead.nome}: ${descreverRetorno(data, hoje).toLowerCase()}.`),
        onError: (err) => toast.error(`Não deu pra remarcar: ${err.message}`),
      }
    )
  }

  function concluir(lead: Lead) {
    const anterior = lead.proximo_contato
    agendar.mutate(
      { id: lead.id, proximoContato: null },
      {
        onSuccess: () =>
          toast.success(`Retorno de ${lead.nome} concluído.`, {
            action: {
              label: "Desfazer",
              onClick: () => agendar.mutate({ id: lead.id, proximoContato: anterior }),
            },
          }),
        onError: (err) => toast.error(`Não deu pra concluir: ${err.message}`),
      }
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Hoje</h1>
        <p className="text-sm text-muted-foreground">
          {leads
            ? pendentes.length === 0
              ? "Nenhum retorno pendente."
              : `${pendentes.length} ${pendentes.length === 1 ? "retorno" : "retornos"} para fazer${
                  atrasados > 0 ? `, ${atrasados} ${atrasados === 1 ? "atrasado" : "atrasados"}` : ""
                }.`
            : "Carregando..."}
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando retornos...</p>}
      {error && <p className="text-sm text-destructive">Erro ao carregar retornos: {error.message}</p>}

      {leads && pendentes.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
          <CalendarCheckIcon className="size-6 text-muted-foreground" aria-hidden />
          <p className="font-medium">Tudo em dia</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Marque o próximo contato no lead, ou use o aviso que aparece depois de abrir o WhatsApp, e ele
            aparece aqui no dia certo.
          </p>
        </div>
      )}

      {pendentes.length > 0 && (
        <ul className="flex flex-col gap-3" aria-label="Retornos de hoje e atrasados">
          {pendentes.map((lead) => (
            <ItemDeRetorno key={lead.id} lead={lead} hoje={hoje} onAdiar={adiar} onConcluir={concluir} />
          ))}
        </ul>
      )}

      {proximos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Próximos {DIAS_A_FRENTE} dias</h2>
          <ul className="divide-y rounded-lg border">
            {proximos.map((lead) => (
              <li key={lead.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <Link href={`/leads/${lead.id}`} className="min-w-0 truncate font-medium hover:underline">
                  {lead.nome}
                </Link>
                <div className="flex items-center gap-2">
                  <EtapaBadge etapa={lead.etapa} />
                  <RetornoBadge proximoContato={lead.proximo_contato} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
