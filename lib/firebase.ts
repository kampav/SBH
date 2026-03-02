import { initializeApp, getApps, getApp } from 'firebase/app'
import { initializeAuth, getAuth, browserLocalPersistence, indexedDBLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

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

// In Capacitor WebView, sessionStorage is blocked — use IndexedDB persistence.
// In regular browsers, getAuth() uses the default persistence chain which
// includes browserSessionPersistence (required by signInWithPopup internals).
function createAuth() {
  if (!app) return null as never
  const isCapacitor = !!(window as { Capacitor?: unknown }).Capacitor
  if (isCapacitor) {
    try {
      return initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      })
    } catch {
      // Already initialized on hot reload
      return getAuth(app)
    }
  }
  // Regular browser: getAuth() includes sessionStorage + localStorage + IndexedDB
  return getAuth(app)
}

export const auth = isBrowser ? createAuth() : null as never
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const db = isBrowser ? getFirestore(app!) : null as never
