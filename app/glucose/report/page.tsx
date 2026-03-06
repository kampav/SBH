'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  getGlucoseHistory, getGlucoseSettings, getHbA1cHistory,
  getNutritionHistory, getProfile,
} from '@/lib/firebase/firestore'
import {
  DailyGlucose, GlucoseSettings, HbA1cEntry, DailyNutrition, UserProfile,
} from '@/lib/types'
import { DEFAULT_GLUCOSE_SETTINGS, calcTimeInRange, estimateHbA1c } from '@/lib/health/glucoseUtils'
import { ArrowLeft, Printer, FileText, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const VIOLET = '#7c3aed'
const CYAN = '#06b6d4'
const ROSE = '#f43f5e'
const EMERALD = '#10b981'
const AMBER = '#f59e0b'

export default function GlucoseReportPage() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [summary, setSummary] = useState('')

  const [glucoseHistory, setGlucoseHistory] = useState<DailyGlucose[]>([])
  const [hba1cHistory, setHba1cHistory] = useState<HbA1cEntry[]>([])
  const [nutritionHistory, setNutritionHistory] = useState<DailyNutrition[]>([])
  const [settings, setSettings] = useState<GlucoseSettings>(DEFAULT_GLUCOSE_SETTINGS)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }

      const [hist, s, h, nutr, p] = await Promise.all([
        getGlucoseHistory(user.uid, 30),
        getGlucoseSettings(user.uid),
        getHbA1cHistory(user.uid),
        getNutritionHistory(user.uid, 30),
        getProfile(user.uid),
      ])

      if (!s?.consentGiven) { router.push('/glucose'); return }
      setGlucoseHistory(hist)
      setSettings({ ...DEFAULT_GLUCOSE_SETTINGS, ...s })
      setHba1cHistory(h)
      setNutritionHistory(nutr)
      setProfile(p)
    })
    return unsub
  }, [router])

  if (!authReady) return null

  const allReadings = glucoseHistory.flatMap(d => d.readings)
  const tir = calcTimeInRange(allReadings, settings.targetRangeLowMmol, settings.targetRangeHighMmol)
  const avgMmol = allReadings.length > 0
    ? allReadings.reduce((s, r) => s + r.valueMmol, 0) / allReadings.length
    : 0
  const estHba1c = allReadings.length >= 5 ? estimateHbA1c(avgMmol) : null
  const avgCarbs = nutritionHistory.length > 0
    ? Math.round(nutritionHistory.reduce((s, d) => s + (d.totalCarbsG ?? 0), 0) / nutritionHistory.length)
    : 0

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/glucose-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          glucoseHistory,
          hba1cHistory,
          nutritionHistory,
          settings,
          reportDateRange: { from: thirtyDaysAgo, to: today },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary)
        setGenerated(true)
      }
    } catch { /* silently fail */ }
    setGenerating(false)
  }

  return (
    <div className="min-h-screen mesh-bg page-pad print:bg-white print:min-h-0">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-4 print:max-w-none print:px-8 print:pt-4">

        {/* Header — hidden in print */}
        <div className="flex items-center gap-3 print:hidden">
          <Link href="/glucose"
            className="w-9 h-9 glass rounded-xl flex items-center justify-center">
            <ArrowLeft size={16} style={{ color: VIOLET }} />
          </Link>
          <div>
            <h1 className="font-bold text-xl text-1">Care Team Report</h1>
            <p className="text-xs text-3">Last 30 days · {thirtyDaysAgo} to {today}</p>
          </div>
          {generated && (
            <button onClick={() => window.print()}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white"
              style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})` }}>
              <Printer size={13} />
              Print / PDF
            </button>
          )}
        </div>

        {/* Print header */}
        <div className="hidden print:block border-b pb-4 mb-4" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-black">Glucose Monitoring Report</h1>
              <p className="text-sm text-gray-600">Science Based Health (SBH) App</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p><strong>{profile?.displayName ?? 'Patient'}</strong></p>
              <p>Period: {thirtyDaysAgo} to {today}</p>
              <p>Generated: {new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="glass rounded-2xl p-4 space-y-3 print:border print:rounded-none print:bg-white print:p-4" style={{ '--glass-bg': 'transparent' } as React.CSSProperties}>
          <div className="flex items-center gap-2">
            <FileText size={14} style={{ color: VIOLET }} className="print:hidden" />
            <p className="text-xs font-semibold text-2 uppercase tracking-widest print:text-gray-500">30-Day Summary</p>
          </div>

          <div className="grid grid-cols-2 gap-3 print:grid-cols-4">
            <div className="glass rounded-xl p-3 print:border print:rounded print:bg-white">
              <p className="text-xs text-3 print:text-gray-500">Avg glucose</p>
              <p className="text-lg font-bold gradient-text print:text-black">
                {avgMmol > 0 ? avgMmol.toFixed(1) : '—'} mmol/L
              </p>
            </div>
            <div className="glass rounded-xl p-3 print:border print:rounded print:bg-white">
              <p className="text-xs text-3 print:text-gray-500">Time in range</p>
              <p className="text-lg font-bold print:text-black" style={{ color: EMERALD }}>{tir.inRangePct}%</p>
              <p className="text-xs text-3">{allReadings.length} readings</p>
            </div>
            <div className="glass rounded-xl p-3 print:border print:rounded print:bg-white">
              <p className="text-xs text-3 print:text-gray-500">Est. HbA1c</p>
              <p className="text-lg font-bold print:text-black" style={{ color: AMBER }}>
                {estHba1c !== null ? `${estHba1c}%` : '—'}
              </p>
              <p className="text-xs text-3">Estimated</p>
            </div>
            <div className="glass rounded-xl p-3 print:border print:rounded print:bg-white">
              <p className="text-xs text-3 print:text-gray-500">Avg carbs/day</p>
              <p className="text-lg font-bold print:text-black" style={{ color: CYAN }}>{avgCarbs > 0 ? `${avgCarbs}g` : '—'}</p>
            </div>
          </div>

          {/* Time-in-range bar */}
          <div>
            <p className="text-xs text-3 mb-1">Time in range breakdown ({settings.targetRangeLowMmol}–{settings.targetRangeHighMmol} mmol/L)</p>
            <div className="flex rounded h-3 overflow-hidden gap-0.5">
              {tir.belowPct > 0 && <div style={{ width: `${tir.belowPct}%`, background: ROSE }} />}
              {tir.inRangePct > 0 && <div style={{ width: `${tir.inRangePct}%`, background: EMERALD }} />}
              {tir.abovePct > 0 && <div style={{ width: `${tir.abovePct}%`, background: AMBER }} />}
              {allReadings.length === 0 && <div className="w-full" style={{ background: 'rgba(148,163,184,0.15)' }} />}
            </div>
            <div className="flex gap-4 text-xs mt-1">
              <span style={{ color: ROSE }}>Below {tir.belowPct}%</span>
              <span style={{ color: EMERALD }}>In range {tir.inRangePct}%</span>
              <span style={{ color: AMBER }}>Above {tir.abovePct}%</span>
            </div>
          </div>
        </div>

        {/* HbA1c table */}
        {hba1cHistory.length > 0 && (
          <div className="glass rounded-2xl p-4 print:border print:rounded-none print:bg-white">
            <p className="text-xs font-semibold text-2 uppercase tracking-widest mb-3 print:text-gray-500">HbA1c History</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-3 border-b print:text-gray-500" style={{ borderColor: 'rgba(124,58,237,0.1)' }}>
                  <th className="text-left pb-1.5">Date</th>
                  <th className="text-left pb-1.5">HbA1c</th>
                  <th className="text-left pb-1.5">Source</th>
                </tr>
              </thead>
              <tbody>
                {hba1cHistory.map(e => (
                  <tr key={e.id} className="border-b last:border-0 print:text-black" style={{ borderColor: 'rgba(124,58,237,0.06)' }}>
                    <td className="py-1.5 text-2">{e.date}</td>
                    <td className="py-1.5 font-bold" style={{ color: AMBER }}>{e.valuePct}%</td>
                    <td className="py-1.5 text-3">{e.source === 'clinic' ? 'Clinic' : 'Self-estimated'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Generate button */}
        {!generated && (
          <button onClick={handleGenerate} disabled={generating}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})` }}>
            {generating ? 'Generating clinical summary…' : 'Generate AI Clinical Summary'}
          </button>
        )}

        {/* AI Summary */}
        {generated && summary && (
          <div className="glass rounded-2xl p-5 space-y-3 print:border print:rounded-none print:bg-white">
            <p className="text-xs font-semibold text-2 uppercase tracking-widest print:text-gray-500">
              AI Clinical Summary
            </p>
            <div className="text-sm text-2 leading-relaxed whitespace-pre-line print:text-black">
              {summary}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="rounded-2xl p-4 space-y-2 print:border print:rounded-none"
          style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)' }}>
          <div className="flex items-center gap-2 print:hidden">
            <AlertTriangle size={12} style={{ color: ROSE }} />
            <p className="text-xs font-semibold" style={{ color: ROSE }}>Disclaimer</p>
          </div>
          <p className="text-xs text-2 leading-relaxed print:text-black">
            This report was auto-generated from patient self-monitoring data and is for informational purposes only.
            It does not constitute medical advice and should not be used as the sole basis for clinical decision-making.
            Always consult a qualified healthcare professional.
          </p>
        </div>

      </div>
    </div>
  )
}
