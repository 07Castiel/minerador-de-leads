"use client"

import { useRef, useState } from "react"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useLeadsDoFunil } from "@/hooks/useLeads"
import {
  useExcluirModelo,
  useModelosMensagem,
  useSalvarModelo,
  type ModeloMensagem,
} from "@/hooks/useModelosMensagem"
import {
  TAMANHO_MAXIMO_MODELO,
  VARIAVEIS_DO_MODELO,
  preencherModelo,
  valoresDoModelo,
  type CamposDoModelo,
} from "@/lib/leads/modelosMensagem"
import { cn } from "@/lib/utils"

// Lead de exemplo para a prévia quando o CRM ainda está vazio.
const LEAD_DE_EXEMPLO: CamposDoModelo = {
  nome: "Costa e Moura Advogados | Direito Trabalhista",
  categoria: "Escritório de advocacia",
  bairro: "Aldeota",
  cidade: "Fortaleza",
  tem_site: false,
  site_url: "https://instagram.com/costaemoura.adv",
  site_url_final: null,
  site_status: null,
  site_https: null,
  site_responsivo: null,
  site_nota_celular: null,
  site_dominio_gratuito: null,
  instagram_handle: "costaemoura.adv",
  perfil_reivindicado: true,
  fotos_count: 12,
  google_rating: 4.8,
  google_avaliacoes_count: 91,
}

const EXEMPLO = "__exemplo__"

type Rascunho = { id?: string; nome: string; texto: string }

