'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getProfile, getNutrition, getRecentWorkouts, getMetrics, getNutritionHistory } from '@/lib/firestore'
import { UserProfile } from '@/lib/types'
import Link from 'next/link'
import { LogOut, Zap, Trophy, ChevronRight, User } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'
import {
  getDailyTip, computeXP, getLevel, getLevelProgress,
  computeStreak, computeWorkoutStreak, computeWeekCalendar,
  isStreakMilestone, computeBadges, WeekDayStatus,
} from '@/lib/gamification'

const today = new Date().toISOString().slice(0, 10)

const PHASES = [
  { num: 1, weeks: '1–4',  name: 'Fat Loss Foundation',  color: '#10b981' },
  { num: 2, weeks: '5–8',  name: 'Muscle Growth',         color: '#6366f1' },
  { num: 3, weeks: '9–12', name: 'Definition & Power',    color: '#f59e0b' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [todayCalories, setTodayCalories] = useState(0)
  const [todayProtein, setTodayProtein] = useState(0)
  const [workoutStreak, setWorkoutStreak] = useState(0)
  const [allStreak, setAllStreak] = useState(0)
  const [weekCalendar, setWeekCalendar] = useState<WeekDayStatus[]>([])
  const [xp, setXp] = useState(0)
  const [badgeCount, setBadgeCount] = useState(0)
  const [programmeWeek, setProgrammeWeek] = useState(1)
  const [aiInsights, setAiInsights] = useState<{ quote: string; insights: string[]; recommendation: string } | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      const saved = localStorage.getItem(`sbh_week_${user.uid}`)
      setProgrammeWeek(saved ? Math.min(Math.max(parseInt(saved), 1), 12) : 1)
      const [p, nutrition, workouts, metrics] = await Promise.all([
        getProfile(user.uid),
        getNutrition(user.uid, today),
        getRecentWorkouts(user.uid, 90),
        getMetrics(user.uid, 90),
      ])
      if (!p?.onboardingComplete) { router.push('/onboarding'); return }
      setProfile(p)
      if (nutrition) {
        setTodayCalories(nutrition.totalCalories)
        setTodayProtein(nutrition.totalProteinG)
      }
      const wDates = workouts.map(w => w.date)
      const nDates = nutrition ? [today] : []
      const mDates = metrics.map(m => m.date)
      const wStreak = computeWorkoutStreak(wDates)
      setWorkoutStreak(wStreak)
      const aStreak = computeStreak(Array.from(new Set([...wDates, ...nDates, ...mDates])).sort())
      setAllStreak(aStreak)
      setWeekCalendar(computeWeekCalendar(wDates, nDates))
      const totalXp = computeXP(wDates, nDates, mDates)
      setXp(totalXp)
      const badges = computeBadges({
        totalWorkouts: workouts.length,
        totalNutritionDays: nDates.length,
        totalWeightLogs: mDates.length,
        workoutStreak: wStreak,
        allStreak: aStreak,
        xp: totalXp,
      })
      setBadgeCount(badges.filter(b => b.earned).length)

      // AI Insights — cached once per day per user
      const cacheKey = `sbh_insights_${user.uid}_${today}`
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        try { setAiInsights(JSON.parse(cached)) } catch { /* ignore */ }
      } else {
        const last7Dates = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - (6 - i))
          return d.toISOString().slice(0, 10)
        })
        const last7Nutrition = await getNutritionHistory(user.uid, 7)
        const last7Days = last7Dates.map(date => {
          const nutEntry = last7Nutrition.find(n => n.date === date)
          const workout  = workouts.find(w => w.date === date)
          const metric   = metrics.find(m => m.date === date)
          return { date, calories: nutEntry?.totalCalories ?? 0, proteinG: nutEntry?.totalProteinG ?? 0, hadWorkout: !!workout, weightKg: metric?.weightKg ?? null }
        })
        if (p && last7Days.some(d => d.calories > 0 || d.hadWorkout)) {
          setInsightsLoading(true)
          fetch('/api/ai-insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile: { calorieTarget: p.calorieTarget, proteinTargetG: p.proteinTargetG, weightKg: p.weightKg, goal: p.goal }, last7Days }),
          })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.quote) { setAiInsights(data); sessionStorage.setItem(cacheKey, JSON.stringify(data)) } })
            .catch(() => {})
            .finally(() => setInsightsLoading(false))
        }
      }
    })
    return unsub
  }, [router])

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-2 text-sm">Loading your stats...</p>
      </div>
    </main>
  )

  const calPct  = profile ? Math.min((todayCalories / profile.calorieTarget) * 100, 100) : 0
  const protPct = profile ? Math.min((todayProtein / profile.proteinTargetG) * 100, 100) : 0
  const { level, title: levelTitle } = getLevel(xp)
  const lvlPct  = getLevelProgress(xp)
  const tip     = getDailyTip()
  const showMilestoneBanner = isStreakMilestone(workoutStreak) && workoutStreak > 0
  const greeting = getGreeting(profile?.displayName)
  const dayStr  = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const phase   = programmeWeek <= 4 ? 1 : programmeWeek <= 8 ? 2 : 3
  const currentPhase = PHASES[phase - 1]

  // Today's workout day (Mon=0 … Sun=6)
  const dow = new Date().getDay()
  const todayDayIdx = dow === 0 ? 6 : dow - 1
  const DAY_LABELS = ['Push + Core', 'HIIT + Legs', 'Pull + Abs', 'Active Recovery', 'Full Body Strength', 'Fat Burn Accelerator', 'Rest Day']
  const todayLabel = DAY_LABELS[todayDayIdx]

  return (
    <main className="min-h-screen mesh-bg page-pad">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-20 w-72 h-72 rounded-full opacity-10"
          style={{background:'radial-gradient(circle, #6366f1, transparent)', filter:'blur(50px)'}} />
        <div className="absolute bottom-20 -left-20 w-60 h-60 rounded-full opacity-8"
          style={{background:'radial-gradient(circle, #10b981, transparent)', filter:'blur(40px)'}} />
      </div>

      <header className="px-4 pt-12 pb-4 flex items-start justify-between relative">
        <div>
          <p className="text-2 text-xs mb-0.5">{dayStr}</p>
          <h1 className="text-xl font-bold text-1">{greeting}</h1>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Link href="/profile" className="p-2 rounded-xl glass text-slate-400 hover:text-slate-200 transition-colors">
            <User size={16} />
          </Link>
          <button onClick={() => signOut(auth).then(() => router.push('/login'))}
            className="p-2 rounded-xl glass text-slate-500 hover:text-slate-300 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4 relative">

        {/* Phase banner */}
        <Link href="/workout" className="block glass rounded-2xl p-4 border transition-all card-hover"
          style={{borderColor: currentPhase.color + '30'}}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{background: currentPhase.color + '20', color: currentPhase.color}}>
                  Phase {phase} · Week {programmeWeek}/12
                </span>
              </div>
              <p className="font-bold text-white text-sm">{todayLabel}</p>
              <p className="text-xs text-2 mt-0.5">{currentPhase.name}</p>
            </div>
            <ChevronRight size={20} style={{color: currentPhase.color}} />
          </div>
        </Link>

        {/* XP bar */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">Level {level} · {levelTitle}</span>
            </div>
            <span className="text-xs text-2">{xp.toLocaleString()} XP</span>
          </div>
          <div className="w-full rounded-full h-1.5" style={{background:'rgba(255,255,255,0.06)'}}>
            <div className="xp-bar h-1.5 rounded-full"
              style={{width:`${lvlPct}%`, background:'linear-gradient(90deg,#f59e0b,#fbbf24)'}} />
          </div>
        </div>

        {/* Streak card — expanded with week calendar */}
        <div className="glass rounded-2xl p-4 space-y-3">
          {/* Milestone banner */}
          {showMilestoneBanner && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{background:'rgba(245,158,11,0.12)', color:'#f59e0b'}}>
              🎉 {workoutStreak}-day workout streak milestone!
            </div>
          )}

          {/* Streak numbers */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl leading-none flame">🔥</span>
              <div>
                <p className="text-2xl font-bold text-1">{workoutStreak}</p>
                <p className="text-xs text-2">workout streak</p>
              </div>
            </div>
            <div className="h-8 w-px shrink-0" style={{background:'rgba(255,255,255,0.08)'}} />
            <div>
              <p className="text-2xl font-bold text-1">{allStreak}</p>
              <p className="text-xs text-2">all-activity streak</p>
            </div>
          </div>

          {/* This week mini-calendar */}
          {weekCalendar.length > 0 && (
            <div>
              <p className="text-xs text-3 uppercase tracking-widest mb-2">This Week</p>
              <div className="grid grid-cols-7 gap-1">
                {weekCalendar.map(day => {
                  const dotColor = day.hasWorkout ? '#10b981' : day.hasNutrition ? '#7c3aed' : null
                  return (
                    <div key={day.date} className="flex flex-col items-center gap-1">
                      <p className="text-xs text-3">{day.dayName}</p>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{
                          background: dotColor ? dotColor + '20' : 'rgba(255,255,255,0.03)',
                          border: day.isToday ? `1px solid ${dotColor ?? '#475569'}60` : '1px solid transparent',
                        }}>
                        <div className="w-2.5 h-2.5 rounded-full"
                          style={{background: dotColor ?? 'rgba(255,255,255,0.08)'}} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-3 mt-1.5 text-xs text-3">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{background:'#10b981'}} />
                  Workout
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{background:'#7c3aed'}} />
                  Nutrition
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Badges */}
        <Link href="/metrics" className="glass rounded-2xl p-4 flex items-center gap-3 card-hover">
          <Trophy size={28} className="text-amber-400 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-1">{badgeCount}</p>
            <p className="text-xs text-2">badges earned</p>
          </div>
        </Link>

        {/* Progress rings */}
        <div className="glass rounded-2xl p-4">
          <h2 className="text-xs font-semibold text-2 uppercase tracking-widest mb-4">Today&apos;s Progress</h2>
          <div className="flex items-center justify-around">
            <ProgressRing value={calPct} size={120} stroke={10} color="#10b981" bg="rgba(255,255,255,0.06)"
              label={`${todayCalories}`} sublabel="kcal eaten" />
            <div className="text-center">
              <p className="text-xs text-2 mb-1">Target</p>
              <p className="text-lg font-bold gradient-text">{profile?.calorieTarget ?? '--'}</p>
              <p className="text-xs text-2">kcal/day</p>
            </div>
            <ProgressRing value={protPct} size={120} stroke={10} color="#6366f1" bg="rgba(255,255,255,0.06)"
              label={`${todayProtein}g`} sublabel="protein" />
          </div>
        </div>

        {/* AI Coach Insights */}
        {(insightsLoading || aiInsights) && (
          <div className="glass rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{color:'#7c3aed'}}>✨ AI Coach Insights</p>
            {insightsLoading ? (
              <div className="flex items-center gap-2 text-sm text-2 py-2">
                <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                Analysing your last 7 days…
              </div>
            ) : aiInsights && (
              <div className="space-y-3">
                <p className="text-sm italic leading-relaxed border-l-2 pl-3" style={{borderColor:'#7c3aed', color:'#c4b5fd'}}>
                  &ldquo;{aiInsights.quote}&rdquo;
                </p>
                <ul className="space-y-1.5">
                  {aiInsights.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{background:'#7c3aed'}} />
                      {insight}
                    </li>
                  ))}
                </ul>
                <div className="rounded-xl p-3 text-xs" style={{background:'rgba(6,182,212,0.08)', border:'1px solid rgba(6,182,212,0.2)'}}>
                  <p className="font-semibold mb-1" style={{color:'#06b6d4'}}>This week → try this</p>
                  <p className="text-2">{aiInsights.recommendation}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Daily Tip */}
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">Daily Science Tip</p>
          <p className="text-sm text-1 leading-relaxed">{tip}</p>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xs font-semibold text-2 uppercase tracking-widest mb-3">Quick Log</h2>
          <div className="grid grid-cols-2 gap-3">
            <ActionCard href="/nutrition" emoji="🍽️" label="Log Meal"     sub="Track calories & macros" color="#10b981" />
            <ActionCard href="/workout"   emoji="💪" label="Start Workout" sub={todayLabel}              color="#6366f1" />
            <ActionCard href="/metrics"   emoji="⚖️"  label="Log Weight"   sub="Track your progress"    color="#f59e0b" />
            <ActionCard href="/metrics"   emoji="📊" label="View Trends"   sub="Charts & insights"      color="#ec4899" />
          </div>
        </div>

        {/* Macro targets */}
        {profile && (
          <div className="glass rounded-2xl p-4">
            <h2 className="text-xs font-semibold text-2 uppercase tracking-widest mb-3">Daily Targets</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <TargetRow label="Calories" value={`${profile.calorieTarget} kcal`} color="text-emerald-400" />
              <TargetRow label="Protein"  value={`${profile.proteinTargetG}g`}    color="text-indigo-400" />
              <TargetRow label="Carbs"    value={`${profile.carbTargetG}g`}       color="text-amber-400" />
              <TargetRow label="Fat"      value={`${profile.fatTargetG}g`}        color="text-rose-400" />
            </div>
          </div>
        )}

        {/* Nutrition target reminder */}
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-semibold text-2 uppercase tracking-widest mb-3">Nutrition Protocol</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { emoji: '🥩', text: 'Protein every meal' },
              { emoji: '🚫', text: 'No liquid calories' },
              { emoji: '🍬', text: 'Sugar post-workout only' },
              { emoji: '💧', text: '3L water daily' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-2 glass rounded-xl p-2.5">
                <span>{item.emoji}</span>
                <span className="text-2">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

function getGreeting(name?: string): string {
  const h = new Date().getHours()
  const s = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return name ? `${s}, ${name.split(' ')[0]}` : s
}

function ActionCard({ href, emoji, label, sub, color }: {
  href: string; emoji: string; label: string; sub: string; color: string
}) {
  return (
    <Link href={href} className="glass rounded-2xl p-4 card-hover flex items-start gap-3 border transition-all hover:border-opacity-50"
      style={{'--hover-color': color} as React.CSSProperties}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{background: color + '18'}}>
        {emoji}
      </div>
      <div>
        <p className="font-semibold text-sm text-1">{label}</p>
        <p className="text-xs text-2 mt-0.5 line-clamp-1">{sub}</p>
      </div>
    </Link>
  )
}

function TargetRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-2 text-xs">{label}</span>
      <span className={`font-semibold text-sm ${color}`}>{value}</span>
    </div>
  )
}
