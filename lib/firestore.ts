import {
  doc, getDoc, setDoc, deleteDoc,
  collection, getDocs,
  query, orderBy, limit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { UserProfile, DailyMetric, DailyNutrition, DailyWorkout, BodyMeasurement, FavouriteFood, GlucoseReading, DailyGlucose, HbA1cEntry, GlucoseSettings, StreakRecord, Achievement, SleepEntry } from './types'

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
  const q = query(collection(db, 'users', uid, 'metrics'), orderBy('date', 'desc'), limit(days))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as DailyMetric).reverse()
}

// ─── Body Measurements ────────────────────────────────────────────────────────
export async function saveMeasurement(uid: string, m: BodyMeasurement) {
  await setDoc(doc(db, 'users', uid, 'measurements', m.date), m)
}

export async function getMeasurements(uid: string, weeks = 20): Promise<BodyMeasurement[]> {
  const q = query(collection(db, 'users', uid, 'measurements'), orderBy('date', 'desc'), limit(weeks))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as BodyMeasurement).reverse()
}

// ─── Nutrition ────────────────────────────────────────────────────────────────
export async function getNutrition(uid: string, date: string): Promise<DailyNutrition | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'nutrition', date))
  return snap.exists() ? (snap.data() as DailyNutrition) : null
}

export async function getNutritionHistory(uid: string, days = 90): Promise<DailyNutrition[]> {
  const q = query(collection(db, 'users', uid, 'nutrition'), orderBy('date', 'desc'), limit(days))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as DailyNutrition).reverse()
}

export async function saveNutrition(uid: string, data: DailyNutrition) {
  await setDoc(doc(db, 'users', uid, 'nutrition', data.date), data)
}

// ─── Favourite Foods ──────────────────────────────────────────────────────────
export async function getFavouriteFoods(uid: string): Promise<FavouriteFood[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'favourites'))
  return snap.docs.map(d => d.data() as FavouriteFood)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function saveFavouriteFood(uid: string, food: FavouriteFood) {
  await setDoc(doc(db, 'users', uid, 'favourites', food.id), food)
}

export async function deleteFavouriteFood(uid: string, id: string) {
  await deleteDoc(doc(db, 'users', uid, 'favourites', id))
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
  const q = query(collection(db, 'users', uid, 'workouts'), orderBy('date', 'desc'), limit(days))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as DailyWorkout)
}

// ─── Glucose Settings ─────────────────────────────────────────────────────────
export async function getGlucoseSettings(uid: string): Promise<GlucoseSettings | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'glucose_settings', 'config'))
  return snap.exists() ? (snap.data() as GlucoseSettings) : null
}

export async function saveGlucoseSettings(uid: string, settings: Partial<GlucoseSettings>) {
  await setDoc(doc(db, 'users', uid, 'glucose_settings', 'config'), settings, { merge: true })
}

// ─── Daily Glucose Readings ───────────────────────────────────────────────────
export async function getDailyGlucose(uid: string, date: string): Promise<DailyGlucose | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'glucose', date))
  return snap.exists() ? (snap.data() as DailyGlucose) : null
}

export async function saveGlucoseReading(uid: string, date: string, reading: GlucoseReading) {
  const existing = await getDailyGlucose(uid, date)
  const readings = existing
    ? [...existing.readings.filter(r => r.id !== reading.id), reading]
    : [reading]
  await setDoc(doc(db, 'users', uid, 'glucose', date), { date, readings })
}

export async function deleteGlucoseReading(uid: string, date: string, readingId: string) {
  const existing = await getDailyGlucose(uid, date)
  if (!existing) return
  const readings = existing.readings.filter(r => r.id !== readingId)
  await setDoc(doc(db, 'users', uid, 'glucose', date), { date, readings })
}

export async function getGlucoseHistory(uid: string, days = 30): Promise<DailyGlucose[]> {
  const q = query(collection(db, 'users', uid, 'glucose'), orderBy('date', 'desc'), limit(days))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as DailyGlucose).reverse()
}

// ─── HbA1c ────────────────────────────────────────────────────────────────────
export async function getHbA1cHistory(uid: string): Promise<HbA1cEntry[]> {
  const q = query(collection(db, 'users', uid, 'hba1c'), orderBy('date', 'desc'), limit(24))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as HbA1cEntry)
}

