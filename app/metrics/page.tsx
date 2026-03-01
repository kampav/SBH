'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { getProfile, getMetrics, saveMetric } from '@/lib/firestore'
import { calcBMI, getBMICategory, movingAverage, getWeightAlert } from '@/lib/calculations'
import { DailyMetric } from '@/lib/types'
import { serverTimestamp } from 'firebase/firestore'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function MetricsPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [targetWeight, setTargetWeight] = useState<number>(70)
  const [metrics, setMetrics] = useState<DailyMetric[]>([])
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [range, setRange] = useState<7 | 30 | 90>(30)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      setUid(user.uid)
      const p = await getProfile(user.uid)
      if (p) setTargetWeight(p.targetWeightKg)
      const m = await getMetrics(user.uid, 90)
      setMetrics(m)
    })
    return unsub
  }, [router])

  async function logWeight() {
    if (!uid || !weight) return
    const kg = parseFloat(weight)
    if (isNaN(kg)) return
    setSaving(true)
    const date = new Date().toISOString().slice(0, 10)
    const metric: DailyMetric = {
      date,
      weightKg: kg,
      bmi: calcBMI(kg, 165), // will use profile height in future
      notes,
      loggedAt: serverTimestamp(),
    }
    await saveMetric(uid, metric)
    setMetrics(prev => [...prev, metric].sort((a, b) => a.date.localeCompare(b.date)))
    setWeight('')
    setNotes('')
    setSaving(false)
  }

  const displayed = metrics.slice(-range)
  const weights = displayed.map(m => m.weightKg)
  const avgWeights = movingAverage(weights)
  const chartData = displayed.map((m, i) => ({
    date: m.date.slice(5), // MM-DD
    weight: m.weightKg,
    avg: avgWeights[i],
  }))

  const latest = metrics[metrics.length - 1]
  const alert = metrics.length >= 2
    ? getWeightAlert((latest.weightKg - (metrics[metrics.length - 8]?.weightKg ?? latest.weightKg)) / 1)
    : null

  if (!authReady) return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center">
      <p className="text-slate-400">Loading...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4 flex items-center justify-between">
        <h1 className="font-bold text-lg">Weight & Metrics</h1>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-slate-400 hover:text-slate-200">Dashboard</button>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Log Weight */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h2 className="font-semibold mb-3">Log Today&apos;s Weight</h2>
          <div className="flex gap-2">
            <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}
              placeholder="kg (e.g. 83.2)"
              className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none"
            />
            <button onClick={logWeight} disabled={saving || !weight}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold disabled:opacity-50 transition-colors">
              {saving ? '...' : 'Log'}
            </button>
          </div>
          {latest && (
            <div className="mt-3 flex gap-4 text-sm">
              <div><span className="text-slate-400">Latest: </span><span className="font-semibold">{latest.weightKg} kg</span></div>
              <div><span className="text-slate-400">BMI: </span><span className="font-semibold">{latest.bmi}</span></div>
              <div><span className="text-slate-400 text-xs">{getBMICategory(latest.bmi)}</span></div>
            </div>
          )}
          {alert && <p className="mt-2 text-amber-400 text-xs">{alert}</p>}
        </div>

        {/* Chart */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Weight Trend</h2>
            <div className="flex gap-1">
              {([7,30,90] as const).map(r => (
                <button key={r} onClick={() => setRange(r)}
                  className={`px-2 py-1 text-xs rounded ${range === r ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                  {r}d
                </button>
              ))}
            </div>
          </div>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                <ReferenceLine y={targetWeight} stroke="#10b981" strokeDasharray="5 5" label={{ value: 'Target', fill: '#10b981', fontSize: 11 }} />
                <Line type="monotone" dataKey="weight" stroke="#60a5fa" dot={false} strokeWidth={2} name="Weight (kg)" />
                <Line type="monotone" dataKey="avg" stroke="#f59e0b" dot={false} strokeWidth={2} strokeDasharray="4 4" name="7d Avg" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">Log at least 2 weights to see your trend</p>
          )}
        </div>
      </div>
    </main>
  )
}
