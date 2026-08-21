import { FIELD_DEFINITIONS } from "@/lib/import/fieldDefinitions"
import type { ColumnMapping, ParsedData } from "@/lib/import/types"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const UNMAPPED = "__unmapped__"

type ColumnMappingStepProps = {
  parsed: ParsedData
  mapping: ColumnMapping
  onMappingChange: (mapping: ColumnMapping) => void
  origem: string
  onOrigemChange: (origem: string) => void
}

function exampleValue(parsed: ParsedData, header: string): string | null {
  for (const row of parsed.rows.slice(0, 20)) {
    const value = row[header]
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value)
    }
  }
  return null
}

export function ColumnMappingStep({
  parsed,
  mapping,
  onMappingChange,
  origem,
  onOrigemChange,
}: ColumnMappingStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="origem">Origem desta importação</Label>
        <Input
          id="origem"
          placeholder="ex: apify_gmaps_concessionarias_sobral_2026-08"
          value={origem}
          onChange={(e) => onOrigemChange(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Opcional — se preenchido, marca todas as linhas deste lote. Não sobrescreve a origem de
          leads já existentes que não foram tocados nesta importação.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Mapeamento de colunas</Label>
        {FIELD_DEFINITIONS.map((def) => {
          const currentSource = mapping[def.key] ?? UNMAPPED
          return (
            <div key={def.key} className="flex items-center gap-4 border-b pb-3 last:border-0">
              <div className="w-48 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{def.label}</span>
                  {def.required && <Badge variant="destructive">obrigatório</Badge>}
                </div>
                {def.helpText && (
                  <p className="text-xs text-muted-foreground">{def.helpText}</p>
                )}
              </div>
              <Select
                value={currentSource}
                onValueChange={(value) =>
                  onMappingChange({
                    ...mapping,
                    [def.key]: value === UNMAPPED ? null : value,
                  })
                }
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Não mapeado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNMAPPED}>Não mapeado</SelectItem>
                  {parsed.headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="truncate text-sm text-muted-foreground">
                {currentSource !== UNMAPPED
                  ? (exampleValue(parsed, currentSource) ?? "(sem exemplo)")
                  : ""}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
