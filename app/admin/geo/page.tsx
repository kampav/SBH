'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, getIdToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface GeoRule {
  id: string
  countryCode: string
  blockedFeatures: string[]
  allowedFeatures: string[]
}

const AVAILABLE_FEATURES = [
  'ai_coach',
  'glucose_tracking',
  'pcos_module',
  'thyroid_module',
  'dexcom_integration',
  'stripe_payments',
]

const FEATURE_LABELS: Record<string, string> = {
  ai_coach:            'AI Coach',
  glucose_tracking:    'Glucose Tracking',
  pcos_module:         'PCOS Module',
  thyroid_module:      'Thyroid Module',
  dexcom_integration:  'Dexcom Integration',
  stripe_payments:     'Stripe Payments',
}

export default function AdminGeoPage() {
  const [rules, setRules]         = useState<GeoRule[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [msg, setMsg]             = useState('')
  const [token, setToken]         = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCountry, setNewCountry]   = useState('')
  const [newBlocked, setNewBlocked]   = useState<string[]>([])

  const fetchRules = useCallback(async (tok: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/geo', {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { rules: GeoRule[] }
      setRules(data.rules)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load geo rules')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) return
      const tok = await getIdToken(user)
      setToken(tok)
      await fetchRules(tok)
    })
    return () => unsub()
  }, [fetchRules])

  const saveRule = async (action: 'upsert' | 'delete', rule: Partial<GeoRule>) => {
    if (!token) return
    setSaving(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/geo', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, rule }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setMsg(action === 'delete' ? 'Rule deleted' : 'Rule saved')
      await fetchRules(token)
      if (action === 'upsert') {
        setShowAddForm(false)
        setNewCountry('')
        setNewBlocked([])
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleFeatureCheckbox = (feat: string) => {
    setNewBlocked(prev =>
      prev.includes(feat) ? prev.filter(f => f !== feat) : [...prev, feat]
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {msg && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 10,
          background: msg.includes('fail') || msg.includes('HTTP')
            ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
          border: `1px solid ${msg.includes('fail') || msg.includes('HTTP') ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          color: msg.includes('fail') || msg.includes('HTTP') ? '#ef4444' : '#10b981',
          fontSize: 13,
        }}>
          {msg}
        </div>
      )}

      {error && <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>}

      {/* Add rule button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowAddForm(v => !v)}
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
          {showAddForm ? '✕ Cancel' : '+ Add Country Rule'}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            New Country Rule
          </p>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
              Country Code (ISO 3166-1 alpha-2)
            </label>
            <input
              value={newCountry}
              onChange={e => setNewCountry(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="e.g. CN"
              maxLength={2}
              style={{
                width: 120,
                padding: '8px 12px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-1)',
                fontSize: 15,
                fontWeight: 700,
                fontFamily: 'monospace',
                outline: 'none',
                textTransform: 'uppercase',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 10 }}>
              Features to Block
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {AVAILABLE_FEATURES.map(feat => (
                <label
                  key={feat}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={newBlocked.includes(feat)}
                    onChange={() => toggleFeatureCheckbox(feat)}
                    style={{ width: 16, height: 16, accentColor: '#7c3aed' }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    {FEATURE_LABELS[feat] ?? feat}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                    ({feat})
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() =>
                saveRule('upsert', {
                  id: newCountry,
                  countryCode: newCountry,
                  blockedFeatures: newBlocked,
                  allowedFeatures: AVAILABLE_FEATURES.filter(f => !newBlocked.includes(f)),
                })
              }
              disabled={saving || newCountry.length !== 2}
              style={{
                padding: '10px 24px',
                borderRadius: 10,
                background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                opacity: saving || newCountry.length !== 2 ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save Rule'}
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      <div
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'grid',
            gridTemplateColumns: '80px 1fr 1fr 80px',
            gap: 12,
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          <span>Country</span>
          <span>Blocked Features</span>
          <span>Allowed Features</span>
          <span>Actions</span>
        </div>

        {loading && (
          <p style={{ padding: '20px 16px', color: 'var(--text-3)', fontSize: 13 }}>Loading…</p>
        )}
        {!loading && rules.length === 0 && (
          <p style={{ padding: '20px 16px', color: 'var(--text-3)', fontSize: 13 }}>
            No geographic rules configured.
          </p>
        )}

        {rules.map((rule, i) => (
          <div
            key={rule.id}
            style={{
              padding: '14px 16px',
              borderBottom: i < rules.length - 1 ? '1px solid var(--glass-border)' : 'none',
              display: 'grid',
              gridTemplateColumns: '80px 1fr 1fr 80px',
              gap: 12,
              alignItems: 'center',
            }}
          >
            {/* Country */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  color: '#7c3aed',
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(124,58,237,0.12)',
                  border: '1px solid rgba(124,58,237,0.25)',
                }}
              >
                {rule.countryCode}
              </span>
            </div>

            {/* Blocked */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(rule.blockedFeatures ?? []).length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>None</span>
              ) : (
                (rule.blockedFeatures ?? []).map(f => (
                  <span
                    key={f}
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: '#ef4444',
                    }}
                  >
                    {FEATURE_LABELS[f] ?? f}
                  </span>
                ))
              )}
            </div>

            {/* Allowed */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(rule.allowedFeatures ?? []).length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>None</span>
              ) : (
                (rule.allowedFeatures ?? []).map(f => (
                  <span
                    key={f}
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: 'rgba(16,185,129,0.12)',
                      border: '1px solid rgba(16,185,129,0.25)',
                      color: '#10b981',
                    }}
                  >
                    {FEATURE_LABELS[f] ?? f}
                  </span>
                ))
              )}
            </div>

            {/* Delete */}
            <button
              onClick={() => saveRule('delete', { id: rule.id })}
              disabled={saving}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(239,68,68,0.10)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Available features reference card */}
      <div
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 16,
          padding: 20,
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>
          Available Feature Identifiers
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {AVAILABLE_FEATURES.map(f => (
            <div
              key={f}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 600 }}>
                {FEATURE_LABELS[f]}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                {f}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
