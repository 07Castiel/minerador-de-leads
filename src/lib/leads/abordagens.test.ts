import { describe, expect, it, vi } from "vitest"

import { motivoBloqueioDe, registrarAbordagens, ultimasLacunasDaOrg } from "@/lib/leads/abordagens"

// Cliente falso que anota a consulta montada e devolve o que o teste mandar.
// O contrato real é conferido pela tipagem (SupabaseClient<Database>) e pela
// exportação de teste, que grava e lê no banco de verdade.
function clienteFalso(resposta: { data?: unknown; error?: unknown }) {
  const chamadas: [string, unknown[]][] = []
  const consulta: Record<string, unknown> = {}
  for (const metodo of ["select", "eq", "not", "order", "limit", "insert"]) {
    consulta[metodo] = vi.fn((...args: unknown[]) => {
      chamadas.push([metodo, args])
      return metodo === "limit" || metodo === "insert" ? Promise.resolve(resposta) : consulta
    })
  }
  const from = vi.fn((tabela: string) => {
    chamadas.push(["from", [tabela]])
    return consulta
  })
  return { cliente: { from } as never, chamadas }
}

describe("ultimasLacunasDaOrg", () => {
  it("lê as últimas primeiras abordagens com lacuna, da mais nova pra mais velha", async () => {
    const { cliente, chamadas } = clienteFalso({
      data: [{ lacuna: "poucas_fotos" }, { lacuna: "sem_site" }],
      error: null,
    })
    expect(await ultimasLacunasDaOrg(cliente)).toEqual(["poucas_fotos", "sem_site"])
    expect(chamadas).toEqual([
      ["from", ["abordagens"]],
      ["select", ["lacuna"]],
      ["eq", ["tipo", "primeira"]],
      ["not", ["lacuna", "is", null]],
      ["order", ["criado_em", { ascending: false }]],
      ["limit", [5]],
    ])
  })

  it("respeita o limite pedido e a lista vazia", async () => {
    const { cliente, chamadas } = clienteFalso({ data: [], error: null })
    expect(await ultimasLacunasDaOrg(cliente, 2)).toEqual([])
    expect(chamadas.at(-1)).toEqual(["limit", [2]])
  })

  it("erro do banco não vira lista vazia silenciosa", async () => {
    const { cliente } = clienteFalso({ data: null, error: new Error("sem permissão") })
    await expect(ultimasLacunasDaOrg(cliente)).rejects.toThrow("sem permissão")
  })
})

describe("registrarAbordagens", () => {
  const registro = {
    lead_id: "11111111-1111-1111-1111-111111111111",
    tipo: "primeira",
    lacuna: "sem_site",
    nicho: "advocacia",
    texto: "Bom dia!",
    origem: "exportacao",
  } as const

  it("insere todas de uma vez", async () => {
    const { cliente, chamadas } = clienteFalso({ error: null })
    await registrarAbordagens(cliente, [registro, { ...registro, lead_id: "2" }])
    expect(chamadas).toEqual([
      ["from", ["abordagens"]],
      ["insert", [[registro, { ...registro, lead_id: "2" }]]],
    ])
  })

  it("lista vazia não chama o banco", async () => {
    const { cliente, chamadas } = clienteFalso({ error: null })
    await registrarAbordagens(cliente, [])
    expect(chamadas).toEqual([])
  })

  it("erro do banco sobe", async () => {
    const { cliente } = clienteFalso({ error: new Error("violou a política") })
    await expect(registrarAbordagens(cliente, [registro])).rejects.toThrow("violou a política")
  })
})

describe("motivoBloqueioDe", () => {
  it("junta os motivos sem repetir; sem bloqueio é null", () => {
    expect(
      motivoBloqueioDe([
        { motivos: ["oferta:eu crio", "sem_pergunta_do_nicho"] },
        { motivos: ["oferta:eu crio"] },
      ])
    ).toBe("oferta:eu crio, sem_pergunta_do_nicho")
    expect(motivoBloqueioDe([])).toBeNull()
  })
})
