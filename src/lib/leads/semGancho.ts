// "Sem gancho": o lead cujo site abre e não tem defeito nenhum, ou seja, a
// janela do WhatsApp não tem o que dizer pra ele. Não é coluna no banco — é
// derivado na hora, porque se o site cair amanhã o lead volta a ter gancho
// sozinho, sem reprocessamento.
//
// O quadro do CRM é fila de trabalho e esconde esses leads por padrão; a lista
// é onde se audita e confere número, e mostra todos.

import {
  descartadoSemGancho,
  lacunasDaAbordagem,
  resolverNicho,
  type CamposDaAbordagem,
} from "@/lib/leads/abordagem"

// Id do atalho na URL (?f=descartados).
export const FILTRO_DESCARTADOS = "descartados"

export type Visao = "quadro" | "lista"

// A mesma decisão de prepararAbordagem: nenhuma lacuna e site próprio sem
// defeito. Sem lacuna mas com site inconclusivo é "manual", não é sem gancho.
export function semGancho(lead: CamposDaAbordagem): boolean {
  if (!descartadoSemGancho(lead)) return false
  return lacunasDaAbordagem(lead, resolverNicho(lead.categoria)).length === 0
}

export function contarSemGancho(leads: readonly CamposDaAbordagem[]): number {
  return leads.reduce((total, lead) => (semGancho(lead) ? total + 1 : total), 0)
}

// Só o quadro esconde, e só enquanto o atalho está desligado: ligado, ele é o
// jeito de ver justamente esses.
export function leadsDaVisao<T extends CamposDaAbordagem>(
  leads: readonly T[],
  visao: Visao,
  filtros: ReadonlySet<string>
): T[] {
  if (visao === "lista" || filtros.has(FILTRO_DESCARTADOS)) return [...leads]
  return leads.filter((lead) => !semGancho(lead))
}

// O clique no contador: lista já filtrada nesse status, sem perder os atalhos
// que já estavam ligados.
export function paramsDoContador(filtros: Iterable<string>): { visao: string; f: string } {
  return { visao: "lista", f: [...new Set([...filtros, FILTRO_DESCARTADOS])].join(",") }
}
