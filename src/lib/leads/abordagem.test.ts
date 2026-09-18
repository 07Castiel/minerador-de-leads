import { describe, expect, it, vi } from "vitest"

import {
  descreverMotivo,
  escolherLacuna,
  mensagemDeRetorno,
  mensagemFixa,
  mensagemParaJanela,
  precisaReverificarSite,
  prepararAbordagem,
  redigirAbordagem,
  resolverNicho,
  saudacaoDoHorario,
  validarConteudo,
  validarMensagem,
  type CamposDaAbordagem,
  type DadosDaAbordagem,
  type OpcoesDaAbordagem,
} from "@/lib/leads/abordagem"
import {
  NICHOS,
  NICHO_PADRAO,
  TERMOS_BLOQUEADOS,
  TERMOS_BLOQUEADOS_POR_NICHO,
  TERMOS_DE_PALAVRA_INTEIRA,
} from "@/lib/leads/abordagemConfig"
import leadsReais from "@/lib/leads/fixtures/leads-reais.json"

// Mensagens reais geradas pelo fluxo antigo pro lead LUIZ CARLOS SILVA ADVOCACIA
// (Centro, Sobral, advocacia, lacuna sem site).
const FIXTURE_1 = `Bom dia! Falo com Luiz Carlos Silva Advocacia?

Encontrei vocês no Google e vi que ainda não têm um site. Eu crio sites para negócios aqui de Sobral, e um site bem feito costuma trazer cliente novo que hoje procura e não acha.

Posso te mandar uma ideia de como ficaria o de vocês?`

const FIXTURE_2 =
  "Bom dia! Encontrei Luiz Carlos Silva Advocacia no Google e vi que ainda não têm um site. Trabalho criando sites, posso te mostrar uma ideia rápida pra vocês?"

const FIXTURE_3 =
  "Bom dia! Tudo bem? Passando pra saber se você conseguiu ver minha mensagem sobre o site de Luiz Carlos Silva Advocacia. Se fizer sentido, te mando alguns sites que já fiz aqui em Sobral."

