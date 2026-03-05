import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist, NetworkFirst, CacheFirst, NetworkOnly } from 'serwist'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const self: any & { __SW_MANIFEST: (PrecacheEntry | string)[] | undefined } & SerwistGlobalConfig

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,

  runtimeCaching: [
    {
      matcher: ({ request }: { request: Request }) => request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'pages',
        networkTimeoutSeconds: 3,
        plugins: [{ cacheWillUpdate: async ({ response }) => response?.status === 200 ? response : null }],
      }),
    },
    {
      matcher: ({ request }: { request: Request }) =>
        ['style', 'script', 'font', 'image'].includes(request.destination),
      handler: new CacheFirst({ cacheName: 'static-assets' }),
    },
    {
      matcher: ({ url }: { url: URL }) =>
        url.pathname.startsWith('/api/') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('firebaseio.com'),
      handler: new NetworkOnly(),
    },
  ],
})

serwist.addEventListeners()

// ── Push Notifications (FCM) ────────────────────────────────────────────────
// Serwist does not handle push/notificationclick — add them manually.

interface SBHPushPayload {
  title?: string
  body?: string
  icon?: string
  tag?: string
  url?: string
}

self.addEventListener('push', (event: { data?: { json: () => SBHPushPayload }; waitUntil: (p: Promise<unknown>) => void }) => {
  const data: SBHPushPayload = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'SBH', {
      body: data.body ?? 'You have a new notification',
      icon: data.icon ?? '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      tag: data.tag ?? 'sbh',
      data: { url: data.url ?? '/dashboard' },
      requireInteraction: false,
    }),
  )
})

self.addEventListener('notificationclick', (event: { notification: { close: () => void; data?: { url?: string } }; waitUntil: (p: Promise<unknown>) => void }) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/dashboard'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList: Array<{ url: string; focus: () => Promise<unknown> }>) => {
        const existing = clientList.find(c => c.url.includes(url))
        if (existing) return existing.focus()
        return self.clients.openWindow(url)
      }),
  )
})
