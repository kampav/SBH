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
