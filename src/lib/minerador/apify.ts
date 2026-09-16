import "server-only"

import { APIFY_ACTOR_ID, CAMPOS_DATASET_APIFY } from "@/lib/minerador/regras"

const APIFY_API = "https://api.apify.com/v2"
const LOTE_DATASET = 1000

export const STATUS_TERMINAIS_APIFY = ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"]

export type ApifyRun = {
  id: string
  status: string
  defaultDatasetId: string
}

function apifyToken(): string {
  const token = process.env.APIFY_TOKEN
  if (!token) throw new Error("Falta APIFY_TOKEN nas variáveis de ambiente do servidor.")
  return token
}

async function apifyFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${APIFY_API}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apifyToken()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  })
  if (!resp.ok) {
    const detalhe = (await resp.text()).slice(0, 500)
    throw new Error(`Apify respondeu ${resp.status}: ${detalhe}`)
  }
  return (await resp.json()) as T
}

type OpcoesRun = {
  limiteCobrancaUsd: number
  // Quando o app tem URL pública, o Apify avisa o fim da run por webhook.
  webhookUrl: string | null
}

export async function iniciarRunGoogleMaps(
  input: Record<string, unknown>,
  { limiteCobrancaUsd, webhookUrl }: OpcoesRun
): Promise<ApifyRun> {
  const params = new URLSearchParams({ maxTotalChargeUsd: String(limiteCobrancaUsd) })

  if (webhookUrl) {
    const webhooks = [
      {
        eventTypes: [
          "ACTOR.RUN.SUCCEEDED",
          "ACTOR.RUN.FAILED",
          "ACTOR.RUN.ABORTED",
          "ACTOR.RUN.TIMED_OUT",
        ],
        requestUrl: webhookUrl,
      },
    ]
    params.set("webhooks", Buffer.from(JSON.stringify(webhooks)).toString("base64"))
  }

  const { data } = await apifyFetch<{ data: ApifyRun }>(`/acts/${APIFY_ACTOR_ID}/runs?${params}`, {
    method: "POST",
    body: JSON.stringify(input),
  })
  return data
}

export async function buscarRun(runId: string): Promise<ApifyRun> {
  const { data } = await apifyFetch<{ data: ApifyRun }>(`/actor-runs/${encodeURIComponent(runId)}`)
  return data
}

export async function baixarDataset(datasetId: string): Promise<unknown[]> {
  const itens: unknown[] = []
  for (let offset = 0; ; offset += LOTE_DATASET) {
    const params = new URLSearchParams({
      clean: "true",
      format: "json",
      offset: String(offset),
      limit: String(LOTE_DATASET),
      fields: CAMPOS_DATASET_APIFY.join(","),
    })
    const pagina = await apifyFetch<unknown[]>(
      `/datasets/${encodeURIComponent(datasetId)}/items?${params}`
    )
    itens.push(...pagina)
    if (pagina.length < LOTE_DATASET) return itens
  }
}
