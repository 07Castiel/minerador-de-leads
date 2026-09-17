import type { Metadata } from "next"

import { ModelosMensagemView } from "@/components/mensagens/ModelosMensagemView"

export const metadata: Metadata = { title: "Mensagens" }

export default function MensagensPage() {
  return <ModelosMensagemView />
}
