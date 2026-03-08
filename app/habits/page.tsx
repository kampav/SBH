'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getHabits, saveHabit, deleteHabit, getDailyHabitLog, updateHabitLog, getHabitLogHistory } from '@/lib/firebase/firestore'
import { HabitDefinition, DailyHabitLog, HabitCategory } from '@/lib/types'
import { Analytics } from '@/lib/firebase/analytics'
import { serverTimestamp } from 'firebase/firestore'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Plus, Trash2 } from 'lucide-react'

const today = new Date().toISOString().slice(0, 10)

// ── Default habits seeded on first visit ──────────────────────────────────────
const DEFAULT_HABITS: Omit<HabitDefinition, 'createdAt'>[] = [
  { id: 'water',      name: 'Drink Water',          emoji: '💧', category: 'hydration',   targetCount: 8,  unit: 'glasses', active: true },
  { id: 'steps',      name: 'Daily Steps',           emoji: '🚶', category: 'movement',    targetCount: 8000, unit: 'steps', active: true },
  { id: 'meditate',   name: 'Meditate',              emoji: '🧘', category: 'mindfulness', targetCount: 10, unit: 'minutes', active: true },
  { id: 'stretch',    name: 'Stretch',               emoji: '🤸', category: 'movement',    targetCount: 1,  unit: 'session', active: true },
  { id: 'no_screens', name: 'Screen-free before bed',emoji: '📵', category: 'sleep',       targetCount: 1,  unit: 'done',   active: true },
]

// 7-day lookback dates
function getLast7Dates(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
}

