import type { Metadata } from "next"

import { MinerarView } from "@/components/minerador/MinerarView"

export const metadata: Metadata = { title: "Buscar leads" }

export default function BuscarPage() {
  return <MinerarView />
}
