import { describe, expect, it } from "vitest"

import {
  analisarSite,
  anoDoRodape,
  classificarFalha,
  detectarPlataforma,
  detectarSemConteudo,
  lerPageSpeed,
  normalizarUrlDoSite,
  temViewportDeCelular,
  type ResultadoDaBusca,
} from "@/lib/leads/analiseSite"

const AGORA = new Date("2026-09-17T15:00:00Z")

function pagina(html: string, extra: Partial<Extract<ResultadoDaBusca, { tipo: "pagina" }>> = {}) {
  return {
    tipo: "pagina",
    urlFinal: "https://advocacia.com.br/",
    status: 200,
    contentType: "text/html; charset=utf-8",
    html,
    desafioAntiRobo: false,
    ...extra,
  } satisfies ResultadoDaBusca
}

const HTML_BOM = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="WordPress 7.1">
<meta name="generator" content="Elementor 3.30">
<title>Silva Advocacia &#8211; Direito de Família</title></head>
<body><h1>Silva Advocacia</h1><p>Atendimento em Fortaleza há 20 anos, com equipe especializada em direito de família e sucessões.</p>
<a href="https://wa.me/5585999999999?text=Ol%C3%A1">Fale conosco</a>
<footer>&copy; 2019 Silva Advocacia. Todos os direitos reservados.</footer></body></html>`

describe("normalizarUrlDoSite", () => {
  it("sem protocolo começa por http e recusa o que não é web", () => {
    expect(normalizarUrlDoSite("advocacia.com.br")).toBe("http://advocacia.com.br/")
    expect(normalizarUrlDoSite("https://advocacia.com.br/contato")).toBe("https://advocacia.com.br/contato")
    expect(normalizarUrlDoSite("ftp://advocacia.com.br")).toBeNull()
    expect(normalizarUrlDoSite("javascript:alert(1)")).toBeNull()
    expect(normalizarUrlDoSite("  ")).toBeNull()
  })
})

describe("leitura do HTML", () => {
  it("viewport de celular, inclusive a do Wix", () => {
    expect(temViewportDeCelular(HTML_BOM)).toBe(true)
    expect(temViewportDeCelular('<meta name="viewport" content="width=320, user-scalable=yes" id="wixMobileViewport" />')).toBe(true)
    expect(temViewportDeCelular("<html><head><title>x</title></head></html>")).toBe(false)
  })

  it("maior ano do rodapé, ignorando ano futuro", () => {
    expect(anoDoRodape(HTML_BOM, 2026)).toBe(2019)
    expect(anoDoRodape("<p>Copyright © 2016-2021 Escritório</p>", 2026)).toBe(2021)
    expect(anoDoRodape("<p>© 2030 Escritório</p>", 2026)).toBeNull()
    expect(anoDoRodape("<p>Fundado em 1998</p>", 2026)).toBeNull()
  })

  it("plataforma pelo generator, pela assinatura ou pelo domínio gratuito", () => {
    expect(detectarPlataforma(HTML_BOM, "https://advocacia.com.br/")).toBe("WordPress")
    expect(detectarPlataforma('<img src="https://static.wixstatic.com/media/x.jpg">', "https://x.com.br/")).toBe("Wix")
    expect(detectarPlataforma("<html></html>", "https://sites.google.com/view/advogado")).toBe("Google Sites")
    expect(detectarPlataforma("<html><body>feito à mão</body></html>", "https://x.com.br/")).toBeNull()
  })

  it("página sem conteúdo: domínio à venda, suspensa, em construção, padrão da hospedagem", () => {
    expect(detectarSemConteudo("<title>Este domínio está à venda</title>")).toMatch(/à venda/)
    expect(detectarSemConteudo("<title>Account Suspended</title>")).toMatch(/suspensa/)
    expect(detectarSemConteudo("<html><body><h1>Site em construção</h1></body></html>")).toMatch(/construção/)
    expect(detectarSemConteudo("<title>Index of /</title>")).toMatch(/página padrão/)
    // "em construção" no meio de um site de verdade não conta
    const construtora = `<title>Construtora Silva</title><h1>Obras entregues</h1><p>${"Imóveis em construção no Centro. ".repeat(40)}</p>`
    expect(detectarSemConteudo(construtora)).toBeNull()
    expect(detectarSemConteudo(HTML_BOM)).toBeNull()
  })
})

describe("classificarFalha", () => {
  it.each([
    ["ENOTFOUND", "fora_do_ar"],
    ["TIMEOUT", "fora_do_ar"],
    ["CERT_HAS_EXPIRED", "certificado_invalido"],
    ["ERR_TLS_CERT_ALTNAME_INVALID", "certificado_invalido"],
    // o navegador costuma completar a cadeia sozinho: não dá pra acusar
    ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "nao_verificado"],
    ["ECONNRESET", "nao_verificado"],
    ["ENDERECO_BLOQUEADO", "nao_verificado"],
  ])("%s → %s", (codigo, status) => {
    expect(classificarFalha(codigo).status).toBe(status)
  })
})

describe("lerPageSpeed", () => {
  it("nota de 0 a 100 e tempo do maior conteúdo", () => {
    expect(
      lerPageSpeed({
        lighthouseResult: {
          categories: { performance: { score: 0.37 } },
          audits: { "largest-contentful-paint": { numericValue: 8234.6 } },
        },
      })
    ).toEqual({ nota: 37, carregamentoMs: 8235 })
  })

  it("erro do Lighthouse ou resposta estranha = sem medição", () => {
    expect(lerPageSpeed({ lighthouseResult: { runtimeError: { code: "FAILED_DOCUMENT_REQUEST" } } })).toBeNull()
    expect(lerPageSpeed({ lighthouseResult: { categories: { performance: { score: null } } } })).toBeNull()
    expect(lerPageSpeed(null)).toBeNull()
  })
})

describe("analisarSite", () => {
  it("site que abre: sinais e medição do PageSpeed", () => {
    const r = analisarSite({ busca: pagina(HTML_BOM), pageSpeed: { nota: 42, carregamentoMs: 7100 }, agora: AGORA })
    expect(r).toMatchObject({
      tem_site: true,
      site_status: "ok",
      site_https: true,
      site_responsivo: true,
      site_tem_whatsapp: true,
      site_plataforma: "WordPress",
      site_dominio_gratuito: false,
      site_ano_rodape: 2019,
      site_nota_celular: 42,
      site_carregamento_ms: 7100,
      site_analisado_em: AGORA.toISOString(),
    })
  })

  it("http sem redirecionar para https", () => {
    const r = analisarSite({ busca: pagina(HTML_BOM, { urlFinal: "http://advocacia.com.br/" }), pageSpeed: null, agora: AGORA })
    expect(r.site_https).toBe(false)
    expect(r.site_nota_celular).toBeNull()
  })

  it("redirecionou para rede social: vira lead sem site", () => {
    const r = analisarSite({
      busca: { tipo: "redirecionou_para_fora", urlFinal: "https://api.whatsapp.com/send?phone=5585999999999" },
      pageSpeed: null,
      agora: AGORA,
    })
    expect(r).toMatchObject({ tem_site: false, site_status: "nao_e_site" })
  })

  it("erros HTTP: 5xx e 404 fora do ar, bloqueio não acusa nada", () => {
    expect(analisarSite({ busca: pagina("<title>Database Error</title>", { status: 500 }), pageSpeed: null, agora: AGORA }).site_status).toBe("fora_do_ar")
    expect(analisarSite({ busca: pagina("", { status: 404 }), pageSpeed: null, agora: AGORA }).site_status).toBe("fora_do_ar")
    expect(analisarSite({ busca: pagina("", { status: 403 }), pageSpeed: null, agora: AGORA }).site_status).toBe("nao_verificado")
    expect(
      analisarSite({ busca: pagina("<title>Just a moment...</title>", { status: 503, desafioAntiRobo: true }), pageSpeed: null, agora: AGORA })
        .site_status
    ).toBe("nao_verificado")
  })

  it("falha de rede e página sem conteúdo não guardam sinais de site que abriu", () => {
    const fora = analisarSite({ busca: { tipo: "falha", codigo: "ENOTFOUND" }, pageSpeed: { nota: 99, carregamentoMs: 900 }, agora: AGORA })
    expect(fora).toMatchObject({ site_status: "fora_do_ar", site_nota_celular: null, site_responsivo: null })
    const vazio = analisarSite({ busca: pagina("<title>Domínio à venda</title>"), pageSpeed: null, agora: AGORA })
    expect(vazio).toMatchObject({ site_status: "sem_conteudo", site_tem_whatsapp: null })
  })
})
