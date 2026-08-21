import { supabase } from "@/lib/supabase"
import { validateRow } from "@/lib/import/validator"
import type { ClassifiedRow, NormalizedRow } from "@/lib/import/types"

// Classifica cada linha em novo/existente/inválido, dado o conjunto de
// maps_url já existentes no banco. Pura/testável — a busca em si (efeito
// colateral de rede) fica isolada em `classifyRows`, abaixo.
//
// Dedupe é exclusivamente por `maps_url` (chave definida no plano) —
// latitude/longitude nunca participam dessa decisão. Também pega duplicatas
// DENTRO do próprio arquivo (mesma maps_url 2x no lote): só a primeira
// ocorrência segue adiante, as seguintes são marcadas inválidas — evita
// ambiguidade sobre qual das duas "vence".
export function classifyRowsWithExisting(
  rows: NormalizedRow[],
  existingUrls: Set<string>
): ClassifiedRow[] {
  const seenInFile = new Set<string>()
  const classified: ClassifiedRow[] = []

  for (const row of rows) {
    const validation = validateRow(row)
    if (!validation.isValid) {
      classified.push({ ...row, classification: "invalido", invalidReason: validation.reason })
      continue
    }

    const mapsUrl = row.data.maps_url
    if (mapsUrl) {
      if (seenInFile.has(mapsUrl)) {
        classified.push({
          ...row,
          classification: "invalido",
          invalidReason: `maps_url duplicada dentro do próprio arquivo (linha ${row.sourceIndex + 1})`,
        })
        continue
      }
      seenInFile.add(mapsUrl)
    }

    classified.push({
      ...row,
      classification: mapsUrl && existingUrls.has(mapsUrl) ? "existente" : "novo",
    })
  }

  return classified
}

export async function classifyRows(rows: NormalizedRow[]): Promise<ClassifiedRow[]> {
  const mapsUrls = Array.from(
    new Set(
      rows
        .map((r) => r.data.maps_url)
        .filter((url): url is string => typeof url === "string" && url.length > 0)
    )
  )

  let existingUrls = new Set<string>()
  if (mapsUrls.length > 0) {
    const { data, error } = await supabase
      .from("leads")
      .select("maps_url")
      .in("maps_url", mapsUrls)

    if (error) throw error
    existingUrls = new Set(
      (data ?? [])
        .map((r) => r.maps_url)
        .filter((url): url is string => typeof url === "string")
    )
  }

  return classifyRowsWithExisting(rows, existingUrls)
}
