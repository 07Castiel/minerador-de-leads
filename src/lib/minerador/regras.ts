// Regras puras do minerador (sem I/O): validação da busca, custo, input do
// Apify e conversão do dataset em leads. Usadas no servidor e no navegador.

import { classificarLink } from "@/lib/leads/presencaDigital"

export const APIFY_ACTOR_ID = "compass~crawler-google-places"

// Preços do Google Maps Scraper no plano FREE do Apify (conferidos em
// 2026-09-16). Planos pagos cobram menos, então a estimativa é um teto.
export const PRECO_POR_LUGAR_USD = 0.004
export const PRECO_POR_FILTRO_POR_LUGAR_USD = 0.001

export const MAX_RESULTADOS_LIMITE = 500
export const QUANTIDADES_SUGERIDAS = [20, 50, 100, 200] as const

export const UFS = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "TO", nome: "Tocantins" },
] as const

export type SiglaUf = (typeof UFS)[number]["sigla"]

export function nomeDaUf(sigla: string): string | null {
  return UFS.find((u) => u.sigla === sigla)?.nome ?? null
}

// Sugestões do campo de nicho (texto livre continua valendo).
export const NICHOS_SUGERIDOS = [
  "Academia",
  "Advogado",
  "Agência de viagens",
  "Auto elétrica",
  "Autopeças",
  "Barbearia",
  "Borracharia",
  "Cafeteria",
  "Chaveiro",
  "Clínica de estética",
  "Clínica médica",
  "Clínica odontológica",
  "Clínica veterinária",
  "Contabilidade",
  "Corretor de imóveis",
  "Distribuidora de bebidas",
  "Escola de idiomas",
  "Escola particular",
  "Estúdio de pilates",
  "Estúdio de tatuagem",
  "Farmácia",
  "Fisioterapia",
  "Floricultura",
  "Fotógrafo",
  "Hamburgueria",
  "Hotel",
  "Imobiliária",
  "Laboratório de análises",
  "Lanchonete",
  "Lava-jato",
  "Lavanderia",
  "Loja de calçados",
  "Loja de materiais de construção",
  "Loja de móveis",
  "Loja de roupas",
  "Manicure",
  "Marmitaria",
  "Mecânica",
  "Nutricionista",
  "Oficina de funilaria",
  "Ótica",
  "Padaria",
  "Pet shop",
  "Pizzaria",
  "Pousada",
  "Psicólogo",
  "Restaurante",
  "Salão de beleza",
  "Sorveteria",
  "Supermercado",
] as const

export const FILTRO_SITE_VALUES = ["todos", "sem_site", "com_site"] as const
export type FiltroSite = (typeof FILTRO_SITE_VALUES)[number]

export const NOTA_MINIMA_VALUES = ["", "3", "3.5", "4", "4.5"] as const
export type NotaMinima = (typeof NOTA_MINIMA_VALUES)[number]

export type FiltrosBusca = {
  site: FiltroSite
  notaMinima: NotaMinima
  ignorarFechados: boolean
}

export type NovaBusca = {
  nicho: string
  uf: SiglaUf
  cidade: string
  bairro: string | null
  maxResultados: number
  filtros: FiltrosBusca
}

