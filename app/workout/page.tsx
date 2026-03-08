'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { saveWorkout, getWorkout, getProfile, getRecentWorkouts, updateLeaderboardEntry, savePublicProfileFields } from '@/lib/firebase/firestore'
import { estimateCaloriesBurned } from '@/lib/health/calculations'
import { DailyWorkout, ExerciseLog, SetLog, ProgrammeKey, UserProfile } from '@/lib/types'
import { getSuggestion, formatSuggestion } from '@/lib/health/progressive-overload'
import { serverTimestamp } from 'firebase/firestore'
import { ExternalLink, Check, Trophy, Dumbbell, Heart, ChevronRight, Play, History, BookOpen, Share2 } from 'lucide-react'
import Link from 'next/link'
import RestTimerOverlay from '@/components/workout/RestTimerOverlay'
import WorkoutShareCard from '@/components/workout/WorkoutShareCard'
import { getWeekStart } from '@/lib/utils'
import {
  type ExerciseDef, EXERCISE_INFO, PROGRAMMES,
} from '@/lib/workout/exerciseData'

// ─── 12-Week Phases ───────────────────────────────────────────────────────────
const PHASES = [
  { num: 1, weeks: '1–4',  name: 'Fat Loss Foundation', color: '#10b981', sub: 'High frequency · Fat oxidation · Mobility' },
  { num: 2, weeks: '5–8',  name: 'Muscle Growth',        color: '#6366f1', sub: 'Progressive overload · Strength · Volume' },
  { num: 3, weeks: '9–12', name: 'Definition & Power',   color: '#f59e0b', sub: 'HIIT · Circuit · Conditioning' },
]

function getCurrentPhase(programmeWeek: number): 1 | 2 | 3 {
  if (programmeWeek <= 4) return 1
  if (programmeWeek <= 8) return 2
  return 3
}

