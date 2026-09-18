// Nichos da primeira abordagem: como reconhecer e o que muda em cada um
// (pergunta, âncora, lacunas que valem).
//
// Resolução, parando na primeira que casar (src/lib/leads/abordagem.ts):
// 1. categoria do Google com algum termo de um nicho;
// 2. termo da busca que trouxe o lead (buscas.nicho), só quando a categoria
//    não diz o ramo (vazia ou em CATEGORIAS_GENERICAS). Categoria específica
//    fora do mapa nunca é sobrescrita pela busca;
// 3. NICHO_PADRAO.

export type NichoDaAbordagem = {
  id: string
  // Nome do nicho na lista exportada do CRM; sem isso, vai a categoria do Google
  rotulo?: string
  // Trechos procurados na categoria (ou no termo da busca), sem acento e em minúsculas
  termos: readonly string[]
  // Texto fixo: o Gemini não reescreve. Entra depois de "Fiquei curioso:", então
  // começa em minúscula. É pergunta de sim ou não de propósito: o "sim" é o
  // gancho da apresentação, e quem responde "não" já diz o que faz em vez disso.
  pergunta: string
  // Poucas fotos e pouca avaliação só servem de gancho em comércio
  comercio?: boolean
  // Âncora quando o nome do negócio tem uma pessoa ({PESSOA}); sem isso, ANCORA_PADRAO
  ancoraComPessoa?: string
}

// Ordem importa: vale o primeiro nicho com algum termo.
export const NICHOS: readonly NichoDaAbordagem[] = [
  {
    id: "advocacia",
    rotulo: "Advocacia",
    termos: ["advog", "advocacia", "juridic", "direito"],
    pergunta: "quem te procura chega direto aqui pelo WhatsApp?",
    // Sem "Dr."/"Dra.": no banco tem "Dr. Joana D'arc", então nem o título do
    // próprio nome garante o gênero. "de {PESSOA}" não precisa de artigo.
    ancoraComPessoa: "Tava procurando o escritório de {PESSOA} no Google",
  },
  {
    id: "alimentacao",
    rotulo: "Alimentação",
    termos: [
      "restaurante",
      "lanche",
      "lanchonete",
      "doce",
      "confeitaria",
      "padaria",
      "pizzaria",
      "hamburgueria",
      "acai",
      "sorveteria",
      "cafeteria",
      "bolo",
      "salgado",
      "marmita",
      // "Delivery de Pizza" (cobre "Pizzaria" também)
      "pizza",
    ],
    pergunta: "as encomendas que não são feitas no balcão chegam todas aqui pelo WhatsApp?",
    comercio: true,
  },
  {
    id: "agendamento",
    termos: [
      "salao",
      "cabeleireir",
      "barbearia",
      "clinica",
      "oficina",
      "mecanica",
      // Dentista, Cirurgião dentista, Ortodontista
      "dentist",
      "ortodont",
      // Manicure e depilação: mesma agenda de horário marcado
      "manicure",
      "depilacao",
      // Serviço de carro que trabalha por hora marcada, como a oficina
      "mecanico",
      "borracharia",
      "funilaria",
      "lava-rapido",
      "lava rapido",
      "pneu",
    ],
    pergunta: "os horários que vocês marcam chegam todos aqui pelo WhatsApp?",
    comercio: true,
  },
  {
    id: "varejo",
    rotulo: "Varejo",
    // Material de construção vende por balcão e orçamento, como o resto do varejo
    termos: ["loja", "varejo", "boutique", "construcao", "construtora", "deposito", "fabricante"],
    pergunta: "quando perguntam preço, vocês mandam foto uma por uma aqui?",
    comercio: true,
  },
]

export const NICHO_PADRAO: NichoDaAbordagem = {
  id: "outros",
  termos: [],
  pergunta: "é tudo por aqui mesmo?",
}

// Categorias do Google que não dizem o ramo (comparadas sem acento e em minúsculas).
// Nelas vale o termo da busca. Os 7 "Escritório da empresa" de hoje vieram da busca "Advogado".
export const CATEGORIAS_GENERICAS: readonly string[] = [
  "escritorio da empresa",
  "escritorio",
  "empresa",
  "prestador de servicos",
  "servicos",
]
