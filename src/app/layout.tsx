import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from './providers'
import { Toaster } from 'sonner'

import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Murimi POS - Wholesale Point of Sale System',
  description: 'Modern wholesale Point of Sale system for Kenya',
  manifest: '/manifest.json',
  themeColor: '#000000',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Murimi POS',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={inter.className}>
          <Providers>
            {children}
            <Toaster position="top-right" />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}