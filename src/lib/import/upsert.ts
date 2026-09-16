import { supabaseBrowser } from "@/lib/supabase/client"
import type { ClassifiedRow, ImportSummary } from "@/lib/import/types"

const BATCH_SIZE = 500

// tem_site=null no normalizer significa "coluna de site não foi mapeada".
// Resolve aqui usando a classificação novo/existente:
// - linha nova: manda null explícito — null na coluna significa "não sei se
//   tem site", diferente de false ("confirmado que não tem").
// - linha existente: omite a chave inteiramente, preservando o valor já
//   salvo (import anterior ou correção manual feita na tela de detalhe) —
//   reimport sem sinal de site não deve apagar isso.
export function buildPayload(
  row: ClassifiedRow,
  origem: string | null,
  orgId: string
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...row.data, org_id: orgId }

  if (payload.tem_site === null && row.classification === "existente") {
    delete payload.tem_site
  }

  if (origem && origem.trim() !== "") payload.origem = origem

  return payload
}

// Upsert em lotes por (org, maps_url). Novos/atualizados só contam de fato
// depois que o lote correspondente confirma sucesso — um lote que falha vira
// erro, nunca é contado como se tivesse sido salvo.
export async function upsertLeads(
  classified: ClassifiedRow[],
  origem: string | null,
  arquivoNome: string,
  orgId: string
): Promise<ImportSummary> {
  const supabase = supabaseBrowser()
  const invalid = classified.filter((r) => r.classification === "invalido")
  const toUpsert = classified.filter((r) => r.classification !== "invalido")
  const warnings = classified.flatMap((r) => r.warnings.map((w) => w.message))

  let novos = 0
  let atualizados = 0
  let erros = 0

  for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
    const chunkRows = toUpsert.slice(i, i + BATCH_SIZE)
    const payloads = chunkRows.map((row) => buildPayload(row, origem, orgId))

    const { error } = await supabase
      .from("leads")
      .upsert(payloads as never, { onConflict: "org_id,maps_url" })

    if (error) {
      erros += chunkRows.length
      warnings.push(
        `Erro ao salvar lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`
      )
    } else {
      novos += chunkRows.filter((r) => r.classification === "novo").length
      atualizados += chunkRows.filter((r) => r.classification === "existente").length
    }
  }

  const summary: ImportSummary = {
    totalLinhas: classified.length,
    novos,
    atualizados,
    ignorados: invalid.length,
    erros,
    warnings,
  }

  const { error: historyError } = await supabase.from("imports").insert({
    org_id: orgId,
    origem,
    arquivo_nome: arquivoNome,
    total_linhas: summary.totalLinhas,
    novos: summary.novos,
    atualizados: summary.atualizados,
    ignorados: summary.ignorados,
    erros: summary.erros,
  })

  if (historyError) {
    // não deixa uma falha ao gravar o histórico esconder o resultado real do import
    warnings.push(
      `Aviso: não foi possível gravar o histórico da importação: ${historyError.message}`
    )
  }

  return summary
}
