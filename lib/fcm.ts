// lib/fcm.ts
// Firebase Cloud Messaging — client-side token management.
// Requires NEXT_PUBLIC_FCM_VAPID_KEY env var (from Firebase Console →
// Project Settings → Cloud Messaging → Web Push certificates).

const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY

export type NotificationPermission = 'granted' | 'denied' | 'default'

/** Request browser notification permission. Returns current permission state. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return (await Notification.requestPermission()) as NotificationPermission
}

/**
 * Get the FCM registration token for the current device.
 * Requires notification permission to already be granted.
 * Returns null if FCM is unavailable or VAPID key is not configured.
 */
export async function getFcmToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !VAPID_KEY) return null
  try {
    const { getMessaging, getToken } = await import('firebase/messaging')
    const { getApp, getApps } = await import('firebase/app')
    if (!getApps().length) return null
    const messaging = getMessaging(getApp())
    const sw = await navigator.serviceWorker.ready
    return await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: sw })
  } catch {
    return null
  }
}

/** Enable notifications: request permission → get token. Returns token or null. */
export async function enableNotifications(): Promise<string | null> {
  const perm = await requestNotificationPermission()
  if (perm !== 'granted') return null
  return getFcmToken()
}

/** Check if the browser supports web push notifications. */
export function isNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}
