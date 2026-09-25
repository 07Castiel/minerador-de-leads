import { describe, expect, it } from "vitest"

import {
  FILTROS_PADRAO,
  descreverLocal,
  encontrarCidade,
  estimarCustoUsd,
  limiteCobrancaUsd,
  mapearLugar,
  montarInputApify,
  montarLocationQuery,
  montarOrigem,
  prepararLeads,
  validarNovaBusca,
  type NovaBusca,
} from "@/lib/minerador/regras"
import { leadsParaCsv, nomeArquivoCsv } from "@/lib/minerador/exportCsv"
import { NEVER_IMPORTED_FIELDS } from "@/lib/import/fieldDefinitions"
import type { Lead } from "@/types/lead"

const BUSCA: NovaBusca = {
  nicho: "Barbearia",
  uf: "CE",
  cidade: "Sobral",
  bairro: null,
  maxResultados: 100,
  filtros: FILTROS_PADRAO,
}

// Formato real de um item do compass/crawler-google-places (campos usados).
const ITEM_APIFY = {
  title: "Barbearia do Centro",
  placeId: "ChIJ_zNuTyLH6gcRDWqDdEQzJMw",
  categoryName: "Barbearia",
  city: "Sobral",
  neighborhood: "Centro",
  address: "R. Cel. José Sabóia, 100 - Centro, Sobral - CE, 62010-000",
  phone: "(88) 99612-3456",
  phoneUnformatted: "+5588996123456",
  url: "https://www.google.com/maps/search/?api=1&query=Barbearia&query_place_id=ChIJ_zNuTyLH6gcRDWqDdEQzJMw",
  website: "https://barbeariadocentro.com.br",
  totalScore: 4.7,
  reviewsCount: 132,
  location: { lat: -3.6863, lng: -40.3498 },
  claimThisBusiness: true,
  imagesCount: 3,
  permanentlyClosed: false,
  temporarilyClosed: false,
}

describe("validarNovaBusca", () => {
  it("aceita uma busca válida, apara espaços e normaliza a UF", () => {
    const r = validarNovaBusca({ ...BUSCA, nicho: "  Barbearia  ", uf: "ce", bairro: "  " })
    expect(r).toEqual({ ok: true, valor: BUSCA })
  })

  it("usa filtros padrão quando não enviados e guarda o bairro", () => {
    const r = validarNovaBusca({ nicho: "Pet shop", uf: "CE", cidade: "Sobral", bairro: "Centro", maxResultados: 10 })
    expect(r.ok && r.valor).toMatchObject({ bairro: "Centro", filtros: FILTROS_PADRAO })
  })

  it.each([
    [{ ...BUSCA, nicho: "a" }, "nicho"],
    [{ ...BUSCA, uf: "XX" }, "estado"],
    [{ ...BUSCA, cidade: "" }, "cidade"],
    [{ ...BUSCA, bairro: "x".repeat(81) }, "Bairro"],
    [{ ...BUSCA, maxResultados: 0 }, "Quantidade"],
    [{ ...BUSCA, maxResultados: 501 }, "Quantidade"],
    [{ ...BUSCA, maxResultados: 10.5 }, "Quantidade"],
    [{ ...BUSCA, maxResultados: "100" }, "Quantidade"],
    [{ ...BUSCA, filtros: { ...FILTROS_PADRAO, site: "talvez" } }, "site"],
    [{ ...BUSCA, filtros: { ...FILTROS_PADRAO, notaMinima: "5" } }, "nota"],
    [{ ...BUSCA, filtros: { ...FILTROS_PADRAO, ignorarFechados: "sim" } }, "fechados"],
  ])("rejeita entrada inválida (%#)", (entrada, trecho) => {
    const r = validarNovaBusca(entrada)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.erro).toContain(trecho)
  })

  it("rejeita corpo que não é objeto", () => {
    expect(validarNovaBusca(null).ok).toBe(false)
    expect(validarNovaBusca([]).ok).toBe(false)
  })
})

