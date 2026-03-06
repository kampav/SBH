'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { getProfile, getMetrics, saveMetric, getMeasurements, saveMeasurement, getRecentWorkouts, getNutrition, getNutritionHistory } from '@/lib/firebase/firestore'
import { movingAverage, getWeightAlert } from '@/lib/health/calculations'
import { calcBMI, getBMICategory } from '@/lib/health/bodyUtils'
import { DailyMetric, BodyMeasurement, UserProfile } from '@/lib/types'
import { serverTimestamp } from 'firebase/firestore'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { computeBadges, computeStreak, computeXP, getLevel } from '@/lib/gamification'
import { Scale, Ruler, Trophy, ChevronDown, ChevronUp, Check, Share2 } from 'lucide-react'
import { shareStats } from '@/lib/utils'
import { Analytics } from '@/lib/firebase/analytics'

const today = new Date().toISOString().slice(0, 10)
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'
const ROSE   = '#f43f5e'
const AMBER  = '#f59e0b'
const LIME   = '#84cc16'

export default function MetricsPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [targetWeight, setTargetWeight] = useState(70)
  const [metrics, setMetrics] = useState<DailyMetric[]>([])
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
  const [nutritionHistory, setNutritionHistory] = useState<{ date: string; calories: number; target: number }[]>([])
  const [weight, setWeight] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)
  const [range, setRange] = useState<7 | 30 | 90>(30)
  const [badges, setBadges] = useState<ReturnType<typeof computeBadges>>([])
  const [xp, setXp] = useState(0)
  const [level, setLevel] = useState(1)
  const [levelTitle, setLevelTitle] = useState('Beginner')
  const [showMeasureForm, setShowMeasureForm] = useState(false)
  const [savingMeasure, setSavingMeasure] = useState(false)
  const [measureSaved, setMeasureSaved] = useState(false)
  const [mForm, setMForm] = useState({ chest: '', waist: '', neck: '', hips: '', bicep: '' })
  const [chartTab, setChartTab] = useState<'weight' | 'measurements' | 'calories'>('weight')
  const [showBadges, setShowBadges] = useState(false)
  const [shareToast, setShareToast] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      setUid(user.uid)
      const [p, m, meas, workouts, nutrition, nutHistory] = await Promise.all([
        getProfile(user.uid),
        getMetrics(user.uid, 90),
        getMeasurements(user.uid, 20),
        getRecentWorkouts(user.uid, 90),
        getNutrition(user.uid, today),
        getNutritionHistory(user.uid, 90),
      ])
      if (p) { setTargetWeight(p.targetWeightKg); setProfile(p) }
      setMetrics(m)
      setMeasurements(meas)
      setNutritionHistory(nutHistory.map(n => ({
        date: n.date.slice(5),
        calories: n.totalCalories,
        target: n.calorieTarget ?? p?.calorieTarget ?? 2000,
      })))
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
    setSavingWeight(true)
    const metric: DailyMetric = { date: today, weightKg: kg, bmi: calcBMI(kg, profile?.heightCm ?? 170), loggedAt: serverTimestamp() }
    await saveMetric(uid, metric)
    setMetrics(prev => [...prev.filter(m => m.date !== today), metric].sort((a, b) => a.date.localeCompare(b.date)))
    setWeight('')
    setSavingWeight(false)
  }

  async function logMeasurements() {
    if (!uid) return
    const chest = parseFloat(mForm.chest)
    const waist = parseFloat(mForm.waist)
    const neck  = parseFloat(mForm.neck)
    if (isNaN(chest) || isNaN(waist) || isNaN(neck)) return
    setSavingMeasure(true)
    const m: BodyMeasurement = {
      date: today, chestCm: chest, waistCm: waist, neckCm: neck,
      hipsCm: mForm.hips ? parseFloat(mForm.hips) : undefined,
      bicepCm: mForm.bicep ? parseFloat(mForm.bicep) : undefined,
      loggedAt: serverTimestamp(),
    }
    await saveMeasurement(uid, m)
    setMeasurements(prev => [...prev.filter(x => x.date !== today), m].sort((a, b) => a.date.localeCompare(b.date)))
    setSavingMeasure(false)
    setMeasureSaved(true)
    setShowMeasureForm(false)
    setMForm({ chest: '', waist: '', neck: '', hips: '', bicep: '' })
    setTimeout(() => setMeasureSaved(false), 2500)
  }

  const displayed     = metrics.slice(-range)
  const avgWeights    = movingAverage(displayed.map(m => m.weightKg))
  const heightCm      = profile?.heightCm ?? 170
  const weightChartData = displayed.map((m, i) => ({
    date: m.date.slice(5),
    weight: m.weightKg,
    avg: avgWeights[i],
    bmi: calcBMI(m.weightKg, heightCm),
  }))
  const measChartData   = measurements.slice(-16).map(m => ({
    date: m.date.slice(5), chest: m.chestCm, waist: m.waistCm, neck: m.neckCm, hips: m.hipsCm, bicep: m.bicepCm,
  }))

  const latest     = metrics[metrics.length - 1]
  const latestMeas = measurements[measurements.length - 1]
  const alert      = metrics.length >= 2
    ? getWeightAlert(latest.weightKg - (metrics[metrics.length - 8]?.weightKg ?? latest.weightKg))
    : null
  const earnedBadges = badges.filter(b => b.earned)
  const wDelta  = metrics.length >= 2 ? metrics[metrics.length - 1].weightKg - metrics[0].weightKg : null
  const wstDelta = measurements.length >= 2
    ? measurements[measurements.length - 1].waistCm - measurements[0].waistCm
    : null

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen mesh-bg page-pad">
      <header className="px-4 pt-12 pb-4">
        <p className="text-xs text-2 mb-0.5">Track your transformation</p>
        <h1 className="text-xl font-bold text-1">Progress</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label:'Weight',  value: latest ? `${latest.weightKg}kg` : '—',           delta: wDelta, emoji:'⚖️', color: VIOLET },
            { label:'Waist',   value: latestMeas ? `${latestMeas.waistCm}cm` : '—',     delta: wstDelta, emoji:'📏', color: ROSE },
            { label:'BMI',     value: latest ? String(calcBMI(latest.weightKg, heightCm)) : '—',
              sub: latest ? getBMICategory(calcBMI(latest.weightKg, heightCm)).label : undefined, emoji:'🧮', color: CYAN },
          ].map(c => (
            <div key={c.label} className="glass rounded-2xl p-3 text-center">
              <div className="text-xl mb-1">{c.emoji}</div>
              <p className="text-xs text-2">{c.label}</p>
              <p className="font-bold text-sm" style={{color: c.color}}>{c.value}</p>
              {c.delta !== null && c.delta !== undefined && (
                <p className="text-xs mt-0.5" style={{color: c.delta < 0 ? LIME : ROSE}}>
                  {c.delta > 0 ? '+' : ''}{c.delta.toFixed(1)}{c.label === 'Waist' ? 'cm' : 'kg'}
                </p>
              )}
              {'sub' in c && c.sub && <p className="text-xs text-3">{c.sub}</p>}
            </div>
          ))}
        </div>

        {/* Log weight */}
        <div className="glass rounded-2xl p-4">
          <h2 className="text-xs font-semibold text-2 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Scale size={13} style={{color: VIOLET}} /> Log Today&apos;s Weight
          </h2>
          <div className="flex gap-2">
            <input type="number" step="0.1" value={weight}
              onChange={e => setWeight(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && logWeight()}
              placeholder="kg (e.g. 83.0)" className="input-glass flex-1" />
            <button onClick={logWeight} disabled={savingWeight || !weight}
              className="px-5 py-2.5 rounded-xl font-semibold text-white disabled:opacity-50"
              style={{background:`linear-gradient(135deg,${VIOLET},#6d28d9)`}}>
              {savingWeight ? '…' : 'Log'}
            </button>
          </div>
          {latest && (
            <div className="flex gap-4 mt-2 text-xs text-2">
              <span>Latest: <strong className="text-1">{latest.weightKg} kg</strong></span>
              <span>BMI: <strong className="text-1">{calcBMI(latest.weightKg, heightCm)}</strong> ({getBMICategory(calcBMI(latest.weightKg, heightCm)).label})</span>
            </div>
          )}
          {alert && <p className="mt-1.5 text-xs" style={{color: AMBER}}>{alert}</p>}
        </div>

        {/* Weekly measurements */}
        <div className="glass rounded-2xl p-4">
          <button className="w-full flex items-center justify-between"
            onClick={() => setShowMeasureForm(s => !s)}>
            <h2 className="text-xs font-semibold text-2 uppercase tracking-widest flex items-center gap-2">
              <Ruler size={13} style={{color: CYAN}} /> Weekly Measurements
            </h2>
            <div className="flex items-center gap-2">
              {latestMeas && <span className="text-xs text-3">{latestMeas.date.slice(5)}</span>}
              {measureSaved && <Check size={13} style={{color: LIME}} />}
              {showMeasureForm ? <ChevronUp size={15} className="text-2" /> : <ChevronDown size={15} className="text-2" />}
            </div>
          </button>

          {latestMeas && !showMeasureForm && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label:'Chest', val: latestMeas.chestCm, color: VIOLET },
                { label:'Waist', val: latestMeas.waistCm, color: ROSE },
                { label:'Neck',  val: latestMeas.neckCm,  color: CYAN },
              ].map(item => (
                <div key={item.label} className="glass rounded-xl p-2.5 text-center">
                  <p className="text-xs text-2">{item.label}</p>
                  <p className="font-bold text-sm" style={{color: item.color}}>{item.val}cm</p>
                </div>
              ))}
            </div>
          )}

          {showMeasureForm && (
            <div className="space-y-3 mt-3">
              <div className="grid grid-cols-3 gap-2">
                {([['Chest*','chest'],['Waist*','waist'],['Neck*','neck']] as const).map(([l,k]) => (
                  <div key={k}>
                    <label className="text-xs text-2 mb-1 block">{l} (cm)</label>
                    <input type="number" step="0.1" value={mForm[k]}
                      onChange={e => setMForm(f => ({...f, [k]: e.target.value}))}
                      placeholder="cm" className="input-glass" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([['Hips','hips'],['Bicep','bicep']] as const).map(([l,k]) => (
                  <div key={k}>
                    <label className="text-xs text-3 mb-1 block">{l} (cm) optional</label>
                    <input type="number" step="0.1" value={mForm[k]}
                      onChange={e => setMForm(f => ({...f, [k]: e.target.value}))}
                      placeholder="cm" className="input-glass" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowMeasureForm(false)} className="flex-1 py-2.5 rounded-xl text-sm text-2 glass">Cancel</button>
                <button onClick={logMeasurements} disabled={savingMeasure}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{background:`linear-gradient(135deg,${CYAN},#0891b2)`}}>
                  {savingMeasure ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Charts */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1.5">
              {([['weight','⚖️ Weight'],['measurements','📏 Body'],['calories','🔥 Calories']] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setChartTab(tab)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: chartTab === tab ? VIOLET : 'rgba(124,58,237,0.1)',
                    color: chartTab === tab ? '#fff' : '#94a3b8',
                  }}>
                  {label}
                </button>
              ))}
            </div>
            {chartTab === 'weight' && (
              <div className="flex gap-1">
                {([7,30,90] as const).map(r => (
                  <button key={r} onClick={() => setRange(r)}
                    className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all"
                    style={{background: range===r ? VIOLET : 'rgba(124,58,237,0.1)', color: range===r ? '#fff' : '#94a3b8'}}>
                    {r}d
                  </button>
                ))}
              </div>
            )}
          </div>

          {chartTab === 'weight' && (
            weightChartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.12)" />
                  <XAxis dataKey="date" tick={{fill:'#94a3b8',fontSize:11}} />
                  <YAxis yAxisId="weight" domain={['auto','auto']} tick={{fill:'#94a3b8',fontSize:11}} />
                  <YAxis yAxisId="bmi" orientation="right" domain={[15,40]} tick={{fill:'#06b6d4',fontSize:10}} label={{value:'BMI',angle:90,position:'insideRight',fill:'#06b6d4',fontSize:10}} />
                  <Tooltip contentStyle={{background:'rgba(10,8,25,0.95)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:12}} labelStyle={{color:'#f1f5f9'}} />
                  <ReferenceLine yAxisId="weight" y={targetWeight} stroke={CYAN} strokeDasharray="5 5" label={{value:'Target',fill:CYAN,fontSize:10}} />
                  <Line yAxisId="weight" type="monotone" dataKey="weight" stroke={VIOLET} dot={false} strokeWidth={2.5} name="Weight (kg)" />
                  <Line yAxisId="weight" type="monotone" dataKey="avg" stroke={AMBER} dot={false} strokeWidth={2} strokeDasharray="4 4" name="7d Avg" />
                  <Line yAxisId="bmi" type="monotone" dataKey="bmi" stroke={CYAN} dot={false} strokeWidth={1.5} strokeDasharray="3 3" name="BMI" />
                  <Legend wrapperStyle={{fontSize:11,color:'#94a3b8'}} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-2 text-sm text-center py-10">Log at least 2 weights to see your trend</p>
          )}

          {chartTab === 'measurements' && (
            measChartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={measChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.12)" />
                  <XAxis dataKey="date" tick={{fill:'#94a3b8',fontSize:11}} />
                  <YAxis domain={['auto','auto']} tick={{fill:'#94a3b8',fontSize:11}} unit="cm" />
                  <Tooltip contentStyle={{background:'rgba(10,8,25,0.95)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:12}} labelStyle={{color:'#f1f5f9'}} />
                  <Line type="monotone" dataKey="chest" stroke={VIOLET} dot={{r:3}} strokeWidth={2} name="Chest" />
                  <Line type="monotone" dataKey="waist" stroke={ROSE}   dot={{r:3}} strokeWidth={2} name="Waist" />
                  <Line type="monotone" dataKey="neck"  stroke={CYAN}   dot={{r:3}} strokeWidth={2} name="Neck" />
                  <Line type="monotone" dataKey="hips"  stroke={AMBER}  dot={{r:3}} strokeWidth={2} name="Hips" />
                  <Line type="monotone" dataKey="bicep" stroke={LIME}   dot={{r:3}} strokeWidth={2} name="Bicep" />
                  <Legend wrapperStyle={{fontSize:11,color:'#94a3b8'}} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-2 text-sm text-center py-10">Log measurements weekly to track body composition</p>
          )}

          {chartTab === 'calories' && (() => {
            const calData = nutritionHistory.slice(-range)
            const daysOnTarget = calData.filter(d => d.calories >= d.target * 0.9 && d.calories <= d.target * 1.1).length
            const avgCal = calData.length > 0 ? Math.round(calData.reduce((s, d) => s + d.calories, 0) / calData.length) : 0
            const targetVal = calData[0]?.target ?? profile?.calorieTarget ?? 2000
            return calData.length > 0 ? (
              <div>
                <div className="flex gap-4 mb-3 text-xs">
                  <span className="text-2">Avg: <strong style={{color:VIOLET}}>{avgCal} kcal</strong></span>
                  <span className="text-2">On target: <strong style={{color:LIME}}>{daysOnTarget}/{calData.length} days</strong></span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={calData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.12)" />
                    <XAxis dataKey="date" tick={{fill:'#94a3b8',fontSize:10}} />
                    <YAxis domain={[0,'auto']} tick={{fill:'#94a3b8',fontSize:11}} />
                    <Tooltip contentStyle={{background:'rgba(10,8,25,0.95)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:12}} labelStyle={{color:'#f1f5f9'}} />
                    <ReferenceLine y={targetVal} stroke={CYAN} strokeDasharray="5 5" label={{value:'Target',fill:CYAN,fontSize:10}} />
                    <Bar dataKey="calories" fill={VIOLET} name="Calories" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-2 text-sm text-center py-10">Log nutrition to see your calorie history</p>
          })()}
        </div>

        {/* Measurement history table */}
        {measurements.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <h2 className="text-xs font-semibold text-2 uppercase tracking-widest mb-3">History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-3 border-b" style={{borderColor:'rgba(124,58,237,0.15)'}}>
                    <th className="text-left pb-2">Date</th>
                    <th className="text-right pb-2" style={{color:VIOLET}}>Chest</th>
                    <th className="text-right pb-2" style={{color:ROSE}}>Waist</th>
                    <th className="text-right pb-2" style={{color:CYAN}}>Neck</th>
                    <th className="text-right pb-2 text-3">Hips</th>
                  </tr>
                </thead>
                <tbody>
                  {measurements.slice().reverse().slice(0,8).map(m => (
                    <tr key={m.date} className="border-b" style={{borderColor:'rgba(124,58,237,0.08)'}}>
                      <td className="py-2 text-2">{m.date.slice(5)}</td>
                      <td className="text-right py-2 font-semibold" style={{color:VIOLET}}>{m.chestCm}</td>
                      <td className="text-right py-2 font-semibold" style={{color:ROSE}}>{m.waistCm}</td>
                      <td className="text-right py-2 font-semibold" style={{color:CYAN}}>{m.neckCm}</td>
                      <td className="text-right py-2 text-3">{m.hipsCm ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Badges (collapsible) */}
        <div className="glass rounded-2xl p-4">
          <button className="w-full flex items-center justify-between" onClick={() => setShowBadges(s => !s)}>
            <div className="flex items-center gap-2">
              <Trophy size={14} style={{color:AMBER}} />
              <h2 className="text-xs font-semibold text-2 uppercase tracking-widest">Achievements</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{color:AMBER}}>{earnedBadges.length}/{badges.length}</span>
              {showBadges ? <ChevronUp size={14} className="text-2" /> : <ChevronDown size={14} className="text-2" />}
            </div>
          </button>
          {showBadges && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {badges.map(b => (
                <div key={b.id} className="flex flex-col items-center gap-1 p-2 rounded-xl border"
                  style={{
                    background: b.earned ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)',
                    borderColor: b.earned ? b.color + '40' : 'rgba(124,58,237,0.1)',
                    opacity: b.earned ? 1 : 0.35,
                  }}>
                  <span className="text-2xl">{b.icon}</span>
                  <p className="text-center leading-tight font-semibold" style={{color: b.earned ? b.color : '#475569', fontSize:9}}>{b.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Level + Share */}
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-xs text-2 mb-1">Current Level</p>
          <p className="text-3xl font-bold gradient-text">Level {level}</p>
          <p className="text-sm text-1 font-semibold">{levelTitle}</p>
          <p className="text-xs text-2 mt-1">{xp.toLocaleString()} total XP</p>
          <button
            onClick={async () => {
              const text = `My SBH stats:\n🔥 Level ${level} — ${levelTitle}\n⚡ ${xp.toLocaleString()} XP\n🏆 ${earnedBadges.length} badges earned\n📱 sbhealth.app`
              const used = await shareStats('My SBH Progress', text)
              Analytics.statsShared('badges')
              if (!used) { setShareToast(true); setTimeout(() => setShareToast(false), 2500) }
            }}
            className="mt-3 mx-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold glass border border-white/10"
            style={{ color: 'var(--text-2)' }}>
            <Share2 size={13} /> Share my stats
          </button>
        </div>

        {shareToast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg z-50">
            Copied to clipboard!
          </div>
        )}
      </div>
    </main>
  )
}
