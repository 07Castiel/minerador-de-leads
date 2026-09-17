"use client"

import { RetornoBadge } from "@/components/leads/RetornoBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ATALHOS_DE_RETORNO, dataLocalIso, somarDias } from "@/lib/leads/proximoContato"

type ProximoContatoCampoProps = {
  id: string
  // "AAAA-MM-DD" ou "" (sem retorno)
  value: string
  onChange: (valor: string) => void
}

export function ProximoContatoCampo({ id, value, onChange }: ProximoContatoCampoProps) {
  const hoje = dataLocalIso(new Date())

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Próximo contato</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-40"
        />
        {ATALHOS_DE_RETORNO.map((atalho) => {
          const data = somarDias(hoje, atalho.dias)
          return (
            <Button
              key={atalho.dias}
              type="button"
              size="xs"
              variant={value === data ? "secondary" : "outline"}
              aria-pressed={value === data}
              onClick={() => onChange(data)}
            >
              {atalho.label}
            </Button>
          )
        })}
        {value && (
          <Button type="button" size="xs" variant="ghost" onClick={() => onChange("")}>
            Sem retorno
          </Button>
        )}
      </div>
      <RetornoBadge proximoContato={value || null} />
    </div>
  )
}
