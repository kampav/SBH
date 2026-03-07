'use client'

import { useEffect, useState } from 'react'

interface Props {
  seconds: number
  exerciseName: string
  onDismiss: () => void
}

function playBeep() {
  if (typeof window === 'undefined') return
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  } catch { /* AudioContext not available */ }
}

export default function RestTimerOverlay({ seconds, exerciseName, onDismiss }: Props) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (remaining <= 0) {
      playBeep()
      onDismiss()
      return
    }
    const id = setInterval(() => setRemaining(r => r - 1), 1000)
    return () => clearInterval(id)
  }, [remaining, onDismiss])

  const r = 52
  const circ = 2 * Math.PI * r
  const dash = (remaining / seconds) * circ

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(6,10,18,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-strong rounded-3xl p-8 flex flex-col items-center gap-4 w-64"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>

        {exerciseName && (
          <p className="text-xs text-2 text-center truncate max-w-full">{exerciseName}</p>
        )}

        {/* Countdown ring */}
        <div className="relative w-32 h-32">
          <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
            <circle cx="64" cy="64" r={r} fill="none"
              stroke="rgba(6,182,212,0.1)" strokeWidth="10" />
            <circle cx="64" cy="64" r={r} fill="none"
              stroke="#06b6d4" strokeWidth="10"
              strokeDasharray={`${Math.max(dash, 0)} ${circ}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.9s linear' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-1">{remaining}</span>
            <span className="text-xs text-3">sec</span>
          </div>
        </div>

        <p className="text-xs text-2">Rest · breathe deeply</p>

        <div className="flex gap-2 w-full">
          <button onClick={() => setRemaining(r => r + 15)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold glass"
            style={{ color: 'var(--text-2)' }}>
            +15s
          </button>
          <button onClick={onDismiss}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
            Skip →
          </button>
        </div>
      </div>
    </div>
  )
}
