import { describe, expect, it } from "vitest"

import { motivoOrgaoPublico } from "@/lib/leads/orgaoPublico"

describe("motivoOrgaoPublico", () => {
  it("órgão público pelo nome", () => {
    expect(motivoOrgaoPublico("Prefeitura Municipal de Sobral")).toBe("órgão público")
    expect(motivoOrgaoPublico("Câmara de Vereadores de Meruoca")).toBe("órgão público")
    expect(motivoOrgaoPublico("Secretaria Municipal de Saúde")).toBe("órgão público")
    expect(motivoOrgaoPublico("Cartório Ferreira Gomes")).toBe("órgão público")
  })

  it("unidade de saúde pública", () => {
    expect(motivoOrgaoPublico("Posto de Saúde do Junco")).toBe("unidade de saúde pública")
    expect(motivoOrgaoPublico("UBS Sinhá Sabóia")).toBe("unidade de saúde pública")
    expect(motivoOrgaoPublico("Policlínica Regional Norte")).toBe("unidade de saúde pública")
    expect(motivoOrgaoPublico("Hospital Municipal de Cariré")).toBe("unidade de saúde pública")
    expect(motivoOrgaoPublico("CEO - Centro de Especialidades Odontológicas")).toBe("unidade de saúde pública")
    // Sigla CEO sozinha também
    expect(motivoOrgaoPublico("CEO Sobral")).toBe("unidade de saúde pública")
  })

  it("instituição de ensino e clínica-escola", () => {
    expect(motivoOrgaoPublico("Universidade Estadual Vale do Acaraú")).toBe("instituição de ensino")
    expect(motivoOrgaoPublico("Clínica-Escola de Odontologia UNINTA")).toBe("instituição de ensino")
    expect(motivoOrgaoPublico("Faculdade Luciano Feijão")).toBe("instituição de ensino")
    expect(motivoOrgaoPublico("Clínica de Fisioterapia", "Centro universitário")).toBe("instituição de ensino")
  })

  it("olha também a categoria do Google", () => {
    expect(motivoOrgaoPublico("Atendimento", "Prefeitura")).toBe("órgão público")
    expect(motivoOrgaoPublico("Unidade Central", "Posto de saúde")).toBe("unidade de saúde pública")
  })

  it("negócio privado passa (null)", () => {
    expect(motivoOrgaoPublico("Clínica Odontológica Dr. Iury")).toBeNull()
    expect(motivoOrgaoPublico("AJ Odontologia")).toBeNull()
    expect(motivoOrgaoPublico("Barbearia do Zé")).toBeNull()
    expect(motivoOrgaoPublico("Hospital do Coração São Camilo")).toBeNull()
    expect(motivoOrgaoPublico("Escritório Advocacia Silva")).toBeNull()
  })

  it("não bate dentro de outra palavra nem em sigla ambígua", () => {
    // "reposto", "susana", "ubslândia" (inventado) não podem casar por substring
    expect(motivoOrgaoPublico("Loja Reposto Peças")).toBeNull()
    expect(motivoOrgaoPublico("Salão da Susana")).toBeNull()
    // "UVA" é fruta também: só a forma por extenso descarta
    expect(motivoOrgaoPublico("Adega da Uva")).toBeNull()
  })
})
