// Primeira abordagem por WhatsApp em três camadas:
// 1. código escolhe lacuna, nicho, saudação e pergunta (prepararAbordagem);
// 2. o Gemini só redige com esses dados (recebido como função: aqui não há API);
// 3. código valida o texto e, se o Gemini não passar, usa a mensagem fixa.
// Textos e limites: src/lib/leads/config/.

import {
  ABERTURA_DA_APRESENTACAO,
  ANCORA_PADRAO,
  APRESENTACAO_PADRAO,
  APRESENTACAO_POR_NICHO,
  CATEGORIAS_GENERICAS,
  DEGRAUS_DE_AVALIACAO,
  FECHAMENTO_DA_APRESENTACAO,
  FOLLOW_UP,
  GANCHO_REPUTACAO,
  GRUPOS_SO_DA_ABERTURA,
  FUSO_DA_ABORDAGEM,
  LACUNAS_DA_ABORDAGEM,
  LACUNAS_SO_DE_COMERCIO,
  LIMITES,
  OBSERVACAO_REPUTACAO,
  REPUTACAO_ALTA,
  LIMITES_DA_APRESENTACAO,
  LIMITES_DE_LINHA,
  MARCAS_DE_IA,
  MENSAGEM_DE_SAUDACAO,
  MENSAGEM_FIXA,
  NICHOS,
  PARAGRAFO_DO_NICHO,
  NICHO_PADRAO,
  NOMES_DE_DESTINO,
  SAUDACOES,
  TERMOS_BLOQUEADOS,
  TERMOS_BLOQUEADOS_POR_NICHO,
  TERMOS_DE_PALAVRA_INTEIRA,
  TEXTOS_CURTOS_DAS_LACUNAS,
  TEXTOS_DAS_LACUNAS,
  type GanchoDaAbordagem,
  type LacunaDaAbordagem,
  type NichoDaAbordagem,
  type TextosDasLacunas,
} from "@/lib/leads/abordagemConfig"
import { lacunasDoLead, nomeCurto, type CamposDoModelo, type LacunaDoLead } from "@/lib/leads/modelosMensagem"
import { pessoaDoNome } from "@/lib/leads/pessoaDoNome"
import { hostDe, pertenceA } from "@/lib/leads/presencaDigital"

export type CamposDaAbordagem = CamposDoModelo

type LacunaDaAbordagemDoLead = Extract<LacunaDoLead, { id: LacunaDaAbordagem }>

export type DadosDaAbordagem = {
  // Uma lacuna (defeito) ou "reputacao_alta" (força)
  lacuna: GanchoDaAbordagem
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
  // A mesma observação, enxuta, pra "abordagem curta": "não tem site"
  textoCurtoDaLacuna: string
  pergunta: string
}

export type PreparoDaAbordagem =
  | { tipo: "fora_do_horario" }
  // Site próprio, análise feita e nenhum defeito: fim de linha, não é fila de trabalho
  | { tipo: "descartado_sem_gancho"; nicho: string }
  // Falta dado pra decidir (site nunca analisado, link estranho): dá pra voltar
  | { tipo: "manual"; motivo: "sem_lacuna"; nicho: string }
  | { tipo: "pronta"; dados: DadosDaAbordagem }

// Situação derivada, não guardada: se o site cair amanhã, o lead volta a ter
// gancho sozinho. Gravar isso numa coluna criaria um valor que envelhece.
// Só vale pra site que abre normalmente: site fora do ar por tempo esgotado ou
// erro de servidor é medição inconclusiva, e isso é manual, não fim de linha.
export function descartadoSemGancho(
  lead: Pick<CamposDaAbordagem, "tem_site" | "site_status" | "site_analisado_em">
): boolean {
  return lead.tem_site === true && lead.site_status === "ok" && lead.site_analisado_em !== null
}

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

