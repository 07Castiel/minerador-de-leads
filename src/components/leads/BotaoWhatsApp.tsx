"use client"

import { useId, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Loader2Icon, MessageCircleIcon, RefreshCwIcon } from "lucide-react"
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
import { linkWhatsApp } from "@/lib/contato"
import {
  descreverMotivo,
  mensagemDeRetorno,
  validarConteudo,
  validarMensagem,
  type MensagemDaJanela,
  type ModoDaJanela,
} from "@/lib/leads/abordagem"
import { GEMINI_NA_ABORDAGEM, SAUDACOES } from "@/lib/leads/abordagemConfig"
import { pedirMensagemDaJanela } from "@/lib/leads/api"
import { dataLocalIso, descreverRetorno, retornoPendente, somarDias } from "@/lib/leads/proximoContato"
import type { Lead } from "@/types/lead"

type BotaoWhatsAppProps = {
  lead: Lead
  size: "xs" | "sm"
}

type Opcao = ModoDaJanela | "retorno"

const ROTULOS: Record<Opcao, string> = {
  completa: "Texto fixo",
  curta: "Texto fixo curto",
  gemini: "Escrito pelo Gemini",
  retorno: "Retorno (confirmar se chegou)",
}

const DIAS_ATE_O_RETORNO = 3
const JANELA_DE_HORARIO = `${SAUDACOES[0].de} e ${SAUDACOES[SAUDACOES.length - 1].ate}`

