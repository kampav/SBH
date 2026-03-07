'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { getRecentWorkouts } from '@/lib/firebase/firestore'
import { DailyWorkout } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft, Dumbbell, Calendar, TrendingUp, Share2 } from 'lucide-react'
import { shareStats } from '@/lib/utils'
import { Analytics } from '@/lib/firebase/analytics'

const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'

export default function WorkoutHistoryPage() {
  const router = useRouter()
  const [workouts, setWorkouts] = useState<DailyWorkout[]>([])
  const [authReady, setAuthReady] = useState(false)
  const [shareToast, setShareToast] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      const w = await getRecentWorkouts(user.uid, 90)
      setWorkouts([...w].sort((a, b) => b.date.localeCompare(a.date)))
    })
    return unsub
  }, [router])

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  // ── Aggregate stats ──────────────────────────────────────────────────────
  const totalVolume  = workouts.reduce((s, w) => s + w.totalVolumeKg, 0)
  const totalMin     = workouts.reduce((s, w) => s + w.durationMinutes, 0)
  const totalCalBurn = workouts.reduce((s, w) => s + w.estimatedCaloriesBurned, 0)

  // Weekly volume chart data (last 8 weeks)
  const weeklyData = (() => {
    const weeks: Record<string, number> = {}
    workouts.forEach(w => {
      const d = new Date(w.date)
      d.setDate(d.getDate() - d.getDay())  // start of week (Sunday)
      const key = d.toISOString().slice(0, 10)
      weeks[key] = (weeks[key] ?? 0) + w.totalVolumeKg
    })
    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
  })()

  const maxWeekVol = Math.max(...weeklyData.map(([, v]) => v), 1)

  return (
    <main className="min-h-screen mesh-bg page-pad">
      <header className="page-header-bar px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <Link href="/workout" className="p-2 rounded-xl glass-elevated">
            <ArrowLeft size={16} className="text-slate-400" />
          </Link>
          <div>
            <p className="section-label">{workouts.length} sessions logged</p>
            <h1 className="page-title" style={{fontSize:'1.25rem'}}>Workout History</h1>
          </div>
        </div>
        {workouts.length > 0 && (
          <button onClick={async () => {
            const text = `My SBH workout totals:\n💪 ${workouts.length} workouts logged\n🏋️ ${Math.round(totalVolume / 1000)}t total volume\n⏱️ ${Math.round(totalMin / 60)}h of training\n📱 sbhealth.app`
            const used = await shareStats('My SBH Workouts', text)
            Analytics.statsShared('workouts')
            if (!used) { setShareToast(true); setTimeout(() => setShareToast(false), 2500) }
          }} className="p-2 rounded-xl glass-elevated">
            <Share2 size={16} style={{ color: 'var(--text-2)' }} />
          </button>
        )}
      </header>
      {shareToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg z-50">
          Copied to clipboard!
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 space-y-4 pt-4">

        {/* ── Summary stats ── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Sessions',      val: String(workouts.length),             icon: Calendar,    color: VIOLET },
            { label: 'Total volume',  val: `${Math.round(totalVolume / 1000)}t`, icon: TrendingUp,  color: CYAN },
            { label: 'Hours trained', val: `${Math.round(totalMin / 60)}h`,     icon: Dumbbell,    color: '#10b981' },
          ].map(({ label, val, icon: Icon, color }) => (
            <div key={label} className="glass rounded-2xl p-3 text-center">
              <Icon size={16} className="mx-auto mb-1" style={{ color }} />
              <p className="font-bold text-lg" style={{ color }}>{val}</p>
              <p className="text-xs text-2">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Weekly volume chart ── */}
        {weeklyData.length > 1 && (
          <div className="glass rounded-2xl p-4">
            <p className="text-xs font-semibold text-2 uppercase tracking-widest mb-3">Weekly Volume (kg)</p>
            <div className="flex items-end gap-1.5 h-20">
              {weeklyData.map(([week, vol]) => {
                const pct = (vol / maxWeekVol) * 100
                const label = new Date(week).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                return (
                  <div key={week} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t" style={{
                      height: `${Math.max(pct, 4)}%`,
                      background: `linear-gradient(180deg,${VIOLET},#6d28d9)`,
                      minHeight: 4,
                    }} />
                    <p className="text-xs text-3 text-center" style={{ fontSize: 9 }}>{label}</p>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-3 mt-2 text-right">
              Total: {Math.round(totalCalBurn).toLocaleString()} kcal burned
            </p>
          </div>
        )}

        {/* ── Workout log ── */}
        {workouts.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <Dumbbell size={32} className="mx-auto mb-3 text-slate-600" />
            <p className="text-sm text-2">No workouts logged yet.</p>
            <Link href="/workout" className="inline-block mt-3 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: `linear-gradient(135deg,${VIOLET},#6d28d9)` }}>
              Start a workout
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-2 uppercase tracking-widest">Session Log</p>
            {workouts.map(w => (
              <div key={w.date} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm text-1">
                      {new Date(w.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-2 mt-0.5">{w.programmeDay}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: VIOLET }}>{w.totalVolumeKg.toLocaleString()} kg</p>
                    <p className="text-xs text-2">{w.durationMinutes}min · {w.estimatedCaloriesBurned} kcal</p>
                  </div>
                </div>
                {w.exercises.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {w.exercises.map(ex => {
                      const best = ex.sets.filter(s => s.completed)
                      const maxW = best.length ? Math.max(...best.map(s => s.weightKg)) : 0
                      return (
                        <span key={ex.exerciseName} className="text-xs px-2 py-0.5 rounded-full glass"
                          style={{ color: '#94a3b8' }}>
                          {ex.exerciseName}{maxW > 0 ? ` · ${maxW}kg` : ''}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
