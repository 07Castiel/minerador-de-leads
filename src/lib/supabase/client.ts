import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

import { supabasePublicEnv } from "@/lib/supabase/env"
import type { Database } from "@/types/database.types"

let client: SupabaseClient<Database> | undefined

// Cliente do navegador. Só chamar dentro de handlers/queries (nunca no topo de
// um módulo): componentes client também são renderizados no servidor.
export function supabaseBrowser(): SupabaseClient<Database> {
  if (!client) {
    const { url, publishableKey } = supabasePublicEnv()
    client = createBrowserClient<Database>(url, publishableKey)
  }
  return client
}
