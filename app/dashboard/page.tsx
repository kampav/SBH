'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getProfile } from '@/lib/firestore'
import { UserProfile } from '@/lib/types'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        router.push('/login')
        return
      }
      const p = await getProfile(user.uid)
      if (!p?.onboardingComplete) {
        router.push('/onboarding')
        return
      }
      setProfile(p)
      setLoading(false)
    })
    return unsub
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">SBH</h1>
          <p className="text-xs text-slate-400">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-300">{profile?.displayName}</span>
          <button
            onClick={() => signOut(auth).then(() => router.push('/login'))}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Calorie Target" value={`${profile?.calorieTarget}`} unit="kcal" color="emerald" />
          <StatCard label="Protein" value={`${profile?.proteinTargetG}g`} unit="today" color="blue" />
          <StatCard label="BMR" value={`${profile?.bmr}`} unit="kcal" color="purple" />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Quick Log</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction href="/nutrition" label="Log Meal" icon="🍽️" desc="Track calories & macros" />
            <QuickAction href="/workout" label="Log Workout" icon="💪" desc="Sets, reps, weight" />
            <QuickAction href="/metrics" label="Log Weight" icon="⚖️" desc="Track your progress" />
            <QuickAction href="/metrics" label="View Trends" icon="📈" desc="Weight & BMI charts" />
          </div>
        </div>

        {/* Today's Programme */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Today&apos;s Session</h2>
          <p className="text-slate-300 text-sm">Full Body Strength — Phase 1</p>
          <Link href="/workout" className="mt-3 block w-full text-center py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-semibold transition-colors">
            Start Workout
          </Link>
        </div>

        {/* Targets */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Daily Targets</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Calories</span><span>{profile?.calorieTarget} kcal</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Protein</span><span>{profile?.proteinTargetG}g</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Carbs</span><span>{profile?.carbTargetG}g</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Fat</span><span>{profile?.fatTargetG}g</span></div>
          </div>
        </div>
      </div>
    </main>
  )
}

function StatCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
  }
  return (
    <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 text-center">
      <p className={`text-xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{unit}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  )
}

function QuickAction({ href, label, icon, desc }: { href: string; label: string; icon: string; desc: string }) {
  return (
    <Link href={href} className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors flex items-start gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
    </Link>
  )
}
