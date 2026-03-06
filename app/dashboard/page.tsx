'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getProfile, getNutrition, getRecentWorkouts, getMetrics, getNutritionHistory, getGlucoseSettings, getDailyGlucose, getStreak, updateStreak, getSleepHistory } from '@/lib/firestore'
import { UserProfile, GlucoseSettings, GlucoseReading, SleepEntry } from '@/lib/types'
import { displayGlucose, glucoseColor, DEFAULT_GLUCOSE_SETTINGS } from '@/lib/glucoseUtils'
import { calcSleepScore, sleepScoreLabel } from '@/lib/sleepUtils'
import { computeDailyContext } from '@/lib/daily-context'
import Link from 'next/link'
import { LogOut, Zap, Trophy, ChevronRight, User, Utensils, Dumbbell, Scale, TrendingUp, Activity, Moon, type LucideIcon } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'
import ThemeToggle from '@/components/ui/ThemeToggle'
import {
  getDailyTip, computeXP, getLevel, getLevelProgress,
  computeStreak, computeWorkoutStreak, computeWeekCalendar,
  isStreakMilestone, computeBadges, WeekDayStatus,
} from '@/lib/gamification'

const today = new Date().toISOString().slice(0, 10)

const PHASES = [
  { num: 1, name: 'Fat Loss Foundation',  color: '#10b981' },
  { num: 2, name: 'Muscle Growth',         color: '#6366f1' },
  { num: 3, name: 'Definition & Power',    color: '#f59e0b' },
]