function buildExerciseLogs(dayIdx: number, key: ProgrammeKey): ExerciseLog[] {
  return PROGRAMMES[key][dayIdx].exercises.map(e => ({
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

// ─── Progressive Overload Hint ────────────────────────────────────────────────
type OverloadHint = { type: 'reps' | 'weight' | 'deload' | 'start'; message: string } | null

function getOverloadHint(
  exerciseName: string,
  def: ExerciseDef,
  lastWeek: DailyWorkout | null,
  workoutCount: number,
): OverloadHint {
  if (def.isTime) return null
  const lastEx = lastWeek?.exercises.find(e => e.exerciseName === exerciseName)
  const lastSets = lastEx?.sets ?? []
  const targetReps = parseInt(def.repRange.split('-').pop() ?? '0') || 10
  const suggestion = getSuggestion(lastSets, exerciseName, targetReps, workoutCount)
  if (suggestion.action === 'start' && lastSets.length === 0 && !lastWeek) return null
  const msg = formatSuggestion(suggestion)
  const type: OverloadHint extends null ? never : NonNullable<OverloadHint>['type'] =
    suggestion.action === 'increase' ? 'weight'
    : suggestion.action === 'deload'   ? 'deload'
    : suggestion.action === 'start'    ? 'start'
    : 'reps'
  return { type, message: msg }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorkoutPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [programmeKey, setProgrammeKey] = useState<ProgrammeKey>('home_6day')
  const [selectedDay, setSelectedDay] = useState(() => {
    const dow = new Date().getDay()  // 0=Sun
    return dow === 0 ? 6 : dow - 1  // Mon=0 … Sat=5, Sun=6 (all programmes have 7 days)
  })
  const [exercises, setExercises] = useState<ExerciseLog[]>([])
  const [userWeightKg, setUserWeightKg] = useState(83)
  const [lastWeekWorkout, setLastWeekWorkout] = useState<DailyWorkout | null>(null)
  const [startTime] = useState(Date.now())
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [programmeWeek, setProgrammeWeek] = useState(1)
  const [cardioLogged, setCardioLogged] = useState(false)
  const [completedWorkoutDates, setCompletedWorkoutDates] = useState<Set<string>>(new Set())
  const [workoutCount, setWorkoutCount] = useState(0)
  const [lastCompletedExIdx, setLastCompletedExIdx] = useState(0)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [sharing, setSharing] = useState(false)
  const shareCardRef = useRef<HTMLDivElement>(null)

  // ISO date strings for Mon–Sun of the current week (index 0=Mon, 6=Sun)
  const weekDates = useMemo(() => {
    const today = new Date()
    const dow = today.getDay() // 0=Sun
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() + mondayOffset + i)
      return d.toISOString().slice(0, 10)
    })
  }, [])

  // Derived from state — reactive to programmeKey
  const PROGRAMME = PROGRAMMES[programmeKey]

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      setUid(user.uid)
      const saved = localStorage.getItem(`sbh_week_${user.uid}`)
      setProgrammeWeek(saved ? Math.min(Math.max(parseInt(saved), 1), 12) : 1)
      const profile = await getProfile(user.uid)
      setProfile(profile)
      if (profile?.programme) setProgrammeKey(profile.programme)
      if (profile?.weightKg) setUserWeightKg(profile.weightKg)
      // Load completed workout dates to grey out finished days in the week view
      getRecentWorkouts(user.uid, 90).then(recent => {
        setCompletedWorkoutDates(new Set(recent.map(w => w.date)))
        setWorkoutCount(recent.length)
      })
    })
    return unsub
  }, [router])

  useEffect(() => {
    const day = PROGRAMME[selectedDay]
    if (!day.isRest) {
      const base = buildExerciseLogs(selectedDay, programmeKey)
      // Restore today's draft if available
      if (uid) {
        const todayStr = new Date().toISOString().slice(0, 10)
        const draftKey = `sbh_workout_draft_${uid}_${todayStr}_${selectedDay}`
        const savedDraft = localStorage.getItem(draftKey)
        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft) as ExerciseLog[]
            setExercises(draft.length === base.length ? draft : base)
          } catch {
            setExercises(base)
          }
        } else {
          setExercises(base)
        }
      } else {
        setExercises(base)
      }
    } else {
      setExercises([])
    }
    setCompleted(false)
    setLastWeekWorkout(null)

    // Fetch last week's workout for overload hints
    if (uid && !day.isRest) {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      const lastWeekDateStr = d.toISOString().slice(0, 10)
      getWorkout(uid, lastWeekDateStr).then(w => {
        if (w && w.programmeDay === day.label) setLastWeekWorkout(w)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, uid, programmeKey])

  // Auto-save draft to localStorage whenever exercises change
  useEffect(() => {
    if (!uid || exercises.length === 0 || completed) return
    const todayStr = new Date().toISOString().slice(0, 10)
    const draftKey = `sbh_workout_draft_${uid}_${todayStr}_${selectedDay}`
    localStorage.setItem(draftKey, JSON.stringify(exercises))
  }, [exercises, uid, selectedDay, completed])

  function updateSet(exIdx: number, setIdx: number, field: keyof SetLog, value: number | boolean) {
    setExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value }),
    }))
  }

  function completeSet(exIdx: number, setIdx: number) {
    updateSet(exIdx, setIdx, 'completed', true)
    setLastCompletedExIdx(exIdx)
    const rest = exercises[exIdx].sets[setIdx].restSeconds
    if (rest > 0) setRestTimer(rest)
  }

  async function finishWorkout() {
    if (!uid) return
    setSaving(true)
    const todayStr = new Date().toISOString().slice(0, 10)
    const durationMinutes = Math.round((Date.now() - startTime) / 60000)
    const totalVolumeKg = exercises.reduce((t, ex) =>
      t + ex.sets.filter(s => s.completed).reduce((tt, s) => tt + s.weightKg * s.reps, 0), 0)
    const prog = PROGRAMME[selectedDay]
    const workout: DailyWorkout = {
      date: todayStr,
      programmeDay: prog.label,
      exercises,
      durationMinutes,
      totalVolumeKg,
      estimatedCaloriesBurned: estimateCaloriesBurned(durationMinutes, userWeightKg),
      completedAt: serverTimestamp(),
    }
    await saveWorkout(uid, workout)
    // Clear draft after successful save
    localStorage.removeItem(`sbh_workout_draft_${uid}_${todayStr}_${selectedDay}`)
    setCompletedWorkoutDates(prev => {
      const next = new Set(Array.from(prev).concat(todayStr))
      // Update leaderboard if user opted in
      if (profile?.publicProfile) {
        const weekKey = getWeekStart(new Date())
        const weekCount = Array.from(next).filter(d => d >= weekKey && d <= todayStr).length
        savePublicProfileFields(uid, profile.displayName ?? '').then(({ username, referralCode }) => {
          updateLeaderboardEntry(weekKey, {
            uid,
            displayName: profile.displayName ?? 'Anonymous',
            goal: profile.goal ?? '',
            workoutCount: weekCount,
            updatedAt: serverTimestamp(),
          })
          // Persist username + referralCode back to profile state
          setProfile(p => p ? { ...p, username, referralCode } : p)
        })
      }
      return next
    })
    setSaving(false)
    setCompleted(true)
  }

  // Stable callback — prevents RestTimerOverlay interval from restarting on every parent render
  const dismissRestTimer = useCallback(() => setRestTimer(null), [])

  async function handleShareWorkout(duration: number, volume: number, calories: number) {
    if (!shareCardRef.current || sharing) return
    setSharing(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(shareCardRef.current, { backgroundColor: null, scale: 2 })
      canvas.toBlob(async blob => {
        if (!blob) { setSharing(false); return }
        const file = new File([blob], 'sbh-workout.png', { type: 'image/png' })
        const shareData = {
          title: 'Workout Complete — HealthOS',
          text: `Just crushed a workout! ${duration}min · ${volume.toFixed(0)}kg · ${calories}kcal`,
          files: [file],
        }
        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData)
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'sbh-workout.png'
          a.click()
          URL.revokeObjectURL(url)
        }
        setSharing(false)
      }, 'image/png')
    } catch {
      setSharing(false)
    }
  }

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  // ── Completion screen ────────────────────────────────────────────────────────
  if (completed) {
    const duration = Math.round((Date.now() - startTime) / 60000)
    const volume = exercises.reduce((t, ex) =>
      t + ex.sets.filter(s => s.completed).reduce((tt, s) => tt + s.weightKg * s.reps, 0), 0)
    const calories = estimateCaloriesBurned(duration, userWeightKg)
    const todayStr = new Date().toISOString().slice(0, 10)
    const prog = PROGRAMME[selectedDay]
    return (
      <main className="min-h-screen mesh-bg flex items-center justify-center p-5">
        {/* Hidden card for html2canvas screenshot */}
        <WorkoutShareCard
          ref={shareCardRef}
          programmeName={prog.label}
          date={todayStr}
          duration={duration}
          volume={volume}
          calories={calories}
          xp={150}
        />
        <div className="max-w-sm w-full glass-strong rounded-3xl p-8 text-center space-y-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto glow-violet"
            style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)'}}>
            <Trophy size={36} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-1">Workout Complete!</h2>
            <p className="text-sm font-semibold" style={{color:'#7c3aed'}}>+150 XP earned 🔥</p>
          </div>
          <div className="space-y-2 text-sm glass rounded-2xl p-4">
            {[
              ['Duration', `${duration} min`],
              ['Total Volume', `${volume.toFixed(1)} kg`],
              ['Est. Burned', `${calories} kcal`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-2">{k}</span>
                <span className="font-semibold" style={{color:'#7c3aed'}}>{v}</span>
              </div>
            ))}
          </div>
          {!cardioLogged && (
            <div className="glass rounded-2xl p-3 text-left">
              <p className="text-xs text-2 mb-2">Don&apos;t forget your daily cardio!</p>
              <button onClick={() => setCardioLogged(true)}
                className="w-full py-2 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2"
                style={{background:'#7c3aed'}}>
                <Heart size={14} /> Log 30-min Cardio Done (+25 XP)
              </button>
            </div>
          )}
          {cardioLogged && <p className="text-xs font-semibold" style={{color:'#7c3aed'}}>✓ Cardio logged! +25 XP</p>}
          <button
            onClick={() => handleShareWorkout(duration, volume, calories)}
            disabled={sharing}
            className="w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 glass border"
            style={{borderColor:'rgba(124,58,237,0.3)', color:'#7c3aed'}}>
            <Share2 size={15} />
            {sharing ? 'Generating…' : 'Share Workout'}
          </button>
          <button onClick={() => router.push('/dashboard')}
            className="w-full py-3.5 rounded-2xl font-bold text-white"
            style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow:'0 0 32px -8px #7c3aed60'}}>
            Back to Dashboard
          </button>
        </div>
      </main>
    )
  }

  const prog = PROGRAMME[selectedDay]
  const phase = getCurrentPhase(programmeWeek)
  const currentPhase = PHASES[phase - 1]
  const totalSets = exercises.reduce((t, ex) => t + ex.sets.length, 0)
  const doneSets = exercises.reduce((t, ex) => t + ex.sets.filter(s => s.completed).length, 0)
  const pct = totalSets > 0 ? (doneSets / totalSets) * 100 : 0

  return (
    <main className="min-h-screen mesh-bg page-pad">
      {/* Rest timer overlay */}
      {restTimer !== null && (
        <RestTimerOverlay
          seconds={restTimer}
          exerciseName={exercises[lastCompletedExIdx]?.exerciseName ?? ''}
          onDismiss={dismissRestTimer}
        />
      )}

      {/* Header */}
      <header className="page-header-bar px-4 flex items-center justify-between h-14">
        <div>
          <p className="section-label">
            <span className="font-semibold" style={{color: currentPhase.color}}>Phase {phase}</span>
            {' · '}Week {programmeWeek}/12
          </p>
          <div className="flex items-center gap-1.5">
            <Dumbbell size={15} style={{color: prog.color}} />
            <h1 className="page-title" style={{fontSize:'1.1rem'}}>{prog.label}</h1>
          </div>
        </div>
        <div className="flex gap-2">
            <Link href="/exercises" className="p-2 rounded-xl glass-elevated" title="Exercise library">
              <BookOpen size={16} className="text-slate-400" />
            </Link>
            <Link href="/workout/history" className="p-2 rounded-xl glass-elevated" title="Workout history">
              <History size={16} className="text-slate-400" />
            </Link>
          </div>
      </header>

      <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 lg:px-8 space-y-4 pt-3">

        {/* 7-day week view */}
        <div className="glass-elevated rounded-2xl p-3">
          <div className="grid grid-cols-7 gap-1.5">
            {PROGRAMME.map((p, i) => {
              const isSelected = i === selectedDay
              const dayDate = weekDates[i]
              const isDone = !p.isRest && completedWorkoutDates.has(dayDate)
              return (
                <button key={i} onClick={() => setSelectedDay(i)}
                  className="flex flex-col items-center gap-1.5 transition-all">
                  <p className="text-xs text-3">{p.dayName}</p>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all relative"
                    style={{
                      background: isSelected
                        ? p.color
                        : isDone ? p.color + '22'
                        : p.isRest ? '#0D1526' : p.color + '15',
                      color: isSelected ? '#fff' : isDone ? p.color : p.isRest ? '#475569' : p.color,
                      boxShadow: isSelected ? `0 0 16px -4px ${p.color}80` : 'none',
                      opacity: isDone && !isSelected ? 0.65 : 1,
                    }}>
                    {isDone && !isSelected ? <Check size={12} /> : p.isRest ? '—' : p.dayName.charAt(0)}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Phase info card */}
        <div className="glass rounded-2xl p-3 border" style={{borderColor: currentPhase.color + '30'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold" style={{color: currentPhase.color}}>
                12-Week Programme · Phase {phase}
              </p>
              <p className="text-xs text-2 mt-0.5">{currentPhase.sub}</p>
            </div>
            <div className="flex items-center gap-1">
              {PHASES.map(ph => (
                <div key={ph.num} className="w-2 h-2 rounded-full transition-all"
                  style={{background: ph.num === phase ? ph.color : '#1a2744'}} />
              ))}
            </div>
          </div>
        </div>

        {/* Rest day */}
        {prog.isRest && (
          <div className="glass-strong rounded-3xl p-8 text-center space-y-3">
            <div className="text-5xl">😴</div>
            <h2 className="text-xl font-bold text-1">Rest Day</h2>
            <p className="text-sm text-2">Recovery is where growth happens. Sleep 7–9hrs, hit 2L water, nail your macros.</p>
            <div className="glass rounded-2xl p-4 text-left space-y-2 text-sm">
              {['💤 Sleep 7–9 hours', '💧 Drink 3L water', '🥩 Hit protein target', '🧘 Optional light stretch'].map(t => (
                <p key={t} className="text-2">{t}</p>
              ))}
            </div>
          </div>
        )}

        {/* Progress bar */}
        {!prog.isRest && totalSets > 0 && (
          <div className="glass rounded-2xl p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-2">Sets completed</span>
              <span className="font-semibold" style={{color: prog.color}}>{doneSets} / {totalSets}</span>
            </div>
            <div className="w-full rounded-full h-2" style={{background:'var(--ring-track)'}}>
              <div className="h-2 rounded-full transition-all duration-500"
                style={{width:`${pct}%`, background: prog.gradient}} />
            </div>
            {pct === 100 && (
              <p className="text-xs mt-2 text-center font-semibold" style={{color:'#10b981'}}>
                All sets done! 🔥 Finish your workout below.
              </p>
            )}
          </div>
        )}

        {/* Progressive overload banner — data-driven */}
        {!prog.isRest && lastWeekWorkout && (
          <div className="glass rounded-2xl p-3 flex items-center gap-3">
            <span className="text-xl">📈</span>
            <div>
              <p className="text-xs font-semibold text-1">Progressive Overload Active</p>
              <p className="text-xs text-2">Per-exercise hints shown based on last week&apos;s performance</p>
            </div>
          </div>
        )}

        {/* Exercise cards */}
        {!prog.isRest && exercises.map((ex, exIdx) => {
          const def = prog.exercises[exIdx]
          if (!def) return null  // guard: stale exercises state during day switch
          const info = EXERCISE_INFO[ex.exerciseName]
          const videoUrl = info?.videoUrl ?? ex.videoUrl
          const allDone = ex.sets.every(s => s.completed)
          const hint = getOverloadHint(ex.exerciseName, def, lastWeekWorkout, workoutCount)
          return (
            <div key={ex.exerciseName} className="glass rounded-2xl p-4 transition-all"
              style={allDone ? {border: `1px solid ${prog.color}60`} : {}}>
              <div className="flex items-start gap-3 mb-3">
                <div className="ex-thumb" style={{background: prog.color + '18'}}>
                  {def?.emoji ?? '💪'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {allDone && <Check size={13} style={{color: prog.color}} />}
                    <h3 className="font-semibold text-sm truncate" style={{color: allDone ? prog.color : '#f1f5f9'}}>
                      {ex.exerciseName}
                    </h3>
                  </div>
                  <p className="text-xs text-2 mt-0.5">
                    {ex.muscleGroup} · {def?.sets} sets × {def?.repRange} {def?.isTime ? '' : 'reps'}
                  </p>
                  {info?.description && (
                    <p className="text-xs mt-1 leading-relaxed" style={{color:'#64748b'}}>{info.description}</p>
                  )}
                  {hint && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 font-medium"
                      style={{
                        background: hint.type === 'deload' ? 'rgba(99,102,241,0.12)'
                          : hint.type === 'weight' ? 'rgba(245,158,11,0.12)'
                          : 'rgba(16,185,129,0.12)',
                        color: hint.type === 'deload' ? '#818cf8'
                          : hint.type === 'weight' ? '#f59e0b'
                          : '#10b981',
                      }}>
                      {hint.message}
                    </span>
                  )}
                </div>
                {videoUrl && (
                  <a href={videoUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs shrink-0 px-2 py-1 rounded-lg glass"
                    style={{color: prog.color}}>
                    <Play size={11} fill="currentColor" /> Watch
                  </a>
                )}
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-xs text-3 text-center px-1">
                  <span>Set</span>
                  <span>{def?.isTime ? 'sec' : 'kg'}</span>
                  <span>{def?.isTime ? 'done' : 'reps'}</span>
                  <span>✓</span>
                </div>
                {ex.sets.map((set, setIdx) => {
                  const lastEx = lastWeekWorkout?.exercises.find(e => e.exerciseName === ex.exerciseName)
                  const lastSet = lastEx?.sets[setIdx]
                  const hasPrev = lastSet && lastSet.completed && !def?.isTime
                  return (
                    <div key={setIdx}>
                      <div className={`grid grid-cols-4 gap-2 items-center ${set.completed ? 'opacity-40' : ''}`}>
                        <span className="text-center text-xs text-2">#{set.setNumber}</span>
                        {def?.isTime ? (
                          <span className="text-center text-xs text-2 col-span-2">{def.repRange}</span>
                        ) : (
                          <>
                            <input type="number" step="0.5" value={set.weightKg || ''}
                              onChange={e => updateSet(exIdx, setIdx, 'weightKg', Number(e.target.value))}
                              disabled={set.completed} placeholder={hasPrev ? String(lastSet.weightKg) : '0'}
                              className="px-2 py-1.5 rounded-lg text-sm text-1 text-center outline-none w-full glass"
                              style={{background:'rgba(255,255,255,0.04)'}}
                            />
                            <input type="number" value={set.reps || ''}
                              onChange={e => updateSet(exIdx, setIdx, 'reps', Number(e.target.value))}
                              disabled={set.completed} placeholder={hasPrev ? String(lastSet.reps) : '0'}
                              className="px-2 py-1.5 rounded-lg text-sm text-1 text-center outline-none w-full glass"
                              style={{background:'rgba(255,255,255,0.04)'}}
                            />
                          </>
                        )}
                        <button onClick={() => completeSet(exIdx, setIdx)} disabled={set.completed}
                          className="w-9 h-9 mx-auto rounded-full text-sm font-bold transition-all flex items-center justify-center"
                          style={{
                            background: set.completed ? prog.color + '25' : 'rgba(255,255,255,0.06)',
                            color: set.completed ? prog.color : '#94a3b8',
                          }}>
                          {set.completed ? <Check size={14} /> : '○'}
                        </button>
                      </div>
                      {hasPrev && (
                        <p className="text-center text-xs mt-0.5 col-span-4"
                          style={{color:'#334155', paddingLeft:'25%', paddingRight:'25%'}}>
                          prev: {lastSet.weightKg}kg × {lastSet.reps}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Video references */}
        {!prog.isRest && (
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-2 font-semibold uppercase tracking-widest mb-3">Reference Videos</p>
            <div className="space-y-2">
              {[
                { label: 'Full Body Fat Loss', url: 'https://youtu.be/hJh4ze7s3GQ' },
                { label: 'Muscle Building Bodyweight', url: 'https://youtu.be/B12MXF0bSFo' },
                { label: 'Core & Abs', url: 'https://youtu.be/W7seSnZ1k1A' },
                { label: 'HIIT Fat Burning', url: 'https://youtu.be/QyCFeB8mBz8' },
              ].map(v => (
                <a key={v.url} href={v.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl glass hover:bg-white/10 transition-all">
                  <span className="text-xs text-1">{v.label}</span>
                  <ExternalLink size={12} className="text-2" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Week selector */}
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-2 font-semibold uppercase tracking-widest mb-3">Programme Week</p>
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({length: 12}, (_, i) => i + 1).map(w => {
              const ph = getCurrentPhase(w)
              const phColor = PHASES[ph - 1].color
              return (
                <button key={w} onClick={() => {
                  setProgrammeWeek(w)
                  if (uid) localStorage.setItem(`sbh_week_${uid}`, String(w))
                }}
                  className="py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: programmeWeek === w ? phColor : phColor + '15',
                    color: programmeWeek === w ? '#fff' : phColor,
                  }}>
                  W{w}
                </button>
              )
            })}
          </div>
          <div className="flex gap-3 mt-2 text-xs text-3">
            {PHASES.map(p => (
              <span key={p.num} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{background: p.color}} />
                P{p.num}: Wk{p.weeks}
              </span>
            ))}
          </div>
        </div>

        {!prog.isRest && (
          <button onClick={finishWorkout} disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white disabled:opacity-50 transition-opacity"
            style={{background: prog.gradient, boxShadow:`0 0 32px -8px ${prog.color}60`}}>
            {saving ? 'Saving...' : '🏁 Finish Workout + Log'}
          </button>
        )}

        <div className="text-center text-xs text-3 pb-4 flex items-center justify-center gap-1">
          <ChevronRight size={10} />
          HealthOS Training System
        </div>
      </div>
    </main>
  )
}
