'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getProfile } from '@/lib/firebase/firestore'
import {
  Home, Utensils, Dumbbell, TrendingUp,
  Grid3X3, X,
  Activity, Moon, Brain, Heart, Flame,
  Bot, BarChart2, CheckSquare, Users, BookOpen,
  Newspaper, HelpCircle, Star, Scale,
  User, Settings, ChevronRight,
  type LucideIcon,
} from 'lucide-react'

// ── Primary tabs ──────────────────────────────────────────────────────────────
const PRIMARY = [
  { href: '/dashboard', label: 'Home',      Icon: Home },
  { href: '/nutrition', label: 'Nutrition', Icon: Utensils },
  { href: '/workout',   label: 'Workout',   Icon: Dumbbell },
  { href: '/metrics',   label: 'Progress',  Icon: TrendingUp },
]

// ── More sheet sections ───────────────────────────────────────────────────────
const MORE_SECTIONS = [
  {
    title: 'Health Tracking',
    color: '#ef4444',
    items: [
      { href: '/glucose',  label: 'Glucose',  Icon: Activity },
      { href: '/sleep',    label: 'Sleep',     Icon: Moon },
      { href: '/body',     label: 'Body',      Icon: Scale },
      { href: '/mood',     label: 'Mood',      Icon: Brain },
    ],
  },
  {
    title: 'Specialist Tools',
    color: '#8b5cf6',
    items: [
      { href: '/pcos',    label: 'PCOS',      Icon: Heart },
      { href: '/thyroid', label: 'Thyroid',   Icon: Flame },
      { href: '/habits',  label: 'Habits',    Icon: CheckSquare },
      { href: '/exercises', label: 'Exercises', Icon: BookOpen },
    ],
  },
  {
    title: 'AI & Insights',
    color: '#06b6d4',
    items: [
      { href: '/coach',    label: 'AI Coach',  Icon: Bot },
      { href: '/insights', label: 'Insights',  Icon: BarChart2 },
      { href: '/health-feed', label: 'Feed',   Icon: Newspaper },
      { href: '/challenges', label: 'Community', Icon: Users },
    ],
  },
  {
    title: 'Account',
    color: '#f59e0b',
    items: [
      { href: '/profile',       label: 'Profile',  Icon: User },
      { href: '/pricing',       label: 'Plans',    Icon: Star },
      { href: '/help',          label: 'Help',     Icon: HelpCircle },
      { href: '/settings/integrations', label: 'Settings', Icon: Settings },
    ],
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [initials, setInitials] = useState('?')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) return
      const p = await getProfile(user.uid).catch(() => null)
      const name = p?.displayName ?? user.displayName ?? user.email ?? 'User'
      setDisplayName(name)
      setInitials(
        name.split(' ').slice(0, 2).map((s: string) => s[0]).join('').toUpperCase()
      )
    })
    return () => unsub()
  }, [])

  // Close drawer on navigation
  useEffect(() => { setOpen(false) }, [pathname])

  const hide = ['/', '/login', '/register', '/onboarding'].some(
    p => pathname === p || pathname.startsWith('/onboarding')
  )
  if (hide) return null

  // Is the current path in a "more" section?
  const moreActive = !PRIMARY.some(
    ({ href }) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  )

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── More Drawer ──────────────────────────────────────────────────────── */}
      <div
        className="fixed left-0 right-0 z-50 transition-all duration-300 ease-out"
        style={{
          bottom: open
            ? 'calc(4.5rem + env(safe-area-inset-bottom))'
            : 'calc(4.5rem + env(safe-area-inset-bottom))',
          transform: open ? 'translateY(0)' : 'translateY(110%)',
          maxHeight: '72vh',
          overflowY: 'auto',
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          borderTop: '1px solid var(--glass-border)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Profile header strip */}
        <Link
          href="/profile"
          className="flex items-center gap-3 px-5 py-4 active:opacity-70 transition-opacity"
          style={{ borderBottom: '1px solid var(--glass-border)' }}
        >
          {/* Avatar */}
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-full font-bold text-white text-sm"
            style={{
              width: 42, height: 42,
              background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
            }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>
              {displayName ?? 'Your Profile'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              View profile & settings
            </p>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--text-3)' }} />
        </Link>

        {/* Feature grid sections */}
        <div className="px-4 py-3 space-y-4 pb-6">
          {MORE_SECTIONS.map(({ title, color, items }) => (
            <div key={title}>
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1"
                style={{ color }}
              >
                {title}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {items.map(({ href, label, Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(href + '/')
                  return (
                    <Link
                      key={href}
                      href={href}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-200 active:scale-95"
                      style={{
                        background: isActive
                          ? `${color}22`
                          : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isActive ? color + '44' : 'transparent'}`,
                      }}
                    >
                      <Icon
                        size={20}
                        strokeWidth={isActive ? 2.5 : 1.75}
                        style={{ color: isActive ? color : 'var(--text-2)' }}
                      />
                      <span
                        className="text-[10px] font-medium text-center leading-tight"
                        style={{ color: isActive ? color : 'var(--text-3)' }}
                      >
                        {label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Tab Bar ───────────────────────────────────────────────────── */}
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
        {/* First 2 primary tabs */}
        {PRIMARY.slice(0, 2).map(({ href, label, Icon }) => (
          <NavTab key={href} href={href} label={label} Icon={Icon} pathname={pathname} />
        ))}

        {/* Center "More" button */}
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-1 flex flex-col items-center justify-center gap-[3px] transition-all duration-200 active:scale-90 relative"
          aria-label="More features"
        >
          <div className="relative flex items-center justify-center">
            <span
              className="absolute rounded-2xl transition-all duration-300"
              style={{
                inset: '-6px -10px',
                background: open || moreActive
                  ? 'rgba(124,58,237,0.18)'
                  : 'rgba(255,255,255,0.06)',
                border: `1px solid ${open || moreActive ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}
            />
            <div
              className="relative transition-all duration-300"
              style={{
                transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
                color: open || moreActive ? '#7c3aed' : 'var(--text-2)',
              }}
            >
              {open ? <X size={20} strokeWidth={2.5} /> : <Grid3X3 size={19} strokeWidth={1.75} />}
            </div>
          </div>
          <span
            className="leading-none transition-all duration-200"
            style={{
              fontSize: '9px',
              fontWeight: open || moreActive ? 700 : 500,
              letterSpacing: '0.02em',
              color: open || moreActive ? '#7c3aed' : 'var(--text-3)',
            }}
          >
            More
          </span>
        </button>

        {/* Last 2 primary tabs */}
        {PRIMARY.slice(2).map(({ href, label, Icon }) => (
          <NavTab key={href} href={href} label={label} Icon={Icon} pathname={pathname} />
        ))}
      </nav>
    </>
  )
}

function NavTab({
  href, label, Icon, pathname,
}: {
  href: string
  label: string
  Icon: LucideIcon
  pathname: string
}) {
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  return (
    <Link
      href={href}
      className="flex-1 flex flex-col items-center justify-center gap-[3px] transition-all duration-200 active:scale-90"
      style={{ color: active ? 'var(--violet)' : 'var(--text-3)' }}
    >
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
}
