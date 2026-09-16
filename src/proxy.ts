import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

import type { Database } from "@/types/database.types"

const ROTAS_PUBLICAS = ["/login"]

// Renova a sessão do Supabase a cada navegação (grava cookies novos na
// resposta) e manda quem não está logado para /login. É só a checagem
// otimista: as páginas e APIs conferem o usuário de novo no servidor.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
        },
      },
    }
  )

  // getClaims valida o JWT e, se preciso, renova a sessão (chama setAll).
  const { data } = await supabase.auth.getClaims()
  const logado = !!data?.claims

  const { pathname } = request.nextUrl
  const publica = ROTAS_PUBLICAS.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`))

  if (!logado && !publica && !pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    // Tudo menos arquivos estáticos e o webhook do Apify (que não tem sessão).
    "/((?!_next/static|_next/image|icon.svg|favicon.ico|api/apify/webhook).*)",
  ],
}
