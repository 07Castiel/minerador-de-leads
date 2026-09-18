// Limites e formato das mensagens: horário, números, estrutura de cada uma,
// termos que bloqueiam o envio e o follow-up.
//
// A conversa tem três mensagens, nesta ordem:
// 1. a saudação sozinha (MENSAGEM_DE_SAUDACAO), que só abre a conversa;
// 2. a abertura (MENSAGEM_FIXA), logo em seguida, com o gancho e a pergunta;
// 3. a apresentação (src/lib/leads/config/apresentacao.ts), só depois da resposta.

export const FUSO_DA_ABORDAGEM = "America/Fortaleza"

// Gemini desligado: com a estrutura travada ele não acrescenta texto e custa latência e instabilidade (religar se entrar nicho com mais variação de nome e gancho).
export const GEMINI_NA_ABORDAGEM: boolean = false

// Faixas [de, ate) no horário local. Fora delas o botão não gera mensagem.
export const SAUDACOES = [
  { de: "08:00", ate: "12:00", texto: "Bom dia!" },
  { de: "12:00", ate: "18:00", texto: "Boa tarde!" },
  { de: "18:00", ate: "21:00", texto: "Boa noite!" },
] as const

// Mensagem 1: vai sozinha, antes da abertura. Curta desse jeito de propósito -
// é ela que faz a conversa começar como conversa, e não como anúncio.
export const MENSAGEM_DE_SAUDACAO = "{SAUDACAO} Tudo bem?"

export const LIMITES = {
  caracteres: 400,
  // Menos fotos que isso no perfil = lacuna "poucas_fotos"
  fotosMinimas: 5,
  // Até isso de avaliações = lacuna "pouca_avaliacao"
  avaliacoesPoucas: 3,
  // Se as últimas N mensagens abertas no WhatsApp usaram a mesma lacuna, tenta a
  // próxima lacuna do lead antes de repetir
  repeticaoMaxima: 5,
  // Chamadas ao Gemini antes do texto fixo: a primeira e um retry
  tentativasDoGemini: 2,
  // Análise de site mais velha que isso: abre o site de novo antes de decidir a
  // lacuna (o site pode ter voltado, ou o certificado ter sido renovado)
  diasParaReverificarSite: 3,
} as const

// Âncora sem pessoa, ou em nicho sem ancoraComPessoa. Verbo de busca, no
// imperfeito de quem estava procurando, não de quem foi atrás do negócio.
// Sem artigo: "a Igor Gurgel Advogados" e "o Barbearia do Zé" erram o gênero.
export const ANCORA_PADRAO = "Tava procurando {NEGOCIO} no Google"

// Mensagem 2: um parágrafo só, sem quebra de linha e sem dizer quem está
// falando - isso fica pra apresentação, depois da resposta. "Fiquei curioso" é
// o que transforma a observação em pergunta de quem quer saber, e não de quem
// está vendendo.
export const MENSAGEM_FIXA = "{ANCORA} e vi que {LACUNA}. Fiquei curioso: {PERGUNTA}"

// Marcas de texto de IA. Além destes caracteres, bloqueia linha em branco e mais
// de LIMITES_DE_LINHA.quebras quebras de linha.
export const MARCAS_DE_IA: readonly (readonly [trecho: string, nome: string])[] = [
  ["—", "travessão"],
  ["–", "meia-risca"],
  ["…", "reticências"],
  ["...", "reticências"],
]

// A abertura é um parágrafo só: nenhuma quebra de linha.
export const LIMITES_DE_LINHA = { quebras: 0 } as const

// Passo 2 (src/lib/leads/config/apresentacao.ts): três parágrafos separados por
// linha em branco, que é como se manda um texto longo no WhatsApp sem virar
// parede. São 4 quebras de linha, e a linha em branco, que na abertura é marca
// de IA, aqui é o formato.
export const LIMITES_DA_APRESENTACAO = { caracteres: 900, quebras: 4, linhaEmBranco: true } as const

// Grupos de TERMOS_BLOQUEADOS que valem só na abertura. Depois da resposta,
// dizer o que se faz é o assunto da mensagem, então "oferta" sai - e com ela o
// preço e o link, que são a mesma coisa. "permissao" sai junto porque a
// apresentação fecha convidando ("Posso te mandar um exemplo?"): numa conversa
// que a pessoa já respondeu duas vezes, isso é fechamento, não pedido de
// licença pra falar. Promessa de resultado e elogio continuam fora nas duas, e
// a trava do nicho também.
export const GRUPOS_SO_DA_ABERTURA: readonly string[] = ["oferta", "permissao"]

// Bloqueiam a mensagem, em qualquer nicho. Comparação sem acento e sem diferença
// de maiúsculas, a partir do início de uma palavra ("orçamentos" também bloqueia).
// O motivo registrado é "{grupo}:{termo}".
export const TERMOS_BLOQUEADOS = {
  // Verbo de oferta em 1ª pessoa, e preço/link, que também são oferta
  oferta: [
    "eu crio",
    "eu faço",
    "crio sites",
    "trabalho criando",
    "posso desenvolver",
    "posso criar",
    "faço sites",
    "monto",
    "desenvolvo",
    "orçamento",
    "R$",
    "http",
  ],
  // Fechamento pedindo permissão: pergunta de sim/não em que o silêncio é a
  // saída fácil, e trabalho de graça antes de existir interesse
  permissao: [
    "posso te mandar",
    "posso te mostrar",
    "posso mandar",
    "te mando",
    "te mostro",
    "quer que eu",
    "gostaria de ver",
    "se fizer sentido",
  ],
  // Promessa de resultado
  promessa: ["trazer cliente", "mais clientes", "novos clientes", "aumentar", "vai vender mais", "costuma trazer"],
  // Elogio
  elogio: ["excelente atendimento", "parabéns", "incrível", "adorei", "top"],
} as const satisfies Record<string, readonly string[]>

// Termos comparados como palavra inteira, não por início: por início eles pegam
// palavra inocente e bloqueiam em silêncio ("top" → "no topo do Google",
// "monto" → "montou", "te mando" → "te mandou", "te mostro" → "te mostrou").
export const TERMOS_DE_PALAVRA_INTEIRA: readonly string[] = ["top", "monto", "te mando", "te mostro"]

// Só num nicho. Advocacia: agendamento e avaliação de cliente como argumento
// soam como captação de clientela, que o código de ética da OAB restringe.
export const TERMOS_BLOQUEADOS_POR_NICHO: Partial<Record<string, readonly string[]>> = {
  advocacia: [
    "agendar consulta",
    "agendamento",
    "avalia bem",
    "avalia super bem",
    "avaliações ótimas",
    "boas avaliações",
  ],
}

// Uma mensagem só, 48h depois, se não houve resposta. Depois disso: perdido.
// Sem emoji, sem re-venda, sem portfólio; passa pela mesma validação de conteúdo.
export const FOLLOW_UP = {
  horasSemResposta: 48,
  texto: "Oi! Só confirmando se essa mensagem chegou.",
} as const