function Editor({
  rascunho,
  onCancelar,
  onSalvo,
  proximaOrdem,
}: {
  rascunho: Rascunho
  onCancelar: () => void
  onSalvo: () => void
  proximaOrdem: number
}) {
  const [nome, setNome] = useState(rascunho.nome)
  const [texto, setTexto] = useState(rascunho.texto)
  const [leadDaPrevia, setLeadDaPrevia] = useState(EXEMPLO)
  const textoRef = useRef<HTMLTextAreaElement>(null)
  const salvar = useSalvarModelo()
  const { data: leads } = useLeadsDoFunil()

  const opcoesDePrevia = (leads ?? []).slice(0, 30)
  const lead = opcoesDePrevia.find((l) => l.id === leadDaPrevia) ?? LEAD_DE_EXEMPLO
  const previa = preencherModelo(texto, valoresDoModelo(lead, new Date()))

  // Insere a variável onde está o cursor.
  function inserir(chave: string) {
    const campo = textoRef.current
    const trecho = `{${chave}}`
    if (!campo) {
      setTexto((atual) => atual + trecho)
      return
    }
    const inicio = campo.selectionStart ?? texto.length
    const fim = campo.selectionEnd ?? texto.length
    const novo = texto.slice(0, inicio) + trecho + texto.slice(fim)
    setTexto(novo)
    requestAnimationFrame(() => {
      campo.focus()
      campo.setSelectionRange(inicio + trecho.length, inicio + trecho.length)
    })
  }

  const invalido = nome.trim() === "" || texto.trim() === "" || texto.length > TAMANHO_MAXIMO_MODELO

  function handleSalvar() {
    salvar.mutate(
      { id: rascunho.id, nome, texto, ...(rascunho.id ? {} : { ordem: proximaOrdem }) },
      {
        onSuccess: () => {
          toast.success("Modelo salvo.")
          onSalvo()
        },
        onError: (err) => toast.error(`Erro ao salvar o modelo: ${err.message}`),
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{rascunho.id ? "Editar modelo" : "Novo modelo"}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="modelo-nome">Nome</Label>
          <Input
            id="modelo-nome"
            value={nome}
            maxLength={80}
            placeholder="ex.: Primeira abordagem"
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="modelo-texto">Texto</Label>
          <Textarea
            id="modelo-texto"
            ref={textoRef}
            rows={8}
            value={texto}
            aria-describedby="modelo-variaveis"
            aria-invalid={texto.length > TAMANHO_MAXIMO_MODELO}
            onChange={(e) => setTexto(e.target.value)}
          />
          <div id="modelo-variaveis" className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">
              Clique para inserir uma variável no texto ({texto.length}/{TAMANHO_MAXIMO_MODELO} caracteres):
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {VARIAVEIS_DO_MODELO.map((v) => (
                <li key={v.chave}>
                  <Button type="button" size="xs" variant="outline" title={v.descricao} onClick={() => inserir(v.chave)}>
                    {`{${v.chave}}`}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">Prévia</span>
            <Select value={leadDaPrevia} onValueChange={setLeadDaPrevia}>
              <SelectTrigger size="sm" className="w-56" aria-label="Lead usado na prévia">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EXEMPLO}>Lead de exemplo</SelectItem>
                {opcoesDePrevia.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm whitespace-pre-line">{previa.texto || "—"}</p>
          {previa.semDado.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Sem dado neste lead: {previa.semDado.map((c) => `{${c}}`).join(", ")}. Fica em branco na mensagem.
            </p>
          )}
          {previa.desconhecidas.length > 0 && (
            <p className="text-xs text-destructive">
              Não são variáveis: {previa.desconhecidas.map((c) => `{${c}}`).join(", ")}. Confira a grafia.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleSalvar} disabled={invalido || salvar.isPending}>
            {salvar.isPending ? "Salvando..." : "Salvar"}
          </Button>
          <Button variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ItemDoModelo({
  modelo,
  editando,
  onEditar,
}: {
  modelo: ModeloMensagem
  editando: boolean
  onEditar: () => void
}) {
  const excluir = useExcluirModelo()
  const [confirmando, setConfirmando] = useState(false)

  return (
    <li className={cn("flex flex-col gap-2 rounded-lg border bg-card p-4", editando && "ring-2 ring-ring/40")}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-medium">{modelo.nome}</h2>
        <div className="flex shrink-0 items-center gap-1">
          {confirmando ? (
            <>
              <Button
                size="xs"
                variant="destructive"
                disabled={excluir.isPending}
                onClick={() =>
                  excluir.mutate(modelo.id, {
                    onSuccess: () => toast.success(`Modelo "${modelo.nome}" excluído.`),
                    onError: (err) => toast.error(`Erro ao excluir: ${err.message}`),
                  })
                }
              >
                Excluir mesmo
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setConfirmando(false)}>
                Não
              </Button>
            </>
          ) : (
            <>
              <Button size="xs" variant="ghost" onClick={onEditar}>
                <PencilIcon />
                Editar
              </Button>
              <Button size="xs" variant="ghost" aria-label={`Excluir ${modelo.nome}`} onClick={() => setConfirmando(true)}>
                <Trash2Icon />
              </Button>
            </>
          )}
        </div>
      </div>
      <p className="line-clamp-4 text-sm whitespace-pre-line text-muted-foreground">{modelo.texto}</p>
    </li>
  )
}

export function ModelosMensagemView() {
  const { data: modelos, isLoading, error } = useModelosMensagem()
  const [rascunho, setRascunho] = useState<Rascunho | null>(null)

  const proximaOrdem = Math.max(0, ...(modelos ?? []).map((m) => m.ordem)) + 1

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Mensagens prontas</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Modelos do botão WhatsApp. As variáveis entre chaves viram os dados de cada lead, e{" "}
            <code className="text-foreground">{"{gancho}"}</code> puxa o ponto mais fraco dele (sem site, site fora do ar,
            lento no celular...).
          </p>
        </div>
        <Button size="sm" onClick={() => setRascunho({ nome: "", texto: "" })}>
          <PlusIcon />
          Novo modelo
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando modelos...</p>}
      {error && <p className="text-sm text-destructive">Erro ao carregar modelos: {error.message}</p>}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {modelos && (
          <ul className="flex flex-col gap-3" aria-label="Modelos">
            {modelos.length === 0 && (
              <li className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhum modelo ainda. Crie o primeiro.
              </li>
            )}
            {modelos.map((modelo) => (
              <ItemDoModelo
                key={modelo.id}
                modelo={modelo}
                editando={rascunho?.id === modelo.id}
                onEditar={() => setRascunho({ id: modelo.id, nome: modelo.nome, texto: modelo.texto })}
              />
            ))}
          </ul>
        )}

        {rascunho ? (
          <Editor
            key={rascunho.id ?? "novo"}
            rascunho={rascunho}
            proximaOrdem={proximaOrdem}
            onCancelar={() => setRascunho(null)}
            onSalvo={() => setRascunho(null)}
          />
        ) : (
          modelos &&
          modelos.length > 0 && (
            <Card className="hidden lg:block">
              <CardHeader>
                <CardTitle className="text-base">Como funciona</CardTitle>
                <CardDescription>
                  No CRM ou na página do lead, clique em WhatsApp e escolha o modelo. O texto já sai com os dados daquele
                  lead, dá pra ajustar antes de abrir a conversa, e o Gemini continua disponível na mesma janela.
                </CardDescription>
              </CardHeader>
            </Card>
          )
        )}
      </div>
    </div>
  )
}
