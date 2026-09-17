// Limites e formato da primeira abordagem: horário, números, estrutura da
// mensagem, termos que bloqueiam o envio e o follow-up.

export const FUSO_DA_ABORDAGEM = "America/Fortaleza"

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

// Bloqueiam a mensagem. Comparação sem acento e sem diferença de maiúsculas,
// a partir do início de uma palavra ("orçamentos" também bloqueia).
export const TERMOS_DE_OFERTA = ["eu crio", "eu faço", "posso desenvolver", "orçamento", "R$", "http"] as const
export const TERMOS_DE_ELOGIO = ["parabéns", "incrível", "adorei"] as const

// Uma mensagem só, 48h depois, se não houve resposta. Depois disso: perdido.
export const FOLLOW_UP = {
  horasSemResposta: 48,
  texto: "Oi! Só confirmando se essa mensagem chegou 👍",
} as const
