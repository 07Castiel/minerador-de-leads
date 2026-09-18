import { describe, expect, it } from "vitest"

import {
  ganchoDoLead,
  lacunasDoLead,
  nomeCurto,
  preencherModelo,
  valoresDoModelo,
  type CamposDoModelo,
} from "@/lib/leads/modelosMensagem"

const VAZIO: CamposDoModelo = {
  nome: "Silva Advocacia",
  categoria: null,
  bairro: null,
  cidade: null,
  tem_site: null,
  site_url: null,
  site_url_final: null,
  site_status: null,
  site_falha: null,
  site_analisado_em: null,
  site_plataforma: null,
  site_https: null,
  site_responsivo: null,
  site_nota_celular: null,
  site_dominio_gratuito: null,
  instagram_handle: null,
  perfil_reivindicado: null,
  fotos_count: null,
  google_rating: null,
  google_avaliacoes_count: null,
}

const gancho = (lead: Partial<CamposDoModelo>) => ganchoDoLead({ ...VAZIO, ...lead })

// 15h UTC = 12h em Brasília
const TARDE = new Date("2026-09-17T15:00:00Z")

describe("nomeCurto", () => {
  it.each([
    ["Garcia, Lima & Becco Advogados - Advogado Fortaleza - Advogado Trabalhista", "Garcia, Lima & Becco Advogados"],
    ["Joao Felipe Gurjão | Advogado | Direito Médico | Fortaleza", "Joao Felipe Gurjão"],
    ["⚖️Tíssia Cavalcanti - Advocacia de Família e Sucessões | Fortaleza - CE", "Tíssia Cavalcanti"],
    ["ADVOGADO DAS FAMÍLIAS | EDUARDO ALBUQUERQUE", "Advogado das Famílias"],
    ["BMI Advocacia", "BMI Advocacia"],
    ["Dr. Fernando - Advogado Bancário", "Dr. Fernando"],
    ["Hugo Gondim Advocacia-Especialista", "Hugo Gondim Advocacia-Especialista"],
    // cortes no início da descrição do serviço
    ["️ Lomonaco & Gomes Escritorio de Advocacia em Fortaleza | Advogado Criminalista", "Lomonaco & Gomes"],
    ["Oséas Rodrigues & Nogueira ADVOGADO CRIMINALISTA - ADVOGADO EM SOBRAL", "Oséas Rodrigues & Nogueira"],
    ["GILSON FONTENELE SOCIEDADE INDIVIDUAL DE ADVOCACIA", "Gilson Fontenele"],
    ["Igor Gurgel Advogados Associados", "Igor Gurgel"],
    // nome todo em maiúsculas não tem de onde cortar
    ["LUIZ CARLOS SILVA ADVOCACIA", "Luiz Carlos Silva Advocacia"],
    // caixa alta só sai quando vem depois de caixa normal
    ["Clínica São José LTDA", "Clínica São José"],
    // emoji em qualquer posição
    ["Pizzaria 🍕 do Zé", "Pizzaria do Zé"],
    // lista de serviços depois do nome, com dois pontos ou vírgula
    ["Barber Shop Old Cut: Barbearia, Barbeiro, Hidratação, Fortaleza CE", "Barber Shop Old Cut"],
    // dois pontos que deixariam um termo só: fica o nome inteiro
    ["Studio: Cabelo e Unhas", "Studio: Cabelo e Unhas"],
    ["Padaria e Confeitaria Pão Dourado, Sobral", "Padaria e Confeitaria Pão Dourado"],
    // corte que deixaria um termo só: fica o nome inteiro
    ["Mendes Advogados Associados", "Mendes Advogados Associados"],
    // vírgula logo depois do primeiro termo não corta: sobraria "Garcia"
    ["Garcia, Lima & Becco Advogados", "Garcia, Lima & Becco Advogados"],
    ["FORTALEZA ADVOGADOS ASSOCIADOS", "Fortaleza Advogados Associados"],
    ["Advocacia BMI", "Advocacia BMI"],
    ["Nayana", "Nayana"],
  ])("%s → %s", (nome, esperado) => {
    expect(nomeCurto(nome)).toBe(esperado)
  })
})

