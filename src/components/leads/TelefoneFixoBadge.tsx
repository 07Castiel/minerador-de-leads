import { PhoneIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { pareceFixo } from "@/lib/contato"
import { cn } from "@/lib/utils"

// Fixo quase nunca tem WhatsApp: um selo âmbar avisa antes de gastar mensagem.
// Não renderiza nada quando o número é celular ou não parece telefone brasileiro.
export function TelefoneFixoBadge({
  telefone,
  className,
}: {
  telefone: string | null | undefined
  className?: string
}) {
  if (!pareceFixo(telefone)) return null

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        className
      )}
      title="Telefone fixo — provavelmente sem WhatsApp"
    >
      <PhoneIcon />
      Fixo
    </Badge>
  )
}
