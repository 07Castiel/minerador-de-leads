import { ApiError } from "@google/genai"

import { gerarMensagemWhatsApp } from "@/lib/gemini"
import { MAXIMO_DESCARTADAS } from "@/lib/leads/mensagemWhatsApp"
import { exigirMembro, respostaDeErro } from "@/lib/sessao"
import { supabaseServer } from "@/lib/supabase/server"

// Até dois modelos com 25 s cada (src/lib/gemini.ts), com folga.
export const maxDuration = 60

// Sem observações: no plano gratuito o Google pode usar o que é enviado.
const CAMPOS_DO_LEAD =
  "nome, categoria, cidade, bairro, tem_site, site_url, instagram_handle, instagram_seguidores, instagram_ultimo_post_dias, google_rating, google_avaliacoes_count, google_avaliacoes_sem_resposta, fotos_count, perfil_reivindicado, tem_descricao, tem_horario"

function lerDescartadas(body: unknown): string[] | null {
  if (body === null || typeof body !== "object" || !("descartadas" in body)) return []
  const { descartadas } = body
  if (!Array.isArray(descartadas) || !descartadas.every((d) => typeof d === "string" && d.length <= 2000)) {
    return null
  }
  return descartadas.slice(-MAXIMO_DESCARTADAS)
}

// Escreve com o Gemini a primeira mensagem de WhatsApp para o lead.
export async function POST(request: Request, ctx: RouteContext<"/api/leads/[id]/mensagem-whatsapp">) {
  const sessao = await exigirMembro()
  if (sessao instanceof Response) return sessao

  const { id } = await ctx.params
  const descartadas = lerDescartadas(await request.json().catch(() => null))
  if (!descartadas) return respostaDeErro("descartadas deve ser uma lista de textos.", 400)

  // Leitura com a sessão do usuário: a RLS garante que o lead é da org dele.
  const supabase = await supabaseServer()
  const { data: lead, error } = await supabase.from("leads").select(CAMPOS_DO_LEAD).eq("id", id).maybeSingle()
  if (error) return respostaDeErro(error.message, 500)
  if (!lead) return respostaDeErro("Lead não encontrado.", 404)

  try {
    const mensagem = await gerarMensagemWhatsApp(lead, descartadas)
    return Response.json({ mensagem })
  } catch (err) {
    console.error("Erro ao gerar mensagem de WhatsApp", id, err)
    if (err instanceof ApiError) {
      if (err.status === 429) {
        return respostaDeErro("Limite gratuito do Gemini atingido. Espere um pouco e tente de novo.", 429)
      }
      if (err.status === 400 || err.status === 401 || err.status === 403) {
        return respostaDeErro("O Gemini recusou a chamada. Confira a GEMINI_API_KEY do servidor.", 500)
      }
      return respostaDeErro("O Gemini está indisponível agora. Tente de novo em instantes.", 502)
    }
    return respostaDeErro(err instanceof Error ? err.message : "Erro ao gerar a mensagem.", 500)
  }
}
