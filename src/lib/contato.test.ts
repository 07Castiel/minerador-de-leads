import { describe, expect, it } from "vitest"

import { linkLigacao, linkWhatsApp, pareceCelular, telefoneInternacional } from "@/lib/contato"

describe("telefoneInternacional", () => {
  it.each([
    ["(88) 99612-3456", "5588996123456"],
    ["(88) 3611-1234", "558836111234"],
    ["+55 88 99612-3456", "5588996123456"],
    ["088 99612-3456", "5588996123456"],
  ])("normaliza %s", (entrada, esperado) => {
    expect(telefoneInternacional(entrada)).toBe(esperado)
  })

  it.each([null, "", "(não disponível)", "3611-1234", "+1 415 555 0100"])(
    "rejeita %s",
    (entrada) => {
      expect(telefoneInternacional(entrada)).toBeNull()
    }
  )
})

describe("links de contato", () => {
  it("só considera celular quem tem 9 dígitos começando com 9", () => {
    expect(pareceCelular("(88) 99612-3456")).toBe(true)
    expect(pareceCelular("(88) 3611-1234")).toBe(false)
  })

  it("monta tel: e wa.me com DDI e mensagem codificada", () => {
    expect(linkLigacao("(88) 3611-1234")).toBe("tel:+558836111234")
    expect(linkWhatsApp("(88) 99612-3456", "Oi, tudo bem?")).toBe(
      "https://wa.me/5588996123456?text=Oi%2C%20tudo%20bem%3F"
    )
    expect(linkWhatsApp(null)).toBeNull()
  })
})
