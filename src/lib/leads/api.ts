import type { RespostaAnaliseDeSite } from "@/lib/leads/analiseSite"
import { chamarApi } from "@/lib/minerador/api"

export async function analisarSiteDoLead(leadId: string): Promise<RespostaAnaliseDeSite> {
  return chamarApi<RespostaAnaliseDeSite>(`/api/leads/${encodeURIComponent(leadId)}/analisar-site`, {
    method: "POST",
  })
}

export async function pedirMensagemWhatsApp(leadId: string, descartadas: string[]): Promise<string> {
  const { mensagem } = await chamarApi<{ mensagem: string }>(
    `/api/leads/${encodeURIComponent(leadId)}/mensagem-whatsapp`,
    { method: "POST", body: JSON.stringify({ descartadas }) }
  )
  return mensagem
}
