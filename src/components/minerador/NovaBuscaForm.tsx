"use client"

import { useState, type FormEvent } from "react"
import { PickaxeIcon } from "lucide-react"
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
import { useCidades } from "@/hooks/useBuscas"
import { formatarUsd } from "@/lib/minerador/formatacao"
import {
  FILTROS_PADRAO,
  MAX_RESULTADOS_LIMITE,
  NICHOS_SUGERIDOS,
  QUANTIDADES_SUGERIDAS,
  UFS,
  estimarCustoUsd,
  validarNovaBusca,
  type FiltroSite,
  type FiltrosBusca,
  type NotaMinima,
  type NovaBusca,
} from "@/lib/minerador/regras"
import { cn } from "@/lib/utils"

const NOTA_QUALQUER = "__qualquer__"

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

type NovaBuscaFormProps = {
  enviando: boolean
  onSubmit: (nova: NovaBusca) => void
}

export function NovaBuscaForm({ enviando, onSubmit }: NovaBuscaFormProps) {
  const [nicho, setNicho] = useState("")
  const [uf, setUf] = useState("CE")
  const [cidade, setCidade] = useState("Sobral")
  const [bairro, setBairro] = useState("")
  const [quantidade, setQuantidade] = useState("50")
  const [filtros, setFiltros] = useState<FiltrosBusca>(FILTROS_PADRAO)
  const cidades = useCidades(uf)

  const maxResultados = Number(quantidade)
  const quantidadeValida =
    Number.isInteger(maxResultados) && maxResultados >= 1 && maxResultados <= MAX_RESULTADOS_LIMITE
  const custo = quantidadeValida ? estimarCustoUsd({ maxResultados, filtros }) : null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()

    // Cidade precisa existir na lista do IBGE (evita busca em cidade digitada errada).
    let cidadeFinal = cidade
    if (cidades.data) {
      const achada = cidades.data.find((c) => semAcento(c) === semAcento(cidade))
      if (!achada) {
        toast.error(`"${cidade}" não está na lista de cidades de ${uf}. Escolha uma das sugestões.`)
        return
      }
      cidadeFinal = achada
    }

    const validacao = validarNovaBusca({
      nicho,
      uf,
      cidade: cidadeFinal,
      bairro,
      maxResultados,
      filtros,
    })
    if (!validacao.ok) {
      toast.error(validacao.erro)
      return
    }
    onSubmit(validacao.valor)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova busca</CardTitle>
        <CardDescription>
          Procura negócios no Google Maps. Você escolhe quais resultados entram no CRM.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-[1.4fr_0.8fr_1.2fr_1fr]">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nicho">Nicho</Label>
              <Input
                id="nicho"
                list="sugestoes-nicho"
                placeholder="ex.: Barbearia, Pet shop"
                value={nicho}
                onChange={(e) => setNicho(e.target.value)}
                autoComplete="off"
              />
              <datalist id="sugestoes-nicho">
                {NICHOS_SUGERIDOS.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="uf">Estado</Label>
              <Select
                value={uf}
                onValueChange={(v) => {
                  setUf(v)
                  setCidade("")
                }}
              >
                <SelectTrigger id="uf" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UFS.map((u) => (
                    <SelectItem key={u.sigla} value={u.sigla}>
                      {u.sigla} · {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                list="sugestoes-cidade"
                placeholder={cidades.isLoading ? "Carregando cidades..." : "Digite e escolha"}
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                autoComplete="off"
              />
              <datalist id="sugestoes-cidade">
                {cidades.data?.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {cidades.error && (
                <span className="text-xs text-destructive">
                  Lista de cidades indisponível; confira a grafia.
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="bairro">
                Bairro <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="bairro"
                placeholder="ex.: Centro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="quantidade">Máximo de leads</Label>
              <div className="flex items-center gap-2">
                {QUANTIDADES_SUGERIDAS.map((q) => (
                  <Button
                    key={q}
                    type="button"
                    size="sm"
                    variant={Number(quantidade) === q ? "default" : "outline"}
                    onClick={() => setQuantidade(String(q))}
                  >
                    {q}
                  </Button>
                ))}
                <Input
                  id="quantidade"
                  type="number"
                  min={1}
                  max={MAX_RESULTADOS_LIMITE}
                  step={1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  aria-invalid={!quantidadeValida}
                  className="w-20"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="filtro-site">Site</Label>
              <Select
                value={filtros.site}
                onValueChange={(v) => setFiltros({ ...filtros, site: v as FiltroSite })}
              >
                <SelectTrigger id="filtro-site" className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Com ou sem site</SelectItem>
                  <SelectItem value="sem_site">Só sem site</SelectItem>
                  <SelectItem value="com_site">Só com site</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="filtro-nota">Nota mínima</Label>
              <Select
                value={filtros.notaMinima || NOTA_QUALQUER}
                onValueChange={(v) =>
                  setFiltros({ ...filtros, notaMinima: (v === NOTA_QUALQUER ? "" : v) as NotaMinima })
                }
              >
                <SelectTrigger id="filtro-nota" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NOTA_QUALQUER}>Qualquer nota</SelectItem>
                  <SelectItem value="3">3,0 ou mais</SelectItem>
                  <SelectItem value="3.5">3,5 ou mais</SelectItem>
                  <SelectItem value="4">4,0 ou mais</SelectItem>
                  <SelectItem value="4.5">4,5 ou mais</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label htmlFor="ignorar-fechados" className="flex h-9 items-center gap-2 text-sm">
              <input
                id="ignorar-fechados"
                type="checkbox"
                className="size-4 accent-primary"
                checked={filtros.ignorarFechados}
                onChange={(e) => setFiltros({ ...filtros, ignorarFechados: e.target.checked })}
              />
              Ignorar fechados
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className={cn("text-sm text-muted-foreground", !quantidadeValida && "text-destructive")}>
              {custo === null ? (
                `Informe uma quantidade entre 1 e ${MAX_RESULTADOS_LIMITE}.`
              ) : (
                <>
                  Custo máximo no Apify:{" "}
                  <span className="font-medium text-foreground">{formatarUsd(custo)}</span>
                  <span className="block text-xs">Cada filtro soma um pequeno custo por lead.</span>
                </>
              )}
            </p>
            <Button type="submit" disabled={enviando}>
              <PickaxeIcon />
              {enviando ? "Iniciando..." : "Buscar leads"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
