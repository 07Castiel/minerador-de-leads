// Modelos de mensagem de WhatsApp (tabela modelos_mensagem): texto com
// variáveis como {nome} e {gancho}, preenchido com os dados do lead no
// navegador. Sem IA e sem custo.

import { LIMITES } from "@/lib/leads/abordagemConfig"
import { FALHA_DE_DNS } from "@/lib/leads/analiseSite"
import { periodoDoDia } from "@/lib/leads/mensagemWhatsApp"
import { MINIMO_AVALIACOES_CONFIAVEIS } from "@/lib/leads/motivos"
import {
  classificarLink,
  ehLinkDeWhatsApp,
  ehLinkDoInstagram,
  ehPaginaDeLinks,
  type LinkClassificado,
} from "@/lib/leads/presencaDigital"
import type { Lead } from "@/types/lead"

export const VARIAVEIS_DO_MODELO = [
  { chave: "saudacao", descricao: "Bom dia, Boa tarde ou Boa noite, pela hora do envio" },
  { chave: "nome", descricao: "Nome do negócio, sem o que vem depois de \" - \" ou \"|\"" },
  {
    chave: "gancho",
    descricao: "O motivo do contato, pelo ponto mais fraco do lead (ex.: vi que ainda não têm um site)",
  },
  { chave: "categoria", descricao: "Categoria no Google, em minúsculas" },
  { chave: "bairro", descricao: "Bairro" },
  { chave: "cidade", descricao: "Cidade" },
  { chave: "nota", descricao: "Nota no Google (só com 5 ou mais avaliações)" },
  { chave: "avaliacoes", descricao: "Quantidade de avaliações no Google" },
] as const

export type VariavelDoModelo = (typeof VARIAVEIS_DO_MODELO)[number]["chave"]

export const TAMANHO_MAXIMO_MODELO = 2000

export type CamposDoModelo = Pick<
  Lead,
  | "nome"
  | "categoria"
  | "bairro"
  | "cidade"
  | "tem_site"
  | "site_url"
  | "site_url_final"
  | "site_status"
  | "site_falha"
  | "site_analisado_em"
  | "site_https"
  | "site_responsivo"
  | "site_nota_celular"
  | "site_dominio_gratuito"
  | "site_plataforma"
  | "instagram_handle"
  | "perfil_reivindicado"
  | "fotos_count"
  | "google_rating"
  | "google_avaliacoes_count"
>

const PALAVRAS_MINUSCULAS = new Set(["a", "as", "o", "os", "da", "das", "de", "do", "dos", "e", "em"])

// Onde começa a descrição do serviço dentro do nome: corta a partir daí.
const INICIOS_DE_DESCRICAO = [
  "escritorio de advocacia",
  "advogado criminalista",
  "advogada criminalista",
  "sociedade individual de advocacia",
  "advogados associados",
].map((trecho) => trecho.split(" "))

function semAcentoMinusculo(palavra: string): string {
  return palavra.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR")
}

const temMinuscula = (palavra: string) => /\p{Ll}/u.test(palavra)
const ehMaiuscula = (palavra: string) => /\p{Lu}/u.test(palavra) && !temMinuscula(palavra)
const quantosTermos = (texto: string) => texto.split(" ").filter((p) => /[\p{L}\p{N}]/u.test(p)).length

// "Garcia, Lima & Becco Advogados - Advogado Fortaleza" → "Garcia, Lima & Becco Advogados".
// "Lomonaco & Gomes Escritorio de Advocacia em Fortaleza" → "Lomonaco & Gomes".
// "Oséas Rodrigues & Nogueira ADVOGADO CRIMINALISTA" → "Oséas Rodrigues & Nogueira".
// Nome todo em maiúsculas vira "Advogado das Famílias". Se o corte deixar menos
// de dois termos ("Mendes Advogados Associados"), fica o nome inteiro.
export function nomeCurto(nome: string): string {
  const original = nome
    .normalize("NFC")
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/\s+/g, " ")
    .trim()

  const trecho = (original.split(/\s+[-–—|]\s+|\s*\|\s*|:\s+/)[0] ?? "").trim()
  // Lista de serviços depois do nome ("Barbearia, Barbeiro, Hidratação"). Só
  // corta se o que vem antes da vírgula já identifica o negócio: em
  // "Garcia, Lima & Becco Advogados" sobraria "Garcia".
  const antesDaVirgula = (trecho.split(",")[0] ?? "").trim()
  let palavras = (quantosTermos(antesDaVirgula) >= 2 ? antesDaVirgula : trecho).split(" ").filter(Boolean)

  const normais = palavras.map(semAcentoMinusculo)
  const inicioDaDescricao = normais.findIndex((_, i) =>
    INICIOS_DE_DESCRICAO.some((trecho) => trecho.every((parte, k) => normais[i + k] === parte))
  )
  if (inicioDaDescricao >= 0) palavras = palavras.slice(0, inicioDaDescricao)

  // Trecho em CAIXA ALTA no fim, depois de nome em caixa normal. Nome todo em
  // maiúsculas ("LUIZ CARLOS SILVA ADVOCACIA") não tem de onde cortar.
  let fim = palavras.length
  while (fim > 0 && !temMinuscula(palavras[fim - 1])) fim--
  if (fim > 0 && palavras.slice(fim).some(ehMaiuscula)) palavras = palavras.slice(0, fim)

  const curto = palavras.join(" ").replace(/[\s,;:&–—-]+$/u, "")
  const base = quantosTermos(curto) >= 2 ? curto : original

  const tudoMaiusculo = base === base.toLocaleUpperCase("pt-BR") && /\p{L}{4,}/u.test(base)
  if (!tudoMaiusculo) return base
  return base
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((palavra, i) =>
      i > 0 && PALAVRAS_MINUSCULAS.has(palavra) ? palavra : palavra.charAt(0).toLocaleUpperCase("pt-BR") + palavra.slice(1)
    )
    .join(" ")
}

