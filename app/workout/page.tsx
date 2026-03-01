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
import { ExternalLink, Check, Trophy, Timer, Dumbbell, Heart } from 'lucide-react'

// ─── 4-Day Programme + Daily Cardio ──────────────────────────────────────────
interface ExerciseDef {
  name: string
  muscleGroup: string
  sets: number
  repRange: string
  videoUrl: string
  restSeconds: number
}

const PROGRAMME: { day: number; label: string; focus: string; color: string; exercises: ExerciseDef[] }[] = [
  {
    day: 1,
    label: 'Day 1 — Upper Push',
    focus: 'Chest · Shoulders · Triceps',
    color: '#10b981',
    exercises: [
      { name: 'Flat Dumbbell Press',        muscleGroup: 'Chest',     sets: 3, repRange: '8-12',  videoUrl: 'https://youtu.be/IODxDxX7oi4', restSeconds: 90 },
      { name: 'Incline Dumbbell Press',     muscleGroup: 'Chest',     sets: 3, repRange: '8-12',  videoUrl: 'https://youtu.be/ip4rnv9K0sk', restSeconds: 90 },
      { name: 'Standing DB Shoulder Press', muscleGroup: 'Shoulders', sets: 3, repRange: '10-15', videoUrl: 'https://youtu.be/qEwKCR5JCog', restSeconds: 90 },
      { name: 'Lateral Raises',             muscleGroup: 'Shoulders', sets: 3, repRange: '12-15', videoUrl: 'https://youtu.be/3VcKaXpzqRo', restSeconds: 60 },
      { name: 'Tricep Pushdowns',           muscleGroup: 'Triceps',   sets: 3, repRange: '10-15', videoUrl: 'https://youtu.be/2-LAMcpzODU', restSeconds: 60 },
      { name: 'Overhead Tricep Extension',  muscleGroup: 'Triceps',   sets: 3, repRange: '10-15', videoUrl: 'https://youtu.be/YbX7Wd8jQ-Q', restSeconds: 60 },
    ],
  },
  {
    day: 2,
    label: 'Day 2 — Lower Posterior',
    focus: 'Glutes · Hamstrings · Core',
    color: '#6366f1',
    exercises: [
      { name: 'Barbell Hip Thrust',         muscleGroup: 'Glutes',    sets: 3, repRange: '10-15', videoUrl: 'https://youtu.be/SEdqd1n0cvg', restSeconds: 120 },
      { name: 'Romanian Deadlift',          muscleGroup: 'Hamstrings',sets: 3, repRange: '8-12',  videoUrl: 'https://youtu.be/7j-2PDMqSJ4', restSeconds: 90 },
      { name: 'Swiss Ball Leg Curls',       muscleGroup: 'Hamstrings',sets: 3, repRange: '8-12',  videoUrl: 'https://youtu.be/XjkNMCcCQRo', restSeconds: 90 },
      { name: 'Reverse Lunges (each side)', muscleGroup: 'Glutes',    sets: 3, repRange: '8-12',  videoUrl: 'https://youtu.be/xrjwA5N-Or4', restSeconds: 90 },
      { name: 'Side Lying Clam',            muscleGroup: 'Glutes',    sets: 3, repRange: '10-15', videoUrl: 'https://youtu.be/8Gz1YMQ7DtM', restSeconds: 60 },
      { name: 'Weighted Cable Crunches',    muscleGroup: 'Core',      sets: 3, repRange: '10-15', videoUrl: 'https://youtu.be/AV5PmvmEWlE', restSeconds: 60 },
    ],
  },
  {
    day: 3,
    label: 'Day 3 — Upper Pull',
    focus: 'Back · Biceps · Rear Delts',
    color: '#f59e0b',
    exercises: [
      { name: 'Lat Pulldowns',     muscleGroup: 'Back',      sets: 3, repRange: '10-15', videoUrl: 'https://youtu.be/SAOfD-Olk4A', restSeconds: 90 },
      { name: 'Seated Cable Row',  muscleGroup: 'Back',      sets: 3, repRange: '8-12',  videoUrl: 'https://youtu.be/GZbfZ033f74', restSeconds: 90 },
      { name: 'Dumbbell Row',      muscleGroup: 'Back',      sets: 3, repRange: '8-12',  videoUrl: 'https://youtu.be/pYcpY20QaE8', restSeconds: 90 },
      { name: 'Face Pulls',        muscleGroup: 'Rear Delts',sets: 3, repRange: '12-15', videoUrl: 'https://youtu.be/eIq5CB9JfKE', restSeconds: 60 },
      { name: 'Barbell Bicep Curl',muscleGroup: 'Biceps',   sets: 3, repRange: '10-15', videoUrl: 'https://youtu.be/ykJmrZ5v0Oo', restSeconds: 60 },
      { name: 'Hammer Curls',      muscleGroup: 'Biceps',   sets: 3, repRange: '10-15', videoUrl: 'https://youtu.be/CFBZ4jN1CMI', restSeconds: 60 },
    ],
  },
  {
    day: 4,
    label: 'Day 4 — Lower Anterior',
    focus: 'Quads · Calves · Core',
    color: '#ef4444',
    exercises: [
      { name: 'Barbell Back Squat',               muscleGroup: 'Quads',  sets: 3, repRange: '8-12',  videoUrl: 'https://youtu.be/bEv6CCg2BC8', restSeconds: 120 },
      { name: 'Sumo Deadlift',                    muscleGroup: 'Quads',  sets: 3, repRange: '8-12',  videoUrl: 'https://youtu.be/H3NHsQkUI8c', restSeconds: 120 },
      { name: 'Goblet Squat',                     muscleGroup: 'Quads',  sets: 3, repRange: '10-15', videoUrl: 'https://youtu.be/MxsFDozLZYY', restSeconds: 90 },
      { name: 'Lateral Band Walk (each direction)',muscleGroup: 'Glutes', sets: 3, repRange: '10-15', videoUrl: 'https://youtu.be/3KYl8J7VGcU', restSeconds: 60 },
      { name: 'Lying Leg Raises',                 muscleGroup: 'Core',   sets: 3, repRange: '10-15', videoUrl: 'https://youtu.be/JB2oyawG9KI', restSeconds: 60 },
      { name: 'Bicycle Crunches',                 muscleGroup: 'Core',   sets: 3, repRange: '15-20', videoUrl: 'https://youtu.be/9FGilxCbdz8', restSeconds: 45 },
    ],
  },
]

