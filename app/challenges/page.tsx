'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import {
  getProfile, getRecentWorkouts, getStreak, getNutritionHistory,
  getLeaderboard,
} from '@/lib/firebase/firestore'
import { LeaderboardEntry, UserProfile } from '@/lib/types'
import { getWeekStart } from '@/lib/utils'
import { Trophy, Dumbbell, Flame, Target, Users, ChevronRight } from 'lucide-react'
import Link from 'next/link'

function RingProgress({ value, max, color, size = 72 }: { value: number; max: number; color: string; size?: number }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill={color}
        fontSize={13} fontWeight={700}>
        {value}/{max}
      </text>
    </svg>
  )
}

export default function ChallengesPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [weekWorkouts, setWeekWorkouts] = useState(0)
  const [calorieDays, setCalorieDays] = useState(0)
  const [streak, setStreak] = useState(0)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      setUid(user.uid)

      const weekKey = getWeekStart()
      const todayStr = new Date().toISOString().slice(0, 10)

      const [p, workouts, streakDoc, nutrition, board] = await Promise.all([
        getProfile(user.uid),
        getRecentWorkouts(user.uid, 14),
        getStreak(user.uid),
        getNutritionHistory(user.uid, 7),
        getLeaderboard(weekKey, 50),
      ])

      setProfile(p)
      setStreak(streakDoc?.currentStreak ?? 0)
      setLeaderboard(board)

      // Workouts this Mon–Sun
      const thisMonday = weekKey
      const thisSunday = new Date(weekKey)
      thisSunday.setDate(thisSunday.getDate() + 6)
      const thisSundayStr = thisSunday.toISOString().slice(0, 10)
      const weekCount = workouts.filter(w => w.date >= thisMonday && w.date <= thisSundayStr &&
        w.exercises.some(e => e.sets.some(s => s.completed))).length
      setWeekWorkouts(weekCount)

      // Calorie days ≥90% of target (last 7 days)
      const target = p?.calorieTarget ?? 2000
      const calDays = nutrition.filter(n => (n.totalCalories ?? 0) >= target * 0.9 && n.date <= todayStr).length
      setCalorieDays(calDays)

      setLoading(false)
    })
    return unsub
  }, [router])

  if (!authReady || loading) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const trainingDays = profile?.trainingDaysPerWeek ?? 5
  const myRank = leaderboard.findIndex(e => e.uid === uid)

  return (
    <main className="min-h-screen mesh-bg page-pad">
      <header className="page-header-bar px-4 flex items-center h-14">
        <div>
          <p className="section-label">This Week</p>
          <h1 className="page-title" style={{fontSize:'1.25rem'}}>Weekly Challenges</h1>
        </div>
      </header>

      <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 lg:px-8 space-y-4 pt-4">

        {/* My Weekly Challenge */}
        <div className="glass-elevated rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-violet-400" />
            <p className="section-label">My Weekly Goals</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-2">
              <RingProgress value={weekWorkouts} max={trainingDays} color="#7c3aed" />
              <div className="text-center">
                <p className="text-xs text-2">Workouts</p>
                <p className="text-xs font-semibold" style={{ color: '#7c3aed' }}>Target: {trainingDays}</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <RingProgress value={calorieDays} max={7} color="#06b6d4" />
              <div className="text-center">
                <p className="text-xs text-2">Nutrition days</p>
                <p className="text-xs font-semibold" style={{ color: '#06b6d4' }}>≥90% target</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <RingProgress value={Math.min(streak, 7)} max={7} color="#f59e0b" />
              <div className="text-center">
                <p className="text-xs text-2">Streak</p>
                <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>{streak} days 🔥</p>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-amber-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-2">Weekly Leaderboard</p>
            <span className="ml-auto text-xs text-3">Resets Monday</span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-6">
              <Users size={32} className="mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-2">No entries yet this week</p>
              <p className="text-xs text-3 mt-1">Complete a workout to appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => {
                const isMe = entry.uid === uid
                const medals = ['🥇', '🥈', '🥉']
                return (
                  <div key={entry.uid}
                    className="flex items-center gap-3 glass rounded-xl px-3 py-2.5 transition-all"
                    style={isMe ? { border: '1px solid rgba(124,58,237,0.4)', background: 'rgba(124,58,237,0.08)' } : {}}>
                    <span className="text-lg w-6 text-center shrink-0">
                      {i < 3 ? medals[i] : `${i + 1}`}
                    </span>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: isMe ? '#7c3aed' : 'rgba(255,255,255,0.08)', color: isMe ? '#fff' : '#94a3b8' }}>
                      {(entry.displayName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-1 truncate">
                        {entry.displayName}{isMe && <span className="text-xs text-2 ml-1">(you)</span>}
                      </p>
                      {entry.goal && (
                        <p className="text-xs text-3 truncate">{entry.goal.replace('_', ' ')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Dumbbell size={12} className="text-violet-400" />
                      <span className="text-sm font-bold" style={{ color: '#7c3aed' }}>{entry.workoutCount}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Opt-in banner */}
          {!profile?.publicProfile && (
            <div className="mt-4 glass rounded-xl p-3 border" style={{ borderColor: 'rgba(124,58,237,0.2)' }}>
              <p className="text-xs text-2 mb-1.5">
                <Flame size={11} className="inline mr-1 text-amber-400" />
                Enable Public Profile to join the leaderboard
              </p>
              <Link href="/profile"
                className="flex items-center gap-1 text-xs font-semibold"
                style={{ color: '#7c3aed' }}>
                Go to Profile Settings <ChevronRight size={12} />
              </Link>
            </div>
          )}

          {myRank >= 0 && (
            <p className="text-xs text-2 text-center mt-3">
              You&apos;re ranked <span className="font-bold text-1">#{myRank + 1}</span> this week
            </p>
          )}
        </div>

      </div>
    </main>
  )
}
