'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { saveBloodPressure, getBloodPressureHistory, deleteBloodPressure } from '@/lib/firebase/firestore'
import { BloodPressureReading } from '@/lib/types'
import { serverTimestamp } from 'firebase/firestore'
import Link from 'next/link'
import { ArrowLeft, Heart, Trash2, Plus, AlertTriangle } from 'lucide-react'

// ── Blood pressure classification (ESC/AHA) ──────────────────────────────────
function bpCategory(sys: number, dia: number): { label: string; color: string; note: string } {
  if (sys < 120 && dia < 80)  return { label: 'Normal',          color: '#10b981', note: 'Optimal range — keep it up!' }
  if (sys < 130 && dia < 80)  return { label: 'Elevated',        color: '#f59e0b', note: 'Monitor regularly. Lifestyle changes can help.' }
  if (sys < 140 || dia < 90)  return { label: 'High (Stage 1)',  color: '#f97316', note: 'Consider speaking with your GP about management.' }
  if (sys < 180 || dia < 110) return { label: 'High (Stage 2)',  color: '#ef4444', note: 'Seek medical advice — treatment likely needed.' }
  return { label: 'Hypertensive Crisis', color: '#dc2626', note: 'Seek emergency care immediately if symptomatic.' }
}

export default function BloodPressurePage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)

  // Form
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [pulse, setPulse] = useState('')
  const [context, setContext] = useState<BloodPressureReading['context']>('resting')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // History
  const [readings, setReadings] = useState<BloodPressureReading[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setAuthReady(true)
      if (!u) { router.push('/login'); return }
      setUid(u.uid)
    })
    return unsub
  }, [router])

  const loadReadings = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    const data = await getBloodPressureHistory(uid, 30)
    setReadings(data)
    setLoading(false)
  }, [uid])

  useEffect(() => {
    if (uid) loadReadings()
  }, [uid, loadReadings])

  async function handleSave() {
    if (!uid) return
    const sys = parseInt(systolic)
    const dia = parseInt(diastolic)
    if (!sys || !dia || sys < 60 || sys > 250 || dia < 40 || dia > 150) return
    setSaving(true)
    const now = new Date()
    const reading: BloodPressureReading = {
      id: now.toISOString(),
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      systolic: sys,
      diastolic: dia,
      pulse: pulse ? parseInt(pulse) : undefined,
      context,
      notes: notes.trim() || undefined,
      loggedAt: serverTimestamp() as never,
    }
    await saveBloodPressure(uid, reading)
    setSystolic('')
    setDiastolic('')
    setPulse('')
    setNotes('')
    setShowForm(false)
    setSaving(false)
    await loadReadings()
  }

  async function handleDelete(id: string) {
    if (!uid) return
    await deleteBloodPressure(uid, id)
    await loadReadings()
  }

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  // Compute averages from last 7 readings
  const recent = readings.slice(-7)
  const avgSys = recent.length ? Math.round(recent.reduce((s, r) => s + r.systolic, 0) / recent.length) : null
  const avgDia = recent.length ? Math.round(recent.reduce((s, r) => s + r.diastolic, 0) / recent.length) : null
  const latestCategory = readings.length ? bpCategory(readings[readings.length - 1].systolic, readings[readings.length - 1].diastolic) : null

  return (
    <main className="min-h-screen mesh-bg page-pad pb-28">
      <header className="page-header-bar px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl glass-elevated">
            <ArrowLeft size={16} style={{ color: 'var(--text-3)' }} />
          </Link>
          <div>
            <p className="section-label">Heart Health</p>
            <h1 className="page-title" style={{ fontSize: '1.25rem' }}>Blood Pressure</h1>
          </div>
        </div>
        <button onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
          <Plus size={14} />
          Log Reading
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4 pt-3">

        {/* Disclaimer */}
        <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={13} style={{ color: '#fca5a5', flexShrink: 0, marginTop: 2 }} />
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>
            <strong style={{ color: '#fca5a5' }}>Not medical advice.</strong> This tracker is for personal monitoring only. Always consult your GP for diagnosis and treatment.
          </p>
        </div>

        {/* Summary */}
        {avgSys !== null && avgDia !== null && (
          <div className="glass rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-3 mb-3">
              Last {recent.length} Reading{recent.length !== 1 ? 's' : ''} Average
            </p>
            <div className="flex items-end gap-3">
              <div>
                <p className="text-4xl font-black text-1">{avgSys}</p>
                <p className="text-xs text-3 mt-0.5">systolic mmHg</p>
              </div>
              <p className="text-2xl font-bold text-3 mb-2">/</p>
              <div>
                <p className="text-4xl font-black text-1">{avgDia}</p>
                <p className="text-xs text-3 mt-0.5">diastolic mmHg</p>
              </div>
              {latestCategory && (
                <span className="ml-auto self-start text-xs px-3 py-1 rounded-full font-semibold"
                  style={{ background: latestCategory.color + '20', color: latestCategory.color }}>
                  {latestCategory.label}
                </span>
              )}
            </div>
            {latestCategory && (
              <p className="text-xs mt-3" style={{ color: 'var(--text-2)' }}>{latestCategory.note}</p>
            )}
          </div>
        )}

        {/* BP Reference Guide */}
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-3 mb-3">Reference Ranges (mmHg)</p>
          <div className="space-y-1.5">
            {[
              { label: 'Normal',           range: '< 120 / < 80',   color: '#10b981' },
              { label: 'Elevated',         range: '120–129 / < 80', color: '#f59e0b' },
              { label: 'High Stage 1',     range: '130–139 / 80–89', color: '#f97316' },
              { label: 'High Stage 2',     range: '≥ 140 / ≥ 90',   color: '#ef4444' },
              { label: 'Crisis',           range: '> 180 / > 110',  color: '#dc2626' },
            ].map(({ label, range, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-xs text-1">{label}</span>
                </div>
                <span className="text-xs font-mono text-3">{range}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Log Form */}
        {showForm && (
          <div className="glass-strong rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-1 text-sm">Log Blood Pressure</h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-3 mb-1.5">Systolic *</p>
                <input type="number" value={systolic} onChange={e => setSystolic(e.target.value)}
                  placeholder="120" min={60} max={250}
                  className="input-glass w-full text-center text-lg font-bold" />
              </div>
              <div>
                <p className="text-xs text-3 mb-1.5">Diastolic *</p>
                <input type="number" value={diastolic} onChange={e => setDiastolic(e.target.value)}
                  placeholder="80" min={40} max={150}
                  className="input-glass w-full text-center text-lg font-bold" />
              </div>
              <div>
                <p className="text-xs text-3 mb-1.5">Pulse (bpm)</p>
                <input type="number" value={pulse} onChange={e => setPulse(e.target.value)}
                  placeholder="72" min={30} max={220}
                  className="input-glass w-full text-center text-lg font-bold" />
              </div>
            </div>

            {/* Live preview */}
            {systolic && diastolic && parseInt(systolic) > 60 && parseInt(diastolic) > 40 && (() => {
              const cat = bpCategory(parseInt(systolic), parseInt(diastolic))
              return (
                <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{ background: cat.color + '15', border: `1px solid ${cat.color}30` }}>
                  <p className="text-xs text-1">{cat.note}</p>
                  <span className="text-xs font-bold ml-3 shrink-0" style={{ color: cat.color }}>{cat.label}</span>
                </div>
              )
            })()}

            {/* Context */}
            <div>
              <p className="text-xs text-3 mb-2">Context</p>
              <div className="flex flex-wrap gap-2">
                {(['resting', 'post_exercise', 'stressed', 'other'] as const).map(c => (
                  <button key={c} onClick={() => setContext(c)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: context === c ? '#ef444430' : 'var(--glass-bg)',
                      color: context === c ? '#ef4444' : 'var(--text-2)',
                      border: context === c ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
                    }}>
                    {c === 'post_exercise' ? 'Post-exercise' : c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full bg-transparent text-sm outline-none resize-none input-glass rounded-xl p-3"
              style={{ color: 'var(--text-1)' }}
            />

            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 glass rounded-xl text-sm text-2">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !systolic || !diastolic}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                {saving ? 'Saving…' : 'Save Reading'}
              </button>
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-3 mb-2 px-1">
            Reading History ({readings.length})
          </p>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : readings.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center">
              <Heart size={28} className="mx-auto mb-3 text-slate-600" />
              <p className="text-sm text-2">No readings yet — log your first one above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...readings].reverse().map(r => {
                const cat = bpCategory(r.systolic, r.diastolic)
                return (
                  <div key={r.id} className="glass rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-lg font-black text-1">
                            {r.systolic}<span className="text-3 font-normal text-sm">/</span>{r.diastolic}
                            <span className="text-xs text-3 font-normal ml-1">mmHg</span>
                          </p>
                          <p className="text-xs text-3">{r.date} · {r.time} · {r.context}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                          style={{ background: cat.color + '20', color: cat.color }}>
                          {cat.label}
                        </span>
                        {r.pulse && (
                          <span className="text-xs text-3 flex items-center gap-1">
                            <Heart size={11} style={{ color: '#ef4444' }} /> {r.pulse}
                          </span>
                        )}
                        <button onClick={() => handleDelete(r.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {r.notes && (
                      <p className="text-xs text-2 mt-1.5 italic">{r.notes}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
