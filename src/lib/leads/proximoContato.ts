// Próximo contato: data de retorno (leads.proximo_contato, "AAAA-MM-DD").
// As contas usam só a data, no fuso de quem está usando o app.

export const ATALHOS_DE_RETORNO = [
  { dias: 1, label: "Amanhã" },
  { dias: 3, label: "Em 3 dias" },
  { dias: 7, label: "Em 1 semana" },
  { dias: 14, label: "Em 2 semanas" },
] as const

const DIA_MS = 24 * 60 * 60 * 1000

function doisDigitos(n: number): string {
  return String(n).padStart(2, "0")
}

// Data de hoje no fuso local, no formato da coluna.
export function dataLocalIso(agora: Date): string {
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`
}

function paraUtc(iso: string): number {
  const [ano, mes, dia] = iso.split("-").map(Number)
  return Date.UTC(ano, mes - 1, dia)
}

export function somarDias(iso: string, dias: number): string {
  const data = new Date(paraUtc(iso) + dias * DIA_MS)
  return `${data.getUTCFullYear()}-${doisDigitos(data.getUTCMonth() + 1)}-${doisDigitos(data.getUTCDate())}`
}

// Positivo: `ate` vem depois de `de`.
export function diasEntre(de: string, ate: string): number {
  return Math.round((paraUtc(ate) - paraUtc(de)) / DIA_MS)
}

export type SituacaoDoRetorno = "atrasado" | "hoje" | "futuro"

export function situacaoDoRetorno(proximo: string, hoje: string): SituacaoDoRetorno {
  const dias = diasEntre(hoje, proximo)
  if (dias < 0) return "atrasado"
  if (dias === 0) return "hoje"
  return "futuro"
}

// Hoje e atrasados: o que aparece na lista "Hoje".
export function retornoPendente(proximo: string | null, hoje: string): boolean {
  return proximo !== null && diasEntre(hoje, proximo) <= 0
}

const DIAS_DA_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]

export function descreverRetorno(proximo: string, hoje: string): string {
  const dias = diasEntre(hoje, proximo)
  if (dias < -1) return `Atrasado ${-dias} dias`
  if (dias === -1) return "Era pra ontem"
  if (dias === 0) return "Retornar hoje"
  if (dias === 1) return "Retornar amanhã"
  const [, mes, dia] = proximo.split("-")
  const semana = DIAS_DA_SEMANA[new Date(paraUtc(proximo)).getUTCDay()]
  return dias < 7 ? `Retornar ${semana}, ${dia}/${mes}` : `Retornar ${dia}/${mes}`
}
