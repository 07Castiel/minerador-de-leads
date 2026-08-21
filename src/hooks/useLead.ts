import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { supabase } from "@/lib/supabase"
import type { TablesUpdate } from "@/types/database.types"

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ["leads", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").eq("id", id!).single()
      if (error) throw error
      return data
    },
  })
}

export function useUpdateLead(id: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (update: TablesUpdate<"leads">) => {
      const { data, error } = await supabase
        .from("leads")
        .update(update)
        .eq("id", id!)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["leads", id], data)
      queryClient.invalidateQueries({ queryKey: ["leads"] })
    },
  })
}
