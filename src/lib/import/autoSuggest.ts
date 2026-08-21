import type { ColumnMapping, ImportControlledField } from "@/lib/import/types"

// Aliases baseados nos exemplos que o dono deu (title→nome, website→tem_site,
// reviewsCount→google_avaliacoes_count) mais nomes comuns do Google Maps
// Scraper. Ponto de partida sempre sobrescrevível — não são nomes garantidos,
// já que o formato exato varia por actor/config do Apify.
const ALIASES: Record<ImportControlledField, string[]> = {
  nome: ["title", "name", "nome"],
  categoria: ["categoryname", "category", "categoria"],
  cidade: ["city", "cidade"],
  bairro: ["neighborhood", "neighborhoodname", "bairro"],
  endereco: ["address", "endereco", "formattedaddress"],
  telefone: ["phoneunformatted", "phone", "telefone"],
  maps_url: ["url", "mapsurl", "googlemapsurl", "link"],
  tem_site: ["website", "site"],
  google_rating: ["totalscore", "rating", "googlerating"],
  google_avaliacoes_count: ["reviewscount", "reviewscounts", "numeroavaliacoes"],
  // Aliases explicitamente pedidos, sem inventar variações genéricas demais.
  latitude: ["lat", "latitude", "geo_lat", "coordinates.lat"],
  longitude: ["lng", "lon", "longitude", "geo_lng", "geo_lon", "coordinates.lng"],
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[\s_-]+/g, "")
}

// Suggestão automática comparando o header normalizado contra os aliases
// (também normalizados). Não modifica `headers`; devolve um mapeamento
// inicial que o usuário pode sobrescrever em cada campo.
export function autoSuggestMapping(headers: string[]): ColumnMapping {
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    normalized: normalizeHeader(h),
  }))

  const mapping: ColumnMapping = {}

  for (const [field, aliases] of Object.entries(ALIASES) as [
    ImportControlledField,
    string[],
  ][]) {
    const normalizedAliases = aliases.map(normalizeHeader)
    const match = normalizedHeaders.find((h) =>
      normalizedAliases.includes(h.normalized)
    )
    mapping[field] = match ? match.original : null
  }

  return mapping
}
