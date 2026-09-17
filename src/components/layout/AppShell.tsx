"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

import { useSessao } from "@/components/layout/SessaoProvider"
import { Button } from "@/components/ui/button"
import { useContagemRetornosPendentes } from "@/hooks/useLeads"
import { supabaseBrowser } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/hoje", label: "Hoje" },
  { href: "/crm", label: "CRM" },
  { href: "/buscar", label: "Buscar leads" },
  { href: "/mensagens", label: "Mensagens" },
  { href: "/importar", label: "Importar" },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { org, email } = useSessao()
  const { data: retornosPendentes } = useContagemRetornosPendentes()
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()

  async function sair() {
    await supabaseBrowser().auth.signOut()
    queryClient.clear()
    router.replace("/login")
    router.refresh()
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/crm" className="hidden shrink-0 truncate text-sm font-semibold md:block">
              {org.nome} <span className="font-normal text-muted-foreground">· Leads</span>
            </Link>
            {/* No celular os itens rolam na horizontal em vez de quebrar o cabeçalho. */}
            <nav className="-mx-1 flex min-w-0 items-center gap-4 overflow-x-auto px-1">
              {NAV_ITEMS.map((item) => {
                const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`)
                const contagem = item.href === "/hoje" ? (retornosPendentes ?? 0) : 0
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={ativo ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground",
                      ativo && "font-medium text-foreground"
                    )}
                  >
                    {item.label}
                    {contagem > 0 && (
                      <span
                        className="rounded-full bg-primary px-1.5 text-xs font-semibold tabular-nums text-primary-foreground"
                        aria-label={`${contagem} ${contagem === 1 ? "retorno pendente" : "retornos pendentes"}`}
                      >
                        {contagem}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {email && <span className="hidden text-sm text-muted-foreground xl:inline">{email}</span>}
            <Button variant="ghost" size="sm" onClick={() => void sair()}>
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
