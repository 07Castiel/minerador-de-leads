// Nome de pessoa dentro do nome do negócio no Google, quando dá pra afirmar que
// é uma pessoa: "LUIZ CARLOS SILVA ADVOCACIA" → "Luiz Carlos". Na dúvida, null
// (a mensagem cai no nome do negócio, que nunca erra).
//
// Três formas de reconhecer, nesta ordem:
// 1. título: "Dr. Iury Ribeiro", "Dra.Adriana Melo", "(Dr. Vicente Quesado)"
// 2. nome colado no sufixo: "Igor Gurgel Advogados", "Helton Mesquita & Advogados",
//    "Daniel Pereira Lima – Advogado", "Gilson Fontenele Sociedade Individual de Advocacia"
// 3. primeiro nome conhecido depois do sufixo ou sozinho num trecho:
//    "Advogado Helio Ximenes", "... | Hélio Nascimento Jr", "Viviane Pinheiro"
// Devolve primeiro nome + segundo termo ("Luiz Carlos"), nunca só sobrenome.

// Palavras do nome que marcam o negócio: o que vem antes delas costuma ser gente.
const SUFIXO = /^(advocacia|advogad[oa]s?|sociedade|escritorio)(?![\p{L}])/u

// Nunca fazem parte de nome de pessoa.
const GENERICOS = new Set([
  "advocacia", "advogado", "advogados", "advogada", "advogadas", "escritorio", "sociedade", "individual",
  "associados", "associadas", "consultoria", "assessoria", "juridica", "juridico", "juridicos", "direito",
  "group", "grupo", "especialista", "especializada", "especializado", "criminalista", "criminal", "trabalhista",
  "trabalhistas", "previdenciario", "previdenciaria", "empresarial", "familiarista", "bancario", "bancaria",
  "revisional", "civil", "tributario", "tributaria", "tributarista", "familia", "consumidor", "inss", "compliance",
  "centro", "nova", "novo",
])

// Conectores que podem ficar dentro de um nome ("Maria de Fátima").
const CONECTORES_DE_NOME = new Set(["de", "da", "do", "dos", "das"])
// Juntam sócios: "Machado e Fontenele", "Loiola & Siqueira" = escritório, não pessoa.
const CONECTORES_DE_SOCIOS = new Set(["&", "e"])

// Sobrenomes muito comuns que abrem nome de escritório ("Costa Filho Advogados").
const SOBRENOMES_COMUNS = new Set([
  "silva", "santos", "oliveira", "souza", "sousa", "rodrigues", "ferreira", "alves", "pereira", "lima", "gomes",
  "costa", "ribeiro", "martins", "carvalho", "almeida", "lopes", "soares", "fernandes", "vieira", "barbosa",
  "rocha", "dias", "nascimento", "andrade", "moreira", "nunes", "marques", "machado", "mendes", "freitas",
  "cardoso", "ramos", "goncalves", "santana", "teixeira", "moura", "castro", "azevedo", "araujo", "cavalcante",
  "cavalcanti", "melo", "mello", "monteiro", "pinto", "correia", "farias", "vasconcelos", "holanda", "linhares",
  "frota", "parente", "ximenes", "aguiar", "mesquita", "fontenele", "albuquerque", "amaral", "paiva", "loiola",
  "siqueira", "brandao", "braga", "duarte", "tabosa", "diniz", "torres", "dantas", "pinheiro", "bezerra",
  "sampaio", "feitosa", "magalhaes", "queiroz", "borges", "reis", "vaz", "neto", "filho", "junior",
])

