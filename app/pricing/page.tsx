'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Check, Zap, Heart, Brain, Cpu, ArrowLeft, Star, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'

interface PlanDef {
  key: { monthly: string; yearly: string } | null
  name: string
  tagline: string
  price: { monthly: number; yearly: number }
  savingsNote?: string
  accentColor: string
  icon: LucideIcon | null
  badge?: string
  features: string[]
  cta: string
  disabled?: boolean
  highlight?: boolean
}

const PLANS: PlanDef[] = [
  {
    key: null,
    name: 'Free',
    tagline: 'Core health tracking',
    price: { monthly: 0, yearly: 0 },
    accentColor: 'var(--text-3)',
    icon: null,
    features: [
      'Calorie & macro tracking',
      '3 workout programmes',
      'Basic glucose logging',
      '7-day mood tracking',
      '1 weekly AI insight',
      'Weight & metrics charts',
    ],
    cta: 'Current plan',
    disabled: true,
  },
  {
    key: { monthly: 'fitness_pro_monthly', yearly: 'fitness_pro_yearly' },
    name: 'Fitness Pro',
    tagline: 'For athletes & gym-goers',
    price: { monthly: 9.99, yearly: 79.00 },
    savingsNote: 'Save £41/yr',
    accentColor: VIOLET,
    icon: Zap,
    features: [
      'Everything in Free',
      'Unlimited workout programmes',
      'Progressive overload engine',
      'Advanced nutrition analytics',
      'AI food photo recognition',
      'Body composition tracker',
      'Workout history & volume charts',
      'Weekly fitness AI insights',
      'Rest timer with audio cues',
    ],
    cta: 'Start Fitness Pro',
  },
  {
    key: { monthly: 'diabetes_pro_monthly', yearly: 'diabetes_pro_yearly' },
    name: 'Diabetes Pro',
    tagline: 'For T1D, T2D & pre-diabetes',
    price: { monthly: 14.99, yearly: 119.00 },
    savingsNote: 'Save £61/yr',
    accentColor: '#10b981',
    icon: Heart,
    highlight: true,
    badge: 'Most popular',
    features: [
      'Everything in Fitness Pro',
      'Dexcom & Libre CGM integration',
      'Real-time glucose trend arrows',
      'GI/GL meal scoring',
      'HbA1c estimator',
      'Time-in-range analytics',
      'Glucose prediction curves',
      'Care team PDF reports',
      'AI glucose nudges & alerts',
    ],
    cta: 'Start Diabetes Pro',
  },
  {
    key: { monthly: 'mental_wellness_monthly', yearly: 'mental_wellness_yearly' },
    name: 'Mental Wellness',
    tagline: 'For anxiety, stress & sleep',
    price: { monthly: 9.99, yearly: 79.00 },
    savingsNote: 'Save £41/yr',
    accentColor: '#a78bfa',
    icon: Brain,
    features: [
      'Everything in Free',
      'CBT-based mood journal',
      'PHQ-9 depression trend tracking',
      'Sleep quality analytics',
      'Stress & cortisol pattern insights',
      'AI daily check-in coach',
      'Mindfulness exercise library',
      'Weekly mental wellness report',
    ],
    cta: 'Start Mental Wellness',
  },
  {
    key: { monthly: 'health_os_monthly', yearly: 'health_os_yearly' },
    name: 'Health OS',
    tagline: 'All conditions, all wearables',
    price: { monthly: 24.99, yearly: 199.00 },
    savingsNote: 'Save £101/yr',
    accentColor: CYAN,
    icon: Cpu,
    features: [
      'Everything in all plans',
      'All CGM & wearable integrations',
      'Apple Health & Google Health Connect',
      'Unlimited AI coaching sessions',
      'Personalised meal plans',
      'Condition intelligence feed',
      'Multi-condition risk dashboard',
      'Priority support & early access',
      'Coaching marketplace access',
    ],
    cta: 'Start Health OS',
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
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-20 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="w-9 h-9 glass rounded-xl flex items-center justify-center">
            <ArrowLeft size={16} style={{ color: VIOLET }} />
          </Link>
          <div>
            <h1 className="font-bold text-xl text-1">Choose your plan</h1>
            <p className="text-xs text-3">Science-backed health, tailored to your condition</p>
          </div>
        </div>

        {/* Billing toggle */}
        <div className="glass rounded-2xl p-1 flex gap-1 max-w-sm mx-auto">
          {(['monthly', 'yearly'] as const).map(b => (
            <button key={b} onClick={() => setBilling(b)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={billing === b
                ? { background: `linear-gradient(135deg,${VIOLET},${CYAN})`, color: '#fff' }
                : { color: 'var(--text-2)' }}>
              {b === 'monthly' ? 'Monthly' : 'Yearly — save up to 33%'}
            </button>
          ))}
        </div>

        {/* Plan grid — 5 cards: 1 free + 4 paid */}
        {/* Row 1: Free + Fitness Pro + Diabetes Pro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.slice(0, 3).map(plan => (
            <PlanCard key={plan.name} plan={plan} billing={billing} loading={loading} onCheckout={checkout} />
          ))}
        </div>

        {/* Row 2: Mental Wellness + Health OS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:max-w-2xl md:mx-auto">
          {PLANS.slice(3).map(plan => (
            <PlanCard key={plan.name} plan={plan} billing={billing} loading={loading} onCheckout={checkout} />
          ))}
        </div>

        {/* Coaching upsell banner */}
        <div className="glass rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          style={{ border: `1px solid rgba(251,191,36,0.25)`, background: 'rgba(251,191,36,0.04)' }}>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(251,191,36,0.12)' }}>
              <Star size={18} style={{ color: '#fbbf24' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-1">1-on-1 Coaching Add-On</p>
              <p className="text-xs text-2 mt-0.5">
                Work with a certified diabetes educator, sports dietitian, or mental health coach.
                Available from <strong className="text-1">£49.99/month</strong> — cancel anytime.
              </p>
            </div>
          </div>
          <Link href="/coaching"
            className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
            <Star size={11} /> Browse Coaches
          </Link>
        </div>

        <p className="text-xs text-3 text-center">
          Secure checkout via Stripe · Cancel anytime · No hidden fees
        </p>

      </div>
    </div>
  )
}

function PlanCard({
  plan, billing, loading, onCheckout,
}: {
  plan: PlanDef
  billing: 'monthly' | 'yearly'
  loading: string | null
  onCheckout: (key: string) => void
}) {
  const PlanIcon = plan.icon
  const price = plan.price[billing]
  const planKey = plan.key ? plan.key[billing] : null
  const isLoading = loading === planKey

  return (
    <div className="glass rounded-2xl p-5 space-y-4 relative"
      style={plan.highlight
        ? { border: `1.5px solid ${plan.accentColor}`, boxShadow: `0 0 20px ${plan.accentColor}22` }
        : {}}>

      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="text-xs font-bold px-3 py-1 rounded-full text-white"
            style={{ background: `linear-gradient(135deg,${plan.accentColor},${plan.accentColor}cc)` }}>
            {plan.badge}
          </span>
        </div>
      )}

      {/* Plan name + icon */}
      <div className="flex items-center gap-2">
        {PlanIcon && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${plan.accentColor}18` }}>
            <PlanIcon size={14} style={{ color: plan.accentColor }} />
          </div>
        )}
        <div>
          <p className="font-bold text-sm text-1">{plan.name}</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>{plan.tagline}</p>
        </div>
      </div>

      {/* Price */}
      <div>
        <div className="flex items-end gap-1">
          <span className="text-3xl font-black" style={{ color: plan.accentColor }}>
            {price === 0 ? 'Free' : `£${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`}
          </span>
          {price > 0 && (
            <span className="text-xs text-3 pb-1">/ {billing === 'monthly' ? 'mo' : 'yr'}</span>
          )}
        </div>
        {billing === 'yearly' && plan.savingsNote && (
          <p className="text-xs mt-0.5" style={{ color: '#10b981' }}>{plan.savingsNote}</p>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-2">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-xs text-2">
            <Check size={12} className="mt-0.5 shrink-0" style={{ color: plan.accentColor }} />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        disabled={plan.disabled || isLoading}
        onClick={() => planKey && onCheckout(planKey)}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
        style={plan.disabled
          ? { background: 'rgba(148,163,184,0.1)', color: 'var(--text-3)' }
          : { background: `linear-gradient(135deg,${plan.accentColor},${plan.accentColor}cc)`, color: '#fff' }}>
        {isLoading ? 'Redirecting…' : plan.cta}
      </button>
    </div>
  )
}
