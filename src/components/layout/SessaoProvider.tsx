"use client"

import { createContext, useContext, type ReactNode } from "react"

export type SessaoCliente = {
  email: string | null
  org: { id: string; nome: string; papel: string }
}

const SessaoContext = createContext<SessaoCliente | null>(null)

// A sessão é resolvida no servidor (layout autenticado) e repassada aqui para
// os componentes client — assim eles sabem a org sem nova consulta.
export function SessaoProvider({ value, children }: { value: SessaoCliente; children: ReactNode }) {
  return <SessaoContext.Provider value={value}>{children}</SessaoContext.Provider>
}

export function useSessao(): SessaoCliente {
  const ctx = useContext(SessaoContext)
  if (!ctx) throw new Error("useSessao precisa estar dentro do layout autenticado.")
  return ctx
}
