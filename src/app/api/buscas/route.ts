import { exigirMembro, respostaDeErro } from "@/lib/sessao"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { iniciarBusca } from "@/lib/minerador/buscas"
import { validarNovaBusca } from "@/lib/minerador/regras"

// Dispara uma busca no Google Maps (via Apify) para a org do usuário.
export async function POST(request: Request) {
  const sessao = await exigirMembro()
  if (sessao instanceof Response) return sessao

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return respostaDeErro("JSON inválido.", 400)
  }

  const validacao = validarNovaBusca(body)
  if (!validacao.ok) return respostaDeErro(validacao.erro, 400)

  try {
    const busca = await iniciarBusca(supabaseAdmin(), {
      orgId: sessao.org.id,
      userId: sessao.userId,
      nova: validacao.valor,
    })
    return Response.json({ busca })
  } catch (err) {
    console.error("Erro ao iniciar busca", err)
    return respostaDeErro(err instanceof Error ? err.message : "Erro ao iniciar a busca.", 500)
  }
}
