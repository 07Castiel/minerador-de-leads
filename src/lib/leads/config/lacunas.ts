// Lacunas da primeira abordagem por WhatsApp: quais valem, em que ordem, e o
// texto de cada uma. O texto é a observação inteira, com o detalhe concreto
// dentro dela (até 8 palavras). Não existe "então {consequência}": explicar a
// própria observação era o que denunciava texto de IA.
// Placeholders em MAIÚSCULAS entre chaves são trocados pelo código.

// Ordem = precedência: vale a primeira que o lead tiver.
// Fora, por enquanto: horário (tem_horario nunca é false, só true ou
// desconhecido), perfil sem dono (texto pronto abaixo) e avaliações sem
// resposta (o scraper não lê avaliações).
export const LACUNAS_DA_ABORDAGEM = ["sem_site", "link_fora_do_site", "poucas_fotos", "pouca_avaliacao"] as const

export type LacunaDaAbordagem = (typeof LACUNAS_DA_ABORDAGEM)[number]

// Só valem em nicho de comércio (NichoDaAbordagem.comercio).
export const LACUNAS_SO_DE_COMERCIO: readonly LacunaDaAbordagem[] = ["poucas_fotos", "pouca_avaliacao"]

export const TEXTOS_DAS_LACUNAS = {
  // 1a: nenhum link no perfil
  sem_site: "não tem site, só o telefone",
  // 1b: o link do perfil não é site. O texto diz o destino real: só 10 dos 20
  // leads de hoje vão pro Instagram.
  link_fora_do_site: {
    whatsapp: "o link abre o WhatsApp direto, sem site",
    redeSocial: "o link vai pro {DESTINO}, site não achei",
    redeSocialSemNome: "o link vai pra uma rede social, site não achei",
    // página de links (Linktree...) ou diretório (Jusbrasil, iFood...)
    pagina: "o link só vai pra uma página no {DESTINO}",
    paginaDeLinksSemNome: "o link só vai pra uma página de links",
    plataformaSemNome: "o link só vai pra uma página de outro site",
  },
  // 2: pronto, mas ainda fora de LACUNAS_DA_ABORDAGEM
  perfil_sem_dono: "o perfil ainda não tem dono",
  // 3 (só comércio)
  poucas_fotos: {
    nenhuma: "não tem nenhuma foto no perfil",
    uma: "tem só 1 foto no perfil",
    varias: "tem só {N} fotos no perfil",
  },
  // 5 (só comércio). Com zero, "quase não tem" seria mentira.
  pouca_avaliacao: {
    nenhuma: "o perfil ainda não tem avaliação",
    poucas: "o perfil quase não tem avaliação",
  },
} as const

// {DESTINO} pelo domínio do link. Sem nome aqui, vale o texto "SemNome".
export const NOMES_DE_DESTINO: readonly (readonly [dominio: string, nome: string])[] = [
  ["instagram.com", "Instagram"],
  ["instagr.am", "Instagram"],
  ["facebook.com", "Facebook"],
  ["fb.com", "Facebook"],
  ["fb.me", "Facebook"],
  ["tiktok.com", "TikTok"],
  ["youtube.com", "YouTube"],
  ["youtu.be", "YouTube"],
  ["linkedin.com", "LinkedIn"],
  ["linktr.ee", "Linktree"],
  ["beacons.ai", "Beacons"],
  ["taplink.cc", "Taplink"],
  ["linklist.bio", "Linklist"],
  ["linkbio.co", "Linkbio"],
  ["jusbrasil.com.br", "Jusbrasil"],
  ["jusfy.com.br", "Jusfy"],
  ["ifood.com.br", "iFood"],
  ["anota.ai", "Anota AI"],
  ["goomer.app", "Goomer"],
  ["booksy.com", "Booksy"],
  ["trinks.com", "Trinks"],
  ["doctoralia.com.br", "Doctoralia"],
  ["sympla.com.br", "Sympla"],
  ["zapier.app", "Zapier"],
]
