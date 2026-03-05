import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export function getAdminDb() {
  // Skip during build when credentials aren't available
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    throw new Error('Firebase Admin not available during build')
  }
  let app
  if (getApps().length) {
    app = getApps()[0]
  } else {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      : undefined
    app = initializeApp({
      credential: serviceAccount ? cert(serviceAccount) : undefined,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })
  }
  return getFirestore(app)
}
