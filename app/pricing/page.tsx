'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useEffect } from 'react'
import { Check, Zap, Crown, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const VIOLET = '#7c3aed'
const CYAN = '#06b6d4'

const PLANS = [
  {
    key: null,
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    icon: null,
    features: [
      'Workout logging (3 programmes)',
      'Basic nutrition tracking',
      'Weight & metrics charts',
      'Blood glucose logging',
      '3 custom workouts',
    ],
    cta: 'Current plan',
    disabled: true,
  },
  {
    key: { monthly: 'pro_monthly', yearly: 'pro_yearly' },
    name: 'Pro',
    price: { monthly: 9.99, yearly: 59.99 },
    icon: Zap,
    popular: true,
    features: [
      'Everything in Free',
      'Ad-free experience',
      'Advanced analytics & trends',
      'Unlimited custom workouts',
      'AI food photo scan',
      'Glucose trend insights',
      'Priority support',
    ],
    cta: 'Start Pro',
    savingsNote: 'Save £20/yr',
  },
  {
    key: { monthly: 'premium_monthly', yearly: 'premium_yearly' },
    name: 'Premium',
    price: { monthly: 19.99, yearly: 99.99 },
    icon: Crown,
    features: [
      'Everything in Pro',
      'AI weekly coaching report',
      'AI meal planning',
      'Glucose prediction curves',
      'Care team PDF reports',
      'Early access to new features',
    ],
    cta: 'Start Premium',
    savingsNote: 'Save £140/yr',
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const [user, setUser] = useState<{ uid: string; email: string } | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      if (u) setUser({ uid: u.uid, email: u.email ?? '' })
    })
    return unsub
  }, [])

  async function checkout(planKey: string) {
    if (!user) { router.push('/login?next=/pricing'); return }
    setLoading(planKey)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey, uid: user.uid, email: user.email }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch {
      alert('Could not start checkout. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen mesh-bg page-pad">
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-16 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="w-9 h-9 glass rounded-xl flex items-center justify-center">
            <ArrowLeft size={16} style={{ color: VIOLET }} />
          </Link>
          <div>
            <h1 className="font-bold text-xl text-1">Upgrade SBH</h1>
            <p className="text-xs text-3">Science-backed fitness, unlocked</p>
          </div>
        </div>

        {/* Billing toggle */}
        <div className="glass rounded-2xl p-1 flex gap-1 max-w-xs mx-auto">
          {(['monthly', 'yearly'] as const).map(b => (
            <button key={b} onClick={() => setBilling(b)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={billing === b
                ? { background: `linear-gradient(135deg,${VIOLET},${CYAN})`, color: '#fff' }
                : { color: 'var(--text-2)' }}>
              {b === 'monthly' ? 'Monthly' : 'Yearly (save up to 58%)'}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map(plan => {
            const PlanIcon = plan.icon
            const price = plan.price[billing]
            const planKey = plan.key ? plan.key[billing] : null
            const isLoading = loading === planKey

            return (
              <div key={plan.name}
                className="glass rounded-2xl p-5 space-y-4 relative"
                style={plan.popular ? { border: `1px solid rgba(124,58,237,0.5)` } : {}}>

                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full text-white"
                      style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})` }}>
                      Most popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {PlanIcon && <PlanIcon size={16} style={{ color: VIOLET }} />}
                  <p className="font-bold text-1">{plan.name}</p>
                </div>

                <div>
                  <span className="text-3xl font-black gradient-text">
                    {price === 0 ? 'Free' : `£${price}`}
                  </span>
                  {price > 0 && (
                    <span className="text-xs text-3 ml-1">/ {billing === 'monthly' ? 'mo' : 'yr'}</span>
                  )}
                  {billing === 'yearly' && plan.savingsNote && (
                    <p className="text-xs mt-1" style={{ color: '#10b981' }}>{plan.savingsNote}</p>
                  )}
                </div>

                <ul className="space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-2">
                      <Check size={12} className="mt-0.5 shrink-0" style={{ color: '#10b981' }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={plan.disabled || isLoading}
                  onClick={() => planKey && checkout(planKey)}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={plan.disabled
                    ? { background: 'rgba(148,163,184,0.1)', color: 'var(--text-3)' }
                    : { background: `linear-gradient(135deg,${VIOLET},${CYAN})`, color: '#fff' }}>
                  {isLoading ? 'Redirecting…' : plan.cta}
                </button>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-3 text-center">
          Secure checkout via Stripe · Cancel anytime · No hidden fees
        </p>

      </div>
    </div>
  )
}
