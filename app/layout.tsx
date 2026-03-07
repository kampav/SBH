import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/layout/BottomNav'
import OfflineBanner from '@/components/OfflineBanner'
import AppInit from '@/components/AppInit'
import PWAInstallBanner from '@/components/PWAInstallBanner'
import CoachWidget from '@/components/coach/CoachWidget'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SBH — Science Based Health',
  description: 'Science-backed personal training, nutrition tracking & AI coaching',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SBH',
  },
}

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',  // enables safe-area-inset for notched phones
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('sbh_theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){}` }} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.className} antialiased bg-app text-1`}>
        <AppInit />
        <OfflineBanner />
        <PWAInstallBanner />
        {children}
        <BottomNav />
        <CoachWidget />
      </body>
    </html>
  )
}
