import { describe, expect, it } from "vitest"

import { motivosDoLead, type CamposDosMotivos } from "@/lib/leads/motivos"
import {
  classificarLink,
  ehLinkDeWhatsApp,
  plataformaDoDominioGratuito,
  temSiteProprio,
} from "@/lib/leads/presencaDigital"
import { deriveTemSiteFromValue } from "@/lib/import/normalizer"

describe("classificarLink", () => {
  it.each([
    ["https://barbeariadocentro.com.br", "site"],
    ["barbeariadocentro.com.br", "site"],
    ["https://sites.google.com/view/barbearia", "site"],
    ["https://www.instagram.com/barbearia.centro/", "rede_social"],
    ["http://facebook.com/barbeariacentro", "rede_social"],
    ["https://wa.me/5588996123456", "rede_social"],
    ["https://linktr.ee/barbearia", "rede_social"],
    ["https://www.ifood.com.br/delivery/sobral-ce/pizzaria", "plataforma"],
    ["https://booksy.com/pt-br/123_barbearia", "plataforma"],
    ["https://barbearia-centro.business.site/", "site_desativado"],
    ["https://pizzaria.negocio.site", "site_desativado"],
    ["https://linklist.bio/castroebarboza", "rede_social"],
    ["https://eduardoalbuquerque.linkbio.co/", "rede_social"],
    ["https://jsimplicio.jusbrasil.com.br/?ref=lawyer-dir", "plataforma"],
    ["https://escritorio.jusfy.com.br/", "plataforma"],
    ["https://bit.ly/AdvogadoEspecialista-", "site"],
  ])("%s → %s", (url, tipo) => {
    expect(classificarLink(url)?.tipo).toBe(tipo)
  })

  it("não confunde domínio que só termina parecido", () => {
    expect(classificarLink("https://meuinstagram.com.br")?.tipo).toBe("site")
    expect(classificarLink("https://naofacebook.com")?.tipo).toBe("site")
  })

  it("extrai o @ do Instagram só de links de perfil", () => {
    expect(classificarLink("https://www.instagram.com/Barbearia.Centro/?hl=pt")?.instagramHandle).toBe(
      "barbearia.centro"
    )
    expect(classificarLink("instagram.com/barbearia_do_ze")?.instagramHandle).toBe("barbearia_do_ze")
    expect(classificarLink("https://instagram.com/p/C1abc/")?.instagramHandle).toBeNull()
    expect(classificarLink("https://facebook.com/barbearia")?.instagramHandle).toBeNull()
  })

  it("sem link = null, e sem link também não é site próprio", () => {
    expect(classificarLink(null)).toBeNull()
    expect(classificarLink("   ")).toBeNull()
    expect(temSiteProprio(null)).toBe(false)
  })

  it("reconhece WhatsApp e endereço gratuito de construtor", () => {
    expect(ehLinkDeWhatsApp("https://api.whatsapp.com/send?phone=5585999999999")).toBe(true)
    expect(ehLinkDeWhatsApp("wa.me/5585999999999")).toBe(true)
    expect(ehLinkDeWhatsApp("https://instagram.com/x")).toBe(false)
    expect(plataformaDoDominioGratuito("https://sites.google.com/view/advogado")).toBe("Google Sites")
    expect(plataformaDoDominioGratuito("https://joao.wixsite.com/advocacia")).toBe("Wix")
    expect(plataformaDoDominioGratuito("https://google.com")).toBeNull()
    expect(plataformaDoDominioGratuito("https://meusite.com.br")).toBeNull()
  })

  it("import de planilha segue a mesma regra", () => {
    expect(deriveTemSiteFromValue("https://instagram.com/barbearia")).toBe(false)
    expect(deriveTemSiteFromValue("https://barbearia.com.br")).toBe(true)
    expect(deriveTemSiteFromValue("")).toBe(false)
  })
})

const VAZIO: CamposDosMotivos = {
  tem_site: null,
  site_url: null,
  instagram_handle: null,
  instagram_seguidores: null,
  instagram_ultimo_post_dias: null,
  perfil_reivindicado: null,
  fotos_count: null,
  tem_descricao: null,
  tem_horario: null,
  google_avaliacoes_count: null,
  google_avaliacoes_sem_resposta: null,
  google_rating: null,
  site_status: null,
  site_detalhe: null,
  site_url_final: null,
  site_https: null,
  site_responsivo: null,
  site_tem_whatsapp: null,
  site_plataforma: null,
  site_dominio_gratuito: null,
  site_ano_rodape: null,
  site_nota_celular: null,
  site_carregamento_ms: null,
  site_analisado_em: null,
}

const textos = (lead: Partial<CamposDosMotivos>) => motivosDoLead({ ...VAZIO, ...lead }).map((m) => m.texto)

