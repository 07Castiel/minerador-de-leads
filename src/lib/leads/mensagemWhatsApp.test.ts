import { describe, expect, it } from "vitest"

import {
  ABERTURAS,
  FECHAMENTOS,
  dadosDoLeadEmTexto,
  limparMensagem,
  montarPedidoDeMensagem,
  periodoDoDia,
  type CamposDaMensagem,
} from "@/lib/leads/mensagemWhatsApp"

const VAZIO: CamposDaMensagem = {
  nome: "Barbearia do Centro",
  categoria: null,
  cidade: null,
  bairro: null,
  tem_site: null,
  site_url: null,
  instagram_handle: null,
  instagram_seguidores: null,
  instagram_ultimo_post_dias: null,
  google_rating: null,
  google_avaliacoes_count: null,
  google_avaliacoes_sem_resposta: null,
  fotos_count: null,
  perfil_reivindicado: null,
  tem_descricao: null,
  tem_horario: null,
}

describe("dadosDoLeadEmTexto", () => {
  it("com poucos dados, manda só o que existe", () => {
    expect(dadosDoLeadEmTexto(VAZIO)).toBe("Empresa: Barbearia do Centro")
  })

  it("descreve presença digital e Google em texto", () => {
    const texto = dadosDoLeadEmTexto({
      ...VAZIO,
      categoria: "Barbearia",
      cidade: "Sobral",
      bairro: "Centro",
      tem_site: false,
      site_url: "https://www.instagram.com/barbearia.centro/",
      instagram_handle: "barbearia.centro",
      instagram_seguidores: 2350,
      instagram_ultimo_post_dias: 1,
      google_rating: 4.8,
      google_avaliacoes_count: 132,
      google_avaliacoes_sem_resposta: 12,
      fotos_count: 3,
      perfil_reivindicado: false,
      tem_horario: false,
    })
    expect(texto).toBe(
      [
        "Empresa: Barbearia do Centro",
        "Segmento: Barbearia",
        "Localização: Centro, Sobral",
        "Site: não tem site próprio; o link no perfil do Google é de rede social (https://www.instagram.com/barbearia.centro/)",
        "Instagram: @barbearia.centro (2.350 seguidores, último post há 1 dia)",
        "Perfil no Google: nota 4,8 com 132 avaliações; 12 avaliações sem resposta do dono; 3 fotos; perfil nunca reivindicado pelo dono; perfil sem horário de funcionamento",
      ].join("\n")
    )
  })

  it("nunca manda as observações internas do lead", () => {
    const lead = { ...VAZIO, observacoes: "Dono pediu desconto de 30%" }
    expect(dadosDoLeadEmTexto(lead)).not.toContain("desconto")
  })

  it("nota com poucas avaliações não entra, e sem link nenhum é sem site", () => {
    const texto = dadosDoLeadEmTexto({ ...VAZIO, tem_site: false, google_rating: 5, google_avaliacoes_count: 2 })
    expect(texto).toContain("Site: não tem site (nenhum link no perfil do Google)")
    expect(texto).toContain("Perfil no Google: 2 avaliações")
    expect(texto).not.toContain("nota")
  })

  it("site desativado do Google não vai com o link", () => {
    const texto = dadosDoLeadEmTexto({ ...VAZIO, tem_site: false, site_url: "https://barbearia.business.site" })
    expect(texto).toContain("site gratuito do Google que já saiu do ar")
    expect(texto).not.toContain("business.site")
  })
})

describe("periodoDoDia", () => {
  it("usa o horário de Brasília", () => {
    expect(periodoDoDia(new Date("2026-09-16T11:00:00Z"))).toBe("manhã") // 8h
    expect(periodoDoDia(new Date("2026-09-16T17:00:00Z"))).toBe("tarde") // 14h
    expect(periodoDoDia(new Date("2026-09-17T01:00:00Z"))).toBe("noite") // 22h
    expect(periodoDoDia(new Date("2026-09-16T06:00:00Z"))).toBe("noite") // 3h
  })
})

describe("montarPedidoDeMensagem", () => {
  const agora = new Date("2026-09-16T17:00:00Z")

  it("leva os dados, o período e a sugestão sorteada", () => {
    const pedido = montarPedidoDeMensagem({ lead: VAZIO, agora, sortear: () => 0.99 })
    expect(pedido).toContain("<lead>\nEmpresa: Barbearia do Centro\n</lead>")
    expect(pedido).toContain("Agora é tarde no horário de Brasília.")
    expect(pedido).toContain(ABERTURAS[ABERTURAS.length - 1])
    expect(pedido).toContain(FECHAMENTOS[FECHAMENTOS.length - 1])
    expect(pedido).not.toContain("<descartada>")
  })

  it("inclui só as últimas versões descartadas", () => {
    const pedido = montarPedidoDeMensagem({ lead: VAZIO, agora, descartadas: ["um", "dois", "três", "quatro"] })
    expect(pedido).not.toContain("<descartada>\num\n")
    expect(pedido).toContain("<descartada>\nquatro\n</descartada>")
    expect(pedido.match(/<descartada>/g)).toHaveLength(3)
  })
})

describe("limparMensagem", () => {
  it("tira aspas em volta e linhas em branco sobrando", () => {
    expect(limparMensagem('  "Oi, tudo bem?\n\n\n\nQueria falar com vocês."  ')).toBe(
      "Oi, tudo bem?\n\nQueria falar com vocês."
    )
    expect(limparMensagem("“Oi, tudo certo?”")).toBe("Oi, tudo certo?")
  })

  it("não mexe em aspas que não embrulham a mensagem toda", () => {
    expect(limparMensagem('"Oi" e "tchau"')).toBe('"Oi" e "tchau"')
  })
})