export default function HabitsPage() {
  const router = useRouter()
  const [authReady, setAuthReady]   = useState(false)
  const [uid, setUid]               = useState('')
  const [habits, setHabits]         = useState<HabitDefinition[]>([])
  const [todayLog, setTodayLog]     = useState<DailyHabitLog | null>(null)
  const [history, setHistory]       = useState<DailyHabitLog[]>([])
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [newHabit, setNewHabit]     = useState({ name: '', emoji: '⭐', targetCount: 1, unit: 'done', category: 'custom' as HabitCategory })
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      setUid(user.uid)
      await loadAll(user.uid)
    })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function loadAll(userId: string) {
    setLoading(true)
    let loaded = await getHabits(userId)
    // Seed defaults on first visit
    if (loaded.length === 0) {
      const seeded = DEFAULT_HABITS.map(h => ({ ...h, createdAt: serverTimestamp() } as HabitDefinition))
      await Promise.all(seeded.map(h => saveHabit(userId, h)))
      loaded = seeded
    }
    const [log, hist] = await Promise.all([
      getDailyHabitLog(userId, today),
      getHabitLogHistory(userId, 7),
    ])
    setHabits(loaded)
    setTodayLog(log)
    setHistory(hist)
    setLoading(false)
  }

  async function increment(habitId: string, currentCount: number, targetCount: number) {
    const newCount = Math.min(currentCount + 1, targetCount)
    const updated = { ...(todayLog ?? { date: today, logs: {}, updatedAt: null as unknown as ReturnType<typeof serverTimestamp> }), logs: { ...(todayLog?.logs ?? {}), [habitId]: newCount } }
    setTodayLog(updated as DailyHabitLog)
    await updateHabitLog(uid, today, habitId, newCount)
    const completed = newCount >= targetCount
    Analytics.habitLogged(habitId, completed)
  }

  async function decrement(habitId: string, currentCount: number) {
    if (currentCount <= 0) return
    const newCount = currentCount - 1
    const updated = { ...(todayLog ?? { date: today, logs: {}, updatedAt: null as unknown as ReturnType<typeof serverTimestamp> }), logs: { ...(todayLog?.logs ?? {}), [habitId]: newCount } }
    setTodayLog(updated as DailyHabitLog)
    await updateHabitLog(uid, today, habitId, newCount)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await deleteHabit(uid, id)
    setHabits(prev => prev.filter(h => h.id !== id))
    setDeletingId(null)
  }

  async function handleAddHabit() {
    if (!newHabit.name.trim()) return
    const habit: HabitDefinition = {
      id: `custom_${Date.now()}`,
      name: newHabit.name.trim(),
      emoji: newHabit.emoji,
      category: newHabit.category,
      targetCount: Math.max(1, newHabit.targetCount),
      unit: newHabit.unit.trim() || 'done',
      active: true,
      createdAt: serverTimestamp(),
    }
    await saveHabit(uid, habit)
    setHabits(prev => [...prev, habit])
    setNewHabit({ name: '', emoji: '⭐', targetCount: 1, unit: 'done', category: 'custom' })
    setShowAdd(false)
  }

  // Build 7-day streak dots for a habit
  function getStreakDots(habitId: string, target: number) {
    const dates = getLast7Dates()
    return dates.map(date => {
      const log = history.find(h => h.date === date)
      const count = log?.logs?.[habitId] ?? 0
      const isToday = date === today
      const completed = count >= target
      return { date, completed, isToday }
    })
  }

  if (!authReady || loading) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen mesh-bg page-pad pb-28">
      {/* Header */}
      <header className="page-header-bar px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl glass-elevated">
            <ArrowLeft size={18} style={{ color: 'var(--text-2)' }} />
          </Link>
          <h1 className="page-title" style={{fontSize:'1.25rem'}}>Daily Habits</h1>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="p-2 rounded-xl glass-elevated">
          <Plus size={18} style={{ color: 'var(--text-2)' }} />
        </button>
      </header>

      <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 lg:px-8 space-y-3 pt-3">

        {/* Date */}
        <p className="text-xs text-3 px-1">
          {new Date(today).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        {/* Add habit form */}
        {showAdd && (
          <div className="glass rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-1">New Habit</p>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text" placeholder="Emoji" value={newHabit.emoji}
                onChange={e => setNewHabit(p => ({ ...p, emoji: e.target.value }))}
                className="px-3 py-2 glass-dark rounded-xl border border-white/10 text-sm text-1 text-center" />
              <input
                type="text" placeholder="Habit name" value={newHabit.name}
                onChange={e => setNewHabit(p => ({ ...p, name: e.target.value }))}
                className="col-span-2 px-3 py-2 glass-dark rounded-xl border border-white/10 text-sm text-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-2 mb-1 block">Daily Target</label>
                <input
                  type="number" min={1} max={1000} value={newHabit.targetCount}
                  onChange={e => setNewHabit(p => ({ ...p, targetCount: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 glass-dark rounded-xl border border-white/10 text-sm text-1" />
              </div>
              <div>
                <label className="text-xs text-2 mb-1 block">Unit</label>
                <input
                  type="text" placeholder="e.g. glasses" value={newHabit.unit}
                  onChange={e => setNewHabit(p => ({ ...p, unit: e.target.value }))}
                  className="w-full px-3 py-2 glass-dark rounded-xl border border-white/10 text-sm text-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 py-2 rounded-xl text-sm text-2 glass">Cancel</button>
              <button onClick={handleAddHabit}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
                Add Habit
              </button>
            </div>
          </div>
        )}

        {/* Habit cards */}
        {habits.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-2">No habits yet. Tap + to add one.</p>
          </div>
        ) : habits.map(habit => {
          const count = todayLog?.logs?.[habit.id] ?? 0
          const completed = count >= habit.targetCount
          const pct = Math.min((count / habit.targetCount) * 100, 100)
          const dots = getStreakDots(habit.id, habit.targetCount)
          const streakCount = (() => {
            let s = 0
            for (let i = dots.length - 2; i >= 0; i--) {
              if (dots[i].completed) s++; else break
            }
            return s + (completed ? 1 : 0)
          })()

          return (
            <div key={habit.id} className="glass rounded-2xl p-4 space-y-3"
              style={completed ? { border: '1px solid rgba(16,185,129,0.3)' } : {}}>
              {/* Top row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{habit.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-1">{habit.name}</p>
                    {streakCount > 0 && <p className="text-xs text-2">🔥 {streakCount}-day streak</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {completed && <CheckCircle2 size={18} className="text-emerald-400" />}
                  <button onClick={() => handleDelete(habit.id)} disabled={deletingId === habit.id}
                    className="p-1 rounded-lg opacity-30 hover:opacity-70 transition-opacity">
                    <Trash2 size={14} style={{ color: 'var(--text-2)' }} />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-2">{count} / {habit.targetCount} {habit.unit}</span>
                  <span style={{ color: completed ? '#10b981' : '#7c3aed' }}>
                    {completed ? 'Done! ✓' : `${Math.round(pct)}%`}
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-2 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, background: completed ? '#10b981' : 'linear-gradient(90deg,#7c3aed,#06b6d4)' }} />
                </div>
              </div>

              {/* Stepper */}
              <div className="flex items-center justify-between">
                <button onClick={() => decrement(habit.id, count)}
                  disabled={count <= 0}
                  className="w-9 h-9 rounded-xl glass text-sm font-bold text-2 disabled:opacity-30">
                  −
                </button>
                <div className="flex gap-1.5">
                  {dots.map((dot, i) => (
                    <div key={i} title={dot.date}
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: dot.completed ? '#10b981' : 'rgba(255,255,255,0.06)',
                        border: dot.isToday ? '1.5px solid #7c3aed' : 'none',
                      }}>
                      {dot.completed && <span style={{ fontSize: 8, color: '#fff' }}>✓</span>}
                    </div>
                  ))}
                </div>
                <button onClick={() => increment(habit.id, count, habit.targetCount)}
                  disabled={count >= habit.targetCount}
                  className="w-9 h-9 rounded-xl font-bold text-sm text-white disabled:opacity-30"
                  style={{ background: count >= habit.targetCount ? 'rgba(255,255,255,0.06)' : '#7c3aed' }}>
                  +
                </button>
              </div>
            </div>
          )
        })}

        <p className="text-center text-xs text-3 pb-2">
          Habits reset each day at midnight. 7-day streak dots shown above.
        </p>
      </div>
    </main>
  )
}
