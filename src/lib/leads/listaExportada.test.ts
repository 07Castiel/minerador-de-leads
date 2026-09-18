import { describe, expect, it } from "vitest"

import { SAUDACOES } from "@/lib/leads/abordagemConfig"
import {
  cabecalhoDaLista,
  itemDaLista,
  listaExportada,
  nichoDaLista,
  telefoneDaLista,
  type LeadDaLista,
} from "@/lib/leads/listaExportada"

const MANHA = new Date("2026-09-17T13:00:00Z") // 10:00 em Fortaleza
const FAIXA = SAUDACOES[0] // "Bom dia!"

// Lead com site próprio que abre e não tem defeito: descartado.
const BASE: LeadDaLista = {
  id: "11111111-1111-1111-1111-111111111111",
  nome: "Silva Advocacia",
  categoria: "Advogado",
  bairro: "Centro",
  cidade: "Sobral",
  telefone: "+55 88 99286-8505",
  etapa: "novo",
  tem_site: true,
  site_url: "https://silva.adv.br",
  site_url_final: null,
  site_status: "ok",
  site_falha: null,
  site_analisado_em: "2026-09-17T09:00:00Z",
  site_plataforma: null,
  site_https: true,
  site_responsivo: true,
  site_nota_celular: 90,
  site_dominio_gratuito: false,
  instagram_handle: null,
  perfil_reivindicado: true,
  fotos_count: 20,
  google_rating: 4.8,
  google_avaliacoes_count: 50,
}

const SEM_SITE = { tem_site: false, site_url: null, site_status: null, site_analisado_em: null } as const
const lead = (mudancas: Partial<LeadDaLista>): LeadDaLista => ({ ...BASE, ...mudancas })
const item = (mudancas: Partial<LeadDaLista>) => itemDaLista(lead(mudancas), { faixa: FAIXA, agora: MANHA })

describe("telefoneDaLista", () => {
  it.each([
    ["+55 88 99286-8505", "88 99286-8505"],
    ["(88) 99713-4425", "88 99713-4425"],
    ["(88) 3611-1234", "88 3611-1234"],
  ])("formata %s", (entrada, esperado) => {
    expect(telefoneDaLista(entrada)).toBe(esperado)
  })

  it("mantém o que não parece telefone brasileiro e avisa quando não tem", () => {
    expect(telefoneDaLista("+1 415 555 0100")).toBe("+1 415 555 0100")
    expect(telefoneDaLista(null)).toBe("Sem telefone")
  })
})

describe("nichoDaLista", () => {
  it.each(["Serviços jurídicos", "Advogado", "Advogado trabalhista", "Escritório de advocacia"])(
    "junta %s em Advocacia",
    (categoria) => {
      expect(nichoDaLista(categoria)).toBe("Advocacia")
    }
  )

  it("usa a categoria do Google quando o nicho não tem rótulo", () => {
    expect(nichoDaLista("Escritório da empresa")).toBe("Escritório da empresa")
    expect(nichoDaLista(null)).toBe("Não informado")
  })
})

