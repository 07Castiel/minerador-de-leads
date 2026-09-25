// Lista de leads em texto, para mandar as mensagens fora do app:
//
// Mensagem 1, antes de cada uma (para enviar entre 08:00 e 12:00): "Bom dia! Tudo bem?" — 20 leads
//
// LUIZ CARLOS SILVA ADVOCACIA
// Nicho: Advocacia
// Cidade: Sobral
// 88 99286-8505
// Mensagem: "..."
//
// Um bloco por lead, separados por uma linha em branco. A mensagem vem da mesma
// camada 1 da janela do WhatsApp (nada de modelo à parte) e passa pela mesma
// validação: o que não passar sai em branco, com o motivo do lado.

import { telefoneInternacional } from "@/lib/contato"
import {
  descreverMotivo,
  mensagemDeRetorno,
  mensagemDeSaudacao,
  mensagemFixa,
  prepararAbordagem,
  resolverNicho,
  validarConteudo,
  validarMensagem,
  type CamposDaAbordagem,
} from "@/lib/leads/abordagem"
import { SAUDACOES, type LacunaDaAbordagem } from "@/lib/leads/abordagemConfig"
import type { RegistroDeAbordagem } from "@/lib/leads/abordagens"
import { faixaDeDistancia } from "@/lib/leads/faixaDistancia"
import { motivoOrgaoPublico } from "@/lib/leads/orgaoPublico"
import { isEtapa, type Etapa, type Lead } from "@/types/lead"

export type LeadDaLista = CamposDaAbordagem & Pick<Lead, "id" | "telefone" | "etapa">

export type FaixaDeSaudacao = (typeof SAUDACOES)[number]

// "+55 88 99286-8505" → "88 99286-8505". Número que não parece brasileiro vai como veio.
export function telefoneDaLista(telefone: string | null): string {
  const numero = telefoneInternacional(telefone)
  if (!numero) return telefone?.trim() || "Sem telefone"
  const ddd = numero.slice(2, 4)
  const local = numero.slice(4)
  return `${ddd} ${local.slice(0, -4)}-${local.slice(-4)}`
}

// "Serviços jurídicos" e "Advogado trabalhista" viram "Advocacia". Categoria
// sem nicho com rótulo (ou de nicho que junta ramos diferentes) vai como veio do Google.
export function nichoDaLista(categoria: string | null): string {
  return resolverNicho(categoria).rotulo ?? (categoria?.trim() || "Não informado")
}

// Etapa fora da lista conhecida conta como "novo", igual ao quadro do CRM.
export function etapaDaLista(etapa: string): Etapa {
  return isEtapa(etapa) ? etapa : "novo"
}

export function temTelefone(lead: Pick<Lead, "telefone">): boolean {
  return telefoneInternacional(lead.telefone) !== null
}

export function blocoDoLead(lead: LeadDaLista, mensagem: string, motivo: string | null): string {
  return [
    // Alguns nomes do Google começam com emoji ou símbolo solto
    lead.nome.replace(/^[^\p{L}\p{N}]+/u, "").trim() || lead.nome.trim(),
    `Nicho: ${nichoDaLista(lead.categoria)}`,
    `Cidade: ${lead.cidade?.trim() || "Não informada"}`,
    telefoneDaLista(lead.telefone),
    `Mensagem 2: "${mensagem.trim()}"${mensagem.trim() === "" && motivo ? ` (${motivo})` : ""}`,
  ].join("\n")
}

// A saudação é a mensagem 1, igual pra todo mundo, então vem uma vez no topo
// em vez de repetir em cada bloco; a do bloco é a mensagem 2.
export function cabecalhoDaLista(faixa: FaixaDeSaudacao, quantos: number): string {
  const saudacao = mensagemDeSaudacao({ saudacao: faixa.texto })
  return `Mensagem 1, antes de cada uma (para enviar entre ${faixa.de} e ${faixa.ate}): "${saudacao}" — ${quantos} leads`
}

export type ItemDaLista = {
  lead: LeadDaLista
  texto: string
  // Por que a mensagem saiu em branco
  motivo: string | null
  // O que gravar em abordagens; null quando não há mensagem
  registro: RegistroDeAbordagem | null
}

export type FormatoDaLista = "completa" | "curta"

