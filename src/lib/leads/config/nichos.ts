// Nichos da primeira abordagem: como reconhecer pela categoria do Google e o
// que muda em cada um (pergunta, âncora, textos próprios).

import type { LacunaDaAbordagem } from "@/lib/leads/config/lacunas"

export type NichoDaAbordagem = {
  id: string
  // Nome do nicho na lista exportada do CRM; sem isso, vai a categoria do Google
  rotulo?: string
  // Trechos procurados na categoria do Google, sem acento e em minúsculas
  termos: readonly string[]
  // Texto fixo: o Gemini não reescreve
  pergunta: string
  // {CATEGORIA} da lacuna "pouca_avaliacao"; sem isso, a categoria em minúsculas
  termoDeBusca?: string
  // Consequência própria do nicho, no lugar da padrão da lacuna
  consequencias?: Partial<Record<LacunaDaAbordagem, string>>
  // Âncora quando o nome do negócio tem uma pessoa ({PESSOA}); sem isso, ANCORA_PADRAO
  ancoraComPessoa?: string
}

// Ordem importa: vale o primeiro nicho com algum termo na categoria.
export const NICHOS: readonly NichoDaAbordagem[] = [
  {
    id: "advocacia",
    rotulo: "Advocacia",
    termos: ["advog", "advocacia", "juridic", "direito"],
    pergunta:
      "Hoje quem te procura pelo Google cai direto no WhatsApp, ou tem algum lugar onde a pessoa vê as áreas de atuação antes?",
    termoDeBusca: "advogado",
    // Sem "Dr."/"Dra.": no banco tem "Dr. Joana D'arc", então nem o título do
    // próprio nome garante o gênero. "de {PESSOA}" não precisa de artigo.
    ancoraComPessoa: "Vi o escritório de {PESSOA} no Google{LOCAL}",
    consequencias: {
      // RASCUNHO: as padrões falam de preço e "o que tem", tom de comércio. Revisar.
      sem_site: "quem encontra o escritório por lá só tem o telefone pra decidir se entra em contato",
      poucas_fotos: "quem ainda não conhece o escritório tem pouco pra criar confiança antes de chamar",
    },
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
    ],
    pergunta:
      "Como vocês tocam as encomendas hoje? Pergunto porque isso normalmente vira muita conversa repetida no dia.",
  },
  {
    id: "agendamento",
    termos: ["salao", "cabeleireir", "barbearia", "clinica", "oficina", "mecanica"],
    pergunta:
      "Os agendamentos ficam tudo no WhatsApp? Pergunto porque nesse ramo é onde mais se perde horário.",
  },
  {
    id: "varejo",
    rotulo: "Varejo",
    termos: ["loja", "varejo", "boutique"],
    pergunta: "Quando alguém pergunta preço, você manda foto na hora ou tem uma lista pronta?",
  },
]

export const NICHO_PADRAO: NichoDaAbordagem = {
  id: "outros",
  termos: [],
  pergunta: "Faz sentido isso pra vocês?",
}

// {CATEGORIA} quando nem o nicho nem o lead têm um termo
export const TERMO_DE_BUSCA_PADRAO = "o que vocês fazem"
