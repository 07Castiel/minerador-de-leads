import type { NormalizedRow } from "@/lib/import/types"

export type ValidationResult = {
  isValid: boolean
  reason?: string
}

// Único campo bloqueante: `nome` é o único NOT NULL da tabela. Todo o resto
// (números inválidos, coordenadas fora do intervalo, tem_site ambíguo) já
// virou warning no normalizer e não impede a linha de seguir pro dedupe.
export function validateRow(row: NormalizedRow): ValidationResult {
  const nome = row.data.nome
  if (!nome || nome.trim() === "") {
    return { isValid: false, reason: "Nome ausente (campo obrigatório)" }
  }
  return { isValid: true }
}
