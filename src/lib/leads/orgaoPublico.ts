// Órgão público e instituição de ensino: quem não pode contratar sem licitação,
// ou é clínica-escola de universidade, não vira lead. O minerador descarta na
// entrada (com o motivo) e a lista exportada pula por segurança, caso um desses
// já tenha sido importado à mão.
//
// A checagem é conservadora de propósito: um falso positivo (descartar um
// negócio privado) é pior que um falso negativo (deixar passar um público, que
// ainda pode ser tirado à mão). Por isso:
// - frases só batem como trecho de palavras inteiras ("posto de saude"), nunca
//   dentro de outra palavra;
// - siglas curtas ("UBS", "CEO") só batem como palavra inteira, e as ambíguas
//   demais ("UVA" também é fruta, "USP" é rara aqui) ficam de fora — a versão
//   por extenso ("universidade") cobre o caso real sem o risco.

// Normaliza para comparar: sem acento, minúsculas, e qualquer coisa que não seja
// letra ou número vira espaço (hífen, "/", ".", "|"). Assim "Clínica-Escola" e
// "U.B.S." caem em palavras separadas e batem com os termos.
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

type GrupoDeOrgao = {
  motivo: string
  // Trechos de palavras inteiras: "posto de saude" bate em "posto de saude
  // central", nunca em "reposto".
  frases: readonly string[]
  // Palavra inteira só: siglas que dentro de outra palavra dariam falso positivo.
  siglas?: readonly string[]
}

// Ordem importa: vale o motivo do primeiro grupo que bater.
const GRUPOS: readonly GrupoDeOrgao[] = [
  {
    motivo: "órgão público",
    frases: [
      "prefeitura",
      "camara municipal",
      "camara de vereadores",
      "camara dos vereadores",
      "secretaria municipal",
      "secretaria de estado",
      "secretaria de saude",
      "secretaria de educacao",
      "governo do estado",
      "governo municipal",
      "ministerio publico",
      "defensoria publica",
      "tribunal de justica",
      "poder judiciario",
      "detran",
      "cartorio",
    ],
  },
  {
    motivo: "unidade de saúde pública",
    frases: [
      "posto de saude",
      "unidade basica de saude",
      "unidade de saude",
      "unidade de pronto atendimento",
      "policlinica",
      "hospital municipal",
      "hospital estadual",
      "hospital regional",
      "hospital geral",
      "hospital universitario",
      "hospital das clinicas",
      "hospital e maternidade",
      "maternidade escola",
      "centro de especialidades odontologicas",
      "centro de saude",
      "centro de atencao psicossocial",
      "sistema unico de saude",
    ],
    // CEO = Centro de Especialidades Odontológicas (unidade do SUS).
    siglas: ["ubs", "upa", "caps", "samu", "sus", "ceo"],
  },
  {
    motivo: "instituição de ensino",
    frases: [
      "universidade",
      "faculdade",
      "instituto federal",
      "escola tecnica estadual",
      "clinica escola",
      "centro universitario",
    ],
    // Universidades locais do Ceará (clínicas-escola). "UVA" e "URCA" ficam de
    // fora por serem ambíguas demais como palavra solta; a forma por extenso
    // ("universidade") cobre o caso.
    siglas: ["uninta", "unifor", "uece", "uespi", "ifce"],
  },
]

// Motivo do descarte, ou null quando não é órgão público nem instituição de
// ensino. Olha nome e categoria do Google.
export function motivoOrgaoPublico(nome: string, categoria: string | null = null): string | null {
  // Espaço nas pontas: assim " prefeitura " bate no começo e no fim do texto,
  // e todo termo fica cercado de espaço (palavra inteira).
  const alvo = ` ${normalizar([nome, categoria ?? ""].join(" "))} `
  for (const grupo of GRUPOS) {
    const termos = [...grupo.frases, ...(grupo.siglas ?? [])]
    if (termos.some((termo) => alvo.includes(` ${termo} `))) return grupo.motivo
  }
  return null
}