const WEEKLY_SCHEDULE = [
  { dayName: 'Mon', programme: 1 },
  { dayName: 'Tue', programme: 2 },
  { dayName: 'Wed', programme: null },   // rest / cardio only
  { dayName: 'Thu', programme: 3 },
  { dayName: 'Fri', programme: 4 },
  { dayName: 'Sat', programme: null },   // cardio only
  { dayName: 'Sun', programme: null },   // rest
]

function buildExerciseLogs(dayIdx: number): ExerciseLog[] {
  return PROGRAMME[dayIdx].exercises.map(e => ({
    exerciseName: e.name,
    muscleGroup: e.muscleGroup,
    videoUrl: e.videoUrl,
    sets: Array.from({ length: e.sets }, (_, i) => ({
      setNumber: i + 1,
      weightKg: 0,
      reps: 0,
      completed: false,
      restSeconds: e.restSeconds,
    } satisfies SetLog)),
  }))
}

export default function WorkoutPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)
  const [exercises, setExercises] = useState<ExerciseLog[]>(buildExerciseLogs(0))
  const [startTime] = useState(Date.now())
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [cardioLogged, setCardioLogged] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setAuthReady(true)
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

  function selectDay(idx: number) {
    setSelectedDay(idx)
    setExercises(buildExerciseLogs(idx))
    setCompleted(false)
  }

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
    const totalVolumeKg = exercises.reduce((t, ex) =>
      t + ex.sets.filter(s => s.completed).reduce((tt, s) => tt + s.weightKg * s.reps, 0), 0)
    const workout: DailyWorkout = {
      date: new Date().toISOString().slice(0, 10),
      programmeDay: PROGRAMME[selectedDay].label,
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

  if (!authReady) return (
    <main className="min-h-screen bg-app flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  if (completed) {
    const duration = Math.round((Date.now() - startTime) / 60000)
    const volume = exercises.reduce((t, ex) =>
      t + ex.sets.filter(s => s.completed).reduce((tt, s) => tt + s.weightKg * s.reps, 0), 0)
    return (
      <main className="min-h-screen bg-app flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-card-sbh rounded-2xl p-8 text-center border border-sbh space-y-5 glow-emerald">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
            style={{background:'linear-gradient(135deg,#059669,#047857)'}}>
            <Trophy size={36} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-1">Workout Complete!</h2>
            <p className="text-sm text-emerald-400 font-semibold">+150 XP earned</p>
          </div>
          <div className="space-y-2 text-sm bg-card-2 rounded-xl p-3 border border-sbh">
            <div className="flex justify-between">
              <span className="text-2">Duration</span>
              <span className="font-semibold text-1">{duration} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-2">Total Volume</span>
              <span className="font-semibold text-1">{volume.toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-2">Est. Burned</span>
              <span className="font-semibold text-emerald-400">{estimateCaloriesBurned(duration, 83)} kcal</span>
            </div>
          </div>
          {!cardioLogged && (
            <div className="bg-card-2 rounded-xl p-3 border border-sbh text-left">
              <p className="text-xs text-2 mb-2">Don&#39;t forget your daily cardio!</p>
              <button onClick={() => setCardioLogged(true)}
                className="w-full py-2 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2"
                style={{background:'#6366f1'}}>
                <Heart size={14} />
                Log 30-min Cardio Done
              </button>
            </div>
          )}
          {cardioLogged && (
            <p className="text-xs text-emerald-400">&#10003; Cardio logged! +25 XP</p>
          )}
          <button onClick={() => router.push('/dashboard')}
            className="w-full py-3 rounded-xl font-bold text-white"
            style={{background:'linear-gradient(135deg,#059669,#047857)'}}>
            Back to Dashboard
          </button>
        </div>
      </main>
    )
  }

  const prog = PROGRAMME[selectedDay]
  const totalSets = exercises.reduce((t, ex) => t + ex.sets.length, 0)
  const doneSets = exercises.reduce((t, ex) => t + ex.sets.filter(s => s.completed).length, 0)

  return (
    <main className="min-h-screen bg-app page-pad">
      <header className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Dumbbell size={16} className="text-emerald-400" />
          <p className="text-xs text-2">4-Day Upper/Lower Split</p>
        </div>
        <h1 className="text-xl font-bold text-1">{prog.label}</h1>
        <p className="text-xs text-2 mt-0.5">{prog.focus}</p>
      </header>

      {/* Rest timer */}
      {restTimer !== null && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-3 font-bold text-sm"
          style={{background:'#f59e0b', color:'#0f172a'}}>
          <Timer size={16} />
          Rest: {restTimer}s — breathe deeply
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 space-y-4">

        {/* Day selector */}
        <div className="grid grid-cols-4 gap-2">
          {PROGRAMME.map((p, i) => (
            <button key={i} onClick={() => selectDay(i)}
              className="rounded-xl py-3 px-2 text-center transition-all border"
              style={{
                background: selectedDay === i ? p.color + '20' : '#0D1526',
                borderColor: selectedDay === i ? p.color : '#1a2744',
                color: selectedDay === i ? p.color : '#94a3b8',
              }}>
              <p className="text-xs font-bold">Day {p.day}</p>
              <p className="text-xs mt-0.5 opacity-70 leading-tight">{p.focus.split(' ')[0]}</p>
            </button>
          ))}
        </div>

        {/* Weekly schedule */}
        <div className="bg-card-sbh rounded-2xl p-3 border border-sbh">
          <p className="text-xs text-2 mb-2 uppercase tracking-widest font-semibold">Weekly Schedule</p>
          <div className="grid grid-cols-7 gap-1">
            {WEEKLY_SCHEDULE.map(({ dayName, programme }) => (
              <div key={dayName} className="flex flex-col items-center gap-1">
                <p className="text-xs text-3">{dayName}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{
                    background: programme ? PROGRAMME[programme - 1].color + '20' : '#111d35',
                    color: programme ? PROGRAMME[programme - 1].color : '#475569',
                  }}>
                  {programme ? `D${programme}` : (dayName === 'Wed' || dayName === 'Sat' ? '&#x1F6B4;' : '—')}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-3 mt-2">&#x1F6B4; = Cardio only day (30 min)</p>
        </div>

        {/* Daily cardio reminder */}
        <div className="bg-card-2 rounded-2xl p-3 border border-sbh flex items-center gap-3">
          <Heart size={18} className="text-rose-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-1">Daily Cardio — 30 minutes</p>
            <p className="text-xs text-2 mt-0.5">Brisk walk, cycling, elliptical or rowing. Keep heart rate 120-140 bpm.</p>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-card-sbh rounded-2xl p-4 border border-sbh">
          <div className="flex justify-between text-xs text-2 mb-2">
            <span>Sets completed</span>
            <span className="font-semibold" style={{color: prog.color}}>{doneSets} / {totalSets}</span>
          </div>
          <div className="w-full rounded-full h-2" style={{background:'#1a2744'}}>
            <div className="h-2 rounded-full transition-all"
              style={{width: totalSets ? `${(doneSets/totalSets)*100}%` : '0%', background: prog.color}} />
          </div>
        </div>

        {/* Exercise cards */}
        {exercises.map((ex, exIdx) => {
          const def = prog.exercises[exIdx]
          const allDone = ex.sets.every(s => s.completed)
          return (
            <div key={ex.exerciseName} className="bg-card-sbh rounded-2xl p-4 border transition-colors"
              style={{borderColor: allDone ? prog.color + '60' : '#1a2744'}}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    {allDone && <Check size={14} style={{color: prog.color}} />}
                    <h3 className="font-semibold text-sm" style={{color: allDone ? prog.color : '#f1f5f9'}}>{ex.exerciseName}</h3>
                  </div>
                  <p className="text-xs text-2 mt-0.5">{ex.muscleGroup} &middot; {def.sets} sets &times; {def.repRange} reps</p>
                </div>
                {ex.videoUrl && (
                  <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 shrink-0 ml-2">
                    <ExternalLink size={12} />
                    Watch
                  </a>
                )}
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-xs text-3 text-center px-1">
                  <span>Set</span><span>kg</span><span>Reps</span><span>Done</span>
                </div>
                {ex.sets.map((set, setIdx) => (
                  <div key={setIdx} className={`grid grid-cols-4 gap-2 items-center ${set.completed ? 'opacity-40' : ''}`}>
                    <span className="text-center text-xs text-2">#{set.setNumber}</span>
                    <input type="number" step="0.5" value={set.weightKg || ''}
                      onChange={e => updateSet(exIdx, setIdx, 'weightKg', Number(e.target.value))}
                      disabled={set.completed} placeholder="0"
                      className="px-2 py-1.5 rounded-lg text-sm text-1 text-center outline-none w-full"
                      style={{background:'#111d35', border:'1px solid #1a2744'}}
                    />
                    <input type="number" value={set.reps || ''}
                      onChange={e => updateSet(exIdx, setIdx, 'reps', Number(e.target.value))}
                      disabled={set.completed} placeholder="0"
                      className="px-2 py-1.5 rounded-lg text-sm text-1 text-center outline-none w-full"
                      style={{background:'#111d35', border:'1px solid #1a2744'}}
                    />
                    <button onClick={() => completeSet(exIdx, setIdx)} disabled={set.completed}
                      className="w-9 h-9 mx-auto rounded-full text-sm font-bold transition-colors flex items-center justify-center"
                      style={{
                        background: set.completed ? prog.color + '20' : '#1a2744',
                        color: set.completed ? prog.color : '#94a3b8',
                      }}>
                      {set.completed ? <Check size={14} /> : '○'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        <button onClick={finishWorkout} disabled={saving}
          className="w-full py-4 rounded-2xl font-bold text-lg text-white disabled:opacity-50 transition-opacity glow-emerald"
          style={{background:`linear-gradient(135deg,${prog.color},${prog.color}cc)`}}>
          {saving ? 'Saving...' : 'Finish Workout + Log'}
        </button>

        <div className="text-center text-xs text-3 pb-4">
          Science-based programming by Jeremy Ethier / Built With Science
        </div>
      </div>
    </main>
  )
}