// Primeiros nomes brasileiros comuns (sem acento). Só é exigido quando não há
// título nem sufixo que prove que é pessoa. Nome fora da lista = null, não erro.
const PRIMEIROS_NOMES = new Set([
  // femininos
  "adriana", "alana", "alessandra", "alice", "aline", "amanda", "ana", "andrea", "andreia", "andressa", "andreza",
  "angela", "antonia", "aparecida", "beatriz", "bianca", "bruna", "camila", "carla", "carolina", "caroline",
  "cecilia", "cintia", "cynthia", "clara", "claudia", "cristiane", "daiane", "daniela", "debora", "denise",
  "diana", "edna", "eduarda", "elaine", "eliana", "eliane", "elisa", "erica", "erika", "fabiana", "fatima",
  "fernanda", "flavia", "francisca", "gabriela", "gisele", "glaucia", "helena", "heloisa", "ingrid", "irene",
  "isabel", "isabela", "ivone", "janaina", "jaqueline", "jessica", "joana", "josefa", "joyce", "julia", "juliana",
  "karen", "karina", "katia", "kelly", "lais", "lara", "larissa", "laura", "leticia", "lidiane", "ligia", "lilian",
  "livia", "lorena", "luana", "lucia", "luciana", "luzia", "marcia", "mariana", "maria", "marina", "marlene",
  "marta", "michele", "milena", "monica", "naiana", "natalia", "nathalia", "nayana", "nayara", "neide", "paloma",
  "pamela", "patricia", "paula", "poliana", "priscila", "rafaela", "raimunda", "raquel", "rebeca", "regina",
  "renata", "rita", "roberta", "rosa", "rosana", "rosangela", "sabrina", "samara", "sandra", "sara", "sarah",
  "silvana", "silvia", "simone", "solange", "sonia", "suzana", "tamara", "tania", "tatiane", "tereza",
  "terezinha", "thais", "valeria", "vania", "vanessa", "vera", "virginia", "vitoria", "viviane", "yara", "yasmin",
  // masculinos
  "adalberto", "adriano", "alan", "allan", "alberto", "alex", "alexandre", "alisson", "alvaro", "anderson",
  "andre", "antonio", "arthur", "artur", "benedito", "bruno", "caio", "carlos", "cesar", "cicero", "claudio",
  "cleber", "cristiano", "daniel", "danilo", "dario", "davi", "david", "denis", "diego", "douglas", "edgar",
  "edilson", "edson", "eduardo", "elias", "emanuel", "emerson", "erick", "evandro", "everton", "fabio",
  "fabricio", "felipe", "fernando", "flavio", "francisco", "gabriel", "geraldo", "gilberto", "gilson", "glauber",
  "guilherme", "gustavo", "heitor", "helio", "henrique", "heverton", "hugo", "igor", "isaac", "iuri", "iury",
  "ivan", "jefferson", "joao", "joaquim", "jonas", "jonathan", "jorge", "jose", "josue", "juliano", "julio",
  "kleber", "leandro", "leonardo", "leonel", "levi", "luan", "lucas", "luciano", "lucio", "luis", "luiz",
  "manoel", "manuel", "marcelo", "marcio", "marcos", "mario", "mateus", "matheus", "mauricio", "mauro",
  "miguel", "moises", "murilo", "natan", "nathan", "nelson", "nicolas", "osvaldo", "otavio", "patrick", "paulo",
  "pedro", "rafael", "raimundo", "ramon", "raul", "regis", "reinaldo", "renan", "renato", "ricardo", "robson",
  "roberto", "rodolfo", "rodrigo", "rogerio", "romulo", "ronaldo", "rubens", "samuel", "sandro", "saulo",
  "sebastiao", "sergio", "silvio", "tarcisio", "thiago", "tiago", "tomas", "ulisses", "vagner", "valdir",
  "valter", "vanderlei", "vicente", "victor", "vinicius", "vitor", "wagner", "walter", "washington",
  "wellington", "wesley", "william", "willian", "wilson", "yuri",
])

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

type Contexto = { tudoMaiusculo: boolean }

function ehTokenDeNome(token: string, { tudoMaiusculo }: Contexto): boolean {
  if (!/^\p{Lu}[\p{L}'’]+$/u.test(token)) return false
  const normal = semAcento(token)
  if (GENERICOS.has(normal) || SUFIXO.test(normal)) return false
  // Sigla no meio de nome misto: "THB Advocacia", "BMI", "INSS"
  if (!tudoMaiusculo && token.length <= 4 && token === token.toUpperCase()) return false
  return true
}

function formatar(token: string): string {
  if (token !== token.toUpperCase()) return token
  const minusculo = token.toLocaleLowerCase("pt-BR")
  return minusculo.charAt(0).toLocaleUpperCase("pt-BR") + minusculo.slice(1)
}

// Primeiro nome + segundo termo; "Maria de Fátima" conta o conector.
function primeiroMaisSegundo(nomes: string[]): string {
  const [primeiro, segundo, terceiro] = nomes
  const partes =
    segundo && CONECTORES_DE_NOME.has(segundo) && terceiro
      ? [primeiro, segundo, terceiro]
      : segundo && !CONECTORES_DE_NOME.has(segundo)
        ? [primeiro, segundo]
        : [primeiro]
  return partes.map(formatar).join(" ")
}

// Sequência de nomes a partir de `inicio`, andando pra frente.
function nomesAPartirDe(tokens: string[], inicio: number, ctx: Contexto): string[] {
  const nomes: string[] = []
  for (let i = inicio; i < tokens.length; i++) {
    const token = tokens[i]
    if (ehTokenDeNome(token, ctx)) nomes.push(token)
    else if (CONECTORES_DE_NOME.has(token) && nomes.length > 0 && ehTokenDeNome(tokens[i + 1] ?? "", ctx)) {
      nomes.push(token)
    } else break
  }
  return nomes
}

function tokensDo(trecho: string): string[] {
  return trecho
    .replace(/&/g, " & ")
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}&]+/u, "").replace(/[.,:;!?]+$/u, ""))
    .filter(Boolean)
}

