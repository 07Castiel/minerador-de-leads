// Camada 2 da abordagem por WhatsApp: o Gemini só redige. Recebe saudação,
// âncora, lacuna e pergunta já decididas pela camada 1
// (src/lib/leads/abordagem.ts) e encaixa com fluência. Não recebe os dados crus
// do lead: era deles que saía gancho inventado. A chamada à API fica em
// src/lib/gemini.ts; tudo aqui é puro, pra testar sem chamar a API.
// Hoje desligado (GEMINI_NA_ABORDAGEM no config).

import type { DadosDaAbordagem, TentativaBloqueada } from "@/lib/leads/abordagem"
import { LIMITES, MENSAGEM_FIXA } from "@/lib/leads/abordagemConfig"

// A estrutura vem do mesmo config do texto fixo.
export const INSTRUCOES_DO_REDATOR = `Você redige uma única mensagem de WhatsApp de primeiro contato, em português brasileiro natural do Ceará. Você NÃO decide o conteúdo: recebe todos os elementos já resolvidos e apenas os encaixa com fluência.

Os elementos chegam entre tags com o mesmo nome: <SAUDACAO>, <ANCORA>, <LACUNA> e <PERGUNTA>.

Estrutura obrigatória, no máximo 3 linhas, sem linha em branco:
${MENSAGEM_FIXA}

Regras:
- Não escolha outro gancho. Se notar outra coisa no perfil, ignore.
- Não elogie o negócio, o atendimento nem as avaliações.
- Não diga o que o remetente vende, não ofereça nada, não peça permissão para mandar nada, não prometa resultado.
- A {PERGUNTA} vem pronta, com a concordância já resolvida: copie literalmente, sem trocar você por vocês nem nenhuma outra palavra.
- A mensagem termina na {PERGUNTA}. Nada depois.
- Uma única interrogação em toda a mensagem.
- Sem travessão, sem reticências, sem emoji, sem markdown.
- Máximo ${LIMITES.caracteres} caracteres. Devolva apenas o texto da mensagem.

Sua liberdade é de fluência: concordância, preposição, ritmo. Não de conteúdo.`

export const MAXIMO_DESCARTADAS = 3

type ContextoDoPedido = {
  // Versões do Gemini que o usuário já viu e pediu outra ("Gerar outra")
  descartadas?: string[]
  // Tentativas desta mesma geração que a validação recusou (o retry)
  bloqueiosAnteriores?: TentativaBloqueada[]
}

export function montarPedidoDoRedator(
  dados: Pick<DadosDaAbordagem, "saudacao" | "ancora" | "textoDaLacuna" | "pergunta">,
  { descartadas = [], bloqueiosAnteriores = [] }: ContextoDoPedido = {}
): string {
  // Sem tratamento (você/vocês): a camada 1 já resolve dentro da lacuna e da
  // pergunta, e mandar isso fazia o Gemini "corrigir" a pergunta fixa.
  const partes = [
    [
      `<SAUDACAO>${dados.saudacao}</SAUDACAO>`,
      `<ANCORA>${dados.ancora}</ANCORA>`,
      `<LACUNA>${dados.textoDaLacuna}</LACUNA>`,
      `<PERGUNTA>${dados.pergunta}</PERGUNTA>`,
    ].join("\n"),
  ]

  // Erro de API não é culpa da redação: só os motivos da validação voltam pro modelo.
  const recusas = bloqueiosAnteriores.flatMap((b) => b.motivos).filter((m) => !m.startsWith("erro:"))
  if (recusas.length > 0) {
    partes.push(
      `Sua versão anterior foi recusada pela revisão por: ${[...new Set(recusas)].join(", ")}. Escreva de novo seguindo a estrutura e as regras.`
    )
  }

  const recentes = descartadas.slice(-MAXIMO_DESCARTADAS)
  if (recentes.length > 0) {
    partes.push(
      "O usuário já viu estas versões e pediu outra. Mude a redação, não o conteúdo:\n" +
        recentes.map((texto) => `<descartada>\n${texto}\n</descartada>`).join("\n")
    )
  }

  partes.push("Escreva a mensagem.")
  return partes.join("\n\n")
}

// O modelo às vezes embrulha a resposta em aspas ou deixa linhas em branco sobrando.
export function limparMensagem(texto: string): string {
  let limpo = texto.trim()
  // Só quando as aspas embrulham tudo: "Oi" e "tchau" continua como está.
  const aspas = limpo.match(/^["“]([^"“”]*)["”]$/)
  if (aspas) limpo = aspas[1].trim()
  return limpo.replace(/\n{3,}/g, "\n\n")
}

// Usado pela saudação dos modelos salvos ({saudacao} em src/lib/leads/modelosMensagem.ts).
export function periodoDoDia(agora: Date): "manhã" | "tarde" | "noite" {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(
      agora
    )
  )
  if (hora >= 5 && hora < 12) return "manhã"
  if (hora >= 12 && hora < 18) return "tarde"
  return "noite"
}
