"use client"

import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { Toaster } from "@/components/ui/sonner"
import type { Tema } from "@/lib/tema"

let browserQueryClient: QueryClient | undefined

// Um QueryClient por render no servidor; no navegador, o mesmo durante a sessão.
function getQueryClient() {
  if (typeof window === "undefined") return new QueryClient()
  browserQueryClient ??= new QueryClient()
  return browserQueryClient
}

export function Providers({ children, tema }: { children: ReactNode; tema: Tema }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
      <Toaster theme={tema} />
    </QueryClientProvider>
  )
}
