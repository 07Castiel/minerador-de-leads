// Modelos de mensagem de WhatsApp (tabela modelos_mensagem): texto com
// variáveis como {nome} e {gancho}, preenchido com os dados do lead no
// navegador. Sem IA e sem custo.

import { periodoDoDia } from "@/lib/leads/mensagemWhatsApp"
import { MINIMO_AVALIACOES_CONFIAVEIS } from "@/lib/leads/motivos"
import { classificarLink, ehLinkDeWhatsApp } from "@/lib/leads/presencaDigital"
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
  | "site_https"
  | "site_responsivo"
  | "site_nota_celular"
  | "site_dominio_gratuito"
  | "instagram_handle"
  | "perfil_reivindicado"
  | "google_rating"
  | "google_avaliacoes_count"
>

const PALAVRAS_MINUSCULAS = new Set(["a", "as", "o", "os", "da", "das", "de", "do", "dos", "e", "em"])

// "Garcia, Lima & Becco Advogados - Advogado Fortaleza" → "Garcia, Lima & Becco Advogados".
// Nome todo em maiúsculas vira "Advogado das Famílias".
export function nomeCurto(nome: string): string {
  const semSimbolos = nome.replace(/^[^\p{L}\p{N}]+/u, "").trim()
  const primeiraParte = semSimbolos.split(/\s+[-–—|]\s+|\s*\|\s*/)[0]?.trim() ?? ""
  const base = primeiraParte.length >= 3 ? primeiraParte : semSimbolos || nome.trim()

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

// Frase que continua "Encontrei vocês no Google e ...". Segue a ordem do score:
// o que mais pesa é o que abre a conversa.
export function ganchoDoLead(lead: CamposDoModelo): string {
  if (lead.tem_site === false) {
    const link = classificarLink(
      lead.site_status === "nao_e_site" && lead.site_url_final ? lead.site_url_final : lead.site_url
    )
    if (!link || link.tipo === "site") return "vi que ainda não têm um site"
    if (ehLinkDeWhatsApp(link.url)) return "vi que o link do perfil abre direto o WhatsApp, sem um site"
    if (link.tipo === "rede_social") {
      return link.instagramHandle || lead.instagram_handle
        ? "vi que o link do perfil leva direto pro Instagram"
        : "vi que o link do perfil leva pra uma rede social, não pra um site"
    }
    if (link.tipo === "plataforma") {
      return "vi que o link do perfil leva pra uma página de outra plataforma, não pra um site de vocês"
    }
    return "vi que o site que aparece no perfil já saiu do ar"
  }

  if (lead.tem_site === true) {
    switch (lead.site_status) {
      case "fora_do_ar":
        return "tentei abrir o site de vocês e ele não carregou"
      case "sem_conteudo":
        return "tentei abrir o site de vocês e a página está sem conteúdo"
      case "certificado_invalido":
        return "fui abrir o site de vocês e o navegador deu um aviso de site inseguro"
      case "ok":
        if (lead.site_nota_celular !== null && lead.site_nota_celular < 50) {
          return "vi que o site de vocês demora pra abrir no celular"
        }
        if (lead.site_responsivo === false) return "vi que o site de vocês não se ajusta direito no celular"
        if (lead.site_https === false) return 'vi que o site de vocês aparece como "não seguro" no navegador'
        if (lead.site_dominio_gratuito) return "vi que o site de vocês ainda está num endereço gratuito"
    }
  }

  if (lead.perfil_reivindicado === false) return "vi que o perfil ainda não foi assumido pelo dono"
  return "fiquei curioso pra saber como vocês recebem clientes pela internet hoje"
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
