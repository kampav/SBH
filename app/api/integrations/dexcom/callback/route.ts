// app/api/integrations/dexcom/callback/route.ts
// Handles Dexcom OAuth callback — exchanges auth code for tokens,
// stores them in Firestore, then redirects back to /settings/integrations.

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { exchangeCodeForTokens } from '@/lib/integrations/dexcom'
import { FieldValue } from 'firebase-admin/firestore'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const uid   = searchParams.get('state')   // state = uid set in auth route
  const error = searchParams.get('error')

  const redirectBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sbhealth.app'

  if (error) {
    return NextResponse.redirect(
      `${redirectBase}/settings/integrations?error=${encodeURIComponent(error)}`
    )
  }

  if (!code || !uid) {
    return NextResponse.redirect(
      `${redirectBase}/settings/integrations?error=missing_params`
    )
  }

  try {
    const creds = await exchangeCodeForTokens(code)

    // Store in Firestore via Admin SDK (no auth check — uid comes from OAuth state)
    const db = getAdminDb()
    await db
      .collection('users')
      .doc(uid)
      .collection('integrations')
      .doc('dexcom')
      .set({ ...creds, updatedAt: FieldValue.serverTimestamp() })

    return NextResponse.redirect(
      `${redirectBase}/settings/integrations?connected=dexcom`
    )
  } catch (err) {
    console.error('Dexcom callback error:', err)
    return NextResponse.redirect(
      `${redirectBase}/settings/integrations?error=token_exchange_failed`
    )
  }
}
