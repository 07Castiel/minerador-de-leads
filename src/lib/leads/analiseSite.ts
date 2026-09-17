// Análise do site de quem tem site próprio. Tudo puro: quem abre a página é
// src/lib/leads/buscarPagina.ts e quem chama o PageSpeed é
// src/lib/leads/pageSpeed.ts. O que sai daqui vai direto para as colunas
// site_* de leads, e o score (public.calcular_score_lead) usa essas colunas.

import { plataformaDoDominioGratuito } from "@/lib/leads/presencaDigital"
import type { TablesUpdate } from "@/types/database.types"

// Espelha a CHECK constraint de leads.site_status.
export const STATUS_SITE = [
  "ok",
  "fora_do_ar",
  "sem_conteudo",
  "certificado_invalido",
  "nao_e_site",
  "nao_verificado",
] as const

export type StatusSite = (typeof STATUS_SITE)[number]

export const ROTULO_STATUS_SITE: Record<StatusSite, string> = {
  ok: "Abre normalmente",
  fora_do_ar: "Fora do ar",
  sem_conteudo: "Sem conteúdo",
  certificado_invalido: "Alerta de site inseguro",
  nao_e_site: "Não é um site",
  nao_verificado: "Não deu pra verificar",
}

// O que o buscador de páginas devolve (ver buscarPagina.ts).
export type ResultadoDaBusca =
  | {
      tipo: "pagina"
      urlFinal: string
      status: number
      contentType: string
      html: string
      // Cloudflare e afins respondem com uma página de desafio ao robô.
      desafioAntiRobo: boolean
    }
  | { tipo: "redirecionou_para_fora"; urlFinal: string }
  | { tipo: "falha"; codigo: string }

export type MedicaoPageSpeed = { nota: number; carregamentoMs: number | null }

// Resposta de POST /api/leads/:id/analisar-site.
export type RespostaAnaliseDeSite = {
  // nao_se_aplica: o site nem abriu direito, não há o que medir
  velocidade: "medida" | "sem_chave" | "falhou" | "nao_se_aplica"
  avisoVelocidade: string | null
}

export type AtualizacaoDeSite = Required<
  Pick<
    TablesUpdate<"leads">,
    | "site_analisado_em"
    | "site_status"
    | "site_falha"
    | "site_detalhe"
    | "site_url_final"
    | "site_https"
    | "site_responsivo"
    | "site_tem_whatsapp"
    | "site_plataforma"
    | "site_dominio_gratuito"
    | "site_ano_rodape"
    | "site_nota_celular"
    | "site_carregamento_ms"
  >
> & {
  // Todo link analisado é site próprio pelo endereço; só o redirecionamento
  // para rede social muda isso (e uma nova análise pode desfazer).
  tem_site: boolean
}

// Colunas zeradas: usado quando o link muda (análise antiga não vale mais).
export const ANALISE_DE_SITE_VAZIA: Omit<AtualizacaoDeSite, "tem_site"> = {
  site_analisado_em: null,
  site_status: null,
  site_falha: null,
  site_detalhe: null,
  site_url_final: null,
  site_https: null,
  site_responsivo: null,
  site_tem_whatsapp: null,
  site_plataforma: null,
  site_dominio_gratuito: null,
  site_ano_rodape: null,
  site_nota_celular: null,
  site_carregamento_ms: null,
}

