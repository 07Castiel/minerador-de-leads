// Lacunas da primeira abordagem por WhatsApp: quais valem, em que ordem, e o
// texto de cada uma. O texto é a observação inteira, com o detalhe concreto
// dentro dela (até 8 palavras). Não existe "então {consequência}": explicar a
// própria observação era o que denunciava texto de IA.
// Placeholders em MAIÚSCULAS entre chaves são trocados pelo código.

// Ordem = precedência: vale a primeira que o lead tiver. As três de site valem
// só pra quem tem site próprio, então nunca disputam com as duas primeiras.
// Fora: horário (tem_horario nunca é false, só true ou desconhecido) e
// avaliações sem resposta (o scraper não lê avaliações).
// Perfil sem dono fica fora de vez: dado confiável, mas recupera só 2 leads e "o perfil não tem dono" soa mal pra escritório.
// Site sem https fica fora: o critério só vê que o link http não redireciona, e os 2 casos reais abrem por https normalmente.
// Site lento no celular fica fora: nota de laboratório que oscila entre execuções, o dono no Wi-Fi vê rápido e desmente a mensagem, e medir demora demais pra reverificar na hora de gerar.
// Site fora do ar por tempo esgotado, erro 500 ou 404 fica fora: medição única do nosso servidor, que pode ser passageira (só o domínio inexistente entra).
export const LACUNAS_DA_ABORDAGEM = [
  "sem_site",
  "link_fora_do_site",
  "site_dominio_inexistente",
  "site_certificado_invalido",
  "site_dominio_gratuito",
  "poucas_fotos",
  "pouca_avaliacao",
] as const

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
    // "site não" sobrava: se o link vai pra rede social, já está dito
    redeSocial: "o link de vocês leva só pro {DESTINO}",
    redeSocialSemNome: "o link de vocês leva só pra uma rede social",
    // página de links (Linktree...) ou diretório (Jusbrasil, iFood...)
    pagina: "o link de vocês leva pra uma página no {DESTINO}",
    paginaDeLinksSemNome: "o link só vai pra uma página de links",
    plataformaSemNome: "o link só vai pra uma página de outro site",
    // Pergunta própria (opcional, por nicho) quando o link vai pra uma página: a
    // do nicho perguntaria por uma página que a observação acabou de citar.
    // Sem entrada, vale a pergunta do nicho.
    perguntaQuandoPagina: {
      advocacia: "quem te procura por lá chega a ver suas áreas de atuação?",
    } as Partial<Record<string, string>>,
  },
  // Site próprio com problema. A âncora já diz "Procurei ... e achei", então o
  // texto não repete "procurei".
  site_dominio_inexistente: "o endereço do site de vocês não existe mais",
  site_certificado_invalido: "o site de vocês tá dando erro de segurança pra quem abre",
  site_dominio_gratuito: {
    comPlataforma: "o site de vocês tá num endereço gratuito do {PLATAFORMA}",
    semPlataforma: "o site de vocês tá num endereço gratuito",
  },
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
} as const satisfies TextosDasLacunas

// "Abordagem curta": mesma estrutura e mesma pergunta, só a observação mais enxuta.
export const TEXTOS_CURTOS_DAS_LACUNAS = {
  sem_site: "não tem site",
  link_fora_do_site: {
    whatsapp: "o link abre o WhatsApp",
    redeSocial: "o link só vai pro {DESTINO}",
    redeSocialSemNome: "o link só vai pra uma rede social",
    pagina: "o link só vai pro {DESTINO}",
    paginaDeLinksSemNome: "o link só vai pra uma página de links",
    plataformaSemNome: "o link não vai pra um site de vocês",
  },
  site_dominio_inexistente: "o endereço do site não existe mais",
  site_certificado_invalido: "o site tá com erro de segurança",
  site_dominio_gratuito: {
    comPlataforma: "o site tá num endereço gratuito do {PLATAFORMA}",
    semPlataforma: "o site tá num endereço gratuito",
  },
  poucas_fotos: {
    nenhuma: "não tem foto no perfil",
    uma: "tem só 1 foto",
    varias: "tem só {N} fotos",
  },
  pouca_avaliacao: {
    nenhuma: "não tem avaliação",
    poucas: "quase não tem avaliação",
  },
} as const satisfies TextosDasLacunas

export type TextosDasLacunas = {
  sem_site: string
  link_fora_do_site: {
    whatsapp: string
    redeSocial: string
    redeSocialSemNome: string
    pagina: string
    paginaDeLinksSemNome: string
    plataformaSemNome: string
    perguntaQuandoPagina?: Partial<Record<string, string>>
  }
  site_dominio_inexistente: string
  site_certificado_invalido: string
  site_dominio_gratuito: { comPlataforma: string; semPlataforma: string }
  poucas_fotos: { nenhuma: string; uma: string; varias: string }
  pouca_avaliacao: { nenhuma: string; poucas: string }
}

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
  // A própria página escreve "Cardapio Aki", sem acento; aqui vai com, que é
  // como se lê numa mensagem.
  ["cardapioaki.app", "Cardápio Aki"],
  ["booksy.com", "Booksy"],
  ["trinks.com", "Trinks"],
  ["doctoralia.com.br", "Doctoralia"],
  ["sympla.com.br", "Sympla"],
  ["zapier.app", "Zapier"],
]
