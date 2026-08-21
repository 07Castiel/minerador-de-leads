import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { ClassifiedRow } from "@/lib/import/types"

const PREVIEW_LIMIT = 10

const CLASSIFICATION_LABEL: Record<ClassifiedRow["classification"], string> = {
  novo: "Novo",
  existente: "Atualiza",
  invalido: "Inválido",
}

export function ImportPreviewTable({ rows }: { rows: ClassifiedRow[] }) {
  const preview = rows.slice(0, PREVIEW_LIMIT)

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Bairro</TableHead>
            <TableHead>Tem site?</TableHead>
            <TableHead>Lat / Lng</TableHead>
            <TableHead>Avisos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {preview.map((row) => (
            <TableRow key={row.sourceIndex}>
              <TableCell>
                <Badge
                  variant={
                    row.classification === "invalido"
                      ? "destructive"
                      : row.classification === "existente"
                        ? "secondary"
                        : "default"
                  }
                >
                  {CLASSIFICATION_LABEL[row.classification]}
                </Badge>
              </TableCell>
              <TableCell>{row.data.nome ?? "—"}</TableCell>
              <TableCell>{row.data.categoria ?? "—"}</TableCell>
              <TableCell>{row.data.bairro ?? "—"}</TableCell>
              <TableCell>
                {row.data.tem_site === null ? "?" : row.data.tem_site ? "Sim" : "Não"}
              </TableCell>
              <TableCell>
                {row.data.latitude != null && row.data.longitude != null
                  ? `${row.data.latitude}, ${row.data.longitude}`
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.invalidReason ?? (row.warnings.length > 0 ? `${row.warnings.length} aviso(s)` : "")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length > PREVIEW_LIMIT && (
        <p className="border-t px-2 py-2 text-sm text-muted-foreground">
          Mostrando {PREVIEW_LIMIT} de {rows.length} linhas.
        </p>
      )}
    </div>
  )
}