const FIXTURE_4 =
  "Bom dia, tudo bem? É do escritório do Dr. Luiz Carlos, aí do Centro de Sobral? Achei vocês no Google e vi que o pessoal avalia super bem o atendimento. Eu trabalho criando sites pra advogados e fiquei na dúvida se vocês já têm uma página própria pro cliente agendar consulta ou se resolvem tudo pelo WhatsApp mesmo. Quem é que cuida dessa parte de internet aí com vocês?"

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
    // Categorias que o Google deu na rodada do Ceará, cada uma no nicho-mãe
    ["Dentista", "agendamento"],
    ["Cirurgião dentista", "agendamento"],
    ["Ortodontista", "agendamento"],
    ["Manicure", "agendamento"],
    ["Serviço de depilação a cera", "agendamento"],
    ["Borracharia", "agendamento"],
    ["Funilaria", "agendamento"],
    ["Mecânico", "agendamento"],
    ["Lava-rápido", "agendamento"],
    ["Comércio de Pneu", "agendamento"],
    ["Delivery de Pizza", "alimentacao"],
    ["Fornecedor de materiais de construção", "varejo"],
    ["Comércio de materiais de construção", "varejo"],
    ["Construção", "varejo"],
    ["Construtora", "varejo"],
    ["Depósito", "varejo"],
    ["Fabricante", "varejo"],
    // Ficam de fora de propósito: não é o mesmo tipo de negócio dos nichos-mãe
    ["Posto de combustível", "outros"],
    ["Estacionamento", "outros"],
    ["Feira de automóveis", "outros"],
    ["Café", "outros"],
    ["Bar", "outros"],
    ["Supermercado", "outros"],
    ["Mercado", "outros"],
    ["Butique", "outros"],
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
    expect(resolverNicho("Escritório da empresa", "Pet shop").id).toBe("outros")
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
    ["https://www.instagram.com/silva.adv/", "o link só vai pro Instagram"],
    ["https://facebook.com/silva.adv", "o link só vai pro Facebook"],
    ["https://twitter.com/silva", "o link só vai pra uma rede social"],
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

  describe("site próprio com problema", () => {
    const COM_SITE = { tem_site: true, site_url: "https://silva.adv.br" } as const

    it("domínio inexistente (DNS não resolve)", () => {
      const d = dados({ ...COM_SITE, site_status: "fora_do_ar", site_falha: "ENOTFOUND" })
      expect(d.lacuna).toBe("site_dominio_inexistente")
      expect(d.textoDaLacuna).toBe("o endereço do site de vocês não existe mais")
      expect(d.textoCurtoDaLacuna).toBe("o endereço do site não existe mais")
    })

    it.each([["TIMEOUT"], ["ECONNREFUSED"], [null]])(
      "fora do ar por outro motivo (%s) não vira lacuna: medição única pode ser passageira",
      (falha) => {
        expect(preparar({ ...COM_SITE, site_status: "fora_do_ar", site_falha: falha }).tipo).toBe("manual")
      }
    )

    it("certificado vencido", () => {
      const d = dados({ ...COM_SITE, site_status: "certificado_invalido", site_falha: "CERT_HAS_EXPIRED" })
      expect(d.lacuna).toBe("site_certificado_invalido")
      expect(d.textoDaLacuna).toBe("o site de vocês tá dando erro de segurança pra quem abre")
      expect(d.textoCurtoDaLacuna).toBe("o site tá com erro de segurança")
    })

    it("domínio gratuito, com e sem o nome da plataforma", () => {
      const d = dados({ ...COM_SITE, site_dominio_gratuito: true, site_plataforma: "Google Sites" })
      expect(d.lacuna).toBe("site_dominio_gratuito")
      expect(d.textoDaLacuna).toBe("o site de vocês tá num endereço gratuito do Google Sites")
      expect(d.textoCurtoDaLacuna).toBe("o site tá num endereço gratuito do Google Sites")
      expect(dados({ ...COM_SITE, site_dominio_gratuito: true, site_plataforma: null }).textoDaLacuna).toBe(
        "o site de vocês tá num endereço gratuito"
      )
    })

    it("valem em qualquer nicho, não só em comércio", () => {
      for (const categoria of ["Advogado", "Confeitaria", "Escritório da empresa"]) {
        expect(dados({ ...COM_SITE, categoria, site_status: "fora_do_ar", site_falha: "ENOTFOUND" }).lacuna).toBe(
          "site_dominio_inexistente"
        )
      }
    })

    it("sem https e lento no celular ficam de fora", () => {
      expect(preparar({ ...COM_SITE, site_https: false }).tipo).toBe("descartado_sem_gancho")
      expect(preparar({ ...COM_SITE, site_nota_celular: 12 }).tipo).toBe("descartado_sem_gancho")
    })
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
    expect(preparar({ ...COMERCIO, fotos_count: 5 }).tipo).toBe("descartado_sem_gancho")
    expect(preparar({ ...COMERCIO, fotos_count: null }).tipo).toBe("descartado_sem_gancho")
  })

  it("5 (comércio): pouca avaliação, e zero não vira 'quase não tem'", () => {
    const d = dados({ ...COMERCIO, google_avaliacoes_count: 3 })
    expect(d.lacuna).toBe("pouca_avaliacao")
    expect(d.textoDaLacuna).toBe("o perfil quase não tem avaliação")
    expect(dados({ ...COMERCIO, google_avaliacoes_count: 0 }).textoDaLacuna).toBe("o perfil ainda não tem avaliação")
  })

  it("5: 4 avaliações ou contagem desconhecida não é lacuna", () => {
    expect(preparar({ ...COMERCIO, google_avaliacoes_count: 4 }).tipo).toBe("descartado_sem_gancho")
    expect(preparar({ ...COMERCIO, google_avaliacoes_count: null }).tipo).toBe("descartado_sem_gancho")
  })

  it("3 e 5 só em comércio: advocacia e outros com poucas fotos e avaliações não viram lacuna", () => {
    expect(preparar({ fotos_count: 1, google_avaliacoes_count: 0 })).toMatchObject({ tipo: "descartado_sem_gancho" })
    expect(preparar({ categoria: "Contador", fotos_count: 1, google_avaliacoes_count: 0 })).toMatchObject({
      tipo: "descartado_sem_gancho",
      nicho: "outros",
    })
  })

  it("horário desconhecido não vira lacuna (lacuna 2 desligada)", () => {
    expect(preparar({}).tipo).toBe("descartado_sem_gancho")
  })
})

