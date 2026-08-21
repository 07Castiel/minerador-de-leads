import { FIELD_DEFINITIONS } from "@/lib/import/fieldDefinitions"
import type {
  ColumnMapping,
  ImportControlledField,
  NormalizedRow,
  RowWarning,
} from "@/lib/import/types"

type NumberParseResult = { value: number | null; invalid: boolean }

// Extrai um número de string tratando vírgula decimal pt-BR e separador de
// milhar em ambos os formatos (1.234,56 e 1,234.56). Nunca converte erro em
// 0 — falha vira null. Permite texto colado depois do número ("4,5 estrelas")
// mas exige que a string COMECE com dígito (ou -dígito) — não vasculha o meio
// da string em busca de números, isso seria conversão agressiva demais.
export function parseNullableNumber(raw: unknown): NumberParseResult {
  if (raw === null || raw === undefined) return { value: null, invalid: false }

  if (typeof raw === "number") {
    return Number.isFinite(raw) ? { value: raw, invalid: false } : { value: null, invalid: true }
  }

  if (typeof raw !== "string") return { value: null, invalid: true }

  const trimmed = raw.trim()
  if (trimmed === "") return { value: null, invalid: false }

  const match = trimmed.match(/^-?\d[\d.,]*/)
  if (!match) return { value: null, invalid: true }

  let numStr = match[0]
  const lastDot = numStr.lastIndexOf(".")
  const lastComma = numStr.lastIndexOf(",")

  if (lastDot !== -1 && lastComma !== -1) {
    numStr =
      lastComma > lastDot
        ? numStr.replace(/\./g, "").replace(",", ".") // pt-BR: 1.234,56
        : numStr.replace(/,/g, "") // US: 1,234.56
  } else if (lastComma !== -1) {
    numStr = numStr.replace(",", ".") // 4,5 -> 4.5
  }

  const value = Number(numStr)
  return Number.isFinite(value) ? { value, invalid: false } : { value: null, invalid: true }
}

function parseCoordinate(raw: unknown, min: number, max: number): NumberParseResult {
  const parsed = parseNullableNumber(raw)
  if (parsed.invalid || parsed.value === null) return parsed
  if (parsed.value < min || parsed.value > max) return { value: null, invalid: true }
  return parsed
}

export function parseLatitude(raw: unknown): NumberParseResult {
  return parseCoordinate(raw, -90, 90)
}

export function parseLongitude(raw: unknown): NumberParseResult {
  return parseCoordinate(raw, -180, 180)
}

export function normalizeText(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null
  const str = typeof raw === "string" ? raw : String(raw)
  const trimmed = str.trim()
  return trimmed === "" ? null : trimmed
}

// true/false a partir de um valor de linha JÁ SABENDO que a coluna de
// presença de site está mapeada — vazio/ausente = sem site (confirmado pela
// fonte), qualquer outra coisa presente = tem site. Nunca retorna null aqui;
// null só existe quando a coluna inteira não foi mapeada (ver normalizeRow).
export function deriveTemSiteFromValue(raw: unknown): boolean {
  if (raw === null || raw === undefined) return false
  if (typeof raw === "string") return raw.trim() !== ""
  if (typeof raw === "boolean") return raw
  return true
}

function getMappedValue(row: Record<string, unknown>, sourceHeader: string | null | undefined) {
  if (!sourceHeader) return undefined
  return row[sourceHeader]
}

// Aplica o mapeamento + normaliza cada campo import-controlled de uma linha.
// tem_site fica `null` quando a coluna de presença de site não foi mapeada —
// essa ambiguidade só é resolvida depois, no upsert, usando a classificação
// novo/existente (ver upsert.ts).
export function normalizeRow(
  rawRow: Record<string, unknown>,
  mapping: ColumnMapping,
  sourceIndex: number
): NormalizedRow {
  const warnings: RowWarning[] = []
  const data: NormalizedRow["data"] = {}

  function warn(field: ImportControlledField, message: string) {
    warnings.push({ field, message })
  }

  for (const def of FIELD_DEFINITIONS) {
    const sourceValue = getMappedValue(rawRow, mapping[def.key])

    switch (def.kind) {
      case "text": {
        const value = normalizeText(sourceValue)
        // ausente/vazio -> chave fica de fora do payload, deixando o default
        // do banco (ex: cidade='Sobral') ou o valor já existente (update) valer.
        if (value !== null) (data as Record<string, unknown>)[def.key] = value
        break
      }
      case "number": {
        const isLat = def.key === "latitude"
        const isLng = def.key === "longitude"
        const result = isLat
          ? parseLatitude(sourceValue)
          : isLng
            ? parseLongitude(sourceValue)
            : parseNullableNumber(sourceValue)

        if (result.invalid) {
          warn(
            def.key,
            isLat
              ? "Latitude fora do intervalo válido (-90 a 90) ou não numérica — definida como null."
              : isLng
                ? "Longitude fora do intervalo válido (-180 a 180) ou não numérica — definida como null."
                : `Valor numérico inválido em "${def.label}" — definido como null.`
          )
        }
        ;(data as Record<string, unknown>)[def.key] = result.value
        break
      }
      case "derived-boolean": {
        // coluna não mapeada -> null (ambíguo até o upsert saber se é linha nova/existente)
        data.tem_site = mapping.tem_site
          ? deriveTemSiteFromValue(sourceValue)
          : null
        break
      }
    }
  }

  return { sourceIndex, data, warnings }
}
