import type { Json } from "@/types/database.types"

const usd = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
})

export function formatarUsd(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? "—" : usd.format(valor)
}

export function formatarDataHora(iso: string): string {
  return dataHora.format(new Date(iso))
}

// `buscas.filtros` é jsonb — lê de forma defensiva em vez de confiar no tipo.
export function descreverFiltros(filtros: Json): string[] {
  if (typeof filtros !== "object" || filtros === null || Array.isArray(filtros)) return []

  const descricoes: string[] = []
  if (filtros.site === "sem_site") descricoes.push("só sem site")
  if (filtros.site === "com_site") descricoes.push("só com site")
  if (typeof filtros.notaMinima === "string" && filtros.notaMinima !== "") {
    descricoes.push(`nota ≥ ${filtros.notaMinima.replace(".", ",")}`)
  }
  if (filtros.ignorarFechados === true) descricoes.push("sem fechados")
  return descricoes
}
