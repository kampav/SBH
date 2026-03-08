export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp, getAdminDb } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'

interface Announcement {
  id: string
  title: string
  body: string
  expiresAt: string
  active: boolean
}

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
    const docId = new URL(req.url).searchParams.get('docId') ?? ''
    const db = getAdminDb()

    if (docId === 'announcements') {
      const snap = await db.collection('admin_content').doc('announcements').get()
      const items: Announcement[] = (snap.data()?.items as Announcement[]) ?? []
      return NextResponse.json({ items })
    }

    const snap = await db.collection('admin_content').doc(docId).get()
    if (!snap.exists) {
      return NextResponse.json({ body: '', updatedAt: null })
    }
    return NextResponse.json({
      body:      snap.data()?.body ?? '',
      updatedAt: snap.data()?.updatedAt ?? null,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: msg === 'Not admin' ? 403 : 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdminToken(req)
    const body = await req.json() as {
      docId: string
      body?: string
      action?: 'add' | 'update' | 'delete'
      item?: Partial<Announcement>
    }
    const { docId, action, item } = body
    const db = getAdminDb()
    const ref = db.collection('admin_content').doc(docId)

    if (docId === 'announcements' && action && item) {
      const snap = await ref.get()
      let items: Announcement[] = (snap.data()?.items as Announcement[]) ?? []

      if (action === 'add') {
        const newItem: Announcement = {
          id:        item.id ?? Date.now().toString(),
          title:     item.title ?? '',
          body:      item.body ?? '',
          expiresAt: item.expiresAt ?? '',
          active:    item.active ?? true,
        }
        items = [...items, newItem]
      } else if (action === 'update') {
        items = items.map(a => (a.id === item.id ? { ...a, ...item } as Announcement : a))
      } else if (action === 'delete') {
        items = items.filter(a => a.id !== item.id)
      }

      await ref.set({ items, updatedAt: new Date().toISOString() })
    } else {
      // Plain document save (privacy_policy / terms_of_service)
      await ref.set(
        { body: body.body ?? '', updatedAt: new Date().toISOString() },
        { merge: true }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: msg === 'Not admin' ? 403 : 401 })
  }
}
