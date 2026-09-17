"use client"

import { CalendarClockIcon } from "lucide-react"

import { dataLocalIso, descreverRetorno, situacaoDoRetorno } from "@/lib/leads/proximoContato"
import { cn } from "@/lib/utils"

export function RetornoBadge({
  proximoContato,
  className,
}: {
  proximoContato: string | null
  className?: string
}) {
  if (!proximoContato) return null
  const hoje = dataLocalIso(new Date())
  const situacao = situacaoDoRetorno(proximoContato, hoje)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap",
        situacao === "atrasado" && "text-destructive",
        situacao === "hoje" && "text-amber-700 dark:text-amber-400",
        situacao === "futuro" && "text-muted-foreground",
        className
      )}
    >
      <CalendarClockIcon className="size-3.5" aria-hidden />
      {descreverRetorno(proximoContato, hoje)}
    </span>
  )
}