// Sem protocolo, começa por http: o próprio site redireciona para https se
// tiver. Começar por https acusaria "fora do ar" quem só não tem certificado.
export function normalizarUrlDoSite(raw: string): string | null {
  const texto = raw.trim()
  if (!texto) return null
  const comProtocolo = /^[a-z][a-z0-9+.-]*:/i.test(texto) ? texto : `http://${texto}`
  try {
    const url = new URL(comProtocolo)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return url.toString()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Falhas de rede

type Classificacao = { status: StatusSite; detalhe: string }

// Domínio que não resolve: a única falha firme o bastante pra virar mensagem.
export const FALHA_DE_DNS = "ENOTFOUND"

const FALHAS: Record<string, Classificacao> = {
  ENOTFOUND: { status: "fora_do_ar", detalhe: "O domínio não existe mais (não foi encontrado)." },
  ECONNREFUSED: { status: "fora_do_ar", detalhe: "O servidor do site recusou a conexão." },
  EHOSTUNREACH: { status: "fora_do_ar", detalhe: "O servidor do site não está acessível." },
  ENETUNREACH: { status: "fora_do_ar", detalhe: "O servidor do site não está acessível." },
  TIMEOUT: { status: "fora_do_ar", detalhe: "O site não respondeu em 15 segundos." },
  MUITOS_REDIRECIONAMENTOS: {
    status: "fora_do_ar",
    detalhe: "O site fica redirecionando em loop e o navegador desiste de abrir.",
  },
  CERT_HAS_EXPIRED: {
    status: "certificado_invalido",
    detalhe: "O certificado de segurança venceu: o navegador mostra um alerta antes de abrir.",
  },
  CERT_NOT_YET_VALID: {
    status: "certificado_invalido",
    detalhe: "O certificado de segurança está com data inválida: o navegador mostra um alerta.",
  },
  ERR_TLS_CERT_ALTNAME_INVALID: {
    status: "certificado_invalido",
    detalhe: "O certificado de segurança é de outro endereço: o navegador mostra um alerta.",
  },
  DEPTH_ZERO_SELF_SIGNED_CERT: {
    status: "certificado_invalido",
    detalhe: "O certificado de segurança não é confiável: o navegador mostra um alerta.",
  },
  SELF_SIGNED_CERT_IN_CHAIN: {
    status: "certificado_invalido",
    detalhe: "O certificado de segurança não é confiável: o navegador mostra um alerta.",
  },
  ENDERECO_BLOQUEADO: {
    status: "nao_verificado",
    detalhe: "O link aponta para um endereço interno, que não é analisado.",
  },
  PORTA_NAO_PERMITIDA: {
    status: "nao_verificado",
    detalhe: "O link usa uma porta fora do padrão, que não é analisada.",
  },
}

export function classificarFalha(codigo: string): Classificacao {
  return (
    FALHAS[codigo] ?? {
      // Conexão cortada, cadeia de certificado incompleta (o navegador costuma
      // completar sozinho) etc.: não prova que o site está com problema.
      status: "nao_verificado",
      detalhe: `Não deu pra abrir o site pelo servidor (${codigo}).`,
    }
  )
}

function classificarStatusHttp(status: number, desafioAntiRobo: boolean): Classificacao | null {
  if (status >= 200 && status < 300) return null
  if (desafioAntiRobo || status === 401 || status === 403 || status === 429) {
    return { status: "nao_verificado", detalhe: "O site bloqueou a verificação automática." }
  }
  if (status === 404 || status === 410) {
    return { status: "fora_do_ar", detalhe: `A página do link não existe mais (erro ${status}).` }
  }
  if (status >= 500) {
    return { status: "fora_do_ar", detalhe: `O site abre com erro no servidor (erro ${status}).` }
  }
  return { status: "nao_verificado", detalhe: `O site respondeu de um jeito inesperado (código ${status}).` }
}

// ---------------------------------------------------------------------------
// Leitura do HTML

function decodificarEntidades(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&copy;/g, "©")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

export function textoVisivel(html: string): string {
  return decodificarEntidades(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim()
}

function tituloDe(html: string): string {
  return decodificarEntidades(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

function metaGenerators(html: string): string[] {
  const valores: string[] = []
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!/name\s*=\s*["']?generator["']?/i.test(tag)) continue
    const conteudo = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1]
    if (conteudo) valores.push(conteudo)
  }
  return valores
}

// Viewport de celular: sem ela, o celular mostra a versão de computador
// miniaturizada. O Wix usa uma viewport própria (width=320) para a versão mobile.
export function temViewportDeCelular(html: string): boolean {
  return (html.match(/<meta\b[^>]*>/gi) ?? []).some(
    (tag) => /name\s*=\s*["']?viewport["']?/i.test(tag) && /width\s*=\s*(device-width|\d+)/i.test(tag)
  )
}

export function temLinkDeWhatsApp(html: string): boolean {
  return /wa\.me\/|api\.whatsapp\.com|web\.whatsapp\.com|whatsapp:\/\/|wa\.link\//i.test(html)
}

// Maior ano de rodapé ("© 2019", "Copyright 2018-2021"). Ignora ano futuro
// (erro de digitação) e ano anterior à própria web comercial.
export function anoDoRodape(html: string, anoAtual: number): number | null {
  const texto = textoVisivel(html)
  let maior: number | null = null
  const padrao = /(?:©|\(c\)|copyright)\s*(?:[^\d©]{0,40}?)((?:19|20)\d{2})(?:\s*[-–/]\s*((?:19|20)\d{2}))?/gi
  for (const m of texto.matchAll(padrao)) {
    const ano = Number(m[2] ?? m[1])
    if (ano < 1995 || ano > anoAtual) continue
    if (maior === null || ano > maior) maior = ano
  }
  return maior
}

const PLATAFORMAS_POR_GENERATOR: [RegExp, string][] = [
  [/wix\.com/i, "Wix"],
  [/hostinger/i, "Hostinger"],
  [/wordpress/i, "WordPress"],
  [/webnode/i, "Webnode"],
  [/site123/i, "SITE123"],
  [/squarespace/i, "Squarespace"],
  [/godaddy/i, "GoDaddy"],
  [/webflow/i, "Webflow"],
  [/framer/i, "Framer"],
  [/joomla/i, "Joomla"],
  [/drupal/i, "Drupal"],
  [/weebly/i, "Weebly"],
  [/jimdo/i, "Jimdo"],
]

// Assinaturas fortes no HTML, para quando não há meta generator.
const PLATAFORMAS_POR_ASSINATURA: [RegExp, string][] = [
  [/static\.wixstatic\.com|static\.parastorage\.com/i, "Wix"],
  [/zyrosite\.com/i, "Hostinger"],
  [/\/wp-content\/|\/wp-includes\//i, "WordPress"],
  [/static1\.squarespace\.com/i, "Squarespace"],
  [/cdn\.shopify\.com/i, "Shopify"],
  [/img1\.wsimg\.com/i, "GoDaddy"],
  [/framerusercontent\.com/i, "Framer"],
  [/assets\.website-files\.com|cdn\.prod\.website-files\.com/i, "Webflow"],
  [/d26lpennugtm8s\.cloudfront\.net|nuvemshop/i, "Nuvemshop"],
]

export function detectarPlataforma(html: string, urlFinal: string): string | null {
  const doDominio = plataformaDoDominioGratuito(urlFinal)
  if (doDominio) return doDominio
  const generators = metaGenerators(html)
  for (const [padrao, nome] of PLATAFORMAS_POR_GENERATOR) {
    if (generators.some((g) => padrao.test(g))) return nome
  }
  for (const [padrao, nome] of PLATAFORMAS_POR_ASSINATURA) {
    if (padrao.test(html)) return nome
  }
  return null
}

const SEM_CONTEUDO: [RegExp, string][] = [
  [
    /(domain|dom[ií]nio)[^.]{0,40}(for sale|[àa] venda)|buy this domain|compre este dom[ií]nio|parked (domain|free)/i,
    "O domínio está à venda ou estacionado, sem site.",
  ],
  [
    /account (has been )?suspended|conta (foi )?suspensa|site suspenso|hospedagem suspensa/i,
    "A hospedagem do site está suspensa.",
  ],
  [
    /under construction|em constru[çc][ãa]o|coming soon|site em manuten[çc][ãa]o|em breve no ar/i,
    "O site mostra só uma página de \"em construção\".",
  ],
  [
    /index of \/|welcome to nginx|apache2? [\w ]*default page|default web site page|web server's default page|it works!|future home of something quite cool|this domain has been registered|este dom[ií]nio (foi|est[aá]) registrado/i,
    "O endereço mostra só a página padrão da hospedagem, sem o site.",
  ],
  [/^(hello world|ol[áa],? mundo)!?\b/i, "O site é uma instalação vazia do WordPress."],
]

// Página de "à venda", suspensa, em construção ou padrão da hospedagem. Olha só
// título, h1 e páginas pequenas: "em construção" no meio de um site de verdade
// (uma construtora, por exemplo) não conta.
export function detectarSemConteudo(html: string): string | null {
  const titulo = tituloDe(html)
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => textoVisivel(m[1]))
  const texto = textoVisivel(html)
  const alvos = [titulo, ...h1s]
  if (texto.length < 600) alvos.push(texto)
  for (const [padrao, detalhe] of SEM_CONTEUDO) {
    if (alvos.some((alvo) => padrao.test(alvo))) return detalhe
  }
  return null
}

// ---------------------------------------------------------------------------
// PageSpeed Insights

type RespostaPageSpeed = {
  lighthouseResult?: {
    runtimeError?: { code?: string }
    categories?: { performance?: { score?: number | null } }
    audits?: Record<string, { numericValue?: number } | undefined>
  }
}

export function lerPageSpeed(json: unknown): MedicaoPageSpeed | null {
  const resultado = (json as RespostaPageSpeed | null)?.lighthouseResult
  if (!resultado || (resultado.runtimeError?.code && resultado.runtimeError.code !== "NO_ERROR")) return null
  const score = resultado.categories?.performance?.score
  if (typeof score !== "number") return null
  const lcp = resultado.audits?.["largest-contentful-paint"]?.numericValue
  return {
    nota: Math.max(0, Math.min(100, Math.round(score * 100))),
    carregamentoMs: typeof lcp === "number" && lcp >= 0 ? Math.round(lcp) : null,
  }
}

// ---------------------------------------------------------------------------
// Resultado final

type EntradaDaAnalise = {
  busca: ResultadoDaBusca
  pageSpeed: MedicaoPageSpeed | null
  agora: Date
}

export function analisarSite({ busca, pageSpeed, agora }: EntradaDaAnalise): AtualizacaoDeSite {
  const base: AtualizacaoDeSite = {
    ...ANALISE_DE_SITE_VAZIA,
    site_analisado_em: agora.toISOString(),
    tem_site: true,
  }

  if (busca.tipo === "falha") {
    const { status, detalhe } = classificarFalha(busca.codigo)
    // O código fica guardado: "fora do ar" junta domínio inexistente (firme) com
    // tempo esgotado e erro de servidor (podem ser passageiros).
    return { ...base, site_status: status, site_falha: busca.codigo, site_detalhe: detalhe }
  }

  if (busca.tipo === "redirecionou_para_fora") {
    // O link do Google leva para rede social/WhatsApp: é lead "sem site".
    return {
      ...base,
      site_status: "nao_e_site",
      site_detalhe: "O link do site redireciona para uma rede social ou WhatsApp.",
      site_url_final: busca.urlFinal,
      tem_site: false,
    }
  }

  const doStatus = classificarStatusHttp(busca.status, busca.desafioAntiRobo)
  if (doStatus) {
    return { ...base, site_status: doStatus.status, site_detalhe: doStatus.detalhe, site_url_final: busca.urlFinal }
  }

  if (!/html|xml/i.test(busca.contentType) && !/<html|<body|<head/i.test(busca.html)) {
    return {
      ...base,
      site_status: "nao_verificado",
      site_detalhe: "O link não abre uma página (é um arquivo ou outro tipo de conteúdo).",
      site_url_final: busca.urlFinal,
    }
  }

  const https = busca.urlFinal.toLowerCase().startsWith("https:")
  const semConteudo = detectarSemConteudo(busca.html)
  if (semConteudo) {
    return {
      ...base,
      site_status: "sem_conteudo",
      site_detalhe: semConteudo,
      site_url_final: busca.urlFinal,
      site_https: https,
    }
  }

  const plataforma = detectarPlataforma(busca.html, busca.urlFinal)
  return {
    ...base,
    site_status: "ok",
    site_url_final: busca.urlFinal,
    site_https: https,
    site_responsivo: temViewportDeCelular(busca.html),
    site_tem_whatsapp: temLinkDeWhatsApp(busca.html),
    site_plataforma: plataforma,
    site_dominio_gratuito: plataformaDoDominioGratuito(busca.urlFinal) !== null,
    site_ano_rodape: anoDoRodape(busca.html, agora.getUTCFullYear()),
    site_nota_celular: pageSpeed?.nota ?? null,
    site_carregamento_ms: pageSpeed?.carregamentoMs ?? null,
  }
}

// Mesma regra do score: rodapé com ano de 3+ anos antes da análise.
export const ANOS_PARA_RODAPE_ANTIGO = 3

export function rodapeAntigo(ano: number | null, analisadoEm: string | null): boolean {
  if (ano === null || !analisadoEm) return false
  return ano <= new Date(analisadoEm).getUTCFullYear() - ANOS_PARA_RODAPE_ANTIGO
}