describe("itemDaLista", () => {
  it("lead com lacuna: mensagem da mesma camada 1 da janela, e registro pra gravar", () => {
    const r = item({ ...SEM_SITE, nome: "LUIZ CARLOS SILVA ADVOCACIA" })
    expect(r.texto).toBe(
      "Tava procurando o escritório de Luiz Carlos no Google e vi que não tem site, só o telefone. " +
        "Fiquei curioso: quem te procura chega direto aqui pelo WhatsApp?"
    )
    expect(r.motivo).toBeNull()
    expect(r.registro).toEqual({
      lead_id: BASE.id,
      tipo: "primeira",
      lacuna: "sem_site",
      nicho: "advocacia",
      texto: r.texto,
      origem: "exportacao",
    })
  })

  it("lead descartado: mensagem em branco, com o motivo, e nada pra gravar", () => {
    const r = item({})
    expect(r.texto).toBe("")
    expect(r.motivo).toBe("sem gancho automático")
    expect(r.registro).toBeNull()
  })

  it("lead a rever (site fora do ar sem ser DNS): em branco, com outro motivo", () => {
    const r = item({ site_status: "fora_do_ar", site_falha: "TIMEOUT" })
    expect(r).toMatchObject({ texto: "", motivo: "falta dado do site pra decidir o gancho", registro: null })
  })

  it("mensagem que não passa na validação: em branco, com a regra que pegou", () => {
    const r = item({ ...SEM_SITE, nome: `Escritório ${"Muito ".repeat(60)}Grande` })
    expect(r.texto).toBe("")
    expect(r.motivo).toBe("passa de 400 caracteres")
    expect(r.registro).toBeNull()
  })

  it("formato curto troca a observação da lacuna pela versão enxuta", () => {
    const curta = itemDaLista(lead({ ...SEM_SITE, nome: "LUIZ CARLOS SILVA ADVOCACIA" }), {
      faixa: FAIXA,
      agora: MANHA,
      formato: "curta",
    })
    expect(curta.texto).toContain("não tem site")
    expect(curta.texto).not.toContain("não tem site, só o telefone")
    expect(curta.texto.length).toBeLessThan(item({ ...SEM_SITE, nome: "LUIZ CARLOS SILVA ADVOCACIA" }).texto.length)
    expect(curta.registro?.texto).toBe(curta.texto)
  })

  it("lead já abordado leva o follow-up, registrado como follow_up sem lacuna", () => {
    const r = item({ ...SEM_SITE, etapa: "abordado" })
    expect(r.texto).toBe("Oi! Só confirmando se essa mensagem chegou.")
    expect(r.registro).toMatchObject({ tipo: "follow_up", lacuna: null, origem: "exportacao" })
  })

  it.each(["agendado", "convertido", "perdido"])("etapa %s não recebe abordagem", (etapa) => {
    expect(item({ ...SEM_SITE, etapa })).toMatchObject({ texto: "", motivo: "etapa não é de abordagem" })
  })

  it("a saudação da mensagem 1 é a escolhida, não a do horário de agora", () => {
    expect(cabecalhoDaLista(SAUDACOES[2], 1)).toContain('"Boa noite! Tudo bem?"')
  })

  it("nicho pelo termo da busca quando a categoria do Google é genérica", () => {
    const generico = lead({ ...SEM_SITE, categoria: "Escritório da empresa" })
    expect(itemDaLista(generico, { faixa: FAIXA, agora: MANHA }).registro?.nicho).toBe("outros")
    expect(
      itemDaLista(generico, { faixa: FAIXA, agora: MANHA, termoDaBusca: () => "Advogado" }).registro?.nicho
    ).toBe("advocacia")
  })
})

describe("listaExportada", () => {
  const leads = [
    lead({ ...SEM_SITE, id: "a", nome: "Azevedo & Azevedo" }),
    lead({ id: "b", nome: "Silva Advocacia" }), // descartado
    lead({ id: "c", nome: "Sem Telefone Advogados", telefone: null, ...SEM_SITE }),
  ]

  it("cabeçalho com a faixa, um bloco por lead com telefone, e lead sem telefone fora", () => {
    const { texto, itens } = listaExportada(leads, { faixa: FAIXA, agora: MANHA })
    expect(itens).toHaveLength(2)
    expect(texto.split("\n\n")).toHaveLength(3)
    expect(
      texto.startsWith('Mensagem 1, antes de cada uma (para enviar entre 08:00 e 12:00): "Bom dia! Tudo bem?" — 2 leads')
    ).toBe(true)
    expect(texto).toContain('Mensagem 2: "" (sem gancho automático)')
    expect(texto).not.toContain("Sem Telefone Advogados")
  })

  it("cabeçalho sozinho", () => {
    expect(cabecalhoDaLista(SAUDACOES[1], 7)).toBe(
      'Mensagem 1, antes de cada uma (para enviar entre 12:00 e 18:00): "Boa tarde! Tudo bem?" — 7 leads'
    )
  })

  it("anti-repetição conta o que já foi registrado e o que a própria lista gerou", () => {
    // Comércio com duas lacunas: sem site (primeira) e poucas fotos
    const comDuas = { ...SEM_SITE, categoria: "Confeitaria", fotos_count: 2 }
    const quatro = ["1", "2", "3", "4"].map((id) => lead({ ...comDuas, id, nome: `Doceria ${id}` }))

    // Só 4 iguais no banco: a quinta mensagem ainda usa "sem site"
    const semRodizio = listaExportada([lead({ ...comDuas, id: "5", nome: "Doceria 5" })], {
      faixa: FAIXA,
      agora: MANHA,
      ultimasLacunas: ["sem_site", "sem_site", "sem_site", "sem_site"],
    })
    expect(semRodizio.itens[0].registro?.lacuna).toBe("sem_site")

    // Com as 4 do banco mais a primeira desta lista, a segunda já roda pra outra lacuna
    const { itens } = listaExportada(quatro, {
      faixa: FAIXA,
      agora: MANHA,
      ultimasLacunas: ["sem_site", "sem_site", "sem_site", "sem_site"],
    })
    // Depois que uma mensagem sai com outra lacuna, as últimas 5 deixam de ser
    // todas iguais, então a regra volta a permitir "sem site": ela alterna, não
    // troca de vez.
    expect(itens.map((i) => i.registro?.lacuna)).toEqual(["sem_site", "poucas_fotos", "sem_site", "sem_site"])
  })
})
