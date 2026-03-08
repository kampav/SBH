'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { saveMoodEntry, getMoodHistory, savePHQ9, getPHQ9History } from '@/lib/firebase/firestore'
import { MoodEntry, MoodLevel, PHQ9Assessment } from '@/lib/types'
import { serverTimestamp } from 'firebase/firestore'
import Link from 'next/link'
import { ArrowLeft, Brain, TrendingUp, ClipboardList, CheckCircle, AlertTriangle } from 'lucide-react'

// ── PHQ-9 Questions ──────────────────────────────────────────────────────────
const PHQ9_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading the newspaper or watching television',
  'Moving or speaking so slowly that other people could have noticed. Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
  'Thoughts that you would be better off dead, or of hurting yourself in some way',
]

const PHQ9_OPTIONS = ['Not at all', 'Several days', 'More than half', 'Nearly every day']

function phq9Severity(score: number): PHQ9Assessment['severity'] {
  if (score <= 4)  return 'minimal'
  if (score <= 9)  return 'mild'
  if (score <= 14) return 'moderate'
  if (score <= 19) return 'moderately_severe'
  return 'severe'
}

const SEVERITY_INFO: Record<PHQ9Assessment['severity'], { label: string; color: string; note: string }> = {
  minimal:            { label: 'Minimal',            color: '#10b981', note: 'No action may be needed. Monitor and re-check in 4 weeks.' },
  mild:               { label: 'Mild',               color: '#f59e0b', note: 'Watchful waiting and lifestyle support are appropriate.' },
  moderate:           { label: 'Moderate',           color: '#f97316', note: 'Consider speaking with a GP or mental health professional.' },
  moderately_severe:  { label: 'Moderately Severe',  color: '#ef4444', note: 'Active treatment is recommended — speak to your GP.' },
  severe:             { label: 'Severe',              color: '#dc2626', note: 'Immediate support recommended — contact your GP or crisis line.' },
}

// ── Mood colours ─────────────────────────────────────────────────────────────
const MOOD_EMOJIS: Record<MoodLevel, string> = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' }
const MOOD_LABELS: Record<MoodLevel, string> = { 1: 'Very Low', 2: 'Low', 3: 'Neutral', 4: 'Good', 5: 'Great' }
const MOOD_COLORS: Record<MoodLevel, string> = { 1: '#dc2626', 2: '#f97316', 3: '#f59e0b', 4: '#10b981', 5: '#06b6d4' }
const ANXIETY_EMOJIS: Record<MoodLevel, string> = { 1: '😌', 2: '🙂', 3: '😐', 4: '😰', 5: '😱' }
const ANXIETY_LABELS: Record<MoodLevel, string> = { 1: 'Very Calm', 2: 'Calm', 3: 'Neutral', 4: 'Anxious', 5: 'Very Anxious' }

type Tab = 'log' | 'history' | 'phq9'

