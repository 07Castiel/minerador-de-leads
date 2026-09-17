// Limites e formato da primeira abordagem: horário, números, estrutura da
// mensagem, termos que bloqueiam o envio e o follow-up.

export const FUSO_DA_ABORDAGEM = "America/Fortaleza"

// Gemini desligado: com a estrutura travada ele não acrescenta texto e custa latência e instabilidade (religar se entrar nicho com mais variação de nome e gancho).
export const GEMINI_NA_ABORDAGEM: boolean = false

// Faixas [de, ate) no horário local. Fora delas o botão não gera mensagem.
// Sem "?" de propósito: a mensagem só pode ter a pergunta do nicho.
export const SAUDACOES = [
  { de: "08:00", ate: "12:00", texto: "Bom dia!" },
  { de: "12:00", ate: "18:00", texto: "Boa tarde!" },
  { de: "18:00", ate: "21:00", texto: "Boa noite!" },
] as const

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
} as const

// Âncora sem pessoa, ou em nicho sem ancoraComPessoa. Verbo de busca ("procurei
// e achei") em vez de constatação. Sem artigo: "a Igor Gurgel Advogados" e
// "o Barbearia do Zé" erram o gênero.
export const ANCORA_PADRAO = "Procurei {NEGOCIO} no Google e achei"

// Duas quebras de linha no máximo, sem linha em branco, sem travessão: é assim
// que se escreve no WhatsApp.
export const MENSAGEM_FIXA = "{SAUDACAO} Aqui é o Leonardo, de Sobral.\n{ANCORA}, mas {LACUNA}.\n{PERGUNTA}"

// Marcas de texto de IA. Além destes caracteres, bloqueia linha em branco e mais
// de LIMITES_DE_LINHA.quebras quebras de linha.
export const MARCAS_DE_IA: readonly (readonly [trecho: string, nome: string])[] = [
  ["—", "travessão"],
  ["–", "meia-risca"],
  ["…", "reticências"],
  ["...", "reticências"],
]

export const LIMITES_DE_LINHA = { quebras: 2 } as const

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