function textoDoLink(
  lacuna: Extract<LacunaDoLead, { id: "link_fora_do_site" }>,
  textos: TextosDasLacunas["link_fora_do_site"]
): string {
  if (lacuna.destino === "whatsapp") return textos.whatsapp
  const destino = nomeDoDestino(lacuna.url)
  if (lacuna.destino === "instagram" || lacuna.destino === "rede_social") {
    return destino ? preencher(textos.redeSocial, { DESTINO: destino }) : textos.redeSocialSemNome
  }
  if (destino) return preencher(textos.pagina, { DESTINO: destino })
  return lacuna.destino === "pagina_de_links" ? textos.paginaDeLinksSemNome : textos.plataformaSemNome
}

function textoDaLacuna(lacuna: LacunaDaAbordagemDoLead, textos: TextosDasLacunas): string {
  switch (lacuna.id) {
    case "sem_site":
      return textos.sem_site
    case "link_fora_do_site":
      return textoDoLink(lacuna, textos.link_fora_do_site)
    case "site_dominio_inexistente":
      return textos.site_dominio_inexistente
    case "site_certificado_invalido":
      return textos.site_certificado_invalido
    case "site_dominio_gratuito":
      return lacuna.plataforma
        ? preencher(textos.site_dominio_gratuito.comPlataforma, { PLATAFORMA: lacuna.plataforma })
        : textos.site_dominio_gratuito.semPlataforma
    case "poucas_fotos":
      if (lacuna.fotos === 0) return textos.poucas_fotos.nenhuma
      if (lacuna.fotos === 1) return textos.poucas_fotos.uma
      return preencher(textos.poucas_fotos.varias, { N: String(lacuna.fotos) })
    case "pouca_avaliacao":
      return lacuna.avaliacoes === 0 ? textos.pouca_avaliacao.nenhuma : textos.pouca_avaliacao.poucas
  }
}

