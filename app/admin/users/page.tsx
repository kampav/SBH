'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, getIdToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface AdminUser {
  uid: string
  email: string
  displayName: string
  disabled: boolean
  createdAt: string
  lastSignIn: string
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function AdminUsersPage() {
  const [users, setUsers]         = useState<AdminUser[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  const [token, setToken]         = useState('')
  const [actionUid, setActionUid] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [selected, setSelected]   = useState<AdminUser | null>(null)

  const debouncedSearch = useDebounce(search, 400)

  const fetchUsers = useCallback(async (tok: string, q: string) => {
    setLoading(true)
    setError('')
    try {
      const url = `/api/admin/users?search=${encodeURIComponent(q)}&limit=20`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { users: AdminUser[] }
      setUsers(data.users)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) return
      const tok = await getIdToken(user)
      setToken(tok)
      await fetchUsers(tok, '')
    })
    return () => unsub()
  }, [fetchUsers])

  useEffect(() => {
    if (token) {
      fetchUsers(token, debouncedSearch)
    }
  }, [debouncedSearch, token, fetchUsers])

  const doAction = async (action: string, uid: string) => {
    if (!token) return
    setActionUid(uid)
    setActionMsg('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, uid }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setActionMsg(`${action} applied to ${uid.slice(0, 8)}`)
      await fetchUsers(token, debouncedSearch)
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setActionUid('')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email, name or UID…"
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 12,
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-1)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        {loading && (
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '2px solid #7c3aed',
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        )}
      </div>

      {actionMsg && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.3)',
            color: '#10b981',
            fontSize: 13,
          }}
        >
          {actionMsg}
        </div>
      )}

      {error && (
        <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>
      )}

      {/* User list */}
      <div
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 100px 80px 80px 160px',
            gap: 12,
            padding: '12px 16px',
            borderBottom: '1px solid var(--glass-border)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          <span>Email</span>
          <span>Name</span>
          <span>UID</span>
          <span>Status</span>
          <span>Joined</span>
          <span>Actions</span>
        </div>

        {/* Rows */}
        {users.length === 0 && !loading && (
          <p style={{ padding: '24px 16px', color: 'var(--text-3)', fontSize: 13 }}>
            No users found.
          </p>
        )}

        {users.map(u => (
          <div
            key={u.uid}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 100px 80px 80px 160px',
              gap: 12,
              padding: '12px 16px',
              borderBottom: '1px solid var(--glass-border)',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onClick={() => setSelected(u)}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
          >
            <span style={{ fontSize: 13, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {u.email || '—'}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {u.displayName || '—'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
              {u.uid.slice(0, 8)}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                background: u.disabled ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                color: u.disabled ? '#ef4444' : '#10b981',
                border: `1px solid ${u.disabled ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                textAlign: 'center',
              }}
            >
              {u.disabled ? 'Banned' : 'Active'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
            </span>
            {/* Actions — stop propagation so row-click doesn't trigger */}
            <div
              style={{ display: 'flex', gap: 6 }}
              onClick={e => e.stopPropagation()}
            >
              {u.disabled ? (
                <button
                  onClick={() => doAction('unban', u.uid)}
                  disabled={actionUid === u.uid}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 7,
                    background: 'rgba(16,185,129,0.15)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    color: '#10b981',
                    cursor: 'pointer',
                    opacity: actionUid === u.uid ? 0.5 : 1,
                  }}
                >
                  Unban
                </button>
              ) : (
                <button
                  onClick={() => doAction('ban', u.uid)}
                  disabled={actionUid === u.uid}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 7,
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    opacity: actionUid === u.uid ? 0.5 : 1,
                  }}
                >
                  Ban
                </button>
              )}
              <button
                onClick={() => doAction('revokeTokens', u.uid)}
                disabled={actionUid === u.uid}
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 7,
                  background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: '#f59e0b',
                  cursor: 'pointer',
                  opacity: actionUid === u.uid ? 0.5 : 1,
                }}
              >
                Revoke
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Slide-over panel */}
      {selected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          {/* Backdrop */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setSelected(null)}
          />

          {/* Panel */}
          <div
            style={{
              position: 'relative',
              width: 360,
              height: '100%',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(28px)',
              borderLeft: '1px solid var(--glass-border)',
              overflowY: 'auto',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
                User Detail
              </h2>
              <button
                onClick={() => setSelected(null)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-3)',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                ✕
              </button>
            </div>

            {[
              { label: 'UID',          value: selected.uid },
              { label: 'Email',        value: selected.email || '—' },
              { label: 'Display Name', value: selected.displayName || '—' },
              { label: 'Status',       value: selected.disabled ? 'Banned' : 'Active' },
              { label: 'Created',      value: selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—' },
              { label: 'Last Sign In', value: selected.lastSignIn ? new Date(selected.lastSignIn).toLocaleString() : '—' },
            ].map(row => (
              <div key={row.label}>
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{row.label}</p>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text-1)',
                    fontFamily: row.label === 'UID' ? 'monospace' : 'inherit',
                    wordBreak: 'break-all',
                    margin: 0,
                  }}
                >
                  {row.value}
                </p>
              </div>
            ))}

            {/* Quick actions from panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {selected.disabled ? (
                <button
                  onClick={async () => { await doAction('unban', selected.uid); setSelected(null) }}
                  style={{
                    padding: '10px',
                    borderRadius: 10,
                    background: 'rgba(16,185,129,0.15)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    color: '#10b981',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Unban User
                </button>
              ) : (
                <button
                  onClick={async () => { await doAction('ban', selected.uid); setSelected(null) }}
                  style={{
                    padding: '10px',
                    borderRadius: 10,
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Ban User
                </button>
              )}
              <button
                onClick={async () => { await doAction('revokeTokens', selected.uid); setSelected(null) }}
                style={{
                  padding: '10px',
                  borderRadius: 10,
                  background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: '#f59e0b',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Revoke All Sessions
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
