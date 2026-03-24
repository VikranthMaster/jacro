import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'JACRO | Luxury Fashion',
  description: 'Redefining everyday fashion with timeless minimalism. Discover the new collection.',
  generator: 'v0.app',
  keywords: ['luxury fashion', 'designer clothing', 'minimalist fashion', 'JACRO'],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#F5F5DC',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} data-scroll-behavior="smooth">
      <body className="font-sans antialiased bg-[#F5F5DC] text-[#111111] overflow-x-hidden">
        <div className="noise-overlay" aria-hidden="true" />
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
