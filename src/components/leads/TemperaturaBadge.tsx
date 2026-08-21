import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

const STYLES: Record<string, string> = {
  quente: "border-transparent bg-quente text-quente-foreground",
  morno: "border-transparent bg-morno text-morno-foreground",
  frio: "border-transparent bg-frio text-frio-foreground",
}

export function TemperaturaBadge({ temperatura }: { temperatura: string | null }) {
  if (!temperatura) return <span className="text-muted-foreground">—</span>

  return (
    <Badge className={cn(STYLES[temperatura])}>
      {temperatura}
    </Badge>
  )
}
