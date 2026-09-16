// Leitura explícita (process.env.NOME literal) pra o Next conseguir embutir
// as variáveis NEXT_PUBLIC_ no bundle do navegador.
export function supabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (veja .env.example)."
    )
  }

  return { url, publishableKey }
}
