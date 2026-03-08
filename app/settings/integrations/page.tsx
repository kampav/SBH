'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { onAuthStateChanged, getIdToken } from 'firebase/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { getDexcomCredentials, getCGMDay, deleteIntegration } from '@/lib/firebase/firestore'
import { dexcomTrendArrow, trendColor } from '@/lib/integrations/dexcom'
import { DexcomCredentials, CGMDay } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, Unplug, AlertCircle, Zap } from 'lucide-react'

const today = new Date().toISOString().slice(0, 10)

interface IntegrationCard {
  id: string
  name: string
  logo: string
  description: string
  deviceExamples: string
  available: boolean
  comingSoon?: boolean
  learnMoreUrl?: string
}

const INTEGRATIONS: IntegrationCard[] = [
  {
    id: 'dexcom',
    name: 'Dexcom CGM',
    logo: '🔵',
    description: 'Sync real-time glucose readings from Dexcom G6, G7, or Dexcom One+. Readings appear in your dashboard with trend arrows and time-in-range stats.',
    deviceExamples: 'G5 · G6 · G7 · Dexcom One+',
    available: true,
  },
  {
    id: 'libre',
    name: 'FreeStyle Libre',
    logo: '🟡',
    description: 'Connect Abbott FreeStyle Libre 2 or Libre 3 via LibreLink Up. 15-minute interval readings synced automatically.',
    deviceExamples: 'Libre 2 · Libre 3',
    available: false,
    comingSoon: true,
  },
  {
    id: 'health_connect',
    name: 'Google Health Connect',
    logo: '🟢',
    description: 'Sync steps, heart rate, sleep, and weight from any Android wearable connected to Health Connect (Garmin, Fitbit, Samsung, Pixel Watch).',
    deviceExamples: 'Android · Garmin · Fitbit · Samsung · Pixel Watch',
    available: false,
    comingSoon: true,
  },
  {
    id: 'apple_health',
    name: 'Apple Health',
    logo: '⚪',
    description: 'Import steps, heart rate, and weight from Apple Health on iOS. Requires SBH iOS app (coming soon).',
    deviceExamples: 'iPhone · Apple Watch',
    available: false,
    comingSoon: true,
  },
]

function IntegrationsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [uid, setUid] = useState<string | null>(null)
  const [idToken, setIdToken] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [dexcomCreds, setDexcomCreds] = useState<DexcomCredentials | null>(null)
  const [todayCGM, setTodayCGM] = useState<CGMDay | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setAuthReady(true)
      if (!u) { router.push('/login'); return }
      setUid(u.uid)
      const token = await getIdToken(u)
      setIdToken(token)
    })
    return unsub
  }, [router])

  const loadData = useCallback(async () => {
    if (!uid) return
    const [creds, cgm] = await Promise.all([
      getDexcomCredentials(uid),
      getCGMDay(uid, today),
    ])
    setDexcomCreds(creds)
    setTodayCGM(cgm)
  }, [uid])

  useEffect(() => {
    if (uid) loadData()
  }, [uid, loadData])

  // Handle redirect from Dexcom OAuth callback
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected === 'dexcom') {
      setBanner({ type: 'success', msg: 'Dexcom connected! Syncing your readings now…' })
      // Trigger sync
      setTimeout(() => { if (uid && idToken) handleSync() }, 1500)
    } else if (error) {
      setBanner({ type: 'error', msg: `Connection failed: ${error.replace(/_/g, ' ')}` })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, uid, idToken])

  async function handleConnect() {
    if (!idToken) return
    // Auth route redirects browser to Dexcom; pass ID token via fetch → get redirect URL
    // Actually we call the auth API which responds with a redirect
    window.location.href = `/api/integrations/dexcom/auth?token=${encodeURIComponent(idToken)}`
  }

  async function handleSync() {
    if (!idToken) return
    setSyncing(true)
    setSyncResult(null)
    try {
      const resp = await fetch('/api/integrations/dexcom/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 2 }),
      })
      if (resp.ok) {
        const data = await resp.json()
        setSyncResult(`Synced ${data.readingsTotal} readings`)
        await loadData()
      } else {
        const data = await resp.json()
        setSyncResult(`Sync failed: ${data.error}`)
      }
    } catch {
      setSyncResult('Sync failed — check your connection')
    }
    setSyncing(false)
  }

  async function handleDisconnect() {
    if (!uid || !idToken) return
    setDisconnecting(true)
    try {
      await fetch('/api/integrations/dexcom/disconnect', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      })
      await deleteIntegration(uid, 'dexcom')
      setDexcomCreds(null)
      setTodayCGM(null)
      setBanner({ type: 'success', msg: 'Dexcom disconnected.' })
    } catch {
      setBanner({ type: 'error', msg: 'Failed to disconnect. Please try again.' })
    }
    setDisconnecting(false)
  }

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen mesh-bg page-pad pb-28">
      <header className="page-header-bar px-4 flex items-center gap-3 h-14">
        <Link href="/profile" className="p-2 rounded-xl glass-elevated">
          <ArrowLeft size={16} style={{ color: 'var(--text-3)' }} />
        </Link>
        <div>
          <p className="section-label">Settings</p>
          <h1 className="page-title" style={{ fontSize: '1.25rem' }}>Integrations</h1>
        </div>
      </header>

      <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 lg:px-8 space-y-4 pt-3">

        {/* Status banner */}
        {banner && (
          <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{
              background: banner.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${banner.type === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            }}>
            {banner.type === 'success'
              ? <CheckCircle size={14} style={{ color: '#10b981', flexShrink: 0 }} />
              : <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />}
            <p className="text-xs" style={{ color: 'var(--text-1)' }}>{banner.msg}</p>
            <button onClick={() => setBanner(null)} className="ml-auto text-xs text-3">✕</button>
          </div>
        )}

        {/* Dexcom CGM — active integration widget (if connected) */}
        {dexcomCreds && (
          <div className="glass-elevated rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} style={{ color: '#10b981' }} />
                <p className="text-sm font-semibold text-1">Dexcom Connected</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                Active
              </span>
            </div>

            {/* Today's CGM summary */}
            {todayCGM ? (
              <div className="rounded-xl p-3 space-y-1"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-3">Latest reading today</p>
                  <p className="text-xs text-3">{todayCGM.readings.length} readings</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-black"
                    style={{ color: trendColor(todayCGM.latestTrend) }}>
                    {todayCGM.latestValueMmol}
                  </p>
                  <p className="text-lg font-bold" style={{ color: trendColor(todayCGM.latestTrend) }}>
                    {dexcomTrendArrow(todayCGM.latestTrend)}
                  </p>
                  <p className="text-xs text-3">mmol/L</p>
                  <div className="ml-auto text-right">
                    <p className="text-xs font-semibold text-1">TIR {todayCGM.timeInRangePct}%</p>
                    <p className="text-xs text-3">avg {todayCGM.avgMmol} mmol/L</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-2">No CGM readings yet today — tap Sync to fetch.</p>
            )}

            <div className="flex items-center gap-2 text-xs text-3">
              <p>Connected {new Date(dexcomCreds.connectedAt).toLocaleDateString('en-GB')}</p>
              {dexcomCreds.lastSyncAt && (
                <p>· Last sync {new Date(dexcomCreds.lastSyncAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={handleSync} disabled={syncing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 glass rounded-xl text-xs font-semibold text-1 disabled:opacity-50">
                <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>
              <button onClick={handleDisconnect} disabled={disconnecting}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                <Unplug size={12} />
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
            {syncResult && (
              <p className="text-xs text-center" style={{ color: syncResult.includes('failed') ? '#ef4444' : '#10b981' }}>
                {syncResult}
              </p>
            )}
          </div>
        )}

        {/* Integration cards */}
        <p className="text-xs font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--text-3)' }}>
          Available Integrations
        </p>

        {INTEGRATIONS.map(integ => {
          const isConnected = integ.id === 'dexcom' && !!dexcomCreds

          return (
            <div key={integ.id} className="glass rounded-2xl overflow-hidden">
              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl leading-none">{integ.logo}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-1">{integ.name}</p>
                        {isConnected && (
                          <CheckCircle size={12} style={{ color: '#10b981' }} />
                        )}
                        {integ.comingSoon && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: 'rgba(124,58,237,0.12)', color: '#a78bfa' }}>
                            Coming soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                        {integ.deviceExamples}
                      </p>
                    </div>
                  </div>
                  {integ.available && !isConnected && (
                    <button onClick={integ.id === 'dexcom' ? handleConnect : undefined}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                      <Zap size={11} /> Connect
                    </button>
                  )}
                  {isConnected && (
                    <span className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl"
                      style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                      Connected
                    </span>
                  )}
                  {!integ.available && !isConnected && (
                    <XCircle size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                  )}
                </div>

                {/* Description */}
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {integ.description}
                </p>
              </div>
            </div>
          )
        })}

        {/* Privacy note */}
        <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
          style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
          <AlertCircle size={13} style={{ color: '#22d3ee', flexShrink: 0, marginTop: 2 }} />
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>
            <strong style={{ color: '#22d3ee' }}>Your data stays with you.</strong> Integration tokens are stored securely in your private Firestore account. SBH never shares your health data. You can disconnect any integration at any time and your data will be deleted.
          </p>
        </div>
      </div>
    </main>
  )
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <IntegrationsPageInner />
    </Suspense>
  )
}
