import Papa from "papaparse"

import type { ParsedData } from "@/lib/import/types"

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB — ver Tarefa de guardrails no plano
const HEADER_SAMPLE_SIZE = 100

export class ImportFileTooLargeError extends Error {}
export class ImportParseError extends Error {}

// Achata um nível de objetos aninhados (ex: {location: {lat, lng}} vira
// {"location.lat": ..., "location.lng": ...}) — só um nível, só pra permitir
// que aliases como "coordinates.lat" façam sentido em exports JSON reais.
// Não achata arrays nem desce recursivamente: exports do Apify têm muitos
// campos aninhados irrelevantes (reviews, openingHours, imageUrls) e um
// flatten profundo geraria uma lista de colunas enorme e inútil.
function flattenOneLevel(row: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      for (const [childKey, childValue] of Object.entries(
        value as Record<string, unknown>
      )) {
        flat[`${key}.${childKey}`] = childValue
      }
      // mantém a chave original também, caso o mapeamento aponte pro objeto inteiro
      flat[key] = value
    } else {
      flat[key] = value
    }
  }
  return flat
}

function collectHeaders(rows: Record<string, unknown>[]): string[] {
  const headers = new Set<string>()
  for (const row of rows.slice(0, HEADER_SAMPLE_SIZE)) {
    for (const key of Object.keys(row)) headers.add(key)
  }
  return Array.from(headers)
}

function parseCsv(text: string): ParsedData {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  })

  if (result.errors.length > 0) {
    const fatal = result.errors.find((e) => e.type !== "FieldMismatch")
    if (fatal) {
      throw new ImportParseError(`Erro ao ler CSV: ${fatal.message}`)
    }
  }

  const headers = result.meta.fields ?? collectHeaders(result.data)
  return { headers, rows: result.data }
}

function parseJson(text: string): ParsedData {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ImportParseError("Arquivo JSON inválido — não foi possível fazer o parse.")
  }

  // Defensivo: alguns exports vêm como {items: [...]} em vez de array puro.
  const rawRows = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { items?: unknown })?.items)
      ? ((parsed as { items: unknown[] }).items)
      : null

  if (!rawRows) {
    throw new ImportParseError(
      "JSON precisa ser um array de objetos (ou {items: [...]})."
    )
  }

  const rows = rawRows.map((row) =>
    row !== null && typeof row === "object" && !Array.isArray(row)
      ? flattenOneLevel(row as Record<string, unknown>)
      : {}
  )

  return { headers: collectHeaders(rows), rows }
}

export async function parseFile(file: File): Promise<ParsedData> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ImportFileTooLargeError(
      `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Limite: 10MB.`
    )
  }

  const text = await file.text()
  const isJson = file.name.toLowerCase().endsWith(".json")

  return isJson ? parseJson(text) : parseCsv(text)
}
