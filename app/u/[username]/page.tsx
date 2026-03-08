export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getPublicProfileByUsername, getPublicStats } from '@/lib/firebase/admin'
import Link from 'next/link'

const GOAL_LABELS: Record<string, string> = {
  fat_loss: '🔥 Fat Loss', muscle_gain: '💪 Muscle Gain',
  recomp: '⚖️ Recomposition', endurance: '🏃 Endurance',
}
const LEVEL_LABELS: Record<string, string> = {
  beginner: '🌱 Beginner', intermediate: '⚡ Intermediate', advanced: '🔥 Advanced',
}

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const data = await getPublicProfileByUsername(params.username)
  if (!data) notFound()

  const stats = await getPublicStats(data.uid)
  const initials = data.displayName
    .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #060A12 0%, #111B2E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.045)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '24px',
          padding: '32px',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {/* Avatar */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            {data.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.photoUrl} alt={data.displayName}
                style={{ width: '80px', height: '80px', borderRadius: '20px', objectFit: 'cover', margin: '0 auto 12px' }} />
            ) : (
              <div style={{
                width: '80px', height: '80px', borderRadius: '20px', margin: '0 auto 12px',
                background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px', fontWeight: 800, color: '#fff',
              }}>
                {initials}
              </div>
            )}
            <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>{data.displayName}</h1>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {data.goal && (
                <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
                  {GOAL_LABELS[data.goal] ?? data.goal}
                </span>
              )}
              {data.experienceLevel && (
                <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(6,182,212,0.12)', color: '#67e8f9' }}>
                  {LEVEL_LABELS[data.experienceLevel] ?? data.experienceLevel}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
            {[
              { label: 'Streak', value: `${stats.streak}🔥`, color: '#f59e0b' },
              { label: 'Workouts (30d)', value: `${stats.workoutCount}💪`, color: '#7c3aed' },
              { label: 'Member since', value: data.createdYear ? `${data.createdYear}` : '—', color: '#06b6d4' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
                padding: '12px 8px', textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <p style={{ fontSize: '18px', fontWeight: 700, color: s.color, marginBottom: '3px' }}>{s.value}</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link href="/register" style={{
            display: 'block', textAlign: 'center', padding: '14px',
            borderRadius: '14px', fontWeight: 700, fontSize: '15px', color: '#fff',
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            textDecoration: 'none',
          }}>
            Join HealthOS — It&apos;s Free →
          </Link>
          <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            sciencebased.health
          </p>
        </div>

      </div>
    </main>
  )
}
