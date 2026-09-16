import "server-only"

import { createClient } from "@supabase/supabase-js"

import { supabasePublicEnv } from "@/lib/supabase/env"
import type { Database } from "@/types/database.types"

// Chave secreta: ignora RLS. Usar só depois de confirmar no código a qual org
// o usuário pertence (ou em webhooks autenticados por segredo).
export function supabaseAdmin() {
  const { url } = supabasePublicEnv()
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!secretKey) {
    throw new Error("Falta SUPABASE_SECRET_KEY nas variáveis de ambiente do servidor.")
  }

  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
