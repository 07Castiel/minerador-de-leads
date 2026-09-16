"use client"

import { MessageCircleIcon, PhoneIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { linkLigacao, linkWhatsApp, pareceCelular } from "@/lib/contato"

type ContatoBotoesProps = {
  telefone: string | null
  tamanho?: "xs" | "sm"
}

// Ligar sempre que houver telefone; WhatsApp só para celular.
export function ContatoBotoes({ telefone, tamanho = "sm" }: ContatoBotoesProps) {
  const ligar = linkLigacao(telefone)
  const whatsapp = pareceCelular(telefone) ? linkWhatsApp(telefone) : null
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
      {whatsapp && (
        <Button asChild variant="outline" size={size}>
          <a href={whatsapp} target="_blank" rel="noreferrer">
            <MessageCircleIcon />
            WhatsApp
          </a>
        </Button>
      )}
    </div>
  )
}
