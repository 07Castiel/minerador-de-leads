// Mensagem 3: a apresentação, que só vai depois que o lead responde a abertura.
// É aqui, e só aqui, que o serviço e a empresa aparecem.
//
// Por que separada (src/lib/leads/config/limites.ts): na primeira mensagem,
// falar do que se vende é o que faz o número virar spam. Depois da resposta a
// conversa está aberta e a pessoa perguntou, na prática, "quem é você e o que
// você quer" - não responder isso é que seria estranho.
//
// Três parágrafos separados por linha em branco, na ordem:
// 1. ABERTURA_DA_APRESENTACAO: quem está falando e o que a empresa faz;
// 2. o do nicho: como funcionaria no ramo daquele lead, do lado de quem compra
//    e do lado de quem toca o negócio;
// 3. FECHAMENTO_DA_APRESENTACAO: sob medida, e o convite.
//
// Só o parágrafo do meio muda de nicho pra nicho: é a mesma pessoa falando da
// mesma empresa, e é só o exemplo que precisa ser o do ramo de quem lê.

// Muda em um lugar só.
export const REMETENTE = {
  nome: "Leonardo",
  empresa: "Núcleo Tech",
  cidade: "Sobral",
} as const

export const ABERTURA_DA_APRESENTACAO = `Entendi! Deixa eu me apresentar: sou o ${REMETENTE.nome}, da ${REMETENTE.empresa}. A gente cria sistemas sob medida pra negócios como o de vocês.`

// "Posso te mandar" é pedido de permissão, que a abertura bloqueia. Aqui vale:
// a pessoa já respondeu duas vezes, e a essa altura perguntar é fechar, não
// pedir licença pra falar.
export const FECHAMENTO_DA_APRESENTACAO =
  "E não é modelo pronto, eu monto do jeito que funciona pra rotina de vocês. Posso te mandar um exemplo rapidinho pra você ver como fica?"

export type ApresentacaoDoNicho = {
  // Entra em "Pra {RAMO} funcionaria assim". Só é usado quando a categoria do
  // Google não serve (vazia ou genérica); com categoria, vale a do lead, que é
  // mais específica: "Pra pizzaria", "Pra loja de material de construção".
  ramo: string
  // O parágrafo do meio, sem o "Pra {RAMO} funcionaria assim:" na frente.
  // Duas metades: o que o cliente do lead faz, e o painel de quem toca o negócio.
  comoFunciona: string
}

// Chave = NichoDaAbordagem.id (src/lib/leads/config/nichos.ts).
export const APRESENTACAO_POR_NICHO: Record<string, ApresentacaoDoNicho> = {
  alimentacao: {
    ramo: "quem vende comida",
    comoFunciona:
      "o cliente acessa um cardápio online, monta a encomenda e ela já chega prontinha aqui no WhatsApp, sem aquele vai e vem de mensagem. Por trás, vocês têm um painel pra controlar pedidos, caixa e financeiro num lugar só.",
  },
  agendamento: {
    ramo: "quem atende com hora marcada",
    comoFunciona:
      "o cliente vê os serviços com preço, escolhe um horário que está livre e a reserva já chega prontinha aqui no WhatsApp, sem aquele vai e vem pra achar encaixe. Por trás, vocês têm um painel com a agenda do dia, os clientes e o caixa num lugar só.",
  },
  varejo: {
    ramo: "quem vende no balcão",
    comoFunciona:
      "o cliente abre um catálogo com a foto e o preço de cada produto, monta o pedido e ele já chega prontinho aqui no WhatsApp, sem você mandar foto uma por uma. Por trás, vocês têm um painel pra controlar pedidos, estoque e caixa num lugar só.",
  },
  // A OAB restringe captação de clientela, não informação. Por isso este é o
  // único parágrafo que não fala de pedido, preço nem caixa: do lado de fora,
  // área de atuação e formação; do lado de dentro, o trabalho do escritório.
  advocacia: {
    ramo: "advocacia",
    comoFunciona:
      "quem te procura vê suas áreas de atuação e sua formação antes de chamar, então chega aqui já sabendo o que você faz. Por trás, você tem um painel pra acompanhar processos, prazos e clientes num lugar só.",
  },
}

// Nicho sem entrada acima (inclusive NICHO_PADRAO).
export const APRESENTACAO_PADRAO: ApresentacaoDoNicho = {
  ramo: "um negócio como o de vocês",
  comoFunciona:
    "o cliente vê o que vocês fazem, os preços e o horário, e o contato já chega prontinho aqui no WhatsApp. Por trás, vocês têm um painel pra controlar pedidos, caixa e financeiro num lugar só.",
}

export const PARAGRAFO_DO_NICHO = "Pra {RAMO} funcionaria assim: {COMO_FUNCIONA}"
