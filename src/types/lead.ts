import type { Tables } from "@/types/database.types"

export type Lead = Tables<"leads">

// Espelha a CHECK constraint leads_etapa_check. A ordem é a do funil.
export const ETAPAS = [
  "novo",
  "abordado",
  "agendado",
  "follow_up",
  "convertido",
  "perdido",
] as const

export type Etapa = (typeof ETAPAS)[number]

export const ETAPA_LABELS: Record<Etapa, string> = {
  novo: "Novo",
  abordado: "Abordado",
  agendado: "Agendado",
  follow_up: "Follow-up",
  convertido: "Convertido",
  perdido: "Perdido",
}

export const ETAPA_DESCRICOES: Record<Etapa, string> = {
  novo: "Ainda não teve contato",
  abordado: "Primeiro contato feito",
  agendado: "Reunião ou visita marcada",
  follow_up: "Proposta feita, aguardando retorno",
  convertido: "Virou cliente",
  perdido: "Não fechou",
}

export function isEtapa(valor: string): valor is Etapa {
  return (ETAPAS as readonly string[]).includes(valor)
}

// Espelha a CHECK constraint leads_motivo_perda_check.
export const MOTIVOS_PERDA = [
  "preco",
  "sem_resposta",
  "ja_tem_fornecedor",
  "fechou_com_outro",
  "decisor_nao_aprovou",
  "nao_e_o_momento",
  "nao_viu_valor",
  "outro",
] as const

export type MotivoPerda = (typeof MOTIVOS_PERDA)[number]

export const MOTIVO_PERDA_LABELS: Record<MotivoPerda, string> = {
  preco: "Achou caro / sem orçamento",
  sem_resposta: "Parou de responder",
  ja_tem_fornecedor: "Já tem site ou fornecedor",
  fechou_com_outro: "Fechou com outra empresa",
  decisor_nao_aprovou: "Sócio ou decisor não aprovou",
  nao_e_o_momento: "Não é o momento",
  nao_viu_valor: "Não viu valor",
  outro: "Outro motivo",
}

export const TEMPERATURA_VALUES = ["quente", "morno", "frio"] as const

export type Temperatura = (typeof TEMPERATURA_VALUES)[number]
