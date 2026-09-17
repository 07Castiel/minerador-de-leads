import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { CHAVE_FUNIL } from "@/hooks/useLeads"
import { analisarSiteDoLead } from "@/lib/leads/api"
import { supabaseBrowser } from "@/lib/supabase/client"
import type { TablesUpdate } from "@/types/database.types"

export function useLead(id: string) {
  return useQuery({
    queryKey: ["leads", id],
    queryFn: async () => {
      const { data, error } = await supabaseBrowser().from("leads").select("*").eq("id", id).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useUpdateLead(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (update: TablesUpdate<"leads">) => {
      const { data, error } = await supabaseBrowser()
        .from("leads")
        .update(update)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["leads", id], data)
      void queryClient.invalidateQueries({ queryKey: CHAVE_FUNIL })
    },
  })
}

// Abre o site, mede no celular e grava o resultado; depois recarrega o lead
// onde ele aparece (detalhe, CRM e resultados de busca).
export function useAnalisarSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (leadId: string) => analisarSiteDoLead(leadId),
    onSuccess: (_resposta, leadId) => {
      void queryClient.invalidateQueries({ queryKey: ["leads", leadId] })
      void queryClient.invalidateQueries({ queryKey: CHAVE_FUNIL })
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "buscas" && query.queryKey[2] === "leads",
      })
    },
  })
}
