"use client"

import { useId, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { CopyIcon, Loader2Icon, MessageCircleIcon, RefreshCwIcon } from "lucide-react"
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
  apresentacaoDoNicho,
  descreverMotivo,
  mensagemDeRetorno,
  resolverNicho,
  validarApresentacao,
  validarConteudo,
  validarMensagem,
  type MensagemDaJanela,
  type ModoDaJanela,
} from "@/lib/leads/abordagem"
import { GEMINI_NA_ABORDAGEM, SAUDACOES } from "@/lib/leads/abordagemConfig"
import { motivoBloqueioDe, registrarAbordagens } from "@/lib/leads/abordagens"
import { pedirMensagemDaJanela } from "@/lib/leads/api"
import { dataLocalIso, descreverRetorno, retornoPendente, somarDias } from "@/lib/leads/proximoContato"
import { supabaseBrowser } from "@/lib/supabase/client"
import type { Lead } from "@/types/lead"

type BotaoWhatsAppProps = {
  lead: Lead
  size: "xs" | "sm"
}

type Opcao = ModoDaJanela | "apresentacao" | "retorno"

const ROTULOS: Record<Opcao, string> = {
  completa: "Texto fixo",
  curta: "Texto fixo curto",
  gemini: "Escrito pelo Gemini",
  apresentacao: "Apresentação (depois que ele responder)",
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
  const idDoTexto = useId()
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

  // Nicho do passo 2: a base traz o nicho já resolvido com o termo da busca;
  // sem ela (lead sem lacuna), a categoria do Google resolve sozinha.
  function nichoDoLead(): string {
    return base?.tipo === "pronta" ? base.validacao.nicho : resolverNicho(lead.categoria).id
  }

  function escolher(valor: Opcao) {
    setOpcao(valor)
    opcaoAtual.current = valor
    setMensagem("")
    setOrigem(null)
    if (valor === "retorno" || valor === "apresentacao") {
      setMensagem(valor === "retorno" ? mensagemDeRetorno() : apresentacaoDoNicho(nichoDoLead()))
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

  // A mensagem 2 no clique do botão: o link do WhatsApp já leva a 1, e colar é
  // o caminho mais curto pra segunda. Se o navegador negar a área de
  // transferência, o botão "Copiar" ao lado do texto continua lá.
  async function copiarSegunda(): Promise<void> {
    if (!abertura || !mensagem.trim()) return
    try {
      await navigator.clipboard.writeText(mensagem.trim())
      toast.success("Mensagem 2 copiada: mande a saudação e cole em seguida.")
    } catch {
      toast.info('Copie a mensagem 2 no botão "Copiar" antes de mandar a saudação.')
    }
  }

  // Registra a mensagem quando ela é de fato usada: o clique em "Abrir no
  // WhatsApp". Abrir a janela e não mandar nada não conta.
  async function registrar() {
    if (opcao === "" || !mensagem.trim()) return
    try {
      await registrarAbordagens(supabaseBrowser(), [
        {
          lead_id: lead.id,
          tipo: opcao === "retorno" ? "follow_up" : opcao === "apresentacao" ? "apresentacao" : "primeira",
          // Só a abertura tem lacuna: é dela que sai a anti-repetição
          lacuna: opcao === "retorno" || opcao === "apresentacao" ? null : (pronta?.lacuna ?? null),
          nicho: nichoDoLead(),
          texto: mensagem.trim(),
          origem: opcao === "gemini" && origem === "gemini" ? "gemini" : "fixo",
          aberto_whatsapp: true,
          motivo_bloqueio: motivoBloqueioDe(pronta?.bloqueios ?? []),
        },
      ])
    } catch (err) {
      // O WhatsApp já abriu: erro aqui não pode atrapalhar o envio.
      console.error("Não deu pra registrar a abordagem", err)
    }
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
  // Abertura: a saudação vai sozinha antes, então são duas mensagens. A
  // apresentação e o retorno entram numa conversa já aberta, e vão sozinhas.
  const abertura = opcao !== "" && opcao !== "apresentacao" && opcao !== "retorno" ? pronta : null
  const foraDoHorario = base?.tipo === "fora_do_horario"
  const descartado = base?.tipo === "descartado_sem_gancho"
  const opcoes: Opcao[] = [
    ...(pronta ? (["completa", "curta"] as const) : []),
    ...(pronta && GEMINI_NA_ABORDAGEM ? (["gemini"] as const) : []),
    ...(base && !foraDoHorario && lead.etapa !== "novo" ? (["apresentacao", "retorno"] as const) : []),
  ]

  const motivos =
    !mensagem.trim() || carregando || opcao === ""
      ? []
      : opcao === "apresentacao"
        ? validarApresentacao(mensagem, nichoDoLead())
        : opcao === "retorno"
          ? validarConteudo(mensagem, nichoDoLead())
          : pronta
            ? validarMensagem(mensagem, pronta.validacao)
            : []
  const podeAbrir = opcao !== "" && !carregando && mensagem.trim() !== "" && motivos.length === 0

  // Com duas mensagens, o WhatsApp abre com a 1 (o link só preenche uma vez) e
  // a 2 vai pra área de transferência no mesmo clique.
  const textoDoLink = abertura ? abertura.saudacao : mensagem.trim()
  const linkComTexto = linkWhatsApp(lead.telefone, textoDoLink || undefined)
  const linkSemTexto = linkWhatsApp(lead.telefone)
  if (!linkSemTexto) return null

  const descricao = foraDoHorario
    ? "Fora do horário de abordagem."
    : descartado && opcao === ""
      ? "Nada a apontar neste lead."
      : base?.tipo === "manual" && opcao === ""
        ? "Sem mensagem automática para este lead."
        : opcao === "apresentacao"
          ? "Só depois que ele responder: aqui é onde o serviço e a empresa aparecem."
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

          {descartado && (
            <p className="rounded-md border bg-muted/50 p-3 text-sm">
              O site de vocês abre e não tem defeito que dê pra apontar, então não há gancho automático. Este lead é
              fim de linha na abordagem, não fila de trabalho.
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

          {abertura && !carregando && (
            <div className="flex flex-col gap-1">
              <Label>Mensagem 1 (vai sozinha, primeiro)</Label>
              <p className="rounded-md border bg-muted/50 p-3 text-sm">{abertura.saudacao}</p>
            </div>
          )}

          {abertura && !carregando && mensagem !== "" && (
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={idDoTexto}>Mensagem 2 (logo em seguida)</Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => void copiarSegunda()}
                disabled={mensagem.trim() === ""}
              >
                <CopyIcon />
                Copiar
              </Button>
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
                id={idDoTexto}
                aria-label={abertura ? "Texto da mensagem 2" : "Texto da mensagem"}
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

          {!foraDoHorario && (base || carregar.isError) && (opcoes.length > 0 || base?.tipo === "manual" || carregar.isError) && (
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
                      void copiarSegunda()
                      void registrar()
                      sugerirRetorno()
                    }}
                  >
                    <MessageCircleIcon />
                    {abertura ? "Abrir com a mensagem 1" : "Abrir no WhatsApp"}
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
