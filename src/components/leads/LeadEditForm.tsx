"use client"

import { useState } from "react"
import { toast } from "sonner"

import { ProximoContatoCampo } from "@/components/leads/ProximoContatoCampo"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useUpdateLead } from "@/hooks/useLead"
import { dadosDaMudancaDeEtapa } from "@/hooks/useLeads"
import {
  ETAPAS,
  ETAPA_LABELS,
  MOTIVOS_PERDA,
  MOTIVO_PERDA_LABELS,
  isEtapa,
  type Etapa,
  type Lead,
  type MotivoPerda,
} from "@/types/lead"

export function LeadEditForm({ lead }: { lead: Lead }) {
  const etapaInicial: Etapa = isEtapa(lead.etapa) ? lead.etapa : "novo"
  const [etapa, setEtapa] = useState<Etapa>(etapaInicial)
  const [motivo, setMotivo] = useState<MotivoPerda | "">((lead.motivo_perda as MotivoPerda | null) ?? "")
  const [observacoes, setObservacoes] = useState(lead.observacoes ?? "")
  const [proximoContato, setProximoContato] = useState(lead.proximo_contato ?? "")
  const updateLead = useUpdateLead(lead.id)

  const mudouEtapa = etapa !== etapaInicial || (etapa === "perdido" && motivo !== (lead.motivo_perda ?? ""))
  const mudouObservacoes = observacoes !== (lead.observacoes ?? "")
  const mudouRetorno = proximoContato !== (lead.proximo_contato ?? "")
  // O banco apaga o retorno de quem acabou de virar cliente ou ser perdido.
  const retornoVaiSerApagado =
    proximoContato !== "" && etapa !== etapaInicial && (etapa === "convertido" || etapa === "perdido")
  const faltaMotivo = etapa === "perdido" && motivo === ""

  function handleSave() {
    updateLead.mutate(
      {
        ...(mudouEtapa ? dadosDaMudancaDeEtapa({ id: lead.id, etapa, motivoPerda: motivo || null }) : {}),
        observacoes: observacoes.trim() === "" ? null : observacoes,
        proximo_contato: proximoContato || null,
        ...(lead.no_funil ? {} : { no_funil: true }),
      },
      {
        onSuccess: () => toast.success(lead.no_funil ? "Lead atualizado." : "Lead salvo e enviado ao CRM."),
        onError: (err) => toast.error(`Erro ao salvar: ${err.message}`),
      }
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="etapa">Etapa</Label>
          <Select value={etapa} onValueChange={(v) => setEtapa(v as Etapa)}>
            <SelectTrigger id="etapa" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ETAPAS.map((e) => (
                <SelectItem key={e} value={e}>
                  {ETAPA_LABELS[e]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {etapa === "perdido" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo-perda">Motivo da perda</Label>
            <Select value={motivo} onValueChange={(v) => setMotivo(v as MotivoPerda)}>
              <SelectTrigger id="motivo-perda" className="w-64" aria-invalid={faltaMotivo}>
                <SelectValue placeholder="Escolha o motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_PERDA.map((m) => (
                  <SelectItem key={m} value={m}>
                    {MOTIVO_PERDA_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <ProximoContatoCampo id="proximo-contato" value={proximoContato} onChange={setProximoContato} />
      {retornoVaiSerApagado && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Ao salvar como {ETAPA_LABELS[etapa]}, o retorno marcado é apagado.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          rows={6}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Como foi o contato, o que o dono falou, próximos passos..."
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={
            (!mudouEtapa && !mudouObservacoes && !mudouRetorno && lead.no_funil) ||
            faltaMotivo ||
            updateLead.isPending
          }
        >
          {updateLead.isPending ? "Salvando..." : lead.no_funil ? "Salvar" : "Salvar e enviar ao CRM"}
        </Button>
        {faltaMotivo && <span className="text-sm text-muted-foreground">Escolha o motivo da perda.</span>}
      </div>
    </div>
  )
}
