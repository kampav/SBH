'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { ALL_EXERCISES, EXERCISE_INFO, MUSCLE_GROUPS, PROGRAMMES } from '@/lib/workout/exerciseData'
import Link from 'next/link'
import { ArrowLeft, Search, X, ChevronDown, ChevronUp, ExternalLink, Dumbbell } from 'lucide-react'

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

export default function ExercisesPage() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState<string>('All')
  const [expandedName, setExpandedName] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setAuthReady(true)
      if (!user) router.push('/login')
    })
    return unsub
  }, [router])

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
          <h1 className="page-title" style={{fontSize:'1.25rem'}}>Exercise Library</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-3 pt-4">

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
        <p className="text-xs text-3 px-1">{filtered.length} exercise{filtered.length !== 1 ? 's' : ''}</p>

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
              const isOpen = expandedName === ex.name
              const muscleColor = MUSCLE_COLORS[ex.muscleGroup] ?? '#7c3aed'
              const appearsIn = Object.entries(PROGRAMMES)
                .filter(([, days]) => days.some(d => d.exercises.some(e => e.name === ex.name)))
                .map(([key]) => PROGRAMME_LABELS[key] ?? key)

              return (
                <div key={ex.name}
                  className="glass rounded-2xl overflow-hidden"
                  style={isOpen ? { border: '1px solid rgba(124,58,237,0.2)' } : {}}>

                  {/* Header row */}
                  <button
                    className="w-full flex items-center gap-3 p-4 text-start"
                    onClick={() => setExpandedName(isOpen ? null : ex.name)}>
                    <span className="text-xl flex-shrink-0">{ex.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-1 truncate">{ex.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                        {ex.sets} sets · {ex.repRange}{ex.isTime ? '' : ' reps'} · {ex.restSeconds}s rest
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: muscleColor + '18', color: muscleColor }}>
                      {ex.muscleGroup}
                    </span>
                    {isOpen
                      ? <ChevronUp size={14} style={{ color: 'var(--text-3)' }} className="flex-shrink-0" />
                      : <ChevronDown size={14} style={{ color: 'var(--text-3)' }} className="flex-shrink-0" />
                    }
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                      {info?.description && (
                        <p className="text-sm text-2 leading-relaxed pt-3">{info.description}</p>
                      )}

                      <div className="flex flex-wrap gap-1.5">
                        {appearsIn.map(label => (
                          <span key={label} className="text-xs px-2 py-0.5 rounded-full glass"
                            style={{ color: 'var(--text-2)' }}>
                            {label}
                          </span>
                        ))}
                      </div>

                      {info?.videoUrl && (
                        <a href={info.videoUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
                          style={{ background: 'rgba(124,58,237,0.15)', color: '#7c3aed' }}>
                          <ExternalLink size={12} />
                          Watch tutorial
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
