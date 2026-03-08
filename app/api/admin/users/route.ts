export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp, getAdminDb } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'

async function verifyAdminToken(req: NextRequest): Promise<string> {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) throw new Error('No token')
  const decoded = await getAuth(getAdminApp()).verifyIdToken(token)
  const adminUids = (process.env.ADMIN_UIDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (!adminUids.includes(decoded.uid)) throw new Error('Not admin')
  return decoded.uid
}

export async function GET(req: NextRequest) {
  try {
    await verifyAdminToken(req)
    const search = new URL(req.url).searchParams.get('search') ?? ''
    const listResult = await getAuth(getAdminApp()).listUsers(500)
    let users = listResult.users.map(u => ({
      uid:         u.uid,
      email:       u.email ?? '',
      displayName: u.displayName ?? '',
      disabled:    u.disabled,
      createdAt:   u.metadata.creationTime ?? '',
      lastSignIn:  u.metadata.lastSignInTime ?? '',
    }))
    if (search) {
      const q = search.toLowerCase()
      users = users.filter(
        u =>
          u.email.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          u.uid.includes(q)
      )
    }
    return NextResponse.json({ users: users.slice(0, 50) })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: msg === 'Not admin' ? 403 : 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdminToken(req)
    const body = await req.json() as { action: string; uid: string }
    const { action, uid } = body
    const adminAuth = getAuth(getAdminApp())
    const db = getAdminDb()

    if (action === 'ban') {
      await adminAuth.updateUser(uid, { disabled: true })
      await db
        .collection('users')
        .doc(uid)
        .collection('profile')
        .doc('data')
        .set({ banned: true }, { merge: true })
    } else if (action === 'unban') {
      await adminAuth.updateUser(uid, { disabled: false })
      await db
        .collection('users')
        .doc(uid)
        .collection('profile')
        .doc('data')
        .set({ banned: false }, { merge: true })
    } else if (action === 'revokeTokens') {
      await adminAuth.revokeRefreshTokens(uid)
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: msg === 'Not admin' ? 403 : 401 })
  }
}
