import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { CHAVE_FUNIL } from "@/hooks/useLeads"
import { iniciarBusca, listarCidades, sincronizarBusca } from "@/lib/minerador/api"
import type { NovaBusca } from "@/lib/minerador/regras"
import { supabaseBrowser } from "@/lib/supabase/client"
import { buscaEmAndamento, type Busca } from "@/types/busca"
import type { Lead } from "@/types/lead"

const INTERVALO_SINCRONIZACAO_MS = 5000
const LOTE_ENVIO = 100

// Sem webhook (dev local) a busca só avança quando alguém chama "sincronizar";
// enquanto ela estiver em andamento, a própria query faz esse papel.
async function avancarSeEmAndamento(busca: Busca): Promise<Busca> {
  return buscaEmAndamento(busca.status) ? sincronizarBusca(busca.id) : busca
}

export function useBuscas() {
  return useQuery({
    queryKey: ["buscas"],
    queryFn: async () => {
      const { data, error } = await supabaseBrowser()
        .from("buscas")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(50)

      if (error) throw error
      // Na listagem, falha ao sincronizar uma busca não derruba a lista toda.
      return Promise.all(data.map((b) => avancarSeEmAndamento(b).catch(() => b)))
    },
    refetchInterval: (query) =>
      query.state.data?.some((b) => buscaEmAndamento(b.status)) ? INTERVALO_SINCRONIZACAO_MS : false,
  })
}

export function useBusca(id: string) {
  return useQuery({
    queryKey: ["buscas", id],
    queryFn: async () => {
      const { data, error } = await supabaseBrowser().from("buscas").select("*").eq("id", id).maybeSingle()
      if (error) throw error
      return data ? avancarSeEmAndamento(data) : null
    },
    refetchInterval: (query) =>
      query.state.data && buscaEmAndamento(query.state.data.status)
        ? INTERVALO_SINCRONIZACAO_MS
        : false,
  })
}

export function useBuscaLeads(buscaId: string, habilitado: boolean) {
  return useQuery({
    queryKey: ["buscas", buscaId, "leads"],
    enabled: habilitado,
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await supabaseBrowser()
        .from("leads")
        .select("*, buscas_leads!inner(busca_id)")
        .eq("buscas_leads.busca_id", buscaId)
        .order("score", { ascending: false, nullsFirst: false })

      if (error) throw error
      return data.map(({ buscas_leads: _vinculo, ...lead }) => lead)
    },
  })
}

export function useIniciarBusca() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (nova: NovaBusca) => iniciarBusca(nova),
    onSuccess: (busca) => {
      queryClient.setQueryData(["buscas", busca.id], busca)
      void queryClient.invalidateQueries({ queryKey: ["buscas"], exact: true })
    },
  })
}

// "Enviar ao CRM": o lead já existe no banco desde a busca; só passa a
// aparecer no funil.
export function useEnviarAoCrm(buscaId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (leadIds: string[]) => {
      for (let i = 0; i < leadIds.length; i += LOTE_ENVIO) {
        const { error } = await supabaseBrowser()
          .from("leads")
          .update({ no_funil: true })
          .in("id", leadIds.slice(i, i + LOTE_ENVIO))
        if (error) throw error
      }
      return leadIds.length
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["buscas", buscaId, "leads"] })
      void queryClient.invalidateQueries({ queryKey: CHAVE_FUNIL })
    },
  })
}

export function useCidades(uf: string) {
  return useQuery({
    queryKey: ["cidades", uf],
    enabled: uf !== "",
    staleTime: Infinity,
    queryFn: () => listarCidades(uf),
  })
}
