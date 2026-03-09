'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, ExternalLink, CheckCircle, AlertTriangle, Trophy } from 'lucide-react'
import { ExerciseInfo } from '@/lib/workout/exerciseData'
import { getPersonalBest, PersonalBest } from '@/lib/firebase/firestore'

interface Props {
  name: string
  emoji: string
  muscleGroup: string
  muscleColor: string
  sets: number
  repRange: string
  restSeconds: number
  isTime?: boolean
  info: ExerciseInfo | undefined
  uid: string
  appearsIn: string[]
  onClose: () => void
}

export default function ExerciseDetailSheet({
  name, emoji, muscleGroup, muscleColor,
  sets, repRange, restSeconds, isTime,
  info, uid, appearsIn, onClose,
}: Props) {
  const [pb, setPb] = useState<PersonalBest | null | 'loading'>('loading')

  const fetchPB = useCallback(async () => {
    try {
      const result = await getPersonalBest(uid, name)
      setPb(result)
    } catch {
      setPb(null)
    }
  }, [uid, name])

  useEffect(() => {
    fetchPB()
  }, [fetchPB])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(6,10,18,0.85)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl overflow-hidden mx-auto"
        style={{
          background: '#0C1320',
          border: '1px solid rgba(255,255,255,0.08)',
          maxHeight: '90dvh',
          maxWidth: '680px',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90dvh - 20px)' }}>
          {/* Header */}
          <div className="px-5 pt-3 pb-4 flex items-start gap-4">
            <span className="text-4xl flex-shrink-0 mt-1">{emoji}</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white leading-tight">{name}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: muscleColor + '20', color: muscleColor }}
                >
                  {muscleGroup}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {sets} sets · {repRange}{isTime ? '' : ' reps'} · {restSeconds}s rest
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {appearsIn.map(label => (
                  <span
                    key={label}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)' }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <X size={16} style={{ color: 'var(--text-3)' }} />
            </button>
          </div>

          <div className="px-5 pb-8 space-y-5">

            {/* Personal Best */}
            {pb === 'loading' ? (
              <div
                className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: 'rgba(200,255,71,0.06)', border: '1px solid rgba(200,255,71,0.12)' }}
              >
                <Trophy size={18} style={{ color: '#C8FF47' }} />
                <span className="text-sm" style={{ color: 'var(--text-2)' }}>Loading personal best…</span>
              </div>
            ) : pb ? (
              <div
                className="rounded-2xl p-4"
                style={{ background: 'rgba(200,255,71,0.06)', border: '1px solid rgba(200,255,71,0.12)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={16} style={{ color: '#C8FF47' }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#C8FF47' }}>
                    Personal Best
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {pb.weightKg}kg × {pb.reps} reps
                  <span className="text-sm font-normal ml-2" style={{ color: 'var(--text-3)' }}>
                    ({pb.volume}kg vol)
                  </span>
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                  Logged {new Date(pb.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ) : null}

            {/* Description */}
            {info?.description && (
              <div
                className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {info.description}
                </p>
              </div>
            )}

            {/* Form Cues */}
            {info?.cues && info.cues.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
                  Form Cues
                </h3>
                <div className="space-y-2">
                  {info.cues.map((cue, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#00D4FF' }} />
                      <p className="text-sm leading-snug" style={{ color: 'var(--text-1)' }}>{cue}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Common Mistakes */}
            {info?.mistakes && info.mistakes.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
                  Common Mistakes
                </h3>
                <div className="space-y-2">
                  {info.mistakes.map((mistake, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#FF6B35' }} />
                      <p className="text-sm leading-snug" style={{ color: 'var(--text-2)' }}>{mistake}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* YouTube link */}
            {info?.videoUrl && (
              <a
                href={info.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'rgba(124,58,237,0.15)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)' }}
              >
                <ExternalLink size={15} />
                Watch tutorial on YouTube
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
