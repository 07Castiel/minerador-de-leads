import type { Metadata } from "next"

import { HojeView } from "@/components/crm/HojeView"

export const metadata: Metadata = { title: "Hoje" }

export default function HojePage() {
  return <HojeView />
}
