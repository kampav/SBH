'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getMeasurements, saveMeasurement, getProfile } from '@/lib/firebase/firestore'
import {
  calcBodyFatPct, getBodyFatCategory, calcBMI, getBMICategory,
  calcLeanMassKg, calcFatMassKg, calcWaistToHeightRatio, getWaistToHeightRisk,
  calcIdealWeightKg,
} from '@/lib/health/bodyUtils'
import type { BodyMeasurement, UserProfile } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft, Ruler } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ── helpers ───────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10) }

// ── component ─────────────────────────────────────────────────────────────────

export default function BodyPage() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [uid, setUid]             = useState('')
  const [profile, setProfile]     = useState<UserProfile | null>(null)
  const [history, setHistory]     = useState<BodyMeasurement[]>([])
  const [saving, setSaving]       = useState(false)
  const [tab, setTab]             = useState<'measure' | 'history'>('measure')

  // form
  const [formDate,   setFormDate]   = useState(todayStr())
  const [formWaist,  setFormWaist]  = useState('')
  const [formNeck,   setFormNeck]   = useState('')
  const [formHips,   setFormHips]   = useState('')
  const [formChest,  setFormChest]  = useState('')
  const [formBicep,  setFormBicep]  = useState('')
  const [formNotes,  setFormNotes]  = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      setUid(user.uid)
      const [p, m] = await Promise.all([getProfile(user.uid), getMeasurements(user.uid, 30)])
      setProfile(p)
      setHistory(m)
    })
    return unsub
  }, [router])

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  // ── derived ────────────────────────────────────────────────────────────────

  const latest = history.length ? history[history.length - 1] : null
  const waist  = parseFloat(formWaist || String(latest?.waistCm ?? 0))
  const neck   = parseFloat(formNeck  || String(latest?.neckCm  ?? 0))
  const hips   = parseFloat(formHips  || String(latest?.hipsCm  ?? 0))
  const sex    = profile?.sex ?? 'male'
  const heightCm = profile?.heightCm ?? 170
  const weightKg = profile?.weightKg ?? 80

  const bfPct   = waist && neck ? calcBodyFatPct(sex, heightCm, waist, neck, hips || undefined) : null
  const bmi     = calcBMI(weightKg, heightCm)
  const bmiCat  = getBMICategory(bmi)
  const bfCat   = bfPct != null ? getBodyFatCategory(bfPct, sex) : null
  const whr     = waist ? calcWaistToHeightRatio(waist, heightCm) : null
  const whrRisk = whr ? getWaistToHeightRisk(whr) : null
  const ideal   = calcIdealWeightKg(sex, heightCm)
  const leanKg  = bfPct != null ? calcLeanMassKg(weightKg, bfPct) : null
  const fatKg   = bfPct != null ? calcFatMassKg(weightKg, bfPct) : null

  const chartData = history.map(m => ({
    date:  m.date.slice(5),
    waist: m.waistCm,
    neck:  m.neckCm,
    hips:  m.hipsCm ?? null,
  }))

  // ── actions ────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!uid || !formWaist || !formNeck) return
    setSaving(true)
    try {
      const m: BodyMeasurement = {
        date:     formDate,
        chestCm:  parseFloat(formChest) || 0,
        waistCm:  parseFloat(formWaist),
        neckCm:   parseFloat(formNeck),
        hipsCm:   formHips ? parseFloat(formHips) : undefined,
        bicepCm:  formBicep ? parseFloat(formBicep) : undefined,
        notes:    formNotes.trim() || undefined,
        loggedAt: new Date() as unknown as import('@/lib/types').FirestoreTimestamp,
      }
      await saveMeasurement(uid, m)
      const updated = await getMeasurements(uid, 30)
      setHistory(updated)
      setFormNotes('')
      setTab('history')
    } finally {
      setSaving(false)
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen mesh-bg page-pad pb-24">
      <header className="page-header-bar px-4 flex items-center gap-3 h-14">
        <Link href="/metrics" className="p-2 rounded-xl glass-elevated">
          <ArrowLeft size={18} style={{ color: 'var(--text-2)' }} />
        </Link>
        <div className="flex items-center gap-2">
          <Ruler size={16} className="text-violet-400" />
          <h1 className="page-title" style={{fontSize:'1.25rem'}}>Body Composition</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-3 pt-4">

        {/* BMI card — always visible */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-2 uppercase tracking-widest">BMI</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: bmiCat.color + '20', color: bmiCat.color }}>
              {bmiCat.label}
            </span>
          </div>
          <div className="flex items-end gap-3 mb-2">
            <p className="text-4xl font-bold" style={{ color: bmiCat.color }}>{bmi}</p>
            <p className="text-sm text-2 mb-1">kg/m²</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-2 mt-3">
            <span>Ideal weight: {ideal.low}–{ideal.high} kg</span>
            <span>Current: {weightKg} kg</span>
          </div>
          <p className="text-xs text-3 mt-2">{bmiCat.recommendation}</p>
        </div>

        {/* Body fat + measurements cards (if data available) */}
        {bfPct != null && bfCat && (
          <div className="grid grid-cols-2 gap-2">
            <div className="glass rounded-2xl p-3 text-center">
              <p className="text-xs text-2 mb-1">Body Fat</p>
              <p className="text-2xl font-bold" style={{ color: bfCat.color }}>{bfPct}%</p>
              <p className="text-xs mt-0.5" style={{ color: bfCat.color }}>{bfCat.label}</p>
            </div>
            <div className="glass rounded-2xl p-3 text-center">
              <p className="text-xs text-2 mb-1">Lean Mass</p>
              <p className="text-2xl font-bold text-cyan-400">{leanKg}kg</p>
              <p className="text-xs text-3 mt-0.5">Fat: {fatKg}kg</p>
            </div>
          </div>
        )}

        {whr && whrRisk && (
          <div className="glass rounded-2xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-2 uppercase tracking-widest">Waist-to-Height Ratio</p>
              <p className="text-xs text-3 mt-0.5">Target: &lt; 0.5 for good cardiometabolic health</p>
            </div>
            <div className="text-right">
              <p className="font-bold" style={{ color: whrRisk.color }}>{whr}</p>
              <p className="text-xs" style={{ color: whrRisk.color }}>{whrRisk.label}</p>
            </div>
          </div>
        )}

        {/* Chart */}
        {history.length > 1 && (
          <div className="glass rounded-2xl p-4">
            <p className="text-xs font-semibold text-2 uppercase tracking-widest mb-3">Measurements Trend (cm)</p>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#111B2E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 12 }} />
                <Line type="monotone" dataKey="waist" stroke="#f43f5e" dot={false} strokeWidth={2} name="Waist" />
                <Line type="monotone" dataKey="neck"  stroke="#06b6d4" dot={false} strokeWidth={2} name="Neck" />
                <Line type="monotone" dataKey="hips"  stroke="#7c3aed" dot={false} strokeWidth={2} name="Hips" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabs */}
        <div className="glass rounded-2xl flex overflow-hidden">
          {(['measure', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-sm font-semibold capitalize transition-colors"
              style={{ background: tab === t ? '#7c3aed22' : 'transparent', color: tab === t ? '#7c3aed' : 'var(--text-2)' }}>
              {t === 'measure' ? '+ Log Measurements' : 'History'}
            </button>
          ))}
        </div>

        {/* LOG TAB */}
        {tab === 'measure' && (
          <div className="glass rounded-2xl p-4 space-y-4">
            <div>
              <label className="text-xs text-2 block mb-1">Date</label>
              <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                className="w-full glass-dark rounded-xl px-3 py-2.5 text-sm text-1 border border-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Waist (cm) *', formWaist, setFormWaist],
                ['Neck (cm) *',  formNeck,  setFormNeck],
                ['Hips (cm)',    formHips,  setFormHips],
                ['Chest (cm)',   formChest, setFormChest],
                ['Bicep (cm)',   formBicep, setFormBicep],
              ].map(([label, val, setter]) => (
                <div key={label as string}>
                  <label className="text-xs text-2 block mb-1">{label as string}</label>
                  <input type="number" step="0.1" min="0" placeholder="cm"
                    value={val as string}
                    onChange={e => (setter as (v: string) => void)(e.target.value)}
                    className="w-full glass-dark rounded-xl px-3 py-2.5 text-sm text-1 border border-white/10" />
                </div>
              ))}
            </div>
            {/* Live body fat preview */}
            {bfPct != null && (
              <div className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                style={{ background: 'rgba(124,58,237,0.12)' }}>
                <span className="text-sm text-2">Estimated body fat</span>
                <span className="font-bold text-violet-400">{bfPct}%</span>
              </div>
            )}
            <div>
              <label className="text-xs text-2 block mb-1">Notes (optional)</label>
              <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)}
                rows={2} placeholder="e.g. morning, before exercise…"
                className="w-full glass-dark rounded-xl px-3 py-2.5 text-sm text-1 border border-white/10 resize-none" />
            </div>
            <button onClick={handleSave} disabled={saving || !formWaist || !formNeck}
              className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
              {saving ? 'Saving…' : 'Log Measurements'}
            </button>
            <p className="text-xs text-3 text-center">
              Uses the US Navy circumference method (±3–4% accuracy). Waist &amp; neck required.
            </p>
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center">
                <Ruler size={32} className="mx-auto mb-3 text-violet-400 opacity-50" />
                <p className="text-sm text-2">No measurements yet</p>
              </div>
            ) : [...history].reverse().map(m => (
              <div key={m.date} className="glass rounded-2xl p-4 space-y-1">
                <p className="text-sm font-semibold text-1">{m.date}</p>
                <div className="flex flex-wrap gap-3 text-xs text-2">
                  <span>Waist: {m.waistCm}cm</span>
                  <span>Neck: {m.neckCm}cm</span>
                  {m.hipsCm  && <span>Hips: {m.hipsCm}cm</span>}
                  {m.chestCm > 0 && <span>Chest: {m.chestCm}cm</span>}
                  {m.bicepCm && <span>Bicep: {m.bicepCm}cm</span>}
                </div>
                {m.notes && <p className="text-xs text-3">{m.notes}</p>}
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-3 px-4">
          Body composition estimates are informational only. Consult a healthcare professional for clinical assessment.
        </p>
      </div>
    </main>
  )
}
