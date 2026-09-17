// Primeira abordagem por WhatsApp em três camadas:
// 1. código escolhe lacuna, nicho, saudação e pergunta (prepararAbordagem);
// 2. o Gemini só redige com esses dados (recebido como função: aqui não há API);
// 3. código valida o texto e, se o Gemini não passar, usa a mensagem fixa.
// Textos e limites: src/lib/leads/config/.

import {
  ANCORA_PADRAO,
  CATEGORIAS_GENERICAS,
  FUSO_DA_ABORDAGEM,
  LACUNAS_DA_ABORDAGEM,
  LACUNAS_SO_DE_COMERCIO,
  LIMITES,
  MENSAGEM_FIXA,
  NICHOS,
  NICHO_PADRAO,
  NOMES_DE_DESTINO,
  SAUDACOES,
  TERMOS_DE_ELOGIO,
  TERMOS_DE_OFERTA,
  TEXTOS_DAS_LACUNAS,
  type LacunaDaAbordagem,
  type NichoDaAbordagem,
} from "@/lib/leads/abordagemConfig"
import { lacunasDoLead, nomeCurto, type CamposDoModelo, type LacunaDoLead } from "@/lib/leads/modelosMensagem"
import { pessoaDoNome } from "@/lib/leads/pessoaDoNome"
import { hostDe, pertenceA } from "@/lib/leads/presencaDigital"

export type CamposDaAbordagem = CamposDoModelo

type LacunaDaAbordagemDoLead = Extract<LacunaDoLead, { id: LacunaDaAbordagem }>

export type DadosDaAbordagem = {
  lacuna: LacunaDaAbordagem
  nicho: string
  saudacao: string
  negocio: string
  // Pessoa no nome do negócio ("Luiz Carlos"), quando dá pra afirmar
  pessoa: string | null
  // "Procurei o escritório de Luiz Carlos no Google e achei"
  ancora: string
  // Nome que a mensagem tem que citar: a pessoa, se a âncora usa, senão o negócio
  referencia: string
  tratamento: "você" | "vocês"
  // A observação inteira, já com {N} e {DESTINO} trocados: "não tem site, só o telefone"
  textoDaLacuna: string
  pergunta: string
}

export type PreparoDaAbordagem =
  | { tipo: "fora_do_horario" }
  | { tipo: "manual"; motivo: "sem_lacuna"; nicho: string }
  | { tipo: "pronta"; dados: DadosDaAbordagem }

// Sem acento, minúsculas, espaços simples.
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim()
}

function preencher(texto: string, valores: Record<string, string>): string {
  return texto.replace(/\{([A-Z_]+)\}/g, (original, chave: string) => valores[chave] ?? original)
}

function nichoPelosTermos(texto: string | null | undefined): NichoDaAbordagem | undefined {
  if (!texto?.trim()) return undefined
  const alvo = normalizar(texto)
  return NICHOS.find((nicho) => nicho.termos.some((termo) => alvo.includes(termo)))
}

// 1. categoria do Google no mapa; 2. termo da busca, só se a categoria não diz o
// ramo; 3. padrão. Categoria específica fora do mapa nunca é trocada pela busca.
export function resolverNicho(categoria: string | null, termoDaBusca?: string | null): NichoDaAbordagem {
  const pelaCategoria = nichoPelosTermos(categoria)
  if (pelaCategoria) return pelaCategoria
  const categoriaGenerica = !categoria?.trim() || CATEGORIAS_GENERICAS.includes(normalizar(categoria))
  return (categoriaGenerica ? nichoPelosTermos(termoDaBusca) : undefined) ?? NICHO_PADRAO
}

function minutosDoDia(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

// null = fora do horário de abordagem.
export function saudacaoDoHorario(agora: Date): string | null {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: FUSO_DA_ABORDAGEM,
  }).formatToParts(agora)
  const hora = Number(partes.find((p) => p.type === "hour")?.value)
  const minuto = Number(partes.find((p) => p.type === "minute")?.value)
  const agoraEmMinutos = hora * 60 + minuto
  const faixa = SAUDACOES.find((s) => agoraEmMinutos >= minutosDoDia(s.de) && agoraEmMinutos < minutosDoDia(s.ate))
  return faixa?.texto ?? null
}

function ehDaAbordagem(lacuna: LacunaDoLead): lacuna is LacunaDaAbordagemDoLead {
  return (LACUNAS_DA_ABORDAGEM as readonly string[]).includes(lacuna.id)
}

// Lacunas da abordagem que o lead tem, na precedência do config. Fora de
// comércio, poucas fotos e pouca avaliação não contam.
export function lacunasDaAbordagem(lead: CamposDaAbordagem, nicho: NichoDaAbordagem): LacunaDaAbordagemDoLead[] {
  const permitida = (id: LacunaDaAbordagem) => nicho.comercio || !LACUNAS_SO_DE_COMERCIO.includes(id)
  const doLead = lacunasDoLead(lead).filter(ehDaAbordagem)
  return LACUNAS_DA_ABORDAGEM.filter(permitida).flatMap((id) => doLead.filter((l) => l.id === id))
}

