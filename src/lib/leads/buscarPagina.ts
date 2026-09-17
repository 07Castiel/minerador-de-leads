import "server-only"

import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from "node:dns"
import http, { type IncomingMessage } from "node:http"
import https from "node:https"
import { BlockList, isIP } from "node:net"
import zlib from "node:zlib"

import type { ResultadoDaBusca } from "@/lib/leads/analiseSite"
import { classificarLink } from "@/lib/leads/presencaDigital"

// Abre o site do lead a partir do servidor. O link vem de dado de terceiros
// (Google Maps, planilha importada), então nada de seguir para endereço interno:
// cada conexão passa pelo lookup abaixo, que recusa IP privado, loopback,
// link-local etc. — inclusive depois de um redirecionamento.

const TEMPO_LIMITE_MS = 15_000
const MAXIMO_REDIRECIONAMENTOS = 6
const MAXIMO_BYTES = 2 * 1024 * 1024

// Celular comum: alguns sites entregam outra página para robô.
const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36"

// Listas separadas: o BlockList do Node também compara IPv4 com regra IPv6
// ::ffff:0:0/96, e uma lista única bloquearia todo site com IPv4.
const bloqueadosV4 = new BlockList()
const bloqueadosV6 = new BlockList()
for (const [rede, prefixo] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  bloqueadosV4.addSubnet(rede, prefixo, "ipv4")
}
for (const [rede, prefixo] of [
  ["::", 128],
  ["::1", 128],
  // IPv4 embutido em IPv6 (mapeado em hexa, NAT64, 6to4): site de verdade não usa
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  bloqueadosV6.addSubnet(rede, prefixo, "ipv6")
}

export function enderecoPermitido(endereco: string): boolean {
  const familia = isIP(endereco)
  if (familia === 4) return !bloqueadosV4.check(endereco, "ipv4")
  if (familia === 6) {
    // ::ffff:127.0.0.1 vale o IPv4 que carrega
    const ipv4 = endereco.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i)?.[1]
    if (ipv4) return isIP(ipv4) === 4 && !bloqueadosV4.check(ipv4, "ipv4")
    return !bloqueadosV6.check(endereco, "ipv6")
  }
  return false
}

function erroComCodigo(mensagem: string, code: string): Error {
  return Object.assign(new Error(mensagem), { code })
}

type CallbackDeLookup = (
  err: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number
) => void

function lookupSeguro(hostname: string, options: LookupOptions, callback: CallbackDeLookup) {
  dnsLookup(hostname, { ...options, all: true }, (err, enderecos) => {
    if (err) return callback(err, [])
    const permitidos = enderecos.filter((e) => enderecoPermitido(e.address))
    if (permitidos.length === 0) {
      return callback(erroComCodigo("Endereço não permitido.", "ENDERECO_BLOQUEADO"), [])
    }
    if (options.all) return callback(null, permitidos)
    callback(null, permitidos[0].address, permitidos[0].family)
  })
}

type Resposta = {
  status: number
  headers: IncomingMessage["headers"]
  corpo: string
}

