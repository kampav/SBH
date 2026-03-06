'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { EXPERIMENTS, getVariant, ExperimentConfig } from '@/lib/firebase/ab-testing'
import Link from 'next/link'
import { ArrowLeft, FlaskConical, ChevronDown, ChevronUp } from 'lucide-react'

// ── types ─────────────────────────────────────────────────────────────────────

interface ExperimentRow {
  name: string
  config: ExperimentConfig
  userVariant: string
  expanded: boolean
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ExperimentsPage() {
  const router = useRouter()
  const [authReady, setAuthReady]   = useState(false)
  const [uid, setUid]               = useState('')
  const [rows, setRows]             = useState<ExperimentRow[]>([])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      setUid(user.uid)
      const initial: ExperimentRow[] = Object.entries(EXPERIMENTS).map(([name, config]) => ({
        name,
        config,
        userVariant: getVariant(name, user.uid),
        expanded: false,
      }))
      setRows(initial)
    })
    return unsub
  }, [router])

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  function toggleExpand(name: string) {
    setRows(prev => prev.map(r => r.name === name ? { ...r, expanded: !r.expanded } : r))
  }

  const VARIANT_COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e']

  return (
    <main className="min-h-screen mesh-bg page-pad pb-24">
      {/* Header */}
      <header className="px-4 pt-12 pb-4 flex items-center gap-3">
        <Link href="/dashboard" className="p-2 rounded-xl glass">
          <ArrowLeft size={18} style={{ color: 'var(--text-2)' }} />
        </Link>
        <div className="flex items-center gap-2">
          <FlaskConical size={20} className="text-violet-400" />
          <h1 className="text-xl font-bold text-1">A/B Experiments</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-3">

        {/* Info card */}
        <div className="glass rounded-2xl p-4 space-y-1">
          <p className="text-xs font-semibold text-2 uppercase tracking-widest">About experiments</p>
          <p className="text-sm text-2">
            Variant assignment is deterministic — the same user always sees the same variant.
            Override any experiment at runtime via Firebase Remote Config using the key{' '}
            <code className="text-violet-400 text-xs">experiment__&lt;name&gt;</code> with JSON
            like <code className="text-violet-400 text-xs">{`{"variants":["control","v_a"],"weights":[0.5,0.5]}`}</code>.
          </p>
        </div>

        {/* Experiment rows */}
        {rows.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <FlaskConical size={32} className="mx-auto mb-3 text-violet-400 opacity-50" />
            <p className="text-sm text-2">No experiments defined</p>
          </div>
        ) : rows.map(row => (
          <div key={row.name} className="glass rounded-2xl overflow-hidden">
            {/* Row header */}
            <button onClick={() => toggleExpand(row.name)}
              className="w-full p-4 flex items-center justify-between text-left">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-1 font-mono">{row.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: '#7c3aed22', color: '#7c3aed' }}>
                    {row.userVariant}
                  </span>
                </div>
                <p className="text-xs text-2">
                  {row.config.variants.length} variants · {row.config.variants.join(' / ')}
                </p>
              </div>
              {row.expanded
                ? <ChevronUp size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                : <ChevronDown size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
            </button>

            {/* Expanded details */}
            {row.expanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                {/* Weight bars */}
                <div className="space-y-2 pt-3">
                  {row.config.variants.map((variant, i) => {
                    const pct = Math.round((row.config.weights[i] ?? 0) * 100)
                    const color = VARIANT_COLORS[i % VARIANT_COLORS.length]
                    return (
                      <div key={variant}>
                        <div className="flex items-center justify-between mb-1 text-xs">
                          <span className="text-2">{variant}</span>
                          <span style={{ color }}>{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Your assignment */}
                <div className="rounded-xl px-3 py-2 flex items-center justify-between"
                  style={{ background: 'rgba(124,58,237,0.1)' }}>
                  <span className="text-xs text-2">Your variant ({uid.slice(0, 8)}…)</span>
                  <span className="text-xs font-bold text-violet-400">{row.userVariant}</span>
                </div>

                {/* Remote Config hint */}
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-xs text-3 font-mono break-all">
                    RC key: <span className="text-cyan-400">experiment__{row.name}</span>
                  </p>
                  <p className="text-xs text-3 font-mono mt-1 break-all">
                    {JSON.stringify({ variants: row.config.variants, weights: row.config.weights })}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        <p className="text-center text-xs text-3 pb-2">
          Developer tool — not visible to end users in production.
        </p>
      </div>
    </main>
  )
}
