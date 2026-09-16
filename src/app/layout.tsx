import type { Metadata } from "next"

import { Providers } from "@/components/layout/Providers"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Leads · Núcleo Tech",
    template: "%s · Leads",
  },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
