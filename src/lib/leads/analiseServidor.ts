import "server-only"

import { analisarSite, normalizarUrlDoSite, type AtualizacaoDeSite } from "@/lib/leads/analiseSite"
import { buscarPagina } from "@/lib/leads/buscarPagina"
import { classificarLink } from "@/lib/leads/presencaDigital"

// Abre o site do lead e devolve as colunas site_* já analisadas. Sem PageSpeed:
// a nota de celular saiu das lacunas (oscila demais) e medir levaria dezenas de
// segundos, o que não cabe antes de gerar uma mensagem. Quem grava é quem chama.
export async function analisarSiteDoLead(
  lead: { site_url: string | null },
  agora = new Date()
): Promise<AtualizacaoDeSite | null> {
  const url = classificarLink(lead.site_url)?.tipo === "site" ? normalizarUrlDoSite(lead.site_url ?? "") : null
  if (!url) return null
  return analisarSite({ busca: await buscarPagina(url), pageSpeed: null, agora })
}
