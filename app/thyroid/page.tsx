'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { db } from '@/lib/firebase'
import { doc, collection, addDoc, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore'
import Link from 'next/link'
import { ArrowLeft, Plus, Bell, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle } from 'lucide-react'

const VIOLET = '#7c3aed'
const TEAL   = '#14b8a6'
const AMBER  = '#f59e0b'

interface TSHEntry {
  id?: string
  date:     string
  tsh:      number    // mIU/L
  ft4?:     number    // pmol/L
  ft3?:     number    // pmol/L
  notes?:   string
}

interface FatigueLog {
  id?: string
  date:          string
  fatigueLevel:  1 | 2 | 3 | 4 | 5   // 1=exhausted, 5=energised
  brainFog:      boolean
  coldSensitive: boolean
  mood?:         number
  medicationTaken: boolean
}


const TSH_RANGES = {
  hypo:   { label: 'High (hypo)',   color: '#ef4444', min: 4.0,  max: 999 },
  normal: { label: 'Normal',        color: '#10b981', min: 0.4,  max: 4.0  },
  hyper:  { label: 'Low (hyper)',   color: AMBER,     min: 0,    max: 0.4  },
}

function tshRange(tsh: number): typeof TSH_RANGES[keyof typeof TSH_RANGES] {
  if (tsh >= 4.0)  return TSH_RANGES.hypo
  if (tsh >= 0.4)  return TSH_RANGES.normal
  return TSH_RANGES.hyper
}

function tshTrendIcon(entries: TSHEntry[]) {
  if (entries.length < 2) return null
  const diff = entries[0].tsh - entries[1].tsh
  if (diff > 0.5)   return <TrendingUp size={14} style={{ color: '#ef4444' }} />
  if (diff < -0.5)  return <TrendingDown size={14} style={{ color: '#10b981' }} />
  return <Minus size={14} style={{ color: 'var(--text-3)' }} />
}

export default function ThyroidPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [tshEntries, setTshEntries] = useState<TSHEntry[]>([])
  const [fatigueLogs, setFatigueLogs] = useState<FatigueLog[]>([])
  const [activeTab, setActiveTab] = useState<'tsh' | 'fatigue' | 'medication'>('tsh')

  // TSH form
  const [tshValue, setTshValue] = useState('')
  const [ft4Value, setFt4Value] = useState('')
  const [tshNotes, setTshNotes] = useState('')

  // Fatigue form
  const [fatigueLevel, setFatigueLevel] = useState<1|2|3|4|5>(3)
  const [brainFog, setBrainFog] = useState(false)
  const [coldSensitive, setColdSensitive] = useState(false)
  const [medicationTaken, setMedicationTaken] = useState(false)

  // Medication
  const [medName, setMedName] = useState('Levothyroxine')
  const [medDose, setMedDose] = useState('')
  const [medTime, setMedTime] = useState('07:00')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

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
    const tshRef = collection(doc(db, 'users', uid), 'tsh_log')
    const tshSnap = await getDocs(query(tshRef, orderBy('date', 'desc'), limit(12)))
    const loadedTsh: TSHEntry[] = []
    tshSnap.forEach(d => loadedTsh.push({ id: d.id, ...d.data() } as TSHEntry))
    setTshEntries(loadedTsh)

    const fatRef = collection(doc(db, 'users', uid), 'fatigue_log')
    const fatSnap = await getDocs(query(fatRef, orderBy('date', 'desc'), limit(14)))
    const loadedFat: FatigueLog[] = []
    fatSnap.forEach(d => loadedFat.push({ id: d.id, ...d.data() } as FatigueLog))
    setFatigueLogs(loadedFat)
  }, [uid])

  useEffect(() => {
    if (uid) loadData()
  }, [uid, loadData])

  async function saveTSH() {
    if (!uid || !tshValue || saving) return
    setSaving(true)
    try {
      const ref = collection(doc(db, 'users', uid), 'tsh_log')
      await addDoc(ref, {
        date:     new Date().toISOString().slice(0, 10),
        tsh:      parseFloat(tshValue),
        ft4:      ft4Value ? parseFloat(ft4Value) : null,
        notes:    tshNotes || null,
        loggedAt: Timestamp.now(),
      })
      setTshValue(''); setFt4Value(''); setTshNotes('')
      setSavedMsg('TSH saved')
      await loadData()
    } catch { /* */ }
    setSaving(false)
    setTimeout(() => setSavedMsg(''), 2000)
  }

  async function saveFatigue() {
    if (!uid || saving) return
    setSaving(true)
    try {
      const ref = collection(doc(db, 'users', uid), 'fatigue_log')
      await addDoc(ref, {
        date:            new Date().toISOString().slice(0, 10),
        fatigueLevel,
        brainFog,
        coldSensitive,
        medicationTaken,
        loggedAt:        Timestamp.now(),
      })
      setSavedMsg('Logged')
      await loadData()
    } catch { /* */ }
    setSaving(false)
    setTimeout(() => setSavedMsg(''), 2000)
  }

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const latestTSH = tshEntries[0]

  return (
    <main className="min-h-screen mesh-bg page-pad pb-28">
      <header className="page-header-bar px-4 flex items-center gap-3 h-14">
        <Link href="/dashboard" className="p-2 rounded-xl glass-elevated">
          <ArrowLeft size={16} style={{ color: 'var(--text-3)' }} />
        </Link>
        <div>
          <p className="section-label">Condition Module</p>
          <h1 className="page-title" style={{ fontSize: '1.25rem' }}>Thyroid Tracker</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 space-y-4 pt-3">

        {/* Disclaimer */}
        <div className="rounded-2xl px-3 py-2.5 flex items-start gap-2"
          style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
          <AlertCircle size={12} style={{ color: '#22d3ee', flexShrink: 0, marginTop: 2 }} />
          <p className="text-xs text-2">Tracking tool only. Never adjust medication without consulting your endocrinologist or GP.</p>
        </div>

        {/* Latest TSH summary */}
        {latestTSH && (() => {
          const range = tshRange(latestTSH.tsh)
          return (
            <div className="glass-elevated rounded-2xl p-4 space-y-2"
              style={{ border: `1.5px solid ${range.color}44` }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-3 uppercase tracking-wider">Latest TSH</p>
                <div className="flex items-center gap-1">
                  {tshTrendIcon(tshEntries)}
                </div>
              </div>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-black" style={{ color: range.color }}>{latestTSH.tsh}</p>
                <p className="text-xs text-3 pb-1">mIU/L</p>
                <span className="ml-auto text-xs px-2 py-1 rounded-full font-semibold"
                  style={{ background: `${range.color}18`, color: range.color }}>
                  {range.label}
                </span>
              </div>
              <p className="text-xs text-3">{new Date(latestTSH.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="text-xs text-2">Normal range: 0.4–4.0 mIU/L (may vary by lab — check with your GP)</p>
            </div>
          )
        })()}

        {/* Tabs */}
        <div className="glass rounded-2xl p-1 flex gap-1">
          {(['tsh', 'fatigue', 'medication'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
              style={activeTab === tab
                ? { background: `linear-gradient(135deg,${VIOLET},${TEAL})`, color: '#fff' }
                : { color: 'var(--text-2)' }}>
              {tab === 'tsh' ? 'TSH Log' : tab === 'fatigue' ? 'Fatigue' : 'Medication'}
            </button>
          ))}
        </div>

        {savedMsg && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <CheckCircle size={12} style={{ color: '#10b981' }} />
            <p className="text-xs text-1">{savedMsg}</p>
          </div>
        )}

        {/* TSH tab */}
        {activeTab === 'tsh' && (
          <div className="space-y-3">
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-1">Log blood test result</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-3 block mb-1">TSH (mIU/L) *</label>
                  <input type="number" step="0.01" value={tshValue} onChange={e => setTshValue(e.target.value)}
                    placeholder="e.g. 2.5"
                    className="w-full glass rounded-xl px-3 py-2 text-sm text-1 placeholder:text-3 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-3 block mb-1">Free T4 (pmol/L)</label>
                  <input type="number" step="0.1" value={ft4Value} onChange={e => setFt4Value(e.target.value)}
                    placeholder="optional"
                    className="w-full glass rounded-xl px-3 py-2 text-sm text-1 placeholder:text-3 outline-none" />
                </div>
              </div>
              <input type="text" value={tshNotes} onChange={e => setTshNotes(e.target.value)}
                placeholder="Notes (optional — e.g. fasting, symptoms)"
                className="w-full glass rounded-xl px-3 py-2 text-sm text-1 placeholder:text-3 outline-none" />
              <button onClick={saveTSH} disabled={saving || !tshValue}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: `linear-gradient(135deg,${VIOLET},${TEAL})` }}>
                <Plus size={12} /> Save TSH Result
              </button>
            </div>

            {/* History */}
            <p className="text-xs font-semibold text-3 uppercase tracking-wider px-1">History</p>
            {tshEntries.map(e => {
              const r = tshRange(e.tsh)
              return (
                <div key={e.id} className="glass rounded-xl px-3 py-2.5 flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-1">
                      {new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </p>
                    {e.notes && <p className="text-xs text-3 mt-0.5">{e.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: r.color }}>{e.tsh}</p>
                    <p className="text-xs text-3">mIU/L</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Fatigue tab */}
        {activeTab === 'fatigue' && (
          <div className="space-y-3">
            <div className="glass rounded-2xl p-4 space-y-4">
              <p className="text-sm font-semibold text-1">Daily energy check-in</p>

              <div>
                <label className="text-xs text-3 block mb-2">Energy level today</label>
                <div className="flex gap-2">
                  {([1,2,3,4,5] as const).map(n => (
                    <button key={n} onClick={() => setFatigueLevel(n)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                      style={fatigueLevel === n
                        ? { background: n <= 2 ? '#ef4444' : n === 3 ? AMBER : '#10b981', color: '#fff' }
                        : { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-3">Exhausted</p>
                  <p className="text-xs text-3">Energised</p>
                </div>
              </div>

              <div className="space-y-2">
                {([
                  { label: 'Brain fog today', value: brainFog, set: setBrainFog },
                  { label: 'Cold sensitivity', value: coldSensitive, set: setColdSensitive },
                  { label: 'Took medication today', value: medicationTaken, set: setMedicationTaken },
                ] as const).map(({ label, value, set }) => (
                  <div key={label} className="flex items-center justify-between">
                    <p className="text-xs text-2">{label}</p>
                    <button onClick={() => set(!value as boolean & typeof value)}
                      className="w-10 h-5 rounded-full transition-all relative"
                      style={{ background: value ? TEAL : 'var(--glass-border)' }}>
                      <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                        style={{ left: value ? 22 : 2 }} />
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={saveFatigue} disabled={saving}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: `linear-gradient(135deg,${VIOLET},${TEAL})` }}>
                {saving ? 'Saving…' : 'Log today'}
              </button>
            </div>

            {/* Fatigue history */}
            <p className="text-xs font-semibold text-3 uppercase tracking-wider px-1">This week</p>
            {fatigueLogs.slice(0, 7).map(e => (
              <div key={e.id} className="glass rounded-xl px-3 py-2 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{
                    background: e.fatigueLevel <= 2 ? 'rgba(239,68,68,0.12)' : e.fatigueLevel === 3 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                    color:      e.fatigueLevel <= 2 ? '#ef4444' : e.fatigueLevel === 3 ? AMBER : '#10b981',
                  }}>
                  {e.fatigueLevel}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-1">
                    {new Date(e.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-xs text-3">
                    {[e.brainFog && 'Brain fog', e.coldSensitive && 'Cold sensitive'].filter(Boolean).join(' · ') || 'No symptoms flagged'}
                  </p>
                </div>
                {e.medicationTaken && <CheckCircle size={12} style={{ color: TEAL }} />}
              </div>
            ))}
          </div>
        )}

        {/* Medication tab */}
        {activeTab === 'medication' && (
          <div className="space-y-3">
            <div className="glass rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Bell size={14} style={{ color: AMBER }} />
                <p className="text-sm font-semibold text-1">Medication reminder</p>
              </div>
              <p className="text-xs text-2">
                Thyroid medication (especially Levothyroxine) should be taken at the same time every day,
                ideally 30-60 minutes before food, on an empty stomach.
              </p>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-3 block mb-1">Medication name</label>
                  <input type="text" value={medName} onChange={e => setMedName(e.target.value)}
                    className="w-full glass rounded-xl px-3 py-2 text-sm text-1 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-3 block mb-1">Dose</label>
                    <input type="text" value={medDose} onChange={e => setMedDose(e.target.value)}
                      placeholder="e.g. 100mcg"
                      className="w-full glass rounded-xl px-3 py-2 text-sm text-1 placeholder:text-3 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-3 block mb-1">Reminder time</label>
                    <input type="time" value={medTime} onChange={e => setMedTime(e.target.value)}
                      className="w-full glass rounded-xl px-3 py-2 text-sm text-1 outline-none" />
                  </div>
                </div>
              </div>
              <div className="rounded-xl p-3 space-y-1"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-xs font-semibold" style={{ color: AMBER }}>Key reminders</p>
                {[
                  'Take 30-60 min before breakfast on an empty stomach',
                  'Avoid calcium, iron supplements within 4 hours',
                  'Never skip doses — half-life is 7 days',
                  'Get TSH tested 6-8 weeks after any dose change',
                ].map(r => (
                  <div key={r} className="flex items-start gap-1.5">
                    <TrendingUp size={9} style={{ color: AMBER, flexShrink: 0, marginTop: 3 }} />
                    <p className="text-xs text-2">{r}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
