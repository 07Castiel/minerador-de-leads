import { describe, expect, it } from "vitest"

import {
  chaveDaCidade,
  cidadesDaUrl,
  cidadesDoFunil,
  cidadesParaUrl,
  leadEstaNasCidades,
} from "@/lib/leads/filtroCidade"

const leads = (...cidades: (string | null)[]) => cidades.map((cidade) => ({ cidade }))

describe("chaveDaCidade", () => {
  it("ignora caixa, acento e espaço sobrando", () => {
    expect(chaveDaCidade("  São  Luís ")).toBe("sao luis")
    expect(chaveDaCidade("SOBRAL")).toBe("sobral")
  })

  it("trata aspas curvas como a reta", () => {
    expect(chaveDaCidade("Santa Bárbara d’Oeste")).toBe(chaveDaCidade("Santa Bárbara d'Oeste"))
  })
})

describe("cidadesDoFunil", () => {
  it("agrupa grafias da mesma cidade e mostra a mais comum", () => {
    const lista = cidadesDoFunil(leads("Sobral", "sobral", "Sobral", "SOBRAL "))
    expect(lista).toEqual([{ chave: "sobral", nome: "Sobral", total: 4 }])
  })

  it("ordena por quantidade e desempata por nome", () => {
    const lista = cidadesDoFunil(leads("Sobral", "Fortaleza", "Fortaleza", "Crato", "Barbalha"))
    expect(lista.map((c) => c.nome)).toEqual(["Fortaleza", "Barbalha", "Crato", "Sobral"])
  })

  it("ignora lead sem cidade", () => {
    expect(cidadesDoFunil(leads(null, "", "  ", "Sobral"))).toHaveLength(1)
  })
})

describe("cidadesDaUrl / cidadesParaUrl", () => {
  it("vai e volta", () => {
    const url = cidadesParaUrl(["sobral", "sao luis"])
    expect(url).toBe("sobral|sao luis")
    expect([...cidadesDaUrl(url)]).toEqual(["sobral", "sao luis"])
  })

  it("vazio some da URL", () => {
    expect(cidadesParaUrl([])).toBeNull()
    expect(cidadesDaUrl(null).size).toBe(0)
  })
})

describe("leadEstaNasCidades", () => {
  it("sem escolha, deixa todos passarem (inclusive sem cidade)", () => {
    expect(leadEstaNasCidades({ cidade: null }, new Set())).toBe(true)
    expect(leadEstaNasCidades({ cidade: "Sobral" }, new Set())).toBe(true)
  })

  it("com várias escolhidas, passa quem está em qualquer uma", () => {
    const escolhidas = new Set(["sobral", "fortaleza"])
    expect(leadEstaNasCidades({ cidade: "Sobral" }, escolhidas)).toBe(true)
    expect(leadEstaNasCidades({ cidade: "FORTALEZA" }, escolhidas)).toBe(true)
    expect(leadEstaNasCidades({ cidade: "Crato" }, escolhidas)).toBe(false)
  })

  it("com escolha ativa, lead sem cidade fica de fora", () => {
    expect(leadEstaNasCidades({ cidade: null }, new Set(["sobral"]))).toBe(false)
  })
})
