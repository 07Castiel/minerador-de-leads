import type { Metadata } from "next"
import { Cinzel, Rajdhani } from "next/font/google"
import { cookies } from "next/headers"

import { Providers } from "@/components/layout/Providers"
import { COOKIE_TEMA, lerTema } from "@/lib/tema"
import "./globals.css"

const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel" })
const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rajdhani",
})

export const metadata: Metadata = {
  title: {
    default: "Leads · Núcleo Tech",
    template: "%s · Leads",
  },
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const tema = lerTema((await cookies()).get(COOKIE_TEMA)?.value)

  return (
    <html
      lang="pt-BR"
      className={`${cinzel.variable} ${rajdhani.variable}${tema === "light" ? " light" : ""}`}
    >
      <body>
        <Providers tema={tema}>{children}</Providers>
      </body>
    </html>
  )
}
