import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
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
// All pages using Firebase have 'use client' + force-dynamic so this is safe.
const isBrowser = typeof window !== 'undefined'
const app = isBrowser
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const auth = isBrowser ? getAuth(app!) : null as never
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const db = isBrowser ? getFirestore(app!) : null as never
