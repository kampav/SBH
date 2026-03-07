// app/api/integrations/dexcom/auth/route.ts
// Initiates Dexcom OAuth 2.0 authorisation flow.
// Client calls: GET /api/integrations/dexcom/auth
// with Authorization: Bearer <firebase-id-token>
// Server redirects browser to Dexcom consent screen.

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'
import { getDexcomAuthUrl } from '@/lib/integrations/dexcom'

export async function GET(req: NextRequest) {
  // Token passed as query param — browser redirects can't set Authorization headers
  const { searchParams } = new URL(req.url)
  const idToken = searchParams.get('token')
  if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let uid: string
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken)
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  if (!process.env.DEXCOM_CLIENT_ID) {
    return NextResponse.json({ error: 'Dexcom integration not configured' }, { status: 503 })
  }

  const authUrl = getDexcomAuthUrl(uid)
  return NextResponse.redirect(authUrl)
}
