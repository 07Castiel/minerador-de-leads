import { Badge } from "@/components/ui/badge"
import { STATUS_LABELS, type Status } from "@/types/lead"

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>

  const label = STATUS_LABELS[status as Status] ?? status
  const variant = status === "fechado" ? "default" : status === "perdido" ? "outline" : "secondary"

  return <Badge variant={variant}>{label}</Badge>
}
