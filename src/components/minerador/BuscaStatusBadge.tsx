import { LoaderCircleIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { BUSCA_STATUS_LABELS, buscaEmAndamento, type BuscaStatus } from "@/types/busca"

export function BuscaStatusBadge({ status }: { status: string }) {
  const label = BUSCA_STATUS_LABELS[status as BuscaStatus] ?? status
  const variant =
    status === "concluida" ? "default" : status === "erro" ? "destructive" : "secondary"

  return (
    <Badge variant={variant}>
      {buscaEmAndamento(status) && <LoaderCircleIcon className="animate-spin" />}
      {label}
    </Badge>
  )
}
