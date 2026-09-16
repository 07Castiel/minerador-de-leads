import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { supabaseBrowser } from "@/lib/supabase/client"
import type { Etapa, Lead, MotivoPerda } from "@/types/lead"

export const CHAVE_FUNIL = ["leads", "funil"] as const

// Só leads que estão no CRM. Minerados que ainda não foram enviados ficam na
// tela da busca.
export function useLeadsDoFunil() {
  return useQuery({
    queryKey: CHAVE_FUNIL,
    queryFn: async () => {
      const { data, error } = await supabaseBrowser()
        .from("leads")
        .select("*")
        .eq("no_funil", true)
        .order("score", { ascending: false, nullsFirst: false })

      if (error) throw error
      return data
    },
  })
}

type MudancaDeEtapa = {
  id: string
  etapa: Etapa
  motivoPerda?: MotivoPerda | null
}

export function dadosDaMudancaDeEtapa({ etapa, motivoPerda }: MudancaDeEtapa) {
  return {
    etapa,
    // motivo só faz sentido em "perdido"; sair de perdido limpa o motivo.
    motivo_perda: etapa === "perdido" ? (motivoPerda ?? "outro") : null,
    etapa_atualizada_em: new Date().toISOString(),
  }
}

// Mover card no quadro: atualiza a lista na hora e desfaz se o banco recusar.
export function useMudarEtapa() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (mudanca: MudancaDeEtapa) => {
      const { data, error } = await supabaseBrowser()
        .from("leads")
        .update(dadosDaMudancaDeEtapa(mudanca))
        .eq("id", mudanca.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onMutate: async (mudanca) => {
      await queryClient.cancelQueries({ queryKey: CHAVE_FUNIL })
      const anterior = queryClient.getQueryData<Lead[]>(CHAVE_FUNIL)
      queryClient.setQueryData<Lead[]>(CHAVE_FUNIL, (leads) =>
        leads?.map((l) => (l.id === mudanca.id ? { ...l, ...dadosDaMudancaDeEtapa(mudanca) } : l))
      )
      return { anterior }
    },
    onError: (_err, _mudanca, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(CHAVE_FUNIL, contexto.anterior)
    },
    onSuccess: (lead) => {
      queryClient.setQueryData(["leads", lead.id], lead)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CHAVE_FUNIL })
    },
  })
}