describe("custo", () => {
  it("sem filtros: US$ 0,004 por lugar", () => {
    expect(estimarCustoUsd(BUSCA)).toBe(0.4)
  })

  it("cada filtro soma US$ 0,001 por lugar", () => {
    const filtros = { site: "sem_site", notaMinima: "4", ignorarFechados: true } as const
    expect(estimarCustoUsd({ maxResultados: 100, filtros })).toBe(0.7)
  })

  it("limite de cobrança fica acima da estimativa e nunca abaixo do mínimo do Apify", () => {
    // 100 leads: 0,40 + 10% + 0,02 = 0,46 → sobe pro mínimo de 0,50
    expect(limiteCobrancaUsd(BUSCA)).toBe(0.5)
    expect(limiteCobrancaUsd({ ...BUSCA, maxResultados: 10 })).toBe(0.5)
    // 200 leads: 0,80 + 10% + 0,02 = 0,90
    expect(limiteCobrancaUsd({ ...BUSCA, maxResultados: 200 })).toBe(0.9)
  })
})

describe("local e input do Apify", () => {
  it("monta o local com o nome do estado e o bairro quando houver", () => {
    expect(montarLocationQuery(BUSCA)).toBe("Sobral, Ceará, Brasil")
    expect(montarLocationQuery({ ...BUSCA, bairro: "Centro" })).toBe("Centro, Sobral, Ceará, Brasil")
    expect(descreverLocal({ ...BUSCA, bairro: "Centro" })).toBe("Centro, Sobral/CE")
    expect(montarOrigem(BUSCA)).toBe("Minerador: Barbearia em Sobral/CE")
  })

  it("desambigua cidades com nome repetido e aceita apóstrofo", () => {
    // "Santa Luzia" existe em PB, MG, MA e BA: o nome do estado resolve
    expect(montarLocationQuery({ uf: "PB", cidade: "Santa Luzia", bairro: null })).toBe(
      "Santa Luzia, Paraíba, Brasil"
    )
    expect(montarLocationQuery({ uf: "AL", cidade: "Olho d'Água das Flores", bairro: null })).toBe(
      "Olho d'Água das Flores, Alagoas, Brasil"
    )
    expect(montarLocationQuery({ uf: "CE", cidade: "Fortaleza", bairro: "Aldeota" })).toBe(
      "Aldeota, Fortaleza, Ceará, Brasil"
    )
  })

  it("acha a cidade digitada na lista do IBGE", () => {
    const lista = ["Fortaleza", "Olho D'Água do Piauí", "Pau D'Arco do Piauí", "São João da Canabrava"]
    expect(encontrarCidade(lista, "  fortaleza ")).toBe("Fortaleza")
    expect(encontrarCidade(lista, "olho d’agua do piaui")).toBe("Olho D'Água do Piauí")
    expect(encontrarCidade(lista, "sao joao  da canabrava")).toBe("São João da Canabrava")
    expect(encontrarCidade(lista, "Fortalezaa")).toBeNull()
    expect(encontrarCidade(lista, "")).toBeNull()
  })

  it("sem filtros não liga nenhum add-on pago", () => {
    const input = montarInputApify(BUSCA)
    expect(input).toMatchObject({
      searchStringsArray: ["Barbearia"],
      locationQuery: "Sobral, Ceará, Brasil",
      maxCrawledPlacesPerSearch: 100,
      language: "pt-BR",
      website: "allPlaces",
      skipClosedPlaces: false,
      scrapeContacts: false,
      maxReviews: 0,
      maxImages: 0,
    })
    expect(input).not.toHaveProperty("placeMinimumStars")
  })

  it("traduz os filtros pros valores do actor", () => {
    const input = montarInputApify({
      ...BUSCA,
      filtros: { site: "sem_site", notaMinima: "3.5", ignorarFechados: true },
    })
    expect(input).toMatchObject({
      website: "withoutWebsite",
      placeMinimumStars: "threeAndHalf",
      skipClosedPlaces: true,
    })
  })
})

