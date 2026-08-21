import { useEffect, useState } from "react"
import { toast } from "sonner"

import { FileDropzone } from "@/components/import/FileDropzone"
import { ColumnMappingStep } from "@/components/import/ColumnMappingStep"
import { ImportPreviewTable } from "@/components/import/ImportPreviewTable"
import { ImportSummary } from "@/components/import/ImportSummary"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { parseFile, ImportFileTooLargeError, ImportParseError } from "@/lib/import/parser"
import { autoSuggestMapping } from "@/lib/import/autoSuggest"
import { normalizeRow } from "@/lib/import/normalizer"
import { classifyRows } from "@/lib/import/dedupe"
import { upsertLeads } from "@/lib/import/upsert"
import type {
  ClassifiedRow,
  ColumnMapping,
  ImportSummary as ImportSummaryData,
  ParsedData,
} from "@/lib/import/types"

const ROW_WARN_THRESHOLD = 10_000
const ROW_BLOCK_THRESHOLD = 20_000

type Stage = "idle" | "mapping" | "importing" | "done"

export default function ImportPage() {
  const [stage, setStage] = useState<Stage>("idle")
  const [fileName, setFileName] = useState("")
  const [parsed, setParsed] = useState<ParsedData | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [origem, setOrigem] = useState("")
  const [classified, setClassified] = useState<ClassifiedRow[]>([])
  const [classifying, setClassifying] = useState(false)
  const [confirmTemSiteOpen, setConfirmTemSiteOpen] = useState(false)
  const [summary, setSummary] = useState<ImportSummaryData | null>(null)

  useEffect(() => {
    if (!parsed) return
    let cancelled = false
    setClassifying(true)

    const normalized = parsed.rows.map((row, i) => normalizeRow(row, mapping, i))
    classifyRows(normalized)
      .then((result) => {
        if (!cancelled) setClassified(result)
      })
      .catch((err) => {
        if (!cancelled) toast.error(`Erro ao verificar leads existentes: ${err.message}`)
      })
      .finally(() => {
        if (!cancelled) setClassifying(false)
      })

    return () => {
      cancelled = true
    }
  }, [parsed, mapping])

  async function handleFileSelected(file: File) {
    try {
      const result = await parseFile(file)

      if (result.rows.length > ROW_BLOCK_THRESHOLD) {
        toast.error(
          `Arquivo com ${result.rows.length} linhas — acima do limite de ${ROW_BLOCK_THRESHOLD}. Divida o arquivo antes de importar.`
        )
        return
      }
      if (result.rows.length > ROW_WARN_THRESHOLD) {
        toast.warning(`Arquivo grande: ${result.rows.length} linhas. Confira o mapeamento com atenção.`)
      }

      setFileName(file.name)
      setParsed(result)
      setMapping(autoSuggestMapping(result.headers))
      setOrigem("")
      setStage("mapping")
    } catch (err) {
      if (err instanceof ImportFileTooLargeError || err instanceof ImportParseError) {
        toast.error(err.message)
      } else {
        toast.error("Erro inesperado ao ler o arquivo.")
      }
    }
  }

  function handleConfirmClick() {
    if (!mapping.tem_site) {
      setConfirmTemSiteOpen(true)
      return
    }
    void runImport()
  }

  async function runImport() {
    setConfirmTemSiteOpen(false)
    setStage("importing")
    try {
      const result = await upsertLeads(classified, origem || null, fileName)
      setSummary(result)
      setStage("done")
    } catch (err) {
      toast.error(`Erro ao importar: ${err instanceof Error ? err.message : String(err)}`)
      setStage("mapping")
    }
  }

  function reset() {
    setStage("idle")
    setParsed(null)
    setMapping({})
    setOrigem("")
    setClassified([])
    setSummary(null)
  }

  const hasBlockingError = !mapping.nome
  const validCount = classified.filter((r) => r.classification !== "invalido").length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Importar leads</h1>
        <p className="text-sm text-muted-foreground">
          Upload de um export do Apify (Google Maps Scraper) em CSV ou JSON.
        </p>
      </div>

      {stage === "idle" && <FileDropzone onFileSelected={handleFileSelected} />}

      {stage === "mapping" && parsed && (
        <>
          <ColumnMappingStep
            parsed={parsed}
            mapping={mapping}
            onMappingChange={setMapping}
            origem={origem}
            onOrigemChange={setOrigem}
          />

          {hasBlockingError && (
            <p className="text-sm text-destructive">
              Mapeie a coluna "Nome" para continuar — é o único campo obrigatório.
            </p>
          )}

          <div>
            <h2 className="mb-2 text-sm font-medium">
              Pré-visualização {classifying && "(verificando duplicatas...)"}
            </h2>
            <ImportPreviewTable rows={classified} />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleConfirmClick} disabled={hasBlockingError || classifying}>
              Confirmar importação ({validCount} de {classified.length} linhas)
            </Button>
            <Button variant="ghost" onClick={reset}>
              Cancelar
            </Button>
          </div>
        </>
      )}

      {stage === "importing" && (
        <p className="text-sm text-muted-foreground">Importando...</p>
      )}

      {stage === "done" && summary && (
        <>
          <ImportSummary summary={summary} />
          <Button onClick={reset}>Importar outro arquivo</Button>
        </>
      )}

      <Dialog open={confirmTemSiteOpen} onOpenChange={setConfirmTemSiteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nenhuma coluna de site mapeada</DialogTitle>
            <DialogDescription>
              Nenhuma coluna foi mapeada para "Tem site?". Leads novos ficarão sem esse sinal de
              score (não será tratado como "sem site" — apenas como desconhecido). Leads já
              existentes mantêm o valor que já está salvo. Deseja continuar mesmo assim?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTemSiteOpen(false)}>
              Voltar e mapear
            </Button>
            <Button onClick={() => void runImport()}>Continuar sem mapear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
