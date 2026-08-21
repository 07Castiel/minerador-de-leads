import { useQuery } from "@tanstack/react-query"

import { supabase } from "@/lib/supabase"

export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("score", { ascending: false })

      if (error) throw error
      return data
    },
  })
}
