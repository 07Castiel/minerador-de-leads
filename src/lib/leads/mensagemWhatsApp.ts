// Primeira mensagem de WhatsApp escrita pelo Gemini para um lead: instruções,
// dados do lead em texto e limpeza da resposta. Tudo puro (a chamada à API fica
// em src/lib/gemini.ts), para dar pra testar sem chamar a API.

import { MINIMO_AVALIACOES_CONFIAVEIS } from "@/lib/leads/motivos"
import { classificarLink } from "@/lib/leads/presencaDigital"
import type { Lead } from "@/types/lead"

// O que quem manda a mensagem oferece. Quando virar SaaS, isso vem da org.
export const OFERTA =
  "cria sites para negócios locais e ajuda o negócio a ser encontrado e contatado pela internet (site próprio, perfil no Google)"

export const INSTRUCOES_MENSAGEM_WHATSAPP = `Você escreve a primeira mensagem de WhatsApp que um vendedor manda para um negócio local que ainda não conhece. Quem vende ${OFERTA}. A mensagem vai ser enviada como se ele tivesse acabado de digitar, então precisa soar como uma pessoa real escrevendo rápido pelo celular: natural, espontânea e pensada para aquele negócio. Se parecer disparo em massa, template comercial ou texto de IA, a pessoa ignora.

Os dados do lead chegam dentro de <lead>. Só existem os campos listados ali; o que não aparece, você não sabe. Nunca invente nome de pessoa, produto, serviço, história ou detalhe que não esteja nos dados. Você é quem vende, então não se passe por cliente nem crie uma situação (que estava procurando pizzaria, que quis fazer uma encomenda, que cortou o cabelo lá) e não opine sobre produto, serviço ou atendimento que os dados não mostram. Com poucos dados, escreva uma abordagem simples e honesta, sem fingir que conhece o negócio.

Como montar a mensagem:
1. Cumprimente, usando o nome da pessoa se ele estiver nos dados (nome da empresa não é nome de pessoa).
2. Faça uma referência específica ao negócio: o segmento, o bairro, o que o link ou o Instagram mostram, a boa reputação. Escolha um ou dois detalhes que rendam conversa, não tudo o que sabe.
3. Ligue esse detalhe ao motivo do contato e diga em poucas palavras que você trabalha com isso. A pessoa precisa entender por que está sendo chamada sem ter que adivinhar.
4. Termine com uma pergunta simples, fácil de responder.

Tom: educado e direto, como numa conversa de WhatsApp. Frases curtas e de tamanhos variados, português do dia a dia ("vocês", "tá", "pra" cabem bem), sem cara de e-mail e sem jargão corporativo ou de marketing. No máximo um elogio, e só se for específico e sustentado pelos dados. Emoji no máximo um, e na maioria das vezes nenhum. Nada de hashtag, lista, negrito, assinatura, travessão ou ponto e vírgula, que ninguém digita no celular.

A pessoa não pode sentir que o negócio dela foi analisado por um sistema. Por isso:
- Não repita números dos dados (nota, quantidade de avaliações, seguidores, dias sem postar, fotos). Quem passou pelo perfil diria "vocês são bem avaliados", não "nota 4,7 com 230 avaliações".
- Trate o que falta (site, perfil do Google sem dono, Instagram parado, avaliações sem resposta) como assunto de uma pergunta curiosa, nunca como crítica, diagnóstico ou lista de problemas.
- Não use construções que denunciem pesquisa ou automação, como "Analisei seu negócio", "Pesquisei sua empresa", "Vi algumas informações sobre sua empresa", "Com base nos dados", "Notei que vocês", "Percebi que sua empresa" ou "Posso te ajudar a", e nunca mencione IA. "Vi a loja de vocês" ou "achei vocês no Google" é natural; o problema é soar como relatório.
- Evite frases feitas de prospecção ("gostaria de apresentar", "tenho uma proposta", "alavancar", "impulsionar seus resultados").
- Não capriche demais. Quem digita rápido não monta frases simétricas nem texto polido.

Para ter a ideia da diferença (não reaproveite as frases): "Oi João, vi que você tem uma loja de roupas. Trabalho com criação de sites e gostaria de apresentar meu serviço." é genérico. "Oi João, tudo certo? Vi a loja de vocês e achei interessante a variedade de peças que vocês trabalham. Hoje vocês já têm algum lugar onde o cliente consegue ver os produtos e entrar em contato direto, ou fazem tudo pelo Instagram?" parte de algo do negócio e abre conversa.

Cada mensagem deve ter cara própria: a abertura, o gancho, o jeito de explicar o motivo e a pergunta final mudam de um lead para outro. O pedido traz uma sugestão sorteada de abertura e de fechamento para ajudar nisso. Siga se ficar natural para esse lead; se não ficar, faça de outro jeito.

Tamanho: de 2 a 5 frases, para ler de relance.

Responda somente com o texto da mensagem, pronto para enviar, sem aspas, título, explicação, alternativas ou comentário.`

