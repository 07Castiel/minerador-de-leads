// Classifica o link que o negócio cadastrou como "site" no Google Maps.
// Muita gente põe ali o Instagram, o WhatsApp, um link de bio ou a página do
// iFood — para quem vende site, esses negócios continuam SEM site próprio.

export type TipoDeLink = "site" | "rede_social" | "plataforma" | "site_desativado"

export type LinkClassificado = {
  tipo: TipoDeLink
  url: string
  // @ do Instagram quando o link é um perfil (sem "@", minúsculo)
  instagramHandle: string | null
}

const INSTAGRAM = ["instagram.com", "instagr.am"]

const WHATSAPP = ["wa.me", "wa.link", "whatsapp.com"]

// "Link na bio": juntam vários links numa página, mas não são um site.
const PAGINAS_DE_LINKS = [
  "linktr.ee",
  "linkin.bio",
  "bio.link",
  "beacons.ai",
  "taplink.cc",
  "lnk.bio",
  "campsite.bio",
  "linklist.bio",
  "linkbio.co",
  "msha.ke",
  "solo.to",
]

const REDES_SOCIAIS = [
  ...INSTAGRAM,
  "facebook.com",
  "fb.com",
  "fb.me",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "twitter.com",
  "x.com",
  "linkedin.com",
  ...WHATSAPP,
  ...PAGINAS_DE_LINKS,
]

// Páginas de terceiros (delivery, agendamento, diretórios): o negócio aparece
// lá, mas não tem um site dele.
// Ao mudar esta lista ou a de redes sociais, reclassifique os leads que já
// existem numa migration (ver 20260917120100_analise_de_site.sql).
const PLATAFORMAS = [
  "ifood.com.br",
  "anota.ai",
  "goomer.app",
  "booksy.com",
  "trinks.com",
  "doctoralia.com.br",
  "sympla.com.br",
  "jusbrasil.com.br",
  "jusfy.com.br",
  "zapier.app",
]

// Sites gratuitos do Perfil da Empresa no Google: desativados em 2024.
const SITES_DESATIVADOS = ["business.site", "negocio.site"]

// Site próprio, mas no endereço gratuito do construtor (sem domínio próprio).
const DOMINIOS_GRATUITOS: [dominio: string, plataforma: string][] = [
  ["sites.google.com", "Google Sites"],
  ["wixsite.com", "Wix"],
  ["wordpress.com", "WordPress.com"],
  ["blogspot.com", "Blogger"],
  ["webnode.page", "Webnode"],
  ["webnode.com.br", "Webnode"],
  ["site123.me", "SITE123"],
  ["weebly.com", "Weebly"],
  ["godaddysites.com", "GoDaddy"],
  ["zyrosite.com", "Hostinger"],
  ["jimdosite.com", "Jimdo"],
  ["mystrikingly.com", "Strikingly"],
  ["squarespace.com", "Squarespace"],
  ["webflow.io", "Webflow"],
  ["framer.website", "Framer"],
  ["carrd.co", "Carrd"],
  ["lovable.app", "Lovable"],
  ["netlify.app", "Netlify"],
  ["vercel.app", "Vercel"],
  ["github.io", "GitHub Pages"],
]

// Primeiros segmentos de caminho do Instagram que não são perfis.
const CAMINHOS_INSTAGRAM_RESERVADOS = new Set(["p", "reel", "reels", "stories", "explore", "accounts", "tv"])

export function hostDe(url: string): string | null {
  try {
    const comProtocolo = /^https?:\/\//i.test(url) ? url : `https://${url}`
    return new URL(comProtocolo).hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    return null
  }
}

export function pertenceA(host: string, dominios: readonly string[]): boolean {
  return dominios.some((d) => host === d || host.endsWith(`.${d}`))
}

function handleDoInstagram(url: string, host: string): string | null {
  if (host !== "instagram.com" && host !== "instagr.am" && !host.endsWith(".instagram.com")) {
    return null
  }
  try {
    const comProtocolo = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const primeiro = new URL(comProtocolo).pathname.split("/").filter(Boolean)[0]?.toLowerCase()
    if (!primeiro || CAMINHOS_INSTAGRAM_RESERVADOS.has(primeiro)) return null
    return /^[a-z0-9._]{1,30}$/.test(primeiro) ? primeiro : null
  } catch {
    return null
  }
}

// null = nenhum link cadastrado.
export function classificarLink(raw: string | null | undefined): LinkClassificado | null {
  const url = raw?.trim()
  if (!url) return null

  const host = hostDe(url)
  // Texto que nem é URL: registra como site (melhor do que acusar "sem site" à toa).
  if (!host) return { tipo: "site", url, instagramHandle: null }

  if (pertenceA(host, SITES_DESATIVADOS)) return { tipo: "site_desativado", url, instagramHandle: null }
  if (pertenceA(host, PLATAFORMAS)) return { tipo: "plataforma", url, instagramHandle: null }
  if (pertenceA(host, REDES_SOCIAIS)) {
    return { tipo: "rede_social", url, instagramHandle: handleDoInstagram(url, host) }
  }
  return { tipo: "site", url, instagramHandle: null }
}

// Sem link cadastrado também é "sem site": o Google mostraria se houvesse.
export function temSiteProprio(raw: string | null | undefined): boolean {
  return classificarLink(raw)?.tipo === "site"
}

function linkDe(raw: string | null | undefined, dominios: readonly string[]): boolean {
  const host = raw ? hostDe(raw.trim()) : null
  return host !== null && pertenceA(host, dominios)
}

export function ehLinkDeWhatsApp(raw: string | null | undefined): boolean {
  return linkDe(raw, WHATSAPP)
}

export function ehLinkDoInstagram(raw: string | null | undefined): boolean {
  return linkDe(raw, INSTAGRAM)
}

export function ehPaginaDeLinks(raw: string | null | undefined): boolean {
  return linkDe(raw, PAGINAS_DE_LINKS)
}

// Nome do construtor quando o site está no endereço gratuito dele; senão null.
export function plataformaDoDominioGratuito(raw: string | null | undefined): string | null {
  const host = raw ? hostDe(raw.trim()) : null
  if (!host) return null
  return DOMINIOS_GRATUITOS.find(([dominio]) => pertenceA(host, [dominio]))?.[1] ?? null
}

export const ROTULO_TIPO_DE_LINK: Record<TipoDeLink, string> = {
  site: "Site próprio",
  rede_social: "Só rede social",
  plataforma: "Só página em plataforma",
  site_desativado: "Site do Google desativado",
}