export default function MoodPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [tab, setTab] = useState<Tab>('log')

  // Daily check-in form
  const [mood, setMood] = useState<MoodLevel>(3)
  const [energy, setEnergy] = useState<MoodLevel>(3)
  const [anxiety, setAnxiety] = useState<MoodLevel>(2)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedToday, setSavedToday] = useState(false)

  // History
  const [history, setHistory] = useState<MoodEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // PHQ-9
  const [phqAnswers, setPhqAnswers] = useState<number[]>(Array(9).fill(-1))
  const [phqResult, setPhqResult] = useState<PHQ9Assessment | null>(null)
  const [phqSaving, setPhqSaving] = useState(false)
  const [phqHistory, setPhqHistory] = useState<PHQ9Assessment[]>([])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setAuthReady(true)
      if (!u) { router.push('/login'); return }
      setUid(u.uid)
    })
    return unsub
  }, [router])

  const loadHistory = useCallback(async () => {
    if (!uid) return
    setHistoryLoading(true)
    const [moodH, phqH] = await Promise.all([getMoodHistory(uid, 30), getPHQ9History(uid, 6)])
    setHistory(moodH)
    setPhqHistory(phqH)
    // Check if logged today
    const today = new Date().toISOString().slice(0, 10)
    if (moodH.some(m => m.date === today)) setSavedToday(true)
    setHistoryLoading(false)
  }, [uid])

  useEffect(() => {
    if (uid) loadHistory()
  }, [uid, loadHistory])

  async function saveMood() {
    if (!uid) return
    setSaving(true)
    const now = new Date()
    const entry: MoodEntry = {
      id: now.toISOString(),
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      mood,
      energy,
      anxiety,
      notes: notes.trim() || undefined,
      loggedAt: serverTimestamp() as never,
    }
    await saveMoodEntry(uid, entry)
    setSavedToday(true)
    setSaving(false)
    setNotes('')
    await loadHistory()
  }

  async function submitPHQ9() {
    if (!uid || phqAnswers.includes(-1)) return
    setPhqSaving(true)
    const total = phqAnswers.reduce((s, a) => s + a, 0)
    const severity = phq9Severity(total)
    const now = new Date()
    const assessment: PHQ9Assessment = {
      id: now.toISOString(),
      date: now.toISOString().slice(0, 10),
      answers: phqAnswers,
      totalScore: total,
      severity,
      completedAt: serverTimestamp() as never,
    }
    await savePHQ9(uid, assessment)
    setPhqResult(assessment)
    setPhqSaving(false)
    await loadHistory()
  }

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const avgMood = history.length
    ? Math.round((history.reduce((s, m) => s + m.mood, 0) / history.length) * 10) / 10
    : null

  return (
    <main className="min-h-screen mesh-bg page-pad pb-28">
      <header className="page-header-bar px-4 flex items-center gap-3 h-14">
        <Link href="/dashboard" className="p-2 rounded-xl glass-elevated">
          <ArrowLeft size={16} style={{ color: 'var(--text-3)' }} />
        </Link>
        <div>
          <p className="section-label">Mental Wellness</p>
          <h1 className="page-title" style={{ fontSize: '1.25rem' }}>Mood Tracker</h1>
        </div>
      </header>

      {/* Crisis banner */}
      <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 lg:px-8 pt-3">
        <div className="rounded-2xl px-4 py-3 flex items-start gap-3 mb-4"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)' }}>
          <AlertTriangle size={14} style={{ color: '#a78bfa', flexShrink: 0, marginTop: 2 }} />
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>
            <strong style={{ color: '#a78bfa' }}>Not a clinical tool.</strong> If you are in crisis or having thoughts of self-harm,
            call <strong>116 123</strong> (Samaritans UK) or <strong>999</strong> (emergency).
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 lg:px-8">
        <div className="flex gap-1 glass rounded-2xl p-1 mb-4">
          {([['log', 'Check-in', Brain], ['history', 'History', TrendingUp], ['phq9', 'PHQ-9', ClipboardList]] as const).map(([t, label, Icon]) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: tab === t ? '#7c3aed' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text-2)',
              }}>
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* ── CHECK-IN TAB ─────────────────────────────────────────────── */}
        {tab === 'log' && (
          <div className="space-y-4">
            {savedToday && (
              <div className="flex items-center gap-2 glass rounded-xl px-4 py-3"
                style={{ border: '1px solid rgba(16,185,129,0.3)' }}>
                <CheckCircle size={14} style={{ color: '#10b981' }} />
                <p className="text-xs font-semibold" style={{ color: '#10b981' }}>
                  Already logged today — you can log again to update
                </p>
              </div>
            )}

            {/* Mood */}
            <div className="glass rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-3 mb-3">How are you feeling?</p>
              <div className="flex justify-between gap-1">
                {([1,2,3,4,5] as MoodLevel[]).map(v => (
                  <button key={v} onClick={() => setMood(v)}
                    className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all"
                    style={{
                      background: mood === v ? MOOD_COLORS[v] + '20' : 'transparent',
                      border: mood === v ? `1px solid ${MOOD_COLORS[v]}40` : '1px solid transparent',
                    }}>
                    <span className="text-2xl">{MOOD_EMOJIS[v]}</span>
                    <span className="text-xs" style={{ color: mood === v ? MOOD_COLORS[v] : 'var(--text-3)' }}>
                      {MOOD_LABELS[v]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Energy */}
            <div className="glass rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-3 mb-3">Energy level</p>
              <div className="flex gap-2">
                {([1,2,3,4,5] as MoodLevel[]).map(v => (
                  <button key={v} onClick={() => setEnergy(v)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: energy === v ? MOOD_COLORS[v] : 'var(--glass-bg)',
                      color: energy === v ? '#fff' : 'var(--text-2)',
                    }}>
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-xs text-3 mt-2 text-center">
                {energy === 1 ? 'Exhausted' : energy === 2 ? 'Tired' : energy === 3 ? 'Okay' : energy === 4 ? 'Energised' : 'Full of energy'}
              </p>
            </div>

            {/* Anxiety */}
            <div className="glass rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-3 mb-3">Anxiety level</p>
              <div className="flex justify-between gap-1">
                {([1,2,3,4,5] as MoodLevel[]).map(v => {
                  const anxColor = v <= 2 ? '#10b981' : v === 3 ? '#f59e0b' : v === 4 ? '#f97316' : '#ef4444'
                  return (
                    <button key={v} onClick={() => setAnxiety(v)}
                      className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all"
                      style={{
                        background: anxiety === v ? anxColor + '20' : 'transparent',
                        border: anxiety === v ? `1px solid ${anxColor}40` : '1px solid transparent',
                      }}>
                      <span className="text-2xl">{ANXIETY_EMOJIS[v]}</span>
                      <span className="text-xs" style={{ color: anxiety === v ? anxColor : 'var(--text-3)' }}>
                        {ANXIETY_LABELS[v]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="glass rounded-2xl p-4">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any thoughts or context? (optional)"
                rows={3}
                className="w-full bg-transparent text-sm outline-none resize-none"
                style={{ color: 'var(--text-1)', '::placeholder': { color: 'var(--text-3)' } } as React.CSSProperties}
              />
            </div>

            <button onClick={saveMood} disabled={saving}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              {saving ? 'Saving…' : 'Log Mood'}
            </button>
          </div>
        )}

        {/* ── HISTORY TAB ──────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="space-y-4">
            {/* Summary */}
            {avgMood !== null && (
              <div className="grid grid-cols-3 gap-3">
                <div className="glass rounded-2xl p-4 text-center">
                  <p className="text-xs text-3 mb-1">Avg mood</p>
                  <p className="text-2xl font-black" style={{ color: MOOD_COLORS[Math.round(avgMood) as MoodLevel] }}>
                    {avgMood}
                  </p>
                </div>
                <div className="glass rounded-2xl p-4 text-center">
                  <p className="text-xs text-3 mb-1">Days logged</p>
                  <p className="text-2xl font-black text-1">{history.length}</p>
                </div>
                <div className="glass rounded-2xl p-4 text-center">
                  <p className="text-xs text-3 mb-1">PHQ-9 taken</p>
                  <p className="text-2xl font-black text-1">{phqHistory.length}</p>
                </div>
              </div>
            )}

            {historyLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center">
                <Brain size={28} className="mx-auto mb-3 text-slate-600" />
                <p className="text-sm text-2">No mood entries yet — start with a check-in</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...history].reverse().map(entry => {
                  const moodColor = MOOD_COLORS[entry.mood]
                  return (
                    <div key={entry.id} className="glass rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{MOOD_EMOJIS[entry.mood]}</span>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: moodColor }}>
                              {MOOD_LABELS[entry.mood]}
                            </p>
                            <p className="text-xs text-3">{entry.date} · {entry.time}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 text-xs text-3">
                          <span>Energy: <strong style={{ color: MOOD_COLORS[entry.energy] }}>{entry.energy}/5</strong></span>
                          <span>Anxiety: <strong style={{ color: entry.anxiety >= 4 ? '#ef4444' : entry.anxiety === 3 ? '#f59e0b' : '#10b981' }}>{entry.anxiety}/5</strong></span>
                        </div>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-2 mt-1 italic">&ldquo;{entry.notes}&rdquo;</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* PHQ-9 history */}
            {phqHistory.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-3 mb-2 px-1">PHQ-9 History</p>
                <div className="space-y-2">
                  {phqHistory.map(a => {
                    const sev = SEVERITY_INFO[a.severity]
                    return (
                      <div key={a.id} className="glass rounded-2xl px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-1">{a.date}</p>
                          <p className="text-xs text-3">Score: {a.totalScore}/27</p>
                        </div>
                        <span className="text-xs px-3 py-1 rounded-full font-semibold"
                          style={{ background: sev.color + '20', color: sev.color }}>
                          {sev.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PHQ-9 TAB ────────────────────────────────────────────────── */}
        {tab === 'phq9' && (
          <div className="space-y-4">
            {phqResult ? (
              <div className="glass rounded-2xl p-6 space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-black text-1">{phqResult.totalScore}</p>
                  <p className="text-xs text-3 mt-1">out of 27</p>
                  <span className="inline-block mt-2 px-4 py-1.5 rounded-full text-sm font-bold"
                    style={{
                      background: SEVERITY_INFO[phqResult.severity].color + '20',
                      color: SEVERITY_INFO[phqResult.severity].color,
                    }}>
                    {SEVERITY_INFO[phqResult.severity].label}
                  </span>
                </div>
                <div className="rounded-xl p-4 text-sm"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
                  <p className="text-1">{SEVERITY_INFO[phqResult.severity].note}</p>
                </div>
                {phqResult.answers[8] > 0 && (
                  <div className="rounded-xl p-4"
                    style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)' }}>
                    <p className="text-sm font-semibold" style={{ color: '#fca5a5' }}>
                      You indicated thoughts of self-harm. Please reach out for support:
                    </p>
                    <p className="text-sm mt-1" style={{ color: '#fca5a5' }}>
                      Samaritans: <strong>116 123</strong> · Crisis Text Line: text <strong>SHOUT</strong> to <strong>85258</strong>
                    </p>
                  </div>
                )}
                <button onClick={() => { setPhqResult(null); setPhqAnswers(Array(9).fill(-1)) }}
                  className="w-full py-3 rounded-xl text-sm font-semibold glass text-1">
                  Retake Assessment
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="glass rounded-2xl px-4 py-3"
                  style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
                  <p className="text-xs text-2">
                    Over the <strong className="text-1">last 2 weeks</strong>, how often have you been bothered by any of the following problems?
                  </p>
                </div>

                {PHQ9_QUESTIONS.map((q, i) => (
                  <div key={i} className="glass rounded-2xl p-4">
                    <p className="text-sm text-1 mb-3 leading-relaxed">
                      <span className="text-xs font-bold text-3 mr-2">{i + 1}.</span>{q}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PHQ9_OPTIONS.map((opt, j) => (
                        <button key={j} onClick={() => {
                          const next = [...phqAnswers]
                          next[i] = j
                          setPhqAnswers(next)
                        }}
                          className="py-2 px-3 rounded-xl text-xs font-semibold transition-all text-left"
                          style={{
                            background: phqAnswers[i] === j ? '#7c3aed' : 'var(--glass-bg)',
                            color: phqAnswers[i] === j ? '#fff' : 'var(--text-2)',
                          }}>
                          {opt}
                        </button>
                      ))}
                    </div>
                    {phqAnswers[i] >= 0 && (
                      <div className="mt-2 flex justify-end">
                        <span className="text-xs" style={{ color: '#a78bfa' }}>
                          Score: {phqAnswers[i]}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                <div className="glass rounded-xl px-4 py-3 flex items-center justify-between">
                  <p className="text-xs text-2">Questions answered</p>
                  <p className="text-sm font-bold text-1">
                    {phqAnswers.filter(a => a >= 0).length} / 9
                  </p>
                </div>

                <button
                  onClick={submitPHQ9}
                  disabled={phqAnswers.includes(-1) || phqSaving}
                  className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white disabled:opacity-40 transition-all"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                  {phqSaving ? 'Calculating…' : 'Get My Score'}
                </button>

                <p className="text-xs text-3 text-center">
                  PHQ-9 © Pfizer Inc. For educational purposes only. Not a clinical diagnosis.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
