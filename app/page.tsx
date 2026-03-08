import Link from 'next/link'

const FEATURES = [
  { emoji: '🏋️', label: '6-Day Programme', sub: 'Push · HIIT · Pull · Mobility · Strength · Burn' },
  { emoji: '📅', label: '12-Week Phases', sub: 'Fat Loss → Muscle Growth → Definition' },
  { emoji: '⚡', label: 'Auto Overload', sub: '+2 reps when 90% complete' },
  { emoji: '📸', label: 'AI Food Scan', sub: 'Photo → instant macros' },
  { emoji: '📦', label: 'Barcode Scan', sub: 'Scan any product label' },
  { emoji: '📊', label: 'Body Charts', sub: 'Chest · Waist · Neck trends' },
]

export default function Home() {
  return (
    <main className="min-h-screen mesh-bg flex flex-col items-center justify-center p-5 overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-80 h-80 rounded-full opacity-20"
          style={{background:'radial-gradient(circle, #7c3aed, transparent)', filter:'blur(50px)'}} />
        <div className="absolute -bottom-20 -right-16 w-72 h-72 rounded-full opacity-15"
          style={{background:'radial-gradient(circle, #06b6d4, transparent)', filter:'blur(45px)'}} />
        <div className="absolute top-1/2 right-0 w-48 h-48 rounded-full opacity-10"
          style={{background:'radial-gradient(circle, #f43f5e, transparent)', filter:'blur(40px)'}} />
      </div>

      <div className="relative max-w-md w-full space-y-5">
        <div className="glass-strong rounded-3xl p-8 text-center space-y-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium mb-2"
              style={{color:'#a78bfa'}}>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 relative pulse-ring" />
              12-Week Home Transformation
            </div>
            <h1 className="text-6xl font-black tracking-tight gradient-text">HealthOS</h1>
            <p className="text-base font-semibold text-1">HealthOS</p>
            <p className="text-sm text-2 leading-relaxed">
              Evidence-backed training &amp; nutrition.<br />
              AI-powered. Science-driven. Results guaranteed.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Link href="/login"
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white transition-all glow-violet"
              style={{background:'linear-gradient(135deg, #7c3aed, #6d28d9)'}}>
              Sign In
            </Link>
            <Link href="/register"
              className="w-full py-3.5 px-6 glass rounded-2xl font-semibold text-sm text-1 hover:bg-violet-500/10 transition-all">
              Create Account
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {FEATURES.map(f => (
            <div key={f.label} className="glass rounded-2xl p-3 text-center card-hover">
              <div className="text-2xl mb-1.5">{f.emoji}</div>
              <p className="text-xs font-semibold text-1 leading-tight">{f.label}</p>
              <p className="text-xs text-3 mt-0.5 leading-tight">{f.sub}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-3">Next.js 14 · Firebase · GCP · Claude AI</p>
      </div>
    </main>
  )
}
