"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { KanbanIcon, ListIcon, PickaxeIcon } from "lucide-react"

import { KanbanBoard } from "@/components/crm/KanbanBoard"
import { LeadsTable } from "@/components/leads/LeadsTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLeadsDoFunil } from "@/hooks/useLeads"
import type { Lead } from "@/types/lead"

const TODAS = "__todas__"

const ATALHOS = [
  { id: "sem_site", label: "Sem site" },
  { id: "quente", label: "Quentes" },
  { id: "com_telefone", label: "Com telefone" },
] as const

type Atalho = (typeof ATALHOS)[number]["id"]

const ORDENS = {
  score: "Maior score",
  recentes: "Mais recentes",
  nome: "Nome (A–Z)",
} as const

type Ordem = keyof typeof ORDENS

function ordenar(leads: Lead[], ordem: Ordem): Lead[] {
  const copia = [...leads]
  if (ordem === "nome") return copia.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
  if (ordem === "recentes") {
    return copia.sort((a, b) => (b.criado_em ?? "").localeCompare(a.criado_em ?? ""))
  }
  return copia.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
}

// Filtros ficam na URL: dá pra voltar do detalhe do lead sem perder a visão.
export function CrmView() {
  const { data: leads, isLoading, error } = useLeadsDoFunil()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const visao = params.get("visao") === "lista" ? "lista" : "quadro"
  const busca = params.get("q") ?? ""
  const categoria = params.get("categoria") ?? ""
  const ordem: Ordem = (params.get("ordem") as Ordem) in ORDENS ? (params.get("ordem") as Ordem) : "score"
  const atalhosParam = params.get("f") ?? ""
  const atalhos = useMemo(
    () => new Set(atalhosParam.split(",").filter(Boolean) as Atalho[]),
    [atalhosParam]
  )

  function atualizar(mudancas: Record<string, string | null>) {
    const novos = new URLSearchParams(params.toString())
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) novos.set(chave, valor)
      else novos.delete(chave)
    }
    const query = novos.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function alternarAtalho(id: Atalho) {
    const novos = new Set(atalhos)
    if (novos.has(id)) novos.delete(id)
    else novos.add(id)
    atualizar({ f: [...novos].join(",") || null })
  }

  const categorias = useMemo(
    () =>
      Array.from(new Set((leads ?? []).map((l) => l.categoria).filter((c): c is string => !!c))).sort(
        (a, b) => a.localeCompare(b, "pt-BR")
      ),
    [leads]
  )

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const lista = (leads ?? []).filter((lead) => {
      if (atalhos.has("sem_site") && lead.tem_site !== false) return false
      if (atalhos.has("quente") && lead.temperatura !== "quente") return false
      if (atalhos.has("com_telefone") && !lead.telefone) return false
      if (categoria && lead.categoria !== categoria) return false
      if (termo) {
        const texto = `${lead.nome} ${lead.bairro ?? ""} ${lead.cidade ?? ""}`.toLowerCase()
        if (!texto.includes(termo)) return false
      }
      return true
    })
    return ordenar(lista, ordem)
  }, [leads, busca, categoria, ordem, atalhos])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">CRM</h1>
          <p className="text-sm text-muted-foreground">
            {leads ? `${filtrados.length} de ${leads.length} leads no funil` : "Carregando..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-0.5" role="group" aria-label="Visualização">
            <Button
              size="sm"
              variant={visao === "quadro" ? "secondary" : "ghost"}
              aria-pressed={visao === "quadro"}
              onClick={() => atualizar({ visao: null })}
            >
              <KanbanIcon />
              Quadro
            </Button>
            <Button
              size="sm"
              variant={visao === "lista" ? "secondary" : "ghost"}
              aria-pressed={visao === "lista"}
              onClick={() => atualizar({ visao: "lista" })}
            >
              <ListIcon />
              Lista
            </Button>
          </div>
          <Button asChild size="sm">
            <Link href="/buscar">
              <PickaxeIcon />
              Buscar leads
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Buscar por nome, bairro ou cidade"
          placeholder="Buscar por nome, bairro ou cidade..."
          defaultValue={busca}
          onChange={(e) => atualizar({ q: e.target.value || null })}
          className="w-64"
        />
        {ATALHOS.map((a) => (
          <Button
            key={a.id}
            size="sm"
            variant={atalhos.has(a.id) ? "default" : "outline"}
            aria-pressed={atalhos.has(a.id)}
            onClick={() => alternarAtalho(a.id)}
          >
            {a.label}
          </Button>
        ))}
        <Select
          value={categoria || TODAS}
          onValueChange={(v) => atualizar({ categoria: v === TODAS ? null : v })}
        >
          <SelectTrigger className="w-48" aria-label="Categoria">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas as categorias</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ordem} onValueChange={(v) => atualizar({ ordem: v === "score" ? null : v })}>
          <SelectTrigger className="w-40" aria-label="Ordenar">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ORDENS).map(([valor, label]) => (
              <SelectItem key={valor} value={valor}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando leads...</p>}
      {error && <p className="text-sm text-destructive">Erro ao carregar leads: {error.message}</p>}
      {leads && leads.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">O funil está vazio</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Faça uma busca e envie os melhores resultados para cá, ou importe uma planilha.
            </p>
          </div>
        )}
      {leads &&
        leads.length > 0 &&
        (visao === "lista" ? <LeadsTable leads={filtrados} /> : <KanbanBoard leads={filtrados} />)}
    </div>
  )
}
