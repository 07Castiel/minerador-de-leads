import type { ImportControlledField } from "@/lib/import/types"

export type FieldValueKind = "text" | "number" | "derived-boolean"

export type FieldDefinition = {
  key: ImportControlledField
  label: string
  required: boolean
  kind: FieldValueKind
  helpText?: string
}

// Ordem = ordem de exibição na tela de mapeamento (centrada no destino).
// Campos NUNCA nesta lista (status, observacoes, instagram_*,
// google_avaliacoes_sem_resposta, score, temperatura, criado_em,
// atualizado_em, id) nunca são tocados pelo import — são manuais ou
// trigger-owned, sem exceção.
export const FIELD_DEFINITIONS: FieldDefinition[] = [
  { key: "nome", label: "Nome", required: true, kind: "text" },
  { key: "categoria", label: "Categoria", required: false, kind: "text" },
  { key: "cidade", label: "Cidade", required: false, kind: "text" },
  { key: "bairro", label: "Bairro", required: false, kind: "text" },
  { key: "endereco", label: "Endereço", required: false, kind: "text" },
  { key: "telefone", label: "Telefone", required: false, kind: "text" },
  { key: "maps_url", label: "URL do Google Maps", required: false, kind: "text" },
  {
    key: "tem_site",
    label: "Tem site?",
    required: false,
    kind: "derived-boolean",
    helpText: "Derivado da coluna de presença de site (vazio = sem site).",
  },
  { key: "google_rating", label: "Avaliação do Google", required: false, kind: "number" },
  {
    key: "google_avaliacoes_count",
    label: "Nº de avaliações",
    required: false,
    kind: "number",
  },
  { key: "latitude", label: "Latitude", required: false, kind: "number" },
  { key: "longitude", label: "Longitude", required: false, kind: "number" },
]

export const IMPORT_CONTROLLED_FIELDS: readonly ImportControlledField[] =
  FIELD_DEFINITIONS.map((f) => f.key)

// Campos que o import JAMAIS escreve, mesmo em reimportação — allowlist
// inversa, só pra deixar explícito em código (não é usada em runtime,
// serve de documentação viva + guarda em teste).
export const NEVER_IMPORTED_FIELDS = [
  "etapa",
  "etapa_atualizada_em",
  "motivo_perda",
  "no_funil",
  "observacoes",
  "proximo_contato",
  "site_analisado_em",
  "site_status",
  "site_nota_celular",
  "instagram_handle",
  "instagram_seguidores",
  "instagram_ultimo_post_dias",
  "google_avaliacoes_sem_resposta",
  "score",
  "temperatura",
  "criado_em",
  "atualizado_em",
  "id",
] as const
