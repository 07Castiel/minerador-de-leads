import { analisarSite, normalizarUrlDoSite, type RespostaAnaliseDeSite } from "@/lib/leads/analiseSite"
import { buscarPagina } from "@/lib/leads/buscarPagina"
import { medirNoCelular } from "@/lib/leads/pageSpeed"
import { classificarLink } from "@/lib/leads/presencaDigital"
import { exigirMembro, respostaDeErro } from "@/lib/sessao"
import { supabaseServer } from "@/lib/supabase/server"

// Página (até 15 s) e PageSpeed (até 45 s) rodam juntos.
export const maxDuration = 60

// Abre o site do lead, mede no celular e grava o resultado nas colunas site_*.
export async function POST(_request: Request, ctx: RouteContext<"/api/leads/[id]/analisar-site">) {
  const sessao = await exigirMembro()
  if (sessao instanceof Response) return sessao

  const { id } = await ctx.params

  // Leitura e gravação com a sessão do usuário: a RLS garante que o lead é da org dele.
  const supabase = await supabaseServer()
  const { data: lead, error } = await supabase.from("leads").select("id, site_url").eq("id", id).maybeSingle()
  if (error) return respostaDeErro(error.message, 500)
  if (!lead) return respostaDeErro("Lead não encontrado.", 404)

  const url = classificarLink(lead.site_url)?.tipo === "site" ? normalizarUrlDoSite(lead.site_url ?? "") : null
  if (!url) return respostaDeErro("Este lead não tem link de site próprio para analisar.", 400)

  // O PageSpeed só vale para site que abre; se a página falhar, desiste dele.
  const cancelarPageSpeed = new AbortController()
  const [busca, pageSpeed] = await Promise.all([
    buscarPagina(url).then((resultado) => {
      if (resultado.tipo !== "pagina" || resultado.status >= 300) cancelarPageSpeed.abort()
      return resultado
    }),
    medirNoCelular(url, cancelarPageSpeed.signal),
  ])

  const atualizacao = analisarSite({
    busca,
    pageSpeed: pageSpeed.tipo === "medido" ? pageSpeed.medicao : null,
    agora: new Date(),
  })

  const { error: erroAoSalvar } = await supabase.from("leads").update(atualizacao).eq("id", id)
  if (erroAoSalvar) return respostaDeErro(erroAoSalvar.message, 500)

  const resposta: RespostaAnaliseDeSite =
    atualizacao.site_status !== "ok"
      ? { velocidade: "nao_se_aplica", avisoVelocidade: null }
      : pageSpeed.tipo === "medido"
        ? { velocidade: "medida", avisoVelocidade: null }
        : pageSpeed.tipo === "sem_chave"
          ? { velocidade: "sem_chave", avisoVelocidade: null }
          : { velocidade: "falhou", avisoVelocidade: pageSpeed.motivo }
  return Response.json(resposta)
}
