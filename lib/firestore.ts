import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { UserProfile, DailyMetric, DailyNutrition, DailyWorkout } from './types'

// ─── Profile ──────────────────────────────────────────────────────────────────
export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'profile', 'data'))
  return snap.exists() ? (snap.data() as UserProfile) : null
}

export async function saveProfile(uid: string, profile: Partial<UserProfile>) {
  const ref = doc(db, 'users', uid, 'profile', 'data')
  await setDoc(ref, { ...profile, updatedAt: serverTimestamp() }, { merge: true })
}

// ─── Metrics ──────────────────────────────────────────────────────────────────
export async function saveMetric(uid: string, metric: DailyMetric) {
  await setDoc(doc(db, 'users', uid, 'metrics', metric.date), metric)
}

export async function getMetrics(uid: string, days = 90): Promise<DailyMetric[]> {
  const q = query(
    collection(db, 'users', uid, 'metrics'),
    orderBy('date', 'desc'),
    limit(days),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as DailyMetric).reverse()
}

// ─── Nutrition ────────────────────────────────────────────────────────────────
export async function getNutrition(uid: string, date: string): Promise<DailyNutrition | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'nutrition', date))
  return snap.exists() ? (snap.data() as DailyNutrition) : null
}

export async function saveNutrition(uid: string, data: DailyNutrition) {
  await setDoc(doc(db, 'users', uid, 'nutrition', data.date), data)
}

// ─── Workouts ─────────────────────────────────────────────────────────────────
export async function getWorkout(uid: string, date: string): Promise<DailyWorkout | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'workouts', date))
  return snap.exists() ? (snap.data() as DailyWorkout) : null
}

export async function saveWorkout(uid: string, workout: DailyWorkout) {
  await setDoc(doc(db, 'users', uid, 'workouts', workout.date), workout)
}

export async function getRecentWorkouts(uid: string, days = 30): Promise<DailyWorkout[]> {
  const q = query(
    collection(db, 'users', uid, 'workouts'),
    orderBy('date', 'desc'),
    limit(days),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as DailyWorkout)
}