function charsetDe(contentType: string, inicio: Buffer): string {
  const doHeader = contentType.match(/charset=["']?([\w-]+)/i)?.[1]
  const doHtml = inicio.toString("latin1").match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1]
  const charset = (doHeader ?? doHtml ?? "utf-8").toLowerCase()
  try {
    new TextDecoder(charset)
    return charset
  } catch {
    return "utf-8"
  }
}

function requisitar(url: URL, sinal: AbortSignal): Promise<Resposta> {
  return new Promise((resolve, reject) => {
    const modulo = url.protocol === "https:" ? https : http
    const req = modulo.request(
      url,
      {
        method: "GET",
        signal: sinal,
        lookup: lookupSeguro as unknown as http.RequestOptions["lookup"],
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "pt-BR,pt;q=0.9,en;q=0.6",
          "accept-encoding": "gzip, deflate, br",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume()
          resolve({ status, headers: res.headers, corpo: "" })
          return
        }

        const codificacao = String(res.headers["content-encoding"] ?? "").toLowerCase()
        const fluxo =
          codificacao === "gzip" || codificacao === "x-gzip"
            ? res.pipe(zlib.createGunzip())
            : codificacao === "deflate"
              ? res.pipe(zlib.createInflate())
              : codificacao === "br"
                ? res.pipe(zlib.createBrotliDecompress())
                : res

        const partes: Buffer[] = []
        let total = 0
        let terminou = false

        const terminar = () => {
          if (terminou) return
          terminou = true
          const buffer = Buffer.concat(partes)
          const contentType = String(res.headers["content-type"] ?? "")
          const corpo = new TextDecoder(charsetDe(contentType, buffer.subarray(0, 4096))).decode(buffer)
          resolve({ status, headers: res.headers, corpo })
        }

        fluxo.on("data", (pedaco: Buffer) => {
          if (terminou) return
          total += pedaco.length
          partes.push(pedaco)
          // Página enorme: o começo basta para a análise.
          if (total >= MAXIMO_BYTES) {
            terminar()
            res.destroy()
          }
        })
        fluxo.on("end", terminar)
        fluxo.on("error", (err) => {
          if (!terminou) reject(err)
        })
      }
    )
    req.on("error", reject)
    req.end()
  })
}

function codigoDoErro(err: unknown, sinal: AbortSignal): string {
  if (sinal.aborted) return "TIMEOUT"
  if (err && typeof err === "object" && "code" in err && typeof err.code === "string") return err.code
  return err instanceof Error ? err.name : "ERRO_DESCONHECIDO"
}

export async function buscarPagina(urlInicial: string): Promise<ResultadoDaBusca> {
  const sinal = AbortSignal.timeout(TEMPO_LIMITE_MS)
  let atual = new URL(urlInicial)

  try {
    for (let salto = 0; salto <= MAXIMO_REDIRECIONAMENTOS; salto++) {
      if (atual.protocol !== "http:" && atual.protocol !== "https:") {
        return { tipo: "falha", codigo: "PROTOCOLO_NAO_PERMITIDO" }
      }
      if (atual.port && atual.port !== "80" && atual.port !== "443") {
        return { tipo: "falha", codigo: "PORTA_NAO_PERMITIDA" }
      }
      // IP escrito direto no link não passa pelo lookup.
      const host = atual.hostname.replace(/^\[|\]$/g, "")
      if (isIP(host) && !enderecoPermitido(host)) return { tipo: "falha", codigo: "ENDERECO_BLOQUEADO" }

      const resposta = await requisitar(atual, sinal)
      const location = resposta.headers.location
      if (resposta.status >= 300 && resposta.status < 400 && location) {
        const proxima = new URL(location, atual)
        // Rede social, WhatsApp, plataforma: não precisa abrir (e o Instagram bloqueia robô).
        if (classificarLink(proxima.toString())?.tipo !== "site") {
          return { tipo: "redirecionou_para_fora", urlFinal: proxima.toString() }
        }
        atual = proxima
        continue
      }

      const titulo = resposta.corpo.slice(0, 5000).match(/<title[^>]*>([^<]*)/i)?.[1] ?? ""
      return {
        tipo: "pagina",
        urlFinal: atual.toString(),
        status: resposta.status,
        contentType: String(resposta.headers["content-type"] ?? ""),
        html: resposta.corpo,
        desafioAntiRobo:
          resposta.headers["cf-mitigated"] === "challenge" ||
          /just a moment|attention required|checking your browser/i.test(titulo),
      }
    }
    return { tipo: "falha", codigo: "MUITOS_REDIRECIONAMENTOS" }
  } catch (err) {
    return { tipo: "falha", codigo: codigoDoErro(err, sinal) }
  }
}
