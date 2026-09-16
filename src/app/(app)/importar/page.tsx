import type { Metadata } from "next"

import { ImportView } from "@/components/import/ImportView"

export const metadata: Metadata = { title: "Importar" }

export default function ImportarPage() {
  return <ImportView />
}