const DAY_LABELS = ['Push + Core', 'HIIT + Legs', 'Pull + Abs', 'Active Recovery', 'Full Body Strength', 'Fat Burn Accelerator', 'Rest Day']

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [todayCalories, setTodayCalories] = useState(0)
  const [todayProtein, setTodayProtein] = useState(0)
  const [workoutDoneToday, setWorkoutDoneToday] = useState(false)
  const [workoutStreak, setWorkoutStreak] = useState(0)
  const [allStreak, setAllStreak] = useState(0)
  const [weekCalendar, setWeekCalendar] = useState<WeekDayStatus[]>([])
  const [xp, setXp] = useState(0)
  const [badgeCount, setBadgeCount] = useState(0)
  const [programmeWeek, setProgrammeWeek] = useState(1)
  const [aiInsights, setAiInsights] = useState<{ quote: string; insights: string[]; recommendation: string } | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [glucoseSettings, setGlucoseSettings] = useState<GlucoseSettings | null>(null)
  const [latestGlucose, setLatestGlucose] = useState<GlucoseReading | null>(null)
  const [insightBadge, setInsightBadge] = useState<string | null>(null)
  const [lastSleep, setLastSleep] = useState<SleepEntry | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      const saved = localStorage.getItem(`sbh_week_${user.uid}`)
      setProgrammeWeek(saved ? Math.min(Math.max(parseInt(saved), 1), 12) : 1)
      const [p, nutrition, workouts, metrics, gs, todayGlucose, sleepHistory] = await Promise.all([
        getProfile(user.uid),
        getNutrition(user.uid, today),
        getRecentWorkouts(user.uid, 90),
        getMetrics(user.uid, 90),
        getGlucoseSettings(user.uid),
        getDailyGlucose(user.uid, today),
        getSleepHistory(user.uid, 3),
      ])
      if (gs?.consentGiven) {
        setGlucoseSettings(gs)
        if (todayGlucose?.readings?.length) {
          const sorted = [...todayGlucose.readings].sort((a, b) => a.time.localeCompare(b.time))
          setLatestGlucose(sorted[sorted.length - 1])
        }
      }
      if (sleepHistory.length) setLastSleep(sleepHistory[sleepHistory.length - 1])
      if (!p?.onboardingComplete) { router.push('/onboarding'); return }
      setProfile(p)
      if (nutrition) {
        setTodayCalories(nutrition.totalCalories)
        setTodayProtein(nutrition.totalProteinG)
      }
      // Update Firestore streak and compute insight badge
      const streak = await getStreak(user.uid).catch(() => null)
      const hasActivity = !!(nutrition?.totalCalories || workouts.some(w => w.date === today))
      const updatedStreak = hasActivity ? await updateStreak(user.uid, today).catch(() => streak) : streak
      setWorkoutDoneToday(workouts.some(w => w.date === today))
      const wDates = workouts.map(w => w.date)
      const nDates = nutrition ? [today] : []
      const mDates = metrics.map(m => m.date)
      const wStreak = computeWorkoutStreak(wDates)
      setWorkoutStreak(wStreak)
      const aStreak = computeStreak(Array.from(new Set([...wDates, ...nDates, ...mDates])).sort())
      setAllStreak(aStreak)
      // Compute DailyContext insight badge
      if (p) {
        const ctx = computeDailyContext({
          uid: user.uid, todayNutrition: nutrition, recentMetrics: metrics, recentNutrition: [],
          todayWorkout: workouts.find(w => w.date === today) ?? null,
          streak: updatedStreak ?? null,
          calorieTarget: p.calorieTarget, proteinTarget: p.proteinTargetG,
          carbTarget: p.carbTargetG, fatTarget: p.fatTargetG,
          trainingDaysPerWeek: p.trainingDaysPerWeek,
        })
        setInsightBadge(ctx.insightBadge)
      }
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
  const dow = new Date().getDay()
  const todayLabel = DAY_LABELS[dow === 0 ? 6 : dow - 1]

  return (
    <main className="min-h-screen mesh-bg page-pad">
      <header className="px-4 pt-12 pb-3 flex items-center justify-between">
        <div>
          <p className="text-2 text-xs mb-0.5">{dayStr}</p>
          <h1 className="text-xl font-bold text-1">{greeting}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/profile" className="p-2 rounded-xl glass transition-colors" style={{color:'var(--text-2)'}}>
            <User size={16} />
          </Link>
          <button onClick={() => signOut(auth).then(() => router.push('/login'))}
            className="p-2 rounded-xl glass transition-colors" style={{color:'var(--text-3)'}}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-3 relative">

        {/* ── TODAY'S PROGRESS (most important — first) ── */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-2 uppercase tracking-widest">Today&apos;s Progress</h2>
            {calPct >= 100 && <span className="text-xs font-semibold text-emerald-400">🎯 Goal hit!</span>}
          </div>
          <div className="flex items-center justify-around">
            <Link href="/nutrition">
              <ProgressRing value={calPct} size={110} stroke={9} color="#10b981" bg="rgba(255,255,255,0.06)"
                label={`${todayCalories}`} sublabel="kcal eaten" />
            </Link>
            <div className="text-center">
              <p className="text-xs text-2 mb-0.5">Target</p>
              <p className="text-xl font-bold gradient-text">{profile?.calorieTarget ?? '--'}</p>
              <p className="text-xs text-2">kcal / day</p>
              {calPct > 0 && (
                <p className="text-xs mt-1 font-medium" style={{color: calPct > 105 ? '#f43f5e' : calPct >= 90 ? '#10b981' : '#f59e0b'}}>
                  {calPct > 105 ? `+${Math.round(todayCalories - (profile?.calorieTarget ?? 0))} over` :
                   calPct >= 90 ? 'On track' :
                   `${Math.round((profile?.calorieTarget ?? 0) - todayCalories)} left`}
                </p>
              )}
            </div>
            <Link href="/nutrition">
              <ProgressRing value={protPct} size={110} stroke={9} color="#6366f1" bg="rgba(255,255,255,0.06)"
                label={`${todayProtein}g`} sublabel="protein" />
            </Link>
          </div>
        </div>

        {/* ── DAILY INSIGHT BADGE ── */}
        {insightBadge && (
          <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-lg">✨</span>
            <p className="text-sm font-semibold text-1">{insightBadge}</p>
          </div>
        )}

        {/* ── GLUCOSE WIDGET (shown only if consent given) ── */}
        {glucoseSettings?.consentGiven && (
          <Link href="/glucose" className="block glass rounded-2xl p-4 card-hover">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.15)' }}>
                  <Activity size={18} style={{ color: '#10b981' }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-2 uppercase tracking-widest">Glucose</p>
                  {latestGlucose ? (
                    <p className="font-bold text-sm"
                      style={{ color: glucoseColor(latestGlucose.valueMmol, { ...DEFAULT_GLUCOSE_SETTINGS, ...glucoseSettings }) }}>
                      {displayGlucose(latestGlucose.valueMmol, glucoseSettings.preferredUnit)}
                    </p>
                  ) : (
                    <p className="text-xs text-3">No reading today</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                {latestGlucose && (
                  <p className="text-xs text-2">{latestGlucose.time} · {latestGlucose.context.replace(/_/g, ' ')}</p>
                )}
                <p className="text-xs font-semibold" style={{ color: '#7c3aed' }}>+ Log reading →</p>
              </div>
            </div>
          </Link>
        )}

        {/* ── SLEEP WIDGET ── */}
        <Link href="/sleep" className="block glass rounded-2xl p-4 card-hover">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(124,58,237,0.15)' }}>
                <Moon size={18} style={{ color: '#7c3aed' }} />
              </div>
              <div>
                <p className="text-xs font-semibold text-2 uppercase tracking-widest">Sleep</p>
                {lastSleep ? (
                  <p className="font-bold text-sm" style={{ color: sleepScoreLabel(calcSleepScore(lastSleep.durationH, lastSleep.quality)).color }}>
                    {lastSleep.durationH}h — {sleepScoreLabel(calcSleepScore(lastSleep.durationH, lastSleep.quality)).label}
                  </p>
                ) : (
                  <p className="text-xs text-3">No sleep logged</p>
                )}
              </div>
            </div>
            <div className="text-right">
              {lastSleep && <p className="text-xs text-2">{lastSleep.date} · Q{lastSleep.quality}/5</p>}
              <p className="text-xs font-semibold" style={{ color: '#7c3aed' }}>
                {lastSleep ? 'View →' : '+ Log sleep →'}
              </p>
            </div>
          </div>
        </Link>

        {/* ── QUICK LOG (primary CTAs) ── */}
        <div className="grid grid-cols-2 gap-3">
          <QuickCard href="/nutrition" Icon={Utensils} label="Log Meal" sub="Calories & macros" color="#10b981" done={todayCalories > 0} />
          <QuickCard href="/workout"   Icon={Dumbbell}  label="Workout"  sub={todayLabel}        color="#6366f1" done={workoutDoneToday} />
          <QuickCard href="/metrics"   Icon={Scale}     label="Log Weight" sub="Daily check-in"  color="#f59e0b" done={false} />
          <QuickCard href="/metrics"   Icon={TrendingUp} label="Progress" sub="Charts & trends"  color="#ec4899" done={false} />
        </div>

        {/* ── TODAY'S WORKOUT (phase + programme) ── */}
        <Link href="/workout" className="block glass rounded-2xl p-4 card-hover"
          style={{borderColor: currentPhase.color + '30', border: `1px solid ${currentPhase.color}30`}}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold inline-block mb-1.5"
                style={{background: currentPhase.color + '18', color: currentPhase.color}}>
                Phase {phase} · Week {programmeWeek}/12
              </span>
              <p className="font-bold text-1 text-sm">{todayLabel}</p>
              <p className="text-xs text-2 mt-0.5">{currentPhase.name}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {workoutDoneToday && <span className="text-xs text-emerald-400 font-semibold">✓ Done</span>}
              <ChevronRight size={20} style={{color: currentPhase.color}} />
            </div>
          </div>
        </Link>

        {/* ── AI COACH INSIGHTS ── */}
        {(insightsLoading || aiInsights) && (
          <div className="glass rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{color:'#7c3aed'}}>✨ AI Coach Insights</p>
            {insightsLoading ? (
              <div className="flex items-center gap-2 text-sm text-2 py-1">
                <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                Analysing your last 7 days…
              </div>
            ) : aiInsights && (
              <div className="space-y-3">
                <p className="text-sm italic leading-relaxed border-l-2 pl-3"
                  style={{borderColor:'#7c3aed', color:'#a78bfa'}}>
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

        {/* ── STREAKS + WEEK CALENDAR ── */}
        <div className="glass rounded-2xl p-4 space-y-3">
          {showMilestoneBanner && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{background:'rgba(245,158,11,0.12)', color:'#f59e0b'}}>
              🎉 {workoutStreak}-day workout streak milestone!
            </div>
          )}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="text-3xl leading-none flame">🔥</span>
              <div>
                <p className="text-2xl font-bold text-1 leading-tight">{workoutStreak}</p>
                <p className="text-xs text-2">workout streak</p>
              </div>
            </div>
            <div className="h-8 w-px shrink-0" style={{background:'var(--glass-border)'}} />
            <div>
              <p className="text-2xl font-bold text-1 leading-tight">{allStreak}</p>
              <p className="text-xs text-2">all-activity streak</p>
            </div>
            <div className="ml-auto">
              <Link href="/metrics" className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                <Trophy size={13} />
                {badgeCount} badges
              </Link>
            </div>
          </div>

          {weekCalendar.length > 0 && (
            <div>
              <p className="text-xs text-3 uppercase tracking-widest mb-2">This Week</p>
              <div className="grid grid-cols-7 gap-1">
                {weekCalendar.map(day => {
                  const dotColor = day.hasWorkout ? '#10b981' : day.hasNutrition ? '#7c3aed' : null
                  return (
                    <div key={day.date} className="flex flex-col items-center gap-1">
                      <p className="text-xs text-3">{day.dayName}</p>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                        style={{
                          background: dotColor ? dotColor + '20' : 'rgba(255,255,255,0.03)',
                          border: day.isToday ? `1px solid ${dotColor ?? 'var(--text-3)'}60` : '1px solid transparent',
                        }}>
                        <div className="w-2.5 h-2.5 rounded-full"
                          style={{background: dotColor ?? 'rgba(255,255,255,0.08)'}} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{background:'#10b981'}} /> Workout
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{background:'#7c3aed'}} /> Nutrition
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── XP / LEVEL ── */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">Level {level} · {levelTitle}</span>
            </div>
            <span className="text-xs text-2">{xp.toLocaleString()} XP</span>
          </div>
          <div className="w-full rounded-full h-2" style={{background:'rgba(255,255,255,0.06)'}}>
            <div className="xp-bar h-2 rounded-full"
              style={{width:`${lvlPct}%`, background:'linear-gradient(90deg,#f59e0b,#fbbf24)'}} />
          </div>
        </div>

        {/* ── MACRO TARGETS ── */}
        {profile && (
          <div className="glass rounded-2xl p-4">
            <h2 className="text-xs font-semibold text-2 uppercase tracking-widest mb-3">Daily Targets</h2>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Calories', val: `${profile.calorieTarget}`, unit: 'kcal', color: '#10b981' },
                { label: 'Protein',  val: `${profile.proteinTargetG}`, unit: 'g',   color: '#6366f1' },
                { label: 'Carbs',    val: `${profile.carbTargetG}`,    unit: 'g',   color: '#f59e0b' },
                { label: 'Fat',      val: `${profile.fatTargetG}`,     unit: 'g',   color: '#f43f5e' },
              ].map(t => (
                <div key={t.label} className="glass rounded-xl p-2.5 text-center">
                  <p className="text-xs text-2 mb-0.5">{t.label}</p>
                  <p className="font-bold text-sm" style={{color: t.color}}>{t.val}</p>
                  <p className="text-xs text-3">{t.unit}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DAILY TIP ── */}
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{color:'#6366f1'}}>Daily Science Tip</p>
          <p className="text-sm text-1 leading-relaxed">{tip}</p>
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

function QuickCard({ href, Icon, label, sub, color, done }: {
  href: string; Icon: LucideIcon
  label: string; sub: string; color: string; done: boolean
}) {
  return (
    <Link href={href} className="glass rounded-2xl p-3.5 card-hover flex items-center gap-3 active:scale-95 transition-transform"
      style={{border: done ? `1px solid ${color}30` : undefined}}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{background: color + '18'}}>
        <Icon size={17} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm text-1 truncate">{label}</p>
          {done && <span className="text-xs" style={{color}}>✓</span>}
        </div>
        <p className="text-xs text-2 truncate">{sub}</p>
      </div>
    </Link>
  )
}
