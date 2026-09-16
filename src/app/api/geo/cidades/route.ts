import { nomeDaUf } from "@/lib/minerador/regras"
import { respostaDeErro } from "@/lib/sessao"

const UM_MES_S = 60 * 60 * 24 * 30

// Municípios de uma UF (IBGE). A lista quase nunca muda: cache de um mês.
export async function GET(request: Request) {
  const uf = new URL(request.url).searchParams.get("uf")?.toUpperCase() ?? ""
  if (!nomeDaUf(uf)) return respostaDeErro("UF inválida.", 400)

  const resp = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`,
    { next: { revalidate: UM_MES_S } }
  )
  if (!resp.ok) return respostaDeErro("Não foi possível carregar as cidades (IBGE).", 502)

  const municipios = (await resp.json()) as { nome: string }[]
  return Response.json(
    { cidades: municipios.map((m) => m.nome) },
    { headers: { "Cache-Control": `public, max-age=${UM_MES_S}` } }
  )
}
