'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Utensils, Dumbbell, TrendingUp, User } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Home',     Icon: Home },
  { href: '/nutrition', label: 'Nutrition', Icon: Utensils },
  { href: '/workout',   label: 'Workout',   Icon: Dumbbell },
  { href: '/metrics',   label: 'Progress',  Icon: TrendingUp },
  { href: '/profile',   label: 'Profile',   Icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()
  const hide = ['/', '/login', '/register', '/onboarding'].includes(pathname)
  if (hide) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-dark border-t border-white/8 flex items-stretch h-16"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {NAV.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link key={href} href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors
              ${active ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <div className="relative">
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              {active && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </div>
            <span className={`font-medium text-[10px] ${active ? 'text-emerald-400' : ''}`}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
