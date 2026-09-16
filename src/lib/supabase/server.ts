import "server-only"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import { supabasePublicEnv } from "@/lib/supabase/env"
import type { Database } from "@/types/database.types"

// Cliente com a sessão do usuário (RLS vale). Um por request.
export async function supabaseServer() {
  const cookieStore = await cookies()
  const { url, publishableKey } = supabasePublicEnv()

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components não podem gravar cookies; o proxy renova a
          // sessão antes da página renderizar, então dá pra ignorar aqui.
        }
      },
    },
  })
}
