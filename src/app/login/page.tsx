import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/LoginForm"
import { obterSessao } from "@/lib/sessao"

export const metadata: Metadata = { title: "Entrar" }

export default async function LoginPage() {
  if (await obterSessao()) redirect("/crm")

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <LoginForm />
    </div>
  )
}
