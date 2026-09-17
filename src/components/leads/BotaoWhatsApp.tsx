"use client"

import { useId, useRef, useState } from "react"
import Link from "next/link"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2Icon, MessageCircleIcon, PencilIcon, RefreshCwIcon } from "lucide-react"
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
import { useAgendarRetorno } from "@/hooks/useLeads"
import { consultaDosModelos, useModelosMensagem, type ModeloMensagem } from "@/hooks/useModelosMensagem"
import { linkWhatsApp } from "@/lib/contato"
import { pedirMensagemWhatsApp } from "@/lib/leads/api"
import { preencherModelo, valoresDoModelo, type ModeloPreenchido } from "@/lib/leads/modelosMensagem"
import { dataLocalIso, descreverRetorno, retornoPendente, somarDias } from "@/lib/leads/proximoContato"
import type { Lead } from "@/types/lead"

type BotaoWhatsAppProps = {
  lead: Lead
  size: "xs" | "sm"
}

const GEMINI = "__gemini__"
const DIAS_ATE_O_RETORNO = 3
// Guarda a última escolha (modelo ou Gemini) só neste navegador.
const CHAVE_ULTIMA_ESCOLHA = "whatsapp:ultima-escolha"

function lerUltimaEscolha(): string | null {
  try {
    return localStorage.getItem(CHAVE_ULTIMA_ESCOLHA)
  } catch {
    return null
  }
}

function guardarUltimaEscolha(escolha: string) {
  try {
    localStorage.setItem(CHAVE_ULTIMA_ESCOLHA, escolha)
  } catch {
    // navegador sem storage: só não lembra
  }
}

