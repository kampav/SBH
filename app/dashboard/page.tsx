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
  CheckCircle, Circle, ChevronRight,
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

// ── Greeting ──────────────────────────────────────────────────────────────────
function getGreeting(name?: string): string {
  const h = new Date().getHours()
  const s = h < 5 ? 'Still up?' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return name ? `${s}, ${name.split(' ')[0]}` : s
}

// ── Today's Actions ───────────────────────────────────────────────────────────
interface Action {
  id: string
  label: string
  sub: string
  href: string
  done: boolean
  icon: LucideIcon
  color: string
}

function buildActions(opts: {
  todayCalories: number
  workoutDone: boolean
  mealCount: number
  weightLoggedRecently: boolean
  sleepLogged: boolean
  moodLogged: boolean
  glucoseEnabled: boolean
  glucoseLogged: boolean
}): Action[] {
  return [
    {
      id: 'meal',
      label: opts.mealCount > 0 ? `${opts.mealCount} meal${opts.mealCount > 1 ? 's' : ''} logged` : 'Log your first meal',
      sub:   opts.mealCount > 0 ? `${opts.todayCalories} kcal today` : 'Track calories & protein',
      href:  '/nutrition',
      done:  opts.mealCount > 0,
      icon:  Utensils,
      color: '#10b981',
    },
    {
      id: 'workout',
      label: opts.workoutDone ? 'Workout complete' : 'Log a workout',
      sub:   opts.workoutDone ? 'Great work today!' : 'Keep your streak alive',
      href:  '/workout',
      done:  opts.workoutDone,
      icon:  Dumbbell,
      color: '#6366f1',
    },
    {
      id: 'sleep',
      label: opts.sleepLogged ? 'Sleep logged' : 'Log last night\'s sleep',
      sub:   opts.sleepLogged ? 'Rest data recorded' : '7-9h is the sweet spot',
      href:  '/sleep',
      done:  opts.sleepLogged,
      icon:  Moon,
      color: '#a78bfa',
    },
    {
      id: 'mood',
      label: opts.moodLogged ? 'Mood checked in' : 'How are you feeling?',
      sub:   opts.moodLogged ? 'Mental check-in done' : 'Track energy & anxiety',
      href:  '/mood',
      done:  opts.moodLogged,
      icon:  Brain,
      color: '#ec4899',
    },
    {
      id: 'weight',
      label: opts.weightLoggedRecently ? 'Weight logged' : 'Log your weight',
      sub:   opts.weightLoggedRecently ? 'Progress tracked' : 'Daily body metric',
      href:  '/metrics',
      done:  opts.weightLoggedRecently,
      icon:  Scale,
      color: '#f59e0b',
    },
    ...(opts.glucoseEnabled ? [{
      id:    'glucose',
      label: opts.glucoseLogged ? 'Glucose logged' : 'Log glucose reading',
      sub:   opts.glucoseLogged ? 'Today\'s reading saved' : 'Track blood sugar',
      href:  '/glucose',
      done:  opts.glucoseLogged,
      icon:  Activity,
      color: '#ef4444',
    }] : []),
  ]
}

// ── Tracker card grid ─────────────────────────────────────────────────────────
interface TrackerDef {
  href:  string
  icon:  LucideIcon
  label: string
  sub:   string
  color: string
  value?: string
  done?: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [todayCalories, setTodayCalories] = useState(0)
  const [todayProtein, setTodayProtein] = useState(0)
  const [mealCount, setMealCount] = useState(0)
  const [workoutDoneToday, setWorkoutDoneToday] = useState(false)
  const [workoutStreak, setWorkoutStreak] = useState(0)
  const [allStreak, setAllStreak] = useState(0)
  const [xp, setXp] = useState(0)
  const [aiInsights, setAiInsights] = useState<{ quote: string; recommendation: string } | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [glucoseSettings, setGlucoseSettings] = useState<GlucoseSettings | null>(null)
  const [latestGlucose, setLatestGlucose] = useState<GlucoseReading | null>(null)
  const [lastSleep, setLastSleep] = useState<SleepEntry | null>(null)
  const [weightLoggedToday, setWeightLoggedToday] = useState(false)
  const [moodLoggedToday] = useState(false)
  const [hiddenTrackers, setHiddenTrackers] = useState<string[]>([])
  const [customizing, setCustomizing] = useState(false)

  // Load hidden trackers from localStorage
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

      // Streak
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

      // AI Insights (cached per day)
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

  const calPct  = profile ? Math.min((todayCalories / profile.calorieTarget) * 100, 100) : 0
  const protPct = profile ? Math.min((todayProtein / profile.proteinTargetG) * 100, 100) : 0
  const tip     = getDailyTip()
  const greeting = getGreeting(profile?.displayName)
  const dayStr  = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  const actions = buildActions({
    todayCalories,
    workoutDone:          workoutDoneToday,
    mealCount,
    weightLoggedRecently: weightLoggedToday,
    sleepLogged:          !!lastSleep && lastSleep.date >= today,
    moodLogged:           moodLoggedToday,
    glucoseEnabled:       !!glucoseSettings?.consentGiven,
    glucoseLogged:        !!latestGlucose,
  })

