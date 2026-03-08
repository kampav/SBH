export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'

export async function GET(req: NextRequest) {
  try {
    const header = req.headers.get('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token)
    const adminUids = (process.env.ADMIN_UIDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
    if (!adminUids.includes(decoded.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ ok: true, uid: decoded.uid })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