describe("mapearLugar", () => {
  it("mapeia um item completo", () => {
    expect(mapearLugar(ITEM_APIFY)).toEqual({
      ok: true,
      valor: {
        nome: "Barbearia do Centro",
        maps_url: ITEM_APIFY.url,
        place_id: ITEM_APIFY.placeId,
        categoria: "Barbearia",
        cidade: "Sobral",
        bairro: "Centro",
        endereco: ITEM_APIFY.address,
        telefone: "(88) 99612-3456",
        tem_site: true,
        site_url: "https://barbeariadocentro.com.br",
        instagram_handle: null,
        google_rating: 4.7,
        google_avaliacoes_count: 132,
        perfil_reivindicado: false,
        fotos_count: 3,
        tem_descricao: null,
        tem_horario: null,
        latitude: -3.6863,
        longitude: -40.3498,
      },
    })
  })

  it("item mínimo: ausentes viram null e sem website = sem site", () => {
    const r = mapearLugar({ title: "Pet Feliz", url: "https://maps/x", website: "" })
    expect(r.ok && r.valor).toMatchObject({
      place_id: null,
      categoria: null,
      telefone: null,
      tem_site: false,
      google_rating: null,
      google_avaliacoes_count: null,
      latitude: null,
      longitude: null,
    })
  })

  it("Instagram, WhatsApp ou link de bio no lugar do site = sem site, guardando o link", () => {
    const r = mapearLugar({ ...ITEM_APIFY, website: "https://www.instagram.com/barbearia.centro/" })
    expect(r.ok && r.valor).toMatchObject({
      tem_site: false,
      site_url: "https://www.instagram.com/barbearia.centro/",
      instagram_handle: "barbearia.centro",
    })
    const zap = mapearLugar({ ...ITEM_APIFY, website: "https://wa.me/5588996123456" })
    expect(zap.ok && zap.valor.tem_site).toBe(false)
  })

  it("sinais do perfil: só afirma o que o Google informou", () => {
    const semSinais = mapearLugar({ title: "X", url: "https://maps/x" })
    expect(semSinais.ok && semSinais.valor).toMatchObject({
      perfil_reivindicado: null,
      fotos_count: null,
      tem_descricao: null,
      tem_horario: null,
    })

    // descrição/horário ausentes ou vazios (sem o add-on de detalhe) não viram "não tem"
    const vazios = mapearLugar({ ...ITEM_APIFY, description: null, openingHours: [] })
    expect(vazios.ok && vazios.valor).toMatchObject({ tem_descricao: null, tem_horario: null })

    const completos = mapearLugar({
      ...ITEM_APIFY,
      claimThisBusiness: false,
      description: "A melhor barbearia de Sobral",
      openingHours: [{ day: "segunda-feira", hours: "9 às 19" }],
    })
    expect(completos.ok && completos.valor).toMatchObject({
      perfil_reivindicado: true,
      tem_descricao: true,
      tem_horario: true,
    })
  })

  it("descarta negócio fechado sem pagar o filtro do Apify", () => {
    const definitivo = mapearLugar({ ...ITEM_APIFY, permanentlyClosed: true })
    expect(definitivo.ok).toBe(false)
    expect(!definitivo.ok && definitivo.erro).toContain("fechou definitivamente")
    expect(mapearLugar({ ...ITEM_APIFY, temporarilyClosed: true }).ok).toBe(false)
  })

  it("descarta órgão público e clínica-escola, com o motivo", () => {
    const prefeitura = mapearLugar({ ...ITEM_APIFY, title: "Prefeitura Municipal de Sobral" })
    expect(prefeitura.ok).toBe(false)
    expect(!prefeitura.ok && prefeitura.erro).toContain("órgão público")

    const ubs = mapearLugar({ ...ITEM_APIFY, title: "UBS Sinhá Sabóia", categoryName: "Posto de saúde" })
    expect(!ubs.ok && ubs.erro).toContain("unidade de saúde pública")

    const escola = mapearLugar({ ...ITEM_APIFY, title: "Clínica-Escola de Odontologia UNINTA" })
    expect(!escola.ok && escola.erro).toContain("instituição de ensino")

    // Negócio privado continua passando
    expect(mapearLugar({ ...ITEM_APIFY, title: "Odontologia Sorriso Real" }).ok).toBe(true)
  })

  it("usa telefone sem formatação quando o formatado falta", () => {
    const r = mapearLugar({ ...ITEM_APIFY, phone: null })
    expect(r.ok && r.valor.telefone).toBe("+5588996123456")
  })

  it("descarta coordenadas e notas fora do intervalo", () => {
    const r = mapearLugar({ ...ITEM_APIFY, totalScore: 7, location: { lat: 200, lng: "-40" } })
    expect(r.ok && r.valor).toMatchObject({ google_rating: null, latitude: null, longitude: null })
  })

  it("rejeita item sem nome ou sem URL", () => {
    expect(mapearLugar({ ...ITEM_APIFY, title: "  " }).ok).toBe(false)
    expect(mapearLugar({ ...ITEM_APIFY, url: undefined }).ok).toBe(false)
    expect(mapearLugar("lixo").ok).toBe(false)
  })

  it("nunca escreve etapa, observações, score ou outros campos do funil", () => {
    const r = mapearLugar(ITEM_APIFY)
    const chaves = Object.keys(r.ok ? r.valor : {})
    // instagram_handle é a exceção: vem do link do Google, e no processamento
    // só preenche quando o lead ainda não tem um @ digitado à mão.
    for (const campo of NEVER_IMPORTED_FIELDS.filter((c) => c !== "instagram_handle")) {
      expect(chaves).not.toContain(campo)
    }
  })
})