// O clique abre a janela com a mensagem que o sistema decidiu pra este lead:
// texto fixo, a versão curta, ou a mesma coisa redigida pelo Gemini. Tudo passa
// pela mesma validação, inclusive o que for editado aqui. Fora do horário ou sem
// lacuna, não há mensagem.
export function BotaoWhatsApp({ lead, size }: BotaoWhatsAppProps) {
  const idDoSeletor = useId()
  const [aberto, setAberto] = useState(false)
  // Primeira resposta da abertura: diz se tem mensagem e com que regras validar
  const [base, setBase] = useState<MensagemDaJanela | null>(null)
  const [opcao, setOpcao] = useState<Opcao | "">("")
  const opcaoAtual = useRef<Opcao | "">("")
  const [mensagem, setMensagem] = useState("")
  const [origem, setOrigem] = useState<"gemini" | "fixa" | null>(null)
  const [geradas, setGeradas] = useState<string[]>([])
  const agendar = useAgendarRetorno()
  const carregar = useMutation({
    mutationFn: ({ modo, descartadas }: { modo: ModoDaJanela; descartadas: string[] }) =>
      pedirMensagemDaJanela(lead.id, modo, descartadas),
  })

  function pedir(modo: ModoDaJanela, descartadas: string[]) {
    // Callbacks no mutate só valem para o último pedido: resposta atrasada de
    // uma abertura anterior não sobrescreve a atual.
    carregar.mutate(
      { modo, descartadas },
      {
        onSuccess: (resposta) => {
          if (resposta.tipo !== "pronta") {
            // Passou das 21h ou o lead mudou entre um pedido e outro
            setBase(resposta)
            setOpcao("")
            opcaoAtual.current = ""
            setMensagem("")
            return
          }
          setBase(resposta)
          // Trocou de opção enquanto esperava: só guarda a base
          if (opcaoAtual.current !== modo) return
          setMensagem(resposta.texto)
          setOrigem(resposta.origem)
          if (modo === "gemini" && resposta.origem === "gemini") setGeradas([...descartadas, resposta.texto])
        },
      }
    )
  }

  function escolher(valor: Opcao) {
    setOpcao(valor)
    opcaoAtual.current = valor
    setMensagem("")
    setOrigem(null)
    if (valor === "retorno") {
      setMensagem(mensagemDeRetorno())
      setOrigem("fixa")
      return
    }
    if (valor === "gemini") setGeradas([])
    pedir(valor, [])
  }

  function abrir() {
    setBase(null)
    setGeradas([])
    carregar.reset()
    setAberto(true)
    escolher("completa")
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

  const carregando = carregar.isPending
  const pronta = base?.tipo === "pronta" ? base : null
  const foraDoHorario = base?.tipo === "fora_do_horario"
  const opcoes: Opcao[] = [
    ...(pronta ? (["completa", "curta"] as const) : []),
    ...(pronta && GEMINI_NA_ABORDAGEM ? (["gemini"] as const) : []),
    ...(base && !foraDoHorario && lead.etapa !== "novo" ? (["retorno"] as const) : []),
  ]

  const motivos =
    !mensagem.trim() || carregando || opcao === ""
      ? []
      : opcao === "retorno"
        ? validarConteudo(mensagem, pronta?.validacao.nicho ?? null)
        : pronta
          ? validarMensagem(mensagem, pronta.validacao)
          : []
  const podeAbrir = opcao !== "" && !carregando && mensagem.trim() !== "" && motivos.length === 0

  const linkComTexto = linkWhatsApp(lead.telefone, mensagem.trim() || undefined)
  const linkSemTexto = linkWhatsApp(lead.telefone)
  if (!linkSemTexto) return null

  const descricao = foraDoHorario
    ? "Fora do horário de abordagem."
    : base?.tipo === "manual" && opcao === ""
      ? "Sem mensagem automática para este lead."
      : opcao === "retorno"
        ? "Confirma se a primeira mensagem chegou."
        : opcao === "gemini" && origem === "gemini"
          ? "Redigida pelo Gemini com o mesmo gancho do texto fixo. Revise antes de enviar."
          : opcao === "gemini" && origem === "fixa"
            ? "O Gemini não passou na revisão, então veio o texto fixo. Revise antes de enviar."
            : base
              ? "Texto fixo, decidido pelo sistema para este lead. Revise antes de enviar."
              : "Montando a mensagem..."

  return (
    <>
      <Button variant="outline" size={size} onClick={abrir}>
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
            <DialogDescription>{descricao}</DialogDescription>
          </DialogHeader>

          {foraDoHorario && (
            <p className="rounded-md border bg-muted/50 p-3 text-sm">
              As mensagens só saem entre {JANELA_DE_HORARIO}, no horário de Fortaleza. Volte nesse horário.
            </p>
          )}

          {base?.tipo === "manual" && (
            <p className="rounded-md border bg-muted/50 p-3 text-sm">
              {base.motivo === "sem_lacuna"
                ? "Este lead não tem nenhuma lacuna que o sistema consiga afirmar, então não há gancho automático. Se for abordar, escreva você mesmo."
                : "A mensagem deste lead sairia fora das regras (por exemplo, nome longo demais), então não é gerada."}
            </p>
          )}

          {opcoes.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={idDoSeletor}>Mensagem</Label>
              <Select value={opcao} onValueChange={(v) => escolher(v as Opcao)}>
                <SelectTrigger id={idDoSeletor} className="w-full">
                  <SelectValue placeholder="Escolha" />
                </SelectTrigger>
                <SelectContent>
                  {opcoes.map((valor) => (
                    <SelectItem key={valor} value={valor}>
                      {ROTULOS[valor]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {carregando && !mensagem ? (
            <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              {opcao === "gemini" ? "O Gemini está escrevendo..." : "Montando a mensagem..."}
            </div>
          ) : (
            opcao !== "" &&
            mensagem !== "" && (
              <Textarea
                aria-label="Texto da mensagem"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                disabled={carregando}
                className="max-h-80 min-h-32"
              />
            )
          )}
          {motivos.length > 0 && (
            <p className="text-sm text-destructive">Assim não dá pra enviar: {motivos.map(descreverMotivo).join(", ")}.</p>
          )}
          {carregar.isError && <p className="text-sm text-destructive">{carregar.error.message}</p>}

          {!foraDoHorario && (base || carregar.isError) && (
            <DialogFooter>
              {opcao === "gemini" && (
                <Button variant="outline" disabled={carregando} onClick={() => pedir("gemini", geradas)}>
                  {carregando ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
                  Gerar outra
                </Button>
              )}
              {carregar.isError && !base && (
                <Button variant="outline" onClick={abrir}>
                  <RefreshCwIcon />
                  Tentar de novo
                </Button>
              )}
              {opcao === "" && base?.tipo === "manual" ? (
                <Button asChild variant="outline">
                  <a href={linkSemTexto} target="_blank" rel="noreferrer" onClick={() => setAberto(false)}>
                    <MessageCircleIcon />
                    Abrir sem mensagem
                  </a>
                </Button>
              ) : podeAbrir && linkComTexto ? (
                <Button asChild>
                  <a
                    href={linkComTexto}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      setAberto(false)
                      sugerirRetorno()
                    }}
                  >
                    <MessageCircleIcon />
                    Abrir no WhatsApp
                  </a>
                </Button>
              ) : (
                <Button disabled>
                  <MessageCircleIcon />
                  Abrir no WhatsApp
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
