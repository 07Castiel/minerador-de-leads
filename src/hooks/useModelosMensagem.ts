import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { supabaseBrowser } from "@/lib/supabase/client"
import type { Tables } from "@/types/database.types"

export type ModeloMensagem = Tables<"modelos_mensagem">

const CHAVE_MODELOS = ["modelos_mensagem"] as const

// Exportado para quem precisa esperar os modelos num clique (ensureQueryData).
export const consultaDosModelos = queryOptions({
  queryKey: CHAVE_MODELOS,
  queryFn: async () => {
    const { data, error } = await supabaseBrowser()
      .from("modelos_mensagem")
      .select("*")
      .order("ordem")
      .order("criado_em")
    if (error) throw error
    return data
  },
})

export function useModelosMensagem() {
  return useQuery(consultaDosModelos)
}

type ModeloParaSalvar = { id?: string; nome: string; texto: string; ordem?: number }

// Sem id cria; com id atualiza. A org vem do default da coluna (org atual).
export function useSalvarModelo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, nome, texto, ordem }: ModeloParaSalvar) => {
      const dados = { nome: nome.trim(), texto: texto.trim(), ...(ordem !== undefined ? { ordem } : {}) }
      const consulta = id
        ? supabaseBrowser()
            .from("modelos_mensagem")
            .update({ ...dados, atualizado_em: new Date().toISOString() })
            .eq("id", id)
        : supabaseBrowser().from("modelos_mensagem").insert(dados)
      const { data, error } = await consulta.select().single()
      if (error) throw error
      return data
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CHAVE_MODELOS })
    },
  })
}

export function useExcluirModelo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseBrowser().from("modelos_mensagem").delete().eq("id", id)
      if (error) throw error
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CHAVE_MODELOS })
    },
  })
}
