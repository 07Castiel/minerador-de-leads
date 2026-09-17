import { motivosDoLead, type CamposDosMotivos } from "@/lib/leads/motivos"
import { cn } from "@/lib/utils"

type MotivosChipsProps = {
  lead: CamposDosMotivos
  // Quantos mostrar antes do "+N" (cards e tabelas); sem limite no detalhe.
  limite?: number
  className?: string
}

export function MotivosChips({ lead, limite, className }: MotivosChipsProps) {
  const motivos = motivosDoLead(lead)
  if (motivos.length === 0) return null

  const visiveis = limite ? motivos.slice(0, limite) : motivos
  const restantes = motivos.length - visiveis.length

  return (
    <ul className={cn("flex flex-wrap gap-1", className)} aria-label="Por que esse lead">
      {visiveis.map((m) => (
        <li
          key={m.id}
          title={m.detalhe}
          className={cn(
            "rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
            m.tipo === "oportunidade"
              ? "bg-red-ember text-metal-light ring-1 ring-primary/40 ring-inset"
              : "bg-secondary text-secondary-foreground"
          )}
        >
          {m.texto}
        </li>
      ))}
      {restantes > 0 && (
        <li
          className="rounded-md px-1.5 py-0.5 text-xs text-muted-foreground"
          title={motivos
            .slice(visiveis.length)
            .map((m) => m.texto)
            .join(" · ")}
        >
          +{restantes}
        </li>
      )}
    </ul>
  )
}