// ultimasLacunas: das mensagens abertas no WhatsApp mais recentes, a mais nova primeiro.
// Se as últimas N usaram a mesma lacuna que seria escolhida, vai a próxima do lead.
export function escolherLacuna<T extends { id: LacunaDaAbordagem }>(
  aplicaveis: readonly T[],
  ultimasLacunas: readonly LacunaDaAbordagem[]
): T | null {
  const [primeira, segunda] = aplicaveis
  if (!primeira) return null
  const recentes = ultimasLacunas.slice(0, LIMITES.repeticaoMaxima)
  const repetiuDemais =
    recentes.length === LIMITES.repeticaoMaxima && recentes.every((id) => id === primeira.id)
  return repetiuDemais && segunda ? segunda : primeira
}

function nomeDoDestino(url: string): string | null {
  const host = hostDe(url)
  return (host && NOMES_DE_DESTINO.find(([dominio]) => pertenceA(host, [dominio]))?.[1]) || null
}

function textoDoLink(lacuna: Extract<LacunaDoLead, { id: "link_fora_do_site" }>): string {
  const textos = TEXTOS_DAS_LACUNAS.link_fora_do_site
  if (lacuna.destino === "whatsapp") return textos.whatsapp
  const destino = nomeDoDestino(lacuna.url)
  if (lacuna.destino === "instagram" || lacuna.destino === "rede_social") {
    return destino ? preencher(textos.redeSocial, { DESTINO: destino }) : textos.redeSocialSemNome
  }
  if (destino) return preencher(textos.pagina, { DESTINO: destino })
  return lacuna.destino === "pagina_de_links" ? textos.paginaDeLinksSemNome : textos.plataformaSemNome
}

function textoDaLacuna(lacuna: LacunaDaAbordagemDoLead): string {
  switch (lacuna.id) {
    case "sem_site":
      return TEXTOS_DAS_LACUNAS.sem_site
    case "link_fora_do_site":
      return textoDoLink(lacuna)
    case "poucas_fotos": {
      const textos = TEXTOS_DAS_LACUNAS.poucas_fotos
      if (lacuna.fotos === 0) return textos.nenhuma
      if (lacuna.fotos === 1) return textos.uma
      return preencher(textos.varias, { N: String(lacuna.fotos) })
    }
    case "pouca_avaliacao": {
      const textos = TEXTOS_DAS_LACUNAS.pouca_avaliacao
      return lacuna.avaliacoes === 0 ? textos.nenhuma : textos.poucas
    }
  }
}

export type AncoraDoLead = Pick<DadosDaAbordagem, "negocio" | "pessoa" | "ancora" | "referencia" | "tratamento">

// "Procurei o escritório de Luiz Carlos no Google e achei" ou "Procurei Azevedo & Azevedo no Google e achei".
export function ancoraDoLead(lead: Pick<CamposDaAbordagem, "nome">, nicho: NichoDaAbordagem): AncoraDoLead {
  const negocio = nomeCurto(lead.nome)
  const pessoa = pessoaDoNome(lead.nome)
  const comPessoa = pessoa !== null && nicho.ancoraComPessoa !== undefined
  const modelo = comPessoa ? (nicho.ancoraComPessoa as string) : ANCORA_PADRAO
  return {
    negocio,
    pessoa,
    ancora: preencher(modelo, { NEGOCIO: negocio, PESSOA: pessoa ?? "" }),
    referencia: comPessoa ? (pessoa as string) : negocio,
    tratamento: pessoa ? "você" : "vocês",
  }
}

export type OpcoesDaAbordagem = {
  // Das mensagens abertas no WhatsApp mais recentes, a mais nova primeiro
  ultimasLacunas?: readonly LacunaDaAbordagem[]
  // buscas.nicho da busca que trouxe o lead
  termoDaBusca?: string | null
}

// Camada 1: tudo decidido em código. O horário vem antes: fora dele nada é gerado.
export function prepararAbordagem(
  lead: CamposDaAbordagem,
  agora: Date,
  { ultimasLacunas = [], termoDaBusca = null }: OpcoesDaAbordagem = {}
): PreparoDaAbordagem {
  const saudacao = saudacaoDoHorario(agora)
  if (!saudacao) return { tipo: "fora_do_horario" }

  const nicho = resolverNicho(lead.categoria, termoDaBusca)
  const lacuna = escolherLacuna(lacunasDaAbordagem(lead, nicho), ultimasLacunas)
  if (!lacuna) return { tipo: "manual", motivo: "sem_lacuna", nicho: nicho.id }

  return {
    tipo: "pronta",
    dados: {
      lacuna: lacuna.id,
      nicho: nicho.id,
      saudacao,
      ...ancoraDoLead(lead, nicho),
      textoDaLacuna: textoDaLacuna(lacuna),
      pergunta: nicho.pergunta,
    },
  }
}

