'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { saveThoughtRecord, getThoughtRecords, deleteThoughtRecord } from '@/lib/firebase/firestore'
import { ThoughtRecord } from '@/lib/types'
import { serverTimestamp } from 'firebase/firestore'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Plus, ChevronRight, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react'

// ── Steps definition ─────────────────────────────────────────────────────────
const STEPS = [
  {
    key: 'situation',
    label: 'Situation',
    prompt: 'What happened?',
    hint: 'Describe the event or situation that triggered this thought. Be specific about when, where, and who was involved.',
    multiline: true,
  },
  {
    key: 'automaticThought',
    label: 'Automatic Thought',
    prompt: 'What went through your mind?',
    hint: 'What thought or image came into your head? What were you saying to yourself?',
    multiline: true,
  },
  {
    key: 'emotion',
    label: 'Emotion & Intensity',
    prompt: 'How did it make you feel?',
    hint: 'Name the emotion (e.g. anxious, sad, angry) and rate its intensity from 0 to 10.',
    multiline: false,
    hasIntensity: true,
    intensityKey: 'emotionIntensity',
  },
  {
    key: 'evidenceFor',
    label: 'Evidence For',
    prompt: 'What supports this thought?',
    hint: 'List the facts or experiences that seem to confirm the thought.',
    multiline: true,
  },
  {
    key: 'evidenceAgainst',
    label: 'Evidence Against',
    prompt: 'What doesn\'t support it?',
    hint: 'List facts, experiences, or alternative explanations that challenge the thought.',
    multiline: true,
  },
  {
    key: 'balancedThought',
    label: 'Balanced Thought',
    prompt: 'A more balanced view',
    hint: 'Write a more realistic, balanced alternative to the original thought, taking both evidence columns into account.',
    multiline: true,
  },
  {
    key: 'outcomeEmotion',
    label: 'How do you feel now?',
    prompt: 'Outcome emotion',
    hint: 'Name your emotion now and rate its intensity from 0 to 10.',
    multiline: false,
    hasIntensity: true,
    intensityKey: 'outcomeIntensity',
  },
] as const

type StepKey = 'situation' | 'automaticThought' | 'emotion' | 'evidenceFor' | 'evidenceAgainst' | 'balancedThought' | 'outcomeEmotion'

interface FormState {
  situation: string
  automaticThought: string
  emotion: string
  emotionIntensity: number
  evidenceFor: string
  evidenceAgainst: string
  balancedThought: string
  outcomeEmotion: string
  outcomeIntensity: number
}

const EMPTY_FORM: FormState = {
  situation: '',
  automaticThought: '',
  emotion: '',
  emotionIntensity: 5,
  evidenceFor: '',
  evidenceAgainst: '',
  balancedThought: '',
  outcomeEmotion: '',
  outcomeIntensity: 5,
}

const EMOTION_CHIPS = ['Anxious', 'Sad', 'Angry', 'Ashamed', 'Guilty', 'Frustrated', 'Overwhelmed', 'Hopeless', 'Lonely', 'Scared']

type Tab = 'new' | 'history'