export const ABERTURAS = [
  "um cumprimento curto e o comentário sobre o negócio já na mesma frase",
  "um cumprimento de acordo com o período do dia",
  "um oi simples perguntando se está tudo bem, e o assunto logo na frase seguinte",
  "o comentário sobre o negócio primeiro, com o cumprimento bem rápido antes",
] as const

export const FECHAMENTOS = [
  "uma pergunta sobre como eles fazem isso hoje",
  "uma pergunta leve de sim ou não",
  "uma pergunta sobre quem cuida dessa parte por lá",
  "uma pergunta se já pensaram nisso",
] as const

export type CamposDaMensagem = Pick<
  Lead,
  | "nome"
  | "categoria"
  | "cidade"
  | "bairro"
  | "tem_site"
  | "site_url"
  | "instagram_handle"
  | "instagram_seguidores"
  | "instagram_ultimo_post_dias"
  | "google_rating"
  | "google_avaliacoes_count"
  | "google_avaliacoes_sem_resposta"
  | "fotos_count"
  | "perfil_reivindicado"
  | "tem_descricao"
  | "tem_horario"
>

const inteiro = new Intl.NumberFormat("pt-BR")
const nota = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function linhaDoSite(lead: CamposDaMensagem): string | null {
  const link = classificarLink(lead.site_url)
  if (!link) return lead.tem_site === false ? "não tem site (nenhum link no perfil do Google)" : null
  switch (link.tipo) {
    case "site":
      return `tem site próprio (${link.url})`
    case "rede_social":
      return `não tem site próprio; o link no perfil do Google é de rede social (${link.url})`
    case "plataforma":
      return `não tem site próprio; o link no perfil do Google é uma página numa plataforma de terceiros (${link.url})`
    case "site_desativado":
      return "não tem site próprio; o link no perfil do Google é um site gratuito do Google que já saiu do ar"
  }
}

function linhaDoInstagram(lead: CamposDaMensagem): string | null {
  if (!lead.instagram_handle) return null
  const detalhes = [
    lead.instagram_seguidores !== null ? `${inteiro.format(lead.instagram_seguidores)} seguidores` : null,
    lead.instagram_ultimo_post_dias !== null
      ? lead.instagram_ultimo_post_dias === 0
        ? "postou hoje"
        : `último post há ${lead.instagram_ultimo_post_dias} ${lead.instagram_ultimo_post_dias === 1 ? "dia" : "dias"}`
      : null,
  ].filter(Boolean)
  return `@${lead.instagram_handle}${detalhes.length > 0 ? ` (${detalhes.join(", ")})` : ""}`
}

