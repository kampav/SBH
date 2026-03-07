import { Timestamp, FieldValue } from 'firebase/firestore'

export type FirestoreTimestamp = Timestamp | FieldValue

// ─── User Profile ────────────────────────────────────────────────────────────
export interface UserConsents {
  termsAccepted: boolean              // Terms of Service v1.0+
  privacyAccepted: boolean            // Privacy Policy v2.0+
  healthDataConsent: boolean          // GDPR Art 9 / DPDP special category
  ageVerified: boolean                // confirms 18+
  marketingConsent: boolean           // optional email marketing
  consentVersion: string              // e.g. '2026-03' — bump when policy changes
  consentDate: string                 // YYYY-MM-DD ISO date of consent
}

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  age: number
  sex: 'male' | 'female'
  heightCm: number
  weightKg: number
  targetWeightKg: number
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active'
  goal: 'fat_loss' | 'muscle_gain' | 'recomp' | 'endurance'
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  equipmentAccess: 'full_gym' | 'dumbbells' | 'home' | 'none'
  programme?: ProgrammeKey
  trainingDaysPerWeek: 2 | 3 | 4 | 5 | 6
  bmr: number
  tdee: number
  calorieTarget: number
  proteinTargetG: number
  carbTargetG: number
  fatTargetG: number
  onboardingComplete: boolean
  photoUrl?: string
  consents?: UserConsents             // GDPR / DPDP / PDPL consent record
  // Social / Phase 11
  publicProfile?: boolean             // opt-in: appears on leaderboard + /u/[username]
  username?: string                   // auto-generated e.g. "pavku_a1b2"
  referralCode?: string               // uid.substring(0,8).toUpperCase()
  referredBy?: string                 // referralCode of the person who invited them
  // Condition Intelligence / Phase 13
  conditionProfile?: ConditionProfile
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  uid: string
  displayName: string
  goal: string
  workoutCount: number
  updatedAt: FirestoreTimestamp
}

// ─── Daily Metrics ────────────────────────────────────────────────────────────
export interface DailyMetric {
  date: string
  weightKg: number
  bmi: number
  bodyFatPct?: number
  leanMassKg?: number
  notes?: string
  loggedAt: FirestoreTimestamp
}

// ─── Body Measurements (weekly) ───────────────────────────────────────────────
export interface BodyMeasurement {
  date: string            // YYYY-MM-DD (week anchor)
  chestCm: number
  waistCm: number
  neckCm: number
  hipsCm?: number
  bicepCm?: number
  notes?: string
  loggedAt: FirestoreTimestamp
}

// ─── Nutrition ────────────────────────────────────────────────────────────────
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout'

export interface Meal {
  id: string
  name: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  time: string
  mealType: MealType
  // Micronutrients — AI-populated, all optional
  fibreG?: number
  freeSugarsG?: number
  saturatedFatG?: number
  omega3Mg?: number
  sodiumMg?: number
  potassiumMg?: number
  vitaminCMg?: number
  vitaminDMcg?: number
  calciumMg?: number
  ironMg?: number
  magnesiumMg?: number
  zincMg?: number
  vitaminB12Mcg?: number
  folateMcg?: number
  vitaminAMcg?: number
}

export interface DailyNutrition {
  date: string
  meals: Meal[]
  totalCalories: number
  totalProteinG: number
  totalCarbsG: number
  totalFatG: number
  waterGlasses: number
  calorieTarget: number
}

// ─── Favourite Foods ──────────────────────────────────────────────────────────
export interface FavouriteFood {
  id: string
  name: string
  brand?: string
  emoji?: string
  calories: number        // per serving
  proteinG: number
  carbsG: number
  fatG: number
  servingSize: string     // e.g. "100g" or "1 cup"
  barcode?: string
  createdAt: FirestoreTimestamp
}

// ─── Workouts ─────────────────────────────────────────────────────────────────
export interface SetLog {
  setNumber: number
  weightKg: number
  reps: number
  completed: boolean
  restSeconds: number
}

export interface ExerciseLog {
  exerciseName: string
  sets: SetLog[]
  videoUrl?: string
  muscleGroup?: string
}

export interface DailyWorkout {
  date: string
  programmeDay: string
  exercises: ExerciseLog[]
  durationMinutes: number
  totalVolumeKg: number
  estimatedCaloriesBurned: number
  notes?: string
  completedAt: FirestoreTimestamp
}

// ─── Programme ────────────────────────────────────────────────────────────────
export type ProgrammeKey = 'home_6day' | 'gym_upper_lower' | 'beginner_3day'

export type ProgrammeSplit = 'full_body' | 'ppl' | 'upper_lower' | 'home' | 'fat_loss'

