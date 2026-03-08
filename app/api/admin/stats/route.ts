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
    const db = getAdminDb()

    // Total users: list via Firebase Auth (up to 1000)
    const listResult = await getAuth(getAdminApp()).listUsers(1000)
    const totalUsers = listResult.users.length

    // New today
    const todayStr   = new Date().toISOString().slice(0, 10)
    const todayStart = new Date(todayStr)
    const todaySignups = listResult.users.filter(
      u => u.metadata.creationTime && new Date(u.metadata.creationTime) >= todayStart
    ).length

    // New last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const newLast7d = listResult.users.filter(
      u => u.metadata.creationTime && new Date(u.metadata.creationTime) > sevenDaysAgo
    ).length

    // New last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const newLast30d = listResult.users.filter(
      u => u.metadata.creationTime && new Date(u.metadata.creationTime) > thirtyDaysAgo
    ).length

    // Last 5 signups
    const recentSignups = listResult.users
      .slice()
      .sort(
        (a, b) =>
          new Date(b.metadata.creationTime ?? 0).getTime() -
          new Date(a.metadata.creationTime ?? 0).getTime()
      )
      .slice(0, 5)
      .map(u => ({
        uid: u.uid,
        email: u.email ?? '',
        createdAt: u.metadata.creationTime ?? '',
      }))

    // Telemetry for last 30 days
    let telemetry: Record<string, unknown>[] = []
    try {
      const telemetrySnap = await db
        .collection('admin_telemetry')
        .doc('daily')
        .collection('entries')
        .orderBy('date', 'desc')
        .limit(30)
        .get()
      telemetry = telemetrySnap.docs.map(d => ({ date: d.id, ...d.data() }))
    } catch {
      // Collection may not exist yet — return empty array
    }

    const type = new URL(req.url).searchParams.get('type')

    return NextResponse.json({
      totalUsers,
      newToday:   todaySignups,
      newLast7d,
      newLast30d,
      recentSignups,
      telemetry,
      type,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    const status = msg === 'Not admin' ? 403 : 401
    return NextResponse.json({ error: msg }, { status })
  }
}