function linhaDoGoogle(lead: CamposDaMensagem): string | null {
  const avaliacoes = lead.google_avaliacoes_count
  const partes = [
    avaliacoes !== null && avaliacoes >= MINIMO_AVALIACOES_CONFIAVEIS && lead.google_rating !== null
      ? `nota ${nota.format(lead.google_rating)} com ${inteiro.format(avaliacoes)} avaliações`
      : avaliacoes !== null
        ? `${inteiro.format(avaliacoes)} ${avaliacoes === 1 ? "avaliação" : "avaliações"}`
        : null,
    (lead.google_avaliacoes_sem_resposta ?? 0) > 0
      ? `${lead.google_avaliacoes_sem_resposta} avaliações sem resposta do dono`
      : null,
    lead.fotos_count !== null ? `${lead.fotos_count} ${lead.fotos_count === 1 ? "foto" : "fotos"}` : null,
    lead.perfil_reivindicado === false ? "perfil nunca reivindicado pelo dono" : null,
    lead.tem_descricao === false ? "perfil sem descrição" : null,
    lead.tem_horario === false ? "perfil sem horário de funcionamento" : null,
  ].filter(Boolean)
  return partes.length > 0 ? partes.join("; ") : null
}

// Só os campos preenchidos: campo vazio no texto convida o modelo a adivinhar.
export function dadosDoLeadEmTexto(lead: CamposDaMensagem): string {
  const campos: [string, string | null][] = [
    ["Empresa", lead.nome],
    ["Segmento", lead.categoria],
    ["Localização", [lead.bairro, lead.cidade].filter(Boolean).join(", ") || null],
    ["Site", linhaDoSite(lead)],
    ["Instagram", linhaDoInstagram(lead)],
    ["Perfil no Google", linhaDoGoogle(lead)],
  ]
  return campos
    .filter((campo): campo is [string, string] => Boolean(campo[1]))
    .map(([rotulo, valor]) => `${rotulo}: ${valor}`)
    .join("\n")
}

export function periodoDoDia(agora: Date): "manhã" | "tarde" | "noite" {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(
      agora
    )
  )
  if (hora >= 5 && hora < 12) return "manhã"
  if (hora >= 12 && hora < 18) return "tarde"
  return "noite"
}

export const MAXIMO_DESCARTADAS = 3

type PedidoDeMensagem = {
  lead: CamposDaMensagem
  agora: Date
  // Versões que o usuário já viu e pediu outra: a nova tem que fugir delas.
  descartadas?: string[]
  sortear?: () => number
}

export function montarPedidoDeMensagem({
  lead,
  agora,
  descartadas = [],
  sortear = Math.random,
}: PedidoDeMensagem): string {
  const abertura = ABERTURAS[Math.floor(sortear() * ABERTURAS.length)]
  const fechamento = FECHAMENTOS[Math.floor(sortear() * FECHAMENTOS.length)]

  const partes = [
    `<lead>\n${dadosDoLeadEmTexto(lead)}\n</lead>`,
    `Agora é ${periodoDoDia(agora)} no horário de Brasília.`,
    `Sugestão para esta mensagem: abrir com ${abertura}, e fechar com ${fechamento}.`,
  ]

  const recentes = descartadas.slice(-MAXIMO_DESCARTADAS)
  if (recentes.length > 0) {
    partes.push(
      "O usuário já viu estas versões e pediu outra. Escreva uma diferente, com outro gancho e outra construção:\n" +
        recentes.map((texto) => `<descartada>\n${texto}\n</descartada>`).join("\n")
    )
  }

  partes.push("Escreva a mensagem.")
  return partes.join("\n\n")
}

// O modelo às vezes embrulha a resposta em aspas ou deixa linhas em branco sobrando.
export function limparMensagem(texto: string): string {
  let limpo = texto.trim()
  // Só quando as aspas embrulham tudo: "Oi" e "tchau" continua como está.
  const aspas = limpo.match(/^["“]([^"“”]*)["”]$/)
  if (aspas) limpo = aspas[1].trim()
  return limpo.replace(/\n{3,}/g, "\n\n")
}
