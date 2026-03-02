import Link from 'next/link'

const FEATURES = [
  { emoji: '🏋️', label: '6-Day Programme', sub: 'Push · HIIT · Pull · Mobility · Full Body · Burn' },
  { emoji: '📅', label: '12-Week Phases', sub: 'Fat Loss → Muscle Growth → Definition' },
  { emoji: '⚡', label: 'Progressive Overload', sub: 'Auto-adjusts reps/sets each week' },
  { emoji: '🔬', label: 'Science-Backed', sub: 'Mifflin-St Jeor · BWS methodology' },
  { emoji: '🎯', label: 'Macro Tracking', sub: 'Protein · Carbs · Fat · Calories' },
  { emoji: '🏆', label: 'Gamification', sub: 'XP levels · Streaks · Badges' },
]

export default function Home() {
  return (
    <main className="min-h-screen mesh-bg flex flex-col items-center justify-center p-5 overflow-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full opacity-20"
          style={{background:'radial-gradient(circle, #10b981 0%, transparent 70%)', filter:'blur(40px)'}} />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full opacity-15"
          style={{background:'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter:'blur(40px)'}} />
      </div>

      <div className="relative max-w-md w-full space-y-6">
        {/* Hero glass card */}
        <div className="glass-strong rounded-3xl p-8 text-center space-y-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-emerald-400 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 relative pulse-ring" />
              12-Week Home Transformation
            </div>
            <h1 className="text-6xl font-black tracking-tight gradient-text">SBH</h1>
            <p className="text-base font-semibold text-1">Science Based Health</p>
            <p className="text-sm text-2 leading-relaxed">
              Evidence-backed training &amp; nutrition.<br />
              Get ripped. Stay scientific.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Link href="/login"
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white transition-all glow-emerald"
              style={{background:'linear-gradient(135deg, #059669, #047857)'}}>
              Sign In
            </Link>
            <Link href="/register"
              className="w-full py-3.5 px-6 glass rounded-2xl font-semibold text-sm text-1 hover:bg-white/10 transition-all">
              Create Account
            </Link>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {FEATURES.map(f => (
            <div key={f.label} className="glass rounded-2xl p-3 text-center card-hover">
              <div className="text-2xl mb-1.5">{f.emoji}</div>
              <p className="text-xs font-semibold text-1 leading-tight">{f.label}</p>
              <p className="text-xs text-3 mt-0.5 leading-tight">{f.sub}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-3">
          Next.js 14 · Firebase · GCP Cloud Run
        </p>
      </div>
    </main>
  )
}
