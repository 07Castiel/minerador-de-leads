import type { Metadata } from "next"

import { LeadDetail } from "@/components/leads/LeadDetail"

export const metadata: Metadata = { title: "Lead" }

export default async function LeadPage(props: PageProps<"/leads/[id]">) {
  const { id } = await props.params
  return <LeadDetail id={id} />
}
