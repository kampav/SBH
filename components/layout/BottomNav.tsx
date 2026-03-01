'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Utensils, Dumbbell, TrendingUp } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Home',     Icon: Home },
  { href: '/nutrition', label: 'Nutrition', Icon: Utensils },
  { href: '/workout',   label: 'Workout',   Icon: Dumbbell },
  { href: '/metrics',   label: 'Progress',  Icon: TrendingUp },
]

export default function BottomNav() {
  const pathname = usePathname()

  // Don't render on auth/onboarding pages
  const hide = ['/', '/login', '/register', '/onboarding'].includes(pathname)
  if (hide) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card-sbh border-t border-sbh flex items-stretch h-16"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {NAV.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link key={href} href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors
              ${active ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
            <span className={`font-medium ${active ? 'text-emerald-400' : ''}`}>{label}</span>
            {active && <span className="absolute bottom-0 w-10 h-0.5 bg-emerald-400 rounded-t-full" />}
          </Link>
        )
      })}
    </nav>
  )
}
