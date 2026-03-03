import { initializeApp, getApps, getApp } from 'firebase/app'
import { initializeAuth, getAuth, browserLocalPersistence, indexedDBLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
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

// @capacitor/core is bundled into the web app, so window.Capacitor exists
// in ALL environments. Use isNativePlatform() to distinguish a real Android/iOS
// binary (where sessionStorage is blocked) from a regular browser session.
function createAuth() {
  if (!app) return null as never
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  const isNative = !!(cap?.isNativePlatform?.())
  if (isNative) {
    // Native WebView: sessionStorage blocked — use IndexedDB instead
    try {
      return initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      })
    } catch {
      return getAuth(app)
    }
  }
  // Regular browser: getAuth() uses full default persistence chain
  // (includes browserSessionPersistence required by signInWithPopup)
  return getAuth(app)
}

export const auth = isBrowser ? createAuth() : null as never
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const db = isBrowser ? getFirestore(app!) : null as never
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const storage = isBrowser ? getStorage(app!) : null as never
