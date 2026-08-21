import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ImportSummary as ImportSummaryData } from "@/lib/import/types"

export function ImportSummary({ summary }: { summary: ImportSummaryData }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Importação concluída</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div>
              <dt className="text-sm text-muted-foreground">Total</dt>
              <dd className="text-lg font-semibold">{summary.totalLinhas}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Novos</dt>
              <dd className="text-lg font-semibold">{summary.novos}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Atualizados</dt>
              <dd className="text-lg font-semibold">{summary.atualizados}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Ignorados</dt>
              <dd className="text-lg font-semibold">{summary.ignorados}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Erros</dt>
              <dd className="text-lg font-semibold">{summary.erros}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {summary.warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Avisos ({summary.warnings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {summary.warnings.slice(0, 30).map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
              {summary.warnings.length > 30 && (
                <li>...e mais {summary.warnings.length - 30} aviso(s).</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
