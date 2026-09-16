"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MOTIVOS_PERDA, MOTIVO_PERDA_LABELS, type MotivoPerda } from "@/types/lead"

type MotivoPerdaDialogProps = {
  nomeDoLead: string | null
  onConfirmar: (motivo: MotivoPerda) => void
  onCancelar: () => void
}

// Aberto quando um lead vai para "Perdido": o motivo alimenta a análise do funil.
export function MotivoPerdaDialog({ nomeDoLead, onConfirmar, onCancelar }: MotivoPerdaDialogProps) {
  const [motivo, setMotivo] = useState<MotivoPerda | null>(null)

  return (
    <Dialog
      open={nomeDoLead !== null}
      onOpenChange={(aberto) => {
        if (!aberto) {
          setMotivo(null)
          onCancelar()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Por que {nomeDoLead ?? "o lead"} foi perdido?</DialogTitle>
          <DialogDescription>O motivo ajuda a ver onde o funil está vazando.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Motivo da perda">
          {MOTIVOS_PERDA.map((m) => (
            <Button
              key={m}
              type="button"
              role="radio"
              aria-checked={motivo === m}
              variant={motivo === m ? "default" : "outline"}
              className="h-auto justify-start whitespace-normal py-2 text-left"
              onClick={() => setMotivo(m)}
            >
              {MOTIVO_PERDA_LABELS[m]}
            </Button>
          ))}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setMotivo(null)
              onCancelar()
            }}
          >
            Cancelar
          </Button>
          <Button
            disabled={!motivo}
            onClick={() => {
              if (!motivo) return
              onConfirmar(motivo)
              setMotivo(null)
            }}
          >
            Marcar como perdido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
