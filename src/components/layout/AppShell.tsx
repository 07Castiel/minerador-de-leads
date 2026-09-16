"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

import { useSessao } from "@/components/layout/SessaoProvider"
import { Button } from "@/components/ui/button"
import { supabaseBrowser } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/crm", label: "CRM" },
  { href: "/buscar", label: "Buscar leads" },
  { href: "/importar", label: "Importar" },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { org, email } = useSessao()
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
            <Link href="/crm" className="truncate text-sm font-semibold">
              {org.nome} <span className="font-normal text-muted-foreground">· Leads</span>
            </Link>
            <nav className="flex items-center gap-4">
              {NAV_ITEMS.map((item) => {
                const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={ativo ? "page" : undefined}
                    className={cn(
                      "whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground",
                      ativo && "font-medium text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {email && <span className="hidden text-sm text-muted-foreground md:inline">{email}</span>}
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
