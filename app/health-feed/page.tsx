'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import {
  getProfile, getNutrition, getRecentWorkouts, getMetrics,
  getSleepHistory, getMoodHistory, getBloodPressureHistory,
  getDailyGlucose, getGlucoseSettings,
} from '@/lib/firebase/firestore'
import { UserProfile, GlucoseSettings } from '@/lib/types'
import { computeHealthFeed, scoreLabel, HealthCard } from '@/lib/health/health-feed'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ChevronRight, Sparkles } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'

const today = new Date().toISOString().slice(0, 10)

function TrendIcon({ trend }: { trend?: HealthCard['trend'] }) {
  if (trend === 'improving') return <TrendingUp size={11} style={{ color: '#10b981' }} />
  if (trend === 'declining') return <TrendingDown size={11} style={{ color: '#ef4444' }} />
  if (trend === 'stable') return <Minus size={11} style={{ color: 'var(--text-3)' }} />
  return null
}

export default function HealthFeedPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [cards, setCards] = useState<HealthCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setAuthReady(true)
      if (!u) { router.push('/login'); return }
      setUid(u.uid)
    })
    return unsub
  }, [router])

  useEffect(() => {
    if (!uid) return
    ;(async () => {
      const [
        p, todayNutrition, recentWorkouts, recentMetrics,
        recentSleep, recentMood, recentBP, recentGlucose, gs,
      ] = await Promise.all([
        getProfile(uid),
        getNutrition(uid, today),
        getRecentWorkouts(uid, 30),
        getMetrics(uid, 30),
        getSleepHistory(uid, 7),
        getMoodHistory(uid, 7),
        getBloodPressureHistory(uid, 30),
        getDailyGlucose(uid, today),
        getGlucoseSettings(uid),
      ])

      if (!p) { setLoading(false); return }
      setProfile(p)

      const glucoseSettings: GlucoseSettings | null = gs?.consentGiven ? gs : null

      const { score: s, cards: c } = computeHealthFeed({
        profile: p,
        todayNutrition: todayNutrition ?? null,
        recentWorkouts,
        recentMetrics,
        recentSleep,
        recentMood,
        recentBP,
        recentGlucose: recentGlucose ?? null,
        glucoseSettings,
        today,
      })
      setScore(s)
      setCards(c)
      setLoading(false)
    })()
  }, [uid])

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const sl = score !== null ? scoreLabel(score) : null

  return (
    <main className="min-h-screen mesh-bg page-pad pb-28">
      <header className="page-header-bar px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl glass-elevated">
            <ArrowLeft size={16} style={{ color: 'var(--text-3)' }} />
          </Link>
          <div>
            <p className="section-label">Personalised</p>
            <h1 className="page-title" style={{ fontSize: '1.25rem' }}>Health Feed</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} style={{ color: '#a78bfa' }} />
          <span className="text-xs font-semibold" style={{ color: '#a78bfa' }}>Daily</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4 pt-3">

        {/* ── Daily Health Score hero ── */}
        {loading ? (
          <div className="glass rounded-2xl p-6 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : score !== null && sl ? (
          <div className="glass-elevated rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-3)' }}>
              Today&apos;s Health Score
            </p>
            <div className="flex items-center gap-6">
              <ProgressRing
                value={score}
                size={110}
                stroke={10}
                color={sl.color}
                label={`${score}`}
                sublabel="/ 100"
              />
              <div className="flex-1">
                <p className="text-2xl font-black text-1 leading-tight">{sl.label}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
                  Based on {cards.length} health dimensions tracked today
                </p>
                {profile?.conditionProfile?.conditions?.length ? (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {profile.conditionProfile.conditions.map(c => (
                      <span key={c} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(6,182,212,0.12)', color: '#22d3ee' }}>
                        {c.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Nutrition', val: todayNutritionPct(score) },
                { label: 'Activity', val: score >= 60 ? 'Active' : 'Log it' },
                { label: 'Recovery', val: score >= 70 ? 'Good' : 'Needs work' },
              ].map(({ label, val }) => (
                <div key={label} className="rounded-xl py-2 px-1" style={{ background: 'var(--glass-bg)' }}>
                  <p className="text-xs text-3">{label}</p>
                  <p className="text-xs font-semibold text-1 mt-0.5">{val}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── Card feed ── */}
        {!loading && cards.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--text-3)' }}>
              Your Health Cards
            </p>
            {cards.map(card => (
              <div key={card.id} className="glass rounded-2xl overflow-hidden">
                <div className="flex">
                  {/* Color accent bar */}
                  <div className="w-1 flex-shrink-0 rounded-l-2xl" style={{ background: card.color }} />
                  <div className="flex-1 p-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg leading-none flex-shrink-0">{card.emoji}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-1 leading-tight">{card.title}</p>
                            {card.value && (
                              <span className="text-xs font-bold flex-shrink-0 px-1.5 py-0.5 rounded-lg"
                                style={{ background: card.color + '20', color: card.color }}>
                                {card.value}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <TrendIcon trend={card.trend} />
                            <p className="text-xs" style={{ color: 'var(--text-3)' }}>{card.subtitle}</p>
                          </div>
                        </div>
                      </div>
                      {card.cta && (
                        <Link href={card.cta.href}
                          className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl"
                          style={{ background: card.color + '18', color: card.color }}>
                          {card.cta.label}
                          <ChevronRight size={11} />
                        </Link>
                      )}
                    </div>

                    {/* Insight text */}
                    <p className="text-xs leading-relaxed mt-2.5" style={{ color: 'var(--text-2)' }}>
                      {card.insight}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && cards.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center">
            <Sparkles size={28} className="mx-auto mb-3" style={{ color: '#a78bfa' }} />
            <p className="text-sm text-2">Complete your profile to get personalised cards</p>
          </div>
        )}

        {/* Footer note */}
        <p className="text-xs text-center pb-2" style={{ color: 'var(--text-3)' }}>
          Cards update daily based on your logged data. Not medical advice.
        </p>
      </div>
    </main>
  )
}

// Helper to show a meaningful nutrition summary
function todayNutritionPct(score: number): string {
  if (score >= 80) return 'On target'
  if (score >= 50) return 'Getting there'
  return 'Log meals'
}
