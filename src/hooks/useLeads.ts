import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { dataLocalIso } from "@/lib/leads/proximoContato"
import { supabaseBrowser } from "@/lib/supabase/client"
import type { Etapa, Lead, MotivoPerda } from "@/types/lead"

export const CHAVE_FUNIL = ["leads", "funil"] as const
// Debaixo do funil: toda invalidação do funil também atualiza a contagem.
const CHAVE_RETORNOS_PENDENTES = [...CHAVE_FUNIL, "retornos-pendentes"] as const

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

// Quantos leads do CRM têm retorno para hoje ou atrasado (número no menu).
export function useContagemRetornosPendentes() {
  const hoje = dataLocalIso(new Date())
  return useQuery({
    queryKey: [...CHAVE_RETORNOS_PENDENTES, hoje],
    queryFn: async () => {
      const { count, error } = await supabaseBrowser()
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("no_funil", true)
        .lte("proximo_contato", hoje)
      if (error) throw error
      return count ?? 0
    },
  })
}

type Retorno = {
  id: string
  // null = sem retorno marcado
  proximoContato: string | null
  etapa?: Etapa
}

function dadosDoRetorno({ id, proximoContato, etapa }: Retorno) {
  return {
    proximo_contato: proximoContato,
    ...(etapa ? dadosDaMudancaDeEtapa({ id, etapa }) : {}),
  }
}

// Marca, adia ou conclui um retorno (e, se vier, muda a etapa junto).
export function useAgendarRetorno() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (retorno: Retorno) => {
      const { data, error } = await supabaseBrowser()
        .from("leads")
        .update(dadosDoRetorno(retorno))
        .eq("id", retorno.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onMutate: async (retorno) => {
      await queryClient.cancelQueries({ queryKey: CHAVE_FUNIL, exact: true })
      const anterior = queryClient.getQueryData<Lead[]>(CHAVE_FUNIL)
      queryClient.setQueryData<Lead[]>(CHAVE_FUNIL, (leads) =>
        leads?.map((l) => (l.id === retorno.id ? { ...l, ...dadosDoRetorno(retorno) } : l))
      )
      return { anterior }
    },
    onError: (_err, _retorno, contexto) => {
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
