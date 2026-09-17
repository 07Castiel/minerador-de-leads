import Papa from "papaparse"

import { ROTULO_STATUS_SITE, type StatusSite } from "@/lib/leads/analiseSite"
import { motivosDoLead } from "@/lib/leads/motivos"
import { ETAPA_LABELS, isEtapa, type Lead } from "@/types/lead"

// Excel em pt-BR abre CSV separado por ";" e precisa do BOM pra acentuação.
const BOM = "﻿"

const numeroBr = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })

function celula(valor: string | number | boolean | null | undefined): string {
  if (valor === null || valor === undefined) return ""
  if (typeof valor === "boolean") return valor ? "Sim" : "Não"
  if (typeof valor === "number") return numeroBr.format(valor)
  return valor
}

const COLUNAS: { titulo: string; valor: (lead: Lead) => string | number | boolean | null }[] = [
  { titulo: "Nome", valor: (l) => l.nome },
  { titulo: "Categoria", valor: (l) => l.categoria },
  { titulo: "Telefone", valor: (l) => l.telefone },
  { titulo: "Endereço", valor: (l) => l.endereco },
  { titulo: "Bairro", valor: (l) => l.bairro },
  { titulo: "Cidade", valor: (l) => l.cidade },
  { titulo: "Tem site", valor: (l) => l.tem_site },
  { titulo: "Nota Google", valor: (l) => l.google_rating },
  { titulo: "Nº de avaliações", valor: (l) => l.google_avaliacoes_count },
  { titulo: "Score", valor: (l) => l.score },
  { titulo: "Temperatura", valor: (l) => l.temperatura },
  { titulo: "Etapa", valor: (l) => (isEtapa(l.etapa) ? ETAPA_LABELS[l.etapa] : l.etapa) },
  { titulo: "Google Maps", valor: (l) => l.maps_url },
  { titulo: "Link no Google", valor: (l) => l.site_url },
  { titulo: "Perfil Google reivindicado", valor: (l) => l.perfil_reivindicado },
  { titulo: "Fotos no Google", valor: (l) => l.fotos_count },
  {
    titulo: "Site: situação",
    valor: (l) =>
      l.site_status ? (ROTULO_STATUS_SITE[l.site_status as StatusSite] ?? l.site_status) : null,
  },
  { titulo: "Site: nota no celular", valor: (l) => l.site_nota_celular },
  { titulo: "Destaques", valor: (l) => motivosDoLead(l).map((m) => m.texto).join(" · ") },
  {
    titulo: "Próximo contato",
    valor: (l) => (l.proximo_contato ? l.proximo_contato.split("-").reverse().join("/") : null),
  },
]

export function leadsParaCsv(leads: Lead[]): string {
  const csv = Papa.unparse(
    {
      fields: COLUNAS.map((c) => c.titulo),
      data: leads.map((lead) => COLUNAS.map((c) => celula(c.valor(lead)))),
    },
    // Nomes vêm do Google Maps (texto de terceiros): célula começando com
    // = + - @ viraria fórmula no Excel; escapeFormulae prefixa com '.
    { delimiter: ";", escapeFormulae: true }
  )
  return BOM + csv
}

function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function nomeArquivoCsv(nicho: string, local: string, data = new Date()): string {
  const dia = data.toISOString().slice(0, 10)
  return `leads-${slug(nicho)}-${slug(local)}-${dia}.csv`
}

export function baixarCsv(conteudo: string, nomeArquivo: string) {
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = nomeArquivo
  link.click()
  URL.revokeObjectURL(url)
}
