// Reputação alta como gancho: só nos nichos com perguntaReputacao (hoje saúde),
// só quando não há lacuna, e sempre com a avaliação arredondada.

import { describe, expect, it } from "vitest"

import {
  avaliacoesArredondadas,
  mensagemDeSaudacao,
  mensagemFixa,
  prepararAbordagem,
  reputacaoAlta,
  validarMensagem,
  type CamposDaAbordagem,
} from "@/lib/leads/abordagem"

const MANHA = new Date("2026-09-17T13:00:00Z") // 10:00 em Fortaleza

// Consultório com site que abre, sem defeito, e reputação alta: sem o gancho de
// reputação, seria descartado_sem_gancho.
const CLINICA: CamposDaAbordagem = {
  nome: "Odontologia Sorriso Real",
  categoria: "Clínica odontológica",
  bairro: "Centro",
  cidade: "Sobral",
  tem_site: true,
  site_url: "https://sorrisoreal.com.br",
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
  google_rating: 4.9,
  google_avaliacoes_count: 132,
}

const preparar = (mudancas: Partial<CamposDaAbordagem> = {}) =>
  prepararAbordagem({ ...CLINICA, ...mudancas }, MANHA)

describe("reputacaoAlta", () => {
  it("nota e avaliações no piso ou acima", () => {
    expect(reputacaoAlta({ google_rating: 4.8, google_avaliacoes_count: 50 })).toBe(true)
    expect(reputacaoAlta({ google_rating: 4.9, google_avaliacoes_count: 132 })).toBe(true)
  })

  it("abaixo do piso, ou número ausente, não é reputação alta", () => {
    expect(reputacaoAlta({ google_rating: 4.7, google_avaliacoes_count: 200 })).toBe(false)
    expect(reputacaoAlta({ google_rating: 5, google_avaliacoes_count: 49 })).toBe(false)
    expect(reputacaoAlta({ google_rating: null, google_avaliacoes_count: 200 })).toBe(false)
    expect(reputacaoAlta({ google_rating: 4.9, google_avaliacoes_count: null })).toBe(false)
  })
})

describe("avaliacoesArredondadas", () => {
  it("arredonda pra baixo pelo degrau e nunca cita o número exato", () => {
    expect(avaliacoesArredondadas(50)).toBe("mais de 50 avaliações")
    expect(avaliacoesArredondadas(99)).toBe("mais de 50 avaliações")
    expect(avaliacoesArredondadas(132)).toBe("mais de 100 avaliações")
    expect(avaliacoesArredondadas(250)).toBe("mais de 200 avaliações")
    expect(avaliacoesArredondadas(1500)).toBe("mais de 1000 avaliações")
  })
})

describe("gancho de reputação na abordagem", () => {
  it("clínica sem lacuna e com reputação alta vira gancho de reputação", () => {
    const preparo = preparar()
    expect(preparo.tipo).toBe("pronta")
    if (preparo.tipo !== "pronta") return
    expect(preparo.dados.lacuna).toBe("reputacao_alta")
    expect(preparo.dados.textoDaLacuna).toBe("vocês têm mais de 100 avaliações")
    expect(preparo.dados.pergunta).toBe("quem chega até vocês costuma pesquisar bastante antes de escolher?")

    const mensagem = mensagemFixa(preparo.dados)
    expect(mensagem).toContain("mais de 100 avaliações")
    expect(mensagem).not.toContain("132")
    // Passa na validação (o nome e a pergunta estão no texto, sem termo vedado)
    expect(validarMensagem(mensagem, preparo.dados)).toEqual([])
    expect(mensagemDeSaudacao(preparo.dados)).toBe("Bom dia! Tudo bem?")
  })

  it("a lacuna concreta vence a reputação: clínica sem site leva o gancho do site", () => {
    const preparo = preparar({ tem_site: false, site_url: null, site_status: null, site_analisado_em: null })
    expect(preparo.tipo).toBe("pronta")
    if (preparo.tipo !== "pronta") return
    expect(preparo.dados.lacuna).toBe("sem_site")
  })

  it("nicho sem perguntaReputacao (advocacia) continua descartado, mesmo com reputação alta", () => {
    const preparo = preparar({ nome: "Silva Advocacia", categoria: "Advogado" })
    expect(preparo.tipo).toBe("descartado_sem_gancho")
  })

  it("reputação abaixo do piso segue descartado", () => {
    expect(preparar({ google_rating: 4.5, google_avaliacoes_count: 300 }).tipo).toBe("descartado_sem_gancho")
    expect(preparar({ google_avaliacoes_count: 40 }).tipo).toBe("descartado_sem_gancho")
  })

  it("site indefinido continua manual, não vira reputação", () => {
    const preparo = preparar({ tem_site: null, site_url: null, site_status: null, site_analisado_em: null })
    expect(preparo).toMatchObject({ tipo: "manual", motivo: "sem_lacuna" })
  })
})
