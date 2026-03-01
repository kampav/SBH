'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getProfile, getNutrition, getRecentWorkouts, getMetrics } from '@/lib/firestore'
import { UserProfile } from '@/lib/types'
import Link from 'next/link'
import { LogOut, Zap, Trophy, ChevronRight } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'
import {
  getDailyTip, computeXP, getLevel, getLevelProgress,
  computeStreak, computeBadges,
} from '@/lib/gamification'

const today = new Date().toISOString().slice(0, 10)

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [todayCalories, setTodayCalories] = useState(0)
  const [todayProtein, setTodayProtein] = useState(0)
  const [workoutStreak, setWorkoutStreak] = useState(0)
  const [xp, setXp] = useState(0)
  const [badgeCount, setBadgeCount] = useState(0)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
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
    <main className="min-h-screen bg-app flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-2 text-sm">Loading your stats...</p>
      </div>
    </main>
  )

  const calPct = profile ? Math.min((todayCalories / profile.calorieTarget) * 100, 100) : 0
  const protPct = profile ? Math.min((todayProtein / profile.proteinTargetG) * 100, 100) : 0
  const { level, title: levelTitle } = getLevel(xp)
  const lvlPct = getLevelProgress(xp)
  const tip = getDailyTip()
  const greeting = getGreeting(profile?.displayName)
  const dayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <main className="min-h-screen bg-app page-pad">
      <header className="px-4 pt-12 pb-4 flex items-start justify-between">
        <div>
          <p className="text-2 text-xs mb-0.5">{dayStr}</p>
          <h1 className="text-xl font-bold text-1">{greeting}</h1>
        </div>
        <button onClick={() => signOut(auth).then(() => router.push('/login'))}
          className="p-2 rounded-xl bg-card-sbh border border-sbh text-slate-500 hover:text-slate-300 transition-colors mt-1">
          <LogOut size={16} />
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4">

        {/* XP bar */}
        <div className="bg-card-sbh rounded-2xl p-4 border border-sbh">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">Level {level} &middot; {levelTitle}</span>
            </div>
            <span className="text-xs text-2">{xp.toLocaleString()} XP</span>
          </div>
          <div className="w-full rounded-full h-1.5" style={{background:'#1a2744'}}>
            <div className="xp-bar h-1.5 rounded-full" style={{width:`${lvlPct}%`,background:'linear-gradient(90deg,#f59e0b,#fbbf24)'}} />
          </div>
        </div>

        {/* Streak + badges */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card-sbh rounded-2xl p-4 border border-sbh flex items-center gap-3">
            <span className="text-3xl leading-none flame">&#128293;</span>
            <div>
              <p className="text-2xl font-bold text-1">{workoutStreak}</p>
              <p className="text-xs text-2">day streak</p>
            </div>
          </div>
          <Link href="/metrics" className="bg-card-sbh rounded-2xl p-4 border border-sbh flex items-center gap-3 card-hover">
            <Trophy size={28} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-1">{badgeCount}</p>
              <p className="text-xs text-2">badges earned</p>
            </div>
          </Link>
        </div>

        {/* Progress rings */}
        <div className="bg-card-sbh rounded-2xl p-4 border border-sbh">
          <h2 className="text-xs font-semibold text-2 uppercase tracking-widest mb-4">Today&#39;s Progress</h2>
          <div className="flex items-center justify-around">
            <ProgressRing value={calPct} size={120} stroke={10} color="#10b981" bg="#1a2744"
              label={`${todayCalories}`} sublabel="kcal eaten" />
            <div className="text-center">
              <p className="text-xs text-2 mb-1">Target</p>
              <p className="text-lg font-bold gradient-text">{profile?.calorieTarget ?? '--'}</p>
              <p className="text-xs text-2">kcal/day</p>
            </div>
            <ProgressRing value={protPct} size={120} stroke={10} color="#6366f1" bg="#1a2744"
              label={`${todayProtein}g`} sublabel="protein" />
          </div>
        </div>

        {/* Daily Tip */}
        <div className="bg-card-2 rounded-2xl p-4 border border-sbh">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">Daily Science Tip</p>
          <p className="text-sm text-1 leading-relaxed">{tip}</p>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xs font-semibold text-2 uppercase tracking-widest mb-3">Quick Log</h2>
          <div className="grid grid-cols-2 gap-3">
            <ActionCard href="/nutrition" emoji="&#127869;" label="Log Meal"     sub="Track calories & macros" glow="glow-emerald" />
            <ActionCard href="/workout"   emoji="&#128170;" label="Start Workout" sub="Phase 1 - Full Body"    glow="glow-indigo" />
            <ActionCard href="/metrics"   emoji="&#9878;"   label="Log Weight"   sub="Track your progress"    glow="glow-amber" />
            <ActionCard href="/metrics"   emoji="&#128200;" label="View Trends"   sub="Charts & insights" />
          </div>
        </div>

        {/* Macro targets */}
        {profile && (
          <div className="bg-card-sbh rounded-2xl p-4 border border-sbh">
            <h2 className="text-xs font-semibold text-2 uppercase tracking-widest mb-3">Daily Targets</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <TargetRow label="Calories" value={`${profile.calorieTarget} kcal`} color="text-emerald-400" />
              <TargetRow label="Protein"  value={`${profile.proteinTargetG}g`}    color="text-indigo-400" />
              <TargetRow label="Carbs"    value={`${profile.carbTargetG}g`}       color="text-amber-400" />
              <TargetRow label="Fat"      value={`${profile.fatTargetG}g`}        color="text-rose-400" />
            </div>
          </div>
        )}

        {/* Workout CTA */}
        <Link href="/workout" className="block w-full rounded-2xl p-4 glow-emerald card-hover"
          style={{background:'linear-gradient(135deg,#059669,#4f46e5)'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{color:'#a7f3d0'}}>Today&#39;s Session</p>
              <p className="text-white font-bold mt-0.5">Phase 1 - Full Body Strength</p>
            </div>
            <ChevronRight className="text-white opacity-70" size={20} />
          </div>
        </Link>
      </div>
    </main>
  )
}

function getGreeting(name?: string): string {
  const h = new Date().getHours()
  const s = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return name ? `${s}, ${name.split(' ')[0]}` : s
}

function ActionCard({ href, emoji, label, sub, glow = '' }: {
  href: string; emoji: string; label: string; sub: string; glow?: string
}) {
  return (
    <Link href={href} className={`bg-card-sbh rounded-2xl p-4 border border-sbh card-hover ${glow} flex items-start gap-3`}>
      <span className="text-2xl leading-none">{emoji}</span>
      <div>
        <p className="font-semibold text-sm text-1">{label}</p>
        <p className="text-xs text-2 mt-0.5">{sub}</p>
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
