// app/api/fcm/notify/route.ts
// Server-side FCM notification sender.
// POST { token, title, body, url?, tag? } → sends push notification via firebase-admin.
// Used internally by scheduled jobs or manual triggers from profile page.

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { token, title, body, url, tag } = await req.json() as {
      token: string
      title: string
      body: string
      url?: string
      tag?: string
    }

    if (!token || !title || !body) {
      return NextResponse.json({ error: 'token, title and body are required' }, { status: 400 })
    }

    const { getAdminApp } = await import('@/lib/firebaseAdmin')
    const { getMessaging } = await import('firebase-admin/messaging')

    const messaging = getMessaging(getAdminApp())

    await messaging.send({
      token,
      notification: { title, body },
      webpush: {
        notification: {
          title,
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-96.png',
          tag: tag ?? 'sbh',
          requireInteraction: false,
        },
        fcmOptions: { link: url ?? '/dashboard' },
      },
    })

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('[FCM notify] error:', err)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
