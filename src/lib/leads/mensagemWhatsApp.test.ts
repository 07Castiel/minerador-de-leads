import { describe, expect, it } from "vitest"

import { prepararAbordagem, type CamposDaAbordagem, type DadosDaAbordagem } from "@/lib/leads/abordagem"
import { GEMINI_NA_ABORDAGEM, MENSAGEM_FIXA } from "@/lib/leads/abordagemConfig"
import {
  INSTRUCOES_DO_REDATOR,
  limparMensagem,
  montarPedidoDoRedator,
  periodoDoDia,
} from "@/lib/leads/mensagemWhatsApp"

const LEAD: CamposDaAbordagem = {
  nome: "LUIZ CARLOS SILVA ADVOCACIA",
  categoria: "Advogado",
  bairro: "Centro",
  cidade: "Sobral",
  tem_site: false,
  site_url: null,
  site_url_final: null,
  site_status: null,
  site_https: null,
  site_responsivo: null,
  site_nota_celular: null,
  site_dominio_gratuito: null,
  instagram_handle: "luizcarlos.adv",
  perfil_reivindicado: true,
  fotos_count: 37,
  google_rating: 4.9,
  google_avaliacoes_count: 211,
}

function dados(): DadosDaAbordagem {
  const r = prepararAbordagem(LEAD, new Date("2026-09-18T13:00:00Z"))
  if (r.tipo !== "pronta") throw new Error("esperava pronta")
  return r.dados
}

describe("INSTRUCOES_DO_REDATOR", () => {
  it("traz a estrutura do mesmo config do texto fixo", () => {
    expect(INSTRUCOES_DO_REDATOR).toContain(MENSAGEM_FIXA)
  })

  it("não diz o que o remetente vende nem sugere abertura ou fechamento", () => {
    expect(INSTRUCOES_DO_REDATOR).not.toMatch(/cria sites|criar sites|site próprio|sugestão sorteada|OFERTA/i)
  })

  it("manda copiar a pergunta literalmente e não fala em tratamento", () => {
    expect(INSTRUCOES_DO_REDATOR).toContain("A {PERGUNTA} vem pronta, com a concordância já resolvida: copie literalmente")
    expect(INSTRUCOES_DO_REDATOR).not.toMatch(/TRATAMENTO/)
  })
})

describe("Gemini na abordagem", () => {
  it("fica desligado por padrão", () => {
    expect(GEMINI_NA_ABORDAGEM).toBe(false)
  })
})

describe("montarPedidoDoRedator", () => {
  it("leva só os elementos decididos pela camada 1, sem tratamento", () => {
    expect(montarPedidoDoRedator(dados())).toBe(
      [
        "<SAUDACAO>Bom dia!</SAUDACAO>",
        "<ANCORA>Procurei o escritório de Luiz Carlos no Google e achei</ANCORA>",
        "<LACUNA>não tem site, só o telefone</LACUNA>",
        "<PERGUNTA>Quem te procura por lá cai direto no WhatsApp ou vocês mandam alguma página antes?</PERGUNTA>",
      ].join("\n") + "\n\nEscreva a mensagem."
    )
  })

  it("não passa nenhum dado cru do lead (nada de onde inventar gancho)", () => {
    const pedido = montarPedidoDoRedator(dados())
    expect(pedido).not.toMatch(/<lead>|Advogado|Centro|luizcarlos\.adv|37|4,9|4\.9|211|avalia/i)
  })

  it("no retry, diz por que a versão anterior foi recusada, sem repassar erro de API", () => {
    const pedido = montarPedidoDoRedator(dados(), {
      bloqueiosAnteriores: [
        { tentativa: 1, motivos: ["sem_pergunta_do_nicho", "marca_de_ia:travessão"] },
        { tentativa: 2, motivos: ["erro: 503 alta demanda"] },
      ],
    })
    expect(pedido).toContain("recusada pela revisão por: sem_pergunta_do_nicho, marca_de_ia:travessão.")
    expect(pedido).not.toContain("503")
  })

  it("em 'Gerar outra', mostra só as últimas versões descartadas", () => {
    const pedido = montarPedidoDoRedator(dados(), { descartadas: ["um", "dois", "três", "quatro"] })
    expect(pedido).toContain("Mude a redação, não o conteúdo")
    expect(pedido).not.toContain("<descartada>\num\n")
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

describe("periodoDoDia (saudação dos modelos salvos)", () => {
  it("usa o horário de Brasília", () => {
    expect(periodoDoDia(new Date("2026-09-16T11:00:00Z"))).toBe("manhã") // 8h
    expect(periodoDoDia(new Date("2026-09-16T17:00:00Z"))).toBe("tarde") // 14h
    expect(periodoDoDia(new Date("2026-09-17T01:00:00Z"))).toBe("noite") // 22h
    expect(periodoDoDia(new Date("2026-09-16T06:00:00Z"))).toBe("noite") // 3h
  })
})