export interface Exercise {
  name: string
  sets: number
  reps: string
  restSeconds: number
  videoUrl?: string
  muscleGroup: string
  equipment: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  notes?: string
}

export interface WorkoutDay {
  name: string
  exercises: Exercise[]
  estimatedMinutes: number
}

export interface Programme {
  id: string
  name: string
  split: ProgrammeSplit
  daysPerWeek: number
  phase: 1 | 2 | 3
  weeks: WorkoutDay[][]
  description: string
  bwsVideoRef?: string
}

// ─── Calculations ─────────────────────────────────────────────────────────────
export interface CalcResult {
  bmr: number
  tdee: number
  calorieTarget: number
  proteinTargetG: number
  carbTargetG: number
  fatTargetG: number
}

export type ActivityLevel = UserProfile['activityLevel']
export type Goal = UserProfile['goal']

// ─── Glucose & Diabetes Management ───────────────────────────────────────────
export type GlucoseUnit = 'mmol/L' | 'mg/dL'

export interface GlucoseReading {
  id: string
  time: string  // HH:MM 24hr
  valueMmol: number
  context: 'fasting' | 'pre_meal' | 'post_meal_1h' | 'post_meal_2h' | 'bedtime' | 'other'
  mealRef?: string
  notes?: string
}

export interface DailyGlucose {
  date: string  // YYYY-MM-DD
  readings: GlucoseReading[]
}

export interface HbA1cEntry {
  id: string
  date: string  // YYYY-MM-DD
  valuePct: number
  source: 'clinic' | 'estimated'
  estimatedFromAvgMmol?: number
  notes?: string
  loggedAt: FirestoreTimestamp
}

export interface GlucoseSettings {
  hypoThresholdMmol: number     // default 3.9
  hyperThresholdMmol: number    // default 10.0
  targetRangeLowMmol: number    // default 4.0
  targetRangeHighMmol: number   // default 8.0
  dailyCarbBudgetG: number      // default 130
  preferredUnit: GlucoseUnit
  consentGiven: boolean
  consentDate?: string          // YYYY-MM-DD
}

export interface MealWithGI extends Meal {
  giEstimate?: number
  glEstimate?: number
}

export interface GlucosePrediction {
  curve: { minutesAfterMeal: number; predictedMmol: number }[]
  peakMmol: number
  peakMinutes: number
  confidenceNote: string
  safetyDisclaimer: string
}

// ─── Streak & Achievements ────────────────────────────────────────────────────
export interface StreakRecord {
  currentStreak: number
  longestStreak: number
  lastLogDate: string          // YYYY-MM-DD
  streakType: 'logging' | 'workout' | 'calorie_goal'
  milestones: number[]         // days achieved e.g. [7, 14, 30]
  updatedAt: FirestoreTimestamp
}

export interface Achievement {
  id: string
  type: 'streak_7' | 'streak_14' | 'streak_30' | 'streak_50' | 'streak_100'
       | 'first_workout' | 'first_meal' | 'goal_week' | 'protein_day'
  title: string
  description: string
  unlockedAt: FirestoreTimestamp
}

// ─── DailyContext (hyper-personalisation engine) ──────────────────────────────
export type TimeSlot = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night'
export type WeightTrend = 'losing' | 'gaining' | 'stable' | 'nodata'
export type CalorieStatus = 'on_track' | 'ahead' | 'behind' | 'over'

export interface DailyContext {
  uid: string
  date: string
  calorieTarget: number
  calorieLogged: number
  calorieRemaining: number
  calorieStatus: CalorieStatus
  proteinPct: number
  carbPct: number
  fatPct: number
  hydrationPct: number
  workoutScheduledToday: boolean
  workoutLogged: boolean
  workoutType: string
  weightTrend: WeightTrend
  weeklyDeficit: number
  streakDays: number
  longestStreak: number
  timeSlot: TimeSlot
  priorityAction: 'log_meal' | 'log_workout' | 'drink_water' | 'weigh_in' | 'rest'
  insightBadge: string | null
}

// ─── Sleep ────────────────────────────────────────────────────────────────────
export type SleepQuality = 1 | 2 | 3 | 4 | 5

export interface SleepEntry {
  id: string
  date: string        // YYYY-MM-DD — the date the user woke up
  bedtime: string     // HH:MM 24hr (may be previous calendar day)
  wakeTime: string    // HH:MM 24hr
  durationH: number   // calculated hours (float)
  quality: SleepQuality // 1=terrible … 5=excellent
  notes?: string
  loggedAt: FirestoreTimestamp
}

