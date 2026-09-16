"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { flexRender, type SortingState } from "@tanstack/react-table"
// react-table v9 reorganizou a API em "features"; usamos a camada de
// compatibilidade v8, suportada oficialmente e suficiente para uma tabela
// ordenável simples.
import {
  getCoreRowModel,
  getSortedRowModel,
  legacyCreateColumnHelper as createColumnHelper,
  useLegacyTable as useReactTable,
  type LegacyColumnDef,
} from "@tanstack/react-table/legacy"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, CheckIcon, XIcon } from "lucide-react"

import { EtapaBadge } from "@/components/leads/EtapaBadge"
import { TemperaturaBadge } from "@/components/leads/TemperaturaBadge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Lead } from "@/types/lead"

const columnHelper = createColumnHelper<Lead>()

const columns: LegacyColumnDef<Lead, any>[] = [
  columnHelper.accessor("nome", {
    header: "Nome",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor("categoria", {
    header: "Categoria",
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.accessor("telefone", {
    header: "Telefone",
    cell: (info) => <span className="whitespace-nowrap tabular-nums">{info.getValue() ?? "—"}</span>,
  }),
  columnHelper.accessor("bairro", {
    header: "Bairro",
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.accessor("tem_site", {
    header: "Site",
    cell: (info) => {
      const value = info.getValue()
      if (value === null) return <span className="text-muted-foreground">?</span>
      return value ? (
        <CheckIcon className="size-4 text-muted-foreground" aria-label="Tem site" />
      ) : (
        <XIcon className="size-4 text-destructive" aria-label="Sem site" />
      )
    },
  }),
  columnHelper.accessor("score", {
    header: "Score",
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.accessor("temperatura", {
    header: "Temperatura",
    cell: (info) => <TemperaturaBadge temperatura={info.getValue()} />,
  }),
  columnHelper.accessor("etapa", {
    header: "Etapa",
    cell: (info) => <EtapaBadge etapa={info.getValue()} />,
  }),
]

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data: leads,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" ? (
                        <ArrowUpIcon className="size-3.5" />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ArrowDownIcon className="size-3.5" />
                      ) : (
                        <ArrowUpDownIcon className="size-3.5 opacity-30" />
                      )}
                    </Button>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                Nenhum lead encontrado.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => router.push(`/leads/${row.original.id}`)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
