'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Utensils, Dumbbell, TrendingUp, User, Sun, Moon, Activity } from 'lucide-react'
import { useEffect, useState } from 'react'

const NAV = [
  { href: '/dashboard', label: 'Home',      Icon: Home },
  { href: '/nutrition', label: 'Nutrition', Icon: Utensils },
  { href: '/workout',   label: 'Workout',   Icon: Dumbbell },
  { href: '/glucose',   label: 'Glucose',   Icon: Activity },
  { href: '/metrics',   label: 'Progress',  Icon: TrendingUp },
  { href: '/profile',   label: 'Profile',   Icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [dark, setDark] = useState(true)

  useEffect(() => {
    setDark(localStorage.getItem('sbh_theme') !== 'light')
  }, [])

  function toggleTheme() {
    const next = dark ? 'light' : 'dark'
    localStorage.setItem('sbh_theme', next)
    document.documentElement.setAttribute('data-theme', next)
    setDark(!dark)
  }

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
              <Icon size={18} strokeWidth={active ? 2.5 : 1.75} className="relative" />
            </div>
            <span className="font-medium text-[9px] leading-none mt-0.5"
              style={{ fontWeight: active ? 700 : 500 }}>
              {label}
            </span>
          </Link>
        )
      })}

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90"
        style={{ color: dark ? '#f59e0b' : '#7c3aed' }}
        aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {dark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
        <span className="font-medium text-[9px] leading-none mt-0.5" style={{ color: 'var(--text-3)' }}>
          {dark ? 'Light' : 'Dark'}
        </span>
      </button>
    </nav>
  )
}
