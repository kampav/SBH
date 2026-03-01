import { Timestamp, FieldValue } from 'firebase/firestore'

// Timestamp fields can be a Timestamp (when read) or FieldValue (when writing serverTimestamp())
export type FirestoreTimestamp = Timestamp | FieldValue

// ─── User Profile ────────────────────────────────────────────────────────────
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
  trainingDaysPerWeek: 2 | 3 | 4 | 5 | 6
  bmr: number
  tdee: number
  calorieTarget: number
  proteinTargetG: number
  carbTargetG: number
  fatTargetG: number
  onboardingComplete: boolean
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

// ─── Daily Metrics ────────────────────────────────────────────────────────────
export interface DailyMetric {
  date: string // YYYY-MM-DD
  weightKg: number
  bmi: number
  bodyFatPct?: number
  leanMassKg?: number
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
export type ProgrammeSplit = 'full_body' | 'ppl' | 'upper_lower' | 'home' | 'fat_loss'

export interface Exercise {
  name: string
  sets: number
  reps: string // e.g. "8-12"
  restSeconds: number
  videoUrl?: string
  muscleGroup: string
  equipment: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  notes?: string
}

export interface WorkoutDay {
  name: string // e.g. "Push Day" or "Full Body A"
  exercises: Exercise[]
  estimatedMinutes: number
}

export interface Programme {
  id: string
  name: string
  split: ProgrammeSplit
  daysPerWeek: number
  phase: 1 | 2 | 3
  weeks: WorkoutDay[][] // [week][day]
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