// Mensagem sem LLM: a estrutura do config com os dados já resolvidos.
export function mensagemFixa(dados: DadosDaAbordagem): string {
  return preencher(MENSAGEM_FIXA, {
    SAUDACAO: dados.saudacao,
    ANCORA: dados.ancora,
    LACUNA: dados.textoDaLacuna,
    PERGUNTA: dados.pergunta,
  })
}

// Termo no início de palavra: "orçamentos" bloqueia, "meu crio" não conta como "eu crio".
function contemTermo(textoNormalizado: string, termo: string): boolean {
  const alvo = normalizar(termo).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(?<![\\p{L}\\p{N}])${alvo}`, "u").test(textoNormalizado)
}

// Também unifica acento decomposto: o Gemini devolve "ã" composto mesmo se o banco não.
function juntarEspacos(texto: string): string {
  return texto.normalize("NFC").replace(/\s+/g, " ").trim()
}

// Camada 3: lista vazia = pode enviar. Cada item vira o motivo registrado do bloqueio.
export function validarMensagem(texto: string, dados: Pick<DadosDaAbordagem, "referencia" | "pergunta">): string[] {
  const motivos: string[] = []
  if (!texto.trim()) return ["vazia"]

  if ((texto.match(/\?/g) ?? []).length > 1) motivos.push("mais_de_uma_pergunta")
  const normalizado = normalizar(texto)
  for (const termo of TERMOS_DE_OFERTA) {
    if (contemTermo(normalizado, termo)) motivos.push(`oferta:${termo}`)
  }
  if (texto.length > LIMITES.caracteres) motivos.push(`passa_de_${LIMITES.caracteres}_caracteres`)
  if (!juntarEspacos(texto).toLocaleLowerCase("pt-BR").includes(juntarEspacos(dados.referencia).toLocaleLowerCase("pt-BR"))) {
    motivos.push("sem_nome_do_negocio")
  }
  if (!juntarEspacos(texto).includes(juntarEspacos(dados.pergunta))) motivos.push("sem_pergunta_do_nicho")

  // Restrições do prompt que também dá pra conferir em código
  if (/\p{Extended_Pictographic}/u.test(texto)) motivos.push("emoji")
  if (/[*_`#]|^\s*[-•]\s/m.test(texto)) motivos.push("markdown")
  for (const termo of TERMOS_DE_ELOGIO) {
    if (contemTermo(normalizado, termo)) motivos.push(`elogio:${termo}`)
  }
  return motivos
}

export type TentativaBloqueada = { tentativa: number | "fixa"; motivos: string[] }

export type RedacaoDaAbordagem =
  | { tipo: "pronta"; texto: string; origem: "gemini" | "fixa"; bloqueios: TentativaBloqueada[] }
  | { tipo: "manual"; motivo: "mensagem_fixa_invalida"; bloqueios: TentativaBloqueada[] }

// Quem chama o Gemini. Recebe os bloqueios anteriores para o retry poder corrigir.
export type Redator = (dados: DadosDaAbordagem, bloqueiosAnteriores: TentativaBloqueada[]) => Promise<string>

// Camadas 2 e 3: Gemini com um retry; bloqueado ou com erro nas duas, mensagem fixa.
// Se nem a fixa passar na validação (nome enorme, por exemplo), vira abordagem manual.
export async function redigirAbordagem(dados: DadosDaAbordagem, redigir: Redator): Promise<RedacaoDaAbordagem> {
  const bloqueios: TentativaBloqueada[] = []

  for (let tentativa = 1; tentativa <= LIMITES.tentativasDoGemini; tentativa++) {
    try {
      const texto = (await redigir(dados, [...bloqueios])).trim()
      const motivos = validarMensagem(texto, dados)
      if (motivos.length === 0) return { tipo: "pronta", texto, origem: "gemini", bloqueios }
      bloqueios.push({ tentativa, motivos })
    } catch (err) {
      bloqueios.push({ tentativa, motivos: [`erro: ${err instanceof Error ? err.message : String(err)}`] })
    }
  }

  const fixa = mensagemFixa(dados)
  const motivosDaFixa = validarMensagem(fixa, dados)
  if (motivosDaFixa.length > 0) {
    return {
      tipo: "manual",
      motivo: "mensagem_fixa_invalida",
      bloqueios: [...bloqueios, { tentativa: "fixa", motivos: motivosDaFixa }],
    }
  }
  return { tipo: "pronta", texto: fixa, origem: "fixa", bloqueios }
}
