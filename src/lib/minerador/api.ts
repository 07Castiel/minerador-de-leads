import type { NovaBusca } from "@/lib/minerador/regras"
import type { Busca } from "@/types/busca"

export async function chamarApi<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  const corpo = await resp.json().catch(() => null)
  if (!resp.ok) {
    throw new Error(corpo?.error ?? `Erro ${resp.status} ao chamar ${url}.`)
  }
  return corpo as T
}

export async function iniciarBusca(nova: NovaBusca): Promise<Busca> {
  const { busca } = await chamarApi<{ busca: Busca }>("/api/buscas", {
    method: "POST",
    body: JSON.stringify(nova),
  })
  return busca
}

export async function sincronizarBusca(buscaId: string): Promise<Busca> {
  const { busca } = await chamarApi<{ busca: Busca }>(
    `/api/buscas/${encodeURIComponent(buscaId)}/sincronizar`,
    { method: "POST" }
  )
  return busca
}

export async function listarCidades(uf: string): Promise<string[]> {
  const { cidades } = await chamarApi<{ cidades: string[] }>(
    `/api/geo/cidades?uf=${encodeURIComponent(uf)}`
  )
  return cidades
}