describe("motivosDoLead", () => {
  it("lead ideal: oportunidades primeiro, potencial depois", () => {
    expect(
      textos({
        tem_site: false,
        site_url: "https://instagram.com/barbearia",
        perfil_reivindicado: false,
        fotos_count: 2,
        google_avaliacoes_count: 1320,
        google_rating: 4.7,
      })
    ).toEqual(["Só Instagram", "Perfil Google sem dono", "Só 2 fotos no Google", "1.320 avaliações", "Nota 4,7"])
  })

  it("diferencia sem site, rede social, plataforma e site desativado", () => {
    expect(textos({ tem_site: false })).toEqual(["Sem site"])
    expect(textos({ tem_site: false, site_url: "https://facebook.com/x" })).toEqual(["Só rede social"])
    expect(textos({ tem_site: false, site_url: "https://ifood.com.br/x" })).toEqual(["Só página em plataforma"])
    expect(textos({ tem_site: false, site_url: "https://x.business.site" })).toEqual(["Site do Google desativado"])
  })

  it("não acusa nada que não sabemos (null)", () => {
    expect(textos({})).toEqual([])
    expect(textos({ tem_site: true, perfil_reivindicado: true, fotos_count: 30 })).toEqual([])
  })

  it("respeita os limites de cada sinal", () => {
    expect(textos({ fotos_count: 0 })).toEqual(["Nenhuma foto no Google"])
    expect(textos({ fotos_count: 1 })).toEqual(["Só 1 foto no Google"])
    expect(textos({ fotos_count: 5 })).toEqual([])
    expect(textos({ google_avaliacoes_count: 29, google_rating: 3.9 })).toEqual([])
    // nota alta com poucas avaliações não é argumento (mesma regra do score)
    expect(textos({ google_avaliacoes_count: 4, google_rating: 5 })).toEqual([])
    expect(textos({ google_avaliacoes_count: 5, google_rating: 5 })).toEqual(["Nota 5,0"])
    expect(textos({ tem_horario: false })).toEqual(["Perfil incompleto"])
    expect(textos({ instagram_handle: "x", instagram_seguidores: 999 })).toEqual([])
    expect(textos({ instagram_handle: "x", instagram_seguidores: 2500, instagram_ultimo_post_dias: 45 })).toEqual([
      "Instagram parado há 45 dias",
      "2.500 seguidores",
    ])
  })
})

describe("motivosDoLead com análise de site", () => {
  const siteOk = {
    tem_site: true,
    site_url: "https://advocacia.com.br",
    site_status: "ok",
    site_analisado_em: "2026-09-17T12:00:00Z",
  } as const

  it("site que abre sem defeito não vira argumento", () => {
    expect(
      textos({ ...siteOk, site_https: true, site_responsivo: true, site_tem_whatsapp: true, site_nota_celular: 90 })
    ).toEqual([])
  })

  it("lista os defeitos na ordem do peso", () => {
    expect(
      textos({
        ...siteOk,
        site_nota_celular: 38,
        site_carregamento_ms: 8200,
        site_responsivo: false,
        site_https: false,
        site_dominio_gratuito: true,
        site_plataforma: "Google Sites",
        site_tem_whatsapp: false,
        site_ano_rodape: 2019,
      })
    ).toEqual([
      "Site lento no celular",
      "Site não se adapta ao celular",
      "Site sem HTTPS",
      "Site em endereço gratuito",
      "Site sem botão de WhatsApp",
      "Rodapé de 2019",
    ])
    const lento = motivosDoLead({ ...VAZIO, ...siteOk, site_nota_celular: 38, site_carregamento_ms: 8200 })[0]
    expect(lento.detalhe).toBe("Nota 38 de 100 no PageSpeed (celular); o conteúdo principal aparece em 8,2 s.")
  })

  it("nota entre 50 e 69 é só um pouco lento; rodapé de 2 anos atrás não conta", () => {
    expect(textos({ ...siteOk, site_nota_celular: 65, site_ano_rodape: 2024 })).toEqual([
      "Site um pouco lento no celular",
    ])
  })

  it("site fora do ar, sem conteúdo ou com certificado ruim vira um motivo só", () => {
    expect(textos({ ...siteOk, site_status: "fora_do_ar", site_https: false })).toEqual(["Site fora do ar"])
    expect(textos({ ...siteOk, site_status: "sem_conteudo" })).toEqual(["Site sem conteúdo"])
    expect(textos({ ...siteOk, site_status: "certificado_invalido" })).toEqual(["Site com alerta de inseguro"])
    expect(textos({ ...siteOk, site_status: "nao_verificado" })).toEqual([])
  })

  it("link que redireciona para o WhatsApp conta como só WhatsApp", () => {
    expect(
      textos({
        tem_site: false,
        site_url: "https://bit.ly/AdvogadoEspecialista-",
        site_status: "nao_e_site",
        site_url_final: "https://api.whatsapp.com/send?phone=5585997731517",
      })
    ).toEqual(["Só WhatsApp"])
  })
})
