'use client'
import { forwardRef } from 'react'

interface WorkoutShareCardProps {
  programmeName: string
  date: string
  duration: number   // minutes
  volume: number     // kg total
  calories: number
  xp: number
}

const WorkoutShareCard = forwardRef<HTMLDivElement, WorkoutShareCardProps>(
  ({ programmeName, date, duration, volume, calories, xp }, ref) => {
    const formattedDate = new Date(date).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    return (
      <div
        ref={ref}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '400px',
          background: 'linear-gradient(135deg, #060A12 0%, #111B2E 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(124,58,237,0.4)',
          padding: '32px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#ffffff',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{
            width: '40px', height: '40px',
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: 700, color: '#fff',
          }}>S</div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>SBH</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Science Based Health</div>
          </div>
        </div>

        {/* Programme + Date */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>{programmeName}</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>{formattedDate}</div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Duration', value: `${duration}m`, colour: '#7c3aed' },
            { label: 'Volume', value: `${volume.toFixed(0)} kg`, colour: '#06b6d4' },
            { label: 'Calories', value: `${calories} kcal`, colour: '#f43f5e' },
            { label: 'XP earned', value: `+${xp} XP`, colour: '#C8FF47' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '10px',
              padding: '14px 16px',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: stat.colour }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
          sciencebased.health
        </div>
      </div>
    )
  }
)
WorkoutShareCard.displayName = 'WorkoutShareCard'
export default WorkoutShareCard
