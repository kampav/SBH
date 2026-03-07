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

// ─── Public Profile (server-side only) ───────────────────────────────────────
export interface PublicProfileData {
  uid: string
  displayName: string
  goal?: string
  experienceLevel?: string
  programme?: string
  photoUrl?: string
  createdYear?: number
}

export async function getPublicProfileByUsername(username: string): Promise<PublicProfileData | null> {
  const db = getAdminDb()
  const snap = await db.collectionGroup('profile')
    .where('username', '==', username)
    .where('publicProfile', '==', true)
    .limit(1)
    .get()
  if (snap.empty) return null
  const data = snap.docs[0].data()
  return {
    uid: snap.docs[0].ref.parent.parent?.id ?? '',
    displayName: data.displayName ?? '',
    goal: data.goal,
    experienceLevel: data.experienceLevel,
    programme: data.programme,
    photoUrl: data.photoUrl,
    createdYear: data.createdAt?.toDate?.()?.getFullYear(),
  }
}

export async function getPublicStats(uid: string): Promise<{ streak: number; workoutCount: number }> {
  const db = getAdminDb()
  const [streakSnap, workoutsSnap] = await Promise.all([
    db.doc(`users/${uid}/streaks/current`).get(),
    db.collection(`users/${uid}/workouts`).orderBy('date', 'desc').limit(30).get(),
  ])
  return {
    streak: streakSnap.exists ? (streakSnap.data()?.currentStreak ?? 0) : 0,
    workoutCount: workoutsSnap.size,
  }
}