  const actionsDone    = actions.filter(a => a.done).length
  const actionsTotal   = actions.length
  const actionsPct     = Math.round((actionsDone / actionsTotal) * 100)

  // Tracker cards grid — ALL equal size
  const trackers: TrackerDef[] = [
    {
      href: '/nutrition', icon: Utensils, label: 'Nutrition',
      sub: mealCount > 0 ? `${todayCalories} kcal` : 'Log meals',
      color: '#10b981', done: mealCount > 0,
    },
    {
      href: '/workout', icon: Dumbbell, label: 'Workout',
      sub: workoutDoneToday ? 'Done today' : 'Log session',
      color: '#6366f1', done: workoutDoneToday,
    },
    {
      href: '/sleep', icon: Moon, label: 'Sleep',
      sub: lastSleep ? `${lastSleep.durationH}h last night` : 'Log sleep',
      color: '#a78bfa', done: !!lastSleep,
    },
    {
      href: '/glucose', icon: Activity, label: 'Glucose',
      sub: latestGlucose
        ? displayGlucose(latestGlucose.valueMmol, glucoseSettings?.preferredUnit ?? 'mmol/L')
        : 'Log reading',
      color: '#ef4444', done: !!latestGlucose,
    },
    {
      href: '/mood', icon: Brain, label: 'Mood',
      sub: 'Mental check-in',
      color: '#ec4899', done: moodLoggedToday,
    },
    {
      href: '/metrics', icon: Scale, label: 'Weight',
      sub: weightLoggedToday ? 'Logged today' : 'Daily weigh-in',
      color: '#f59e0b', done: weightLoggedToday,
    },
    {
      href: '/blood-pressure', icon: Heart, label: 'Blood Pressure',
      sub: 'Heart health',
      color: '#f43f5e', done: false,
    },
    {
      href: '/habits', icon: CheckSquare, label: 'Habits',
      sub: 'Daily streaks',
      color: '#06b6d4', done: false,
    },
    {
      href: '/coach', icon: Bot, label: 'AI Coach',
      sub: 'Chat & check-in',
      color: VIOLET, done: false,
    },
    {
      href: '/insights', icon: TrendingUp, label: 'Weekly Report',
      sub: 'AI insights',
      color: '#fbbf24', done: false,
    },
    {
      href: '/pcos', icon: Droplets, label: 'PCOS',
      sub: 'Cycle & hormones',
      color: '#f472b6', done: false,
    },
    {
      href: '/thyroid', icon: Pill, label: 'Thyroid',
      sub: 'TSH & fatigue',
      color: '#34d399', done: false,
    },
  ]

