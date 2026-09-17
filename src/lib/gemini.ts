import "server-only"

import { FinishReason, GoogleGenAI, ThinkingLevel, type GenerateContentResponse } from "@google/genai"

import type { Redator } from "@/lib/leads/abordagem"
import { INSTRUCOES_DO_REDATOR, limparMensagem, montarPedidoDoRedator } from "@/lib/leads/mensagemWhatsApp"

// Modelos estáveis com plano gratuito. Cada tentativa da abordagem usa um: a
// primeira o 3.5 (o que mais respondeu em teste), o retry o 3.8. Assim
// sobrecarga (503) ou limite por minuto (429) num vira retry no outro, e as duas
// tentativas cabem no tempo da rota.
export const MODELOS_GEMINI = ["gemini-3.5-flash", "gemini-3.8-flash"] as const

let cliente: GoogleGenAI | null = null

function gemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY nas variáveis de ambiente do servidor.")
  // Sem novas tentativas dentro do SDK (o padrão são 5, com espera de até 1 min):
  // o retry é da abordagem, com o outro modelo. O 503 às vezes demora mais de
  // 30 s para chegar, então o limite corta antes.
  cliente ??= new GoogleGenAI({ apiKey, httpOptions: { timeout: 25_000, retryOptions: { attempts: 1 } } })
  return cliente
}

function lerMensagem(resposta: GenerateContentResponse): string {
  const fim = resposta.candidates?.[0]?.finishReason
  if (resposta.promptFeedback?.blockReason || fim === FinishReason.SAFETY) {
    throw new Error("o Gemini recusou escrever a mensagem")
  }
  if (fim === FinishReason.MAX_TOKENS) throw new Error("a resposta do Gemini foi cortada")
  return limparMensagem(resposta.text ?? "")
}

// Redator da camada 2. Erro aqui vira tentativa bloqueada em redigirAbordagem,
// que cai no texto fixo depois do retry.
export function redatorGemini(descartadas: string[] = []): Redator {
  return async (dados, bloqueiosAnteriores) => {
    const model = MODELOS_GEMINI[bloqueiosAnteriores.length % MODELOS_GEMINI.length]
    const resposta = await gemini().models.generateContent({
      model,
      contents: montarPedidoDoRedator(dados, { descartadas, bloqueiosAnteriores }),
      config: {
        systemInstruction: INSTRUCOES_DO_REDATOR,
        // Guia do Gemini 3: manter 1.0. Quem segura o conteúdo é a validação.
        temperature: 1,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      },
    })
    return lerMensagem(resposta)
  }
}
