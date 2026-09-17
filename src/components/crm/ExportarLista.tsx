"use client"

import { useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { CopyIcon, DownloadIcon, FileTextIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { saudacaoDoHorario } from "@/lib/leads/abordagem"
import { SAUDACOES } from "@/lib/leads/abordagemConfig"
import { registrarAbordagens, ultimasLacunasDaOrg } from "@/lib/leads/abordagens"
import { listaExportada, temTelefone } from "@/lib/leads/listaExportada"
import { dataLocalIso } from "@/lib/leads/proximoContato"
import { supabaseBrowser } from "@/lib/supabase/client"
import type { Lead } from "@/types/lead"

// Faixa da saudação: a lista é enviada depois, então vale a escolha, não o
// horário da exportação.
function faixaPadrao(agora: Date): number {
  const saudacao = saudacaoDoHorario(agora)
  const indice = SAUDACOES.findIndex((f) => f.texto === saudacao)
  return indice >= 0 ? indice : 0
}

// Todos os leads do CRM numa lista de texto, com a mesma mensagem que a janela
// do WhatsApp geraria para cada um. Dá pra copiar ou baixar como .txt.
export function ExportarLista({ leads }: { leads: Lead[] }) {
  const [aberto, setAberto] = useState(false)
  const [faixa, setFaixa] = useState(() => faixaPadrao(new Date()))
  // Fixado ao abrir: a lista não muda enquanto o diálogo está aberto
  const [agora, setAgora] = useState(() => new Date())
  const registrado = useRef(false)

  // buscas.nicho de cada lead: sem isso, categoria genérica do Google cairia no
  // nicho "outros" só na exportação.
  const termos = useQuery({
    queryKey: ["termos-da-busca"],
    enabled: aberto,
    queryFn: async () => {
      const { data, error } = await supabaseBrowser().from("buscas_leads").select("lead_id, buscas(nicho)")
      if (error) throw error
      return new Map(data.map((linha) => [linha.lead_id, linha.buscas?.nicho ?? null]))
    },
  })

  const ultimas = useQuery({
    queryKey: ["ultimas-lacunas"],
    enabled: aberto,
    queryFn: () => ultimasLacunasDaOrg(supabaseBrowser()),
  })

  const carregando = termos.isLoading || ultimas.isLoading
  const lista = useMemo(() => {
    if (!aberto || carregando) return null
    return listaExportada(leads, {
      faixa: SAUDACOES[faixa],
      agora,
      termoDaBusca: (lead) => termos.data?.get(lead.id) ?? null,
      ultimasLacunas: ultimas.data ?? [],
    })
  }, [aberto, carregando, leads, faixa, agora, termos.data, ultimas.data])

  const comMensagem = lista?.itens.filter((item) => item.texto !== "").length ?? 0
  const naLista = leads.filter(temTelefone).length

  // Grava uma linha por mensagem, uma vez por exportação.
  async function registrar() {
    if (registrado.current || !lista) return
    registrado.current = true
    const registros = lista.itens.map((item) => item.registro).filter((r) => r !== null)
    try {
      await registrarAbordagens(supabaseBrowser(), registros)
      void ultimas.refetch()
    } catch (err) {
      registrado.current = false
      toast.error(`Não deu pra registrar as mensagens: ${err instanceof Error ? err.message : err}`)
    }
  }

  async function copiar() {
    if (!lista) return
    try {
      await navigator.clipboard.writeText(lista.texto)
      toast.success(`Lista com ${comMensagem} mensagens copiada.`)
      await registrar()
    } catch {
      toast.error("Não deu pra copiar. Baixe o arquivo .txt.")
    }
  }

  async function baixar() {
    if (!lista) return
    const url = URL.createObjectURL(new Blob([lista.texto], { type: "text/plain;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `leads-crm-${dataLocalIso(new Date())}.txt`
    link.click()
    URL.revokeObjectURL(url)
    await registrar()
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={leads.length === 0}
        onClick={() => {
          const inicio = new Date()
          setAgora(inicio)
          setFaixa(faixaPadrao(inicio))
          registrado.current = false
          setAberto(true)
        }}
      >
        <FileTextIcon />
        Exportar lista
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Exportar lista</DialogTitle>
            <DialogDescription>
              {naLista} leads com telefone, cada um com a mensagem que a janela do WhatsApp geraria. Quem não tem
              gancho sai com a mensagem em branco e o motivo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="faixa-da-saudacao">Saudação</Label>
            <Select value={String(faixa)} onValueChange={(v) => setFaixa(Number(v))}>
              <SelectTrigger id="faixa-da-saudacao" className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SAUDACOES.map((f, i) => (
                  <SelectItem key={f.texto} value={String(i)}>
                    {f.texto} ({f.de} às {f.ate})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            aria-label="Lista exportada"
            value={lista?.texto ?? "Montando a lista..."}
            readOnly
            className="h-80 font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            {comMensagem} com mensagem, {naLista - comMensagem} em branco.
          </p>

          <DialogFooter>
            <Button variant="outline" disabled={!lista} onClick={() => void baixar()}>
              <DownloadIcon />
              Baixar .txt
            </Button>
            <Button disabled={!lista} onClick={() => void copiar()}>
              <CopyIcon />
              Copiar lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
