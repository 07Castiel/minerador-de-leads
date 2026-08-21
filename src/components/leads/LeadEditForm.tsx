import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUpdateLead } from "@/hooks/useLead"
import { STATUS_LABELS, STATUS_VALUES } from "@/types/lead"
import type { Lead } from "@/types/lead"

export function LeadEditForm({ lead }: { lead: Lead }) {
  const [status, setStatus] = useState(lead.status ?? "novo")
  const [observacoes, setObservacoes] = useState(lead.observacoes ?? "")
  const updateLead = useUpdateLead(lead.id)

  const isDirty = status !== (lead.status ?? "novo") || observacoes !== (lead.observacoes ?? "")

  function handleSave() {
    updateLead.mutate(
      { status, observacoes: observacoes.trim() === "" ? null : observacoes },
      {
        onSuccess: () => toast.success("Lead atualizado."),
        onError: (err) => toast.error(`Erro ao salvar: ${err.message}`),
      }
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="status" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          rows={5}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Anotações sobre contato, visita, proposta..."
        />
      </div>

      <div>
        <Button onClick={handleSave} disabled={!isDirty || updateLead.isPending}>
          {updateLead.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  )
}