  return (
    <main className="min-h-screen mesh-bg page-pad pb-28">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="page-header-bar px-4 flex items-center justify-between h-14">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>{dayStr}</p>
          <p className="text-base font-bold text-1 leading-tight">{greeting}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/help" className="p-2 rounded-xl glass text-xs font-semibold"
            style={{ color: 'var(--text-3)' }}>
            Help
          </Link>
          <Link href="/profile" className="p-2 rounded-xl glass-elevated" style={{ color: 'var(--text-2)' }}>
            <User size={16} />
          </Link>
          <button onClick={() => signOut(auth).then(() => router.push('/login'))}
            className="p-2 rounded-xl glass" style={{ color: 'var(--text-3)' }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4 pt-3">

        {/* ── AI Inspiring Message ─────────────────────────────── */}
        <div className="glass-elevated rounded-2xl px-4 py-3.5 space-y-1"
          style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(6,182,212,0.06))' }}>
          {insightsLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-3">Preparing your personalised tip…</p>
            </div>
          ) : aiInsights ? (
            <>
              <p className="text-sm font-medium text-1 leading-snug italic">
                &ldquo;{aiInsights.quote}&rdquo;
              </p>
              {aiInsights.recommendation && (
                <p className="text-xs text-2 leading-relaxed pt-0.5">{aiInsights.recommendation}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-1 leading-snug">{tip}</p>
          )}
        </div>

        {/* ── Today's Progress rings ───────────────────────────── */}
        <div className="glass-elevated rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
              Today&apos;s Progress
            </p>
            {calPct >= 100 && (
              <span className="text-xs font-bold" style={{ color: '#10b981' }}>Goal reached</span>
            )}
          </div>
          <div className="flex items-center justify-around">
            <Link href="/nutrition">
              <ProgressRing value={calPct} size={96} stroke={8} color="#10b981"
                label={`${todayCalories}`} sublabel="kcal" />
            </Link>
            <div className="text-center">
              <p className="text-2xl font-black gradient-text">{actionsDone}<span className="text-base font-medium text-3">/{actionsTotal}</span></p>
              <p className="text-xs text-3 mt-0.5">actions done</p>
              <div className="w-16 h-1.5 rounded-full mx-auto mt-2" style={{ background: 'var(--ring-track)' }}>
                <div className="h-1.5 rounded-full" style={{ width: `${actionsPct}%`, background: `linear-gradient(90deg,${VIOLET},${CYAN})` }} />
              </div>
            </div>
            <Link href="/nutrition">
              <ProgressRing value={protPct} size={96} stroke={8} color="#6366f1"
                label={`${todayProtein}g`} sublabel="protein" />
            </Link>
          </div>
        </div>

        {/* ── Today's Actions ──────────────────────────────────── */}
        <div className="glass-elevated rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
              Today&apos;s Actions
            </p>
            <span className="text-xs font-bold" style={{ color: actionsDone === actionsTotal ? '#10b981' : VIOLET }}>
              {actionsDone === actionsTotal ? 'All done!' : `${actionsTotal - actionsDone} left`}
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--glass-border)' }}>
            {actions.map(action => (
              <Link key={action.id} href={action.href}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5">
                <div className="shrink-0">
                  {action.done
                    ? <CheckCircle size={18} style={{ color: '#10b981' }} />
                    : <Circle size={18} style={{ color: 'var(--text-3)' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${action.done ? 'line-through' : ''}`}
                    style={{ color: action.done ? 'var(--text-3)' : 'var(--text-1)' }}>
                    {action.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{action.sub}</p>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </div>

        {/* ── Streak pill ─────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2 flex-1">
            <span className="text-lg">🔥</span>
            <div>
              <p className="text-sm font-bold text-1">{workoutStreak} day workout streak</p>
              <p className="text-xs text-3">{allStreak} day all-activity streak</p>
            </div>
          </div>
          <div className="glass rounded-2xl px-3 py-2.5 text-center">
            <p className="text-sm font-bold gradient-text">{xp.toLocaleString()}</p>
            <p className="text-xs text-3">XP</p>
          </div>
        </div>

        {/* ── Tracker Cards — uniform 2×grid ───────────────────── */}
        <div>
          <div className="flex items-center justify-between px-1 mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
              My Trackers
            </p>
            <button
              onClick={() => setCustomizing(true)}
              className="text-xs font-semibold px-3 py-1 rounded-full transition-all active:scale-95"
              style={{
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.25)',
                color: VIOLET,
              }}
            >
              Customise
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {trackers
              .filter(t => !hiddenTrackers.includes(t.label))
              .map(t => (
                <TrackerCard key={t.href + t.label} {...t} />
              ))}
          </div>
          {hiddenTrackers.length > 0 && (
            <button
              onClick={() => setCustomizing(true)}
              className="mt-3 w-full text-xs py-2 rounded-xl text-center transition-all"
              style={{ color: 'var(--text-3)', border: '1px dashed var(--glass-border)' }}
            >
              +{hiddenTrackers.length} hidden tracker{hiddenTrackers.length > 1 ? 's' : ''} — tap Customise to show
            </button>
          )}
        </div>

        {/* ── Customise modal ──────────────────────────────────── */}
        {customizing && (
          <div className="fixed inset-0 z-50 flex items-end" onClick={() => setCustomizing(false)}>
            <div
              className="w-full rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto"
              style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-1">Customise Home Screen</p>
                <button
                  onClick={() => setCustomizing(false)}
                  className="text-xs px-3 py-1.5 rounded-xl font-semibold"
                  style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})`, color: '#fff' }}
                >
                  Done
                </button>
              </div>
              <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
                Toggle which trackers appear on your home screen.
              </p>
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
                      className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                      style={{
                        background: hidden ? 'rgba(255,255,255,0.03)' : `${t.color}12`,
                        border: `1px solid ${hidden ? 'var(--glass-border)' : t.color + '30'}`,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${t.color}20` }}
                      >
                        <t.icon size={16} style={{ color: hidden ? 'var(--text-3)' : t.color }} />
                      </div>
                      <span
                        className="flex-1 text-left text-sm font-medium"
                        style={{ color: hidden ? 'var(--text-3)' : 'var(--text-1)' }}
                      >
                        {t.label}
                      </span>
                      <div
                        className="w-11 h-6 rounded-full relative transition-all duration-200"
                        style={{ background: hidden ? 'rgba(255,255,255,0.1)' : t.color }}
                      >
                        <div
                          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                          style={{ left: hidden ? '2px' : '22px' }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}

function TrackerCard({ href, icon: Icon, label, sub, color, done }: TrackerDef) {
  return (
    <Link href={href}
      className="glass rounded-2xl p-4 flex flex-col gap-2.5 card-hover"
      style={done ? { border: `1px solid ${color}35` } : undefined}>
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}22` }}>
          <Icon size={16} strokeWidth={2} style={{ color }} />
        </div>
        {done && (
          <CheckCircle size={14} style={{ color: '#10b981' }} />
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-1">{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</p>
      </div>
    </Link>
  )
}
