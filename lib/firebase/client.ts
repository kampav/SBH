import { initializeApp, getApps, getApp } from 'firebase/app'
import { initializeAuth, getAuth, browserLocalPersistence, indexedDBLocalPersistence } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Only initialise in the browser — never during Next.js SSR/build phase.
const isBrowser = typeof window !== 'undefined'
const app = isBrowser
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null

// Use browserLocalPersistence FIRST on all platforms — localStorage is
// synchronous so onAuthStateChanged fires immediately with the correct user
// rather than null while IndexedDB loads asynchronously. This prevents the
// login-redirect race condition on app launch / page refresh.
// IndexedDB is kept as fallback for environments where localStorage is blocked.
function createAuth() {
  if (!app) return null as never
  try {
    return initializeAuth(app, {
      persistence: [browserLocalPersistence, indexedDBLocalPersistence],
    })
  } catch {
    // Already initialised (e.g. HMR in dev) — return existing instance
    return getAuth(app)
  }
}

export const auth = isBrowser ? createAuth() : null as never
// Firestore with persistent IndexedDB cache for offline support (multi-tab)
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const db = isBrowser
  ? initializeFirestore(app!, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  : null as never
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const storage = isBrowser ? getStorage(app!) : null as never
