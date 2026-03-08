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
  Activity, Moon, Brain,
  Bot, Heart, CheckSquare,
  CheckCircle, Zap, Settings2, X,
  Sparkles, ChevronRight,
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

// All tile types unified
interface Tile {
  id: string; label: string; sub: string; href: string
  done?: boolean; icon: LucideIcon; color: string
  /** If true, counts toward readiness ring */
  isDailyAction?: boolean
  /** If true, shown by default; can be hidden */
  defaultVisible?: boolean
}

type ConditionKey =
  | 'DIABETES_T1' | 'DIABETES_T2' | 'MENTAL_HEALTH' | 'HEART_HEALTH'
  | 'PCOS' | 'THYROID' | 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'ATHLETIC' | 'GENERAL'

const CONDITION_TIPS: Record<ConditionKey, { title: string; tip: string; color: string; emoji: string }> = {
  DIABETES_T1:    { title: 'Diabetes tip',        tip: 'Monitor carbs carefully — consistent meal timing helps stabilise glucose levels throughout the day.',      color: '#ef4444', emoji: '🩸' },
  DIABETES_T2:    { title: 'Diabetes tip',        tip: 'A 10-minute walk after meals can significantly reduce post-meal glucose spikes.',                           color: '#f97316', emoji: '🚶' },
  MENTAL_HEALTH:  { title: 'Mental wellness',     tip: "Today's mood check-in takes 30 seconds. Small steps in self-awareness compound into real change.",          color: '#ec4899', emoji: '🧠' },
  HEART_HEALTH:   { title: 'Heart health',        tip: 'Regular blood pressure logging helps spot trends early. Even 2 readings a week make a difference.',        color: '#f43f5e', emoji: '❤️' },
  PCOS:           { title: 'PCOS support',        tip: 'Low-GI foods and resistance training are two of the strongest evidence-based interventions for PCOS.',     color: '#f472b6', emoji: '🌸' },
  THYROID:        { title: 'Thyroid health',      tip: 'Consistent meal timing supports thyroid hormone absorption. Avoid large meals late at night.',              color: '#34d399', emoji: '🦋' },
  WEIGHT_LOSS:    { title: 'Weight management',   tip: 'Protein keeps you full and preserves muscle. Hitting your protein target helps prevent overeating.',        color: '#f59e0b', emoji: '⚖️' },
  MUSCLE_GAIN:    { title: 'Muscle building',     tip: 'Progressive overload + hitting protein = muscle growth. Check both boxes today.',                           color: '#6366f1', emoji: '💪' },
  ATHLETIC:       { title: 'Performance tip',     tip: 'Track sleep as carefully as your training sessions — adaptation and recovery happen during sleep.',         color: '#06b6d4', emoji: '🏅' },
  GENERAL:        { title: 'Health tip',          tip: 'Consistency beats perfection. Every log you make is a data point that builds a healthier future.',          color: '#7c3aed', emoji: '✨' },
}

