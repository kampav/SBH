'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { getMoodHistory, getSleepHistory, getRecentWorkouts, getNutritionHistory } from '@/lib/firebase/firestore'
import { MoodEntry, SleepEntry, DailyWorkout, DailyNutrition } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Brain, Moon, Dumbbell, Utensils, Info } from 'lucide-react'

// ── Correlation helpers ───────────────────────────────────────────────────────

function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return 0
  const ax = xs.slice(0, n), ay = ys.slice(0, n)
  const mx = ax.reduce((s, v) => s + v, 0) / n
  const my = ay.reduce((s, v) => s + v, 0) / n
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) {
    const a = ax[i] - mx, b = ay[i] - my
    num += a * b; dx += a * a; dy += b * b
  }
  const denom = Math.sqrt(dx * dy)
  return denom === 0 ? 0 : num / denom
}

function correlationLabel(r: number): { label: string; color: string; emoji: string } {
  const abs = Math.abs(r)
  const dir = r >= 0 ? 'positive' : 'negative'
  if (abs < 0.1) return { label: 'No correlation', color: '#64748b', emoji: '➖' }
  if (abs < 0.3) return { label: `Weak ${dir}`, color: r >= 0 ? '#f59e0b' : '#6366f1', emoji: r >= 0 ? '↗' : '↘' }
  if (abs < 0.5) return { label: `Moderate ${dir}`, color: r >= 0 ? '#10b981' : '#f97316', emoji: r >= 0 ? '↗' : '↘' }
  return { label: `Strong ${dir}`, color: r >= 0 ? '#06b6d4' : '#ef4444', emoji: r >= 0 ? '⬆' : '⬇' }
}

interface CorrelationCard {
  id: string
  title: string
  xLabel: string
  yLabel: string
  r: number
  n: number
  insight: string
  icon: React.ReactNode
}


