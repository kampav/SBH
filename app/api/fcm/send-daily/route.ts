// app/api/fcm/send-daily/route.ts
// Scheduled daily notification sender — called by Cloud Scheduler / cron.
// Auth: Authorization: Bearer ${CRON_SECRET}
//
// POST {} → iterates all users' fcm_tokens via collectionGroup, sends targeted
// notifications by user preference (streak/workout/hydration), removes invalid tokens.

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CRON_SECRET = process.env.CRON_SECRET

type NotifType = 'streakReminder' | 'workoutReminder' | 'hydrationNudge'

interface TokenDoc {
  token: string
  prefs: Record<NotifType, boolean>
}

interface NotifPayload {
  title: string
  body: string
  url: string
  tag: string
}

const NOTIFICATIONS: Record<NotifType, NotifPayload> = {
  streakReminder: {
    title: '🔥 Keep your streak alive!',
    body:  "You haven't logged today yet — don't break your streak.",
    url:   '/nutrition',
    tag:   'streak',
  },
  workoutReminder: {
    title: '💪 Time to move',
    body:  "Your workout is waiting. Even 20 minutes counts.",
    url:   '/workout',
    tag:   'workout',
  },
  hydrationNudge: {
    title: '💧 Stay hydrated',
    body:  "Remember to drink water — aim for 2 L today.",
    url:   '/dashboard',
    tag:   'hydration',
  },
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { getAdminApp } = await import('@/lib/firebaseAdmin')
    const { getFirestore }  = await import('firebase-admin/firestore')
    const { getMessaging }  = await import('firebase-admin/messaging')

    const adminDb   = getFirestore(getAdminApp())
    const messaging = getMessaging(getAdminApp())

    // ── Gather all FCM token docs ────────────────────────────────────────────
    const tokenSnap = await adminDb.collectionGroup('fcm_tokens').get()

    const stats = { sent: 0, skipped: 0, invalid: 0, errors: 0 }
    const invalidTokenRefs: FirebaseFirestore.DocumentReference[] = []

    // Determine which notification types to send today (simple rotation by day)
    const dayOfWeek = new Date().getDay() // 0=Sun … 6=Sat
    const typesToSend: NotifType[] = ['streakReminder'] // always send streak reminder
    if (dayOfWeek % 2 === 0) typesToSend.push('workoutReminder')
    if (dayOfWeek % 3 === 0) typesToSend.push('hydrationNudge')

    // ── Send per-token ───────────────────────────────────────────────────────
    const sendPromises = tokenSnap.docs.map(async (docSnap) => {
      const data = docSnap.data() as Partial<TokenDoc>
      const token = data.token
      const prefs = data.prefs ?? { streakReminder: true, workoutReminder: true, hydrationNudge: true }

      if (!token) { stats.skipped++; return }

      // Pick the first notification type this user has opted in to
      const notifType = typesToSend.find(t => prefs[t])
      if (!notifType) { stats.skipped++; return }

      const payload = NOTIFICATIONS[notifType]

      try {
        await messaging.send({
          token,
          notification: { title: payload.title, body: payload.body },
          webpush: {
            notification: {
              title: payload.title,
              body:  payload.body,
              icon:  '/icons/icon-192.png',
              badge: '/icons/icon-96.png',
              tag:   payload.tag,
              requireInteraction: false,
            },
            fcmOptions: { link: payload.url },
          },
        })
        stats.sent++
      } catch (err: unknown) {
        const code = (err as { errorInfo?: { code?: string } })?.errorInfo?.code ?? ''
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          // Stale token — queue for deletion
          invalidTokenRefs.push(docSnap.ref)
          stats.invalid++
        } else {
          stats.errors++
          console.error('[FCM send-daily] send error:', code, err)
        }
      }
    })

    await Promise.all(sendPromises)

    // ── Purge stale tokens ───────────────────────────────────────────────────
    if (invalidTokenRefs.length > 0) {
      const batch = adminDb.batch()
      invalidTokenRefs.forEach(ref => batch.delete(ref))
      await batch.commit()
    }

    console.info('[FCM send-daily] done', stats)
    return NextResponse.json({ ok: true, stats })
  } catch (err) {
    console.error('[FCM send-daily] fatal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
