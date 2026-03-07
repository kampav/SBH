'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  getProfile, getNutrition, getRecentWorkouts, getMetrics,
  getNutritionHistory, getGlucoseSettings, getDailyGlucose,
  getStreak, updateStreak, getSleepHistory,
} from '@/lib/firebase/firestore'
import { UserProfile, GlucoseSettings, GlucoseReading, SleepEntry } from '@/lib/types'
import { displayGlucose } from '@/lib/health/glucoseUtils'
import Link from 'next/link'
import {
  LogOut, User,
  Utensils, Dumbbell, Scale, TrendingUp,
  Activity, Moon, CheckSquare, Brain,
  Bot, Heart, Droplets, Pill,
  CheckCircle, Zap, Settings2,
  type LucideIcon,
} from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'
import ThemeToggle from '@/components/ui/ThemeToggle'
import {
  getDailyTip, computeXP, computeStreak, computeWorkoutStreak,
} from '@/lib/gamification'

const today = new Date().toISOString().slice(0, 10)
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'

function getGreeting(name?: string): string {
  const h = new Date().getHours()
  const s = h < 5 ? 'Still up?' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return name ? `${s}, ${name.split(' ')[0]}` : s
}

interface Action {
  id: string; label: string; sub: string; href: string
  done: boolean; icon: LucideIcon; color: string
}

function buildActions(opts: {
  todayCalories: number; workoutDone: boolean; mealCount: number
  weightLoggedRecently: boolean; sleepLogged: boolean; moodLogged: boolean
  glucoseEnabled: boolean; glucoseLogged: boolean
}): Action[] {
  return [
    { id: 'meal',    label: 'Nutrition', sub: opts.mealCount > 0 ? `${opts.todayCalories} kcal` : 'Log meals',        href: '/nutrition', done: opts.mealCount > 0,           icon: Utensils, color: '#10b981' },
    { id: 'workout', label: 'Workout',   sub: opts.workoutDone ? 'Done!' : 'Log session',                              href: '/workout',   done: opts.workoutDone,             icon: Dumbbell, color: '#6366f1' },
    { id: 'sleep',   label: 'Sleep',     sub: opts.sleepLogged ? 'Logged' : 'Log sleep',                               href: '/sleep',     done: opts.sleepLogged,             icon: Moon,     color: '#a78bfa' },
    { id: 'mood',    label: 'Mood',      sub: opts.moodLogged ? 'Checked in' : 'Check in',                             href: '/mood',      done: opts.moodLogged,              icon: Brain,    color: '#ec4899' },
    { id: 'weight',  label: 'Weight',    sub: opts.weightLoggedRecently ? 'Logged' : 'Weigh in',                       href: '/metrics',   done: opts.weightLoggedRecently,    icon: Scale,    color: '#f59e0b' },
    ...(opts.glucoseEnabled ? [{ id: 'glucose', label: 'Glucose', sub: opts.glucoseLogged ? 'Logged' : 'Log reading', href: '/glucose',  done: opts.glucoseLogged,           icon: Activity, color: '#ef4444' }] : []),
  ]
}

