'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, getIdToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface FeatureFlag {
  id: string
  name: string
  enabled: boolean
  rolloutPct: number
  allowUids: string[]
  blockUids: string[]
  tiers: string[]
  allowCountries: string[]
  blockCountries: string[]
  updatedAt?: string
}

const APP_PAGES = [
  { label: 'Home / Dashboard', route: 'dashboard' },
  { label: 'Nutrition',        route: 'nutrition' },
  { label: 'Workout',          route: 'workout' },
  { label: 'Sleep',            route: 'sleep' },
  { label: 'Glucose',          route: 'glucose' },
  { label: 'Mood',             route: 'mood' },
  { label: 'Metrics',          route: 'metrics' },
  { label: 'Coach',            route: 'coach' },
  { label: 'PCOS',             route: 'pcos' },
  { label: 'Thyroid',          route: 'thyroid' },
  { label: 'Habits',           route: 'habits' },
  { label: 'Insights',         route: 'insights' },
  { label: 'Health Feed',      route: 'health-feed' },
  { label: 'Challenges',       route: 'challenges' },
  { label: 'Exercises',        route: 'exercises' },
  { label: 'Blood Pressure',   route: 'blood-pressure' },
  { label: 'Pricing',          route: 'pricing' },
  { label: 'Coaching',         route: 'coaching' },
  { label: 'Help',             route: 'help' },
]

const EMPTY_FLAG: FeatureFlag = {
  id: '',
  name: '',
  enabled: true,
  rolloutPct: 100,
  allowUids: [],
  blockUids: [],
  tiers: ['free', 'pro', 'premium'],
  allowCountries: [],
  blockCountries: [],
}

