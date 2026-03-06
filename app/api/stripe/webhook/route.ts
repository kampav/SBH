import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getAdminDb } from '@/lib/firebase/admin'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function tierFromPriceId(priceId: string): 'pro' | 'premium' {
  const pro = [process.env.STRIPE_PRO_MONTHLY_PRICE_ID, process.env.STRIPE_PRO_YEARLY_PRICE_ID]
  return pro.includes(priceId) ? 'pro' : 'premium'
}

async function saveSubscription(sub: Stripe.Subscription, uid: string) {
  const priceId = sub.items.data[0]?.price.id ?? ''
  await getAdminDb().collection('users').doc(uid).collection('subscription').doc('data').set({
    tier: tierFromPriceId(priceId),
    stripeCustomerId: sub.customer as string,
    stripeSubscriptionId: sub.id,
    stripePriceId: priceId,
    status: sub.status,
    currentPeriodEnd: sub.items.data[0]?.current_period_end ?? null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  }, { merge: true })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  const sub = event.data.object as Stripe.Subscription
  const uid = sub.metadata?.uid

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      if (uid) await saveSubscription(sub, uid)
      break
    case 'customer.subscription.deleted':
      if (uid) {
        await getAdminDb().collection('users').doc(uid).collection('subscription').doc('data').set(
          { tier: 'free', status: 'canceled', stripeSubscriptionId: sub.id },
          { merge: true }
        )
      }
      break
  }

  return NextResponse.json({ received: true })
}
