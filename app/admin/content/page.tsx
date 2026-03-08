'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, getIdToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface Announcement {
  id: string
  title: string
  body: string
  expiresAt: string
  active: boolean
}

interface ContentDoc {
  body: string
  updatedAt?: string
}

type Tab = 'privacy' | 'terms' | 'announcements'

const TAB_DOC: Record<'privacy' | 'terms', string> = {
  privacy: 'privacy_policy',
  terms:   'terms_of_service',
}

export default function AdminContentPage() {
  const [tab, setTab]           = useState<Tab>('privacy')
  const [token, setToken]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  // Privacy / Terms state
  const [docBody, setDocBody]   = useState('')
  const [docUpdated, setDocUpdated] = useState('')

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [showAddForm, setShowAddForm]     = useState(false)
  const [newAnn, setNewAnn] = useState<Omit<Announcement, 'id'>>({
    title: '', body: '', expiresAt: '', active: true,
  })

  const fetchDoc = useCallback(async (tok: string, docId: string) => {
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch(`/api/admin/content?docId=${docId}`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as ContentDoc
      setDocBody(data.body ?? '')
      setDocUpdated(data.updatedAt ?? '')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAnnouncements = useCallback(async (tok: string) => {
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/content?docId=announcements', {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { items: Announcement[] }
      setAnnouncements(data.items ?? [])
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) return
      const tok = await getIdToken(user)
      setToken(tok)
      if (tab === 'announcements') {
        await fetchAnnouncements(tok)
      } else {
        await fetchDoc(tok, TAB_DOC[tab])
      }
    })
    return () => unsub()
  }, [fetchDoc, fetchAnnouncements, tab])

  // Re-fetch when tab changes
  useEffect(() => {
    if (!token) return
    setMsg('')
    if (tab === 'announcements') {
      fetchAnnouncements(token)
    } else {
      fetchDoc(token, TAB_DOC[tab])
    }
  }, [tab, token, fetchDoc, fetchAnnouncements])

  const saveDoc = async () => {
    if (!token) return
    setSaving(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ docId: TAB_DOC[tab as 'privacy' | 'terms'], body: docBody }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setMsg('Saved successfully')
      await fetchDoc(token, TAB_DOC[tab as 'privacy' | 'terms'])
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const annAction = async (action: 'add' | 'update' | 'delete', item: Partial<Announcement>) => {
    if (!token) return
    setSaving(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ docId: 'announcements', action, item }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setMsg(`Announcement ${action}d`)
      await fetchAnnouncements(token)
      if (action === 'add') {
        setShowAddForm(false)
        setNewAnn({ title: '', body: '', expiresAt: '', active: true })
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setSaving(false)
    }
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
        {(['privacy', 'terms', 'announcements'] as Tab[]).map(t => (
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
            {t === 'privacy' ? 'Privacy Policy' : t === 'terms' ? 'Terms of Service' : 'Announcements'}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 10,
          background: msg.toLowerCase().includes('fail') || msg.includes('HTTP')
            ? 'rgba(239,68,68,0.12)'
            : 'rgba(16,185,129,0.12)',
          border: `1px solid ${msg.toLowerCase().includes('fail') || msg.includes('HTTP') ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          color: msg.toLowerCase().includes('fail') || msg.includes('HTTP') ? '#ef4444' : '#10b981',
          fontSize: 13,
        }}>
          {msg}
        </div>
      )}

      {/* ── Privacy / Terms editor ─────────────────────────────────────── */}
      {(tab === 'privacy' || tab === 'terms') && (
        <div
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {docUpdated && (
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
              Last updated: {new Date(docUpdated).toLocaleString()}
            </p>
          )}
          {loading ? (
            <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading…</p>
          ) : (
            <textarea
              value={docBody}
              onChange={e => setDocBody(e.target.value)}
              rows={20}
              style={{
                ...inputStyle,
                minHeight: 400,
                resize: 'vertical',
                fontFamily: 'monospace',
                fontSize: 12,
                lineHeight: 1.6,
              }}
              placeholder="Enter markdown content…"
            />
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={saveDoc}
              disabled={saving || loading}
              style={{
                padding: '10px 24px',
                borderRadius: 10,
                background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                opacity: saving || loading ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* ── Announcements tab ─────────────────────────────────────────── */}
      {tab === 'announcements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              {showAddForm ? '✕ Cancel' : '+ Add Announcement'}
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
                gap: 12,
              }}
            >
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>New Announcement</p>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Title</label>
                <input
                  style={inputStyle}
                  value={newAnn.title}
                  onChange={e => setNewAnn(p => ({ ...p, title: e.target.value }))}
                  placeholder="Announcement title"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Body</label>
                <textarea
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  value={newAnn.body}
                  onChange={e => setNewAnn(p => ({ ...p, body: e.target.value }))}
                  placeholder="Announcement body text"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Expires At</label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={newAnn.expiresAt}
                    onChange={e => setNewAnn(p => ({ ...p, expiresAt: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 13, color: 'var(--text-2)' }}>Active</label>
                  <button
                    onClick={() => setNewAnn(p => ({ ...p, active: !p.active }))}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      background: newAnn.active ? '#7c3aed' : 'rgba(255,255,255,0.12)',
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
                        left: newAnn.active ? 23 : 3,
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
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => annAction('add', { ...newAnn, id: Date.now().toString() })}
                  disabled={saving || !newAnn.title}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    opacity: saving || !newAnn.title ? 0.6 : 1,
                  }}
                >
                  {saving ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>
          )}

          {/* Announcements list */}
          <div
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--glass-border)',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {loading && <p style={{ padding: '20px 16px', color: 'var(--text-3)', fontSize: 13 }}>Loading…</p>}
            {!loading && announcements.length === 0 && (
              <p style={{ padding: '20px 16px', color: 'var(--text-3)', fontSize: 13 }}>No announcements yet.</p>
            )}
            {announcements.map((ann, i) => (
              <div
                key={ann.id}
                style={{
                  padding: '14px 16px',
                  borderBottom: i < announcements.length - 1 ? '1px solid var(--glass-border)' : 'none',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                }}
              >
                {/* Active toggle */}
                <button
                  onClick={() => annAction('update', { ...ann, active: !ann.active })}
                  disabled={saving}
                  style={{
                    flexShrink: 0,
                    marginTop: 2,
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: ann.active ? '#7c3aed' : 'rgba(255,255,255,0.12)',
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
                      left: ann.active ? 23 : 3,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s',
                    }}
                  />
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: '0 0 4px' }}>{ann.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ann.body}
                  </p>
                  {ann.expiresAt && (
                    <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
                      Expires: {ann.expiresAt}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => annAction('delete', { id: ann.id })}
                  disabled={saving}
                  style={{
                    flexShrink: 0,
                    padding: '4px 10px',
                    borderRadius: 7,
                    background: 'rgba(239,68,68,0.10)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
