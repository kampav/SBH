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
import { computeBadges, computeStreak, computeXP, getLevel } from '@/lib/gamification'
import { getRecentWorkouts, getNutrition } from '@/lib/firestore'

const today = new Date().toISOString().slice(0, 10)

export default function MetricsPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [targetWeight, setTargetWeight] = useState<number>(70)
  const [metrics, setMetrics] = useState<DailyMetric[]>([])
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [range, setRange] = useState<7 | 30 | 90>(30)
  const [badges, setBadges] = useState<ReturnType<typeof computeBadges>>([])
  const [xp, setXp] = useState(0)
  const [level, setLevel] = useState(1)
  const [levelTitle, setLevelTitle] = useState('Beginner')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      setUid(user.uid)
      const [p, m, workouts, nutrition] = await Promise.all([
        getProfile(user.uid),
        getMetrics(user.uid, 90),
        getRecentWorkouts(user.uid, 90),
        getNutrition(user.uid, today),
      ])
      if (p) setTargetWeight(p.targetWeightKg)
      setMetrics(m)
      const wDates = workouts.map(w => w.date)
      const nDates = nutrition ? [today] : []
      const mDates = m.map(mt => mt.date)
      const totalXp = computeXP(wDates, nDates, mDates)
      setXp(totalXp)
      const { level: l, title: lt } = getLevel(totalXp)
      setLevel(l); setLevelTitle(lt)
      setBadges(computeBadges({
        totalWorkouts: workouts.length,
        totalNutritionDays: nDates.length,
        totalWeightLogs: mDates.length,
        workoutStreak: computeStreak(wDates),
        allStreak: computeStreak(Array.from(new Set([...wDates, ...nDates, ...mDates])).sort()),
        xp: totalXp,
      }))
    })
    return unsub
  }, [router])

  async function logWeight() {
    if (!uid || !weight) return
    const kg = parseFloat(weight)
    if (isNaN(kg)) return
    setSaving(true)
    const metric: DailyMetric = {
      date: today,
      weightKg: kg,
      bmi: calcBMI(kg, 165),
      loggedAt: serverTimestamp(),
    }
    await saveMetric(uid, metric)
    setMetrics(prev => [...prev.filter(m => m.date !== today), metric].sort((a, b) => a.date.localeCompare(b.date)))
    setWeight('')
    setSaving(false)
  }

  const displayed = metrics.slice(-range)
  const avgWeights = movingAverage(displayed.map(m => m.weightKg))
  const chartData = displayed.map((m, i) => ({ date: m.date.slice(5), weight: m.weightKg, avg: avgWeights[i] }))
  const latest = metrics[metrics.length - 1]
  const alert = metrics.length >= 2
    ? getWeightAlert((latest.weightKg - (metrics[metrics.length - 8]?.weightKg ?? latest.weightKg)))
    : null

  if (!authReady) return (
    <main className="min-h-screen bg-app flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const earnedBadges = badges.filter(b => b.earned)

  return (
    <main className="min-h-screen bg-app page-pad">
      <header className="px-4 pt-12 pb-4">
        <p className="text-xs text-2 mb-0.5">Your journey</p>
        <h1 className="text-xl font-bold text-1">Progress</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4">

        {/* Log weight */}
        <div className="bg-card-sbh rounded-2xl p-4 border border-sbh">
          <h2 className="text-xs font-semibold text-2 uppercase tracking-widest mb-3">Log Today&#39;s Weight</h2>
          <div className="flex gap-2">
            <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}
              placeholder="kg (e.g. 83.0)"
              className="flex-1 px-3 py-2.5 rounded-xl text-1 outline-none"
              style={{background:'#111d35',border:'1px solid #1a2744'}}
            />
            <button onClick={logWeight} disabled={saving || !weight}
              className="px-5 py-2.5 rounded-xl font-semibold text-white disabled:opacity-50 transition-opacity"
              style={{background:'#10b981'}}>
              {saving ? '...' : 'Log'}
            </button>
          </div>
          {latest && (
            <div className="flex gap-4 mt-3 text-sm">
              <div><span className="text-2">Latest: </span><span className="font-semibold text-1">{latest.weightKg} kg</span></div>
              <div><span className="text-2">BMI: </span><span className="font-semibold text-1">{latest.bmi}</span></div>
              <span className="text-xs text-2 self-end">{getBMICategory(latest.bmi)}</span>
            </div>
          )}
          {alert && <p className="mt-2 text-amber-400 text-xs">{alert}</p>}
        </div>

        {/* Chart */}
        <div className="bg-card-sbh rounded-2xl p-4 border border-sbh">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-2 uppercase tracking-widest">Weight Trend</h2>
            <div className="flex gap-1">
              {([7,30,90] as const).map(r => (
                <button key={r} onClick={() => setRange(r)}
                  className="px-2.5 py-1 text-xs rounded-lg font-medium transition-colors"
                  style={{
                    background: range === r ? '#10b981' : '#1a2744',
                    color: range === r ? '#fff' : '#94a3b8'
                  }}>
                  {r}d
                </button>
              ))}
            </div>
          </div>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0D1526', border: '1px solid #1a2744', borderRadius: 12 }} labelStyle={{color:'#f1f5f9'}} />
                <ReferenceLine y={targetWeight} stroke="#10b981" strokeDasharray="5 5" label={{ value: 'Target', fill: '#10b981', fontSize: 10 }} />
                <Line type="monotone" dataKey="weight" stroke="#6366f1" dot={false} strokeWidth={2} name="Weight" />
                <Line type="monotone" dataKey="avg" stroke="#f59e0b" dot={false} strokeWidth={2} strokeDasharray="4 4" name="7d Avg" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-2 text-sm text-center py-8">Log at least 2 weights to see your trend</p>
          )}
        </div>

        {/* Badges */}
        <div className="bg-card-sbh rounded-2xl p-4 border border-sbh">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-2 uppercase tracking-widest">Achievements</h2>
            <span className="text-xs text-amber-400">{earnedBadges.length}/{badges.length} earned</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {badges.map(b => (
              <div key={b.id} className="flex flex-col items-center gap-1 p-2 rounded-xl border transition-opacity"
                style={{
                  background: b.earned ? '#111d35' : '#0D1526',
                  borderColor: b.earned ? b.color + '40' : '#1a2744',
                  opacity: b.earned ? 1 : 0.35,
                }}>
                <span className="text-2xl">{b.icon}</span>
                <p className="text-xs font-semibold text-center leading-tight" style={{color: b.earned ? b.color : '#475569', fontSize:10}}>{b.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Level + XP summary */}
        <div className="bg-card-2 rounded-2xl p-4 border border-sbh text-center">
          <p className="text-xs text-2 mb-1">Current Level</p>
          <p className="text-3xl font-bold gradient-text">Level {level}</p>
          <p className="text-sm text-1 font-semibold">{levelTitle}</p>
          <p className="text-xs text-2 mt-1">{xp.toLocaleString()} total XP</p>
        </div>
      </div>
    </main>
  )
}
