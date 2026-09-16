import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <h1 className="text-lg font-semibold">Página não encontrada</h1>
      <p className="text-sm text-muted-foreground">Verifique o endereço e tente novamente.</p>
      <Link href="/crm" className="text-sm text-primary underline underline-offset-4">
        Voltar para o CRM
      </Link>
    </div>
  )
}
