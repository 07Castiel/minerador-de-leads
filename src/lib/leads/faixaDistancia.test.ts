import { describe, expect, it } from "vitest"

import { faixaDeDistancia } from "@/lib/leads/faixaDistancia"

describe("faixaDeDistancia", () => {
  it("Faixa 1: Sobral, entorno e Serra da Ibiapaba", () => {
    expect(faixaDeDistancia("Sobral")).toBe(1)
    expect(faixaDeDistancia("Massapê")).toBe(1)
    expect(faixaDeDistancia("Santana do Acaraú")).toBe(1)
    expect(faixaDeDistancia("Tianguá")).toBe(1)
    expect(faixaDeDistancia("São Benedito")).toBe(1)
  })

  it("Faixa 2: 120 a 250 km", () => {
    expect(faixaDeDistancia("Fortaleza")).toBe(2)
    expect(faixaDeDistancia("Crateús")).toBe(2)
    expect(faixaDeDistancia("Acaraú")).toBe(2)
  })

  it("Faixa 3: as citadas acima de 250 km e qualquer outra", () => {
    expect(faixaDeDistancia("Juazeiro do Norte")).toBe(3)
    expect(faixaDeDistancia("Quixadá")).toBe(3)
    expect(faixaDeDistancia("São Paulo")).toBe(3)
    expect(faixaDeDistancia("Recife")).toBe(3)
  })

  it("ignora acento, caixa e espaços", () => {
    expect(faixaDeDistancia("  SANTANA DO ACARAU ")).toBe(1)
    expect(faixaDeDistancia("coreaú")).toBe(1)
  })

  it("sem cidade é Faixa 3", () => {
    expect(faixaDeDistancia(null)).toBe(3)
    expect(faixaDeDistancia("")).toBe(3)
    expect(faixaDeDistancia("   ")).toBe(3)
  })
})
