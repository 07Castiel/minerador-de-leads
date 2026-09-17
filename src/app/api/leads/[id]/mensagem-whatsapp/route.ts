import { redatorGemini } from "@/lib/gemini"
import { mensagemParaJanela, type ModoDaJanela } from "@/lib/leads/abordagem"
import { MAXIMO_DESCARTADAS } from "@/lib/leads/mensagemWhatsApp"
import { exigirMembro, respostaDeErro } from "@/lib/sessao"
import { supabaseServer } from "@/lib/supabase/server"

// Duas tentativas do Gemini com 25 s cada (src/lib/gemini.ts), com folga.
export const maxDuration = 60

// Só o que a camada 1 usa. Sem observações: no plano gratuito o Google pode usar
// o que é enviado (e o Gemini nem recebe mais os dados do lead).
const CAMPOS_DO_LEAD =
  "nome, categoria, bairro, cidade, tem_site, site_url, site_url_final, site_status, site_https, site_responsivo, site_nota_celular, site_dominio_gratuito, instagram_handle, perfil_reivindicado, fotos_count, google_rating, google_avaliacoes_count, buscas_leads(buscas(nicho))"

const MODOS: readonly ModoDaJanela[] = ["completa", "curta", "gemini"]

type Pedido = { modo: ModoDaJanela; descartadas: string[] }

function lerPedido(body: unknown): Pedido | null {
  if (body === null || typeof body !== "object") return null
  const { modo, descartadas = [] } = body as { modo?: unknown; descartadas?: unknown }
  if (!MODOS.includes(modo as ModoDaJanela)) return null
  if (!Array.isArray(descartadas) || !descartadas.every((d) => typeof d === "string" && d.length <= 2000)) {
    return null
  }
  return { modo: modo as ModoDaJanela, descartadas: descartadas.slice(-MAXIMO_DESCARTADAS) }
}

// Mensagem da janela do WhatsApp: camada 1 decide, texto fixo ou Gemini redige,
// camada 3 valida. Fora do horário e lead sem lacuna voltam sem mensagem.
export async function POST(request: Request, ctx: RouteContext<"/api/leads/[id]/mensagem-whatsapp">) {
  const sessao = await exigirMembro()
  if (sessao instanceof Response) return sessao

  const { id } = await ctx.params
  const pedido = lerPedido(await request.json().catch(() => null))
  if (!pedido) return respostaDeErro('Envie { modo: "completa" | "curta" | "gemini", descartadas?: string[] }.', 400)

  // Leitura com a sessão do usuário: a RLS garante que o lead é da org dele.
  const supabase = await supabaseServer()
  const { data, error } = await supabase.from("leads").select(CAMPOS_DO_LEAD).eq("id", id).maybeSingle()
  if (error) return respostaDeErro(error.message, 500)
  if (!data) return respostaDeErro("Lead não encontrado.", 404)

  const { buscas_leads, ...lead } = data
  const termoDaBusca = buscas_leads?.[0]?.buscas?.nicho ?? null

  try {
    const resultado = await mensagemParaJanela(
      lead,
      new Date(),
      pedido.modo,
      // Anti-repetição fica vazia até existir o registro das mensagens abertas.
      { termoDaBusca },
      pedido.modo === "gemini" ? redatorGemini(pedido.descartadas) : undefined
    )
    // Até existir a tabela de abordagens, o motivo de cada bloqueio fica no log do servidor.
    if ("bloqueios" in resultado && resultado.bloqueios.length > 0) {
      console.warn("Mensagem de WhatsApp bloqueada", id, pedido.modo, JSON.stringify(resultado.bloqueios))
    }
    return Response.json(resultado)
  } catch (err) {
    console.error("Erro ao montar mensagem de WhatsApp", id, err)
    return respostaDeErro(err instanceof Error ? err.message : "Erro ao montar a mensagem.", 500)
  }
}