// O clique abre um diálogo com a mensagem pronta: um modelo preenchido com os
// dados do lead (instantâneo) ou escrita pelo Gemini. Dá pra editar e abrir o
// WhatsApp com o texto; depois, um aviso oferece marcar o retorno.
export function BotaoWhatsApp({ lead, size }: BotaoWhatsAppProps) {
  const idDoSeletor = useId()
  const [aberto, setAberto] = useState(false)
  // id do modelo, GEMINI, ou "" enquanto os modelos carregam
  const [escolha, setEscolha] = useState("")
  const escolhaAtual = useRef("")
  const [mensagem, setMensagem] = useState("")
  const [preenchido, setPreenchido] = useState<ModeloPreenchido | null>(null)
  const [geradas, setGeradas] = useState<string[]>([])
  const queryClient = useQueryClient()
  const modelos = useModelosMensagem()
  const agendar = useAgendarRetorno()
  const gerar = useMutation({
    mutationFn: (descartadas: string[]) => pedirMensagemWhatsApp(lead.id, descartadas),
  })

  function pedir(descartadas: string[]) {
    // Callbacks no mutate só valem para o último pedido: resposta atrasada de
    // uma abertura anterior não sobrescreve a atual.
    gerar.mutate(descartadas, {
      onSuccess: (texto) => {
        // Trocou para um modelo enquanto o Gemini escrevia: ignora a resposta.
        if (escolhaAtual.current !== GEMINI) return
        setMensagem(texto)
        setGeradas([...descartadas, texto])
      },
    })
  }

  function escolher(valor: string, lista: ModeloMensagem[]) {
    setEscolha(valor)
    escolhaAtual.current = valor
    if (valor === "") return
    guardarUltimaEscolha(valor)

    if (valor === GEMINI) {
      setPreenchido(null)
      setMensagem("")
      setGeradas([])
      pedir([])
      return
    }
    const modelo = lista.find((m) => m.id === valor)
    if (!modelo) return
    const resultado = preencherModelo(modelo.texto, valoresDoModelo(lead, new Date()))
    setPreenchido(resultado)
    setMensagem(resultado.texto)
  }

  function escolhaInicial(lista: ModeloMensagem[]): string {
    const ultima = lerUltimaEscolha()
    if (ultima === GEMINI || lista.some((m) => m.id === ultima)) return ultima as string
    return lista[0]?.id ?? GEMINI
  }

  async function abrir() {
    setMensagem("")
    setGeradas([])
    setPreenchido(null)
    gerar.reset()
    escolher("", [])
    setAberto(true)
    // Normalmente já estão em cache; senão espera carregar. Sem modelos, vai de Gemini.
    const lista = await queryClient.ensureQueryData(consultaDosModelos).catch(() => [])
    if (escolhaAtual.current === "") escolher(escolhaInicial(lista), lista)
  }

  function sugerirRetorno() {
    if (!lead.no_funil) return
    const hoje = dataLocalIso(new Date())
    const data = somarDias(hoje, DIAS_ATE_O_RETORNO)
    const primeiroContato = lead.etapa === "novo"
    if (!primeiroContato && lead.proximo_contato && !retornoPendente(lead.proximo_contato, hoje)) return

    toast("Mandou a mensagem?", {
      description: primeiroContato
        ? `Marque ${lead.nome} como abordado, com retorno em ${DIAS_ATE_O_RETORNO} dias.`
        : `Marque o próximo contato com ${lead.nome} para daqui a ${DIAS_ATE_O_RETORNO} dias.`,
      duration: 12_000,
      action: {
        label: primeiroContato ? "Marcar abordado" : `Retornar em ${DIAS_ATE_O_RETORNO} dias`,
        onClick: () =>
          agendar.mutate(
            { id: lead.id, proximoContato: data, ...(primeiroContato ? { etapa: "abordado" as const } : {}) },
            {
              onSuccess: () => toast.success(`${lead.nome}: ${descreverRetorno(data, hoje).toLowerCase()}.`),
              onError: (err) => toast.error(`Não deu pra marcar o retorno: ${err.message}`),
            }
          ),
      },
    })
  }

  const ehGemini = escolha === GEMINI
  const escrevendo = ehGemini && gerar.isPending
  const link = linkWhatsApp(lead.telefone, mensagem.trim() || undefined)
  if (!link) return null

  return (
    <>
      <Button variant="outline" size={size} onClick={() => void abrir()}>
        <MessageCircleIcon />
        WhatsApp
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent
          // No quadro do CRM o botão fica dentro de um cartão arrastável: sem isso,
          // espaço/enter digitados aqui chegam ao dnd-kit pela árvore do React.
          onKeyDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Mensagem para {lead.nome}</DialogTitle>
            <DialogDescription>
              {ehGemini ? "Escrita pelo Gemini" : "Modelo preenchido"} com os dados deste lead. Revise antes de
              enviar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor={idDoSeletor}>Mensagem</Label>
            <Select value={escolha} onValueChange={(v) => escolher(v, modelos.data ?? [])}>
              <SelectTrigger id={idDoSeletor} className="w-full">
                <SelectValue placeholder="Carregando modelos..." />
              </SelectTrigger>
              <SelectContent>
                {modelos.data?.map((modelo) => (
                  <SelectItem key={modelo.id} value={modelo.id}>
                    {modelo.nome}
                  </SelectItem>
                ))}
                <SelectItem value={GEMINI}>Escrever com o Gemini (IA)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {escrevendo && !mensagem ? (
            <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Escrevendo a mensagem...
            </div>
          ) : (
            (mensagem || !ehGemini) &&
            escolha !== "" && (
              <Textarea
                aria-label="Texto da mensagem"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                disabled={escrevendo}
                className="max-h-80 min-h-32"
              />
            )
          )}
          {ehGemini && gerar.isError && <p className="text-sm text-destructive">{gerar.error.message}</p>}
          {!ehGemini && preenchido && preenchido.semDado.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Este lead não tem {preenchido.semDado.map((c) => `{${c}}`).join(", ")}: confira se o texto ficou certo.
            </p>
          )}
          {!ehGemini && preenchido && preenchido.desconhecidas.length > 0 && (
            <p className="text-xs text-destructive">
              {preenchido.desconhecidas.map((c) => `{${c}}`).join(", ")} não é variável. Corrija o modelo em
              Mensagens.
            </p>
          )}

          <DialogFooter>
            {ehGemini ? (
              <Button variant="outline" disabled={escrevendo} onClick={() => pedir(geradas)}>
                {escrevendo ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
                {geradas.length > 0 || escrevendo ? "Gerar outra" : "Tentar de novo"}
              </Button>
            ) : (
              <Button variant="ghost" asChild>
                <Link href="/mensagens" onClick={() => setAberto(false)}>
                  <PencilIcon />
                  Editar modelos
                </Link>
              </Button>
            )}
            {escrevendo || escolha === "" ? (
              <Button disabled>
                <MessageCircleIcon />
                Abrir no WhatsApp
              </Button>
            ) : (
              <Button asChild>
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    setAberto(false)
                    sugerirRetorno()
                  }}
                >
                  <MessageCircleIcon />
                  {mensagem.trim() ? "Abrir no WhatsApp" : "Abrir sem mensagem"}
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