describe("ganchoDoLead", () => {
  it("sem site próprio, pelo tipo de link", () => {
    expect(gancho({ tem_site: false })).toBe("vi que ainda não têm um site")
    expect(gancho({ tem_site: false, site_url: "https://instagram.com/silva.adv" })).toBe(
      "vi que o link do perfil leva direto pro Instagram"
    )
    expect(gancho({ tem_site: false, site_url: "https://wa.me/5585999999999" })).toBe(
      "vi que o link do perfil abre direto o WhatsApp, sem um site"
    )
    expect(
      gancho({
        tem_site: false,
        site_url: "https://bit.ly/x",
        site_status: "nao_e_site",
        site_url_final: "https://api.whatsapp.com/send?phone=5585999999999",
      })
    ).toBe("vi que o link do perfil abre direto o WhatsApp, sem um site")
    expect(gancho({ tem_site: false, site_url: "https://silva.jusbrasil.com.br" })).toMatch(/outra plataforma/)
    expect(gancho({ tem_site: false, site_url: "https://linktr.ee/silva" })).toBe(
      "vi que o link do perfil leva pra uma página de links, não pra um site"
    )
    expect(gancho({ tem_site: false, site_url: "https://facebook.com/silva" })).toBe(
      "vi que o link do perfil leva pra uma rede social, não pra um site"
    )
  })

  it("site com problema, do mais grave ao mais leve", () => {
    const site = { tem_site: true, site_url: "https://silva.adv.br", site_status: "ok" } as const
    expect(gancho({ ...site, site_status: "fora_do_ar" })).toBe("tentei abrir o site de vocês e ele não carregou")
    expect(gancho({ ...site, site_nota_celular: 30, site_responsivo: false })).toBe(
      "vi que o site de vocês demora pra abrir no celular"
    )
    expect(gancho({ ...site, site_responsivo: false, site_https: false })).toBe(
      "vi que o site de vocês não se ajusta direito no celular"
    )
    expect(gancho({ ...site, site_https: false })).toBe('vi que o site de vocês aparece como "não seguro" no navegador')
  })

  it("sem nada a apontar, cai no perfil sem dono ou numa pergunta neutra", () => {
    expect(gancho({ tem_site: true, site_status: "ok", perfil_reivindicado: false })).toBe(
      "vi que o perfil ainda não foi assumido pelo dono"
    )
    expect(gancho({ tem_site: true })).toBe("fiquei curioso pra saber como vocês recebem clientes pela internet hoje")
  })

  it("depois do perfil sem dono, poucas fotos e poucas avaliações", () => {
    expect(gancho({ tem_site: true, perfil_reivindicado: false, fotos_count: 1 })).toBe(
      "vi que o perfil ainda não foi assumido pelo dono"
    )
    expect(gancho({ tem_site: true, fotos_count: 4, google_avaliacoes_count: 2 })).toBe(
      "vi que o perfil de vocês tem poucas fotos"
    )
    expect(gancho({ tem_site: true, fotos_count: 5, google_avaliacoes_count: 3 })).toBe(
      "vi que o perfil de vocês ainda tem poucas avaliações"
    )
  })
})

describe("lacunasDoLead", () => {
  it("lista todas as lacunas, na ordem do score, com os dados de cada uma", () => {
    expect(
      lacunasDoLead({
        ...VAZIO,
        tem_site: false,
        site_url: "https://instagram.com/silva.adv",
        perfil_reivindicado: false,
        fotos_count: 2,
        google_avaliacoes_count: 0,
      })
    ).toEqual([
      { id: "link_fora_do_site", destino: "instagram", url: "https://instagram.com/silva.adv" },
      { id: "perfil_sem_dono" },
      { id: "poucas_fotos", fotos: 2 },
      { id: "pouca_avaliacao", avaliacoes: 0 },
    ])
  })

  it("campo desconhecido não vira lacuna", () => {
    expect(lacunasDoLead(VAZIO)).toEqual([])
  })
})

describe("preencherModelo", () => {
  const modelo =
    "{saudacao}! Falo com {nome}?\n\nEncontrei vocês no Google e {gancho}. Eu crio sites para negócios aqui de {cidade}."

  it("troca as variáveis pelos dados do lead", () => {
    const valores = valoresDoModelo(
      { ...VAZIO, nome: "Costa e Moura Advogados | Trabalhista", cidade: "Fortaleza", tem_site: false },
      TARDE
    )
    expect(preencherModelo(modelo, valores)).toEqual({
      texto:
        "Boa tarde! Falo com Costa e Moura Advogados?\n\nEncontrei vocês no Google e vi que ainda não têm um site. Eu crio sites para negócios aqui de Fortaleza.",
      semDado: [],
      desconhecidas: [],
    })
  })

  it("variável sem dado fica em branco e é avisada; {desconhecida} fica como está", () => {
    const valores = valoresDoModelo({ ...VAZIO, tem_site: false }, TARDE)
    const r = preencherModelo("Oi, {nome} aqui de {cidade}, {bairro}! Nota {nota}. {Nomee}", valores)
    expect(r.texto).toBe("Oi, Silva Advocacia aqui de,! Nota. {Nomee}")
    expect(r.semDado).toEqual(["cidade", "bairro", "nota"])
    expect(r.desconhecidas).toEqual(["Nomee"])
  })

  it("nota só com 5+ avaliações; aceita maiúsculas e espaços na chave", () => {
    const poucas = valoresDoModelo({ ...VAZIO, google_rating: 5, google_avaliacoes_count: 2 }, TARDE)
    expect(poucas.nota).toBeNull()
    const muitas = valoresDoModelo({ ...VAZIO, google_rating: 4.8, google_avaliacoes_count: 1320 }, TARDE)
    expect(preencherModelo("{ NOTA } com {avaliacoes}", muitas).texto).toBe("4,8 com 1.320")
  })

  it("não confunde chave com propriedade de objeto", () => {
    const valores = valoresDoModelo(VAZIO, TARDE)
    expect(preencherModelo("{constructor} {toString}", valores).desconhecidas).toEqual(["constructor", "toString"])
  })
})
