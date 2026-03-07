'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  getGlucoseSettings, saveGlucoseSettings,
  getDailyGlucose, saveGlucoseReading, deleteGlucoseReading,
  getHbA1cHistory, saveHbA1c, deleteHbA1c,
  getGlucoseHistory,
} from '@/lib/firebase/firestore'
import {
  GlucoseReading, GlucoseSettings, HbA1cEntry, DailyGlucose,
} from '@/lib/types'
import {
  DEFAULT_GLUCOSE_SETTINGS, mgdlToMmol, mmolToMgdl,
  calcTimeInRange, glucoseColor, contextLabel, estimateHbA1c,
} from '@/lib/health/glucoseUtils'
import GlucoseConsentModal from '@/components/glucose/GlucoseConsentModal'
import BottomNav from '@/components/layout/BottomNav'
import {
  TrendingUp, FileText, Trash2, ChevronRight,
  Settings, AlertTriangle, Info, Check,
} from 'lucide-react'
import Link from 'next/link'

const VIOLET = '#7c3aed'
const CYAN = '#06b6d4'
const ROSE = '#f43f5e'
const EMERALD = '#10b981'
const AMBER = '#f59e0b'

type Tab = 'log' | 'hba1c' | 'alerts'

export default function GlucosePage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)

  const [settings, setSettings] = useState<GlucoseSettings>(DEFAULT_GLUCOSE_SETTINGS)
  const [showConsent, setShowConsent] = useState(false)
  const [todayGlucose, setTodayGlucose] = useState<DailyGlucose | null>(null)
  const [hba1cHistory, setHba1cHistory] = useState<HbA1cEntry[]>([])
  const [estimatedHbA1c, setEstimatedHbA1c] = useState<number | null>(null)

  const [tab, setTab] = useState<Tab>('log')

  // Log reading form
  const [readingValue, setReadingValue] = useState('')
  const [readingContext, setReadingContext] = useState<GlucoseReading['context']>('post_meal_2h')
  const [readingNotes, setReadingNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Nudge
  const [nudge, setNudge] = useState<{ nudge: string; actionItems: string[]; urgency: string } | null>(null)
  const [nudgeLoading, setNudgeLoading] = useState(false)

  // HbA1c form
  const [hba1cValue, setHba1cValue] = useState('')
  const [hba1cDate, setHba1cDate] = useState(new Date().toISOString().slice(0, 10))
  const [hba1cSource, setHba1cSource] = useState<'clinic' | 'estimated'>('clinic')
  const [savingHba1c, setSavingHba1c] = useState(false)

  // Alerts form (local state mirrors settings until saved)
  const [alertHypo, setAlertHypo] = useState('3.9')
  const [alertHyper, setAlertHyper] = useState('10.0')
  const [alertCarbBudget, setAlertCarbBudget] = useState('130')
  const [alertUnit, setAlertUnit] = useState<'mmol/L' | 'mg/dL'>('mmol/L')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      setUid(user.uid)

      const [s, g, h, hist] = await Promise.all([
        getGlucoseSettings(user.uid),
        getDailyGlucose(user.uid, today),
        getHbA1cHistory(user.uid),
        getGlucoseHistory(user.uid, 30),
      ])

      if (!s?.consentGiven) {
        setShowConsent(true)
      } else {
        const merged = { ...DEFAULT_GLUCOSE_SETTINGS, ...s }
        setSettings(merged)
        setAlertHypo(String(merged.hypoThresholdMmol))
        setAlertHyper(String(merged.hyperThresholdMmol))
        setAlertCarbBudget(String(merged.dailyCarbBudgetG))
        setAlertUnit(merged.preferredUnit)
      }

      if (g) setTodayGlucose(g)
      setHba1cHistory(h)

      // Compute estimated HbA1c from 30-day average
      const allReadings = hist.flatMap(d => d.readings)
      if (allReadings.length >= 5) {
        const avg = allReadings.reduce((s, r) => s + r.valueMmol, 0) / allReadings.length
        setEstimatedHbA1c(estimateHbA1c(avg))
      }
    })
    return unsub
  }, [router, today])

  if (!authReady) return null

  const readings = todayGlucose?.readings ?? []
  const sortedReadings = [...readings].sort((a, b) => a.time.localeCompare(b.time))
  const tir = calcTimeInRange(readings, settings.targetRangeLowMmol, settings.targetRangeHighMmol)

  async function handleLogReading() {
    if (!uid || !readingValue) return
    const raw = Number(readingValue)
    if (isNaN(raw) || raw <= 0) return

    const mmol = settings.preferredUnit === 'mg/dL' ? mgdlToMmol(raw) : raw
    const reading: GlucoseReading = {
      id: Date.now().toString(),
      time: new Date().toTimeString().slice(0, 5),
      valueMmol: mmol,
      context: readingContext,
      ...(readingNotes ? { notes: readingNotes } : {}),
    }

    setSaving(true)
    await saveGlucoseReading(uid, today, reading)
    setTodayGlucose(prev => ({
      date: today,
      readings: [...(prev?.readings ?? []), reading],
    }))
    setReadingValue('')
    setReadingNotes('')
    setSaving(false)

    // Fetch nudge if out of range
    const isOutOfRange = mmol < settings.hypoThresholdMmol || mmol > settings.hyperThresholdMmol
    if (isOutOfRange) {
      setNudgeLoading(true)
      try {
        const res = await fetch('/api/glucose-nudge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reading, settings }),
        })
        if (res.ok) setNudge(await res.json())
      } catch { /* silently fail */ }
      setNudgeLoading(false)
    } else {
      setNudge(null)
    }
  }

  async function handleDeleteReading(readingId: string) {
    if (!uid) return
    await deleteGlucoseReading(uid, today, readingId)
    setTodayGlucose(prev => prev
      ? { ...prev, readings: prev.readings.filter(r => r.id !== readingId) }
      : null
    )
  }

  async function handleSaveHbA1c() {
    if (!uid || !hba1cValue) return
    const val = Number(hba1cValue)
    if (isNaN(val) || val < 3 || val > 20) return
    setSavingHba1c(true)
    const entry: HbA1cEntry = {
      id: Date.now().toString(),
      date: hba1cDate,
      valuePct: val,
      source: hba1cSource,
      loggedAt: new Date() as unknown as import('@/lib/types').FirestoreTimestamp,
    }
    await saveHbA1c(uid, entry)
    setHba1cHistory(prev => [entry, ...prev])
    setHba1cValue('')
    setSavingHba1c(false)
  }

  async function handleDeleteHbA1c(id: string) {
    if (!uid) return
    await deleteHbA1c(uid, id)
    setHba1cHistory(prev => prev.filter(e => e.id !== id))
  }

  async function handleSaveSettings() {
    if (!uid) return
    const mmolHypo = alertUnit === 'mg/dL' ? mgdlToMmol(Number(alertHypo)) : Number(alertHypo)
    const mmolHyper = alertUnit === 'mg/dL' ? mgdlToMmol(Number(alertHyper)) : Number(alertHyper)
    setSavingSettings(true)
    const updated: GlucoseSettings = {
      ...settings,
      hypoThresholdMmol: mmolHypo,
      hyperThresholdMmol: mmolHyper,
      dailyCarbBudgetG: Number(alertCarbBudget),
      preferredUnit: alertUnit,
    }
    await saveGlucoseSettings(uid, updated)
    setSettings(updated)
    setSavingSettings(false)
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  const displayVal = (mmol: number) => {
    if (settings.preferredUnit === 'mg/dL') return `${mmolToMgdl(mmol)}`
    return mmol.toFixed(1)
  }

  return (
    <div className="min-h-screen mesh-bg page-pad">
      <header className="page-header-bar px-4 flex items-center justify-between h-14">
        <div>
          <p className="section-label">Blood sugar tracking</p>
          <h1 className="page-title" style={{fontSize:'1.25rem'}}>Glucose</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/glucose/trends"
            className="w-9 h-9 glass-elevated rounded-xl flex items-center justify-center card-hover">
            <TrendingUp size={16} style={{ color: VIOLET }} />
          </Link>
          <Link href="/glucose/report"
            className="w-9 h-9 glass-elevated rounded-xl flex items-center justify-center card-hover">
            <FileText size={16} style={{ color: CYAN }} />
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-4 space-y-4">

        {/* Tab bar */}
        <div className="glass-elevated rounded-2xl p-1 flex gap-1">
          {(['log', 'hba1c', 'alerts'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={tab === t
                ? { background: `linear-gradient(135deg,${VIOLET},${CYAN})`, color: '#fff' }
                : { color: 'var(--text-2)' }}>
              {t === 'log' ? 'Log' : t === 'hba1c' ? 'HbA1c' : 'Alerts'}
            </button>
          ))}
        </div>

        {/* ── LOG TAB ──────────────────────────────────────────── */}
        {tab === 'log' && (
          <div className="space-y-3">

            {/* Time-in-range */}
            {readings.length > 0 && (
              <div className="glass rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-2 uppercase tracking-widest">Today&apos;s Range</p>
                  <p className="text-xs text-3">{readings.length} reading{readings.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex rounded-full h-3 overflow-hidden gap-0.5">
                  {tir.belowPct > 0 && (
                    <div style={{ width: `${tir.belowPct}%`, background: ROSE }} />
                  )}
                  {tir.inRangePct > 0 && (
                    <div style={{ width: `${tir.inRangePct}%`, background: EMERALD }} />
                  )}
                  {tir.abovePct > 0 && (
                    <div style={{ width: `${tir.abovePct}%`, background: AMBER }} />
                  )}
                  {tir.total === 0 && (
                    <div style={{ width: '100%', background: 'rgba(148,163,184,0.2)' }} />
                  )}
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: ROSE }}>Below {tir.belowPct}%</span>
                  <span style={{ color: EMERALD }}>In range {tir.inRangePct}%</span>
                  <span style={{ color: AMBER }}>Above {tir.abovePct}%</span>
                </div>
              </div>
            )}

            {/* Today's readings list */}
            {sortedReadings.length > 0 && (
              <div className="glass rounded-2xl p-4 space-y-2">
                <p className="text-xs font-semibold text-2 uppercase tracking-widest mb-1">Today&apos;s Readings</p>
                {sortedReadings.map(r => {
                  const col = glucoseColor(r.valueMmol, settings)
                  return (
                    <div key={r.id} className="flex items-center justify-between py-1.5 border-b last:border-0"
                      style={{ borderColor: 'rgba(124,58,237,0.1)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col }} />
                        <div>
                          <p className="text-sm font-bold" style={{ color: col }}>
                            {displayVal(r.valueMmol)} {settings.preferredUnit}
                          </p>
                          <p className="text-xs text-3">{r.time} · {contextLabel(r.context)}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteReading(r.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                        style={{ color: ROSE }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add reading form */}
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-2 uppercase tracking-widest">Log Reading</p>

              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    step="0.1"
                    placeholder={settings.preferredUnit === 'mg/dL' ? 'e.g. 120' : 'e.g. 6.5'}
                    value={readingValue}
                    onChange={e => setReadingValue(e.target.value)}
                    className="input-glass w-full rounded-xl px-3 py-2.5 text-sm text-1"
                  />
                </div>
                <div className="flex-shrink-0 flex items-center px-2.5 rounded-xl text-xs font-medium text-2 glass">
                  {settings.preferredUnit}
                </div>
              </div>

              <select value={readingContext} onChange={e => setReadingContext(e.target.value as GlucoseReading['context'])}
                className="input-glass w-full rounded-xl px-3 py-2.5 text-sm text-1">
                <option value="fasting">Fasting</option>
                <option value="pre_meal">Pre-meal</option>
                <option value="post_meal_1h">1 hour post-meal</option>
                <option value="post_meal_2h">2 hours post-meal</option>
                <option value="bedtime">Bedtime</option>
                <option value="other">Other</option>
              </select>

              <input
                type="text"
                placeholder="Notes (optional)"
                value={readingNotes}
                onChange={e => setReadingNotes(e.target.value)}
                className="input-glass w-full rounded-xl px-3 py-2.5 text-sm text-1"
              />

              <button onClick={handleLogReading} disabled={saving || !readingValue}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                style={{ background: `linear-gradient(135deg,${EMERALD},#059669)` }}>
                {saving ? 'Saving…' : 'Log Reading'}
              </button>
            </div>

            {/* AI nudge card */}
            {nudgeLoading && (
              <div className="glass rounded-2xl p-4 flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                <p className="text-xs text-2">Getting personalised guidance…</p>
              </div>
            )}
            {nudge && !nudgeLoading && (
              <div className="rounded-2xl p-4 space-y-3"
                style={{
                  background: nudge.urgency === 'high' ? 'rgba(244,63,94,0.08)' : 'rgba(245,158,11,0.08)',
                  border: `1px solid ${nudge.urgency === 'high' ? 'rgba(244,63,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
                }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} style={{ color: nudge.urgency === 'high' ? ROSE : AMBER, flexShrink: 0 }} />
                    <p className="text-sm font-medium text-1">{nudge.nudge}</p>
                  </div>
                  <button onClick={() => setNudge(null)} className="text-xs text-3 flex-shrink-0">✕</button>
                </div>
                {nudge.actionItems?.length > 0 && (
                  <ul className="space-y-1">
                    {nudge.actionItems.map((item, i) => (
                      <li key={i} className="text-xs text-2 flex items-start gap-1.5">
                        <ChevronRight size={10} className="mt-0.5 flex-shrink-0" style={{ color: CYAN }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-3 flex items-center gap-1">
                  <Info size={10} />
                  Informational only — consult your healthcare team
                </p>
              </div>
            )}

            <p className="text-xs text-3 text-center pb-2">
              All readings are for personal tracking only — not medical advice
            </p>
          </div>
        )}

        {/* ── HBA1C TAB ────────────────────────────────────────── */}
        {tab === 'hba1c' && (
          <div className="space-y-3">

            {/* Estimated HbA1c */}
            <div className="glass rounded-2xl p-4 space-y-1">
              <p className="text-xs font-semibold text-2 uppercase tracking-widest">30-Day Estimate</p>
              {estimatedHbA1c !== null ? (
                <>
                  <p className="text-3xl font-bold gradient-text">{estimatedHbA1c}%</p>
                  <p className="text-xs text-3">Estimated HbA1c — calculated from recent glucose average</p>
                  <p className="text-xs mt-1 px-2 py-1 rounded-lg inline-block"
                    style={{ background: 'rgba(245,158,11,0.1)', color: AMBER }}>
                    Not a clinical measurement — verify with your lab
                  </p>
                </>
              ) : (
                <p className="text-sm text-3">Log at least 5 glucose readings to see your estimated HbA1c</p>
              )}
            </div>

            {/* Manual clinic entry */}
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-2 uppercase tracking-widest">Add Clinic Reading</p>

              <div className="flex gap-2">
                <input type="number" step="0.1" min="3" max="20"
                  placeholder="e.g. 7.2"
                  value={hba1cValue}
                  onChange={e => setHba1cValue(e.target.value)}
                  className="input-glass flex-1 rounded-xl px-3 py-2.5 text-sm text-1"
                />
                <span className="flex items-center px-3 text-xs text-2 glass rounded-xl">%</span>
              </div>

              <input type="date" value={hba1cDate}
                onChange={e => setHba1cDate(e.target.value)}
                className="input-glass w-full rounded-xl px-3 py-2.5 text-sm text-1"
              />

              <div className="flex gap-2">
                {(['clinic', 'estimated'] as const).map(src => (
                  <button key={src} onClick={() => setHba1cSource(src)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={hba1cSource === src
                      ? { background: `linear-gradient(135deg,${VIOLET},${CYAN})`, color: '#fff' }
                      : { color: 'var(--text-2)', background: 'rgba(124,58,237,0.05)' }}>
                    {src === 'clinic' ? 'Clinic result' : 'Self-estimated'}
                  </button>
                ))}
              </div>

              <button onClick={handleSaveHbA1c} disabled={savingHba1c || !hba1cValue}
                className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})` }}>
                {savingHba1c ? 'Saving…' : 'Save HbA1c'}
              </button>
            </div>

            {/* History */}
            {hba1cHistory.length > 0 && (
              <div className="glass rounded-2xl p-4 space-y-2">
                <p className="text-xs font-semibold text-2 uppercase tracking-widest mb-1">History</p>
                {hba1cHistory.map(e => (
                  <div key={e.id} className="flex items-center justify-between py-1.5 border-b last:border-0"
                    style={{ borderColor: 'rgba(124,58,237,0.1)' }}>
                    <div>
                      <p className="text-sm font-bold gradient-text">{e.valuePct}%</p>
                      <p className="text-xs text-3">{e.date} · {e.source === 'clinic' ? 'Clinic' : 'Estimated'}</p>
                    </div>
                    <button onClick={() => handleDeleteHbA1c(e.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg opacity-40 hover:opacity-100"
                      style={{ color: ROSE }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-3 text-center pb-2">
              HbA1c estimates use the Nathan formula — for reference only
            </p>
          </div>
        )}

        {/* ── ALERTS TAB ───────────────────────────────────────── */}
        {tab === 'alerts' && (
          <div className="space-y-3">

            <div className="glass rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Settings size={14} style={{ color: VIOLET }} />
                <p className="text-xs font-semibold text-2 uppercase tracking-widest">Alert Thresholds</p>
              </div>

              {/* Unit toggle */}
              <div>
                <p className="text-xs text-3 mb-1.5">Glucose unit</p>
                <div className="flex gap-2">
                  {(['mmol/L', 'mg/dL'] as const).map(u => (
                    <button key={u} onClick={() => setAlertUnit(u)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={alertUnit === u
                        ? { background: `linear-gradient(135deg,${VIOLET},${CYAN})`, color: '#fff' }
                        : { color: 'var(--text-2)', background: 'rgba(124,58,237,0.05)' }}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hypo threshold */}
              <div>
                <label className="text-xs text-2 block mb-1.5">
                  Hypo alert below ({alertUnit})
                </label>
                <input type="number" step="0.1" value={alertHypo}
                  onChange={e => setAlertHypo(e.target.value)}
                  className="input-glass w-full rounded-xl px-3 py-2.5 text-sm text-1"
                />
                <p className="text-xs text-3 mt-1">Default: {alertUnit === 'mmol/L' ? '3.9 mmol/L' : '70 mg/dL'}</p>
              </div>

              {/* Hyper threshold */}
              <div>
                <label className="text-xs text-2 block mb-1.5">
                  Hyper alert above ({alertUnit})
                </label>
                <input type="number" step="0.1" value={alertHyper}
                  onChange={e => setAlertHyper(e.target.value)}
                  className="input-glass w-full rounded-xl px-3 py-2.5 text-sm text-1"
                />
                <p className="text-xs text-3 mt-1">Default: {alertUnit === 'mmol/L' ? '10.0 mmol/L' : '180 mg/dL'}</p>
              </div>

              {/* Daily carb budget */}
              <div>
                <label className="text-xs text-2 block mb-1.5">Daily carb budget (grams)</label>
                <input type="number" step="5" value={alertCarbBudget}
                  onChange={e => setAlertCarbBudget(e.target.value)}
                  className="input-glass w-full rounded-xl px-3 py-2.5 text-sm text-1"
                />
                <p className="text-xs text-3 mt-1">ADA guideline: 130g net carbs/day for T2DM</p>
              </div>

              <button onClick={handleSaveSettings} disabled={savingSettings}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})` }}>
                {settingsSaved ? <><Check size={14} /> Saved</> : savingSettings ? 'Saving…' : 'Save Settings'}
              </button>
            </div>

            <div className="rounded-2xl p-4 space-y-2"
              style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={12} style={{ color: ROSE }} />
                <p className="text-xs font-semibold" style={{ color: ROSE }}>Important</p>
              </div>
              <p className="text-xs text-2 leading-relaxed">
                These thresholds trigger in-app nudges only. This app does not send push notifications.
                Nudges are informational lifestyle suggestions — never medication advice.
                Always discuss your glucose targets with your healthcare team.
              </p>
            </div>

            <div className="glass rounded-2xl p-4 space-y-1">
              <p className="text-xs font-semibold text-2 uppercase tracking-widest mb-2">Quick Reference</p>
              <div className="space-y-1.5 text-xs text-2">
                <div className="flex justify-between">
                  <span>Non-diabetic fasting:</span>
                  <span className="text-1">4.0–5.9 mmol/L</span>
                </div>
                <div className="flex justify-between">
                  <span>Non-diabetic post-meal:</span>
                  <span className="text-1">Under 7.8 mmol/L</span>
                </div>
                <div className="flex justify-between">
                  <span>T2DM target fasting:</span>
                  <span className="text-1">4.0–7.0 mmol/L</span>
                </div>
                <div className="flex justify-between">
                  <span>T2DM target post-meal:</span>
                  <span className="text-1">Under 8.5 mmol/L</span>
                </div>
              </div>
              <p className="text-xs text-3 pt-1">Source: NICE NG28 guidelines. Targets vary — discuss with your team.</p>
            </div>

          </div>
        )}

      </div>

      {showConsent && (
        <GlucoseConsentModal
          onAccept={async () => {
            if (!uid) return
            const newSettings: GlucoseSettings = { ...DEFAULT_GLUCOSE_SETTINGS, consentGiven: true, consentDate: today }
            await saveGlucoseSettings(uid, newSettings)
            setSettings(newSettings)
            setAlertHypo(String(newSettings.hypoThresholdMmol))
            setAlertHyper(String(newSettings.hyperThresholdMmol))
            setAlertCarbBudget(String(newSettings.dailyCarbBudgetG))
            setShowConsent(false)
          }}
          onDecline={() => router.push('/dashboard')}
        />
      )}

      <BottomNav />
    </div>
  )
}
