// Distância do lead até Sobral-CE, a base da Núcleo Tech. A lista exportada sai
// da Faixa 1 para a 3: o mais perto vem primeiro, porque é onde dá pra visitar.
//
// Cidade fora das listas cai na Faixa 3 ("acima de 250 km, e qualquer outra"),
// então o critério não atrapalha uma busca fora do Ceará: todo mundo vira 3 e a
// ordem original é mantida. É um viés de Sobral de propósito, e vive isolado
// aqui pra não vazar pro resto do minerador.

export type FaixaDeDistancia = 1 | 2 | 3

// Sem acento, minúsculas, apóstrofo unificado e espaços simples — o mesmo
// tratamento que o minerador dá a nome de cidade.
function normalizarCidade(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/['’´`]/g, "'")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim()
}

// Até 120 km: Sobral e o entorno, incluindo a Serra da Ibiapaba.
const FAIXA_1 = new Set(
  [
    "sobral",
    "coreau",
    "itapipoca",
    "massape",
    "santana do acarau",
    "meruoca",
    "carire",
    "groairas",
    "forquilha",
    // Serra da Ibiapaba
    "tiangua",
    "vicosa do ceara",
    "vicosa",
    "sao benedito",
    "ubajara",
  ].map(normalizarCidade)
)

// 120 a 250 km.
const FAIXA_2 = new Set(
  ["crateus", "caucaia", "fortaleza", "camocim", "itarema", "acarau"].map(normalizarCidade)
)

// Faixa da cidade. Sem cidade, ou cidade fora das listas, é Faixa 3.
export function faixaDeDistancia(cidade: string | null | undefined): FaixaDeDistancia {
  if (!cidade?.trim()) return 3
  const alvo = normalizarCidade(cidade)
  if (FAIXA_1.has(alvo)) return 1
  if (FAIXA_2.has(alvo)) return 2
  return 3
}

export const ROTULO_DA_FAIXA: Record<FaixaDeDistancia, string> = {
  1: "Faixa 1 — até 120 km",
  2: "Faixa 2 — 120 a 250 km",
  3: "Faixa 3 — acima de 250 km",
}