describe("descartado_sem_gancho x manual", () => {
  const COM_SITE = { tem_site: true, site_url: "https://silva.adv.br" } as const

  it("site que abre, analisado e sem defeito: fim de linha", () => {
    expect(preparar({ ...COM_SITE, site_status: "ok" })).toEqual({
      tipo: "descartado_sem_gancho",
      nicho: "advocacia",
    })
  })

  it.each([
    ["site fora do ar sem ser DNS (medição inconclusiva)", { site_status: "fora_do_ar" as const, site_falha: "TIMEOUT" }],
    ["site nunca analisado", { site_status: null, site_analisado_em: null }],
    ["link que não é site próprio nem rede social", { tem_site: false, site_url: "https://silva.business.site" }],
    ["sem saber se tem site", { tem_site: null, site_url: null, site_status: null }],
  ])("%s: continua manual", (_, lead) => {
    expect(preparar({ ...COM_SITE, ...lead })).toMatchObject({ tipo: "manual", motivo: "sem_lacuna" })
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
  // Põe o trecho no meio da mensagem, sem mudar o número de linhas.
  const comTrecho = (trecho: string) => valida.replace("só o telefone.", `só o telefone. ${trecho}`)

  it("mensagem fixa passa, e 'site' como fato é permitido", () => {
    expect(valida).toContain("não tem site")
    expect(validarMensagem(valida, d)).toEqual([])
  })

  it("mais de uma interrogação", () => {
    expect(validarMensagem(`Tudo bem? ${valida}`, d)).toContain("mais_de_uma_pergunta")
  })

  it("passa de 400 caracteres", () => {
    expect(validarMensagem(comTrecho("a".repeat(400)), d)).toContain("passa_de_400_caracteres")
  })

  it("sem o nome do negócio (maiúsculas não importam)", () => {
    expect(validarMensagem(valida.replace("Silva Advocacia", "o escritório"), d)).toContain("sem_nome_do_negocio")
    expect(validarMensagem(valida.replace("Silva Advocacia", "SILVA ADVOCACIA"), d)).toEqual([])
  })

  it("pergunta do nicho tem que estar literal (espaço repetido não importa)", () => {
    expect(validarMensagem(valida.replace("cai direto no WhatsApp", "vai pro WhatsApp"), d)).toContain(
      "sem_pergunta_do_nicho"
    )
    expect(validarMensagem(valida.replace("por lá cai", "por lá  cai"), d)).toEqual([])
  })

  it("emoji e markdown", () => {
    expect(validarMensagem(valida.replace("Bom dia!", "Bom dia! 🙂"), d)).toEqual(["emoji"])
    expect(validarMensagem(valida.replace("Silva Advocacia", "*Silva Advocacia*"), d)).toContain("markdown")
  })

  it("vazia", () => {
    expect(validarMensagem("  ", d)).toEqual(["vazia"])
  })

  // O nome vem do Google: "Barbearia_o_nony" não é formatação escrita pela
  // abordagem, nem "Top Car" é elogio. Fora do nome, as duas regras seguem valendo.
  it("nome do lead não dispara markdown nem elogio", () => {
    const comUnderline = dados({ ...SEM_LINK, ...COMERCIO, nome: "Barbearia_o_nony" })
    expect(validarMensagem(mensagemFixa(comUnderline), comUnderline)).toEqual([])

    const comTop = dados({ ...SEM_LINK, ...COMERCIO, nome: "Oficina Mecânica Top Car" })
    const texto = mensagemFixa(comTop)
    expect(validarMensagem(texto, comTop)).toEqual([])
    expect(validarMensagem(texto.replace("no Google", "no Google, perfil top"), comTop)).toContain("elogio:top")
    expect(validarMensagem(texto.replace("no Google", "no Google _ali_"), comTop)).toContain("markdown")
  })

  describe("(a) marcas de IA", () => {
    it.each([
      ["—", "marca_de_ia:travessão"],
      ["–", "marca_de_ia:meia-risca"],
      ["…", "marca_de_ia:reticências"],
      ["...", "marca_de_ia:reticências"],
    ])("%s", (marca, motivo) => {
      expect(validarMensagem(comTrecho(`Vi ${marca} de novo.`), d)).toEqual([motivo])
    })

    it("mais de 2 quebras de linha", () => {
      expect(validarMensagem(`${valida}\nAbraço.`, d)).toEqual(["marca_de_ia:mais_de_2_quebras"])
    })

    it("linha em branco entre linhas de texto", () => {
      expect(validarMensagem(valida.replace("Sobral.\n", "Sobral.\n\n"), d)).toContain("marca_de_ia:linha_em_branco")
      expect(validarMensagem(valida.replace("Sobral.\n", "Sobral.\n  \n"), d)).toContain("marca_de_ia:linha_em_branco")
    })

    it("quebra no fim e hífen comum não contam", () => {
      expect(validarMensagem(`${valida}\n`, d)).toEqual([])
      expect(validarMensagem(comTrecho("Advocacia-Especialista."), d)).toEqual([])
    })
  })

  // Cada termo do config numa frase natural. Sem acento e sem caixa, por início de palavra.
  const CASOS: Record<string, [frase: string, termo: string][]> = {
    oferta: [
      ["Eu crio isso pra escritórios.", "eu crio"],
      ["EU FACO isso rápido.", "eu faço"],
      ["Crio sites pra advogados.", "crio sites"],
      ["Trabalho criando páginas.", "trabalho criando"],
      ["Posso desenvolver algo pra vocês.", "posso desenvolver"],
      ["Posso criar uma página.", "posso criar"],
      ["Faco sites pra advogados.", "faço sites"],
      ["Monto a página de vocês.", "monto"],
      ["Desenvolvo isso há anos.", "desenvolvo"],
      ["Mando uns orcamentos.", "orçamento"],
      ["Sai por R$ 500.", "R$"],
      ["Olha https://exemplo.com.", "http"],
    ],
    permissao: [
      ["Posso te mandar uma ideia.", "posso te mandar"],
      ["Posso te mostrar como fica.", "posso te mostrar"],
      ["Posso mandar um exemplo.", "posso mandar"],
      ["Te mando uns modelos.", "te mando"],
      ["Te mostro rapidinho.", "te mostro"],
      ["Quer que eu faça um teste.", "quer que eu"],
      ["Você gostaria de ver.", "gostaria de ver"],
      ["Se fizer sentido, a gente conversa.", "se fizer sentido"],
    ],
    promessa: [
      ["Isso ajuda a trazer cliente.", "trazer cliente"],
      ["Dá pra ter mais clientes.", "mais clientes"],
      ["Chegam novos clientes.", "novos clientes"],
      ["Isso pode aumentar a procura.", "aumentar"],
      ["Com isso vai vender mais.", "vai vender mais"],
      ["Um site costuma trazer gente nova.", "costuma trazer"],
    ],
    elogio: [
      ["Excelente atendimento o de vocês.", "excelente atendimento"],
      ["Parabéns pelo trabalho.", "parabéns"],
      ["Um escritório incrível.", "incrível"],
      ["Adorei o perfil.", "adorei"],
      ["Perfil top.", "top"],
    ],
    advocacia: [
      ["O cliente pode agendar consulta.", "agendar consulta"],
      ["Facilita o agendamento.", "agendamento"],
      ["O pessoal avalia bem vocês.", "avalia bem"],
      ["O pessoal avalia super bem.", "avalia super bem"],
      ["Vocês têm avaliacoes otimas.", "avaliações ótimas"],
      ["Vi as boas avaliações.", "boas avaliações"],
    ],
  }
  const REGRAS = [
    ["(b) verbo de oferta em 1ª pessoa", "oferta"],
    ["(c) fechamento pedindo permissão", "permissao"],
    ["(d) promessa de resultado", "promessa"],
    ["(e) só na advocacia", "advocacia"],
    ["(f) elogio", "elogio"],
  ] as const

  describe.each(REGRAS)("%s", (_, grupo) => {
    it.each(CASOS[grupo])("%s", (frase, termo) => {
      expect(validarMensagem(comTrecho(frase), d)).toContain(`${grupo}:${termo}`)
    })

    it("todo termo do config tem caso", () => {
      const doConfig = grupo === "advocacia" ? TERMOS_BLOQUEADOS_POR_NICHO.advocacia : TERMOS_BLOQUEADOS[grupo]
      expect(CASOS[grupo].map(([, termo]) => termo)).toEqual(doConfig)
    })
  })

  it("termo no meio de outra palavra não conta", () => {
    expect(validarMensagem(comTrecho("Leu crio."), d)).toEqual([])
    expect(validarMensagem(comTrecho("Desmonto tudo."), d)).toEqual([])
  })

  describe("termos curtos só bloqueiam como palavra inteira (sem falso positivo silencioso)", () => {
    it.each([
      ["Vocês aparecem no topo do Google.", "top"],
      ["Vi um tópico sobre isso.", "top"],
      ["Ele montou o escritório sozinho.", "monto"],
      ["Alguém te mandou o link.", "te mando"],
      ["O Google te mostrou o perfil.", "te mostro"],
    ])("%s", (frase) => {
      expect(validarMensagem(comTrecho(frase), d)).toEqual([])
    })

    it("mas continuam bloqueando a palavra em si", () => {
      expect(validarMensagem(comTrecho("Perfil top."), d)).toContain("elogio:top")
      expect(validarMensagem(comTrecho("Monto rapidinho."), d)).toContain("oferta:monto")
      expect(validarMensagem(comTrecho("Te mando depois."), d)).toContain("permissao:te mando")
      expect(validarMensagem(comTrecho("Te mostro depois."), d)).toContain("permissao:te mostro")
    })

    it("são exatamente estes quatro", () => {
      expect(TERMOS_DE_PALAVRA_INTEIRA).toEqual(["top", "monto", "te mando", "te mostro"])
    })

    it("os outros termos continuam por início de palavra", () => {
      expect(validarMensagem(comTrecho("Mando uns orcamentos."), d)).toContain("oferta:orçamento")
      expect(validarMensagem(comTrecho("Isso aumentaria a procura."), d)).toContain("promessa:aumentar")
    })
  })

  it("descreverMotivo deixa o motivo legível na janela", () => {
    expect(descreverMotivo("permissao:te mando")).toBe('pedido de permissão ("te mando")')
    expect(descreverMotivo("marca_de_ia:travessão")).toBe("travessão")
    expect(descreverMotivo("marca_de_ia:mais_de_2_quebras")).toBe("mais de 2 quebras de linha")
    expect(descreverMotivo("sem_pergunta_do_nicho")).toBe("a pergunta final mudou")
    expect(descreverMotivo("advocacia:agendamento")).toBe('termo vedado na advocacia ("agendamento")')
  })

  it("(e) vale só na advocacia", () => {
    expect(validarConteudo("Facilita o agendamento.", "advocacia")).toEqual(["advocacia:agendamento"])
    expect(validarConteudo("Facilita o agendamento.", "agendamento")).toEqual([])
    expect(validarConteudo("Facilita o agendamento.")).toEqual([])
  })
})

describe("fixtures reais (bloqueadas)", () => {
  // LUIZ CARLOS SILVA ADVOCACIA, Centro, Sobral, advocacia, lacuna 1a
  const d = dados({ ...SEM_LINK, nome: "LUIZ CARLOS SILVA ADVOCACIA", categoria: "Advogado", bairro: "Centro", cidade: "Sobral" })
  const motivos = (texto: string) => [...validarMensagem(texto, d)].sort()

  it("o lead das fixtures é advocacia, lacuna sem site, citando Luiz Carlos", () => {
    expect(d).toMatchObject({ nicho: "advocacia", lacuna: "sem_site", referencia: "Luiz Carlos" })
  })

  it("1: modelo salvo 'primeira abordagem'", () => {
    expect(motivos(FIXTURE_1)).toEqual(
      [
        "oferta:eu crio",
        "oferta:crio sites",
        "promessa:trazer cliente",
        "promessa:costuma trazer",
        "permissao:posso te mandar",
        "mais_de_uma_pergunta",
        "marca_de_ia:linha_em_branco",
        "marca_de_ia:mais_de_2_quebras",
        "sem_pergunta_do_nicho",
      ].sort()
    )
  })

  it("2: modelo salvo 'abordagem curta'", () => {
    expect(motivos(FIXTURE_2)).toEqual(
      ["oferta:trabalho criando", "permissao:posso te mostrar", "sem_pergunta_do_nicho"].sort()
    )
  })

  it("3: modelo salvo 'retorno' (tem uma interrogação só, 'Tudo bem?')", () => {
    expect(motivos(FIXTURE_3)).toEqual(
      ["permissao:se fizer sentido", "permissao:te mando", "sem_pergunta_do_nicho"].sort()
    )
  })

  it("4: Gemini do fluxo antigo, que abriu com avaliação num lead sem site", () => {
    expect(motivos(FIXTURE_4)).toEqual(
      [
        "advocacia:avalia super bem",
        "advocacia:agendar consulta",
        "oferta:trabalho criando",
        "mais_de_uma_pergunta",
        "sem_pergunta_do_nicho",
      ].sort()
    )
  })
})

describe("modelos que eram salvos no banco", () => {
  const d = dados({ ...SEM_LINK, nome: "LUIZ CARLOS SILVA ADVOCACIA", categoria: "Advogado", bairro: "Centro", cidade: "Sobral" })

  it("abordagem curta: mesma estrutura e mesma pergunta, observação enxuta", () => {
    expect(mensagemFixa(d, "curta")).toBe(
      "Bom dia! Aqui é o Leonardo, de Sobral.\n" +
        "Procurei o escritório de Luiz Carlos no Google e achei, mas não tem site.\n" +
        "Quem te procura por lá cai direto no WhatsApp ou vocês mandam alguma página antes?"
    )
    expect(validarMensagem(mensagemFixa(d, "curta"), d)).toEqual([])
  })

  it("retorno: texto único, sem emoji, e passa nas regras de conteúdo", () => {
    expect(mensagemDeRetorno()).toBe("Oi! Só confirmando se essa mensagem chegou.")
    expect(validarConteudo(mensagemDeRetorno(), "advocacia")).toEqual([])
  })
})

describe("redigirAbordagem", () => {
  const d = dados(SEM_LINK)
  const valida = mensagemFixa(d).replace("Procurei", "Pesquisei")
  const invalida = `Eu crio isso pra vocês! ${valida}`

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

  it("Gemini inventando gancho (fixture 4) num lead sem site: bloqueado, retry, texto fixo com o motivo", async () => {
    const luiz = dados({ ...SEM_LINK, nome: "LUIZ CARLOS SILVA ADVOCACIA", categoria: "Advogado", cidade: "Sobral" })
    const redigir = vi.fn().mockResolvedValue(FIXTURE_4)
    const r = await redigirAbordagem(luiz, redigir)
    expect(redigir).toHaveBeenCalledTimes(2)
    expect(r).toMatchObject({ tipo: "pronta", origem: "fixa", texto: mensagemFixa(luiz) })
    expect(r.bloqueios).toHaveLength(2)
    for (const bloqueio of r.bloqueios) {
      expect(bloqueio.motivos).toEqual(expect.arrayContaining(["advocacia:avalia super bem", "advocacia:agendar consulta"]))
    }
  })

  it("nem a fixa passa: abordagem manual", async () => {
    const longo = dados({ ...SEM_LINK, nome: `Escritório ${"Muito ".repeat(60)}Grande` })
    const r = await redigirAbordagem(longo, vi.fn().mockResolvedValue(invalida))
    expect(r).toMatchObject({ tipo: "manual", motivo: "mensagem_fixa_invalida" })
    expect(r.bloqueios.at(-1)).toEqual({ tentativa: "fixa", motivos: ["passa_de_400_caracteres"] })
  })
})

describe("mensagemParaJanela", () => {
  const LUIZ = { ...OK, ...SEM_LINK, nome: "LUIZ CARLOS SILVA ADVOCACIA", bairro: "Centro", cidade: "Sobral" }
  const ouro = mensagemFixa(dados(LUIZ))
  const validacao = {
    referencia: "Luiz Carlos",
    pergunta: "Quem te procura por lá cai direto no WhatsApp ou vocês mandam alguma página antes?",
    nicho: "advocacia",
  }

  it("fora do horário bloqueia, em qualquer modo, sem chamar o Gemini", async () => {
    const redigir = vi.fn()
    const noite = new Date("2026-09-18T00:30:00Z") // 21:30
    for (const modo of ["completa", "curta", "gemini"] as const) {
      expect(await mensagemParaJanela(LUIZ, noite, modo, {}, redigir)).toEqual({ tipo: "fora_do_horario" })
    }
    expect(redigir).not.toHaveBeenCalled()
  })

  it("lead descartado ou manual não oferece geração nem chama o Gemini", async () => {
    const redigir = vi.fn()
    expect(await mensagemParaJanela(OK, MANHA, "gemini", {}, redigir)).toEqual({ tipo: "descartado_sem_gancho" })
    const inconclusivo = { ...OK, site_status: "fora_do_ar" as const, site_falha: "TIMEOUT" }
    expect(await mensagemParaJanela(inconclusivo, MANHA, "gemini", {}, redigir)).toEqual({
      tipo: "manual",
      motivo: "sem_lacuna",
      bloqueios: [],
    })
    expect(redigir).not.toHaveBeenCalled()
  })

  it("texto fixo e curto saem prontos, com o que a janela precisa pra validar edição", async () => {
    expect(await mensagemParaJanela(LUIZ, MANHA, "completa")).toEqual({
      tipo: "pronta",
      lacuna: "sem_site",
      texto: ouro,
      origem: "fixa",
      bloqueios: [],
      validacao,
    })
    expect(await mensagemParaJanela(LUIZ, MANHA, "curta")).toMatchObject({ texto: mensagemFixa(dados(LUIZ), "curta") })
  })

  it("Gemini que respeita a estrutura: origem gemini", async () => {
    const redacao = ouro.replace("Procurei o escritório", "Procurei aqui o escritório")
    const r = await mensagemParaJanela(LUIZ, MANHA, "gemini", {}, vi.fn().mockResolvedValue(redacao))
    expect(r).toMatchObject({ tipo: "pronta", texto: redacao, origem: "gemini", bloqueios: [], validacao })
  })

  it("Gemini devolvendo a fixture 4: bloqueado, retry, texto fixo com os motivos", async () => {
    const redigir = vi.fn().mockResolvedValue(FIXTURE_4)
    const r = await mensagemParaJanela(LUIZ, MANHA, "gemini", {}, redigir)
    expect(redigir).toHaveBeenCalledTimes(2)
    expect(r).toMatchObject({ tipo: "pronta", texto: ouro, origem: "fixa" })
    if (r.tipo !== "pronta") throw new Error("esperava pronta")
    expect(r.bloqueios.map((b) => b.tentativa)).toEqual([1, 2])
    expect(r.bloqueios[0].motivos).toContain("advocacia:avalia super bem")
  })

  it("Gemini com a mensagem certa mas a pergunta reescrita: bloqueado por 'sem a pergunta do nicho'", async () => {
    const reescrita = ouro.replace(
      "Quem te procura por lá cai direto no WhatsApp ou vocês mandam alguma página antes?",
      "Quem procura vocês por lá vai direto pro WhatsApp ou vê alguma página antes?"
    )
    const r = await mensagemParaJanela(LUIZ, MANHA, "gemini", {}, vi.fn().mockResolvedValue(reescrita))
    expect(r).toMatchObject({ origem: "fixa", texto: ouro })
    if (r.tipo !== "pronta") throw new Error("esperava pronta")
    expect(r.bloqueios).toEqual([
      { tentativa: 1, motivos: ["sem_pergunta_do_nicho"] },
      { tentativa: 2, motivos: ["sem_pergunta_do_nicho"] },
    ])
  })

  it("Gemini com travessão: bloqueado por marca de IA", async () => {
    const comTravessao = ouro.replace("e achei, mas", "e achei — mas")
    const r = await mensagemParaJanela(LUIZ, MANHA, "gemini", {}, vi.fn().mockResolvedValue(comTravessao))
    if (r.tipo !== "pronta") throw new Error("esperava pronta")
    expect(r.origem).toBe("fixa")
    expect(r.bloqueios[0]).toEqual({ tentativa: 1, motivos: ["marca_de_ia:travessão"] })
  })

  it("Gemini falhando duas vezes (API): texto fixo, sem erro, com o motivo", async () => {
    const r = await mensagemParaJanela(LUIZ, MANHA, "gemini", {}, vi.fn().mockRejectedValue(new Error("429 limite")))
    expect(r).toMatchObject({ tipo: "pronta", texto: ouro, origem: "fixa" })
    if (r.tipo !== "pronta") throw new Error("esperava pronta")
    expect(r.bloqueios.map((b) => b.motivos)).toEqual([["erro: 429 limite"], ["erro: 429 limite"]])
  })

  it("modo gemini sem redator é erro de programação", async () => {
    await expect(mensagemParaJanela(LUIZ, MANHA, "gemini")).rejects.toThrow("sem redator")
  })
})

describe("reverificação do site", () => {
  const COM_SITE = { ...OK, tem_site: true, site_url: "https://silva.adv.br", site_status: "ok" as const }

  it.each([
    ["análise de hoje", "2026-09-17T09:00:00Z", false],
    ["análise de 3 dias", "2026-09-14T13:30:00Z", false],
    ["análise de 4 dias", "2026-09-13T13:00:00Z", true],
    ["nunca analisado", null, true],
  ])("%s → reverifica? %s", (_, analisadoEm, esperado) => {
    expect(precisaReverificarSite({ ...COM_SITE, site_analisado_em: analisadoEm }, MANHA)).toBe(esperado)
  })

  it("lead sem site próprio nunca reverifica", () => {
    expect(precisaReverificarSite({ tem_site: false, site_analisado_em: null }, MANHA)).toBe(false)
    expect(precisaReverificarSite({ tem_site: null, site_analisado_em: null }, MANHA)).toBe(false)
  })

  it("site que caiu desde a última análise: a lacuna sai da análise nova", async () => {
    const velho = { ...COM_SITE, site_analisado_em: "2026-09-01T12:00:00Z" }
    const reverificar = vi.fn().mockResolvedValue({
      site_analisado_em: MANHA.toISOString(),
      site_status: "fora_do_ar",
      site_falha: "ENOTFOUND",
    })
    const r = await mensagemParaJanela(velho, MANHA, "completa", {}, undefined, reverificar)
    expect(reverificar).toHaveBeenCalledTimes(1)
    expect(r).toMatchObject({ tipo: "pronta", lacuna: "site_dominio_inexistente" })
    if (r.tipo !== "pronta") throw new Error("esperava pronta")
    expect(r.texto).toContain("o endereço do site de vocês não existe mais")
  })

  it("site que voltou desde a última análise: deixa de ter lacuna", async () => {
    const caido = {
      ...COM_SITE,
      site_status: "fora_do_ar" as const,
      site_falha: "ENOTFOUND",
      site_analisado_em: "2026-09-01T12:00:00Z",
    }
    expect((await mensagemParaJanela(caido, MANHA, "completa")).tipo).toBe("pronta")
    const reverificar = vi.fn().mockResolvedValue({
      site_analisado_em: MANHA.toISOString(),
      site_status: "ok",
      site_falha: null,
    })
    expect(await mensagemParaJanela(caido, MANHA, "completa", {}, undefined, reverificar)).toEqual({
      tipo: "descartado_sem_gancho",
    })
  })

  it("análise recente não chama a reverificação", async () => {
    const reverificar = vi.fn()
    await mensagemParaJanela({ ...COM_SITE, site_analisado_em: MANHA.toISOString() }, MANHA, "completa", {}, undefined, reverificar)
    expect(reverificar).not.toHaveBeenCalled()
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

  it("a mensagem fixa (completa e curta) de toda combinação permitida passa na validação, em 3 linhas", () => {
    for (const nicho of [...NICHOS, NICHO_PADRAO]) {
      const variantes = nicho.comercio ? [...DO_SITE, ...DE_COMERCIO] : DO_SITE
      for (const variante of variantes) {
        const d = dados({ ...LONGO, categoria: CATEGORIA_DO_NICHO[nicho.id], ...variante })
        for (const formato of ["completa", "curta"] as const) {
          const texto = mensagemFixa(d, formato)
          expect({ texto, motivos: validarMensagem(texto, d) }).toEqual({ texto, motivos: [] })
          expect(texto.split("\n")).toHaveLength(3)
          expect(texto).not.toMatch(/[—–…]|\.\.\.|\n\s*\n/)
        }
      }
    }
  })
})

describe("os 100 leads reais", () => {
  type LeadReal = CamposDaAbordagem & { termo_da_busca: string | null }
  const leads = leadsReais as unknown as LeadReal[]
  // 10h, 14h e 19h em Fortaleza: as três saudações
  const HORARIOS = ["2026-09-18T13:00:00Z", "2026-09-18T17:00:00Z", "2026-09-18T22:00:00Z"].map((iso) => new Date(iso))

  it("são os 100 do banco", () => {
    expect(leads).toHaveLength(100)
  })

  it("nenhuma mensagem regenerada cai em regra nenhuma, nem tem travessão, linha em branco ou 2 perguntas", () => {
    const problemas: { nome: string; texto: string; motivos: string[] }[] = []
    for (const lead of leads) {
      for (const agora of HORARIOS) {
        const r = prepararAbordagem(lead, agora, { termoDaBusca: lead.termo_da_busca })
        if (r.tipo !== "pronta") continue
        for (const formato of ["completa", "curta"] as const) {
          const texto = mensagemFixa(r.dados, formato)
          const motivos = validarMensagem(texto, r.dados)
          if (/[—–…]|\.\.\./.test(texto)) motivos.push("travessão ou reticências")
          if (/\n\s*\n/.test(texto)) motivos.push("linha em branco")
          if ((texto.match(/\?/g) ?? []).length > 1) motivos.push("mais de uma ?")
          if (motivos.length > 0) problemas.push({ nome: lead.nome, texto, motivos })
        }
      }
    }
    expect(problemas).toEqual([])
  })

  it("distribuição de hoje, já com a análise de site", () => {
    const contagem: Record<string, number> = {}
    for (const lead of leads) {
      const r = prepararAbordagem(lead, HORARIOS[0], { termoDaBusca: lead.termo_da_busca })
      const chave = r.tipo === "pronta" ? r.dados.lacuna : r.tipo
      contagem[chave] = (contagem[chave] ?? 0) + 1
    }
    expect(contagem).toEqual({
      sem_site: 28,
      link_fora_do_site: 21,
      site_dominio_inexistente: 5,
      site_certificado_invalido: 2,
      site_dominio_gratuito: 2,
      // site que abre e não tem defeito: fim de linha
      descartado_sem_gancho: 40,
      // os 2 sites que responderam 404 e 500: medição inconclusiva, dá pra rever
      manual: 2,
    })
  })
})