describe("prepararLeads", () => {
  it("remove repetidos por place_id ou por URL e conta ignorados", () => {
    const itens = [
      ITEM_APIFY,
      { ...ITEM_APIFY, url: "https://maps/outra-url-mesmo-lugar" }, // mesmo place_id
      { ...ITEM_APIFY, placeId: "ChIJoutro" }, // mesma URL
      { ...ITEM_APIFY, placeId: "ChIJnovo", url: "https://maps/novo", title: "Outro" },
      { title: "Sem url" },
      { ...ITEM_APIFY, placeId: "ChIJfechado", url: "https://maps/fechado", permanentlyClosed: true },
    ]
    const r = prepararLeads(itens)
    expect(r.leads.map((l) => l.nome)).toEqual(["Barbearia do Centro", "Outro"])
    expect(r.ignorados).toBe(4)
  })
})

describe("exportação CSV", () => {
  const lead = {
    id: "1",
    nome: "=HYPERLINK(\"http://mal.com\")",
    categoria: "Barbearia",
    telefone: "(88) 3611-1234",
    endereco: "Rua A; 100",
    bairro: "Centro",
    cidade: "Sobral",
    tem_site: false,
    google_rating: 4.5,
    google_avaliacoes_count: 10,
    score: 80,
    temperatura: "quente",
    etapa: "follow_up",
    maps_url: "https://maps/x",
  } as Lead

  it("usa ; , BOM, decimal com vírgula, etapa legível e neutraliza fórmulas", () => {
    const csv = leadsParaCsv([lead])
    expect(csv.startsWith("﻿")).toBe(true)
    const [cabecalho, linha] = csv.slice(1).split("\r\n")
    expect(cabecalho.split(";")[0]).toBe("Nome")
    expect(linha).toContain(`"'=HYPERLINK(""http://mal.com"")"`)
    expect(linha).toContain(`"Rua A; 100"`)
    expect(linha).toContain(";Não;4,5;10;80;quente;Follow-up;")
  })

  it("gera nome de arquivo sem acentos nem espaços", () => {
    expect(nomeArquivoCsv("Clínica Estética", "Sobral", new Date("2026-09-16T12:00:00Z"))).toBe(
      "leads-clinica-estetica-sobral-2026-09-16.csv"
    )
  })
})