export const FILTROS_PADRAO: FiltrosBusca = {
  site: "todos",
  notaMinima: "",
  ignorarFechados: false,
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function textoLimpo(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : ""
}

// Valida o corpo vindo do navegador — o servidor nunca confia no front.
export function validarNovaBusca(raw: unknown): Resultado<NovaBusca> {
  if (!isRecord(raw)) return { ok: false, erro: "Corpo da requisição inválido." }

  const nicho = textoLimpo(raw.nicho)
  if (nicho.length < 2 || nicho.length > 100) {
    return { ok: false, erro: "Informe o nicho (entre 2 e 100 caracteres)." }
  }

  const uf = textoLimpo(raw.uf).toUpperCase()
  if (!nomeDaUf(uf)) return { ok: false, erro: "Escolha o estado." }

  const cidade = textoLimpo(raw.cidade)
  if (cidade.length < 2 || cidade.length > 80) return { ok: false, erro: "Escolha a cidade." }

  const bairro = textoLimpo(raw.bairro)
  if (bairro.length > 80) return { ok: false, erro: "Bairro muito longo (máx. 80 caracteres)." }

  const maxResultados = raw.maxResultados
  if (
    typeof maxResultados !== "number" ||
    !Number.isInteger(maxResultados) ||
    maxResultados < 1 ||
    maxResultados > MAX_RESULTADOS_LIMITE
  ) {
    return {
      ok: false,
      erro: `Quantidade deve ser um número inteiro entre 1 e ${MAX_RESULTADOS_LIMITE}.`,
    }
  }

  const filtrosRaw = isRecord(raw.filtros) ? raw.filtros : {}
  const site = filtrosRaw.site ?? FILTROS_PADRAO.site
  const notaMinima = filtrosRaw.notaMinima ?? FILTROS_PADRAO.notaMinima
  const ignorarFechados = filtrosRaw.ignorarFechados ?? FILTROS_PADRAO.ignorarFechados

  if (!FILTRO_SITE_VALUES.includes(site as FiltroSite)) {
    return { ok: false, erro: "Filtro de site inválido." }
  }
  if (!NOTA_MINIMA_VALUES.includes(notaMinima as NotaMinima)) {
    return { ok: false, erro: "Filtro de nota mínima inválido." }
  }
  if (typeof ignorarFechados !== "boolean") {
    return { ok: false, erro: "Filtro de estabelecimentos fechados inválido." }
  }

  return {
    ok: true,
    valor: {
      nicho,
      uf: uf as SiglaUf,
      cidade,
      bairro: bairro === "" ? null : bairro,
      maxResultados,
      filtros: {
        site: site as FiltroSite,
        notaMinima: notaMinima as NotaMinima,
        ignorarFechados,
      },
    },
  }
}

export function contarFiltrosPagos(filtros: FiltrosBusca): number {
  let total = 0
  if (filtros.site !== "todos") total++
  if (filtros.notaMinima !== "") total++
  if (filtros.ignorarFechados) total++
  return total
}

// Teto de custo assumindo que a busca devolve a quantidade máxima pedida.
export function estimarCustoUsd(busca: Pick<NovaBusca, "maxResultados" | "filtros">): number {
  const porLugar =
    PRECO_POR_LUGAR_USD + PRECO_POR_FILTRO_POR_LUGAR_USD * contarFiltrosPagos(busca.filtros)
  return Math.round(busca.maxResultados * porLugar * 10_000) / 10_000
}

// O Apify recusa a run se o teto for menor que isso (erro
// "max-total-charge-usd-below-minimum", visto em 2026-09-16).
export const LIMITE_COBRANCA_MINIMO_APIFY_USD = 0.5

// Trava enviada ao Apify (`maxTotalChargeUsd`): a run para sozinha se passar
// disso. Margem de 10% + 2 centavos (start do actor), arredondada pra cima. É
// só um teto — o que se paga continua sendo o que a run consumir.
export function limiteCobrancaUsd(busca: Pick<NovaBusca, "maxResultados" | "filtros">): number {
  // arredonda antes do ceil: 0,8 × 1,1 dá 0,8800000000000001 em ponto flutuante
  const centavos = Math.round((estimarCustoUsd(busca) * 1.1 + 0.02) * 100 * 1000) / 1000
  const comMargem = Math.ceil(centavos) / 100
  return Math.max(LIMITE_COBRANCA_MINIMO_APIFY_USD, comMargem)
}

// Nome completo do estado em vez da sigla: o geocoder do actor (OpenStreetMap)
// acerta mais "Sobral, Ceará, Brasil" do que "Sobral, CE".
export function montarLocationQuery(busca: Pick<NovaBusca, "uf" | "cidade" | "bairro">): string {
  const partes = [busca.bairro, busca.cidade, nomeDaUf(busca.uf) ?? busca.uf, "Brasil"]
  return partes.filter((p): p is string => !!p).join(", ")
}

function normalizarNomeDeCidade(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    // celular e Word trocam ' por ’ ou ‘; o IBGE usa '
    .replace(/[‘’´`]/g, "'")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim()
}

// Acha a cidade digitada na lista oficial do IBGE, ignorando acento, caixa,
// espaços e tipo de apóstrofo. Devolve o nome oficial (ou null).
export function encontrarCidade(cidades: readonly string[], digitada: string): string | null {
  const alvo = normalizarNomeDeCidade(digitada)
  if (!alvo) return null
  return cidades.find((c) => normalizarNomeDeCidade(c) === alvo) ?? null
}

export function descreverLocal(busca: { uf: string; cidade: string; bairro: string | null }): string {
  return busca.bairro ? `${busca.bairro}, ${busca.cidade}/${busca.uf}` : `${busca.cidade}/${busca.uf}`
}

const NOTA_MINIMA_APIFY: Record<Exclude<NotaMinima, "">, string> = {
  "3": "three",
  "3.5": "threeAndHalf",
  "4": "four",
  "4.5": "fourAndHalf",
}

const SITE_APIFY: Record<FiltroSite, string> = {
  todos: "allPlaces",
  sem_site: "withoutWebsite",
  com_site: "withWebsite",
}

// Input do compass/crawler-google-places. Nenhum add-on pago além dos filtros.
export function montarInputApify(busca: NovaBusca): Record<string, unknown> {
  const input: Record<string, unknown> = {
    searchStringsArray: [busca.nicho],
    locationQuery: montarLocationQuery(busca),
    maxCrawledPlacesPerSearch: busca.maxResultados,
    language: "pt-BR",
    website: SITE_APIFY[busca.filtros.site],
    skipClosedPlaces: busca.filtros.ignorarFechados,
    scrapePlaceDetailPage: false,
    scrapeContacts: false,
    maxReviews: 0,
    maxImages: 0,
  }
  if (busca.filtros.notaMinima !== "") {
    input.placeMinimumStars = NOTA_MINIMA_APIFY[busca.filtros.notaMinima]
  }
  return input
}

// Só os campos que o mapeamento usa — reduz o tráfego ao baixar o dataset.
export const CAMPOS_DATASET_APIFY = [
  "title",
  "placeId",
  "categoryName",
  "city",
  "neighborhood",
  "address",
  "phone",
  "phoneUnformatted",
  "url",
  "website",
  "totalScore",
  "reviewsCount",
  "location",
  // Sinais grátis do perfil (vêm na busca básica, sem add-on)
  "claimThisBusiness",
  "imagesCount",
  "permanentlyClosed",
  "temporarilyClosed",
  // Só vêm com o add-on pago "place detail page"; sem ele ficam ausentes
  "description",
  "openingHours",
] as const

// Colunas "import-controlled" (as mesmas da tela de import) + place_id.
// Etapa, observações, score, temperatura e Instagram nunca vêm do minerador.
export type LeadMinerado = {
  nome: string
  maps_url: string
  place_id: string | null
  categoria: string | null
  cidade: string | null
  bairro: string | null
  endereco: string | null
  telefone: string | null
  tem_site: boolean
  // link cru que o negócio cadastrou (site, Instagram, iFood...)
  site_url: string | null
  instagram_handle: string | null
  google_rating: number | null
  google_avaliacoes_count: number | null
  // null = o Google não informou (não é o mesmo que false)
  perfil_reivindicado: boolean | null
  fotos_count: number | null
  tem_descricao: boolean | null
  tem_horario: boolean | null
  latitude: number | null
  longitude: number | null
}

function texto(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const limpo = raw.trim()
  return limpo === "" ? null : limpo
}

function numero(raw: unknown, min = -Infinity, max = Infinity): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null
  return raw < min || raw > max ? null : raw
}

export function montarOrigem(busca: { nicho: string; uf: string; cidade: string; bairro: string | null }): string {
  return `Minerador: ${busca.nicho} em ${descreverLocal(busca)}`
}

// Converte um item do dataset do Apify num lead. Todas as chaves vêm sempre
// preenchidas (null quando faltar) pra os inserts em lote terem o mesmo formato.
export function mapearLugar(item: unknown): Resultado<LeadMinerado> {
  if (!isRecord(item)) return { ok: false, erro: "item vazio ou inválido" }

  const nome = texto(item.title)
  if (!nome) return { ok: false, erro: "sem nome" }

  const mapsUrl = texto(item.url)
  if (!mapsUrl) return { ok: false, erro: `"${nome}" sem link do Google Maps` }

  // Não dá pra vender pra quem fechou — descarta aqui, de graça, em vez de
  // pagar o filtro "skipClosedPlaces" do Apify.
  if (item.permanentlyClosed === true) return { ok: false, erro: `"${nome}" fechou definitivamente` }
  if (item.temporarilyClosed === true) return { ok: false, erro: `"${nome}" está fechado temporariamente` }

  const location = isRecord(item.location) ? item.location : {}
  const avaliacoes = numero(item.reviewsCount, 0)
  const fotos = numero(item.imagesCount, 0)
  // O scraper sempre informa o link quando existe; ausência também é "sem site".
  const link = classificarLink(texto(item.website))

  return {
    ok: true,
    valor: {
      nome,
      maps_url: mapsUrl,
      place_id: texto(item.placeId),
      categoria: texto(item.categoryName),
      cidade: texto(item.city),
      bairro: texto(item.neighborhood),
      endereco: texto(item.address),
      // formatado primeiro ("(88) 99999-9999"): a lista é pra gente ligar/ler.
      telefone: texto(item.phone) ?? texto(item.phoneUnformatted),
      // Instagram, WhatsApp, link de bio ou iFood no lugar do site = sem site próprio.
      tem_site: link?.tipo === "site",
      site_url: link?.url ?? null,
      instagram_handle: link?.instagramHandle ?? null,
      google_rating: numero(item.totalScore, 0, 5),
      google_avaliacoes_count: avaliacoes === null ? null : Math.round(avaliacoes),
      // claimThisBusiness = o Google mostra "Reivindicar esta empresa"
      perfil_reivindicado:
        typeof item.claimThisBusiness === "boolean" ? !item.claimThisBusiness : null,
      fotos_count: fotos === null ? null : Math.round(fotos),
      // Descrição e horário só chegam com o add-on de página de detalhe. Sem
      // ele os campos vêm ausentes ou null — e isso não prova que o perfil
      // não tem. Só afirmamos o que foi visto.
      tem_descricao: texto(item.description) !== null ? true : null,
      tem_horario: Array.isArray(item.openingHours) && item.openingHours.length > 0 ? true : null,
      latitude: numero(location.lat, -90, 90),
      longitude: numero(location.lng, -180, 180),
    },
  }
}

export type LeadsPreparados = {
  leads: LeadMinerado[]
  ignorados: number
  motivos: string[]
}

// Mapeia o dataset inteiro e remove repetidos (o scraper pode achar o mesmo
// lugar em sub-regiões diferentes da busca). Mantém o primeiro. Identidade do
// lugar: place_id (estável mesmo se o negócio mudar de nome) ou URL do Maps.
export function prepararLeads(itens: unknown[]): LeadsPreparados {
  const vistos = new Set<string>()
  const leads: LeadMinerado[] = []
  const motivos: string[] = []

  for (const item of itens) {
    const resultado = mapearLugar(item)
    if (!resultado.ok) {
      motivos.push(resultado.erro)
      continue
    }
    const chaves = [
      resultado.valor.place_id ? `place:${resultado.valor.place_id}` : null,
      `url:${resultado.valor.maps_url}`,
    ].filter((c): c is string => c !== null)

    if (chaves.some((c) => vistos.has(c))) {
      motivos.push(`"${resultado.valor.nome}" repetido na busca`)
      continue
    }
    chaves.forEach((c) => vistos.add(c))
    leads.push(resultado.valor)
  }

  return { leads, ignorados: motivos.length, motivos }
}
