import { Badge } from "@/components/ui/badge"
import { ETAPA_LABELS, isEtapa } from "@/types/lead"

export function EtapaBadge({ etapa }: { etapa: string }) {
  const label = isEtapa(etapa) ? ETAPA_LABELS[etapa] : etapa
  const variant =
    etapa === "convertido" ? "default" : etapa === "perdido" ? "outline" : "secondary"

  return <Badge variant={variant}>{label}</Badge>
}
