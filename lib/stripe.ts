import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' })
  }
  return _stripe
}

// Keep named export for routes that use it directly
export { getStripe as stripe }

export const PLANS = {
  pro_monthly:     { priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? '',     name: 'Pro',     price: 9.99,   interval: 'month' as const },
  pro_yearly:      { priceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? '',      name: 'Pro',     price: 59.99,  interval: 'year'  as const },
  premium_monthly: { priceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID ?? '', name: 'Premium', price: 19.99,  interval: 'month' as const },
  premium_yearly:  { priceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID ?? '',  name: 'Premium', price: 99.99,  interval: 'year'  as const },
} as const

export type PlanKey = keyof typeof PLANS
export type SubscriptionTier = 'free' | 'pro' | 'premium'
