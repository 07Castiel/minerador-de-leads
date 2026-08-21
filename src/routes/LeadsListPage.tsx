import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"

import { useLeads } from "@/hooks/useLeads"
import { LeadsFilters, type LeadsFilterState } from "@/components/leads/LeadsFilters"
import { LeadsTable } from "@/components/leads/LeadsTable"

function readFilters(params: URLSearchParams): LeadsFilterState {
  return {
    status: params.get("status") ?? "",
    temperatura: params.get("temperatura") ?? "",
    categoria: params.get("categoria") ?? "",
    search: params.get("q") ?? "",
  }
}

export default function LeadsListPage() {
  const { data: leads, isLoading, error } = useLeads()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readFilters(searchParams)

  function setFilters(next: LeadsFilterState) {
    const params = new URLSearchParams()
    if (next.status) params.set("status", next.status)
    if (next.temperatura) params.set("temperatura", next.temperatura)
    if (next.categoria) params.set("categoria", next.categoria)
    if (next.search) params.set("q", next.search)
    setSearchParams(params, { replace: true })
  }

  const categorias = useMemo(() => {
    if (!leads) return []
    return Array.from(new Set(leads.map((l) => l.categoria).filter((c): c is string => !!c))).sort()
  }, [leads])

  const filteredLeads = useMemo(() => {
    if (!leads) return []
    const search = filters.search.trim().toLowerCase()

    return leads.filter((lead) => {
      if (filters.status && lead.status !== filters.status) return false
      if (filters.temperatura && lead.temperatura !== filters.temperatura) return false
      if (filters.categoria && lead.categoria !== filters.categoria) return false
      if (search) {
        const haystack = `${lead.nome} ${lead.bairro ?? ""}`.toLowerCase()
        if (!haystack.includes(search)) return false
      }
      return true
    })
  }, [leads, filters])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Leads</h1>
        <p className="text-sm text-muted-foreground">
          {leads ? `${filteredLeads.length} de ${leads.length} leads` : "Carregando..."}
        </p>
      </div>

      <LeadsFilters filters={filters} categorias={categorias} onChange={setFilters} />

      {isLoading && <p className="text-sm text-muted-foreground">Carregando leads...</p>}
      {error && (
        <p className="text-sm text-destructive">Erro ao carregar leads: {error.message}</p>
      )}
      {leads && <LeadsTable leads={filteredLeads} />}
    </div>
  )
}
