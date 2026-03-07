'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { db } from '@/lib/firebase'
import { doc, collection, addDoc, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore'
import Link from 'next/link'
import { ArrowLeft, Plus, Calendar, Pill, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

const VIOLET = '#7c3aed'
const ROSE   = '#f43f5e'
const TEAL   = '#14b8a6'

type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal'

interface CycleEntry {
  id?: string
  date: string
  periodStart: boolean
  periodDay?: number
  symptoms: string[]
  mood?: number
  bloating?: boolean
  acne?: boolean
}

interface SupplementLog {
  id?: string
  date: string
  supplements: string[]
}

const SYMPTOMS = ['Cramps', 'Bloating', 'Mood swings', 'Fatigue', 'Acne', 'Hair loss', 'Headache', 'Cravings']

const SUPPLEMENTS = ['Inositol', 'Vitamin D', 'Magnesium', 'Spearmint', 'NAC', 'Berberine', 'Omega-3', 'Iron']

const PHASE_INFO: Record<CyclePhase, { label: string; color: string; workout: string; nutrition: string; days: string }> = {
  menstrual:  {
    label:    'Menstrual',
    color:    '#ef4444',
    workout:  'Rest, gentle yoga, walking. Avoid intense HIIT — honour your body.',
    nutrition: 'Iron-rich foods (lentils, spinach), anti-inflammatory (ginger, turmeric), stay hydrated.',
    days:     'Days 1–5',
  },
  follicular: {
    label:    'Follicular',
    color:    VIOLET,
    workout:  'Strength training, HIIT, heavy lifting. Oestrogen peaks — energy is high.',
    nutrition: 'Lean protein, complex carbs, fermented foods. Support rising oestrogen.',
    days:     'Days 6–13',
  },
  ovulatory:  {
    label:    'Ovulatory',
    color:    '#f59e0b',
    workout:  'Peak performance window. PBs, intense cardio, group classes.',
    nutrition: 'Cruciferous veg (broccoli, cauliflower) to support oestrogen metabolism. Fibre.',
    days:     'Days 14–16',
  },
  luteal:     {
    label:    'Luteal',
    color:    TEAL,
    workout:  'Moderate intensity — pilates, swimming, light strength. Reduce HIIT as progesterone rises.',
    nutrition: 'Magnesium-rich (dark chocolate, nuts), complex carbs to manage cravings, protein to stabilise blood sugar.',
    days:     'Days 17–28',
  },
}

function estimatePhase(lastPeriodDate: string, cycleLength = 28): CyclePhase {
  const last = new Date(lastPeriodDate)
  const daysSince = Math.floor((Date.now() - last.getTime()) / 86400000) % cycleLength
  if (daysSince <= 5)  return 'menstrual'
  if (daysSince <= 13) return 'follicular'
  if (daysSince <= 16) return 'ovulatory'
  return 'luteal'
}

export default function PCOSPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [entries, setEntries] = useState<CycleEntry[]>([])
  const [, setSupplements] = useState<SupplementLog | null>(null)
  const [lastPeriodDate, setLastPeriodDate] = useState('')
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [selectedSupplements, setSelectedSupplements] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [phase, setPhase] = useState<CyclePhase | null>(null)
  const [activeTab, setActiveTab] = useState<'cycle' | 'supplements' | 'workout'>('cycle')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setAuthReady(true)
      if (!u) { router.push('/login'); return }
      setUid(u.uid)
    })
    return unsub
  }, [router])

  const loadData = useCallback(async () => {
    if (!uid) return
    const cycleRef = collection(doc(db, 'users', uid), 'cycle_log')
    const cycleSnap = await getDocs(query(cycleRef, orderBy('date', 'desc'), limit(30)))
    const loaded: CycleEntry[] = []
    cycleSnap.forEach(d => loaded.push({ id: d.id, ...d.data() } as CycleEntry))
    setEntries(loaded)

    const lastPeriod = loaded.find(e => e.periodStart)
    if (lastPeriod) {
      setLastPeriodDate(lastPeriod.date)
      setPhase(estimatePhase(lastPeriod.date))
    }

    // Today's supplement log
    const today = new Date().toISOString().slice(0, 10)
    const suppRef = collection(doc(db, 'users', uid), 'supplement_log')
    const suppSnap = await getDocs(query(suppRef, orderBy('date', 'desc'), limit(1)))
    suppSnap.forEach(d => {
      const data = d.data() as SupplementLog
      if (data.date === today) {
        setSupplements({ id: d.id, ...data })
        setSelectedSupplements(data.supplements)
      }
    })
  }, [uid])

  useEffect(() => {
    if (uid) loadData()
  }, [uid, loadData])

  async function logCycle() {
    if (!uid || saving) return
    setSaving(true)
    const today = new Date().toISOString().slice(0, 10)
    try {
      const ref = collection(doc(db, 'users', uid), 'cycle_log')
      await addDoc(ref, {
        date:        today,
        periodStart: false,
        symptoms:    selectedSymptoms,
        loggedAt:    Timestamp.now(),
      })
      setSelectedSymptoms([])
      await loadData()
    } catch { /* */ }
    setSaving(false)
  }

  async function logPeriodStart() {
    if (!uid || saving) return
    setSaving(true)
    const today = new Date().toISOString().slice(0, 10)
    try {
      const ref = collection(doc(db, 'users', uid), 'cycle_log')
      await addDoc(ref, {
        date:        today,
        periodStart: true,
        periodDay:   1,
        symptoms:    selectedSymptoms,
        loggedAt:    Timestamp.now(),
      })
      setLastPeriodDate(today)
      setPhase('menstrual')
      setSelectedSymptoms([])
      await loadData()
    } catch { /* */ }
    setSaving(false)
  }

  async function saveSupplements() {
    if (!uid || saving) return
    setSaving(true)
    const today = new Date().toISOString().slice(0, 10)
    try {
      const ref = collection(doc(db, 'users', uid), 'supplement_log')
      await addDoc(ref, {
        date:        today,
        supplements: selectedSupplements,
        loggedAt:    Timestamp.now(),
      })
      await loadData()
    } catch { /* */ }
    setSaving(false)
  }

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const phaseInfo = phase ? PHASE_INFO[phase] : null

  return (
    <main className="min-h-screen mesh-bg page-pad pb-28">
      <header className="page-header-bar px-4 flex items-center gap-3 h-14">
        <Link href="/dashboard" className="p-2 rounded-xl glass-elevated">
          <ArrowLeft size={16} style={{ color: 'var(--text-3)' }} />
        </Link>
        <div>
          <p className="section-label">Condition Module</p>
          <h1 className="page-title" style={{ fontSize: '1.25rem' }}>PCOS Tracker</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 space-y-4 pt-3">

        {/* Disclaimer */}
        <div className="rounded-2xl px-3 py-2.5 flex items-start gap-2"
          style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
          <AlertCircle size={12} style={{ color: '#22d3ee', flexShrink: 0, marginTop: 2 }} />
          <p className="text-xs text-2">Tracking tool only — not medical advice. Discuss any concerns with your GP or endocrinologist.</p>
        </div>

        {/* Current phase */}
        {phaseInfo && (
          <div className="glass-elevated rounded-2xl p-4 space-y-2"
            style={{ border: `1.5px solid ${phaseInfo.color}44` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: phaseInfo.color }} />
                <p className="text-sm font-bold text-1">Current phase: {phaseInfo.label}</p>
              </div>
              <span className="text-xs text-3">{phaseInfo.days}</span>
            </div>
            {lastPeriodDate && (
              <p className="text-xs text-3">Last period: {new Date(lastPeriodDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="glass rounded-2xl p-1 flex gap-1">
          {(['cycle', 'supplements', 'workout'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
              style={activeTab === tab
                ? { background: `linear-gradient(135deg,${VIOLET},${TEAL})`, color: '#fff' }
                : { color: 'var(--text-2)' }}>
              {tab === 'supplements' ? 'Supplements' : tab === 'workout' ? 'Workout Plan' : 'Cycle Log'}
            </button>
          ))}
        </div>

        {/* Cycle log tab */}
        {activeTab === 'cycle' && (
          <div className="space-y-3">
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-1">Log today&apos;s symptoms</p>
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS.map(s => (
                  <button key={s} onClick={() => setSelectedSymptoms(prev =>
                    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                  )}
                    className="px-2.5 py-1 rounded-xl text-xs font-semibold transition-all"
                    style={selectedSymptoms.includes(s)
                      ? { background: ROSE, color: '#fff' }
                      : { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={logCycle} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 glass rounded-xl text-xs font-semibold text-1 disabled:opacity-50">
                  <Plus size={12} /> Log Symptoms
                </button>
                <button onClick={logPeriodStart} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
                  style={{ background: ROSE }}>
                  <Calendar size={12} /> Period Started
                </button>
              </div>
            </div>

            {/* Recent entries */}
            <p className="text-xs font-semibold text-3 uppercase tracking-wider px-1">Recent entries</p>
            {entries.slice(0, 7).map(e => (
              <div key={e.id} className="glass rounded-xl px-3 py-2.5 flex items-center gap-3">
                <div>
                  {e.periodStart
                    ? <div className="w-2.5 h-2.5 rounded-full" style={{ background: ROSE }} />
                    : <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--glass-border)' }} />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-1">
                    {new Date(e.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {e.periodStart && <span className="ml-1.5 text-xs" style={{ color: ROSE }}>Period start</span>}
                  </p>
                  {e.symptoms.length > 0 && (
                    <p className="text-xs text-3 mt-0.5">{e.symptoms.join(' · ')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Supplements tab */}
        {activeTab === 'supplements' && (
          <div className="space-y-3">
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-1">Today&apos;s supplements</p>
              <p className="text-xs text-2">Evidence-based supplements for PCOS. Always check with your GP before starting.</p>
              <div className="flex flex-wrap gap-2">
                {SUPPLEMENTS.map(s => (
                  <button key={s} onClick={() => setSelectedSupplements(prev =>
                    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                  )}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all"
                    style={selectedSupplements.includes(s)
                      ? { background: TEAL, color: '#fff' }
                      : { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}>
                    {selectedSupplements.includes(s) && <CheckCircle size={10} />}
                    <Pill size={10} />
                    {s}
                  </button>
                ))}
              </div>
              <button onClick={saveSupplements} disabled={saving || selectedSupplements.length === 0}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: `linear-gradient(135deg,${VIOLET},${TEAL})` }}>
                {saving ? 'Saving…' : 'Save today\'s supplements'}
              </button>
            </div>
          </div>
        )}

        {/* Workout plan tab */}
        {activeTab === 'workout' && (
          <div className="space-y-3">
            {(Object.entries(PHASE_INFO) as [CyclePhase, typeof PHASE_INFO[CyclePhase]][]).map(([p, info]) => (
              <div key={p} className="glass rounded-2xl p-4 space-y-2"
                style={phase === p ? { border: `1.5px solid ${info.color}` } : {}}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: info.color }} />
                  <p className="text-sm font-bold text-1">{info.label}</p>
                  <span className="text-xs text-3 ml-auto">{info.days}</span>
                  {phase === p && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: `${info.color}22`, color: info.color }}>
                      Current
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <TrendingUp size={11} style={{ color: info.color, flexShrink: 0, marginTop: 2 }} />
                    <p className="text-xs text-2"><strong className="text-1">Workout:</strong> {info.workout}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs" style={{ color: info.color, flexShrink: 0 }}>🥗</span>
                    <p className="text-xs text-2"><strong className="text-1">Nutrition:</strong> {info.nutrition}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