export type DestinoDoLink = "instagram" | "whatsapp" | "pagina_de_links" | "rede_social" | "plataforma"

// Tudo o que dá pra apontar no lead. Fonte única do gancho: os modelos salvos
// ({gancho}) e a abordagem (src/lib/leads/abordagem.ts) leem daqui.
export type LacunaDoLead =
  | { id: "sem_site" }
  | { id: "link_fora_do_site"; destino: DestinoDoLink; url: string }
  | { id: "site_desativado" }
  | { id: "site_fora_do_ar" }
  // Domínio que não resolve no DNS: separado do resto do "fora do ar", que pode
  // ser passageiro (tempo esgotado, erro de servidor, 404 do link).
  | { id: "site_dominio_inexistente" }
  | { id: "site_sem_conteudo" }
  | { id: "site_certificado_invalido" }
  | { id: "site_lento_no_celular" }
  | { id: "site_nao_responsivo" }
  | { id: "site_sem_https" }
  | { id: "site_dominio_gratuito"; plataforma: string | null }
  | { id: "perfil_sem_dono" }
  | { id: "poucas_fotos"; fotos: number }
  | { id: "pouca_avaliacao"; avaliacoes: number }

function destinoDoLink(link: LinkClassificado): DestinoDoLink {
  if (ehLinkDeWhatsApp(link.url)) return "whatsapp"
  if (link.tipo === "plataforma") return "plataforma"
  if (ehLinkDoInstagram(link.url)) return "instagram"
  if (ehPaginaDeLinks(link.url)) return "pagina_de_links"
  return "rede_social"
}

// Na ordem do score: o que mais pesa vem primeiro. Só afirma o que foi visto
// (campo null não vira lacuna).
export function lacunasDoLead(lead: CamposDoModelo): LacunaDoLead[] {
  const lacunas: LacunaDoLead[] = []

  if (lead.tem_site === false) {
    const link = classificarLink(
      lead.site_status === "nao_e_site" && lead.site_url_final ? lead.site_url_final : lead.site_url
    )
    if (!link || link.tipo === "site") lacunas.push({ id: "sem_site" })
    else if (link.tipo === "site_desativado") lacunas.push({ id: "site_desativado" })
    else lacunas.push({ id: "link_fora_do_site", destino: destinoDoLink(link), url: link.url })
  }

  if (lead.tem_site === true) {
    switch (lead.site_status) {
      case "fora_do_ar":
        lacunas.push(lead.site_falha === FALHA_DE_DNS ? { id: "site_dominio_inexistente" } : { id: "site_fora_do_ar" })
        break
      case "sem_conteudo":
        lacunas.push({ id: "site_sem_conteudo" })
        break
      case "certificado_invalido":
        lacunas.push({ id: "site_certificado_invalido" })
        break
      case "ok":
        if (lead.site_nota_celular !== null && lead.site_nota_celular < 50) lacunas.push({ id: "site_lento_no_celular" })
        if (lead.site_responsivo === false) lacunas.push({ id: "site_nao_responsivo" })
        if (lead.site_https === false) lacunas.push({ id: "site_sem_https" })
        if (lead.site_dominio_gratuito) {
          lacunas.push({ id: "site_dominio_gratuito", plataforma: lead.site_plataforma })
        }
    }
  }

  if (lead.perfil_reivindicado === false) lacunas.push({ id: "perfil_sem_dono" })
  if (lead.fotos_count !== null && lead.fotos_count < LIMITES.fotosMinimas) {
    lacunas.push({ id: "poucas_fotos", fotos: lead.fotos_count })
  }
  if (lead.google_avaliacoes_count !== null && lead.google_avaliacoes_count <= LIMITES.avaliacoesPoucas) {
    lacunas.push({ id: "pouca_avaliacao", avaliacoes: lead.google_avaliacoes_count })
  }

  return lacunas
}

