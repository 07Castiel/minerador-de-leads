import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { AppShell } from "@/components/layout/AppShell"
import { SessaoProvider } from "@/components/layout/SessaoProvider"
import { obterSessao } from "@/lib/sessao"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const sessao = await obterSessao()
  if (!sessao) redirect("/login")

  if (!sessao.org) {
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-2 p-6">
        <h1 className="text-lg font-semibold">Conta sem organização</h1>
        <p className="text-sm text-muted-foreground">
          Seu login ({sessao.email ?? "sem e-mail"}) ainda não pertence a nenhuma organização. Se o
          banco acabou de ser atualizado, confira se a migration
          <code className="mx-1">20260916150000_multi_conta_minerador_crm.sql</code>
          foi aplicada.
        </p>
      </div>
    )
  }

  return (
    <SessaoProvider value={{ email: sessao.email, org: sessao.org }}>
      <AppShell>{children}</AppShell>
    </SessaoProvider>
  )
}
