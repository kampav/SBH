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
  const hide = ['/', '/login', '/register', '/onboarding'].some(p => pathname === p || pathname.startsWith('/onboarding'))
  if (hide) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t flex items-stretch h-16"
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'var(--glass-border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-all active:scale-90"
            style={{ color: active ? '#a78bfa' : 'var(--text-3)' }}
          >
            <div className="relative flex items-center justify-center">
              {active && (
                <span className="absolute inset-0 rounded-xl"
                  style={{ background: 'rgba(124,58,237,0.15)', transform: 'scale(1.4)' }} />
              )}
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} className="relative" />
            </div>
            <span className="font-medium text-[10px] leading-none mt-0.5"
              style={{ fontWeight: active ? 700 : 500 }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
