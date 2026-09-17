import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { buscarPagina, enderecoPermitido } from "@/lib/leads/buscarPagina"

describe("enderecoPermitido", () => {
  it.each(["8.8.8.8", "67.199.248.10", "172.66.3.8", "2606:4700::6812:1", "2a02:4780:18:e418::1"])(
    "libera IP público %s",
    (ip) => {
      expect(enderecoPermitido(ip)).toBe(true)
    }
  )

  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.0.10",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "::",
    "fe80::1",
    "fd00::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "não é ip",
  ])("bloqueia %s", (ip) => {
    expect(enderecoPermitido(ip)).toBe(false)
  })

  it("::ffff: com IPv4 público vale o IPv4", () => {
    expect(enderecoPermitido("::ffff:8.8.8.8")).toBe(true)
  })
})

describe("buscarPagina sem rede", () => {
  it("recusa IP interno, porta fora do padrão e protocolo estranho antes de conectar", async () => {
    await expect(buscarPagina("http://169.254.169.254/latest/meta-data/")).resolves.toEqual({
      tipo: "falha",
      codigo: "ENDERECO_BLOQUEADO",
    })
    await expect(buscarPagina("http://[::1]/")).resolves.toEqual({ tipo: "falha", codigo: "ENDERECO_BLOQUEADO" })
    await expect(buscarPagina("http://exemplo.com.br:6379/")).resolves.toEqual({
      tipo: "falha",
      codigo: "PORTA_NAO_PERMITIDA",
    })
    await expect(buscarPagina("file:///etc/passwd")).resolves.toEqual({
      tipo: "falha",
      codigo: "PROTOCOLO_NAO_PERMITIDO",
    })
  })
})