interface TrackerDef {
  href: string; icon: LucideIcon; label: string
  sub: string; color: string; value?: string; done?: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile]           = useState<UserProfile | null>(null)
  const [authReady, setAuthReady]       = useState(false)
  const [todayCalories, setTodayCalories] = useState(0)
  const [todayProtein, setTodayProtein]   = useState(0)
  const [mealCount, setMealCount]         = useState(0)
  const [workoutDoneToday, setWorkoutDoneToday] = useState(false)
  const [workoutStreak, setWorkoutStreak] = useState(0)
  const [, setAllStreak]                  = useState(0)
  const [xp, setXp]                       = useState(0)
  const [aiInsights, setAiInsights]       = useState<{ quote: string; recommendation: string } | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [glucoseSettings, setGlucoseSettings] = useState<GlucoseSettings | null>(null)
  const [latestGlucose, setLatestGlucose]     = useState<GlucoseReading | null>(null)
  const [lastSleep, setLastSleep]             = useState<SleepEntry | null>(null)
  const [weightLoggedToday, setWeightLoggedToday] = useState(false)
  const [moodLoggedToday]                     = useState(false)
  const [hiddenTrackers, setHiddenTrackers]   = useState<string[]>([])
  const [customizing, setCustomizing]         = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sbh_hidden_trackers')
      if (saved) setHiddenTrackers(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }

      const [p, nutrition, workouts, metrics, gs, todayGlucose, sleepHistory] = await Promise.all([
        getProfile(user.uid),
        getNutrition(user.uid, today),
        getRecentWorkouts(user.uid, 90),
        getMetrics(user.uid, 90),
        getGlucoseSettings(user.uid),
        getDailyGlucose(user.uid, today),
        getSleepHistory(user.uid, 3),
      ])

      if (!p?.onboardingComplete) { router.push('/onboarding'); return }
      setProfile(p)

      if (gs?.consentGiven) {
        setGlucoseSettings(gs)
        if (todayGlucose?.readings?.length) {
          const sorted = [...todayGlucose.readings].sort((a, b) => a.time.localeCompare(b.time))
          setLatestGlucose(sorted[sorted.length - 1])
        }
      }
      if (sleepHistory.length) setLastSleep(sleepHistory[sleepHistory.length - 1])
      if (nutrition) {
        setTodayCalories(nutrition.totalCalories)
        setTodayProtein(nutrition.totalProteinG)
        setMealCount(nutrition.meals?.length ?? 0)
      }

      const todayMetric = metrics.find(m => m.date === today)
      setWeightLoggedToday(!!todayMetric)

      const hasActivity = !!(nutrition?.totalCalories || workouts.some(w => w.date === today))
      await getStreak(user.uid).catch(() => null)
      if (hasActivity) await updateStreak(user.uid, today).catch(() => null)

      setWorkoutDoneToday(workouts.some(w => w.date === today))
      const wDates = workouts.map(w => w.date)
      const nDates = nutrition ? [today] : []
      const mDates = metrics.map(m => m.date)
      setWorkoutStreak(computeWorkoutStreak(wDates))
      setAllStreak(computeStreak(Array.from(new Set([...wDates, ...nDates, ...mDates])).sort()))
      setXp(computeXP(wDates, nDates, mDates))

      const cacheKey = `sbh_insights_${user.uid}_${today}`
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        try { setAiInsights(JSON.parse(cached)) } catch { /* */ }
      } else if (p && (nutrition?.totalCalories || workouts.some(w => w.date === today))) {
        setInsightsLoading(true)
        const last7Nutrition = await getNutritionHistory(user.uid, 7)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - (6 - i))
          return d.toISOString().slice(0, 10)
        }).map(date => {
          const n = last7Nutrition.find(n => n.date === date)
          return { date, calories: n?.totalCalories ?? 0, proteinG: n?.totalProteinG ?? 0, hadWorkout: !!workouts.find(w => w.date === date), weightKg: null }
        })
        fetch('/api/ai-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: { calorieTarget: p.calorieTarget, proteinTargetG: p.proteinTargetG, goal: p.goal }, last7Days }),
        })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.quote) {
              const compact = { quote: data.quote, recommendation: data.recommendation }
              setAiInsights(compact)
              sessionStorage.setItem(cacheKey, JSON.stringify(compact))
            }
          })
          .catch(() => {})
          .finally(() => setInsightsLoading(false))
      }
    })
    return unsub
  }, [router])

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const calPct   = profile ? Math.min((todayCalories / profile.calorieTarget) * 100, 100) : 0
  const protPct  = profile ? Math.min((todayProtein / profile.proteinTargetG) * 100, 100) : 0
  const tip      = getDailyTip()
  const greeting = getGreeting(profile?.displayName)
  const dayStr   = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const firstName = profile?.displayName?.split(' ')[0] ?? 'there'

  const actions = buildActions({
    todayCalories, workoutDone: workoutDoneToday, mealCount,
    weightLoggedRecently: weightLoggedToday,
    sleepLogged: !!lastSleep && lastSleep.date >= today,
    moodLogged: moodLoggedToday,
    glucoseEnabled: !!glucoseSettings?.consentGiven,
    glucoseLogged: !!latestGlucose,
  })

  const actionsDone  = actions.filter(a => a.done).length
  const actionsTotal = actions.length
  const readiness    = Math.round((actionsDone / actionsTotal) * 100)
  const readinessColor =
    readiness >= 70 ? '#10b981' :
    readiness >= 40 ? '#f59e0b' : '#f43f5e'

  const trackers: TrackerDef[] = [
    { href: '/nutrition',     icon: Utensils,    label: 'Nutrition',      sub: mealCount > 0 ? `${todayCalories} kcal today` : 'Log meals',           color: '#10b981', done: mealCount > 0 },
    { href: '/workout',       icon: Dumbbell,    label: 'Workout',        sub: workoutDoneToday ? 'Done today' : 'Log session',                         color: '#6366f1', done: workoutDoneToday },
    { href: '/sleep',         icon: Moon,        label: 'Sleep',          sub: lastSleep ? `${lastSleep.durationH}h last night` : 'Log sleep',          color: '#a78bfa', done: !!lastSleep },
    { href: '/glucose',       icon: Activity,    label: 'Glucose',        sub: latestGlucose ? displayGlucose(latestGlucose.valueMmol, glucoseSettings?.preferredUnit ?? 'mmol/L') : 'Log reading', color: '#ef4444', done: !!latestGlucose },
    { href: '/mood',          icon: Brain,       label: 'Mood',           sub: 'Mental check-in',                                                        color: '#ec4899', done: moodLoggedToday },
    { href: '/metrics',       icon: Scale,       label: 'Weight',         sub: weightLoggedToday ? 'Logged today' : 'Daily weigh-in',                   color: '#f59e0b', done: weightLoggedToday },
    { href: '/blood-pressure',icon: Heart,       label: 'Blood Pressure', sub: 'Heart health',                                                           color: '#f43f5e', done: false },
    { href: '/habits',        icon: CheckSquare, label: 'Habits',         sub: 'Daily streaks',                                                          color: '#06b6d4', done: false },
    { href: '/coach',         icon: Bot,         label: 'AI Coach',       sub: 'Chat & check-in',                                                        color: VIOLET,    done: false },
    { href: '/insights',      icon: TrendingUp,  label: 'Weekly Report',  sub: 'AI insights',                                                            color: '#fbbf24', done: false },
    { href: '/pcos',          icon: Droplets,    label: 'PCOS',           sub: 'Cycle & hormones',                                                       color: '#f472b6', done: false },
    { href: '/thyroid',       icon: Pill,        label: 'Thyroid',        sub: 'TSH & fatigue',                                                          color: '#34d399', done: false },
  ]

  return (
    <main className="min-h-screen mesh-bg page-pad pb-32">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="page-header-bar px-4 flex items-center justify-between h-14">
        <div>
          <p className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>{dayStr}</p>
          <p className="text-lg font-black text-1 leading-tight">{greeting}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/profile" className="p-1.5 rounded-xl glass-elevated" style={{ color: 'var(--text-2)' }}>
            <User size={18} />
          </Link>
          <button onClick={() => signOut(auth).then(() => router.push('/login'))}
            className="p-1.5 rounded-xl glass" style={{ color: 'var(--text-3)' }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4 pt-2">

        {/* ── Hero: Daily Readiness ─────────────────────────────── */}
        <div
          className="rounded-3xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg,rgba(124,58,237,0.25) 0%,rgba(6,182,212,0.15) 50%,rgba(244,63,94,0.1) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          {/* Background orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20"
              style={{ background: `radial-gradient(circle,${readinessColor},transparent)` }} />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full opacity-10"
              style={{ background: `radial-gradient(circle,${CYAN},transparent)` }} />
          </div>

          <div className="relative flex items-center gap-5 p-5">
            {/* Readiness ring */}
            <div className="shrink-0">
              <ProgressRing
                value={readiness}
                size={110}
                stroke={10}
                color={readinessColor}
                label={`${readiness}`}
                sublabel="score"
              />
            </div>

            {/* Stats */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: readinessColor }}>
                Daily Readiness
              </p>
              <p className="text-2xl font-black text-1 leading-none mb-3">
                {readiness >= 70 ? 'Great shape' : readiness >= 40 ? 'Getting there' : 'Just starting'}
                <span className="text-sm font-medium text-3 ml-1">, {firstName}</span>
              </p>

              {/* Stat pills row */}
              <div className="flex flex-wrap gap-2">
                <StatPill emoji="✅" value={`${actionsDone}/${actionsTotal}`} label="tasks" color={readinessColor} />
                <StatPill emoji="🔥" value={`${workoutStreak}d`} label="streak" color="#f97316" />
                <StatPill emoji="⚡" value={xp.toLocaleString()} label="XP" color={CYAN} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Today's Actions — horizontal tile scroll ─────────── */}
        <div>
          <div className="flex items-center justify-between px-0.5 mb-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
              Today&apos;s Actions
            </p>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: actionsDone === actionsTotal ? 'rgba(16,185,129,0.15)' : 'rgba(124,58,237,0.12)',
                color: actionsDone === actionsTotal ? '#10b981' : VIOLET,
              }}
            >
              {actionsDone === actionsTotal ? 'All done!' : `${actionsTotal - actionsDone} left`}
            </span>
          </div>

          {/* Horizontal scroll */}
          <div
            className="flex gap-3 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory' }}
          >
            {actions.map(action => (
              <ActionTile key={action.id} {...action} />
            ))}
          </div>
        </div>

        {/* ── Nutrition progress ───────────────────────────────── */}
        <div className="glass-elevated rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
              Nutrition Today
            </p>
            <Link href="/nutrition" className="text-xs font-semibold" style={{ color: VIOLET }}>
              Log meal →
            </Link>
          </div>
          <div className="flex items-center gap-5">
            {/* Rings */}
            <Link href="/nutrition" className="shrink-0">
              <ProgressRing value={calPct} size={80} stroke={7} color="#10b981"
                label={todayCalories > 0 ? `${todayCalories}` : '0'} sublabel="kcal" />
            </Link>
            <div className="flex-1 space-y-3">
              {/* Calorie bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--text-2)' }}>Calories</span>
                  <span className="font-semibold" style={{ color: '#10b981' }}>
                    {todayCalories}<span style={{ color: 'var(--text-3)' }}>/{profile?.calorieTarget ?? 0}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'var(--ring-track)' }}>
                  <div className="h-2 rounded-full transition-all duration-700"
                    style={{ width: `${calPct}%`, background: 'linear-gradient(90deg,#10b981,#34d399)' }} />
                </div>
              </div>
              {/* Protein bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--text-2)' }}>Protein</span>
                  <span className="font-semibold" style={{ color: '#6366f1' }}>
                    {todayProtein}g<span style={{ color: 'var(--text-3)' }}>/{profile?.proteinTargetG ?? 0}g</span>
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'var(--ring-track)' }}>
                  <div className="h-2 rounded-full transition-all duration-700"
                    style={{ width: `${protPct}%`, background: 'linear-gradient(90deg,#6366f1,#818cf8)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── AI Tip ──────────────────────────────────────────────── */}
        <div
          className="rounded-2xl px-4 py-3 flex items-start gap-3"
          style={{
            background: 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(6,182,212,0.05))',
            border: '1px solid rgba(124,58,237,0.15)',
          }}
        >
          <div
            className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5"
            style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})` }}
          >
            <Bot size={13} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            {insightsLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-3">Crafting your personalised tip…</p>
              </div>
            ) : aiInsights ? (
              <>
                <p className="text-sm font-medium text-1 leading-snug">&ldquo;{aiInsights.quote}&rdquo;</p>
                {aiInsights.recommendation && (
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-3)' }}>{aiInsights.recommendation}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-1 leading-snug">{tip}</p>
            )}
          </div>
        </div>

        {/* ── My Trackers ──────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between px-0.5 mb-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
              My Trackers
            </p>
            <button
              onClick={() => setCustomizing(true)}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all active:scale-95"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: VIOLET }}
            >
              <Settings2 size={11} />
              Customise
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {trackers
              .filter(t => !hiddenTrackers.includes(t.label))
              .map(t => <TrackerCard key={t.href + t.label} {...t} />)}
          </div>
          {hiddenTrackers.length > 0 && (
            <button
              onClick={() => setCustomizing(true)}
              className="mt-3 w-full text-xs py-2 rounded-xl text-center"
              style={{ color: 'var(--text-3)', border: '1px dashed var(--glass-border)' }}
            >
              +{hiddenTrackers.length} hidden — tap Customise to show
            </button>
          )}
        </div>

      </div>

      {/* ── Customise sheet ───────────────────────────────────── */}
      {customizing && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setCustomizing(false)}>
          <div
            className="w-full rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--glass-border)' }} />
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-bold text-1">Customise Home Screen</p>
              <button
                onClick={() => setCustomizing(false)}
                className="text-xs px-4 py-1.5 rounded-full font-semibold"
                style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})`, color: '#fff' }}
              >
                Done
              </button>
            </div>
            <div className="space-y-2">
              {trackers.map(t => {
                const hidden = hiddenTrackers.includes(t.label)
                return (
                  <button
                    key={t.label}
                    onClick={() => {
                      const next = hidden
                        ? hiddenTrackers.filter(h => h !== t.label)
                        : [...hiddenTrackers, t.label]
                      setHiddenTrackers(next)
                      localStorage.setItem('sbh_hidden_trackers', JSON.stringify(next))
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.98]"
                    style={{
                      background: hidden ? 'rgba(255,255,255,0.03)' : `${t.color}10`,
                      border: `1px solid ${hidden ? 'var(--glass-border)' : t.color + '28'}`,
                    }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${t.color}20` }}>
                      <t.icon size={16} style={{ color: hidden ? 'var(--text-3)' : t.color }} />
                    </div>
                    <span className="flex-1 text-left text-sm font-medium"
                      style={{ color: hidden ? 'var(--text-3)' : 'var(--text-1)' }}>
                      {t.label}
                    </span>
                    {/* iOS-style toggle */}
                    <div className="w-12 h-6 rounded-full relative transition-all duration-200 shrink-0"
                      style={{ background: hidden ? 'rgba(255,255,255,0.12)' : t.color }}>
                      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200"
                        style={{ left: hidden ? '2px' : '26px' }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ── Action Tile (horizontal scroll item) ──────────────────────────────────────
function ActionTile({ href, icon: Icon, label, sub, done, color }: Action) {
  return (
    <Link
      href={href}
      className="shrink-0 flex flex-col items-center gap-2 rounded-2xl p-3 transition-all duration-200 active:scale-95"
      style={{
        width: 86,
        scrollSnapAlign: 'start',
        background: done
          ? `linear-gradient(145deg,${color}28,${color}12)`
          : 'rgba(255,255,255,0.05)',
        border: `1.5px solid ${done ? color + '50' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: done ? `0 4px 16px ${color}22` : 'none',
      }}
    >
      {/* Icon bubble */}
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all"
        style={{
          background: done ? `${color}30` : 'rgba(255,255,255,0.07)',
          border: `1px solid ${done ? color + '40' : 'rgba(255,255,255,0.1)'}`,
        }}
      >
        {done
          ? <CheckCircle size={20} style={{ color }} />
          : <Icon size={20} strokeWidth={1.75} style={{ color: done ? color : 'var(--text-3)' }} />
        }
      </div>

      {/* Label */}
      <p
        className="text-[11px] font-semibold text-center leading-tight"
        style={{ color: done ? color : 'var(--text-2)' }}
      >
        {label}
      </p>

      {/* Status */}
      <span
        className="text-[10px] font-medium text-center leading-none"
        style={{ color: done ? color + 'cc' : 'var(--text-3)' }}
      >
        {sub}
      </span>
    </Link>
  )
}

// ── Stat Pill ─────────────────────────────────────────────────────────────────
function StatPill({ emoji, value, label, color }: { emoji: string; value: string; label: string; color: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
      style={{ background: `${color}18`, border: `1px solid ${color}30` }}
    >
      <span className="text-sm leading-none">{emoji}</span>
      <span className="text-xs font-bold leading-none" style={{ color }}>{value}</span>
      <span className="text-[10px] leading-none" style={{ color: 'var(--text-3)' }}>{label}</span>
    </div>
  )
}

// ── Tracker Card ──────────────────────────────────────────────────────────────
function TrackerCard({ href, icon: Icon, label, sub, color, done }: TrackerDef) {
  return (
    <Link
      href={href}
      className="glass rounded-2xl p-4 flex flex-col gap-2.5 transition-all duration-200 active:scale-[0.97]"
      style={done ? { border: `1px solid ${color}35`, boxShadow: `0 0 0 1px ${color}15` } : undefined}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}22` }}
        >
          <Icon size={16} strokeWidth={2} style={{ color }} />
        </div>
        {done && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.15)' }}>
            <Zap size={10} style={{ color: '#10b981' }} />
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-1">{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</p>
      </div>
    </Link>
  )
}
