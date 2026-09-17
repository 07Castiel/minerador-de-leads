import { describe, expect, it, vi } from "vitest"

import {
  escolherLacuna,
  mensagemFixa,
  prepararAbordagem,
  redigirAbordagem,
  resolverNicho,
  saudacaoDoHorario,
  validarMensagem,
  type CamposDaAbordagem,
  type DadosDaAbordagem,
  type OpcoesDaAbordagem,
} from "@/lib/leads/abordagem"
import { NICHOS, NICHO_PADRAO, TERMOS_DE_OFERTA } from "@/lib/leads/abordagemConfig"

// Lead sem nenhuma lacuna da abordagem.
const OK: CamposDaAbordagem = {
  nome: "Silva Advocacia",
  categoria: "Advogado",
  bairro: "Aldeota",
  cidade: "Fortaleza",
  tem_site: true,
  site_url: "https://silva.adv.br",
  site_url_final: null,
  site_status: "ok",
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

// Fortaleza é UTC-3 o ano todo.
const MANHA = new Date("2026-09-17T13:00:00Z") // 10:00

function preparar(lead: Partial<CamposDaAbordagem>, opcoes: OpcoesDaAbordagem = {}, agora = MANHA) {
  return prepararAbordagem({ ...OK, ...lead }, agora, opcoes)
}

function dados(lead: Partial<CamposDaAbordagem>, opcoes: OpcoesDaAbordagem = {}): DadosDaAbordagem {
  const r = preparar(lead, opcoes)
  if (r.tipo !== "pronta") throw new Error(`esperava abordagem pronta, veio ${JSON.stringify(r)}`)
  return r.dados
}

const SEM_LINK = { tem_site: false, site_url: null, site_status: null } as const
const link = (url: string) => ({ tem_site: false, site_url: url, site_status: null }) as const
const COMERCIO = { categoria: "Confeitaria" } as const

describe("padrão-ouro", () => {
  const lead = {
    ...SEM_LINK,
    nome: "LUIZ CARLOS SILVA ADVOCACIA",
    categoria: "Advogado",
    bairro: "Centro",
    cidade: "Sobral",
  }

  it("mensagemFixa sai exatamente assim", () => {
    expect(mensagemFixa(dados(lead))).toBe(
      "Bom dia! Aqui é o Leonardo, de Sobral.\n" +
        "Procurei o escritório de Luiz Carlos no Google e achei, mas não tem site, só o telefone.\n" +
        "Quem te procura por lá cai direto no WhatsApp ou vocês mandam alguma página antes?"
    )
  })

  it("e passa na validação sem nenhum aviso", () => {
    const d = dados(lead)
    expect(validarMensagem(mensagemFixa(d), d)).toEqual([])
  })
})

describe("resolverNicho", () => {
  it.each([
    ["Serviços jurídicos", "advocacia"],
    ["Advogado", "advocacia"],
    ["Advogado(a) civil", "advocacia"],
    ["Escritório de advocacia", "advocacia"],
    ["Confeitaria", "alimentacao"],
    ["Lanchonete", "alimentacao"],
    ["Loja de doces", "alimentacao"],
    ["Barbearia", "agendamento"],
    ["Salão de beleza", "agendamento"],
    ["Clínica odontológica", "agendamento"],
    ["Oficina mecânica", "agendamento"],
    ["Loja de roupas", "varejo"],
    ["Escritório da empresa", "outros"],
    [null, "outros"],
  ])("categoria %s → %s", (categoria, nicho) => {
    expect(resolverNicho(categoria).id).toBe(nicho)
  })

  it("1. categoria no mapa ganha do termo da busca", () => {
    expect(resolverNicho("Confeitaria", "Advogado").id).toBe("alimentacao")
  })

  it("2. categoria genérica ou vazia: vale o termo da busca", () => {
    expect(resolverNicho("Escritório da empresa", "Advogado").id).toBe("advocacia")
    expect(resolverNicho(null, "advogado trabalhista").id).toBe("advocacia")
  })

  it("categoria específica fora do mapa nunca é trocada pela busca", () => {
    expect(resolverNicho("Contador", "Advogado").id).toBe("outros")
  })

  it("3. nada casa: outros", () => {
    expect(resolverNicho("Escritório da empresa", "Dentista").id).toBe("outros")
    expect(resolverNicho("Escritório da empresa").id).toBe("outros")
  })

  it.each([
    "Dra. Jessica Frota - Advogado Criminalista/Audiência de Custodia/Flagrante - Sobral",
    "Dra. Nathália Stelita",
    "Jósimo Farias Filho",
    "N Carvalho",
    "Nayana",
    "Neto Linhares",
    "Vaz Carvalho",
  ])("os 7 'Escritório da empresa' da busca Advogado viram advocacia: %s", (nome) => {
    const d = dados({ ...SEM_LINK, nome, categoria: "Escritório da empresa" }, { termoDaBusca: "Advogado" })
    expect(d.nicho).toBe("advocacia")
  })

  it("perguntas curtas, uma por nicho", () => {
    expect(resolverNicho("Advogado").pergunta).toBe(
      "Quem te procura por lá cai direto no WhatsApp ou vocês mandam alguma página antes?"
    )
    expect(resolverNicho("Confeitaria").pergunta).toBe("Como vocês tocam as encomendas hoje, tudo por aqui?")
    expect(resolverNicho("Barbearia").pergunta).toBe("Os agendamentos ficam tudo no WhatsApp?")
    expect(resolverNicho("Loja de roupas").pergunta).toBe("Quando perguntam preço você manda foto na hora?")
    expect(resolverNicho(null).pergunta).toBe("É assim mesmo hoje?")
  })
})

describe("saudacaoDoHorario (America/Fortaleza)", () => {
  it.each([
    ["2026-09-17T10:59:00Z", null], // 07:59
    ["2026-09-17T11:00:00Z", "Bom dia!"], // 08:00
    ["2026-09-17T14:59:00Z", "Bom dia!"], // 11:59
    ["2026-09-17T15:00:00Z", "Boa tarde!"], // 12:00
    ["2026-09-17T20:59:00Z", "Boa tarde!"], // 17:59
    ["2026-09-17T21:00:00Z", "Boa noite!"], // 18:00
    ["2026-09-17T23:59:00Z", "Boa noite!"], // 20:59
    ["2026-09-18T00:00:00Z", null], // 21:00
    ["2026-09-18T05:00:00Z", null], // 02:00
  ])("%s → %s", (iso, saudacao) => {
    expect(saudacaoDoHorario(new Date(iso))).toBe(saudacao)
  })

  it("fora do horário não prepara nada, mesmo com lacuna", () => {
    expect(preparar(SEM_LINK, {}, new Date("2026-09-18T00:30:00Z"))).toEqual({ tipo: "fora_do_horario" })
  })
})

describe("lacunas", () => {
  it("1a: sem link nenhum", () => {
    const d = dados(SEM_LINK)
    expect(d.lacuna).toBe("sem_site")
    expect(d.textoDaLacuna).toBe("não tem site, só o telefone")
  })

  it.each([
    ["https://www.instagram.com/silva.adv/", "o link vai pro Instagram, mas site não"],
    ["https://facebook.com/silva.adv", "o link vai pro Facebook, mas site não"],
    ["https://twitter.com/silva", "o link vai pra uma rede social, mas site não"],
    ["https://wa.link/abc123", "o link abre o WhatsApp direto, sem site"],
    ["https://linktr.ee/silva", "o link só vai pra uma página no Linktree"],
    ["https://eduardo.linkbio.co", "o link só vai pra uma página no Linkbio"],
    ["https://bio.link/silva", "o link só vai pra uma página de links"],
    ["https://silva.jusfy.com.br", "o link só vai pra uma página no Jusfy"],
    ["https://silva.jusbrasil.com.br", "o link só vai pra uma página no Jusbrasil"],
    ["https://chat-e923e9.zapier.app", "o link só vai pra uma página no Zapier"],
  ])("1b: %s → %s", (url, texto) => {
    const d = dados(link(url))
    expect(d.lacuna).toBe("link_fora_do_site")
    expect(d.textoDaLacuna).toBe(texto)
  })

  describe("pergunta própria quando o link vai pra uma página", () => {
    const PERGUNTA_DA_PAGINA = "Quem te procura por lá chega a ver suas áreas de atuação ou te chama direto?"
    const PERGUNTA_DA_ADVOCACIA = "Quem te procura por lá cai direto no WhatsApp ou vocês mandam alguma página antes?"

    it.each(["https://linktr.ee/silva", "https://bio.link/silva", "https://silva.jusbrasil.com.br"])(
      "advocacia, página de links ou diretório (%s): troca a pergunta",
      (url) => {
        expect(dados(link(url)).pergunta).toBe(PERGUNTA_DA_PAGINA)
      }
    )

    it.each([SEM_LINK, link("https://instagram.com/silva"), link("https://wa.me/5588996123456")])(
      "advocacia, demais lacunas: pergunta do nicho",
      (lacuna) => {
        expect(dados(lacuna).pergunta).toBe(PERGUNTA_DA_ADVOCACIA)
      }
    )

    it("nicho sem pergunta própria pra página: fallback pra pergunta do nicho", () => {
      expect(dados({ ...link("https://linktr.ee/doces"), categoria: "Confeitaria" }).pergunta).toBe(
        "Como vocês tocam as encomendas hoje, tudo por aqui?"
      )
    })

    it("a mensagem fixa termina na pergunta da lacuna e passa na validação", () => {
      const d = dados(link("https://silva.jusbrasil.com.br"))
      const texto = mensagemFixa(d)
      expect(texto.split("\n").at(-1)).toBe(PERGUNTA_DA_PAGINA)
      expect(validarMensagem(texto, d)).toEqual([])
    })
  })

  it("site gratuito do Google desativado não é lacuna da abordagem", () => {
    expect(preparar(link("https://silva.business.site")).tipo).toBe("manual")
  })

  it.each([
    [0, "não tem nenhuma foto no perfil"],
    [1, "tem só 1 foto no perfil"],
    [4, "tem só 4 fotos no perfil"],
  ])("3 (comércio): %i fotos → %s", (fotos, texto) => {
    const d = dados({ ...COMERCIO, fotos_count: fotos })
    expect(d.lacuna).toBe("poucas_fotos")
    expect(d.textoDaLacuna).toBe(texto)
  })

  it("3: 5 fotos ou foto desconhecida não é lacuna", () => {
    expect(preparar({ ...COMERCIO, fotos_count: 5 }).tipo).toBe("manual")
    expect(preparar({ ...COMERCIO, fotos_count: null }).tipo).toBe("manual")
  })

  it("5 (comércio): pouca avaliação, e zero não vira 'quase não tem'", () => {
    const d = dados({ ...COMERCIO, google_avaliacoes_count: 3 })
    expect(d.lacuna).toBe("pouca_avaliacao")
    expect(d.textoDaLacuna).toBe("o perfil quase não tem avaliação")
    expect(dados({ ...COMERCIO, google_avaliacoes_count: 0 }).textoDaLacuna).toBe("o perfil ainda não tem avaliação")
  })

  it("5: 4 avaliações ou contagem desconhecida não é lacuna", () => {
    expect(preparar({ ...COMERCIO, google_avaliacoes_count: 4 }).tipo).toBe("manual")
    expect(preparar({ ...COMERCIO, google_avaliacoes_count: null }).tipo).toBe("manual")
  })

  it("3 e 5 só em comércio: advocacia e outros com poucas fotos e avaliações ficam manuais", () => {
    expect(preparar({ fotos_count: 1, google_avaliacoes_count: 0 })).toMatchObject({ tipo: "manual" })
    expect(preparar({ categoria: "Contador", fotos_count: 1, google_avaliacoes_count: 0 })).toMatchObject({
      tipo: "manual",
      nicho: "outros",
    })
  })

  it("horário desconhecido não vira lacuna (lacuna 2 desligada)", () => {
    expect(preparar({}).tipo).toBe("manual")
  })

  it("sem nenhuma lacuna: abordagem manual, sem chamar o Gemini", () => {
    expect(preparar({})).toEqual({ tipo: "manual", motivo: "sem_lacuna", nicho: "advocacia" })
  })
})

describe("precedência", () => {
  it("1a antes de 3 e 5", () => {
    expect(dados({ ...COMERCIO, ...SEM_LINK, fotos_count: 1, google_avaliacoes_count: 0 }).lacuna).toBe("sem_site")
  })

  it("1b antes de 3", () => {
    expect(dados({ ...COMERCIO, ...link("https://instagram.com/silva"), fotos_count: 0 }).lacuna).toBe(
      "link_fora_do_site"
    )
  })

  it("3 antes de 5", () => {
    expect(dados({ ...COMERCIO, fotos_count: 2, google_avaliacoes_count: 1 }).lacuna).toBe("poucas_fotos")
  })

  it("lacunas só dos modelos salvos (site lento, perfil sem dono) não entram", () => {
    const d = dados({ ...COMERCIO, site_nota_celular: 20, perfil_reivindicado: false, google_avaliacoes_count: 2 })
    expect(d.lacuna).toBe("pouca_avaliacao")
  })
})

describe("anti-repetição", () => {
  const aplicaveis = [{ id: "sem_site" }, { id: "poucas_fotos" }] as const

  it("as últimas 5 com a mesma lacuna: vai a próxima do lead", () => {
    expect(escolherLacuna(aplicaveis, Array(5).fill("sem_site"))?.id).toBe("poucas_fotos")
  })

  it("só 4 seguidas: ainda repete", () => {
    expect(escolherLacuna(aplicaveis, Array(4).fill("sem_site"))?.id).toBe("sem_site")
  })

  it("uma diferente entre as 5 mais recentes: não troca", () => {
    expect(escolherLacuna(aplicaveis, ["sem_site", "sem_site", "poucas_fotos", "sem_site", "sem_site"])?.id).toBe(
      "sem_site"
    )
  })

  it("olha só as N mais recentes", () => {
    expect(escolherLacuna(aplicaveis, [...Array(5).fill("sem_site"), "poucas_fotos"])?.id).toBe("poucas_fotos")
  })

  it("lead sem outra lacuna: repete", () => {
    expect(escolherLacuna([{ id: "sem_site" }], Array(5).fill("sem_site"))?.id).toBe("sem_site")
  })

  it("no fluxo completo", () => {
    const d = dados({ ...COMERCIO, ...SEM_LINK, fotos_count: 3 }, { ultimasLacunas: Array(5).fill("sem_site") })
    expect(d.lacuna).toBe("poucas_fotos")
    expect(d.textoDaLacuna).toBe("tem só 3 fotos no perfil")
  })
})

describe("âncora", () => {
  it("advocacia com pessoa: procurei o escritório de {PESSOA}, sem título e com você", () => {
    const d = dados({ ...SEM_LINK, nome: "Dra. Alana Frota - Advogado Trabalhista em Sobral" })
    expect(d).toMatchObject({
      pessoa: "Alana Frota",
      ancora: "Procurei o escritório de Alana Frota no Google e achei",
      referencia: "Alana Frota",
      tratamento: "você",
    })
  })

  it("sem pessoa: nome curto do negócio, sem artigo e com vocês", () => {
    const d = dados({ ...SEM_LINK, nome: "️ Lomonaco & Gomes Escritorio de Advocacia em Fortaleza | Advogado Criminalista" })
    expect(d).toMatchObject({
      pessoa: null,
      ancora: "Procurei Lomonaco & Gomes no Google e achei",
      referencia: "Lomonaco & Gomes",
      tratamento: "vocês",
    })
  })

  it("outro nicho com pessoa: âncora pelo negócio, tratamento você", () => {
    const d = dados({ ...SEM_LINK, nome: "Dra. Maria Souza - Dentista", categoria: "Clínica odontológica" })
    expect(d).toMatchObject({
      pessoa: "Maria Souza",
      ancora: "Procurei Dra. Maria Souza no Google e achei",
      referencia: "Dra. Maria Souza",
      tratamento: "você",
    })
  })

  it("sem bairro na mensagem", () => {
    expect(mensagemFixa(dados({ ...SEM_LINK, bairro: "Aldeota" }))).not.toMatch(/Aldeota|bairro/)
  })
})

describe("validarMensagem", () => {
  const d = dados(SEM_LINK)
  const valida = mensagemFixa(d)

  it("mensagem fixa passa, e 'site' como fato é permitido", () => {
    expect(valida).toContain("não tem site")
    expect(validarMensagem(valida, d)).toEqual([])
  })

  it("mais de uma interrogação", () => {
    expect(validarMensagem(`Tudo bem? ${valida}`, d)).toContain("mais_de_uma_pergunta")
  })

  it.each([
    ["Eu crio sites pra escritórios.", "oferta:eu crio"],
    ["eu faço isso rápido.", "oferta:eu faço"],
    ["Eu FACO isso.", "oferta:eu faço"],
    ["Posso desenvolver algo pra vocês.", "oferta:posso desenvolver"],
    ["Mando um orcamento.", "oferta:orçamento"],
    ["Mando uns orçamentos.", "oferta:orçamento"],
    ["Sai por R$ 500.", "oferta:R$"],
    ["Olha https://exemplo.com", "oferta:http"],
  ])("oferta: %s", (trecho, motivo) => {
    expect(validarMensagem(`${valida} ${trecho}`, d)).toContain(motivo)
  })

  it("todos os termos de oferta do config têm teste acima", () => {
    expect(TERMOS_DE_OFERTA).toEqual(["eu crio", "eu faço", "posso desenvolver", "orçamento", "R$", "http"])
  })

  it("termo no meio de outra palavra não conta", () => {
    expect(validarMensagem(`${valida} Leu crio`, d)).not.toContain("oferta:eu crio")
  })

  it("passa de 400 caracteres", () => {
    expect(validarMensagem(`${valida} ${"a".repeat(400)}`, d)).toContain("passa_de_400_caracteres")
  })

  it("sem o nome do negócio (maiúsculas não importam)", () => {
    expect(validarMensagem(valida.replace("Silva Advocacia", "o escritório"), d)).toContain("sem_nome_do_negocio")
    expect(validarMensagem(valida.replace("Silva Advocacia", "SILVA ADVOCACIA"), d)).toEqual([])
  })

  it("pergunta do nicho tem que estar literal (quebra de linha não importa)", () => {
    expect(validarMensagem(valida.replace("cai direto no WhatsApp", "vai pro WhatsApp"), d)).toContain(
      "sem_pergunta_do_nicho"
    )
    expect(validarMensagem(valida.replace("por lá cai", "por lá\ncai"), d)).toEqual([])
  })

  it("emoji, markdown e elogio", () => {
    expect(validarMensagem(valida.replace("Bom dia!", "Bom dia! 🙂"), d)).toEqual(["emoji"])
    expect(validarMensagem(valida.replace("Silva Advocacia", "*Silva Advocacia*"), d)).toContain("markdown")
    expect(validarMensagem(`Parabéns pelo trabalho! ${valida}`, d)).toContain("elogio:parabéns")
  })

  it("vazia", () => {
    expect(validarMensagem("  ", d)).toEqual(["vazia"])
  })
})

describe("redigirAbordagem", () => {
  const d = dados(SEM_LINK)
  const valida = mensagemFixa(d).replace("Procurei", "Pesquisei")
  const invalida = `Eu crio sites! ${valida}`

  it("Gemini válido de primeira", async () => {
    const redigir = vi.fn().mockResolvedValue(`  ${valida}\n`)
    expect(await redigirAbordagem(d, redigir)).toEqual({ tipo: "pronta", texto: valida, origem: "gemini", bloqueios: [] })
    expect(redigir).toHaveBeenCalledTimes(1)
  })

  it("bloqueado e depois válido: usa o retry e passa o bloqueio pra ele", async () => {
    const redigir = vi.fn().mockResolvedValueOnce(invalida).mockResolvedValueOnce(valida)
    const r = await redigirAbordagem(d, redigir)
    expect(r).toMatchObject({ tipo: "pronta", texto: valida, origem: "gemini" })
    expect(r.bloqueios).toEqual([{ tentativa: 1, motivos: ["oferta:eu crio"] }])
    expect(redigir).toHaveBeenNthCalledWith(2, d, [{ tentativa: 1, motivos: ["oferta:eu crio"] }])
  })

  it("bloqueado duas vezes: mensagem fixa, sem terceira chamada, com os motivos", async () => {
    const redigir = vi.fn().mockResolvedValue(invalida)
    const r = await redigirAbordagem(d, redigir)
    expect(r).toEqual({
      tipo: "pronta",
      texto: mensagemFixa(d),
      origem: "fixa",
      bloqueios: [
        { tentativa: 1, motivos: ["oferta:eu crio"] },
        { tentativa: 2, motivos: ["oferta:eu crio"] },
      ],
    })
    expect(redigir).toHaveBeenCalledTimes(2)
  })

  it("Gemini fora do ar: mensagem fixa, com o erro registrado", async () => {
    const redigir = vi.fn().mockRejectedValue(new Error("503 alta demanda"))
    const r = await redigirAbordagem(d, redigir)
    expect(r).toMatchObject({ tipo: "pronta", origem: "fixa", texto: mensagemFixa(d) })
    expect(r.bloqueios.map((b) => b.motivos)).toEqual([["erro: 503 alta demanda"], ["erro: 503 alta demanda"]])
  })

  it("nem a fixa passa: abordagem manual", async () => {
    const longo = dados({ ...SEM_LINK, nome: `Escritório ${"Muito ".repeat(60)}Grande` })
    const r = await redigirAbordagem(longo, vi.fn().mockResolvedValue(invalida))
    expect(r).toMatchObject({ tipo: "manual", motivo: "mensagem_fixa_invalida" })
    expect(r.bloqueios.at(-1)).toEqual({ tentativa: "fixa", motivos: ["passa_de_400_caracteres"] })
  })
})

describe("config", () => {
  // Nome longo de verdade (do banco).
  const LONGO = { nome: "Advocacia Trabalhista e Previdenciária João Simplício" }
  const CATEGORIA_DO_NICHO: Record<string, string> = {
    advocacia: "Advogado",
    alimentacao: "Confeitaria",
    agendamento: "Barbearia",
    varejo: "Loja de roupas",
    outros: "Escritório da empresa",
  }
  const DO_SITE: Partial<CamposDaAbordagem>[] = [
    SEM_LINK,
    link("https://instagram.com/x"),
    link("https://facebook.com/x"),
    link("https://twitter.com/x"),
    link("https://wa.me/5585999999999"),
    link("https://linktr.ee/x"),
    link("https://bio.link/x"),
    link("https://x.jusbrasil.com.br"),
    link("https://x.zapier.app"),
  ]
  const DE_COMERCIO: Partial<CamposDaAbordagem>[] = [
    { fotos_count: 0 },
    { fotos_count: 1 },
    { fotos_count: 4 },
    { google_avaliacoes_count: 0 },
    { google_avaliacoes_count: 3 },
  ]

  it("todo nicho do config tem categoria de teste", () => {
    expect(Object.keys(CATEGORIA_DO_NICHO).sort()).toEqual([...NICHOS, NICHO_PADRAO].map((n) => n.id).sort())
  })

  it("a mensagem fixa de toda combinação permitida passa na validação, em 3 linhas", () => {
    for (const nicho of [...NICHOS, NICHO_PADRAO]) {
      const variantes = nicho.comercio ? [...DO_SITE, ...DE_COMERCIO] : DO_SITE
      for (const variante of variantes) {
        const d = dados({ ...LONGO, categoria: CATEGORIA_DO_NICHO[nicho.id], ...variante })
        const texto = mensagemFixa(d)
        expect({ texto, motivos: validarMensagem(texto, d) }).toEqual({ texto, motivos: [] })
        expect(texto.split("\n")).toHaveLength(3)
        expect(texto).not.toMatch(/[—–]|\n\s*\n/)
      }
    }
  })
})
