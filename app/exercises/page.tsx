'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { ALL_EXERCISES, EXERCISE_INFO, MUSCLE_GROUPS, PROGRAMMES, ExerciseDef } from '@/lib/workout/exerciseData'
import ExerciseDetailSheet from '@/components/workout/ExerciseDetailSheet'
import Link from 'next/link'
import { ArrowLeft, Search, X, Dumbbell } from 'lucide-react'

const PROGRAMME_LABELS: Record<string, string> = {
  home_6day: '🏠 Home',
  gym_upper_lower: '🏋️ Gym',
  beginner_3day: '🌱 Beginner',
}

const MUSCLE_COLORS: Record<string, string> = {
  Chest: '#7c3aed', 'Upper Chest': '#6d28d9', Shoulders: '#06b6d4',
  Triceps: '#0891b2', Back: '#10b981', Lats: '#059669', Biceps: '#f59e0b',
  Core: '#ec4899', Obliques: '#db2777', 'Lower Abs': '#be185d',
  Quads: '#ef4444', Hamstrings: '#dc2626', Glutes: '#b91c1c',
  Calves: '#f97316', Hips: '#ea580c', 'Lower Back': '#84cc16',
  'Rear Delts': '#65a30d', 'Full Body': '#a855f7', Cardio: '#06b6d4',
  'Back/Glutes': '#10b981',
}

function getAppearsIn(exerciseName: string): string[] {
  return Object.entries(PROGRAMMES)
    .filter(([, days]) => days.some(d => d.exercises.some(e => e.name === exerciseName)))
    .map(([key]) => PROGRAMME_LABELS[key] ?? key)
}

export default function ExercisesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState<string>('All')
  const [selected, setSelected] = useState<ExerciseDef | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setAuthReady(true)
      setUser(u)
      if (!u) router.push('/login')
    })
    return unsub
  }, [router])

  const closeSheet = useCallback(() => setSelected(null), [])

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const filtered = ALL_EXERCISES
    .filter(e => selectedMuscle === 'All' || e.muscleGroup === selectedMuscle)
    .filter(e => !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <main className="min-h-screen mesh-bg page-pad pb-28">
      <header className="page-header-bar px-4 flex items-center gap-3 h-14">
        <Link href="/workout" className="p-2 rounded-xl glass-elevated">
          <ArrowLeft size={16} className="text-slate-400" />
        </Link>
        <div>
          <p className="section-label">{ALL_EXERCISES.length} exercises · 3 programmes</p>
          <h1 className="page-title" style={{ fontSize: '1.25rem' }}>Exercise Library</h1>
        </div>
      </header>

      <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 lg:px-8 space-y-3 pt-4">

        {/* Search */}
        <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
          <Search size={16} style={{ color: 'var(--text-3)' }} className="flex-shrink-0" />
          <input
            type="text"
            placeholder="Search exercises…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-1 placeholder:text-3 outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X size={14} style={{ color: 'var(--text-3)' }} />
            </button>
          )}
        </div>

        {/* Muscle group chips */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {['All', ...MUSCLE_GROUPS].map(mg => (
            <button key={mg} onClick={() => setSelectedMuscle(mg)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: selectedMuscle === mg ? '#7c3aed' : 'rgba(255,255,255,0.06)',
                color: selectedMuscle === mg ? '#fff' : 'var(--text-2)',
              }}>
              {mg}
            </button>
          ))}
        </div>

        {/* Count */}
        <p className="text-xs text-3 px-1">{filtered.length} exercise{filtered.length !== 1 ? 's' : ''} · tap to see cues</p>

        {/* Exercise list */}
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <Dumbbell size={28} className="mx-auto mb-3 text-slate-600" />
            <p className="text-sm text-2">No exercises match</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(ex => {
              const info = EXERCISE_INFO[ex.name]
              const muscleColor = MUSCLE_COLORS[ex.muscleGroup] ?? '#7c3aed'
              const hasCues = !!(info?.cues?.length || info?.mistakes?.length)

              return (
                <button
                  key={ex.name}
                  className="glass rounded-2xl w-full text-start transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{ border: hasCues ? '1px solid rgba(255,255,255,0.05)' : undefined }}
                  onClick={() => setSelected(ex)}
                >
                  <div className="flex items-center gap-3 p-4">
                    <span className="text-xl flex-shrink-0">{ex.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-1 truncate">{ex.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                        {ex.sets} sets · {ex.repRange}{ex.isTime ? '' : ' reps'} · {ex.restSeconds}s rest
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: muscleColor + '18', color: muscleColor }}>
                        {ex.muscleGroup}
                      </span>
                      {hasCues && (
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                          Cues →
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      {selected && user && (
        <ExerciseDetailSheet
          name={selected.name}
          emoji={selected.emoji}
          muscleGroup={selected.muscleGroup}
          muscleColor={MUSCLE_COLORS[selected.muscleGroup] ?? '#7c3aed'}
          sets={selected.sets}
          repRange={selected.repRange}
          restSeconds={selected.restSeconds}
          isTime={selected.isTime}
          info={EXERCISE_INFO[selected.name]}
          uid={user.uid}
          appearsIn={getAppearsIn(selected.name)}
          onClose={closeSheet}
        />
      )}
    </main>
  )
}
