"use client"

import { useRouter } from "next/navigation"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BuscaStatusBadge } from "@/components/minerador/BuscaStatusBadge"
import { descreverFiltros, formatarDataHora, formatarUsd } from "@/lib/minerador/formatacao"
import { descreverLocal } from "@/lib/minerador/regras"
import type { Busca } from "@/types/busca"

export function BuscasTable({ buscas }: { buscas: Busca[] }) {
  const router = useRouter()

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Busca</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Encontrados</TableHead>
            <TableHead className="text-right">Novos</TableHead>
            <TableHead className="text-right">Custo máx.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {buscas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhuma busca ainda. Faça a primeira acima.
              </TableCell>
            </TableRow>
          ) : (
            buscas.map((busca) => {
              const filtros = descreverFiltros(busca.filtros)
              return (
                <TableRow
                  key={busca.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/buscar/${busca.id}`)}
                >
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatarDataHora(busca.criado_em)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{busca.nicho}</span>
                    <span className="text-muted-foreground"> em {descreverLocal(busca)}</span>
                    {filtros.length > 0 && (
                      <span className="block text-xs text-muted-foreground">{filtros.join(" · ")}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <BuscaStatusBadge status={busca.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {busca.total_encontrados ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{busca.novos ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatarUsd(busca.custo_estimado_usd)}
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