// "a | b", "a - b", "a – b", "a/b", "(b)", "a, b"
function trechosDo(nome: string): string[] {
  return nome
    .replace(/\s[-–—]+\s|[|/()[\],;·•]/g, "|")
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean)
}

function pessoaPorTitulo(nome: string, ctx: Contexto): string | null {
  for (const achado of nome.matchAll(/(?<![\p{L}])dra?(?:\.\s*|\s+)(?=\p{L})/giu)) {
    const depois = nome.slice((achado.index ?? 0) + achado[0].length)
    const nomes = nomesAPartirDe(tokensDo(trechosDo(depois)[0] ?? ""), 0, ctx)
    if (nomes.length > 0) return primeiroMaisSegundo(nomes)
  }
  return null
}

// Nomes imediatamente antes do sufixo. Se antes deles vier "&" ou "e", são sócios.
function pessoaAntesDoSufixo(tokens: string[], posicaoDoSufixo: number, ctx: Contexto): string | null {
  let fim = posicaoDoSufixo - 1
  // "Helton Mesquita & Advogados Associados"
  if (CONECTORES_DE_SOCIOS.has(semAcento(tokens[fim] ?? "")) && /^advogad/.test(semAcento(tokens[posicaoDoSufixo] ?? ""))) {
    fim--
  }
  let inicio = fim + 1
  while (inicio - 1 >= 0 && ehTokenDeNome(tokens[inicio - 1], ctx)) inicio--
  const nomes = tokens.slice(inicio, fim + 1)
  if (nomes.length < 2) return null
  const antes = semAcento(tokens[inicio - 1] ?? "")
  if (CONECTORES_DE_SOCIOS.has(antes)) return null
  if (SOBRENOMES_COMUNS.has(semAcento(nomes[0]))) return null
  return primeiroMaisSegundo(nomes)
}

function pessoaPorSufixo(trechos: string[][], ctx: Contexto): string | null {
  for (const [t, tokens] of trechos.entries()) {
    for (const [i, token] of tokens.entries()) {
      if (!SUFIXO.test(semAcento(token))) continue
      const pessoa = pessoaAntesDoSufixo(tokens, i, ctx)
      if (pessoa) return pessoa
    }
    // "Daniel Pereira Lima – Advogado": o sufixo abre o trecho seguinte
    const proximo = trechos[t + 1]?.[0]
    if (proximo && SUFIXO.test(semAcento(proximo))) {
      const pessoa = pessoaAntesDoSufixo([...tokens, proximo], tokens.length, ctx)
      if (pessoa) return pessoa
    }
  }
  return null
}

function comPrimeiroNomeConhecido(nomes: string[]): string | null {
  return nomes.length > 0 && PRIMEIROS_NOMES.has(semAcento(nomes[0])) ? primeiroMaisSegundo(nomes) : null
}

// "Advogado Helio Ximenes", "Advocacia Trabalhista e Previdenciária João Simplício"
function pessoaDepoisDoSufixo(trechos: string[][], ctx: Contexto): string | null {
  for (const tokens of trechos) {
    for (const [i, token] of tokens.entries()) {
      if (!SUFIXO.test(semAcento(token))) continue
      let j = i + 1
      while (j < tokens.length && (GENERICOS.has(semAcento(tokens[j])) || /^\p{Ll}/u.test(tokens[j]))) j++
      const pessoa = comPrimeiroNomeConhecido(nomesAPartirDe(tokens, j, ctx))
      if (pessoa) return pessoa
    }
  }
  return null
}

// Trecho que é só nome: "Viviane Pinheiro", "Hélio Nascimento Jr"
function pessoaSozinha(trechos: string[][], ctx: Contexto): string | null {
  for (const tokens of trechos) {
    const nomes = nomesAPartirDe(tokens, 0, ctx)
    if (nomes.length === tokens.length) {
      const pessoa = comPrimeiroNomeConhecido(nomes)
      if (pessoa) return pessoa
    }
  }
  return null
}

export function pessoaDoNome(nomeDoGoogle: string): string | null {
  // Alguns nomes vêm com acento decomposto ("a" + til combinante): sem isso,
  // "Gurjão" não passa como palavra.
  const nome = nomeDoGoogle.normalize("NFC")
  const ctx: Contexto = { tudoMaiusculo: nome === nome.toUpperCase() }
  const trechos = trechosDo(nome).map(tokensDo)
  return (
    pessoaPorTitulo(nome, ctx) ??
    pessoaPorSufixo(trechos, ctx) ??
    pessoaDepoisDoSufixo(trechos, ctx) ??
    pessoaSozinha(trechos, ctx)
  )
}
