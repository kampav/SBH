'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, getIdToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface RecentSignup {
  uid: string
  email: string
  createdAt: string
}

interface TelemetryEntry {
  date: string
  dau?: number
  errors?: number
}

interface AdminStats {
  totalUsers: number
  newToday: number
  newLast7d: number
  newLast30d: number
  recentSignups: RecentSignup[]
  telemetry: TelemetryEntry[]
}

const ENV_VARS = [
  { label: 'Anthropic API',         key: 'ANTHROPIC_API_KEY',                  env: 'NEXT_PUBLIC_ANTHROPIC_CONFIGURED' },
  { label: 'Firebase Project',       key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',    env: 'firebase' },
  { label: 'Firebase Admin SA',      key: 'FIREBASE_SERVICE_ACCOUNT_JSON',      env: 'firebase_admin' },
  { label: 'Stripe Secret Key',      key: 'STRIPE_SECRET_KEY',                  env: 'stripe' },
  { label: 'Stripe Publishable Key', key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', env: 'stripe_pub' },
  { label: 'Dexcom Client ID',       key: 'DEXCOM_CLIENT_ID',                   env: 'dexcom' },
  { label: 'Sentry DSN',             key: 'NEXT_PUBLIC_SENTRY_DSN',             env: 'sentry' },
  { label: 'FCM VAPID Key',          key: 'NEXT_PUBLIC_FCM_VAPID_KEY',          env: 'fcm' },
]

const TIER_COLORS: Record<string, string> = {
  Free:    '#10b981',
  Pro:     '#7c3aed',
  Premium: '#f59e0b',
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 16,
        padding: '20px 24px',
        flex: 1,
        minWidth: 140,
      }}
    >
      <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 32, fontWeight: 800, color, margin: 0, lineHeight: 1 }}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}

export default function AdminOverviewPage() {
  const [stats, setStats]     = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) return
      try {
        const token = await getIdToken(user)
        const res = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json() as AdminStats
        setStats(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load stats')
      } finally {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [])

  /* ── CSS bar chart helpers ─────────────────────────────────────────── */
  const chartDays = stats?.telemetry?.slice(0, 14).reverse() ?? []
  const maxDau = Math.max(...chartDays.map(d => d.dau ?? 0), 1)

  /* Fake tier breakdown (replace with real data when subscription collection is queried) */
  const tiers = [
    { label: 'Free',    count: Math.max((stats?.totalUsers ?? 0) - 4, 0) },
    { label: 'Pro',     count: 3 },
    { label: 'Premium', count: 1 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatCard label="Total Users"   value={stats?.totalUsers  ?? 0} color="#7c3aed" />
        <StatCard label="New Today"     value={stats?.newToday    ?? 0} color="#06b6d4" />
        <StatCard label="Active 7d"     value={stats?.newLast7d   ?? 0} color="#10b981" />
        <StatCard label="Active 30d"    value={stats?.newLast30d  ?? 0} color="#f59e0b" />
      </div>

      {/* ── Loading / error ─────────────────────────────────────────────── */}
      {loading && (
        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading stats…</p>
      )}
      {error && (
        <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>
      )}

      {/* ── Two-column row ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* User growth bar chart (CSS only) */}
        <div
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>
            Daily Active Users (14 days)
          </p>
          {chartDays.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>No telemetry data yet</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
              {chartDays.map((d, i) => {
                const pct = ((d.dau ?? 0) / maxDau) * 100
                return (
                  <div
                    key={i}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}
                    title={`${d.date}: ${d.dau ?? 0} DAU`}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.max(pct, 4)}%`,
                        background: 'linear-gradient(to top, #7c3aed, #06b6d4)',
                        borderRadius: 4,
                        transition: 'height 0.4s',
                      }}
                    />
                    <span style={{ fontSize: 8, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {d.date?.slice(5)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Subscription tier breakdown */}
        <div
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>
            Subscription Tiers
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            {tiers.map(t => (
              <div
                key={t.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 20,
                  background: `${TIER_COLORS[t.label]}22`,
                  border: `1px solid ${TIER_COLORS[t.label]}44`,
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 800, color: TIER_COLORS[t.label] }}>
                  {t.count}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{t.label}</span>
              </div>
            ))}
          </div>

          {/* Recent signups */}
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>
            Recent Signups
          </p>
          {(stats?.recentSignups ?? []).length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>No signups yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(stats?.recentSignups ?? []).map(u => (
                <div
                  key={u.uid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>
                    {u.uid.slice(0, 8)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {u.email || '(no email)'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── System status ───────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 16,
          padding: 20,
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>
          System Status (env var presence)
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {ENV_VARS.map(v => {
            /* We can only check public env vars in client; others appear unconfigured unless surfaced by API */
            const configured =
              v.key.startsWith('NEXT_PUBLIC_') ? !!process.env[v.key] : null
            return (
              <div
                key={v.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 10,
                  background: configured === null
                    ? 'rgba(255,255,255,0.05)'
                    : configured
                    ? 'rgba(16,185,129,0.12)'
                    : 'rgba(239,68,68,0.12)',
                  border: `1px solid ${configured === null ? 'rgba(255,255,255,0.1)' : configured ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}
              >
                <span style={{ fontSize: 12 }}>
                  {configured === null ? '⚪' : configured ? '🟢' : '🔴'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{v.label}</span>
              </div>
            )
          })}
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10 }}>
          Server-side env vars shown as ⚪ (unknown) — only verifiable at runtime.
        </p>
      </div>
    </div>
  )
}
