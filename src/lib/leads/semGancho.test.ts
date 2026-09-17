import { describe, expect, it } from "vitest"

import { prepararAbordagem, type CamposDaAbordagem } from "@/lib/leads/abordagem"
import leadsReais from "@/lib/leads/fixtures/leads-reais.json"
import {
  FILTRO_DESCARTADOS,
  contarSemGancho,
  leadsDaVisao,
  paramsDoContador,
  semGancho,
} from "@/lib/leads/semGancho"

const MANHA = new Date("2026-09-18T13:00:00Z") // 10:00 em Fortaleza

const COM_SITE_OK: CamposDaAbordagem = {
  nome: "Silva Advocacia",
  categoria: "Advogado",
  bairro: "Centro",
  cidade: "Sobral",
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

describe("semGancho", () => {
  it("site próprio que abre e não tem defeito: sem gancho", () => {
    expect(semGancho(COM_SITE_OK)).toBe(true)
  })

  it("sem site, ou com site defeituoso, tem gancho", () => {
    expect(semGancho({ ...COM_SITE_OK, tem_site: false, site_url: null, site_status: null })).toBe(false)
    expect(semGancho({ ...COM_SITE_OK, site_dominio_gratuito: true })).toBe(false)
  })

  it("site nunca analisado ou fora do ar por medição inconclusiva: é manual, não sem gancho", () => {
    expect(semGancho({ ...COM_SITE_OK, site_analisado_em: null, site_status: null })).toBe(false)
    expect(semGancho({ ...COM_SITE_OK, site_status: "fora_do_ar", site_falha: "TIMEOUT" })).toBe(false)
  })

  // A diferença entre o predicado cru e a decisão da janela: comércio ainda tem
  // as lacunas de foto e avaliação mesmo com o site em ordem.
  it("comércio com site em ordem mas poucas fotos ainda tem gancho", () => {
    const doceria = { ...COM_SITE_OK, categoria: "Confeitaria", fotos_count: 2 }
    expect(semGancho(doceria)).toBe(false)
    expect(semGancho({ ...doceria, categoria: "Advogado" })).toBe(true)
  })

  it("concorda com prepararAbordagem em todos os 100 leads reais", () => {
    for (const lead of leadsReais as unknown as CamposDaAbordagem[]) {
      const preparo = prepararAbordagem(lead, MANHA)
      expect(semGancho(lead)).toBe(preparo.tipo === "descartado_sem_gancho")
    }
  })
})

describe("visões do CRM", () => {
  const leads = leadsReais as unknown as CamposDaAbordagem[]
  const SEM_FILTRO = new Set<string>()

  it("o contador mostra a contagem real da base", () => {
    expect(contarSemGancho(leads)).toBe(40)
  })

  it("quadro sem filtro extra: nenhum lead sem gancho, e os outros continuam", () => {
    const quadro = leadsDaVisao(leads, "quadro", SEM_FILTRO)
    expect(quadro.filter(semGancho)).toHaveLength(0)
    expect(quadro).toHaveLength(leads.length - 40)
  })

  it("lista sem filtro: mostra todos os status, incluindo os sem gancho", () => {
    const lista = leadsDaVisao(leads, "lista", SEM_FILTRO)
    expect(lista).toHaveLength(100)
    expect(lista.filter(semGancho)).toHaveLength(40)
  })

  it("o clique no contador leva à lista filtrada nesse status, e ela mostra os 40", () => {
    const params = paramsDoContador(SEM_FILTRO)
    expect(params).toEqual({ visao: "lista", f: FILTRO_DESCARTADOS })

    // O que o CrmView faz com esses params: atalho ligado filtra, visão lista
    // não esconde nada.
    const filtros = new Set(params.f.split(","))
    const filtrados = leads.filter((lead) => (filtros.has(FILTRO_DESCARTADOS) ? semGancho(lead) : true))
    expect(leadsDaVisao(filtrados, "lista", filtros)).toHaveLength(40)
  })

  it("o contador não derruba os atalhos já ligados, nem duplica o dele", () => {
    expect(paramsDoContador(["quente", "com_telefone"]).f).toBe("quente,com_telefone,descartados")
    expect(paramsDoContador([FILTRO_DESCARTADOS]).f).toBe("descartados")
  })

  it("com o atalho ligado, o quadro passa a mostrar os sem gancho", () => {
    const filtros = new Set([FILTRO_DESCARTADOS])
    const so40 = leads.filter(semGancho)
    expect(leadsDaVisao(so40, "quadro", filtros)).toHaveLength(40)
  })
})
