'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, getIdToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface DailyEntry {
  date: string
  dau?: number
  errors?: number
  featureUsage?: Record<string, number>
  topCountries?: Array<{ code: string; count: number }>
}

const FEATURE_COLORS: Record<string, string> = {
  nutrition:     '#10b981',
  workout:       '#7c3aed',
  glucose:       '#ef4444',
  coach:         '#06b6d4',
  insights:      '#f59e0b',
  habits:        '#8b5cf6',
  health_feed:   '#06b6d4',
  challenges:    '#ec4899',
}

const COUNTRY_FLAGS: Record<string, string> = {
  GB: '🇬🇧', US: '🇺🇸', IN: '🇮🇳', DE: '🇩🇪', FR: '🇫🇷',
  AE: '🇦🇪', CA: '🇨🇦', AU: '🇦🇺', PK: '🇵🇰', NG: '🇳🇬',
}

export default function AdminAnalyticsPage() {
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) return
      try {
        const token = await getIdToken(user)
        const res = await fetch('/api/admin/stats?type=analytics', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json() as { telemetry: DailyEntry[] }
        setEntries((data.telemetry ?? []).slice().reverse())
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [])

  /* ── Derived data ─────────────────────────────────────────────────── */
  const last14 = entries.slice(-14)
  const maxDau  = Math.max(...last14.map(d => d.dau ?? 0), 1)

  // Aggregate feature usage across all days
  const featureAgg: Record<string, number> = {}
  entries.forEach(e => {
    Object.entries(e.featureUsage ?? {}).forEach(([k, v]) => {
      featureAgg[k] = (featureAgg[k] ?? 0) + v
    })
  })
  const maxFeature = Math.max(...Object.values(featureAgg), 1)

  // Top countries across all days
  const countryAgg: Record<string, number> = {}
  entries.forEach(e => {
    (e.topCountries ?? []).forEach(({ code, count }) => {
      countryAgg[code] = (countryAgg[code] ?? 0) + count
    })
  })
  const topCountries = Object.entries(countryAgg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Last 7 days error counts
  const last7errors = entries.slice(-7)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {loading && <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading analytics…</p>}
      {error   && <p style={{ color: '#ef4444',        fontSize: 14 }}>{error}</p>}

      {/* ── DAU bar chart (14 days) ─────────────────────────────────── */}
      <div
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 16,
          padding: 20,
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
          Daily Active Users — last 14 days
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
          From <code style={{ fontFamily: 'monospace' }}>admin_telemetry/daily</code> collection
        </p>

        {last14.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No telemetry data available yet.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160 }}>
            {last14.map((d, i) => {
              const pct = ((d.dau ?? 0) / maxDau) * 100
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                  title={`${d.date}: ${d.dau ?? 0} DAU`}
                >
                  <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{d.dau ?? 0}</span>
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(pct, 3)}%`,
                      background: 'linear-gradient(to top, #7c3aed, #06b6d4)',
                      borderRadius: '4px 4px 0 0',
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

      {/* ── Feature usage + top countries (2 col) ──────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Feature usage */}
        <div
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>
            Feature Usage (all time)
          </p>
          {Object.keys(featureAgg).length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No usage data yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(featureAgg)
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => {
                  const color = FEATURE_COLORS[key] ?? '#7c3aed'
                  const pct   = (count / maxFeature) * 100
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{key}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color }}>
                          {count.toLocaleString()}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 3,
                          background: 'rgba(255,255,255,0.08)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: color,
                            borderRadius: 3,
                            transition: 'width 0.5s',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Top countries */}
        <div
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>
            Top Countries
          </p>
          {topCountries.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No country data yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topCountries.map(([code, count], i) => (
                <div
                  key={code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <span style={{ fontSize: 12, color: 'var(--text-3)', width: 16 }}>{i + 1}</span>
                  <span style={{ fontSize: 18 }}>{COUNTRY_FLAGS[code] ?? '🌐'}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-1)', flex: 1, fontWeight: 600 }}>
                    {code}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#06b6d4',
                      padding: '2px 8px',
                      borderRadius: 8,
                      background: 'rgba(6,182,212,0.12)',
                    }}
                  >
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Error rate last 7 days ───────────────────────────────────── */}
      <div
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 16,
          padding: 20,
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>
          Error Rate — last 7 days
        </p>
        {last7errors.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No data yet.</p>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {last7errors.map((d, i) => {
              const err = d.errors ?? 0
              const color = err === 0 ? '#10b981' : err < 10 ? '#f59e0b' : '#ef4444'
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    padding: '10px 16px',
                    borderRadius: 10,
                    background: `${color}14`,
                    border: `1px solid ${color}33`,
                    minWidth: 80,
                  }}
                >
                  <span style={{ fontSize: 20, fontWeight: 800, color }}>{err}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{d.date?.slice(5) ?? '—'}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
