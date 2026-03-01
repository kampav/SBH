'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { saveWorkout } from '@/lib/firestore'
import { estimateCaloriesBurned } from '@/lib/calculations'
import { DailyWorkout, ExerciseLog, SetLog } from '@/lib/types'
import { serverTimestamp } from 'firebase/firestore'

// Phase 1 Foundation — Full Body 3x/week (Science-based: BWS Full Body)
const PHASE1_WORKOUT: ExerciseLog[] = [
  { exerciseName: 'Goblet Squat', sets: [], videoUrl: 'https://youtu.be/MxsFDozLZYY', muscleGroup: 'Legs' },
  { exerciseName: 'Romanian Deadlift', sets: [], videoUrl: 'https://youtu.be/7j-2PDMqSJ4', muscleGroup: 'Posterior Chain' },
  { exerciseName: 'Push-Up / Dumbbell Press', sets: [], videoUrl: 'https://youtu.be/IODxDxX7oi4', muscleGroup: 'Chest' },
  { exerciseName: 'Dumbbell Row', sets: [], videoUrl: 'https://youtu.be/GZbfZ033f74', muscleGroup: 'Back' },
  { exerciseName: 'Shoulder Press', sets: [], videoUrl: 'https://youtu.be/qEwKCR5JCog', muscleGroup: 'Shoulders' },
  { exerciseName: 'Plank', sets: [], videoUrl: 'https://youtu.be/ASdvN_XEl_c', muscleGroup: 'Core' },
]

const SET_TEMPLATE = (n: number): SetLog => ({ setNumber: n, weightKg: 0, reps: 0, completed: false, restSeconds: 90 })

export default function WorkoutPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [exercises, setExercises] = useState<ExerciseLog[]>(PHASE1_WORKOUT.map(e => ({
    ...e,
    sets: [SET_TEMPLATE(1), SET_TEMPLATE(2), SET_TEMPLATE(3)],
  })))
  const [startTime] = useState(Date.now())
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) router.push('/login')
      else setUid(user.uid)
    })
    return unsub
  }, [router])

  useEffect(() => {
    if (restTimer === null) return
    if (restTimer <= 0) { setRestTimer(null); return }
    timerRef.current = setInterval(() => setRestTimer(t => (t ?? 0) - 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [restTimer])

  function updateSet(exIdx: number, setIdx: number, field: keyof SetLog, value: number | boolean) {
    setExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value }),
    }))
  }

  function completeSet(exIdx: number, setIdx: number) {
    updateSet(exIdx, setIdx, 'completed', true)
    setRestTimer(exercises[exIdx].sets[setIdx].restSeconds)
  }

  async function finishWorkout() {
    if (!uid) return
    setSaving(true)
    const durationMinutes = Math.round((Date.now() - startTime) / 60000)
    const totalVolumeKg = exercises.reduce((total, ex) =>
      total + ex.sets.filter(s => s.completed).reduce((t, s) => t + s.weightKg * s.reps, 0), 0)
    const workout: DailyWorkout = {
      date: new Date().toISOString().slice(0, 10),
      programmeDay: 'Phase 1 — Full Body Strength',
      exercises,
      durationMinutes,
      totalVolumeKg,
      estimatedCaloriesBurned: estimateCaloriesBurned(durationMinutes, 83),
      completedAt: serverTimestamp(),
    }
    await saveWorkout(uid, workout)
    setSaving(false)
    setCompleted(true)
  }

  if (completed) {
    const duration = Math.round((Date.now() - startTime) / 60000)
    const volume = exercises.reduce((t, ex) => t + ex.sets.filter(s => s.completed).reduce((tt, s) => tt + s.weightKg * s.reps, 0), 0)
    return (
      <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-slate-800 rounded-xl p-8 text-center space-y-4">
          <p className="text-4xl">💪</p>
          <h2 className="text-xl font-bold">Workout Complete!</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Duration</span><span>{duration} min</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Total Volume</span><span>{volume} kg</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Est. Calories Burned</span><span>{estimateCaloriesBurned(duration, 83)} kcal</span></div>
          </div>
          <button onClick={() => router.push('/dashboard')} className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold">Back to Dashboard</button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">Today&apos;s Workout</h1>
          <p className="text-xs text-slate-400">Phase 1 — Full Body Strength</p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-slate-400 hover:text-slate-200">Dashboard</button>
      </header>

      {/* Rest Timer */}
      {restTimer !== null && (
        <div className="fixed top-16 left-0 right-0 z-10 bg-amber-500 text-slate-900 text-center py-2 font-bold text-sm">
          Rest: {restTimer}s — breathe, then next set
        </div>
      )}

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {exercises.map((ex, exIdx) => (
          <div key={ex.exerciseName} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold">{ex.exerciseName}</h3>
                <p className="text-xs text-slate-400">{ex.muscleGroup}</p>
              </div>
              {ex.videoUrl && (
                <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:underline">Watch form</a>
              )}
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-xs text-slate-500 text-center">
                <span>Set</span><span>Weight (kg)</span><span>Reps</span><span>Done</span>
              </div>
              {ex.sets.map((set, setIdx) => (
                <div key={setIdx} className={`grid grid-cols-4 gap-2 items-center ${set.completed ? 'opacity-50' : ''}`}>
                  <span className="text-center text-sm text-slate-400">#{set.setNumber}</span>
                  <input type="number" step="0.5" value={set.weightKg || ''}
                    onChange={e => updateSet(exIdx, setIdx, 'weightKg', Number(e.target.value))}
                    disabled={set.completed}
                    className="px-2 py-1 bg-slate-700 text-white rounded text-sm text-center border border-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                  <input type="number" value={set.reps || ''}
                    onChange={e => updateSet(exIdx, setIdx, 'reps', Number(e.target.value))}
                    disabled={set.completed}
                    className="px-2 py-1 bg-slate-700 text-white rounded text-sm text-center border border-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                  <button onClick={() => completeSet(exIdx, setIdx)} disabled={set.completed}
                    className={`w-8 h-8 mx-auto rounded-full text-sm font-bold transition-colors ${set.completed ? 'bg-emerald-700 text-emerald-300' : 'bg-slate-700 hover:bg-emerald-500'}`}>
                    {set.completed ? '✓' : '○'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button onClick={finishWorkout} disabled={saving}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-lg disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : 'Finish Workout'}
        </button>
      </div>
    </main>
  )
}
