import type { Tables } from "@/types/database.types"

export type Busca = Tables<"buscas">

// Espelha a CHECK constraint de buscas.status
// (supabase/migrations/20260916180000_schema_inicial.sql).
export const BUSCA_STATUS_VALUES = [
  "iniciando",
  "rodando",
  "processando",
  "concluida",
  "erro",
] as const

export type BuscaStatus = (typeof BUSCA_STATUS_VALUES)[number]

export const BUSCA_STATUS_LABELS: Record<BuscaStatus, string> = {
  iniciando: "Iniciando",
  rodando: "Buscando no Google Maps",
  processando: "Salvando leads",
  concluida: "Concluída",
  erro: "Erro",
}

// Buscas nesses status ainda precisam de "sincronizar" pra chegar ao fim.
export function buscaEmAndamento(status: string): boolean {
  return status === "iniciando" || status === "rodando" || status === "processando"
}
