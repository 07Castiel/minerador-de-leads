import { describe, expect, it } from "vitest"

import { parseLatitude, parseLongitude, normalizeRow } from "@/lib/import/normalizer"
import { classifyRowsWithExisting } from "@/lib/import/dedupe"
import { buildPayload } from "@/lib/import/upsert"
import { NEVER_IMPORTED_FIELDS } from "@/lib/import/fieldDefinitions"
import type { ColumnMapping, NormalizedRow } from "@/lib/import/types"

const MAPPING: ColumnMapping = {
  nome: "title",
  maps_url: "url",
  latitude: "lat",
  longitude: "lng",
}

// Caso 1 — coordenadas válidas
describe("coordenadas válidas", () => {
  it("aceita latitude/longitude numéricas dentro do intervalo", () => {
    expect(parseLatitude(-3.6863)).toEqual({ value: -3.6863, invalid: false })
    expect(parseLongitude(-40.3498)).toEqual({ value: -40.3498, invalid: false })
  })
})

// Caso 2 — vírgula decimal
describe("vírgula decimal", () => {
  it("converte vírgula pt-BR pro valor numérico correto", () => {
    expect(parseLatitude("-3,6863")).toEqual({ value: -3.6863, invalid: false })
    expect(parseLongitude("-40,3498")).toEqual({ value: -40.3498, invalid: false })
  })

  it("aceita ponto como decimal e zeros à direita", () => {
    expect(parseLatitude("-3.686300")).toEqual({ value: -3.6863, invalid: false })
  })
})

// Caso 3 — latitude inválida (fora do intervalo -90..90)
describe("latitude fora do intervalo", () => {
  it("120 vira null + invalid=true (nunca 0)", () => {
    const result = parseLatitude(120)
    expect(result.value).toBeNull()
    expect(result.invalid).toBe(true)
    expect(result.value).not.toBe(0)
  })
})

// Caso 4 — longitude inválida (fora do intervalo -180..180)
describe("longitude fora do intervalo", () => {
  it("200 vira null + invalid=true (nunca 0)", () => {
    const result = parseLongitude(200)
    expect(result.value).toBeNull()
    expect(result.invalid).toBe(true)
    expect(result.value).not.toBe(0)
  })
})

// Caso 5 — coordenadas ausentes não bloqueiam a linha
describe("coordenadas ausentes", () => {
  it("linha sem lat/lng normaliza para null em ambos, sem erro", () => {
    const raw = { title: "Empresa Sem Coordenadas", url: "https://maps.example.com/x" }
    const row = normalizeRow(raw, MAPPING, 0)

    expect(row.data.latitude).toBeNull()
    expect(row.data.longitude).toBeNull()
    // ausência não gera warning — só valor presente e inválido gera
    expect(row.warnings.some((w) => w.field === "latitude" || w.field === "longitude")).toBe(false)
  })

  it("warning é emitido quando o valor está presente mas fora do intervalo", () => {
    const raw = { title: "Empresa", url: "https://maps.example.com/y", lat: 120 }
    const row = normalizeRow(raw, MAPPING, 0)

    expect(row.data.latitude).toBeNull()
    expect(row.warnings.some((w) => w.field === "latitude")).toBe(true)
  })
})

// Caso 6 — dedupe com coordenadas diferentes continua sendo o mesmo lead
describe("dedupe com coordenadas diferentes", () => {
  const baseRow = (lat: number, lng: number): NormalizedRow => ({
    sourceIndex: 0,
    data: { nome: "Concessionária X", maps_url: "https://maps.example.com/x", latitude: lat, longitude: lng },
    warnings: [],
  })

  it("mesma maps_url com coordenadas diferentes continua classificada como o mesmo lead (existente)", () => {
    const existing = new Set(["https://maps.example.com/x"])
    const [classified] = classifyRowsWithExisting([baseRow(-3.2, -40.2)], existing)

    expect(classified.classification).toBe("existente")
  })

  it("latitude/longitude nunca entram na decisão de dedupe (não são chave)", () => {
    // duas maps_url DIFERENTES com as MESMAS coordenadas -> continuam 2 leads distintos
    const rowA: NormalizedRow = {
      sourceIndex: 0,
      data: { nome: "A", maps_url: "https://maps.example.com/a", latitude: -3.2, longitude: -40.2 },
      warnings: [],
    }
    const rowB: NormalizedRow = {
      sourceIndex: 1,
      data: { nome: "B", maps_url: "https://maps.example.com/b", latitude: -3.2, longitude: -40.2 },
      warnings: [],
    }
    const classified = classifyRowsWithExisting([rowA, rowB], new Set())

    expect(classified.map((r) => r.classification)).toEqual(["novo", "novo"])
  })

  it("payload de linha existente nunca contém campos manuais/trigger-owned", () => {
    const classified = classifyRowsWithExisting(
      [baseRow(-3.2, -40.2)],
      new Set(["https://maps.example.com/x"])
    )[0]
    const payload = buildPayload(classified, "teste_origem", "org-teste")

    expect(payload.org_id).toBe("org-teste")

    for (const field of NEVER_IMPORTED_FIELDS) {
      expect(payload).not.toHaveProperty(field)
    }
  })
})

// Caso 7 — reimportar o mesmo dataset não duplica o lead
describe("reimport do mesmo dataset", () => {
  it("primeira importação classifica como novo, segunda como existente (não cria um 2º lead)", () => {
    const row: NormalizedRow = {
      sourceIndex: 0,
      data: { nome: "Concessionária X", maps_url: "https://maps.example.com/x" },
      warnings: [],
    }

    const firstImport = classifyRowsWithExisting([row], new Set())
    expect(firstImport[0].classification).toBe("novo")

    // segunda importação: o maps_url da primeira já está no banco
    const secondImport = classifyRowsWithExisting([row], new Set(["https://maps.example.com/x"]))
    expect(secondImport[0].classification).toBe("existente")
  })
})
