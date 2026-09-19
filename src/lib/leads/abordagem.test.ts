import { describe, expect, it, vi } from "vitest"

import {
  apresentacaoDoNicho,
  descreverMotivo,
  escolherLacuna,
  mensagemDeRetorno,
  mensagemDeSaudacao,
  mensagemFixa,
  mensagemParaJanela,
  precisaReverificarSite,
  prepararAbordagem,
  ramoDaApresentacao,
  redigirAbordagem,
  resolverNicho,
  saudacaoDoHorario,
  validarApresentacao,
  validarConteudo,
  validarMensagem,
  type CamposDaAbordagem,
  type DadosDaAbordagem,
  type OpcoesDaAbordagem,
} from "@/lib/leads/abordagem"
import {
  ABERTURA_DA_APRESENTACAO,
  APRESENTACAO_PADRAO,
  APRESENTACAO_POR_NICHO,
  FECHAMENTO_DA_APRESENTACAO,
  NICHOS,
  NICHO_PADRAO,
  REMETENTE,
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

  it("a saudação vai sozinha, na mensagem 1", () => {
    expect(mensagemDeSaudacao(dados(lead))).toBe("Bom dia! Tudo bem?")
  })

  it("mensagemFixa sai num parágrafo só, sem dizer quem está falando", () => {
    expect(mensagemFixa(dados(lead))).toBe(
      "Tava procurando o escritório de Luiz Carlos no Google e vi que não tem site, só o telefone. " +
        "Fiquei curioso: quem te procura chega direto aqui pelo WhatsApp?"
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
    ["Clínica odontológica", "saude"],
    ["Oficina mecânica", "agendamento"],
    ["Loja de roupas", "varejo"],
    ["Escritório da empresa", "outros"],
    [null, "outros"],
    // Categorias que o Google deu na rodada do Ceará, cada uma no nicho-mãe
    ["Dentista", "saude"],
    ["Cirurgião dentista", "saude"],
    ["Ortodontista", "saude"],
    // "clinica" continua em agendamento: estética não é profissão de conselho
    // com trava de publicidade, e a agenda é a mesma do salão.
    ["Clínica de estética", "agendamento"],
    // Veterinária casaria com "clinica"; "pet" vem antes de propósito.
    ["Clínica veterinária", "pet"],
    ["Pet shop", "pet"],
    ["Academia", "fitness"],
    ["Estúdio de pilates", "fitness"],
    ["Escola de idiomas", "educacao"],
    ["Autoescola", "educacao"],
    ["Hotel", "hospedagem"],
    ["Pousada", "hospedagem"],
    ["Imobiliária", "imobiliario"],
    ["Corretor de imóveis", "imobiliario"],
    // "imovei" não pode pegar "móveis"
    ["Loja de móveis", "varejo"],
    ["Chaveiro", "servico_tecnico"],
    ["Assistência técnica", "servico_tecnico"],
    // "Assistência jurídica" é advocacia: advocacia vem antes
    ["Assistência jurídica", "advocacia"],
    // Estúdio de tatuagem não vende plano: "estudio" solto ficaria com ele
    ["Estúdio de tatuagem", "outros"],
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
    ["Bar", "outros"],
    ["Supermercado", "outros"],
    ["Mercado", "outros"],
    // Não ficavam de fora por serem outro tipo de negócio, e sim por causa da
    // grafia que o Google devolve: "cafeteria" não pega "Café", e a lista só
    // tinha "boutique".
    ["Café", "alimentacao"],
    ["Cafeteria", "alimentacao"],
    ["Butique", "varejo"],
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
    // "Floricultura" está nas sugestões da busca e ainda não tem nicho próprio
    expect(resolverNicho("Escritório da empresa", "Floricultura").id).toBe("outros")
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
      "quem te procura chega direto aqui pelo WhatsApp?"
    )
    expect(resolverNicho("Confeitaria").pergunta).toBe("as encomendas que não são feitas no balcão chegam todas aqui pelo WhatsApp?")
    expect(resolverNicho("Barbearia").pergunta).toBe("os horários que vocês marcam chegam todos aqui pelo WhatsApp?")
    expect(resolverNicho("Loja de roupas").pergunta).toBe("quando perguntam preço, vocês mandam foto uma por uma aqui?")
    expect(resolverNicho("Dentista").pergunta).toBe(
      "quem precisa marcar um horário com vocês resolve tudo por aqui?"
    )
    expect(resolverNicho("Pet shop").pergunta).toBe("quem quer marcar um banho e tosa chega aqui pelo WhatsApp?")
    expect(resolverNicho("Academia").pergunta).toBe("quem quer conhecer os planos de vocês chega aqui pelo WhatsApp?")
    expect(resolverNicho("Escola de idiomas").pergunta).toBe("quem procura vaga chega aqui pelo WhatsApp?")
    expect(resolverNicho("Pousada").pergunta).toBe("as reservas de vocês chegam todas aqui pelo WhatsApp?")
    expect(resolverNicho("Imobiliária").pergunta).toBe("quem se interessa por um imóvel chega aqui pelo WhatsApp?")
    expect(resolverNicho("Chaveiro").pergunta).toBe("quando precisam de vocês, o chamado chega aqui pelo WhatsApp?")
    expect(resolverNicho(null).pergunta).toBe("é tudo por aqui mesmo?")
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
    ["https://www.instagram.com/silva.adv/", "o link de vocês leva só pro Instagram"],
    ["https://facebook.com/silva.adv", "o link de vocês leva só pro Facebook"],
    ["https://twitter.com/silva", "o link de vocês leva só pra uma rede social"],
    ["https://wa.link/abc123", "o link abre o WhatsApp direto, sem site"],
    ["https://linktr.ee/silva", "o link de vocês leva pra uma página no Linktree"],
    ["https://eduardo.linkbio.co", "o link de vocês leva pra uma página no Linkbio"],
    ["https://bio.link/silva", "o link só vai pra uma página de links"],
    ["https://silva.jusfy.com.br", "o link de vocês leva pra uma página no Jusfy"],
    ["https://silva.jusbrasil.com.br", "o link de vocês leva pra uma página no Jusbrasil"],
    ["https://chat-e923e9.zapier.app", "o link de vocês leva pra uma página no Zapier"],
  ])("1b: %s → %s", (url, texto) => {
    const d = dados(link(url))
    expect(d.lacuna).toBe("link_fora_do_site")
    expect(d.textoDaLacuna).toBe(texto)
  })

  describe("pergunta própria quando o link vai pra uma página", () => {
    const PERGUNTA_DA_PAGINA = "quem te procura por lá chega a ver suas áreas de atuação?"
    const PERGUNTA_DA_ADVOCACIA = "quem te procura chega direto aqui pelo WhatsApp?"

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
        "as encomendas que não são feitas no balcão chegam todas aqui pelo WhatsApp?"
      )
    })

    it("a mensagem fixa termina na pergunta da lacuna e passa na validação", () => {
      const d = dados(link("https://silva.jusbrasil.com.br"))
      const texto = mensagemFixa(d)
      expect(texto.endsWith(PERGUNTA_DA_PAGINA)).toBe(true)
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

  it("saúde e escola também ficam fora de 3 e 5; o pet shop ao lado continua dentro", () => {
    // Mesma falta, nichos diferentes: numa clínica, "quase não tem avaliação"
    // é argumento apoiado em avaliação de paciente, que os conselhos restringem.
    const poucas = { fotos_count: 1, google_avaliacoes_count: 0 }
    expect(preparar({ ...poucas, categoria: "Clínica odontológica" })).toMatchObject({
      tipo: "descartado_sem_gancho",
      nicho: "saude",
    })
    expect(preparar({ ...poucas, categoria: "Escola de idiomas" })).toMatchObject({
      tipo: "descartado_sem_gancho",
      nicho: "educacao",
    })
    expect(dados({ ...poucas, categoria: "Pet shop" })).toMatchObject({ lacuna: "poucas_fotos", nicho: "pet" })
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
      ancora: "Tava procurando o escritório de Alana Frota no Google",
      referencia: "Alana Frota",
      tratamento: "você",
    })
  })

  it("sem pessoa: nome curto do negócio, sem artigo e com vocês", () => {
    const d = dados({ ...SEM_LINK, nome: "️ Lomonaco & Gomes Escritorio de Advocacia em Fortaleza | Advogado Criminalista" })
    expect(d).toMatchObject({
      pessoa: null,
      ancora: "Tava procurando Lomonaco & Gomes no Google",
      referencia: "Lomonaco & Gomes",
      tratamento: "vocês",
    })
  })

  it("saúde com pessoa: procurei o consultório de {PESSOA}, mesma saída da advocacia", () => {
    const d = dados({ ...SEM_LINK, nome: "Dra. Maria Souza - Dentista", categoria: "Clínica odontológica" })
    expect(d).toMatchObject({
      pessoa: "Maria Souza",
      // "o consultório de" carrega o gênero, então "Dra." pode cair fora
      ancora: "Tava procurando o consultório de Maria Souza no Google",
      referencia: "Maria Souza",
      tratamento: "você",
    })
  })

  it("nicho sem âncora própria, com pessoa: o nome vai inteiro, com o título", () => {
    const d = dados({ ...SEM_LINK, nome: "Dr. Fernando - Veterinário", categoria: "Clínica veterinária" })
    expect(d).toMatchObject({
      pessoa: "Fernando",
      ancora: "Tava procurando Dr. Fernando no Google",
      referencia: "Dr. Fernando",
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
    expect(validarMensagem(valida.replace("chega direto aqui", "chega aqui"), d)).toContain(
      "sem_pergunta_do_nicho"
    )
    expect(validarMensagem(valida.replace("te procura chega", "te procura  chega"), d)).toEqual([])
  })

  it("emoji e markdown", () => {
    expect(validarMensagem(valida.replace("Tava", "🙂 Tava"), d)).toEqual(["emoji"])
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

    it("qualquer quebra de linha: a abertura é um parágrafo só", () => {
      expect(validarMensagem(`${valida}\nAbraço.`, d)).toEqual(["marca_de_ia:mais_de_0_quebras"])
    })

    it("linha em branco entre linhas de texto", () => {
      expect(validarMensagem(`${valida}\n\nAbraço.`, d)).toContain("marca_de_ia:linha_em_branco")
      expect(validarMensagem(`${valida}\n  \nAbraço.`, d)).toContain("marca_de_ia:linha_em_branco")
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
    expect(descreverMotivo("marca_de_ia:mais_de_0_quebras")).toBe("mais de 0 quebras de linha")
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
        "marca_de_ia:mais_de_0_quebras",
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
      "Tava procurando o escritório de Luiz Carlos no Google e vi que não tem site. " +
        "Fiquei curioso: quem te procura chega direto aqui pelo WhatsApp?"
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
    pergunta: "quem te procura chega direto aqui pelo WhatsApp?",
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
      saudacao: "Bom dia! Tudo bem?",
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
      "quem te procura chega direto aqui pelo WhatsApp?",
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
    const comTravessao = ouro.replace("no Google e vi", "no Google — e vi")
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
    saude: "Clínica odontológica",
    pet: "Pet shop",
    alimentacao: "Confeitaria",
    agendamento: "Barbearia",
    fitness: "Academia",
    educacao: "Escola de idiomas",
    hospedagem: "Pousada",
    imobiliario: "Imobiliária",
    servico_tecnico: "Chaveiro",
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

  it("a mensagem fixa (completa e curta) de toda combinação permitida passa na validação, num parágrafo", () => {
    for (const nicho of [...NICHOS, NICHO_PADRAO]) {
      const variantes = nicho.comercio ? [...DO_SITE, ...DE_COMERCIO] : DO_SITE
      for (const variante of variantes) {
        const d = dados({ ...LONGO, categoria: CATEGORIA_DO_NICHO[nicho.id], ...variante })
        for (const formato of ["completa", "curta"] as const) {
          const texto = mensagemFixa(d, formato)
          expect({ texto, motivos: validarMensagem(texto, d) }).toEqual({ texto, motivos: [] })
          expect(texto).not.toContain("\n")
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

// Mensagem 3: a que só existe depois que o lead responde a abertura.
describe("apresentacao", () => {
  const NICHOS_COM_TEXTO = Object.keys(APRESENTACAO_POR_NICHO)
  const TODOS = [...NICHOS_COM_TEXTO, NICHO_PADRAO.id]

  it("todo nicho da abertura tem apresentação, e nicho desconhecido cai no padrão", () => {
    // Nicho novo em nichos.ts sem entrada aqui cai no padrão em vez de quebrar,
    // mas o ideal é ter a dele: este teste é o lembrete.
    expect(NICHOS.map((n) => n.id).filter((id) => !NICHOS_COM_TEXTO.includes(id))).toEqual([])
    expect(apresentacaoDoNicho("nicho que não existe")).toContain(APRESENTACAO_PADRAO.comoFunciona)
    expect(apresentacaoDoNicho(NICHO_PADRAO.id)).toContain(APRESENTACAO_PADRAO.comoFunciona)
  })

  it("cada apresentação passa nas próprias regras, no nicho dela", () => {
    for (const nicho of TODOS) {
      expect([nicho, validarApresentacao(apresentacaoDoNicho(nicho), nicho)]).toEqual([nicho, []])
    }
  })

  it("três parágrafos, uma pergunta só, e a empresa em todas", () => {
    for (const nicho of TODOS) {
      const paragrafos = apresentacaoDoNicho(nicho).split("\n\n")
      expect([nicho, paragrafos]).toEqual([nicho, expect.any(Array)])
      expect([nicho, paragrafos.length]).toEqual([nicho, 3])
      // Parágrafo, não linha solta: nenhum deles tem quebra dentro
      for (const paragrafo of paragrafos) expect(paragrafo).not.toContain("\n")
      const texto = apresentacaoDoNicho(nicho)
      expect([nicho, (texto.match(/\?/g) ?? []).length]).toEqual([nicho, 1])
      expect(texto).toContain(REMETENTE.empresa)
      expect(texto.trimEnd().endsWith("?")).toBe(true)
    }
  })

  it("o primeiro e o último parágrafo são os mesmos em todo nicho", () => {
    for (const nicho of TODOS) {
      const [primeiro, , ultimo] = apresentacaoDoNicho(nicho).split("\n\n")
      expect([nicho, primeiro]).toEqual([nicho, ABERTURA_DA_APRESENTACAO])
      expect([nicho, ultimo]).toEqual([nicho, FECHAMENTO_DA_APRESENTACAO])
    }
  })

  it("o ramo vem da categoria do lead, que é mais específica que o nicho", () => {
    expect(apresentacaoDoNicho("alimentacao", "Pizzaria")).toContain("Pra pizzaria funcionaria assim")
    expect(apresentacaoDoNicho("varejo", "Loja de materiais de construção")).toContain(
      "Pra loja de materiais de construção funcionaria assim"
    )
    // Categoria vazia ou que não diz o ramo: vale o do nicho
    expect(ramoDaApresentacao("alimentacao", null)).toBe(APRESENTACAO_POR_NICHO.alimentacao.ramo)
    expect(ramoDaApresentacao("alimentacao", "Escritório da empresa")).toBe(APRESENTACAO_POR_NICHO.alimentacao.ramo)
    expect(ramoDaApresentacao("alimentacao", "  ")).toBe(APRESENTACAO_POR_NICHO.alimentacao.ramo)
  })

  it("a apresentação diz o que o remetente faz, o que a abertura não podia dizer", () => {
    const texto = apresentacaoDoNicho("alimentacao")
    expect(validarApresentacao(texto, "alimentacao")).toEqual([])
    // A mesma mensagem na régua da abertura seria barrada
    expect(validarConteudo(texto, "alimentacao")).toContain("permissao:posso te mandar")
  })

  it("oferta e permissão são liberadas; promessa e elogio continuam barradas", () => {
    expect(validarApresentacao("Eu faço a página de vocês.")).toEqual([])
    expect(validarApresentacao("Fica R$ 500 e o link é http://exemplo.com")).toEqual([])
    expect(validarApresentacao("Posso te mandar um exemplo?")).toEqual([])
    expect(validarApresentacao("Isso vai te trazer mais clientes.")).toEqual(["promessa:mais clientes"])
    expect(validarApresentacao("Adorei o atendimento de vocês.")).toEqual(["elogio:adorei"])
  })

  it("a trava do nicho continua valendo na apresentação", () => {
    expect(validarApresentacao("Eu faço a página do agendamento.", "advocacia")).toEqual(["advocacia:agendamento"])
    expect(validarApresentacao("Eu faço a página do agendamento.", "agendamento")).toEqual([])
  })

  it("advocacia não fala de agenda nem de avaliação, e as outras não herdam a trava dela", () => {
    expect(validarApresentacao(apresentacaoDoNicho("advocacia"), "advocacia")).toEqual([])
    for (const termo of TERMOS_BLOQUEADOS_POR_NICHO.advocacia ?? []) {
      expect(apresentacaoDoNicho("advocacia").toLowerCase(), termo).not.toContain(termo)
    }
    // Nem preço, nem pedido, nem caixa: só advocacia e saúde são assim
    expect(apresentacaoDoNicho("advocacia")).not.toMatch(/preço|pedido|caixa/)
    expect(apresentacaoDoNicho("agendamento")).toMatch(/preço|caixa/)
  })

  it("saúde segue a mesma régua da advocacia, e nenhuma outra herda a trava dela", () => {
    expect(validarApresentacao(apresentacaoDoNicho("saude"), "saude")).toEqual([])
    expect(apresentacaoDoNicho("saude")).not.toMatch(/preço|pedido|caixa/)
    for (const termo of TERMOS_BLOQUEADOS_POR_NICHO.saude ?? []) {
      expect(apresentacaoDoNicho("saude").toLowerCase(), termo).not.toContain(termo)
    }
    expect(validarApresentacao("O pessoal avalia bem vocês.", "saude")).toEqual(["saude:avalia bem"])
    expect(validarApresentacao("O pessoal avalia bem vocês.", "pet")).toEqual([])
  })

  it("escrita: sem emoji, sem markdown, sem marca de IA, e mais folgada que a abertura", () => {
    expect(validarApresentacao("Eu faço a sua página, com o cardápio — e o preço.")).toEqual([
      "marca_de_ia:travessão",
    ])
    expect(validarApresentacao("Eu faço a sua página 🙂")).toEqual(["emoji"])
    // Linha em branco é o formato aqui, e marca de IA na abertura
    const tresParagrafos = "um\n\ndois\n\ntrês"
    expect(validarApresentacao(tresParagrafos)).toEqual([])
    expect(validarConteudo(tresParagrafos)).toContain("marca_de_ia:linha_em_branco")
    expect(validarApresentacao("um\n\ndois\n\ntrês\n\nquatro")).toEqual(["marca_de_ia:mais_de_4_quebras"])
  })

  it("passa de 900 caracteres não sai", () => {
    expect(validarApresentacao("a".repeat(900))).toEqual([])
    expect(validarApresentacao("a".repeat(901))).toEqual(["passa_de_900_caracteres"])
  })
})
