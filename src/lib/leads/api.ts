import type { MensagemDaJanela, ModoDaJanela } from "@/lib/leads/abordagem"
import type { RespostaAnaliseDeSite } from "@/lib/leads/analiseSite"
import { chamarApi } from "@/lib/minerador/api"

export async function analisarSiteDoLead(leadId: string): Promise<RespostaAnaliseDeSite> {
  return chamarApi<RespostaAnaliseDeSite>(`/api/leads/${encodeURIComponent(leadId)}/analisar-site`, {
    method: "POST",
  })
}

export async function pedirMensagemDaJanela(
  leadId: string,
  modo: ModoDaJanela,
  descartadas: string[] = []
): Promise<MensagemDaJanela> {
  return chamarApi<MensagemDaJanela>(`/api/leads/${encodeURIComponent(leadId)}/mensagem-whatsapp`, {
    method: "POST",
    body: JSON.stringify({ modo, descartadas }),
  })
}
