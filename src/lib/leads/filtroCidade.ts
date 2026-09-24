// Filtro do CRM por cidade, com várias ao mesmo tempo. A cidade vem do Google
// Maps e da busca do minerador, então "Sobral", "sobral" e "SOBRAL " podem
// coexistir: o filtro agrupa pela chave normalizada e mostra a grafia mais
// comum. A URL guarda a chave (?cidade=sobral|fortaleza).

const SEPARADOR = "|"

export type CidadeDoFunil = {
  chave: string
  nome: string
  total: number
}

export function chaveDaCidade(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’´`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

// Cidades que aparecem nos leads, da maior pra menor: quem tem mais lead fica no
// topo da lista. Lead sem cidade não entra (não há o que escolher).
export function cidadesDoFunil(leads: readonly { cidade: string | null }[]): CidadeDoFunil[] {
  const grupos = new Map<string, { total: number; grafias: Map<string, number> }>()

  for (const { cidade } of leads) {
    const nome = cidade?.trim().replace(/\s+/g, " ")
    if (!nome) continue
    const chave = chaveDaCidade(nome)
    const grupo = grupos.get(chave) ?? { total: 0, grafias: new Map() }
    grupo.total += 1
    grupo.grafias.set(nome, (grupo.grafias.get(nome) ?? 0) + 1)
    grupos.set(chave, grupo)
  }

  return [...grupos.entries()]
    .map(([chave, { total, grafias }]) => ({
      chave,
      total,
      nome: [...grafias.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))[0][0],
    }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"))
}

export function cidadesDaUrl(valor: string | null): Set<string> {
  return new Set((valor ?? "").split(SEPARADOR).filter(Boolean))
}

export function cidadesParaUrl(chaves: Iterable<string>): string | null {
  return [...chaves].join(SEPARADOR) || null
}

// Sem nenhuma cidade escolhida, não filtra. Com alguma, lead sem cidade fica de fora.
export function leadEstaNasCidades(lead: { cidade: string | null }, escolhidas: ReadonlySet<string>): boolean {
  if (escolhidas.size === 0) return true
  return !!lead.cidade && escolhidas.has(chaveDaCidade(lead.cidade))
}