function getConditionTip(profile: UserProfile | null) {
  if (!profile?.conditionProfile?.conditions?.length) {
    return CONDITION_TIPS.GENERAL
  }
  const first = profile.conditionProfile.conditions[0] as ConditionKey
  return CONDITION_TIPS[first] ?? CONDITION_TIPS.GENERAL
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
  const [hiddenTiles, setHiddenTiles]         = useState<string[]>([])
  const [customizing, setCustomizing]         = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sbh_hidden_tiles')
      if (saved) setHiddenTiles(JSON.parse(saved))
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
  const condTip   = getConditionTip(profile)
  const sleepLogged = !!lastSleep && lastSleep.date >= today

  // All tiles — daily actions + tracker shortcuts, unified
  const allTiles: Tile[] = [
    { id: 'meal',    label: 'Nutrition',      sub: mealCount > 0 ? `${todayCalories} kcal` : 'Log meals',        href: '/nutrition',      done: mealCount > 0,        icon: Utensils,    color: '#10b981', isDailyAction: true, defaultVisible: true },
    { id: 'workout', label: 'Workout',        sub: workoutDoneToday ? 'Done!' : 'Log session',                    href: '/workout',         done: workoutDoneToday,     icon: Dumbbell,    color: '#6366f1', isDailyAction: true, defaultVisible: true },
    { id: 'sleep',   label: 'Sleep',          sub: sleepLogged ? 'Logged' : 'Log sleep',                         href: '/sleep',           done: sleepLogged,          icon: Moon,        color: '#a78bfa', isDailyAction: true, defaultVisible: true },
    { id: 'mood',    label: 'Mood',           sub: moodLoggedToday ? 'Checked in' : 'Check in',                  href: '/mood',            done: moodLoggedToday,      icon: Brain,       color: '#ec4899', isDailyAction: true, defaultVisible: true },
    { id: 'weight',  label: 'Weight',         sub: weightLoggedToday ? 'Logged' : 'Weigh in',                    href: '/metrics',         done: weightLoggedToday,    icon: Scale,       color: '#f59e0b', isDailyAction: true, defaultVisible: true },
    ...(glucoseSettings?.consentGiven ? [{
      id: 'glucose', label: 'Glucose', sub: latestGlucose ? displayGlucose(latestGlucose.valueMmol, glucoseSettings?.preferredUnit ?? 'mmol/L') : 'Log reading',
      href: '/glucose', done: !!latestGlucose, icon: Activity, color: '#ef4444', isDailyAction: true, defaultVisible: true,
    }] : []),
    { id: 'bp',      label: 'Blood Pressure', sub: 'Heart health',    href: '/blood-pressure', icon: Heart,       color: '#f43f5e', defaultVisible: true },
    { id: 'habits',  label: 'Habits',         sub: 'Daily streaks',   href: '/habits',         icon: CheckSquare, color: CYAN,      defaultVisible: true },
    { id: 'coach',   label: 'AI Coach',       sub: 'Chat & check-in', href: '/coach',          icon: Bot,         color: VIOLET,    defaultVisible: true },
    { id: 'insights',label: 'Weekly Report',  sub: 'AI insights',     href: '/insights',        icon: TrendingUp,  color: '#fbbf24', defaultVisible: false },
    { id: 'feed',    label: 'Health Feed',    sub: 'Your score',      href: '/health-feed',    icon: Sparkles,    color: '#06b6d4', defaultVisible: false },
  ]

  const visibleTiles = allTiles.filter(t => !hiddenTiles.includes(t.id))
  const dailyActions = allTiles.filter(t => t.isDailyAction)
  const actionsDone  = dailyActions.filter(t => t.done).length
  const actionsTotal = dailyActions.length
  const readiness    = actionsTotal > 0 ? Math.round((actionsDone / actionsTotal) * 100) : 0
  const readinessColor =
    readiness >= 70 ? '#10b981' :
    readiness >= 40 ? '#f59e0b' : '#f43f5e'

  function toggleTile(id: string) {
    const next = hiddenTiles.includes(id)
      ? hiddenTiles.filter(h => h !== id)
      : [...hiddenTiles, id]
    setHiddenTiles(next)
    localStorage.setItem('sbh_hidden_tiles', JSON.stringify(next))
  }

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

      <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 lg:px-8 space-y-4 pt-2">

        {/* ── Hero: Daily Readiness ─────────────────────────────── */}
        <div
          className="rounded-3xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg,rgba(124,58,237,0.25) 0%,rgba(6,182,212,0.15) 50%,rgba(244,63,94,0.1) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20"
              style={{ background: `radial-gradient(circle,${readinessColor},transparent)` }} />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full opacity-10"
              style={{ background: `radial-gradient(circle,${CYAN},transparent)` }} />
          </div>
          <div className="relative flex items-center gap-5 p-5">
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
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: readinessColor }}>
                Daily Readiness
              </p>
              <p className="text-2xl font-black text-1 leading-none mb-3">
                {readiness >= 70 ? 'Great shape' : readiness >= 40 ? 'Getting there' : 'Just starting'}
                <span className="text-sm font-medium text-3 ml-1">, {firstName}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <StatPill emoji="✅" value={`${actionsDone}/${actionsTotal}`} label="tasks" color={readinessColor} />
                <StatPill emoji="🔥" value={`${workoutStreak}d`} label="streak" color="#f97316" />
                <StatPill emoji="⚡" value={xp.toLocaleString()} label="XP" color={CYAN} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Today's Actions + Trackers — unified horizontal scroll ── */}
        <div>
          <div className="flex items-center justify-between px-0.5 mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                Today&apos;s Actions
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                {actionsDone === actionsTotal ? '🎉 All daily tasks done!' : `${actionsTotal - actionsDone} daily tasks remaining`}
              </p>
            </div>
            <button
              onClick={() => setCustomizing(true)}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all active:scale-95"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: VIOLET }}
            >
              <Settings2 size={11} />
              Customise
            </button>
          </div>

          <div
            className="flex gap-3 overflow-x-auto pb-2"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory' }}
          >
            {visibleTiles.map(tile => (
              <ActionTile key={tile.id} {...tile} />
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
            <Link href="/nutrition" className="shrink-0">
              <ProgressRing value={calPct} size={80} stroke={7} color="#10b981"
                label={todayCalories > 0 ? `${todayCalories}` : '0'} sublabel="kcal" />
            </Link>
            <div className="flex-1 space-y-3">
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

        {/* ── For You — hyper-personalised section ─────────────── */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest px-0.5" style={{ color: 'var(--text-3)' }}>
            For You
          </p>

          {/* AI Coach daily check-in card */}
          <Link
            href="/coach"
            className="block rounded-2xl p-4 transition-all duration-200 active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg,${VIOLET}22,${CYAN}14)`,
              border: `1px solid ${VIOLET}28`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})` }}
              >
                <Bot size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Chat with your AI Coach</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-3)' }}>
                  {insightsLoading
                    ? 'Analysing your health data…'
                    : aiInsights?.recommendation
                    ? aiInsights.recommendation
                    : 'Ask me anything about your health today'}
                </p>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-3)' }} />
            </div>
          </Link>

          {/* AI Quote / insight */}
          {(aiInsights || insightsLoading) && (
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
                <Sparkles size={12} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                {insightsLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-3">Crafting your personalised insight…</p>
                  </div>
                ) : aiInsights ? (
                  <p className="text-sm font-medium text-1 leading-snug">&ldquo;{aiInsights.quote}&rdquo;</p>
                ) : null}
              </div>
            </div>
          )}

          {/* Condition-specific tip */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: `${condTip.color}10`,
              border: `1px solid ${condTip.color}22`,
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">{condTip.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: condTip.color }}>
                  {condTip.title}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>
                  {condTip.tip}
                </p>
              </div>
            </div>
          </div>

          {/* Static tip if no AI insights yet */}
          {!aiInsights && !insightsLoading && (
            <div
              className="rounded-2xl px-4 py-3 flex items-start gap-3"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5"
                style={{ background: 'rgba(124,58,237,0.15)' }}>
                <Zap size={12} style={{ color: VIOLET }} />
              </div>
              <p className="text-sm text-1 leading-snug flex-1">{tip}</p>
            </div>
          )}

          {/* Health Feed CTA */}
          <Link
            href="/health-feed"
            className="flex items-center gap-3 rounded-2xl p-4 transition-all duration-200 active:scale-[0.98]"
            style={{
              background: 'rgba(6,182,212,0.08)',
              border: '1px solid rgba(6,182,212,0.2)',
            }}
          >
            <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
              style={{ background: 'rgba(6,182,212,0.15)' }}>
              <Sparkles size={16} style={{ color: CYAN }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Your Health Feed</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Personalised insights &amp; recommendations</p>
            </div>
            <ChevronRight size={15} style={{ color: 'var(--text-3)' }} />
          </Link>
        </div>

      </div>

      {/* ── Customise sheet ───────────────────────────────────── */}
      {customizing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" onClick={() => setCustomizing(false)}>
          <div
            className="w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--glass-border)' }} />
            <div className="flex items-center justify-between mb-1">
              <p className="text-base font-bold text-1">Customise Today&apos;s Actions</p>
              <button
                onClick={() => setCustomizing(false)}
                className="p-1.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-2)' }}
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
              Choose which tiles appear in your Today&apos;s Actions scroll
            </p>
            <div className="space-y-2">
              {allTiles.map(tile => {
                const hidden = hiddenTiles.includes(tile.id)
                return (
                  <button
                    key={tile.id}
                    onClick={() => toggleTile(tile.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.98]"
                    style={{
                      background: hidden ? 'rgba(255,255,255,0.03)' : `${tile.color}10`,
                      border: `1px solid ${hidden ? 'var(--glass-border)' : tile.color + '28'}`,
                    }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${tile.color}20` }}>
                      <tile.icon size={16} style={{ color: hidden ? 'var(--text-3)' : tile.color }} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium" style={{ color: hidden ? 'var(--text-3)' : 'var(--text-1)' }}>
                        {tile.label}
                      </p>
                      {tile.isDailyAction && (
                        <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>Daily action</p>
                      )}
                    </div>
                    <div className="w-12 h-6 rounded-full relative transition-all duration-200 shrink-0"
                      style={{ background: hidden ? 'rgba(255,255,255,0.12)' : tile.color }}>
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
function ActionTile({ href, icon: Icon, label, sub, done, color }: Tile) {
  return (
    <Link
      href={href}
      className="shrink-0 flex flex-col items-center gap-2 rounded-2xl p-3 transition-all duration-200 active:scale-95"
      style={{
        width: 86,
        scrollSnapAlign: 'start',
        background: done
          ? `linear-gradient(145deg,${color}28,${color}12)`
          : `${color}08`,
        border: `1.5px solid ${done ? color + '60' : color + '35'}`,
        boxShadow: done ? `0 4px 16px ${color}30` : `0 2px 8px ${color}10`,
      }}
    >
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all"
        style={{
          background: done ? `${color}35` : `${color}18`,
          border: `1px solid ${color}${done ? '50' : '30'}`,
        }}
      >
        {done
          ? <CheckCircle size={20} style={{ color }} />
          : <Icon size={20} strokeWidth={1.75} style={{ color }} />
        }
      </div>
      <p
        className="text-[11px] font-semibold text-center leading-tight"
        style={{ color: done ? color : 'var(--text-1)' }}
      >
        {label}
      </p>
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
