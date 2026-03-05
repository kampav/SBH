import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getAdminDb } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { uid } = await req.json()
  if (!uid) return NextResponse.json({ error: 'Missing uid' }, { status: 400 })

  const subDoc = await getAdminDb().collection('users').doc(uid).collection('subscription').doc('data').get()
  const customerId = subDoc.data()?.stripeCustomerId
  if (!customerId) return NextResponse.json({ error: 'No billing account found' }, { status: 404 })

  const origin = req.headers.get('origin') ?? 'https://sbh-app-m3nvdpbv4q-nw.a.run.app'
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/profile`,
  })

  return NextResponse.json({ url: session.url })
}
