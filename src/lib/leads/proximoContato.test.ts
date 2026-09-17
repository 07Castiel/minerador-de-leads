import { describe, expect, it } from "vitest"

import {
  dataLocalIso,
  descreverRetorno,
  diasEntre,
  retornoPendente,
  situacaoDoRetorno,
  somarDias,
} from "@/lib/leads/proximoContato"

describe("proximoContato", () => {
  it("data local no formato da coluna", () => {
    expect(dataLocalIso(new Date(2026, 8, 7, 23, 59))).toBe("2026-09-07")
  })

  it("soma dias atravessando mês e ano", () => {
    expect(somarDias("2026-09-29", 3)).toBe("2026-10-02")
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01")
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28")
    expect(diasEntre("2026-09-17", "2026-09-24")).toBe(7)
  })

  it("situação e texto do retorno", () => {
    const hoje = "2026-09-17" // quinta
    expect(situacaoDoRetorno("2026-09-15", hoje)).toBe("atrasado")
    expect(situacaoDoRetorno(hoje, hoje)).toBe("hoje")
    expect(situacaoDoRetorno("2026-09-18", hoje)).toBe("futuro")

    expect(descreverRetorno("2026-09-14", hoje)).toBe("Atrasado 3 dias")
    expect(descreverRetorno("2026-09-16", hoje)).toBe("Era pra ontem")
    expect(descreverRetorno(hoje, hoje)).toBe("Retornar hoje")
    expect(descreverRetorno("2026-09-18", hoje)).toBe("Retornar amanhã")
    expect(descreverRetorno("2026-09-21", hoje)).toBe("Retornar seg, 21/09")
    expect(descreverRetorno("2026-10-02", hoje)).toBe("Retornar 02/10")
  })

  it("pendente = hoje ou atrasado", () => {
    expect(retornoPendente("2026-09-10", "2026-09-17")).toBe(true)
    expect(retornoPendente("2026-09-17", "2026-09-17")).toBe(true)
    expect(retornoPendente("2026-09-18", "2026-09-17")).toBe(false)
    expect(retornoPendente(null, "2026-09-17")).toBe(false)
  })
})
