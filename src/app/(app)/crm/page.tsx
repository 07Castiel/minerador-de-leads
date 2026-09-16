import type { Metadata } from "next"
import { Suspense } from "react"

import { CrmView } from "@/components/crm/CrmView"

export const metadata: Metadata = { title: "CRM" }

export default function CrmPage() {
  // Suspense: CrmView lê os filtros da URL (useSearchParams).
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
      <CrmView />
    </Suspense>
  )
}
