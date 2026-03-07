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
  // Legacy keys (kept for backwards compat with existing subscribers)
  pro_monthly:     { priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? '',     name: 'Fitness Pro',      price: 9.99,   interval: 'month' as const, tier: 'fitness_pro'     as const },
  pro_yearly:      { priceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? '',      name: 'Fitness Pro',      price: 79.00,  interval: 'year'  as const, tier: 'fitness_pro'     as const },
  premium_monthly: { priceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID ?? '', name: 'Health OS',        price: 24.99,  interval: 'month' as const, tier: 'health_os'       as const },
  premium_yearly:  { priceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID ?? '',  name: 'Health OS',        price: 199.00, interval: 'year'  as const, tier: 'health_os'       as const },
  // Condition-tiered plans
  fitness_pro_monthly:      { priceId: process.env.STRIPE_FITNESS_PRO_MONTHLY_PRICE_ID ?? '',      name: 'Fitness Pro',      price: 9.99,   interval: 'month' as const, tier: 'fitness_pro'      as const },
  fitness_pro_yearly:       { priceId: process.env.STRIPE_FITNESS_PRO_YEARLY_PRICE_ID ?? '',       name: 'Fitness Pro',      price: 79.00,  interval: 'year'  as const, tier: 'fitness_pro'      as const },
  diabetes_pro_monthly:     { priceId: process.env.STRIPE_DIABETES_PRO_MONTHLY_PRICE_ID ?? '',     name: 'Diabetes Pro',     price: 14.99,  interval: 'month' as const, tier: 'diabetes_pro'     as const },
  diabetes_pro_yearly:      { priceId: process.env.STRIPE_DIABETES_PRO_YEARLY_PRICE_ID ?? '',      name: 'Diabetes Pro',     price: 119.00, interval: 'year'  as const, tier: 'diabetes_pro'     as const },
  mental_wellness_monthly:  { priceId: process.env.STRIPE_MENTAL_WELLNESS_MONTHLY_PRICE_ID ?? '',  name: 'Mental Wellness',  price: 9.99,   interval: 'month' as const, tier: 'mental_wellness'  as const },
  mental_wellness_yearly:   { priceId: process.env.STRIPE_MENTAL_WELLNESS_YEARLY_PRICE_ID ?? '',   name: 'Mental Wellness',  price: 79.00,  interval: 'year'  as const, tier: 'mental_wellness'  as const },
  health_os_monthly:        { priceId: process.env.STRIPE_HEALTH_OS_MONTHLY_PRICE_ID ?? '',        name: 'Health OS',        price: 24.99,  interval: 'month' as const, tier: 'health_os'        as const },
  health_os_yearly:         { priceId: process.env.STRIPE_HEALTH_OS_YEARLY_PRICE_ID ?? '',         name: 'Health OS',        price: 199.00, interval: 'year'  as const, tier: 'health_os'        as const },
} as const

export type PlanKey = keyof typeof PLANS
export type SubscriptionTier = 'free' | 'fitness_pro' | 'diabetes_pro' | 'mental_wellness' | 'health_os'
