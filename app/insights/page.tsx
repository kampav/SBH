'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  getProfile, getNutritionHistory, getRecentWorkouts, getSleepHistory,
  getMetrics, getCachedWeeklyInsight, saveWeeklyInsight,
} from '@/lib/firebase/firestore'
import { WeeklyInsight } from '@/lib/types'
import { getWeekStart, shareStats } from '@/lib/utils'
import { Analytics } from '@/lib/firebase/analytics'
import Link from 'next/link'
import { ArrowLeft, Lightbulb, Share2, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ label, score, color }: { label: string; score: number; color: string }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-1">
          {score}
        </span>
      </div>
      <p className="text-xs text-2 text-center">{label}</p>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const router = useRouter()
  const [authReady, setAuthReady]   = useState(false)
  const [uid, setUid]               = useState('')
  const [insight, setInsight]       = useState<WeeklyInsight | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [sharing, setSharing]       = useState(false)
  const [shared, setShared]         = useState(false)
  const [activeChart, setActiveChart] = useState<'calories' | 'protein' | 'sleep'>('calories')
  const [chartData, setChartData]   = useState<{ day: string; value: number }[]>([])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      setUid(user.uid)
      await loadInsights(user.uid)
    })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function loadInsights(userId: string, forceRefresh = false) {
    setLoading(true)
    setError('')
    try {
      const weekStart = getWeekStart()

      // Check cache first (unless forced refresh)
      if (!forceRefresh) {
        const cached = await getCachedWeeklyInsight(userId, weekStart)
        if (cached) {
          const ageMs = Date.now() - new Date(cached.generatedAt).getTime()
          if (ageMs < 24 * 60 * 60 * 1000) {
            setInsight(cached)
            setLoading(false)
            Analytics.weeklyInsightsViewed(true, cached.scores.overall)
            return
          }
        }
      }

      // Fetch data in parallel
      const [profile, nutrition, workouts, sleep, metrics] = await Promise.all([
        getProfile(userId),
        getNutritionHistory(userId, 7),
        getRecentWorkouts(userId, 7),
        getSleepHistory(userId, 7),
        getMetrics(userId, 14),
      ])

      if (!profile) { setError('Profile not found'); setLoading(false); return }
      if (nutrition.length === 0 && workouts.length === 0 && sleep.length === 0) {
        setError('no_data')
        setLoading(false)
        return
      }

      // Build chart data while we have the raw data
      buildChartData('calories', nutrition, sleep, setChartData)

      // Call AI route
      const res = await fetch('/api/insights/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, weekData: { nutrition, workouts, metrics, sleep }, weekStartDate: weekStart }),
      })

      if (!res.ok) throw new Error('AI route failed')
      const data: WeeklyInsight = await res.json()
      await saveWeeklyInsight(userId, data)
      setInsight(data)
      Analytics.weeklyInsightsViewed(false, data.scores.overall)
    } catch {
      setError('Failed to generate insights. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function buildChartData(
    type: 'calories' | 'protein' | 'sleep',
    nutrition: { date: string; totalCalories?: number; totalProteinG?: number }[],
    sleep: { date: string; durationH: number }[],
    setter: (d: { day: string; value: number }[]) => void,
  ) {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return d.toISOString().slice(0, 10)
    })
    const data = days.map(date => {
      const dayLabel = new Date(date).toLocaleDateString('en-GB', { weekday: 'short' })
      if (type === 'calories') {
        const n = nutrition.find(x => x.date === date)
        return { day: dayLabel, value: n?.totalCalories ?? 0 }
      } else if (type === 'protein') {
        const n = nutrition.find(x => x.date === date)
        return { day: dayLabel, value: n?.totalProteinG ?? 0 }
      } else {
        const s = sleep.find(x => x.date === date)
        return { day: dayLabel, value: s ? Math.round(s.durationH * 10) / 10 : 0 }
      }
    })
    setter(data)
  }

  async function handleShare() {
    if (!insight) return
    setSharing(true)
    const text = `My SBH weekly score: ${insight.scores.overall}/100 🏆\nNutrition ${insight.scores.nutrition} | Workout ${insight.scores.workout} | Sleep ${insight.scores.sleep}\nTracking at sbhealth.app`
    const usedShare = await shareStats('My SBH Weekly Insights', text)
    Analytics.statsShared('weekly_insight')
    setSharing(false)
    if (!usedShare) { setShared(true); setTimeout(() => setShared(false), 2500) }
  }

  if (!authReady || loading) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
        {loading && <p className="text-xs text-2">Generating your weekly insights…</p>}
      </div>
    </main>
  )

  return (
    <main className="min-h-screen mesh-bg page-pad pb-28">
      {/* Header */}
      <header className="page-header-bar px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl glass-elevated">
            <ArrowLeft size={18} style={{ color: 'var(--text-2)' }} />
          </Link>
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-violet-400" />
            <h1 className="page-title" style={{fontSize:'1.25rem'}}>Weekly Insights</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {insight && (
            <button onClick={() => loadInsights(uid, true)}
              className="p-2 rounded-xl glass" title="Refresh insights">
              <RefreshCw size={16} style={{ color: 'var(--text-2)' }} />
            </button>
          )}
          {insight && (
            <button onClick={handleShare} disabled={sharing}
              className="p-2 rounded-xl glass" title="Share stats">
              <Share2 size={16} style={{ color: shared ? '#10b981' : 'var(--text-2)' }} />
            </button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4 pt-4">

        {/* Error / no data states */}
        {error === 'no_data' && (
          <div className="glass rounded-2xl p-8 text-center space-y-2">
            <Lightbulb size={32} className="mx-auto text-violet-400 opacity-50" />
            <p className="text-sm font-semibold text-1">No data yet this week</p>
            <p className="text-xs text-2">Log meals, workouts, or sleep to unlock your weekly insights.</p>
          </div>
        )}

        {error && error !== 'no_data' && (
          <div className="glass rounded-2xl p-4 text-center space-y-3">
            <p className="text-sm text-rose-400">{error}</p>
            <button onClick={() => loadInsights(uid, true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
              Try Again
            </button>
          </div>
        )}

        {insight && (<>

          {/* Week label */}
          <p className="text-xs text-3 px-1">
            Week of {new Date(insight.weekStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
            {' '}· Generated {new Date(insight.generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>

          {/* Score rings */}
          <div className="glass rounded-2xl p-4">
            <div className="grid grid-cols-4 gap-2">
              <ScoreRing label="Nutrition" score={insight.scores.nutrition} color="#10b981" />
              <ScoreRing label="Workout"   score={insight.scores.workout}   color="#7c3aed" />
              <ScoreRing label="Sleep"     score={insight.scores.sleep}     color="#06b6d4" />
              <ScoreRing label="Overall"   score={insight.scores.overall}   color="#f59e0b" />
            </div>
          </div>

          {/* Week at a glance */}
          <div className="glass rounded-2xl p-4">
            <p className="text-xs font-semibold text-2 uppercase tracking-widest mb-3">Week at a Glance</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Avg Calories',  value: `${insight.weekData.avgCalories} kcal`,    color: '#10b981' },
                { label: 'Avg Protein',   value: `${insight.weekData.avgProteinG}g`,         color: '#7c3aed' },
                { label: 'Workouts',      value: `${insight.weekData.workoutsLogged} done`,  color: '#f59e0b' },
                { label: 'Avg Sleep',     value: `${insight.weekData.avgSleepH}h`,            color: '#06b6d4' },
              ].map(({ label, value, color }) => (
                <div key={label} className="glass-dark rounded-xl p-3 text-center">
                  <p className="text-xs text-2 mb-0.5">{label}</p>
                  <p className="text-sm font-bold" style={{ color }}>{value}</p>
                </div>
              ))}
              {insight.weekData.weightDeltaKg !== null && (
                <div className="glass-dark rounded-xl p-3 text-center col-span-2">
                  <p className="text-xs text-2 mb-0.5">Weight Change</p>
                  <p className="text-sm font-bold" style={{ color: insight.weekData.weightDeltaKg <= 0 ? '#10b981' : '#f59e0b' }}>
                    {insight.weekData.weightDeltaKg > 0 ? '+' : ''}{insight.weekData.weightDeltaKg} kg
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* AI Narrative */}
          <div className="glass rounded-2xl p-4 border-l-2" style={{ borderColor: '#7c3aed' }}>
            <p className="text-xs font-semibold text-violet-400 mb-2">AI Coach Summary</p>
            <p className="text-sm text-1 leading-relaxed italic">{insight.narrative}</p>
            <p className="text-xs text-3 mt-2">Informational only — not medical advice.</p>
          </div>

          {/* Highlights */}
          <div className="glass rounded-2xl p-4 space-y-2">
            <p className="text-xs font-semibold text-2 uppercase tracking-widest">Highlights</p>
            {insight.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-violet-400 mt-0.5 flex-shrink-0">•</span>
                <p className="text-sm text-1">{h}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="glass rounded-2xl p-4 space-y-2 border" style={{ borderColor: '#06b6d430' }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#06b6d4' }}>Next Week — Try This</p>
            {insight.actions.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold flex-shrink-0">{i + 1}.</span>
                <p className="text-sm text-1">{a}</p>
              </div>
            ))}
          </div>

          {/* Trend chart */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-2 uppercase tracking-widest">7-Day Trend</p>
              <div className="flex gap-1">
                {(['calories', 'protein', 'sleep'] as const).map(t => (
                  <button key={t} onClick={() => setActiveChart(t)}
                    className="px-2 py-1 rounded-lg text-xs font-semibold transition-colors capitalize"
                    style={{
                      background: activeChart === t ? '#7c3aed' : 'rgba(255,255,255,0.06)',
                      color: activeChart === t ? '#fff' : 'var(--text-2)',
                    }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} barSize={20}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#111B2E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number | undefined) => [(v ?? 0).toFixed(1), activeChart === 'calories' ? 'kcal' : activeChart === 'protein' ? 'g' : 'h'] as [string, string]}
                />
                {activeChart === 'sleep' && <ReferenceLine y={8} stroke="#06b6d4" strokeDasharray="3 3" />}
                <Bar dataKey="value" fill={activeChart === 'calories' ? '#10b981' : activeChart === 'protein' ? '#7c3aed' : '#06b6d4'}
                  radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {shared && (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg">
              Copied to clipboard!
            </div>
          )}

        </>)}
      </div>
    </main>
  )
}
