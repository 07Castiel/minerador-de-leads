"use client"

import Link from "next/link"
import { CheckIcon, StarIcon, XIcon } from "lucide-react"

import { EtapaBadge } from "@/components/leads/EtapaBadge"
import { TemperaturaBadge } from "@/components/leads/TemperaturaBadge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { Lead } from "@/types/lead"

const nota = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

type ResultadosTableProps = {
  leads: Lead[]
  selecionados: Set<string>
  onAlternar: (id: string) => void
  onAlternarTodos: () => void
}

export function ResultadosTable({ leads, selecionados, onAlternar, onAlternarTodos }: ResultadosTableProps) {
  const selecionaveis = leads.filter((l) => !l.no_funil)
  const todosMarcados =
    selecionaveis.length > 0 && selecionaveis.every((l) => selecionados.has(l.id))

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                className="size-4 accent-primary align-middle"
                aria-label="Selecionar todos os que ainda não estão no CRM"
                checked={todosMarcados}
                disabled={selecionaveis.length === 0}
                onChange={onAlternarTodos}
              />
            </TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Bairro</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Google</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead>Temperatura</TableHead>
            <TableHead>CRM</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground">
                Nenhum lead com esses filtros.
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => {
              const marcado = selecionados.has(lead.id)
              return (
                <TableRow
                  key={lead.id}
                  data-state={marcado ? "selected" : undefined}
                  className={cn(!lead.no_funil && "cursor-pointer")}
                  onClick={() => !lead.no_funil && onAlternar(lead.id)}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      className="size-4 accent-primary align-middle"
                      aria-label={`Selecionar ${lead.nome}`}
                      checked={marcado}
                      disabled={lead.no_funil}
                      onChange={() => onAlternar(lead.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{lead.nome}</span>
                    {lead.categoria && (
                      <span className="block text-xs text-muted-foreground">{lead.categoria}</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{lead.telefone ?? "—"}</TableCell>
                  <TableCell>{lead.bairro ?? "—"}</TableCell>
                  <TableCell>
                    {lead.tem_site === null ? (
                      <span className="text-muted-foreground">?</span>
                    ) : lead.tem_site ? (
                      <CheckIcon className="size-4 text-muted-foreground" aria-label="Tem site" />
                    ) : (
                      <XIcon className="size-4 text-destructive" aria-label="Sem site" />
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {lead.google_rating === null ? (
                      "—"
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <StarIcon className="size-3.5 text-muted-foreground" />
                        {nota.format(lead.google_rating)}
                        <span className="text-muted-foreground">({lead.google_avaliacoes_count ?? 0})</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{lead.score ?? "—"}</TableCell>
                  <TableCell>
                    <TemperaturaBadge temperatura={lead.temperatura} />
                  </TableCell>
                  <TableCell>
                    {lead.no_funil ? (
                      <Link
                        href={`/leads/${lead.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5"
                        title="Abrir no CRM"
                      >
                        <EtapaBadge etapa={lead.etapa} />
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">Fora do CRM</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
