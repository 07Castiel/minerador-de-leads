"use client"

import { PhoneIcon } from "lucide-react"

import { BotaoWhatsApp } from "@/components/leads/BotaoWhatsApp"
import { TelefoneFixoBadge } from "@/components/leads/TelefoneFixoBadge"
import { Button } from "@/components/ui/button"
import { linkLigacao, pareceCelular } from "@/lib/contato"
import type { Lead } from "@/types/lead"

type ContatoBotoesProps = {
  // Lead inteiro: os modelos de WhatsApp usam bairro, site, etapa etc.
  lead: Lead
  tamanho?: "xs" | "sm"
}

// Ligar sempre que houver telefone; WhatsApp só para celular.
export function ContatoBotoes({ lead, tamanho = "sm" }: ContatoBotoesProps) {
  const ligar = linkLigacao(lead.telefone)
  const whatsapp = pareceCelular(lead.telefone)
  if (!ligar && !whatsapp) return null

  const size = tamanho === "xs" ? "xs" : "sm"

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {ligar && (
        <Button asChild variant="outline" size={size}>
          <a href={ligar}>
            <PhoneIcon />
            Ligar
          </a>
        </Button>
      )}
      {whatsapp && <BotaoWhatsApp lead={lead} size={size} />}
      <TelefoneFixoBadge telefone={lead.telefone} />
    </div>
  )
}
