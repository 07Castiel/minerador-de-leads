// Registro das mensagens geradas para uso (tabela abordagens). É daqui que sai
// a anti-repetição de lacuna, e mais tarde a taxa de resposta por lacuna.
// Vale para os dois clientes do Supabase: o do navegador e o do servidor.

import type { SupabaseClient } from "@supabase/supabase-js"

import { LIMITES, type LacunaDaAbordagem } from "@/lib/leads/abordagemConfig"
import type { Database, TablesInsert } from "@/types/database.types"

type Cliente = SupabaseClient<Database>

export type RegistroDeAbordagem = TablesInsert<"abordagens">

// Da mais nova pra mais velha, só primeiras abordagens: é o que escolherLacuna
// compara. Follow-up não tem lacuna e não entra.
export async function ultimasLacunasDaOrg(
  supabase: Cliente,
  limite: number = LIMITES.repeticaoMaxima
): Promise<LacunaDaAbordagem[]> {
  const { data, error } = await supabase
    .from("abordagens")
    .select("lacuna")
    .eq("tipo", "primeira")
    .not("lacuna", "is", null)
    .order("criado_em", { ascending: false })
    .limit(limite)
  if (error) throw error
  return (data ?? []).map((linha) => linha.lacuna as LacunaDaAbordagem)
}

export async function registrarAbordagens(supabase: Cliente, registros: RegistroDeAbordagem[]): Promise<void> {
  if (registros.length === 0) return
  const { error } = await supabase.from("abordagens").insert(registros)
  if (error) throw error
}

// Os motivos que bloquearam a geração, num texto só, pra coluna motivo_bloqueio.
export function motivoBloqueioDe(bloqueios: readonly { motivos: string[] }[]): string | null {
  const motivos = [...new Set(bloqueios.flatMap((b) => b.motivos))]
  return motivos.length > 0 ? motivos.join(", ") : null
}