type OpcoesDaLista = {
  faixa: FaixaDeSaudacao
  agora: Date
  // "curta" troca a observação da lacuna pela versão enxuta, como na janela
  formato?: FormatoDaLista
  // buscas.nicho de cada lead, quando houver: a categoria genérica do Google
  // sozinha jogaria o lead pro nicho "outros"
  termoDaBusca?: (lead: LeadDaLista) => string | null
  // Lacunas das últimas mensagens registradas, a mais nova primeiro
  ultimasLacunas?: readonly LacunaDaAbordagem[]
}

// Etapas em que a primeira abordagem não serve: reunião marcada, cliente, perdido.
const MOTIVO_DA_ETAPA = "etapa não é de abordagem"

export function itemDaLista(lead: LeadDaLista, opcoes: OpcoesDaLista): ItemDaLista {
  const etapa = etapaDaLista(lead.etapa)
  const nicho = resolverNicho(lead.categoria, opcoes.termoDaBusca?.(lead) ?? null)
  const vazio = (motivo: string): ItemDaLista => ({ lead, texto: "", motivo, registro: null })

  // Órgão público ou instituição de ensino que tenha entrado à mão: sai em
  // branco, com o motivo, em vez de gerar mensagem. O minerador já descarta
  // esses na entrada; aqui é a rede pra quem foi importado por fora.
  const orgao = motivoOrgaoPublico(lead.nome, lead.categoria)
  if (orgao) return vazio(orgao)

  // Quem já foi abordado leva o follow-up; quem já avançou ou saiu, nada.
  if (etapa !== "novo") {
    if (etapa !== "abordado" && etapa !== "follow_up") return vazio(MOTIVO_DA_ETAPA)
    const texto = mensagemDeRetorno()
    const motivos = validarConteudo(texto, nicho.id)
    if (motivos.length > 0) return vazio(motivos.map(descreverMotivo).join(", "))
    return {
      lead,
      texto,
      motivo: null,
      registro: {
        lead_id: lead.id,
        tipo: "follow_up",
        lacuna: null,
        nicho: nicho.id,
        texto,
        origem: "exportacao",
      },
    }
  }

  const preparo = prepararAbordagem(lead, opcoes.agora, {
    saudacaoFixa: opcoes.faixa.texto,
    termoDaBusca: opcoes.termoDaBusca?.(lead) ?? null,
    ultimasLacunas: opcoes.ultimasLacunas,
  })
  if (preparo.tipo === "descartado_sem_gancho") return vazio("sem gancho automático")
  if (preparo.tipo !== "pronta") return vazio("falta dado do site pra decidir o gancho")

  const texto = mensagemFixa(preparo.dados, opcoes.formato)
  const motivos = validarMensagem(texto, preparo.dados)
  if (motivos.length > 0) return vazio(motivos.map(descreverMotivo).join(", "))
  return {
    lead,
    texto,
    motivo: null,
    registro: {
      lead_id: lead.id,
      tipo: "primeira",
      lacuna: preparo.dados.lacuna,
      nicho: preparo.dados.nicho,
      texto,
      origem: "exportacao",
    },
  }
}

export type ListaExportada = { texto: string; itens: ItemDaLista[] }

// Lead sem telefone fica de fora: a lista existe pra mandar no WhatsApp.
export function listaExportada(leads: readonly LeadDaLista[], opcoes: OpcoesDaLista): ListaExportada {
  // Da Faixa 1 (mais perto de Sobral) para a 3. Sort estável: dentro da mesma
  // faixa, a ordem que o CRM já mostrava é mantida.
  const comTelefone = leads
    .filter(temTelefone)
    .map((lead, ordem) => ({ lead, ordem }))
    .sort((a, b) => faixaDeDistancia(a.lead.cidade) - faixaDeDistancia(b.lead.cidade) || a.ordem - b.ordem)
    .map((item) => item.lead)
  const ultimas = [...(opcoes.ultimasLacunas ?? [])]
  const itens: ItemDaLista[] = []

  for (const lead of comTelefone) {
    const item = itemDaLista(lead, { ...opcoes, ultimasLacunas: ultimas })
    // A anti-repetição conta as mensagens desta mesma lista, não só as do banco.
    if (item.registro?.lacuna) ultimas.unshift(item.registro.lacuna as LacunaDaAbordagem)
    itens.push(item)
  }

  const blocos = itens.map((item) => blocoDoLead(item.lead, item.texto, item.motivo))
  return { texto: [cabecalhoDaLista(opcoes.faixa, comTelefone.length), ...blocos].join("\n\n"), itens }
}
