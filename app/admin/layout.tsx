'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, getIdToken } from 'firebase/auth'
import { useRouter, usePathname } from 'next/navigation'
import { auth } from '@/lib/firebase'
import Link from 'next/link'

const NAV = [
  { href: '/admin',           label: 'Overview',      icon: '📊' },
  { href: '/admin/users',     label: 'Users',         icon: '👥' },
  { href: '/admin/features',  label: 'Feature Flags', icon: '🚩' },
  { href: '/admin/content',   label: 'Content',       icon: '📝' },
  { href: '/admin/analytics', label: 'Analytics',     icon: '📈' },
  { href: '/admin/geo',       label: 'Geographic',    icon: '🌍' },
]

const PAGE_LABELS: Record<string, string> = {
  '/admin':           'Overview',
  '/admin/users':     'Users',
  '/admin/features':  'Feature Flags',
  '/admin/content':   'Content',
  '/admin/analytics': 'Analytics',
  '/admin/geo':       'Geographic',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  const [checking, setChecking]   = useState(true)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminUid, setAdminUid]   = useState('')
  const [isMobile, setIsMobile]   = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        router.push('/dashboard')
        return
      }
      try {
        const token = await getIdToken(user)
        const res = await fetch('/api/admin/auth-check', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setAuthError(`HTTP ${res.status}: ${body.error ?? 'Access denied'} (UID: ${user.uid})`)
          setChecking(false)
          return
        }
        setAdminEmail(user.email ?? '')
        setAdminUid(user.uid)
      } catch (err) {
        setAuthError(`Network error: ${err instanceof Error ? err.message : String(err)}`)
        setChecking(false)
      }
    })
    return () => unsub()
  }, [router])

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--mesh-bg, #0f0f1a)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #7c3aed', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Checking admin access…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (authError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--mesh-bg, #0f0f1a)', padding: 24 }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <p style={{ color: '#f43f5e', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Admin Access Denied</p>
          <p style={{ color: 'var(--text-3)', fontSize: 13, fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 10, wordBreak: 'break-all' }}>{authError}</p>
          <a href="/dashboard" style={{ display: 'inline-block', marginTop: 20, color: '#7c3aed', fontSize: 14 }}>← Back to dashboard</a>
        </div>
      </div>
    )
  }

  const pageLabel = PAGE_LABELS[pathname] ?? 'Admin'

  /* ── Mobile: horizontal scrolling top tab bar ─────────────────────────── */
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--mesh-bg, #0f0f1a)' }}>
        {/* Top tab bar */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--glass-border)',
            overflowX: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 12px',
            scrollbarWidth: 'none',
          }}
        >
          {/* Logo */}
          <span
            style={{
              fontWeight: 800,
              fontSize: 15,
              background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              whiteSpace: 'nowrap',
              marginRight: 8,
            }}
          >
            ⚡ SBH
          </span>
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  background: active ? 'rgba(124,58,237,0.18)' : 'transparent',
                  color: active ? '#7c3aed' : 'var(--text-3)',
                  border: active ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </Link>
            )
          })}
        </div>

        {/* Page header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            {pageLabel}
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>{adminEmail}</p>
        </div>

        <main style={{ padding: 16 }}>{children}</main>
      </div>
    )
  }

  /* ── Desktop: fixed left sidebar ─────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--mesh-bg, #0f0f1a)', display: 'flex' }}>
      {/* Sidebar */}
      <aside
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: 220,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--glass-border)',
          zIndex: 40,
        }}
      >
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px' }}>
          <span
            style={{
              fontWeight: 900,
              fontSize: 20,
              background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'block',
            }}
          >
            ⚡ SBH Admin
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  background: active ? 'rgba(124,58,237,0.18)' : 'transparent',
                  color: active ? '#7c3aed' : 'var(--text-2)',
                  border: active ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom: admin info */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--glass-border)',
          }}
        >
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2, wordBreak: 'break-all' }}>
            {adminEmail}
          </p>
          <p style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace' }}>
            {adminUid.slice(0, 12)}…
          </p>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ marginLeft: 220, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Header bar */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--glass-border)',
            padding: '14px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            {pageLabel}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>{adminEmail}</p>
        </header>

        <main style={{ flex: 1, padding: 28 }}>{children}</main>
      </div>
    </div>
  )
}
