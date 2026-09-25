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
  // Pergunta para o lead de reputação alta (4,8+ e muitas avaliações), quando
  // não há lacuna nenhuma. Aqui o ângulo muda: quem já capta bem não é abordado
  // pelo agendamento, e sim por como o cliente decide antes de chegar. Só os
  // nichos com este campo geram esse gancho; sem ele, o lead segue descartado.
  perguntaReputacao?: string
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
    id: "saude",
    rotulo: "Saúde",
    // Vem antes de "agendamento" de propósito: "Clínica odontológica" e
    // "Dentista" casavam com "clinica"/"dentist" lá e herdavam comercio: true,
    // que libera foto e avaliação como gancho. São 80 leads no banco (o segundo
    // maior grupo, depois de beleza), e hoje 5 deles cairiam nesse gancho.
    // A agenda é a mesma de uma barbearia; o que não é igual é o que se pode
    // usar de argumento: CFM, CFO e CFP restringem publicidade que se apoie em
    // avaliação e depoimento de paciente, como a OAB faz com a captação.
    // Sem "clinica" e sem "medico" soltos: "Clínica de estética" continua em
    // agendamento, e uma loja de produtos médicos não vira consultório.
    termos: [
      "clinica medica",
      "clinica odontologica",
      "odontolog",
      "dentist",
      "ortodont",
      "fisioterap",
      "psicolog",
      "psiquiatr",
      "nutricion",
      "consultorio",
      "laboratorio de analises",
      "pediatr",
      "dermatolog",
      "oftalmolog",
    ],
    // Sem "consulta" e sem citar avaliação: a pergunta é sobre o caminho de
    // quem procura, não sobre a reputação de quem atende.
    pergunta: "quem precisa marcar um horário com vocês resolve tudo por aqui?",
    // Reputação forte quer dizer que o consultório já capta paciente: a pergunta
    // deixa de ser sobre a agenda e passa a ser sobre a decisão de quem chega.
    // Sem citar avaliação como elogio ("boas avaliações" é vedado): a observação
    // é o número arredondado, e a pergunta é sobre a pesquisa do paciente.
    perguntaReputacao: "quem chega até vocês costuma pesquisar bastante antes de escolher?",
    // Sem comercio: foto e avaliação não entram como gancho neste nicho.
    // "o consultório de {PESSOA}": o substantivo carrega o gênero, então
    // "Dra. Joana" e "Dr. João" saem certos, igual ao escritório da advocacia.
    ancoraComPessoa: "Tava procurando o consultório de {PESSOA} no Google",
  },
  {
    id: "pet",
    rotulo: "Pet",
    // Antes de "saude" e de "agendamento": "Clínica veterinária" casaria com
    // "clinica" lá, e o dono de pet shop não é médico de gente - a trava dos
    // conselhos não se aplica, e foto do bichinho é gancho legítimo.
    // "pet" solto não dá: "tapete" e "carpete" contêm "pet".
    termos: ["pet shop", "petshop", "veterinari", "banho e tosa", "agropecuari"],
    pergunta: "quem quer marcar um banho e tosa chega aqui pelo WhatsApp?",
    comercio: true,
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
      // "cafe" no lugar de "cafeteria": cobre as duas, e "Café" sozinho (1 lead
      // no banco) caía em "outros" só por causa da terminação.
      "cafe",
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
      // Dentista e ortodontista saíram daqui para o nicho "saude": o que muda
      // não é a agenda marcada, é o que pode virar argumento (ver lá).
      // Manicure e depilação: mesma agenda de horário marcado
      "manicure",
      "depilacao",
      // Serviço de carro que trabalha por hora marcada, como a oficina
      "mecanico",
      "borracharia",
      "funilaria",
      "lava-rapido",
      "lava rapido",
      // Mesmo negócio, o outro nome: "Lava-jato" está nas sugestões da busca
      "lava-jato",
      "lava jato",
      "pneu",
    ],
    pergunta: "os horários que vocês marcam chegam todos aqui pelo WhatsApp?",
    comercio: true,
  },
  {
    id: "fitness",
    rotulo: "Academia",
    // "estudio" solto ficaria com "Estúdio de tatuagem", que não vende plano.
    termos: ["academia", "pilates", "crossfit", "musculacao", "personal trainer", "estudio de pilates"],
    pergunta: "quem quer conhecer os planos de vocês chega aqui pelo WhatsApp?",
    comercio: true,
  },
  {
    id: "educacao",
    rotulo: "Educação",
    // "escola" pega "Autoescola" e "Pré-escola"; "curso" pega "Curso de inglês"
    // e também "Preparatório para concursos", que é ensino do mesmo jeito.
    termos: ["escola", "curso", "idiomas", "creche", "bercario", "reforco escolar"],
    // Sem comercio: numa escola, "quase não tem avaliação" é gancho ruim - a
    // matrícula é decisão de pai, e a reputação é assunto sensível.
    pergunta: "quem procura vaga chega aqui pelo WhatsApp?",
  },
  {
    id: "hospedagem",
    rotulo: "Hospedagem",
    termos: ["hotel", "pousada", "hostel", "chale", "resort"],
    pergunta: "as reservas de vocês chegam todas aqui pelo WhatsApp?",
    comercio: true,
  },
  {
    id: "imobiliario",
    rotulo: "Imobiliário",
    // "imovei"/"imovel", nunca "movei": "Loja de móveis" é varejo.
    termos: ["imobiliaria", "corretor de imovei", "imovei", "imovel", "incorporadora"],
    // Sem ancoraComPessoa: "o corretor {PESSOA}" erra o gênero, e não existe
    // substantivo neutro pra carregar o nome como "o escritório de".
    pergunta: "quem se interessa por um imóvel chega aqui pelo WhatsApp?",
    comercio: true,
  },
  {
    id: "servico_tecnico",
    // Sem rotulo: junta ramos diferentes demais pra virar uma linha só na
    // lista exportada, igual a "agendamento".
    termos: [
      "chaveiro",
      "eletricista",
      "encanador",
      "dedetiz",
      "assistencia tecnica",
      "refrigeracao",
      "ar condicionado",
      "vidracaria",
      "serralheria",
    ],
    // Sem comercio: um chaveiro sem foto no perfil não é gancho - ninguém
    // escolhe chaveiro por foto.
    pergunta: "quando precisam de vocês, o chamado chega aqui pelo WhatsApp?",
  },
  {
    id: "varejo",
    rotulo: "Varejo",
    // Material de construção vende por balcão e orçamento, como o resto do varejo
    termos: [
      "loja",
      "varejo",
      // O Google devolve as duas grafias; só com "boutique" o "Butique" (1 lead
      // no banco) ficava em "outros".
      "boutique",
      "butique",
      "construcao",
      "construtora",
      "deposito",
      "fabricante",
    ],
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
