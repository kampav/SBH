export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'

export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  const { code } = params
  if (!code || code.length < 4) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  try {
    const db = getAdminDb()
    // Query profile subcollection across all users for this referralCode
    const snap = await db.collectionGroup('profile')
      .where('referralCode', '==', code.toUpperCase())
      .limit(1)
      .get()

    if (snap.empty) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const data = snap.docs[0].data()
    return NextResponse.json({ displayName: data.displayName ?? 'SBH Member' })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
