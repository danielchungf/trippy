import type { Metadata } from "next"
import "./globals.css"

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
    <html lang="en">
      <body className="antialiased min-h-screen font-sans">
        {children}
      </body>
    </html>
  )
}
