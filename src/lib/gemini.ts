import "server-only"

import { ApiError, FinishReason, GoogleGenAI, ThinkingLevel, type GenerateContentResponse } from "@google/genai"

import {
  INSTRUCOES_MENSAGEM_WHATSAPP,
  limparMensagem,
  montarPedidoDeMensagem,
  type CamposDaMensagem,
} from "@/lib/leads/mensagemWhatsApp"

// Modelos estáveis com plano gratuito, em ordem de preferência. Em teste (set/2026)
// o 3.5 respondeu quase sempre; o 3.8 escreve parecido, mas no plano gratuito vive
// com "alta demanda" (503) e estoura o limite por minuto (429). Falhou um, vai o outro.
export const MODELOS_GEMINI = ["gemini-3.5-flash", "gemini-3.8-flash"] as const

let cliente: GoogleGenAI | null = null

function gemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY nas variáveis de ambiente do servidor.")
  // Sem novas tentativas no mesmo modelo (o padrão do SDK são 5, com espera de
  // até 1 min): quem faz esse papel é o modelo seguinte da lista. O 503 às vezes
  // demora mais de 30 s para chegar, então o limite corta antes.
  cliente ??= new GoogleGenAI({ apiKey, httpOptions: { timeout: 25_000, retryOptions: { attempts: 1 } } })
  return cliente
}

// Limite de uso, sobrecarga, instabilidade ou tempo esgotado: vale tentar outro modelo.
function valeTentarOutroModelo(err: unknown): boolean {
  return err instanceof ApiError ? err.status === 429 || err.status >= 500 : true
}

function lerMensagem(resposta: GenerateContentResponse): string {
  const fim = resposta.candidates?.[0]?.finishReason
  if (resposta.promptFeedback?.blockReason || fim === FinishReason.SAFETY) {
    throw new Error("O Gemini não escreveu a mensagem para este lead. Tente de novo.")
  }
  if (fim === FinishReason.MAX_TOKENS) {
    throw new Error("A resposta do Gemini foi cortada. Tente de novo.")
  }
  const mensagem = limparMensagem(resposta.text ?? "")
  if (!mensagem) throw new Error("O Gemini devolveu uma mensagem vazia. Tente de novo.")
  return mensagem
}

export async function gerarMensagemWhatsApp(lead: CamposDaMensagem, descartadas: string[] = []): Promise<string> {
  const ai = gemini()
  const contents = montarPedidoDeMensagem({ lead, agora: new Date(), descartadas })

  for (const [i, model] of MODELOS_GEMINI.entries()) {
    try {
      const resposta = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: INSTRUCOES_MENSAGEM_WHATSAPP,
          // Mensagem curta: raciocínio médio basta e responde mais rápido.
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        },
      })
      return lerMensagem(resposta)
    } catch (err) {
      const proximo = MODELOS_GEMINI[i + 1]
      if (!proximo || !valeTentarOutroModelo(err)) throw err
      console.warn(`Gemini ${model} falhou (${err instanceof Error ? err.message.slice(0, 120) : err}); tentando ${proximo}`)
    }
  }
  throw new Error("Nenhum modelo do Gemini configurado.")
}
