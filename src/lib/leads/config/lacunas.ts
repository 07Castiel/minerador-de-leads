// Lacunas da primeira abordagem por WhatsApp: quais valem, em que ordem, e o
// texto de cada uma. Placeholders em MAIÚSCULAS entre chaves são trocados pelo
// código (src/lib/leads/abordagem.ts).

// Ordem = precedência: vale a primeira que o lead tiver.
// Fora de propósito: horário (tem_horario nunca é false, só true ou desconhecido)
// e avaliações sem resposta (o scraper não lê avaliações).
export const LACUNAS_DA_ABORDAGEM = ["sem_site", "link_fora_do_site", "poucas_fotos", "pouca_avaliacao"] as const

export type LacunaDaAbordagem = (typeof LACUNAS_DA_ABORDAGEM)[number]

export const TEXTOS_DAS_LACUNAS = {
  // 1a: nenhum link no perfil
  sem_site: {
    lacuna: "o perfil tá sem site",
    consequencia: "quem quer ver preço ou o que tem acaba tendo que chamar no WhatsApp pra tudo",
  },
  // 1b: o link do perfil vai pra rede social ou plataforma. O texto diz o destino
  // real: só 10 dos 20 leads de hoje vão pro Instagram.
  link_fora_do_site: {
    lacunaPorDestino: {
      instagram: "no perfil o link vai pro Instagram",
      whatsapp: "no perfil o link abre direto o WhatsApp",
      pagina_de_links: "no perfil o link vai pra uma página de links",
      rede_social: "no perfil o link vai pra uma rede social",
      plataforma: "no perfil o link vai pra uma página de outra plataforma",
    },
    // Quando o domínio permite dizer o nome certo (vale sobre lacunaPorDestino)
    lacunaPorDominio: [
      ["facebook.com", "no perfil o link vai pro Facebook"],
      ["fb.com", "no perfil o link vai pro Facebook"],
      ["fb.me", "no perfil o link vai pro Facebook"],
      ["tiktok.com", "no perfil o link vai pro TikTok"],
      ["youtube.com", "no perfil o link vai pro YouTube"],
      ["youtu.be", "no perfil o link vai pro YouTube"],
      ["linkedin.com", "no perfil o link vai pro LinkedIn"],
      ["jusbrasil.com.br", "no perfil o link vai pra uma página no Jusbrasil"],
      ["jusfy.com.br", "no perfil o link vai pra uma página no Jusfy"],
      ["ifood.com.br", "no perfil o link vai pro iFood"],
      ["doctoralia.com.br", "no perfil o link vai pra uma página no Doctoralia"],
    ],
    // RASCUNHO: a especificação não trouxe consequência para a 1b. Revisar.
    consequencia: "quem chega pelo Google não encontra uma página de vocês antes de chamar",
  },
  // 3
  poucas_fotos: {
    lacunaNenhuma: "o perfil tá sem nenhuma foto",
    lacunaUma: "tem só 1 foto no perfil",
    lacuna: "tem só {N} fotos no perfil",
    consequencia: "quem não conhece não consegue ver o que vocês fazem",
  },
  // 5
  pouca_avaliacao: {
    lacunaNenhuma: "o perfil ainda não tem avaliação",
    lacuna: "o perfil tem pouca avaliação",
    consequencia: "ele quase não aparece pra quem busca {CATEGORIA} em {CIDADE}",
    consequenciaSemCidade: "ele quase não aparece pra quem busca {CATEGORIA} no Google",
  },
} as const