export default function AdminFeaturesPage() {
  const [tab, setTab]       = useState<'flags' | 'pages'>('flags')
  const [flags, setFlags]   = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const [token, setToken]   = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newFlag, setNewFlag] = useState<FeatureFlag>({ ...EMPTY_FLAG })
  const [saving, setSaving]  = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const fetchFlags = useCallback(async (tok: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/features', {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { flags: FeatureFlag[] }
      setFlags(data.flags)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load flags')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) return
      const tok = await getIdToken(user)
      setToken(tok)
      await fetchFlags(tok)
    })
    return () => unsub()
  }, [fetchFlags])

  const saveFlag = async (flag: FeatureFlag, action: 'upsert' | 'delete') => {
    if (!token) return
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/admin/features', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, flag }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSaveMsg(action === 'delete' ? 'Flag deleted' : 'Flag saved')
      await fetchFlags(token)
      if (action === 'upsert' && flag.id === newFlag.id) {
        setShowNew(false)
        setNewFlag({ ...EMPTY_FLAG })
      }
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleFlag = (flag: FeatureFlag) => {
    saveFlag({ ...flag, enabled: !flag.enabled }, 'upsert')
  }

  const pageFlag = (route: string): FeatureFlag | undefined =>
    flags.find(f => f.id === `page__${route}`)

  const togglePage = (route: string) => {
    const existing = pageFlag(route)
    const updated: FeatureFlag = existing
      ? { ...existing, enabled: !existing.enabled }
      : {
          id: `page__${route}`,
          name: `Page: /${route}`,
          enabled: false,
          rolloutPct: 100,
          allowUids: [],
          blockUids: [],
          tiers: ['free', 'pro', 'premium'],
          allowCountries: [],
          blockCountries: [],
        }
    saveFlag(updated, 'upsert')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-1)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['flags', 'pages'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 20px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: tab === t ? 700 : 500,
              background: tab === t ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${tab === t ? 'rgba(124,58,237,0.4)' : 'var(--glass-border)'}`,
              color: tab === t ? '#7c3aed' : 'var(--text-2)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textTransform: 'capitalize',
            }}
          >
            {t === 'flags' ? 'Feature Flags' : 'Page Controls'}
          </button>
        ))}
      </div>

      {saveMsg && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 10,
          background: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.3)',
          color: '#10b981',
          fontSize: 13,
        }}>
          {saveMsg}
        </div>
      )}

      {error && <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>}

      {/* ── Flags tab ─────────────────────────────────────────────────── */}
      {tab === 'flags' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowNew(v => !v)}
              style={{
                padding: '9px 18px',
                borderRadius: 10,
                background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {showNew ? '✕ Cancel' : '+ New Flag'}
            </button>
          </div>

          {/* New flag form */}
          {showNew && (
            <div
              style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: 16,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>New Feature Flag</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>ID (slug)</label>
                  <input
                    style={inputStyle}
                    value={newFlag.id}
                    onChange={e => setNewFlag(p => ({ ...p, id: e.target.value }))}
                    placeholder="my_feature"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Name</label>
                  <input
                    style={inputStyle}
                    value={newFlag.name}
                    onChange={e => setNewFlag(p => ({ ...p, name: e.target.value }))}
                    placeholder="My Feature"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
                    Rollout % ({newFlag.rolloutPct})
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={newFlag.rolloutPct}
                    onChange={e => setNewFlag(p => ({ ...p, rolloutPct: Number(e.target.value) }))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 13, color: 'var(--text-2)' }}>Enabled</label>
                  <button
                    onClick={() => setNewFlag(p => ({ ...p, enabled: !p.enabled }))}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      background: newFlag.enabled ? '#7c3aed' : 'rgba(255,255,255,0.12)',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 3,
                        left: newFlag.enabled ? 23 : 3,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: '#fff',
                        transition: 'left 0.2s',
                      }}
                    />
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Allow UIDs (one per line)</label>
                  <textarea
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    value={newFlag.allowUids.join('\n')}
                    onChange={e => setNewFlag(p => ({ ...p, allowUids: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) }))}
                    placeholder="uid1&#10;uid2"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Block UIDs (one per line)</label>
                  <textarea
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    value={newFlag.blockUids.join('\n')}
                    onChange={e => setNewFlag(p => ({ ...p, blockUids: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) }))}
                    placeholder="uid1&#10;uid2"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Allow Countries (ISO, comma-sep)</label>
                  <input
                    style={inputStyle}
                    value={newFlag.allowCountries.join(',')}
                    onChange={e => setNewFlag(p => ({ ...p, allowCountries: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                    placeholder="GB,US,IN"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Block Countries (ISO, comma-sep)</label>
                  <input
                    style={inputStyle}
                    value={newFlag.blockCountries.join(',')}
                    onChange={e => setNewFlag(p => ({ ...p, blockCountries: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                    placeholder="CN,RU"
                  />
                </div>
              </div>

              {/* Tier checkboxes */}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>Tiers</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {['free', 'pro', 'premium'].map(tier => (
                    <label key={tier} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text-2)' }}>
                      <input
                        type="checkbox"
                        checked={newFlag.tiers.includes(tier)}
                        onChange={e => setNewFlag(p => ({
                          ...p,
                          tiers: e.target.checked
                            ? [...p.tiers, tier]
                            : p.tiers.filter(t => t !== tier),
                        }))}
                      />
                      {tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={() => saveFlag(newFlag, 'upsert')}
                disabled={saving || !newFlag.id}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  opacity: saving || !newFlag.id ? 0.6 : 1,
                  alignSelf: 'flex-end',
                }}
              >
                {saving ? 'Saving…' : 'Save Flag'}
              </button>
            </div>
          )}

          {/* Flags list */}
          <div
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--glass-border)',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {loading && (
              <p style={{ padding: '20px 16px', color: 'var(--text-3)', fontSize: 13 }}>Loading…</p>
            )}
            {!loading && flags.length === 0 && (
              <p style={{ padding: '20px 16px', color: 'var(--text-3)', fontSize: 13 }}>No flags yet.</p>
            )}
            {flags.map((flag, i) => (
              <div
                key={flag.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  borderBottom: i < flags.length - 1 ? '1px solid var(--glass-border)' : 'none',
                }}
              >
                {/* Toggle */}
                <button
                  onClick={() => toggleFlag(flag)}
                  disabled={saving}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: flag.enabled ? '#7c3aed' : 'rgba(255,255,255,0.12)',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'background 0.2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: flag.enabled ? 23 : 3,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s',
                    }}
                  />
                </button>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>{flag.name || flag.id}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, fontFamily: 'monospace' }}>{flag.id}</p>
                </div>

                {/* Rollout pill */}
                <span
                  style={{
                    fontSize: 12,
                    padding: '3px 10px',
                    borderRadius: 8,
                    background: 'rgba(6,182,212,0.12)',
                    border: '1px solid rgba(6,182,212,0.25)',
                    color: '#06b6d4',
                    flexShrink: 0,
                  }}
                >
                  {flag.rolloutPct}%
                </span>

                {/* Tiers */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {flag.tiers?.map(t => (
                    <span
                      key={t}
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 5,
                        background: 'rgba(124,58,237,0.12)',
                        color: '#7c3aed',
                        border: '1px solid rgba(124,58,237,0.25)',
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Delete */}
                <button
                  onClick={() => saveFlag(flag, 'delete')}
                  disabled={saving}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 7,
                    background: 'rgba(239,68,68,0.10)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Page Controls tab ─────────────────────────────────────────── */}
      {tab === 'pages' && (
        <div
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--glass-border)',
              fontSize: 12,
              color: 'var(--text-3)',
            }}
          >
            Disabling a page creates a flag <code style={{ fontFamily: 'monospace' }}>page__route</code>. Your app must check this flag on each page load.
          </div>
          {APP_PAGES.map((page, i) => {
            const flag = pageFlag(page.route)
            const enabled = flag ? flag.enabled : true
            return (
              <div
                key={page.route}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '13px 16px',
                  borderBottom: i < APP_PAGES.length - 1 ? '1px solid var(--glass-border)' : 'none',
                }}
              >
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>{page.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, fontFamily: 'monospace' }}>/{page.route}</p>
                </div>
                <button
                  onClick={() => togglePage(page.route)}
                  disabled={saving}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: enabled ? '#7c3aed' : 'rgba(255,255,255,0.12)',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: enabled ? 23 : 3,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s',
                    }}
                  />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
