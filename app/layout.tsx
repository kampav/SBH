import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/layout/BottomNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SBH — Science Based Health',
  description: 'Science-backed personal training, nutrition tracking & AI coaching',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-app text-1`}>
        {children}
        <BottomNav />
      </body>
    </html>
  )
}
