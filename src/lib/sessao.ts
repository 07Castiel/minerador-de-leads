import "server-only"

import { cache } from "react"

import { supabaseServer } from "@/lib/supabase/server"

export type OrgDaSessao = { id: string; nome: string; papel: string }

export type Sessao = {
  userId: string
  email: string | null
  org: OrgDaSessao | null
}

// Usuário logado + org ativa (por enquanto a primeira em que ele é membro).
// `cache` evita repetir as consultas quando layout e página pedem no mesmo request.
export const obterSessao = cache(async (): Promise<Sessao | null> => {
  const supabase = await supabaseServer()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims) return null

  const { data: membro, error } = await supabase
    .from("membros")
    .select("papel, criado_em, organizacoes(id, nome)")
    .eq("user_id", claims.sub)
    .order("criado_em")
    .limit(1)
    .maybeSingle()

  if (error) throw error

  const org = membro?.organizacoes
    ? { id: membro.organizacoes.id, nome: membro.organizacoes.nome, papel: membro.papel }
    : null

  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    org,
  }
})

export function respostaDeErro(mensagem: string, status: number): Response {
  return Response.json({ error: mensagem }, { status })
}

type SessaoComOrg = Sessao & { org: OrgDaSessao }

// Para route handlers: devolve a sessão com org ou a resposta de erro pronta.
export async function exigirMembro(): Promise<SessaoComOrg | Response> {
  const sessao = await obterSessao()
  if (!sessao) return respostaDeErro("Sessão expirada. Entre de novo.", 401)
  if (!sessao.org) return respostaDeErro("Sua conta não pertence a nenhuma organização.", 403)
  return sessao as SessaoComOrg
}