export async function saveHbA1c(uid: string, entry: HbA1cEntry) {
  await setDoc(doc(db, 'users', uid, 'hba1c', entry.id), { ...entry, loggedAt: serverTimestamp() })
}

export async function deleteHbA1c(uid: string, id: string) {
  await deleteDoc(doc(db, 'users', uid, 'hba1c', id))
}

// ─── Streaks ──────────────────────────────────────────────────────────────────
export async function getStreak(uid: string): Promise<StreakRecord | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'streaks', 'current'))
  return snap.exists() ? (snap.data() as StreakRecord) : null
}

const STREAK_MILESTONES = [7, 14, 30, 50, 100]

export async function updateStreak(uid: string, logDate: string): Promise<StreakRecord> {
  const existing = await getStreak(uid)
  const today = logDate
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yStr = yesterday.toISOString().slice(0, 10)

  let current = 1
  let longest = 1
  const milestones: number[] = existing?.milestones ?? []

  if (existing) {
    if (existing.lastLogDate === today) {
      // Already updated today
      return existing
    } else if (existing.lastLogDate === yStr) {
      // Consecutive day
      current = existing.currentStreak + 1
      longest = Math.max(existing.longestStreak, current)
    } else {
      // Streak broken
      current = 1
      longest = Math.max(existing.longestStreak, 1)
    }
  }

  // Check milestones
  STREAK_MILESTONES.forEach(m => {
    if (current >= m && !milestones.includes(m)) milestones.push(m)
  })

  const record: StreakRecord = {
    currentStreak: current,
    longestStreak: longest,
    lastLogDate: today,
    streakType: 'logging',
    milestones,
    updatedAt: serverTimestamp(),
  }
  await setDoc(doc(db, 'users', uid, 'streaks', 'current'), record)
  return record
}

// ─── Achievements ─────────────────────────────────────────────────────────────
export async function getAchievements(uid: string): Promise<Achievement[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'achievements'))
  return snap.docs.map(d => d.data() as Achievement)
}

// ─── FCM Tokens ───────────────────────────────────────────────────────────────
type FcmPrefs = { streakReminder: boolean; workoutReminder: boolean; hydrationNudge: boolean }

export async function saveFcmToken(uid: string, token: string, prefs: FcmPrefs): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'fcm_tokens', 'primary'), {
    token, prefs, updatedAt: serverTimestamp(),
  })
}

export async function getFcmTokenDoc(uid: string): Promise<{ token: string; prefs: FcmPrefs } | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'fcm_tokens', 'primary'))
  return snap.exists() ? (snap.data() as { token: string; prefs: FcmPrefs }) : null
}

export async function deleteFcmToken(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'fcm_tokens', 'primary'))
}

// ─── Sleep ────────────────────────────────────────────────────────────────────
export async function saveSleep(uid: string, entry: SleepEntry): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'sleep', entry.date), { ...entry, loggedAt: serverTimestamp() })
}

export async function getSleep(uid: string, date: string): Promise<SleepEntry | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'sleep', date))
  return snap.exists() ? (snap.data() as SleepEntry) : null
}

export async function getSleepHistory(uid: string, days = 30): Promise<SleepEntry[]> {
  const q = query(collection(db, 'users', uid, 'sleep'), orderBy('date', 'desc'), limit(days))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as SleepEntry).reverse()
}

export async function deleteSleep(uid: string, date: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'sleep', date))
}

// ─── Account Deletion ─────────────────────────────────────────────────────────
export async function deleteAllUserData(uid: string): Promise<void> {
  const subcollections = ['metrics', 'nutrition', 'workouts', 'measurements', 'favourites', 'glucose', 'hba1c', 'glucose_settings', 'subscription', 'streaks', 'achievements', 'fcm_tokens', 'sleep']
  for (const sub of subcollections) {
    const snap = await getDocs(collection(db, 'users', uid, sub))
    const batch = writeBatch(db)
    snap.docs.forEach(d => batch.delete(d.ref))
    if (snap.docs.length > 0) await batch.commit()
  }
  await deleteDoc(doc(db, 'users', uid, 'profile', 'data'))
}
