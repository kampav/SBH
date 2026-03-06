'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { saveSleep, getSleepHistory, deleteSleep } from '@/lib/firebase/firestore'
import {
  calcSleepDuration, calcSleepScore, sleepQualityLabel, sleepScoreLabel,
  avgSleepH, sleepDebtH, sleepWeekData, SLEEP_TARGET_H,
} from '@/lib/health/sleepUtils'
import type { SleepEntry, SleepQuality } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft, Moon, Trash2, Plus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts'

// ── helpers ───────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10) }
function newId()    { return `sleep_${Date.now()}` }

const QUALITY_OPTS: { q: SleepQuality; label: string; emoji: string }[] = [
  { q: 1, label: 'Terrible',  emoji: '😴' },
  { q: 2, label: 'Poor',      emoji: '😪' },
  { q: 3, label: 'Fair',      emoji: '😐' },
  { q: 4, label: 'Good',      emoji: '😊' },
  { q: 5, label: 'Excellent', emoji: '😁' },
]

// ── component ─────────────────────────────────────────────────────────────────

export default function SleepPage() {
  const router = useRouter()
  const [uid, setUid]         = useState('')
  const [authReady, setAuthReady] = useState(false)
  const [history, setHistory] = useState<SleepEntry[]>([])
  const [saving, setSaving]   = useState(false)
  const [tab, setTab]         = useState<'log' | 'history'>('log')

  // form state
  const [formBedtime,  setFormBedtime]  = useState('22:30')
  const [formWake,     setFormWake]     = useState('06:30')
  const [formQuality,  setFormQuality]  = useState<SleepQuality>(4)
  const [formNotes,    setFormNotes]    = useState('')
  const [formDate,     setFormDate]     = useState(todayStr())

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      setUid(user.uid)
      const entries = await getSleepHistory(user.uid, 30)
      setHistory(entries)
    })
    return unsub
  }, [router])

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  // ── derived stats ──────────────────────────────────────────────────────────

  const last7 = history.slice(-7)
  const avg   = avgSleepH(last7)
  const debt  = sleepDebtH(last7)
  const previewDuration = calcSleepDuration(formBedtime, formWake)
  const previewScore    = calcSleepScore(previewDuration, formQuality)
  const scoreInfo       = sleepScoreLabel(previewScore)
  const chartData       = sleepWeekData(history, 7).map(({ date, entry }) => ({
    date: date.slice(5),
    h:    entry ? entry.durationH : 0,
    quality: entry?.quality ?? 0,
  }))

  // ── actions ────────────────────────────────────────────────────────────────

  async function handleLog() {
    if (!uid) return
    setSaving(true)
    try {
      const dur = calcSleepDuration(formBedtime, formWake)
      const entry: SleepEntry = {
        id:        newId(),
        date:      formDate,
        bedtime:   formBedtime,
        wakeTime:  formWake,
        durationH: dur,
        quality:   formQuality,
        notes:     formNotes.trim() || undefined,
        loggedAt:  new Date() as unknown as import('@/lib/types').FirestoreTimestamp,
      }
      await saveSleep(uid, entry)
      const updated = await getSleepHistory(uid, 30)
      setHistory(updated)
      setFormNotes('')
      setTab('history')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(date: string) {
    if (!uid) return
    await deleteSleep(uid, date)
    setHistory(prev => prev.filter(e => e.date !== date))
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen mesh-bg page-pad pb-24">
      {/* Header */}
      <header className="px-4 pt-12 pb-4 flex items-center gap-3">
        <Link href="/dashboard" className="p-2 rounded-xl glass">
          <ArrowLeft size={18} style={{ color: 'var(--text-2)' }} />
        </Link>
        <div className="flex items-center gap-2">
          <Moon size={20} className="text-violet-400" />
          <h1 className="text-xl font-bold text-1">Sleep</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-3">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="glass rounded-2xl p-3 text-center">
            <p className="text-xs text-2 mb-1">7-day avg</p>
            <p className="text-xl font-bold" style={{ color: '#7c3aed' }}>{avg > 0 ? `${avg}h` : '--'}</p>
          </div>
          <div className="glass rounded-2xl p-3 text-center">
            <p className="text-xs text-2 mb-1">Target</p>
            <p className="text-xl font-bold text-1">{SLEEP_TARGET_H}h</p>
          </div>
          <div className="glass rounded-2xl p-3 text-center">
            <p className="text-xs text-2 mb-1">Sleep debt</p>
            <p className="text-xl font-bold" style={{ color: debt > 3 ? '#f43f5e' : debt > 0 ? '#f59e0b' : '#10b981' }}>
              {debt > 0 ? `-${debt}h` : '0h'}
            </p>
          </div>
        </div>

        {/* 7-day chart */}
        {history.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <p className="text-xs font-semibold text-2 uppercase tracking-widest mb-3">Last 7 Nights</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} barCategoryGap="30%">
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} hide />
                <Tooltip
                  contentStyle={{ background: '#111B2E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 12 }}
                  formatter={(v: unknown) => [`${v}h`, 'Sleep']}
                />
                <ReferenceLine y={SLEEP_TARGET_H} stroke="#7c3aed" strokeDasharray="4 2" strokeOpacity={0.5} />
                <Bar dataKey="h" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.h >= 7 ? '#7c3aed' : d.h >= 5 ? '#f59e0b' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabs */}
        <div className="glass rounded-2xl flex overflow-hidden">
          {(['log', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-sm font-semibold capitalize transition-colors"
              style={{ background: tab === t ? '#7c3aed22' : 'transparent', color: tab === t ? '#7c3aed' : 'var(--text-2)' }}>
              {t === 'log' ? '+ Log Sleep' : 'History'}
            </button>
          ))}
        </div>

        {/* LOG TAB */}
        {tab === 'log' && (
          <div className="glass rounded-2xl p-4 space-y-4">
            {/* Date */}
            <div>
              <label className="text-xs text-2 block mb-1">Date (wake date)</label>
              <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                className="w-full glass-dark rounded-xl px-3 py-2.5 text-sm text-1 border border-white/10" />
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-2 block mb-1">Bedtime</label>
                <input type="time" value={formBedtime} onChange={e => setFormBedtime(e.target.value)}
                  className="w-full glass-dark rounded-xl px-3 py-2.5 text-sm text-1 border border-white/10" />
              </div>
              <div>
                <label className="text-xs text-2 block mb-1">Wake time</label>
                <input type="time" value={formWake} onChange={e => setFormWake(e.target.value)}
                  className="w-full glass-dark rounded-xl px-3 py-2.5 text-sm text-1 border border-white/10" />
              </div>
            </div>

            {/* Duration preview */}
            <div className="flex items-center justify-between rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(124,58,237,0.12)' }}>
              <span className="text-sm text-2">Duration</span>
              <span className="font-bold text-violet-400">{previewDuration}h</span>
            </div>

            {/* Quality */}
            <div>
              <label className="text-xs text-2 block mb-2">Sleep quality</label>
              <div className="flex gap-2">
                {QUALITY_OPTS.map(({ q, label, emoji }) => (
                  <button key={q} onClick={() => setFormQuality(q)}
                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-colors text-xs"
                    style={{
                      borderColor: formQuality === q ? sleepQualityLabel(q).color : 'rgba(255,255,255,0.08)',
                      background:  formQuality === q ? sleepQualityLabel(q).color + '20' : 'transparent',
                      color: formQuality === q ? sleepQualityLabel(q).color : 'var(--text-2)',
                    }}>
                    <span className="text-base">{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Score preview */}
            <div className="flex items-center justify-between rounded-xl px-3 py-2.5"
              style={{ background: scoreInfo.color + '18' }}>
              <span className="text-sm text-2">Sleep score</span>
              <span className="font-bold text-sm" style={{ color: scoreInfo.color }}>
                {previewScore} / 100 — {scoreInfo.label}
              </span>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-2 block mb-1">Notes (optional)</label>
              <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)}
                placeholder="e.g. woke up at 3am, vivid dreams…"
                rows={2}
                className="w-full glass-dark rounded-xl px-3 py-2.5 text-sm text-1 border border-white/10 resize-none" />
            </div>

            <button onClick={handleLog} disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
              {saving ? 'Saving…' : 'Log Sleep'}
            </button>
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center">
                <Moon size={32} className="mx-auto mb-3 text-violet-400 opacity-50" />
                <p className="text-sm text-2">No sleep logs yet</p>
                <button onClick={() => setTab('log')}
                  className="mt-3 flex items-center gap-1.5 mx-auto text-sm font-semibold"
                  style={{ color: '#7c3aed' }}>
                  <Plus size={14} /> Log your first sleep
                </button>
              </div>
            ) : (
              [...history].reverse().map(entry => {
                const ql   = sleepQualityLabel(entry.quality)
                const sc   = calcSleepScore(entry.durationH, entry.quality)
                const scl  = sleepScoreLabel(sc)
                return (
                  <div key={entry.date} className="glass rounded-2xl p-4 flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-1">{entry.date}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: ql.color + '20', color: ql.color }}>
                          {ql.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-2">
                        <span>🌙 {entry.bedtime}</span>
                        <span>→</span>
                        <span>☀️ {entry.wakeTime}</span>
                        <span className="font-semibold text-violet-400">{entry.durationH}h</span>
                      </div>
                      <p className="text-xs" style={{ color: scl.color }}>
                        Score: {sc}/100 — {scl.label}
                      </p>
                      {entry.notes && <p className="text-xs text-3 truncate">{entry.notes}</p>}
                    </div>
                    <button onClick={() => handleDelete(entry.date)}
                      className="p-2 rounded-xl hover:bg-rose-500/20 transition-colors flex-shrink-0">
                      <Trash2 size={14} style={{ color: '#f43f5e' }} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-center text-xs text-3 px-4">
          Sleep recommendations are general guidance only. Consult your doctor for sleep disorders or chronic fatigue.
        </p>
      </div>
    </main>
  )
}