export default function CorrelationsPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cards, setCards] = useState<CorrelationCard[]>([])
  const [dataPoints, setDataPoints] = useState(0)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      if (!u) { router.replace('/login'); return }
      setUid(u.uid)
      setAuthReady(true)
    })
    return unsub
  }, [router])

  const compute = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    try {
      const [moods, sleeps, workouts, nutrition] = await Promise.all([
        getMoodHistory(uid, 30),
        getSleepHistory(uid, 30),
        getRecentWorkouts(uid, 30),
        getNutritionHistory(uid, 30),
      ])

      // Build date-indexed maps
      const moodMap = new Map<string, MoodEntry>()
      moods.forEach(m => moodMap.set(m.date, m))
      const sleepMap = new Map<string, SleepEntry>()
      sleeps.forEach(s => sleepMap.set(s.date, s))
      const workoutMap = new Map<string, DailyWorkout>()
      workouts.forEach(w => workoutMap.set(w.date, w))
      const nutritionMap = new Map<string, DailyNutrition>()
      nutrition.forEach(n => nutritionMap.set(n.date, n))

      // Get all dates with mood data (mood is the y-axis for most correlations)
      const moodDates = moods.map(m => m.date)
      setDataPoints(moodDates.length)

      // Helper to get paired arrays for correlation
      const getPairs = (dates: string[], getX: (d: string) => number | null, getY: (d: string) => number | null) => {
        const xs: number[] = [], ys: number[] = []
        dates.forEach(d => {
          const x = getX(d), y = getY(d)
          if (x !== null && y !== null) { xs.push(x); ys.push(y) }
        })
        return { xs, ys, n: xs.length }
      }

      // 1. Sleep → Mood
      const sleepMood = getPairs(
        moodDates,
        d => sleepMap.get(d)?.durationH ?? null,
        d => moodMap.get(d)?.mood ?? null,
      )
      const r1 = pearson(sleepMood.xs, sleepMood.ys)

      // 2. Sleep → Energy
      const sleepEnergy = getPairs(
        moodDates,
        d => sleepMap.get(d)?.durationH ?? null,
        d => moodMap.get(d)?.energy ?? null,
      )
      const r2 = pearson(sleepEnergy.xs, sleepEnergy.ys)

      // 3. Exercise → Mood (workout day = 1, no workout = 0)
      const exerciseMood = getPairs(
        moodDates,
        d => workoutMap.has(d) ? 1 : 0,
        d => moodMap.get(d)?.mood ?? null,
      )
      const r3 = pearson(exerciseMood.xs, exerciseMood.ys)

      // 4. Exercise → Anxiety (inverted: high exercise → lower anxiety ideally)
      const exerciseAnxiety = getPairs(
        moodDates,
        d => workoutMap.has(d) ? 1 : 0,
        d => {
          const m = moodMap.get(d)
          return m ? (6 - m.anxiety) : null  // invert anxiety so 5=calm
        },
      )
      const r4 = pearson(exerciseAnxiety.xs, exerciseAnxiety.ys)

      // 5. Nutrition (protein %) → Energy
      const proteinEnergy = getPairs(
        moodDates,
        d => {
          const n = nutritionMap.get(d)
          if (!n || n.totalCalories === 0) return null
          return (n.totalProteinG * 4) / n.totalCalories * 100
        },
        d => moodMap.get(d)?.energy ?? null,
      )
      const r5 = pearson(proteinEnergy.xs, proteinEnergy.ys)

      // 6. Calorie deficit → Mood
      const calorieMood = getPairs(
        moodDates,
        d => {
          const n = nutritionMap.get(d)
          if (!n) return null
          return n.totalCalories  // raw calories logged
        },
        d => moodMap.get(d)?.mood ?? null,
      )
      const r6 = pearson(calorieMood.xs, calorieMood.ys)

      const insightText = (_label: string, xLabel: string, yLabel: string, r: number, n: number): string => {
        if (n < 5) return `Not enough data yet (${n} paired days). Log more to see patterns.`
        const abs = Math.abs(r)
        if (abs < 0.1) return `No clear relationship found between ${xLabel} and ${yLabel} in your data.`
        const dir = r > 0 ? 'higher' : 'lower'
        const strength = abs < 0.3 ? 'a weak' : abs < 0.5 ? 'a moderate' : 'a strong'
        return `There is ${strength} relationship: ${xLabel} days tend to coincide with ${dir} ${yLabel}. Based on ${n} days of data.`
      }

      const newCards: CorrelationCard[] = [
        {
          id: 'sleep-mood', title: 'Sleep → Mood', xLabel: 'Sleep (hrs)', yLabel: 'Mood',
          r: r1, n: sleepMood.n,
          insight: insightText('', 'Better sleep', 'mood scores', r1, sleepMood.n),
          icon: <Moon size={16} style={{ color: '#818cf8' }} />,
        },
        {
          id: 'sleep-energy', title: 'Sleep → Energy', xLabel: 'Sleep (hrs)', yLabel: 'Energy',
          r: r2, n: sleepEnergy.n,
          insight: insightText('', 'More sleep', 'energy levels', r2, sleepEnergy.n),
          icon: <Moon size={16} style={{ color: '#818cf8' }} />,
        },
        {
          id: 'exercise-mood', title: 'Exercise → Mood', xLabel: 'Workout logged', yLabel: 'Mood',
          r: r3, n: exerciseMood.n,
          insight: insightText('', 'Workout days', 'mood scores', r3, exerciseMood.n),
          icon: <Dumbbell size={16} style={{ color: '#7c3aed' }} />,
        },
        {
          id: 'exercise-anxiety', title: 'Exercise → Calm', xLabel: 'Workout logged', yLabel: 'Calmness',
          r: r4, n: exerciseAnxiety.n,
          insight: insightText('', 'Workout days', 'calmness levels', r4, exerciseAnxiety.n),
          icon: <Dumbbell size={16} style={{ color: '#7c3aed' }} />,
        },
        {
          id: 'protein-energy', title: 'Protein % → Energy', xLabel: 'Protein %', yLabel: 'Energy',
          r: r5, n: proteinEnergy.n,
          insight: insightText('', 'Higher protein intake', 'energy levels', r5, proteinEnergy.n),
          icon: <Utensils size={16} style={{ color: '#10b981' }} />,
        },
        {
          id: 'calories-mood', title: 'Calories → Mood', xLabel: 'Calories logged', yLabel: 'Mood',
          r: r6, n: calorieMood.n,
          insight: insightText('', 'More calories', 'mood scores', r6, calorieMood.n),
          icon: <Utensils size={16} style={{ color: '#10b981' }} />,
        },
      ]

      setCards(newCards)
    } catch {
      // best-effort
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    if (uid) compute()
  }, [uid, compute])

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen mesh-bg pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 glass-strong border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl glass-elevated">
            <ArrowLeft size={16} style={{ color: 'var(--text-3)' }} />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-1">Stress Correlations</h1>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>How your habits affect mood & energy</p>
          </div>
          <TrendingUp size={18} style={{ color: '#7c3aed' }} />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* Explainer */}
        <div className="glass rounded-2xl p-4 flex items-start gap-3" style={{ border: '1px solid rgba(124,58,237,0.15)' }}>
          <Info size={16} style={{ color: '#a78bfa', flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Pearson correlations between your logged data over the last 30 days. Requires at least 5 days of paired data per metric. Correlation ≠ causation.
          </p>
        </div>

        {/* Data coverage */}
        {dataPoints > 0 && (
          <div className="flex items-center gap-3 glass rounded-xl px-4 py-3">
            <Brain size={16} style={{ color: '#06b6d4' }} />
            <div>
              <p className="text-xs font-semibold text-1">{dataPoints} days of mood data analysed</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Paired with sleep, exercise and nutrition logs</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        ) : cards.length === 0 || dataPoints < 3 ? (
          <div className="glass rounded-2xl p-8 text-center space-y-3">
            <Brain size={40} style={{ color: 'var(--text-3)' }} className="mx-auto" />
            <p className="text-sm font-semibold text-1">Not enough data yet</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
              Log your mood, sleep, workouts, and nutrition for at least 5 days to see correlations.
            </p>
            <div className="flex justify-center gap-2 pt-2 flex-wrap">
              <Link href="/mood" className="px-4 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: '#7c3aed' }}>Log mood</Link>
              <Link href="/sleep" className="px-4 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: '#818cf8' }}>Log sleep</Link>
              <Link href="/workout" className="px-4 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: '#10b981' }}>Log workout</Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map(card => {
              const { label, color, emoji } = correlationLabel(card.r)
              return (
                <div key={card.id} className="glass rounded-2xl p-4 space-y-3">
                  {/* Card header */}
                  <div className="flex items-center gap-2">
                    {card.icon}
                    <p className="text-sm font-bold text-1 flex-1">{card.title}</p>
                    {card.n >= 5 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: color + '20', color }}>
                        {emoji} {label}
                      </span>
                    )}
                  </div>

                  {/* Correlation bar */}
                  {card.n >= 5 ? (
                    <div>
                      <div className="flex items-center gap-2 text-xs mb-1.5" style={{ color: 'var(--text-3)' }}>
                        <span className="flex-1 text-right text-xs">negative</span>
                        <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.2)' }} />
                        <span className="flex-1 text-xs">positive</span>
                      </div>
                      <div className="flex items-center gap-0.5 h-3">
                        {/* Left half */}
                        <div className="flex-1 flex justify-end">
                          {card.r < 0 && (
                            <div className="h-3 rounded-l-full" style={{ width: `${Math.abs(card.r) * 100}%`, background: color }} />
                          )}
                        </div>
                        {/* Center line */}
                        <div className="w-0.5 h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
                        {/* Right half */}
                        <div className="flex-1">
                          {card.r >= 0 && (
                            <div className="h-3 rounded-r-full" style={{ width: `${card.r * 100}%`, background: color }} />
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                        <span>-1.0</span>
                        <span className="font-semibold" style={{ color }}>r = {card.r.toFixed(2)}</span>
                        <span>+1.0</span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                        {card.n} paired days — need 5 minimum
                      </p>
                    </div>
                  )}

                  {/* Insight */}
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{card.insight}</p>

                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    Based on {card.n} days of paired data
                  </p>
                </div>
              )
            })}

            <p className="text-xs text-center py-2" style={{ color: 'var(--text-3)' }}>
              Updated automatically as you log more data
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
