import type { TablesInsert } from "@/types/database.types"

// Colunas que o import tem permissão de escrever. Nunca inclui status,
// observacoes, campos de Instagram, google_avaliacoes_sem_resposta, score,
// temperatura, criado_em, atualizado_em, id — essas são manuais/trigger-owned
// e o import nunca as toca, mesmo em reimportação.
export type ImportControlledField =
  | "nome"
  | "categoria"
  | "cidade"
  | "bairro"
  | "endereco"
  | "telefone"
  | "maps_url"
  | "tem_site"
  | "google_rating"
  | "google_avaliacoes_count"
  | "latitude"
  | "longitude"

export type ParsedData = {
  headers: string[]
  rows: Record<string, unknown>[]
}

// Mapeamento centrado no destino: cada campo import-controlled aponta pra
// uma coluna de origem (ou null se não mapeado). `origem` é texto livre do
// lote inteiro, não vem do mapeamento por coluna.
export type ColumnMapping = Partial<Record<ImportControlledField, string | null>>

export type RowWarning = {
  field: ImportControlledField
  message: string
}

export type NormalizedRow = {
  sourceIndex: number
  data: Partial<TablesInsert<"leads">>
  warnings: RowWarning[]
}

export type RowClassification = "novo" | "existente" | "invalido"

export type ClassifiedRow = NormalizedRow & {
  classification: RowClassification
  invalidReason?: string
}

export type ImportSummary = {
  totalLinhas: number
  novos: number
  atualizados: number
  ignorados: number
  erros: number
  warnings: string[]
}
