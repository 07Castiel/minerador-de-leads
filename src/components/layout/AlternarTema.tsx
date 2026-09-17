"use client"

import { useRouter } from "next/navigation"
import { MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { COOKIE_TEMA } from "@/lib/tema"

export function AlternarTema() {
  const router = useRouter()

  function alternar() {
    const claro = !document.documentElement.classList.contains("light")
    // Troca na hora; o refresh re-renderiza o layout com o cookie novo (toaster incluso).
    document.documentElement.classList.toggle("light", claro)
    document.cookie = `${COOKIE_TEMA}=${claro ? "light" : "dark"}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }

  return (
    <Button variant="ghost" size="icon" onClick={alternar} aria-label="Alternar tema claro/escuro">
      <SunIcon className="hidden [.light_&]:block" />
      <MoonIcon className="[.light_&]:hidden" />
    </Button>
  )
}
