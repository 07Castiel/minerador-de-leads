import { exigirMembro, respostaDeErro } from "@/lib/sessao"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { supabaseServer } from "@/lib/supabase/server"
import { avancarBusca } from "@/lib/minerador/buscas"

// Chamado pela tela enquanto a busca roda. Faz o mesmo que o webhook do Apify,
// então funciona também em dev local, onde o Apify não alcança o app.
export async function POST(_request: Request, ctx: RouteContext<"/api/buscas/[id]/sincronizar">) {
  const sessao = await exigirMembro()
  if (sessao instanceof Response) return sessao

  const { id } = await ctx.params

  // Leitura com a sessão do usuário: a RLS garante que a busca é da org dele.
  const supabase = await supabaseServer()
  const { data: visivel, error } = await supabase.from("buscas").select("id").eq("id", id).maybeSingle()
  if (error) return respostaDeErro(error.message, 500)
  if (!visivel) return respostaDeErro("Busca não encontrada.", 404)

  try {
    const busca = await avancarBusca(supabaseAdmin(), id)
    return Response.json({ busca })
  } catch (err) {
    console.error("Erro ao sincronizar busca", id, err)
    return respostaDeErro(err instanceof Error ? err.message : "Erro ao sincronizar a busca.", 500)
  }
}
