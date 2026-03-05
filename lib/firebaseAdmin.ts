import { App, getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function getOrInitAdminApp(): App {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    throw new Error('Firebase Admin not available during build')
  }
  if (getApps().length) return getApps()[0]
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : undefined
  return initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : undefined,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
}

/** Returns the initialised firebase-admin App (lazy, singleton). */
export function getAdminApp(): App {
  return getOrInitAdminApp()
}

/** Returns the Admin Firestore instance (lazy, singleton). */
export function getAdminDb() {
  return getFirestore(getOrInitAdminApp())
}