// A lacuna pode trazer pergunta própria por nicho; sem ela, vale a do nicho.
function perguntaDaLacuna(lacuna: LacunaDaAbordagemDoLead, nicho: NichoDaAbordagem): string {
  const vaiPraPagina =
    lacuna.id === "link_fora_do_site" && (lacuna.destino === "pagina_de_links" || lacuna.destino === "plataforma")
  const propria = vaiPraPagina ? TEXTOS_DAS_LACUNAS.link_fora_do_site.perguntaQuandoPagina[nicho.id] : undefined
  return propria ?? nicho.pergunta
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

// Reputação alta: nota e avaliações acima do piso do config. Número ausente = não.
export function reputacaoAlta(
  lead: Pick<CamposDaAbordagem, "google_rating" | "google_avaliacoes_count">
): boolean {
  const nota = lead.google_rating
  const avaliacoes = lead.google_avaliacoes_count
  return (
    nota !== null &&
    nota >= REPUTACAO_ALTA.notaMinima &&
    avaliacoes !== null &&
    avaliacoes >= REPUTACAO_ALTA.avaliacoesMinimas
  )
}

// "mais de 100 avaliações": arredonda pra baixo pelo maior degrau que couber. O
// número exato entregaria raspagem, então nunca sai o valor cru.
export function avaliacoesArredondadas(quantidade: number): string {
  let degrau: number = DEGRAUS_DE_AVALIACAO[0]
  for (const d of DEGRAUS_DE_AVALIACAO) if (quantidade >= d) degrau = d
  return `mais de ${degrau} avaliações`
}

// Gancho de reputação alta, ou null quando o nicho não tem perguntaReputacao ou
// o lead não é reputação alta. É rescue: prepararAbordagem só chama quando não
// há lacuna. A observação é o número arredondado; a pergunta é a do nicho, sobre
// como o cliente decide antes de chegar, não sobre agendamento.
function dadosDeReputacao(
  lead: CamposDaAbordagem,
  nicho: NichoDaAbordagem,
  saudacao: string
): DadosDaAbordagem | null {
  if (!nicho.perguntaReputacao) return null
  if (!reputacaoAlta(lead) || lead.google_avaliacoes_count === null) return null
  const observacao = preencher(OBSERVACAO_REPUTACAO, {
    AVALIACOES: avaliacoesArredondadas(lead.google_avaliacoes_count),
  })
  return {
    lacuna: GANCHO_REPUTACAO,
    nicho: nicho.id,
    saudacao,
    ...ancoraDoLead(lead, nicho),
    textoDaLacuna: observacao,
    textoCurtoDaLacuna: observacao,
    pergunta: nicho.perguntaReputacao,
  }
}

export type OpcoesDaAbordagem = {
  // Lacunas das últimas mensagens registradas na org, a mais nova primeiro
  ultimasLacunas?: readonly LacunaDaAbordagem[]
  // buscas.nicho da busca que trouxe o lead
  termoDaBusca?: string | null
  // Saudação escolhida à mão (exportação: a lista é enviada depois, então o
  // horário de agora não vale, e fora do horário não bloqueia)
  saudacaoFixa?: string | null
}

// Camada 1: tudo decidido em código. O horário vem antes: fora dele nada é gerado.
export function prepararAbordagem(
  lead: CamposDaAbordagem,
  agora: Date,
  { ultimasLacunas = [], termoDaBusca = null, saudacaoFixa = null }: OpcoesDaAbordagem = {}
): PreparoDaAbordagem {
  const saudacao = saudacaoFixa ?? saudacaoDoHorario(agora)
  if (!saudacao) return { tipo: "fora_do_horario" }

  const nicho = resolverNicho(lead.categoria, termoDaBusca)
  const lacuna = escolherLacuna(lacunasDaAbordagem(lead, nicho), ultimasLacunas)
  if (!lacuna) {
    // Site que abre e sem defeito seria fim de linha; reputação alta salva esse
    // lead com o ângulo da reputação, nos nichos que têm perguntaReputacao. Site
    // indefinido continua manual — sem saber do site, não afirmamos que não há gancho.
    if (descartadoSemGancho(lead)) {
      const reputacao = dadosDeReputacao(lead, nicho, saudacao)
      if (reputacao) return { tipo: "pronta", dados: reputacao }
      return { tipo: "descartado_sem_gancho", nicho: nicho.id }
    }
    return { tipo: "manual", motivo: "sem_lacuna", nicho: nicho.id }
  }

  return {
    tipo: "pronta",
    dados: {
      lacuna: lacuna.id,
      nicho: nicho.id,
      saudacao,
      ...ancoraDoLead(lead, nicho),
      textoDaLacuna: textoDaLacuna(lacuna, TEXTOS_DAS_LACUNAS),
      textoCurtoDaLacuna: textoDaLacuna(lacuna, TEXTOS_CURTOS_DAS_LACUNAS),
      pergunta: perguntaDaLacuna(lacuna, nicho),
    },
  }
}

// Mensagem 1: vai sozinha, antes da abertura.
export function mensagemDeSaudacao(dados: Pick<DadosDaAbordagem, "saudacao">): string {
  return preencher(MENSAGEM_DE_SAUDACAO, { SAUDACAO: dados.saudacao })
}

// Mensagem 2, sem LLM: a estrutura do config com os dados já resolvidos. Não
// leva a saudação, que já foi na mensagem 1. "curta" (antigo modelo "Abordagem
// curta") só troca a observação pela versão enxuta.
export function mensagemFixa(dados: DadosDaAbordagem, formato: "completa" | "curta" = "completa"): string {
  return preencher(MENSAGEM_FIXA, {
    ANCORA: dados.ancora,
    LACUNA: formato === "curta" ? dados.textoCurtoDaLacuna : dados.textoDaLacuna,
    PERGUNTA: dados.pergunta,
  })
}

// Antigo modelo "Retorno": o follow-up único, texto fixo do config.
export function mensagemDeRetorno(): string {
  return FOLLOW_UP.texto
}

// Termo no início de palavra: "orçamentos" bloqueia, "meu crio" não conta como "eu crio".
// Uma regex por termo, compilada uma vez só: a validação roda por mensagem, e a
// exportação valida uma lista inteira de leads de uma vez.
const regexDoTermo = new Map<string, RegExp>()

// Os de TERMOS_DE_PALAVRA_INTEIRA também precisam terminar a palavra.
function contemTermo(textoNormalizado: string, termo: string): boolean {
  let regex = regexDoTermo.get(termo)
  if (!regex) {
    const alvo = normalizar(termo).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const fim = TERMOS_DE_PALAVRA_INTEIRA.includes(termo) ? "(?![\\p{L}\\p{N}])" : ""
    regex = new RegExp(`(?<![\\p{L}\\p{N}])${alvo}${fim}`, "u")
    regexDoTermo.set(termo, regex)
  }
  return regex.test(textoNormalizado)
}

// Também unifica acento decomposto: o Gemini devolve "ã" composto mesmo se o banco não.
function juntarEspacos(texto: string): string {
  return texto.normalize("NFC").replace(/\s+/g, " ").trim()
}

// Tira o nome do lead do texto antes das regras de escrita: o nome vem do
// Google e a validação existe pra julgar o que a abordagem escreve. Sem isso,
// "Barbearia_o_nony" vira markdown e "Oficina Mecânica Top Car" vira elogio.
function semONomeDoLead(texto: string, nome: string | null): string {
  const alvo = nome ? juntarEspacos(nome) : ""
  if (alvo.length < 2) return texto
  const escapado = alvo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")
  return texto.replace(new RegExp(escapado, "gi"), " ")
}

// O que muda entre a abertura e o passo 2: o tamanho, quantas quebras de linha
// cabem e quais grupos de termo bloqueiam. O resto das regras é igual nas duas.
type PerfilDaValidacao = {
  caracteres: number
  quebras: number
  // Linha em branco é marca de IA na abertura e formato na apresentação
  linhaEmBranco: boolean
  gruposLiberados: readonly string[]
}

const PERFIL_DA_ABERTURA: PerfilDaValidacao = {
  caracteres: LIMITES.caracteres,
  quebras: LIMITES_DE_LINHA.quebras,
  linhaEmBranco: false,
  gruposLiberados: [],
}

const PERFIL_DA_APRESENTACAO: PerfilDaValidacao = {
  caracteres: LIMITES_DA_APRESENTACAO.caracteres,
  quebras: LIMITES_DA_APRESENTACAO.quebras,
  linhaEmBranco: LIMITES_DA_APRESENTACAO.linhaEmBranco,
  gruposLiberados: GRUPOS_SO_DA_ABERTURA,
}

// Regras que valem pra qualquer texto que vai pro WhatsApp, inclusive o retorno
// (que não tem nome nem pergunta). Lista vazia = pode enviar; cada item vira o
// motivo registrado do bloqueio. nomeDoLead sai das regras de escrita (markdown
// e termos bloqueados); tamanho, emoji e marcas de IA continuam no texto inteiro,
// porque valem para a mensagem como ela vai ser enviada.
function validarComPerfil(
  texto: string,
  nicho: string | null,
  nomeDoLead: string | null,
  perfil: PerfilDaValidacao
): string[] {
  if (!texto.trim()) return ["vazia"]
  const motivos: string[] = []
  const adicionar = (motivo: string) => {
    if (!motivos.includes(motivo)) motivos.push(motivo)
  }

  // (a) marcas de IA
  for (const [trecho, nome] of MARCAS_DE_IA) {
    if (texto.includes(trecho)) adicionar(`marca_de_ia:${nome}`)
  }
  const quebras = (texto.trim().match(/\n/g) ?? []).length
  if (quebras > perfil.quebras) adicionar(`marca_de_ia:mais_de_${perfil.quebras}_quebras`)
  if (!perfil.linhaEmBranco && /\n[^\S\n]*\n/.test(texto.trim())) adicionar("marca_de_ia:linha_em_branco")

  if ((texto.match(/\?/g) ?? []).length > 1) adicionar("mais_de_uma_pergunta")
  if (texto.length > perfil.caracteres) adicionar(`passa_de_${perfil.caracteres}_caracteres`)
  if (/\p{Extended_Pictographic}/u.test(texto)) adicionar("emoji")

  const escrito = semONomeDoLead(texto, nomeDoLead)
  if (/[*_`#]|^\s*[-•]\s/m.test(escrito)) adicionar("markdown")

  // (b) oferta, (c) permissão, (d) promessa, (f) elogio; (e) termos do nicho
  const normalizado = normalizar(escrito)
  const grupos: [string, readonly string[]][] = Object.entries(TERMOS_BLOQUEADOS).filter(
    ([grupo]) => !perfil.gruposLiberados.includes(grupo)
  )
  const doNicho = nicho ? TERMOS_BLOQUEADOS_POR_NICHO[nicho] : undefined
  if (nicho && doNicho) grupos.push([nicho, doNicho])
  for (const [grupo, termos] of grupos) {
    for (const termo of termos) {
      if (contemTermo(normalizado, termo)) adicionar(`${grupo}:${termo}`)
    }
  }
  return motivos
}

export function validarConteudo(
  texto: string,
  nicho: string | null = null,
  nomeDoLead: string | null = null
): string[] {
  return validarComPerfil(texto, nicho, nomeDoLead, PERFIL_DA_ABERTURA)
}

// Passo 2: a mesma régua de escrita, mais folgada no tamanho, e sem a trava de
// oferta, porque dizer o que se faz é o assunto desta mensagem. Promessa,
// pedido de permissão, elogio e a trava do nicho continuam valendo.
export function validarApresentacao(texto: string, nicho: string | null = null): string[] {
  return validarComPerfil(texto, nicho, null, PERFIL_DA_APRESENTACAO)
}

// "Pra pizzaria funcionaria assim": a categoria do Google é mais específica que
// o nicho, então ela vem na frente. Categoria vazia ou que não diz o ramo
// (CATEGORIAS_GENERICAS) cai no ramo do nicho.
export function ramoDaApresentacao(nicho: string, categoria: string | null = null): string {
  const doNicho = (APRESENTACAO_POR_NICHO[nicho] ?? APRESENTACAO_PADRAO).ramo
  if (!categoria?.trim() || CATEGORIAS_GENERICAS.includes(normalizar(categoria))) return doNicho
  return categoria.trim().toLocaleLowerCase("pt-BR")
}

// Mensagem 3: três parágrafos separados por linha em branco. Só o do meio muda
// por nicho; nicho sem texto próprio leva o padrão.
export function apresentacaoDoNicho(nicho: string, categoria: string | null = null): string {
  const doNicho = APRESENTACAO_POR_NICHO[nicho] ?? APRESENTACAO_PADRAO
  const meio = preencher(PARAGRAFO_DO_NICHO, {
    RAMO: ramoDaApresentacao(nicho, categoria),
    COMO_FUNCIONA: doNicho.comoFunciona,
  })
  return [ABERTURA_DA_APRESENTACAO, meio, FECHAMENTO_DA_APRESENTACAO].join("\n\n")
}

// Camada 3 da abordagem: as regras de conteúdo, mais citar o nome e terminar na pergunta decidida.
export function validarMensagem(
  texto: string,
  dados: Pick<DadosDaAbordagem, "referencia" | "pergunta" | "nicho">
): string[] {
  const motivos = validarConteudo(texto, dados.nicho, dados.referencia)
  if (motivos.includes("vazia")) return motivos

  const junto = juntarEspacos(texto)
  if (!junto.toLocaleLowerCase("pt-BR").includes(juntarEspacos(dados.referencia).toLocaleLowerCase("pt-BR"))) {
    motivos.push("sem_nome_do_negocio")
  }
  if (!junto.includes(juntarEspacos(dados.pergunta))) motivos.push("sem_pergunta_do_nicho")
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

export type ModoDaJanela = "completa" | "curta" | "gemini"

// O que a janela do WhatsApp recebe. Texto fixo e Gemini passam pela mesma
// camada 1 e pela mesma validação; o Gemini só redige o que ela decidiu.
export type MensagemDaJanela =
  | { tipo: "fora_do_horario" }
  | { tipo: "descartado_sem_gancho" }
  | { tipo: "manual"; motivo: "sem_lacuna" | "mensagem_fixa_invalida"; bloqueios: TentativaBloqueada[] }
  | {
      tipo: "pronta"
      lacuna: GanchoDaAbordagem
      // Mensagem 1, que vai sozinha antes do texto
      saudacao: string
      // Mensagem 2
      texto: string
      origem: "gemini" | "fixa"
      bloqueios: TentativaBloqueada[]
      // Pra validar de novo se o texto for editado na janela
      validacao: Pick<DadosDaAbordagem, "referencia" | "pergunta" | "nicho">
    }

// Análise de site velha demais pra decidir uma lacuna em cima dela: o site pode
// ter voltado, ou o certificado ter sido renovado. Só vale pra quem tem site.
export function precisaReverificarSite(
  lead: Pick<CamposDaAbordagem, "tem_site" | "site_analisado_em">,
  agora: Date
): boolean {
  if (lead.tem_site !== true) return false
  if (!lead.site_analisado_em) return true
  const dias = (agora.getTime() - new Date(lead.site_analisado_em).getTime()) / 86_400_000
  return dias > LIMITES.diasParaReverificarSite
}

// Abre o site de novo e devolve os campos site_* atualizados (src/lib/leads/analiseServidor.ts).
export type ReverificadorDeSite = (lead: CamposDaAbordagem) => Promise<Partial<CamposDaAbordagem>>

export async function mensagemParaJanela(
  leadOriginal: CamposDaAbordagem,
  agora: Date,
  modo: ModoDaJanela,
  opcoes: OpcoesDaAbordagem = {},
  redigir?: Redator,
  reverificarSite?: ReverificadorDeSite
): Promise<MensagemDaJanela> {
  const lead =
    reverificarSite && precisaReverificarSite(leadOriginal, agora)
      ? { ...leadOriginal, ...(await reverificarSite(leadOriginal)) }
      : leadOriginal
  const preparo = prepararAbordagem(lead, agora, opcoes)
  if (preparo.tipo === "fora_do_horario") return preparo
  if (preparo.tipo === "descartado_sem_gancho") return { tipo: "descartado_sem_gancho" }
  if (preparo.tipo === "manual") return { tipo: "manual", motivo: preparo.motivo, bloqueios: [] }

  const { dados } = preparo
  const comum = {
    lacuna: dados.lacuna,
    saudacao: mensagemDeSaudacao(dados),
    validacao: { referencia: dados.referencia, pergunta: dados.pergunta, nicho: dados.nicho },
  }

  if (modo === "gemini") {
    if (!redigir) throw new Error("Modo gemini sem redator.")
    const redacao = await redigirAbordagem(dados, redigir)
    return redacao.tipo === "manual" ? redacao : { ...redacao, ...comum }
  }

  const texto = mensagemFixa(dados, modo)
  const motivos = validarMensagem(texto, dados)
  if (motivos.length > 0) {
    return { tipo: "manual", motivo: "mensagem_fixa_invalida", bloqueios: [{ tentativa: "fixa", motivos }] }
  }
  return { tipo: "pronta", texto, origem: "fixa", bloqueios: [], ...comum }
}

const NOMES_DOS_GRUPOS: Record<string, string> = {
  oferta: "oferta",
  permissao: "pedido de permissão",
  promessa: "promessa de resultado",
  elogio: "elogio",
  advocacia: "termo vedado na advocacia",
}

const NOMES_DOS_MOTIVOS: Record<string, string> = {
  vazia: "mensagem vazia",
  mais_de_uma_pergunta: "mais de uma pergunta",
  [`passa_de_${LIMITES.caracteres}_caracteres`]: `passa de ${LIMITES.caracteres} caracteres`,
  emoji: "emoji",
  markdown: "formatação (asterisco, sublinhado, lista)",
  sem_nome_do_negocio: "sem o nome do lead",
  sem_pergunta_do_nicho: "a pergunta final mudou",
  [`marca_de_ia:mais_de_${LIMITES_DE_LINHA.quebras}_quebras`]: `mais de ${LIMITES_DE_LINHA.quebras} quebras de linha`,
  "marca_de_ia:linha_em_branco": "linha em branco",
}

// "permissao:te mando" → 'pedido de permissão ("te mando")', pra mostrar na janela.
export function descreverMotivo(motivo: string): string {
  if (NOMES_DOS_MOTIVOS[motivo]) return NOMES_DOS_MOTIVOS[motivo]
  const [grupo, ...resto] = motivo.split(":")
  const detalhe = resto.join(":")
  if (grupo === "marca_de_ia") return detalhe
  return NOMES_DOS_GRUPOS[grupo] ? `${NOMES_DOS_GRUPOS[grupo]} ("${detalhe}")` : motivo
}
