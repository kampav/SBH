import { NextRequest, NextResponse } from 'next/server'
import { getStripe, PLANS, PlanKey } from '@/lib/stripe'
import { getAdminDb } from '@/lib/firebase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { planKey, uid, email } = await req.json()
  if (!planKey || !uid || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const plan = PLANS[planKey as PlanKey]
  if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  let customerId: string | undefined
  try {
    const subDoc = await getAdminDb().collection('users').doc(uid).collection('subscription').doc('data').get()
    customerId = subDoc.data()?.stripeCustomerId
  } catch { /* new user or missing admin creds */ }

  if (!customerId) {
    const customer = await getStripe().customers.create({ email, metadata: { uid } })
    customerId = customer.id
  }

  const origin = req.headers.get('origin') ?? 'https://sbh-app-m3nvdpbv4q-nw.a.run.app'
  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/pricing`,
    metadata: { uid },
    subscription_data: { metadata: { uid } },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