const FRASES_DO_LINK: Record<DestinoDoLink, string> = {
  instagram: "vi que o link do perfil leva direto pro Instagram",
  whatsapp: "vi que o link do perfil abre direto o WhatsApp, sem um site",
  pagina_de_links: "vi que o link do perfil leva pra uma página de links, não pra um site",
  rede_social: "vi que o link do perfil leva pra uma rede social, não pra um site",
  plataforma: "vi que o link do perfil leva pra uma página de outra plataforma, não pra um site de vocês",
}

function fraseDoGancho(lacuna: LacunaDoLead): string {
  switch (lacuna.id) {
    case "sem_site":
      return "vi que ainda não têm um site"
    case "link_fora_do_site":
      return FRASES_DO_LINK[lacuna.destino]
    case "site_desativado":
      return "vi que o site que aparece no perfil já saiu do ar"
    case "site_dominio_inexistente":
      return "vi que o endereço do site de vocês não existe mais"
    case "site_fora_do_ar":
      return "tentei abrir o site de vocês e ele não carregou"
    case "site_sem_conteudo":
      return "tentei abrir o site de vocês e a página está sem conteúdo"
    case "site_certificado_invalido":
      return "fui abrir o site de vocês e o navegador deu um aviso de site inseguro"
    case "site_lento_no_celular":
      return "vi que o site de vocês demora pra abrir no celular"
    case "site_nao_responsivo":
      return "vi que o site de vocês não se ajusta direito no celular"
    case "site_sem_https":
      return 'vi que o site de vocês aparece como "não seguro" no navegador'
    case "site_dominio_gratuito":
      return "vi que o site de vocês ainda está num endereço gratuito"
    case "perfil_sem_dono":
      return "vi que o perfil ainda não foi assumido pelo dono"
    case "poucas_fotos":
      return "vi que o perfil de vocês tem poucas fotos"
    case "pouca_avaliacao":
      return "vi que o perfil de vocês ainda tem poucas avaliações"
  }
}

// Frase que continua "Encontrei vocês no Google e ...", pela primeira lacuna do lead.
export function ganchoDoLead(lead: CamposDoModelo): string {
  const [primeira] = lacunasDoLead(lead)
  return primeira ? fraseDoGancho(primeira) : "fiquei curioso pra saber como vocês recebem clientes pela internet hoje"
}

const SAUDACOES = { manhã: "Bom dia", tarde: "Boa tarde", noite: "Boa noite" } as const
const nota = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const inteiro = new Intl.NumberFormat("pt-BR")

export function valoresDoModelo(lead: CamposDoModelo, agora: Date): Record<VariavelDoModelo, string | null> {
  const avaliacoes = lead.google_avaliacoes_count
  return {
    saudacao: SAUDACOES[periodoDoDia(agora)],
    nome: nomeCurto(lead.nome),
    gancho: ganchoDoLead(lead),
    categoria: lead.categoria?.toLocaleLowerCase("pt-BR") ?? null,
    bairro: lead.bairro,
    cidade: lead.cidade,
    nota:
      lead.google_rating !== null && (avaliacoes ?? 0) >= MINIMO_AVALIACOES_CONFIAVEIS
        ? nota.format(lead.google_rating)
        : null,
    avaliacoes: avaliacoes !== null && avaliacoes > 0 ? inteiro.format(avaliacoes) : null,
  }
}

export type ModeloPreenchido = {
  texto: string
  // Variáveis do modelo sem dado neste lead (ficaram em branco)
  semDado: VariavelDoModelo[]
  // {algo} que não é variável: fica no texto como está
  desconhecidas: string[]
}

// Tira espaço duplicado e espaço antes de pontuação que sobram quando uma
// variável fica em branco.
function arrumarEspacos(texto: string): string {
  return texto
    .split("\n")
    .map((linha) => linha.replace(/[ \t]{2,}/g, " ").replace(/ +([,.!?;:])/g, "$1").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function preencherModelo(
  modelo: string,
  valores: Record<VariavelDoModelo, string | null>
): ModeloPreenchido {
  const semDado = new Set<VariavelDoModelo>()
  const desconhecidas = new Set<string>()

  const texto = modelo.replace(/\{\s*([\p{L}_]+)\s*\}/gu, (original, nomeDaVariavel: string) => {
    const chave = nomeDaVariavel.toLowerCase()
    if (!Object.hasOwn(valores, chave)) {
      desconhecidas.add(nomeDaVariavel)
      return original
    }
    const valor = valores[chave as VariavelDoModelo]
    if (valor === null || valor.trim() === "") {
      semDado.add(chave as VariavelDoModelo)
      return ""
    }
    return valor
  })

  return { texto: arrumarEspacos(texto), semDado: [...semDado], desconhecidas: [...desconhecidas] }
}
