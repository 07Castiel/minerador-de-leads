"use client"

import { useState } from "react"
import Link from "next/link"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { toast } from "sonner"

import { MotivoPerdaDialog } from "@/components/crm/MotivoPerdaDialog"
import { ContatoBotoes } from "@/components/leads/ContatoBotoes"
import { TemperaturaBadge } from "@/components/leads/TemperaturaBadge"
import { useMudarEtapa } from "@/hooks/useLeads"
import { cn } from "@/lib/utils"
import {
  ETAPAS,
  ETAPA_DESCRICOES,
  ETAPA_LABELS,
  MOTIVO_PERDA_LABELS,
  isEtapa,
  type Etapa,
  type Lead,
  type MotivoPerda,
} from "@/types/lead"

function CartaoLead({ lead, arrastando = false }: { lead: Lead; arrastando?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm shadow-xs",
        arrastando && "shadow-lg ring-2 ring-ring/40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/leads/${lead.id}`}
          className="min-w-0 font-medium leading-snug hover:underline"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {lead.nome}
        </Link>
        {lead.score !== null && (
          <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
            {lead.score}
          </span>
        )}
      </div>
      <p className="truncate text-xs text-muted-foreground">
        {[lead.categoria, lead.bairro ?? lead.cidade].filter(Boolean).join(" · ") || "—"}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <TemperaturaBadge temperatura={lead.temperatura} />
        {lead.tem_site === false && (
          <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
            Sem site
          </span>
        )}
        {lead.etapa === "perdido" && lead.motivo_perda && (
          <span className="text-xs text-muted-foreground">
            {MOTIVO_PERDA_LABELS[lead.motivo_perda as MotivoPerda] ?? lead.motivo_perda}
          </span>
        )}
      </div>
      <div onPointerDown={(e) => e.stopPropagation()}>
        <ContatoBotoes telefone={lead.telefone} tamanho="xs" />
      </div>
    </div>
  )
}

function CartaoArrastavel({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-roledescription="Lead arrastável"
      className={cn(
        "cursor-grab touch-none rounded-lg focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <CartaoLead lead={lead} />
    </div>
  )
}

function Coluna({ etapa, leads }: { etapa: Etapa; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa })

  return (
    <section
      ref={setNodeRef}
      aria-label={ETAPA_LABELS[etapa]}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-muted/60 p-2 transition-colors",
        isOver && "bg-accent ring-2 ring-ring/30"
      )}
    >
      <header className="flex items-baseline justify-between px-1 pt-1">
        <div>
          <h2 className="text-sm font-semibold">{ETAPA_LABELS[etapa]}</h2>
          <p className="text-xs text-muted-foreground">{ETAPA_DESCRICOES[etapa]}</p>
        </div>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">{leads.length}</span>
      </header>
      <div className="flex min-h-24 flex-col gap-2">
        {leads.length === 0 ? (
          <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
            Arraste leads para cá
          </p>
        ) : (
          leads.map((lead) => <CartaoArrastavel key={lead.id} lead={lead} />)
        )}
      </div>
    </section>
  )
}

export function KanbanBoard({ leads }: { leads: Lead[] }) {
  const mudarEtapa = useMudarEtapa()
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)
  const [perdendo, setPerdendo] = useState<Lead | null>(null)

  const sensors = useSensors(
    // distância mínima: clique no nome/botões não vira arrasto
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  )

  const porEtapa = new Map<Etapa, Lead[]>(ETAPAS.map((e) => [e, []]))
  for (const lead of leads) {
    porEtapa.get(isEtapa(lead.etapa) ? lead.etapa : "novo")?.push(lead)
  }

  function mover(lead: Lead, etapa: Etapa, motivoPerda?: MotivoPerda) {
    mudarEtapa.mutate(
      { id: lead.id, etapa, motivoPerda },
      { onError: (err) => toast.error(`Não foi possível mover ${lead.nome}: ${err.message}`) }
    )
  }

  function handleDragStart(event: DragStartEvent) {
    setArrastandoId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setArrastandoId(null)
    const destino = event.over?.id
    if (typeof destino !== "string" || !isEtapa(destino)) return

    const lead = leads.find((l) => l.id === event.active.id)
    if (!lead || lead.etapa === destino) return

    if (destino === "perdido") setPerdendo(lead)
    else mover(lead, destino)
  }

  const arrastando = arrastandoId ? leads.find((l) => l.id === arrastandoId) : undefined

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setArrastandoId(null)}
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-4">
          <div className="flex items-start gap-3">
            {ETAPAS.map((etapa) => (
              <Coluna key={etapa} etapa={etapa} leads={porEtapa.get(etapa) ?? []} />
            ))}
          </div>
        </div>
        <DragOverlay>{arrastando ? <CartaoLead lead={arrastando} arrastando /> : null}</DragOverlay>
      </DndContext>

      <MotivoPerdaDialog
        nomeDoLead={perdendo?.nome ?? null}
        onCancelar={() => setPerdendo(null)}
        onConfirmar={(motivo) => {
          if (perdendo) mover(perdendo, "perdido", motivo)
          setPerdendo(null)
        }}
      />
    </>
  )
}
