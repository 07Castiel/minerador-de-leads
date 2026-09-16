import type { Metadata } from "next"

import { BuscaResultadosView } from "@/components/minerador/BuscaResultadosView"

export const metadata: Metadata = { title: "Resultados da busca" }

export default async function BuscaPage(props: PageProps<"/buscar/[id]">) {
  const { id } = await props.params
  return <BuscaResultadosView id={id} />
}