export default function JournalPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [tab, setTab] = useState<Tab>('new')
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [records, setRecords] = useState<ThoughtRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      if (!u) { router.replace('/login'); return }
      setUid(u.uid)
      setAuthReady(true)
    })
    return unsub
  }, [router])

  const loadHistory = useCallback(async () => {
    if (!uid) return
    setLoadingHistory(true)
    try {
      const data = await getThoughtRecords(uid)
      setRecords(data)
    } catch {
      // best-effort
    } finally {
      setLoadingHistory(false)
    }
  }, [uid])

  useEffect(() => {
    if (uid && tab === 'history') loadHistory()
  }, [uid, tab, loadHistory])

  const currentStep = STEPS[step]
  const stepKey = currentStep.key as StepKey

  const canNext = (() => {
    if (stepKey === 'emotion') return form.emotion.trim().length > 0
    if (stepKey === 'outcomeEmotion') return form.outcomeEmotion.trim().length > 0
    return (form[stepKey as keyof FormState] as string).trim().length > 0
  })()

  async function handleSave() {
    if (!uid) return
    setSaving(true)
    setSaveError('')
    try {
      const now = new Date()
      const id = now.toISOString().replace(/[:.]/g, '-')
      const record: ThoughtRecord = {
        id,
        date: now.toISOString().slice(0, 10),
        situation: form.situation,
        automaticThought: form.automaticThought,
        emotion: form.emotion,
        emotionIntensity: form.emotionIntensity,
        evidenceFor: form.evidenceFor,
        evidenceAgainst: form.evidenceAgainst,
        balancedThought: form.balancedThought,
        outcomeEmotion: form.outcomeEmotion,
        outcomeIntensity: form.outcomeIntensity,
        loggedAt: serverTimestamp() as never,
      }
      await saveThoughtRecord(uid, record)
      setForm(EMPTY_FORM)
      setStep(0)
      setTab('history')
      await loadHistory()
    } catch {
      setSaveError('Failed to save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!uid) return
    try {
      await deleteThoughtRecord(uid, id)
      setRecords(prev => prev.filter(r => r.id !== id))
    } catch {
      // ignore
    }
  }

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  const intensityBar = (val: number) => (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold w-4 text-center" style={{ color: '#7c3aed' }}>{val}</span>
      <input
        type="range" min={0} max={10} value={val}
        onChange={e => {
          const intensityKey = stepKey === 'emotion' ? 'emotionIntensity' : 'outcomeIntensity'
          setForm(f => ({ ...f, [intensityKey]: Number(e.target.value) }))
        }}
        className="flex-1 accent-violet-600"
      />
      <span className="text-xs" style={{ color: 'var(--text-3)' }}>
        {val <= 2 ? 'Very low' : val <= 4 ? 'Low' : val <= 6 ? 'Moderate' : val <= 8 ? 'High' : 'Very high'}
      </span>
    </div>
  )

  return (
    <div className="min-h-screen mesh-bg pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 glass-strong border-b" style={{ borderColor: 'var(--sbh-border)' }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl glass-elevated">
            <ArrowLeft size={16} style={{ color: 'var(--text-3)' }} />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-1">CBT Journal</h1>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Thought records · cognitive reframing</p>
          </div>
          <BookOpen size={18} style={{ color: '#7c3aed' }} />
        </div>

        {/* Tabs */}
        <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2">
          {(['new', 'history'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={{
                background: tab === t ? '#7c3aed' : 'rgba(255,255,255,0.06)',
                color: tab === t ? '#fff' : 'var(--text-2)',
              }}
            >
              {t === 'new' ? 'New record' : 'History'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* ── NEW RECORD TAB ── */}
        {tab === 'new' && (
          <>
            {/* Step progress */}
            <div className="flex gap-1">
              {STEPS.map((s, i) => (
                <div
                  key={s.key}
                  className="flex-1 h-1 rounded-full transition-all"
                  style={{ background: i <= step ? '#7c3aed' : 'rgba(255,255,255,0.1)' }}
                />
              ))}
            </div>

            {/* Intro card */}
            {step === 0 && (
              <div className="glass rounded-2xl p-4" style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.15)' }}>
                    <BookOpen size={20} style={{ color: '#7c3aed' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-1">CBT Thought Record</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>7 steps · ~5 minutes</p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  Cognitive Behavioural Therapy thought records help you identify and challenge unhelpful thinking patterns.
                  By examining evidence for and against your thoughts, you can develop more balanced perspectives.
                </p>
              </div>
            )}

            {/* Current step card */}
            <div className="glass rounded-2xl p-5 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.15)', color: '#7c3aed' }}>
                    Step {step + 1} of {STEPS.length}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>{currentStep.label}</span>
                </div>
                <p className="text-lg font-bold text-1">{currentStep.prompt}</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-3)' }}>{currentStep.hint}</p>
              </div>

              {/* Emotion chips (step 2 = emotion, step 6 = outcomeEmotion) */}
              {(stepKey === 'emotion' || stepKey === 'outcomeEmotion') && (
                <div className="flex flex-wrap gap-2">
                  {EMOTION_CHIPS.map(chip => {
                    const selected = form[stepKey] === chip
                    return (
                      <button
                        key={chip}
                        onClick={() => setForm(f => ({ ...f, [stepKey]: selected ? '' : chip }))}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                        style={{
                          background: selected ? '#7c3aed' : 'rgba(255,255,255,0.06)',
                          color: selected ? '#fff' : 'var(--text-2)',
                          border: selected ? 'none' : '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {chip}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Text input */}
              {stepKey !== 'emotion' && stepKey !== 'outcomeEmotion' && (
                currentStep.multiline ? (
                  <textarea
                    rows={4}
                    placeholder="Type here…"
                    value={form[stepKey] as string}
                    onChange={e => setForm(f => ({ ...f, [stepKey]: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 text-sm text-1 resize-none outline-none placeholder:text-3"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                ) : (
                  <input
                    type="text"
                    placeholder="Type here…"
                    value={form[stepKey] as string}
                    onChange={e => setForm(f => ({ ...f, [stepKey]: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 text-sm text-1 outline-none placeholder:text-3"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                )
              )}

              {/* Emotion text + intensity */}
              {(stepKey === 'emotion' || stepKey === 'outcomeEmotion') && (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Or type your own emotion…"
                    value={form[stepKey] as string}
                    onChange={e => setForm(f => ({ ...f, [stepKey]: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 text-sm text-1 outline-none placeholder:text-3"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-3)' }}>Intensity (0–10)</p>
                    {intensityBar(stepKey === 'emotion' ? form.emotionIntensity : form.outcomeIntensity)}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)' }}
                >
                  Back
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canNext}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}
                >
                  Next <ChevronRight size={14} className="inline ml-1" />
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving || !canNext}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}
                >
                  {saving ? 'Saving…' : 'Complete record'}
                </button>
              )}
            </div>
            {saveError && <p className="text-xs text-rose-400 text-center">{saveError}</p>}

            {/* Reset */}
            {step > 0 && (
              <button
                onClick={() => { setStep(0); setForm(EMPTY_FORM) }}
                className="w-full text-xs py-2 flex items-center justify-center gap-1"
                style={{ color: 'var(--text-3)' }}
              >
                <X size={12} /> Start over
              </button>
            )}
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-7 h-7 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              </div>
            ) : records.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center space-y-3">
                <BookOpen size={40} style={{ color: 'var(--text-3)' }} className="mx-auto" />
                <p className="text-sm font-semibold text-1">No records yet</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Complete your first thought record to start tracking your cognitive patterns.</p>
                <button
                  onClick={() => setTab('new')}
                  className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}
                >
                  <Plus size={14} className="inline mr-1" /> New record
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map(r => {
                  const expanded = expandedId === r.id
                  const intensityDiff = r.outcomeIntensity - r.emotionIntensity
                  return (
                    <div key={r.id} className="glass rounded-2xl overflow-hidden">
                      {/* Header row */}
                      <button
                        className="w-full px-4 py-4 flex items-start gap-3 text-left"
                        onClick={() => setExpandedId(expanded ? null : r.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                              {new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                background: intensityDiff < 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                color: intensityDiff < 0 ? '#10b981' : '#ef4444',
                              }}
                            >
                              {intensityDiff < 0 ? `↓ ${Math.abs(intensityDiff)}` : intensityDiff > 0 ? `↑ ${intensityDiff}` : '→ 0'} intensity
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-1 truncate">{r.situation}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                            {r.emotion} ({r.emotionIntensity}/10) → {r.outcomeEmotion} ({r.outcomeIntensity}/10)
                          </p>
                        </div>
                        {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-3)' }} className="flex-shrink-0 mt-1" /> : <ChevronDown size={16} style={{ color: 'var(--text-3)' }} className="flex-shrink-0 mt-1" />}
                      </button>

                      {/* Expanded detail */}
                      {expanded && (
                        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                          {[
                            { label: 'Automatic Thought', value: r.automaticThought, color: '#f97316' },
                            { label: 'Evidence For', value: r.evidenceFor, color: '#ef4444' },
                            { label: 'Evidence Against', value: r.evidenceAgainst, color: '#10b981' },
                            { label: 'Balanced Thought', value: r.balancedThought, color: '#7c3aed' },
                          ].map(item => (
                            <div key={item.label} className="pt-3">
                              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: item.color }}>{item.label}</p>
                              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{item.value}</p>
                            </div>
                          ))}
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="flex items-center gap-1 text-xs pt-2"
                            style={{ color: '#ef4444' }}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
