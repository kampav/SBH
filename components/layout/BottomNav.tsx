'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Utensils, Dumbbell, TrendingUp, User, Activity } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Home',      Icon: Home },
  { href: '/nutrition', label: 'Nutrition', Icon: Utensils },
  { href: '/workout',   label: 'Workout',   Icon: Dumbbell },
  { href: '/glucose',   label: 'Glucose',   Icon: Activity },
  { href: '/metrics',   label: 'Progress',  Icon: TrendingUp },
  { href: '/profile',   label: 'Me',        Icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()

  const hide = ['/', '/login', '/register', '/onboarding'].some(
    p => pathname === p || pathname.startsWith('/onboarding')
  )
  if (hide) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
      style={{
        height: 'calc(4.5rem + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderTop: '1px solid var(--glass-border)',
        boxShadow: '0 -1px 0 0 rgba(255,255,255,0.04), 0 -8px 24px -8px rgba(0,0,0,0.4)',
      }}
    >
      {NAV.map(({ href, label, Icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-[3px] transition-all duration-200 active:scale-90"
            style={{ color: active ? 'var(--violet)' : 'var(--text-3)' }}
          >
            {/* Active pill behind icon */}
            <div className="relative flex items-center justify-center">
              {active && (
                <span
                  className="absolute rounded-2xl transition-all duration-300"
                  style={{
                    inset: '-6px -10px',
                    background: 'rgba(124,58,237,0.14)',
                    border: '1px solid rgba(124,58,237,0.22)',
                  }}
                />
              )}
              <Icon
                size={active ? 20 : 19}
                strokeWidth={active ? 2.5 : 1.75}
                className="relative transition-all duration-200"
              />
            </div>
            <span
              className="leading-none transition-all duration-200"
              style={{
                fontSize: '9px',
                fontWeight: active ? 700 : 500,
                letterSpacing: active ? '0.01em' : '0.02em',
                color: active ? 'var(--violet)' : 'var(--text-3)',
              }}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
