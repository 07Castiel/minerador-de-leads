import { timingSafeEqual } from "node:crypto"
import { after } from "next/server"

import { respostaDeErro } from "@/lib/sessao"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { avancarBusca } from "@/lib/minerador/buscas"

export const maxDuration = 300

function segredoConfere(recebido: string | null): boolean {
  const esperado = process.env.APIFY_WEBHOOK_SECRET
  if (!esperado || !recebido) return false
  const a = Buffer.from(recebido)
  const b = Buffer.from(esperado)
  return a.length === b.length && timingSafeEqual(a, b)
}

function idDaRun(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null
  const { resource, eventData } = payload as {
    resource?: { id?: unknown }
    eventData?: { actorRunId?: unknown }
  }
  const id = resource?.id ?? eventData?.actorRunId
  return typeof id === "string" && id !== "" ? id : null
}

// Apify avisa que a run terminou. Responde na hora e processa depois (after),
// pra o Apify não reenviar por timeout.
export async function POST(request: Request) {
  const segredo = new URL(request.url).searchParams.get("segredo")
  if (!segredoConfere(segredo)) return respostaDeErro("Não autorizado.", 401)

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return respostaDeErro("JSON inválido.", 400)
  }

  const runId = idDaRun(payload)
  if (!runId) return respostaDeErro("Payload sem id da run.", 400)

  const admin = supabaseAdmin()
  const { data: busca, error } = await admin
    .from("buscas")
    .select("id")
    .eq("apify_run_id", runId)
    .maybeSingle()
  if (error) return respostaDeErro(error.message, 500)
  // Run que não é de uma busca nossa: confirma pra não gerar reenvio.
  if (!busca) return Response.json({ ok: true, ignorado: true })

  after(async () => {
    try {
      await avancarBusca(admin, busca.id)
    } catch (err) {
      console.error("Erro ao processar webhook do Apify", busca.id, err)
    }
  })

  return Response.json({ ok: true })
}
