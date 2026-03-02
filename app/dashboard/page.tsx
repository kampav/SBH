'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getProfile, getNutrition, getRecentWorkouts, getMetrics } from '@/lib/firestore'
import { UserProfile } from '@/lib/types'
import Link from 'next/link'
import { LogOut, Zap, Trophy, ChevronRight, User } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'
import {
  getDailyTip, computeXP, getLevel, getLevelProgress,
  computeStreak, computeBadges,
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
  const [xp, setXp] = useState(0)
  const [badgeCount, setBadgeCount] = useState(0)
  const [programmeWeek, setProgrammeWeek] = useState(1)

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
      const streak = computeStreak(wDates)
      setWorkoutStreak(streak)
      const totalXp = computeXP(wDates, nDates, mDates)
      setXp(totalXp)
      const badges = computeBadges({
        totalWorkouts: workouts.length,
        totalNutritionDays: nDates.length,
        totalWeightLogs: mDates.length,
        workoutStreak: streak,
        allStreak: computeStreak(Array.from(new Set([...wDates, ...nDates, ...mDates])).sort()),
        xp: totalXp,
      })
      setBadgeCount(badges.filter(b => b.earned).length)
    })
    return unsub
  }, [router])

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-2 text-sm">Loading your stats...</p>
      </div>
    </main>
  )

  const calPct  = profile ? Math.min((todayCalories / profile.calorieTarget) * 100, 100) : 0
  const protPct = profile ? Math.min((todayProtein / profile.proteinTargetG) * 100, 100) : 0
  const { level, title: levelTitle } = getLevel(xp)
  const lvlPct  = getLevelProgress(xp)
  const tip     = getDailyTip()
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

        {/* Streak + badges */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-2xl p-4 flex items-center gap-3">
            <span className="text-3xl leading-none flame">🔥</span>
            <div>
              <p className="text-2xl font-bold text-1">{workoutStreak}</p>
              <p className="text-xs text-2">day streak</p>
            </div>
          </div>
          <Link href="/metrics" className="glass rounded-2xl p-4 flex items-center gap-3 card-hover">
            <Trophy size={28} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-1">{badgeCount}</p>
              <p className="text-xs text-2">badges earned</p>
            </div>
          </Link>
        </div>

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
