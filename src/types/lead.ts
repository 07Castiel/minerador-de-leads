import type { Tables } from "@/types/database.types"

export type Lead = Tables<"leads">

// Valores definidos no comentário original da coluna `status` em
// schema_leads_sobral.sql — não é uma CHECK constraint no banco.
export const STATUS_VALUES = [
  "novo",
  "contatado",
  "visitado",
  "proposta_enviada",
  "fechado",
  "perdido",
] as const

export type Status = (typeof STATUS_VALUES)[number]

export const TEMPERATURA_VALUES = ["quente", "morno", "frio"] as const

export type Temperatura = (typeof TEMPERATURA_VALUES)[number]

export const STATUS_LABELS: Record<Status, string> = {
  novo: "Novo",
  contatado: "Contatado",
  visitado: "Visitado",
  proposta_enviada: "Proposta enviada",
  fechado: "Fechado",
  perdido: "Perdido",
}
