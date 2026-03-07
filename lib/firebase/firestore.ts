import {
  doc, getDoc, setDoc, deleteDoc,
  collection, getDocs,
  query, orderBy, limit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from './client'
import { UserProfile, DailyMetric, DailyNutrition, DailyWorkout, BodyMeasurement, FavouriteFood, GlucoseReading, DailyGlucose, HbA1cEntry, GlucoseSettings, StreakRecord, Achievement, SleepEntry, HabitDefinition, DailyHabitLog, WeeklyInsight, LeaderboardEntry, MoodEntry, PHQ9Assessment, BloodPressureReading } from '../types'

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

export interface PersonalBest {
  weightKg: number
  reps: number
  date: string
  volume: number  // weightKg × reps
}

/** Scans last 90 workout days and returns the heaviest single set for an exercise. */
export async function getPersonalBest(uid: string, exerciseName: string): Promise<PersonalBest | null> {
  const workouts = await getRecentWorkouts(uid, 90)
  let best: PersonalBest | null = null
  for (const w of workouts) {
    const exLog = w.exercises.find(e => e.exerciseName === exerciseName)
    if (!exLog) continue
    for (const s of exLog.sets) {
      if (!s.completed || s.weightKg === 0) continue
      const vol = s.weightKg * s.reps
      if (!best || vol > best.volume) {
        best = { weightKg: s.weightKg, reps: s.reps, date: w.date, volume: vol }
      }
    }
  }
  return best
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

// ─── Habits ───────────────────────────────────────────────────────────────────
export async function getHabits(uid: string): Promise<HabitDefinition[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'habits'))
  return snap.docs.map(d => d.data() as HabitDefinition).filter(h => h.active)
}

export async function saveHabit(uid: string, habit: HabitDefinition): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'habits', habit.id), habit)
}

export async function deleteHabit(uid: string, id: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'habits', id), { active: false }, { merge: true })
}

export async function getDailyHabitLog(uid: string, date: string): Promise<DailyHabitLog | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'habit_logs', date))
  return snap.exists() ? (snap.data() as DailyHabitLog) : null
}

export async function updateHabitLog(uid: string, date: string, habitId: string, count: number): Promise<void> {
  const ref = doc(db, 'users', uid, 'habit_logs', date)
  const existing = await getDailyHabitLog(uid, date)
  const logs = { ...(existing?.logs ?? {}), [habitId]: count }
  await setDoc(ref, { date, logs, updatedAt: serverTimestamp() }, { merge: true })
}

export async function getHabitLogHistory(uid: string, days = 30): Promise<DailyHabitLog[]> {
  const q = query(collection(db, 'users', uid, 'habit_logs'), orderBy('date', 'desc'), limit(days))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as DailyHabitLog)
}

// ─── Weekly Insights Cache ────────────────────────────────────────────────────
export async function getCachedWeeklyInsight(uid: string, weekStartDate: string): Promise<WeeklyInsight | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'insights', weekStartDate))
  return snap.exists() ? (snap.data() as WeeklyInsight) : null
}

export async function saveWeeklyInsight(uid: string, insight: WeeklyInsight): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'insights', insight.weekStartDate), insight)
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export async function updateLeaderboardEntry(weekKey: string, entry: LeaderboardEntry): Promise<void> {
  await setDoc(doc(db, 'leaderboards', weekKey, 'entries', entry.uid), {
    ...entry,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function getLeaderboard(weekKey: string, limitCount = 50): Promise<LeaderboardEntry[]> {
  const q = query(
    collection(db, 'leaderboards', weekKey, 'entries'),
    orderBy('workoutCount', 'desc'),
    limit(limitCount),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as LeaderboardEntry)
}

// ─── Public Profile Helpers ───────────────────────────────────────────────────
export function generateUsername(displayName: string, uid: string): string {
  const base = displayName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 6) || 'user'
  return `${base}_${uid.substring(0, 4)}`
}

export async function savePublicProfileFields(uid: string, displayName: string): Promise<{ username: string; referralCode: string }> {
  const existing = await getProfile(uid)
  const username = existing?.username ?? generateUsername(displayName, uid)
  const referralCode = existing?.referralCode ?? uid.substring(0, 8).toUpperCase()
  if (!existing?.username || !existing?.referralCode) {
    await setDoc(doc(db, 'users', uid, 'profile', 'data'), { username, referralCode }, { merge: true })
  }
  return { username, referralCode }
}

// ─── Mood Log (Phase 13) ──────────────────────────────────────────────────────
export async function saveMoodEntry(uid: string, entry: MoodEntry): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'mood', entry.id), entry)
}

export async function getMoodHistory(uid: string, days = 30): Promise<MoodEntry[]> {
  const q = query(collection(db, 'users', uid, 'mood'), orderBy('date', 'desc'), limit(days))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as MoodEntry).reverse()
}

export async function deleteMoodEntry(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'mood', id))
}

// ─── PHQ-9 Assessments (Phase 13) ────────────────────────────────────────────
export async function savePHQ9(uid: string, assessment: PHQ9Assessment): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'phq9', assessment.id), assessment)
}

export async function getPHQ9History(uid: string, limitCount = 12): Promise<PHQ9Assessment[]> {
  const q = query(collection(db, 'users', uid, 'phq9'), orderBy('date', 'desc'), limit(limitCount))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as PHQ9Assessment)
}

// ─── Blood Pressure (Phase 13) ────────────────────────────────────────────────
export async function saveBloodPressure(uid: string, reading: BloodPressureReading): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'blood_pressure', reading.id), reading)
}

export async function getBloodPressureHistory(uid: string, days = 30): Promise<BloodPressureReading[]> {
  const q = query(collection(db, 'users', uid, 'blood_pressure'), orderBy('date', 'desc'), limit(days))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as BloodPressureReading).reverse()
}

export async function deleteBloodPressure(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'blood_pressure', id))
}

// ─── Account Deletion ─────────────────────────────────────────────────────────
export async function deleteAllUserData(uid: string): Promise<void> {
  const subcollections = ['metrics', 'nutrition', 'workouts', 'measurements', 'favourites', 'glucose', 'hba1c', 'glucose_settings', 'subscription', 'streaks', 'achievements', 'fcm_tokens', 'sleep', 'habits', 'habit_logs', 'insights', 'mood', 'phq9', 'blood_pressure']
  for (const sub of subcollections) {
    const snap = await getDocs(collection(db, 'users', uid, sub))
    const batch = writeBatch(db)
    snap.docs.forEach(d => batch.delete(d.ref))
    if (snap.docs.length > 0) await batch.commit()
  }
  await deleteDoc(doc(db, 'users', uid, 'profile', 'data'))
}
