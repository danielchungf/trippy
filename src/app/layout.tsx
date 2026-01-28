import type { Metadata } from "next"
import localFont from "next/font/local"
import { Inter } from "next/font/google"
import "./globals.css"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { Agentation } from "agentation"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const fustat = localFont({
  src: [
    { path: "./fonts/Fustat-ExtraLight.ttf", weight: "200", style: "normal" },
    { path: "./fonts/Fustat-Light.ttf", weight: "300", style: "normal" },
    { path: "./fonts/Fustat-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Fustat-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Fustat-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/Fustat-Bold.ttf", weight: "700", style: "normal" },
    { path: "./fonts/Fustat-ExtraBold.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-fustat",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Piper - Trip Planning",
  description: "Plan your trips with ease",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fustat.variable}`}>
      <body className="antialiased min-h-screen font-inter">
        <QueryProvider>
          {children}
        </QueryProvider>
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  )
}
