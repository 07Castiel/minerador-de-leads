import "server-only"

import { lerPageSpeed, type MedicaoPageSpeed } from "@/lib/leads/analiseSite"

// PageSpeed Insights (Google), estratégia celular. Gratuito, mas desde 2025 só
// funciona com chave: sem PAGESPEED_API_KEY a cota anônima é zero.
const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
// O Lighthouse leva de 10 a 40 s por página.
const TEMPO_LIMITE_MS = 45_000

export type ResultadoPageSpeed =
  | { tipo: "medido"; medicao: MedicaoPageSpeed }
  | { tipo: "sem_chave" }
  | { tipo: "falhou"; motivo: string }

// sinal: permite desistir da medição (ex.: o site nem abriu).
export async function medirNoCelular(url: string, sinal?: AbortSignal): Promise<ResultadoPageSpeed> {
  const chave = process.env.PAGESPEED_API_KEY
  if (!chave) return { tipo: "sem_chave" }

  const params = new URLSearchParams({ url, strategy: "mobile", category: "performance", key: chave })
  try {
    const resp = await fetch(`${ENDPOINT}?${params}`, {
      signal: sinal ? AbortSignal.any([sinal, AbortSignal.timeout(TEMPO_LIMITE_MS)]) : AbortSignal.timeout(TEMPO_LIMITE_MS),
      cache: "no-store",
    })
    const corpo: unknown = await resp.json().catch(() => null)
    if (!resp.ok) {
      const mensagem = (corpo as { error?: { message?: string } } | null)?.error?.message
      if (resp.status === 429) return { tipo: "falhou", motivo: "Limite do PageSpeed atingido." }
      if (resp.status === 400 && mensagem && /api key/i.test(mensagem)) {
        return { tipo: "falhou", motivo: "A PAGESPEED_API_KEY foi recusada pelo Google." }
      }
      // 500 do PageSpeed costuma ser a página que não carregou para o Lighthouse.
      return { tipo: "falhou", motivo: `O PageSpeed não conseguiu medir (erro ${resp.status}).` }
    }
    const medicao = lerPageSpeed(corpo)
    return medicao ? { tipo: "medido", medicao } : { tipo: "falhou", motivo: "O PageSpeed não conseguiu medir." }
  } catch (err) {
    if (sinal?.aborted) return { tipo: "falhou", motivo: "Medição cancelada." }
    const motivo =
      err instanceof Error && err.name === "TimeoutError"
        ? "O PageSpeed demorou demais para medir."
        : "Não deu pra falar com o PageSpeed."
    return { tipo: "falhou", motivo }
  }
}
