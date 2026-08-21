import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { STATUS_LABELS, STATUS_VALUES, TEMPERATURA_VALUES } from "@/types/lead"

const ALL = "__all__"

export type LeadsFilterState = {
  status: string
  temperatura: string
  categoria: string
  search: string
}

type LeadsFiltersProps = {
  filters: LeadsFilterState
  categorias: string[]
  onChange: (filters: LeadsFilterState) => void
}

export function LeadsFilters({ filters, categorias, onChange }: LeadsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Buscar por nome ou bairro..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="w-64"
      />

      <Select
        value={filters.status || ALL}
        onValueChange={(v) => onChange({ ...filters, status: v === ALL ? "" : v })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os status</SelectItem>
          {STATUS_VALUES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.temperatura || ALL}
        onValueChange={(v) => onChange({ ...filters, temperatura: v === ALL ? "" : v })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Temperatura" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas</SelectItem>
          {TEMPERATURA_VALUES.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.categoria || ALL}
        onValueChange={(v) => onChange({ ...filters, categoria: v === ALL ? "" : v })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as categorias</SelectItem>
          {categorias.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
