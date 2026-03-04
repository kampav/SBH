'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  getGlucoseHistory, getGlucoseSettings, getNutritionHistory,
} from '@/lib/firestore'
import { DailyGlucose, GlucoseSettings, DailyNutrition } from '@/lib/types'
import { DEFAULT_GLUCOSE_SETTINGS, calcTimeInRange } from '@/lib/glucoseUtils'
import BottomNav from '@/components/layout/BottomNav'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ComposedChart, Bar, Legend,
} from 'recharts'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import Link from 'next/link'

const VIOLET = '#7c3aed'
const CYAN = '#06b6d4'
const ROSE = '#f43f5e'
const EMERALD = '#10b981'
const AMBER = '#f59e0b'

export default function GlucoseTrendsPage() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [glucoseHistory, setGlucoseHistory] = useState<DailyGlucose[]>([])
  const [nutritionHistory, setNutritionHistory] = useState<DailyNutrition[]>([])
  const [settings, setSettings] = useState<GlucoseSettings>(DEFAULT_GLUCOSE_SETTINGS)
  const [range, setRange] = useState<7 | 30>(7)
  const [chartTab, setChartTab] = useState<'glucose' | 'carbs'>('glucose')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }

      const [hist, s, nutr] = await Promise.all([
        getGlucoseHistory(user.uid, 30),
        getGlucoseSettings(user.uid),
        getNutritionHistory(user.uid, 30),
      ])

      if (!s?.consentGiven) { router.push('/glucose'); return }
      setGlucoseHistory(hist)
      setSettings({ ...DEFAULT_GLUCOSE_SETTINGS, ...s })
      setNutritionHistory(nutr)
    })
    return unsub
  }, [router])

  if (!authReady) return null

  const sliced = glucoseHistory.slice(-range)
  const allReadings = sliced.flatMap(d => d.readings)
  const tir = calcTimeInRange(allReadings, settings.targetRangeLowMmol, settings.targetRangeHighMmol)

  const glucoseChartData = sliced.map(day => {
    const r = day.readings
    const avg = r.length > 0 ? Math.round(r.reduce((s, x) => s + x.valueMmol, 0) / r.length * 10) / 10 : null
    const min = r.length > 0 ? Math.min(...r.map(x => x.valueMmol)) : null
    const max = r.length > 0 ? Math.max(...r.map(x => x.valueMmol)) : null
    return { date: day.date.slice(5), avg, min, max }
  })

  // Merge glucose + nutrition for correlation chart
  const nutritionMap: Record<string, DailyNutrition> = {}
  nutritionHistory.forEach(d => { nutritionMap[d.date] = d })
  const carbChartData = sliced.map(day => {
    const r = day.readings
    const avg = r.length > 0 ? Math.round(r.reduce((s, x) => s + x.valueMmol, 0) / r.length * 10) / 10 : null
    const carbs = nutritionMap[day.date]?.totalCarbsG ?? null
    return { date: day.date.slice(5), avgGlucose: avg, carbs }
  })

  const avgGlucoseAll = allReadings.length > 0
    ? (allReadings.reduce((s, r) => s + r.valueMmol, 0) / allReadings.length).toFixed(1)
    : '—'
  const minReading = allReadings.length > 0 ? Math.min(...allReadings.map(r => r.valueMmol)).toFixed(1) : '—'
  const maxReading = allReadings.length > 0 ? Math.max(...allReadings.map(r => r.valueMmol)).toFixed(1) : '—'

  const tooltipStyle = {
    background: 'rgba(10,8,25,0.95)',
    border: `1px solid rgba(124,58,237,0.3)`,
    borderRadius: 8,
    fontSize: 12,
    color: '#f1f5f9',
  }

  return (
    <div className="min-h-screen mesh-bg page-pad">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/glucose"
            className="w-9 h-9 glass rounded-xl flex items-center justify-center">
            <ArrowLeft size={16} style={{ color: VIOLET }} />
          </Link>
          <div>
            <h1 className="font-bold text-xl text-1">Glucose Trends</h1>
            <p className="text-xs text-3">{range}-day overview</p>
          </div>
        </div>

        {/* Range toggle */}
        <div className="glass rounded-2xl p-1 flex gap-1">
          {([7, 30] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={range === r
                ? { background: `linear-gradient(135deg,${VIOLET},${CYAN})`, color: '#fff' }
                : { color: 'var(--text-2)' }}>
              {r} days
            </button>
          ))}
        </div>

        {/* Time-in-range summary */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} style={{ color: VIOLET }} />
            <p className="text-xs font-semibold text-2 uppercase tracking-widest">Time in Range</p>
            <p className="text-xs text-3 ml-auto">{allReadings.length} readings</p>
          </div>

          <div className="flex rounded-full h-4 overflow-hidden gap-0.5">
            {tir.belowPct > 0 && (
              <div className="flex items-center justify-center text-xs font-bold text-white"
                style={{ width: `${tir.belowPct}%`, background: ROSE, minWidth: tir.belowPct > 8 ? undefined : 0 }}>
                {tir.belowPct > 8 ? `${tir.belowPct}%` : ''}
              </div>
            )}
            {tir.inRangePct > 0 && (
              <div className="flex items-center justify-center text-xs font-bold text-white"
                style={{ width: `${tir.inRangePct}%`, background: EMERALD }}>
                {tir.inRangePct > 12 ? `${tir.inRangePct}%` : ''}
              </div>
            )}
            {tir.abovePct > 0 && (
              <div className="flex items-center justify-center text-xs font-bold text-white"
                style={{ width: `${tir.abovePct}%`, background: AMBER, minWidth: tir.abovePct > 8 ? undefined : 0 }}>
                {tir.abovePct > 8 ? `${tir.abovePct}%` : ''}
              </div>
            )}
            {allReadings.length === 0 && (
              <div className="w-full" style={{ background: 'rgba(148,163,184,0.15)' }} />
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="glass rounded-xl p-2">
              <p className="font-bold text-sm" style={{ color: ROSE }}>{tir.belowPct}%</p>
              <p className="text-3">Below</p>
              <p className="text-3">&lt;{settings.targetRangeLowMmol}</p>
            </div>
            <div className="glass rounded-xl p-2" style={{ border: `1px solid rgba(16,185,129,0.2)` }}>
              <p className="font-bold text-sm" style={{ color: EMERALD }}>{tir.inRangePct}%</p>
              <p className="text-3">In range</p>
              <p className="text-3">{settings.targetRangeLowMmol}–{settings.targetRangeHighMmol}</p>
            </div>
            <div className="glass rounded-xl p-2">
              <p className="font-bold text-sm" style={{ color: AMBER }}>{tir.abovePct}%</p>
              <p className="text-3">Above</p>
              <p className="text-3">&gt;{settings.targetRangeHighMmol}</p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Average', value: avgGlucoseAll !== '—' ? `${avgGlucoseAll}` : '—', unit: settings.preferredUnit },
            { label: 'Lowest', value: minReading !== '—' ? `${minReading}` : '—', unit: settings.preferredUnit },
            { label: 'Highest', value: maxReading !== '—' ? `${maxReading}` : '—', unit: settings.preferredUnit },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-3 text-center">
              <p className="text-sm font-bold gradient-text">{s.value}</p>
              <p className="text-xs text-3">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Chart tab bar */}
        <div className="glass rounded-2xl p-1 flex gap-1">
          {(['glucose', 'carbs'] as const).map(t => (
            <button key={t} onClick={() => setChartTab(t)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={chartTab === t
                ? { background: `linear-gradient(135deg,${VIOLET},${CYAN})`, color: '#fff' }
                : { color: 'var(--text-2)' }}>
              {t === 'glucose' ? 'Glucose' : 'Carbs vs Glucose'}
            </button>
          ))}
        </div>

        {/* Glucose chart */}
        {chartTab === 'glucose' && (
          <div className="glass rounded-2xl p-4">
            <p className="text-xs font-semibold text-2 uppercase tracking-widest mb-3">
              Daily Average / Min / Max
            </p>
            {glucoseChartData.some(d => d.avg !== null) ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={glucoseChartData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.12)" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle}
                    formatter={(val: number | undefined, name: string | undefined) => [val != null ? `${val} ${settings.preferredUnit}` : '', name ?? '']}
                  />
                  <ReferenceLine y={settings.targetRangeLowMmol} stroke={EMERALD} strokeDasharray="4 2" strokeOpacity={0.6} />
                  <ReferenceLine y={settings.targetRangeHighMmol} stroke={EMERALD} strokeDasharray="4 2" strokeOpacity={0.6} />
                  <Line type="monotone" dataKey="avg" stroke={VIOLET} strokeWidth={2} dot={false} name="Avg" connectNulls />
                  <Line type="monotone" dataKey="min" stroke={CYAN} strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Min" connectNulls />
                  <Line type="monotone" dataKey="max" stroke={ROSE} strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Max" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-3 text-center py-8">No glucose data for this period</p>
            )}
            <p className="text-xs text-3 mt-2">Green dashed lines = target range ({settings.targetRangeLowMmol}–{settings.targetRangeHighMmol} mmol/L)</p>
          </div>
        )}

        {/* Carbs vs Glucose chart */}
        {chartTab === 'carbs' && (
          <div className="glass rounded-2xl p-4">
            <p className="text-xs font-semibold text-2 uppercase tracking-widest mb-3">
              Carbs vs Average Glucose
            </p>
            {carbChartData.some(d => d.avgGlucose !== null || d.carbs !== null) ? (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={carbChartData} margin={{ top: 5, right: 20, bottom: 5, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.12)" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} />
                  <YAxis yAxisId="carbs" orientation="left" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} />
                  <YAxis yAxisId="glucose" orientation="right" domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                  <Bar yAxisId="carbs" dataKey="carbs" name="Carbs (g)" fill={`rgba(6,182,212,0.35)`} radius={[2, 2, 0, 0]} />
                  <Line yAxisId="glucose" type="monotone" dataKey="avgGlucose" name={`Avg glucose (${settings.preferredUnit})`}
                    stroke={VIOLET} strokeWidth={2} dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-3 text-center py-8">Log both nutrition and glucose to see correlation</p>
            )}
          </div>
        )}

        <p className="text-xs text-3 text-center pb-2">
          Trends are for informational purposes only — not medical advice
        </p>

      </div>
      <BottomNav />
    </div>
  )
}