// ─── Habits ───────────────────────────────────────────────────────────────────
export type HabitCategory = 'hydration' | 'mindfulness' | 'movement' | 'sleep' | 'nutrition' | 'custom'

export interface HabitDefinition {
  id: string
  name: string
  emoji: string
  category: HabitCategory
  targetCount: number       // e.g. 8 for water glasses, 1 for meditation
  unit: string              // e.g. 'glasses', 'minutes', 'steps'
  active: boolean
  createdAt: FirestoreTimestamp
}

export interface DailyHabitLog {
  date: string              // YYYY-MM-DD
  logs: Record<string, number>  // habitId → count
  updatedAt: FirestoreTimestamp
}

// ─── Weekly Insights (cached in Firestore) ────────────────────────────────────
export interface WeeklyInsight {
  weekStartDate: string     // YYYY-MM-DD (Monday)
  generatedAt: string       // ISO timestamp
  narrative: string         // 4-6 sentence AI paragraph
  highlights: string[]      // 3 bullet points
  actions: string[]         // 3 concrete next-week actions
  scores: {
    nutrition: number       // 0-100
    workout: number         // 0-100
    sleep: number           // 0-100
    overall: number         // 0-100
  }
  weekData: {
    avgCalories: number
    avgProteinG: number
    workoutsLogged: number
    avgSleepH: number
    weightDeltaKg: number | null
  }
}

// ─── Condition Intelligence (Phase 13) ───────────────────────────────────────
export type ConditionKey =
  | 'type2_diabetes'
  | 'prediabetes'
  | 'hypertension'
  | 'pcos'
  | 'hypothyroidism'
  | 'anxiety'
  | 'depression'
  | 'ibs'
  | 'heart_disease'
  | 'obesity'

export interface ConditionProfile {
  conditions: ConditionKey[]
  diagnosedByDoctor: boolean
  onMedication: boolean
  medicationNotes?: string
  lastUpdated: string           // YYYY-MM-DD
}

// ─── Mood & Mental Health ─────────────────────────────────────────────────────
export type MoodLevel = 1 | 2 | 3 | 4 | 5   // 1=very low … 5=very good

export interface MoodEntry {
  id: string
  date: string          // YYYY-MM-DD
  time: string          // HH:MM
  mood: MoodLevel
  energy: MoodLevel
  anxiety: MoodLevel    // 1=very calm … 5=very anxious (inverted scale)
  notes?: string
  triggers?: string[]   // e.g. ['work_stress', 'poor_sleep', 'exercise']
  loggedAt: FirestoreTimestamp
}

// ─── PHQ-9 Depression Screening ──────────────────────────────────────────────
export interface PHQ9Assessment {
  id: string
  date: string          // YYYY-MM-DD
  answers: number[]     // 9 items, each 0-3 (Not at all / Several days / More than half / Nearly every day)
  totalScore: number    // 0-27
  severity: 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe'
  completedAt: FirestoreTimestamp
}

// ─── Blood Pressure ───────────────────────────────────────────────────────────
export interface BloodPressureReading {
  id: string
  date: string          // YYYY-MM-DD
  time: string          // HH:MM
  systolic: number      // mmHg
  diastolic: number     // mmHg
  pulse?: number        // bpm
  armSide?: 'left' | 'right'
  context?: 'resting' | 'post_exercise' | 'stressed' | 'other'
  notes?: string
  loggedAt: FirestoreTimestamp
}

// ─── CGM / Wearable Integrations ─────────────────────────────────────────────
export type IntegrationProvider = 'dexcom' | 'libre' | 'health_connect' | 'apple_health'

export interface DexcomCredentials {
  accessToken: string
  refreshToken: string
  expiresAt: number       // unix ms
  scope: string
  connectedAt: string     // ISO datetime
  lastSyncAt?: string     // ISO datetime
}

export interface CGMReading {
  time: string            // HH:MM
  valueMmol: number
  trend?: string          // Dexcom trend enum: RISING, FALLING, STEADY, etc.
  trendRate?: number      // mmol/L/min (converted from mg/dL/min)
  source: 'dexcom' | 'libre' | 'manual'
}

export interface CGMDay {
  date: string            // YYYY-MM-DD
  provider: 'dexcom' | 'libre'
  readings: CGMReading[]
  latestValueMmol: number
  latestTrend?: string
  timeInRangePct: number  // % readings within 3.9-10.0 mmol/L target range
  avgMmol: number
  syncedAt: FirestoreTimestamp
}

// ─── Subscription ─────────────────────────────────────────────────────────────
export interface UserSubscription {
  tier: 'free' | 'pro' | 'premium'
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none'
  currentPeriodEnd?: number   // unix timestamp
  cancelAtPeriodEnd?: boolean
}
