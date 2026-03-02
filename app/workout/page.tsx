'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { saveWorkout, getWorkout, getProfile } from '@/lib/firestore'
import { estimateCaloriesBurned } from '@/lib/calculations'
import { DailyWorkout, ExerciseLog, SetLog, ProgrammeKey } from '@/lib/types'
import { serverTimestamp } from 'firebase/firestore'
import { ExternalLink, Check, Trophy, Timer, Dumbbell, Heart, ChevronRight, Play } from 'lucide-react'

// ─── Exercise / Programme Types ───────────────────────────────────────────────
interface ExerciseDef {
  name: string
  muscleGroup: string
  sets: number
  repRange: string   // e.g. "12-15" or "45s" for timed
  videoUrl: string
  restSeconds: number
  emoji: string
  isTime?: boolean
}

interface ProgrammeDay {
  dayOfWeek: number  // 0=Mon … 6=Sun
  dayName: string
  label: string
  focus: string
  color: string
  gradient: string
  isRest?: boolean
  exercises: ExerciseDef[]
}

// ─── Home 6-Day Transformation ────────────────────────────────────────────────
const HOME_6DAY: ProgrammeDay[] = [
  {
    dayOfWeek: 0, dayName: 'Mon', label: 'Push + Core', focus: 'Chest · Shoulders · Triceps · Core',
    color: '#10b981', gradient: 'linear-gradient(135deg,#059669,#047857)',
    exercises: [
      { name: 'Push-ups',          muscleGroup: 'Chest',      sets: 4, repRange: '12-15', emoji: '💪', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
      { name: 'Incline Push-ups',  muscleGroup: 'Upper Chest',sets: 3, repRange: '15',    emoji: '📐', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
      { name: 'Chair Dips',        muscleGroup: 'Triceps',    sets: 4, repRange: '10-12', emoji: '🪑', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
      { name: 'Pike Push-ups',     muscleGroup: 'Shoulders',  sets: 3, repRange: '8-10',  emoji: '🔺', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
      { name: 'Plank Hold',        muscleGroup: 'Core',       sets: 3, repRange: '45s',   emoji: '⏱️', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30, isTime: true },
      { name: 'Bicycle Crunches',  muscleGroup: 'Core',       sets: 3, repRange: '20',    emoji: '🚴', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30 },
      { name: 'Leg Raises',        muscleGroup: 'Core',       sets: 3, repRange: '15',    emoji: '🦵', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30 },
    ],
  },
  {
    dayOfWeek: 1, dayName: 'Tue', label: 'HIIT + Legs', focus: 'Cardio · Quads · Hamstrings · Calves',
    color: '#f59e0b', gradient: 'linear-gradient(135deg,#d97706,#b45309)',
    exercises: [
      { name: 'Jump Squats (HIIT ×4)',    muscleGroup: 'Quads',     sets: 4, repRange: '40s',     emoji: '⚡', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 20, isTime: true },
      { name: 'Mountain Climbers (HIIT)', muscleGroup: 'Full Body',  sets: 4, repRange: '40s',     emoji: '🏔️', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 20, isTime: true },
      { name: 'High Knees (HIIT)',        muscleGroup: 'Cardio',    sets: 4, repRange: '40s',     emoji: '🏃', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 20, isTime: true },
      { name: 'Bodyweight Squats',        muscleGroup: 'Quads',     sets: 4, repRange: '20',      emoji: '🦵', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 45 },
      { name: 'Reverse Lunges',           muscleGroup: 'Glutes',    sets: 3, repRange: '12/leg',  emoji: '🚶', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 45 },
      { name: 'Wall Sit',                 muscleGroup: 'Quads',     sets: 3, repRange: '60s',     emoji: '🧱', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 30, isTime: true },
      { name: 'Calf Raises',              muscleGroup: 'Calves',    sets: 4, repRange: '25',      emoji: '🦶', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 30 },
    ],
  },
  {
    dayOfWeek: 2, dayName: 'Wed', label: 'Pull + Abs', focus: 'Back · Biceps · Rear Delts · Abs',
    color: '#6366f1', gradient: 'linear-gradient(135deg,#4f46e5,#4338ca)',
    exercises: [
      { name: 'Resistance Band Rows', muscleGroup: 'Back',       sets: 4, repRange: '15',  emoji: '🚣', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 60 },
      { name: 'Superman Hold',        muscleGroup: 'Lower Back',  sets: 3, repRange: '40s', emoji: '🦸', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 30, isTime: true },
      { name: 'Towel Rows',           muscleGroup: 'Biceps',     sets: 3, repRange: '12',  emoji: '🧺', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 60 },
      { name: 'Reverse Snow Angels',  muscleGroup: 'Rear Delts', sets: 3, repRange: '15',  emoji: '😇', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 45 },
      { name: 'Russian Twists',       muscleGroup: 'Obliques',   sets: 3, repRange: '25',  emoji: '🌀', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30 },
      { name: 'Flutter Kicks',        muscleGroup: 'Lower Abs',  sets: 3, repRange: '30',  emoji: '🦋', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30 },
      { name: 'Hollow Body Hold',     muscleGroup: 'Core',       sets: 3, repRange: '30s', emoji: '⭕', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30, isTime: true },
    ],
  },
  {
    dayOfWeek: 3, dayName: 'Thu', label: 'Active Recovery', focus: 'Mobility · Flexibility · Zone 2 Cardio',
    color: '#06b6d4', gradient: 'linear-gradient(135deg,#0891b2,#0e7490)',
    exercises: [
      { name: 'Hip Mobility Flow',      muscleGroup: 'Hips',      sets: 1, repRange: '10 min',     emoji: '🧘', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 0, isTime: true },
      { name: 'Shoulder Mobility',      muscleGroup: 'Shoulders', sets: 1, repRange: '10 min',     emoji: '🔄', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 0, isTime: true },
      { name: 'Full Body Stretch Flow', muscleGroup: 'Full Body', sets: 1, repRange: '15 min',     emoji: '🌿', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 0, isTime: true },
      { name: 'Brisk Walk (Zone 2)',    muscleGroup: 'Cardio',    sets: 1, repRange: '8-10k steps', emoji: '🚶', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 0 },
    ],
  },
  {
    dayOfWeek: 4, dayName: 'Fri', label: 'Full Body Strength', focus: 'Circuit · Compound · Power',
    color: '#ec4899', gradient: 'linear-gradient(135deg,#db2777,#be185d)',
    exercises: [
      { name: 'Circuit: Push-ups ×4',     muscleGroup: 'Chest',     sets: 4, repRange: '15',  emoji: '💪', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 0 },
      { name: 'Circuit: Squats ×4',       muscleGroup: 'Quads',     sets: 4, repRange: '20',  emoji: '🦵', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 0 },
      { name: 'Circuit: Lunges ×4',       muscleGroup: 'Glutes',    sets: 4, repRange: '12',  emoji: '🚶', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 0 },
      { name: 'Circuit: Plank ×4',        muscleGroup: 'Core',      sets: 4, repRange: '45s', emoji: '⏱️', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 0, isTime: true },
      { name: 'Circuit: Burpees ×4',      muscleGroup: 'Full Body', sets: 4, repRange: '10',  emoji: '⚡', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 0 },
      { name: 'Circuit: Shoulder Taps ×4',muscleGroup: 'Core',      sets: 4, repRange: '20',  emoji: '👐', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
    ],
  },
  {
    dayOfWeek: 5, dayName: 'Sat', label: 'Fat Burn Accelerator', focus: 'HIIT Ladder · Cardio Finisher',
    color: '#ef4444', gradient: 'linear-gradient(135deg,#dc2626,#b91c1c)',
    exercises: [
      { name: 'Ladder: Jumping Jacks (10→20→30)', muscleGroup: 'Cardio',    sets: 2, repRange: 'ladder', emoji: '⭐', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 30 },
      { name: 'Ladder: Mountain Climbers',         muscleGroup: 'Full Body', sets: 2, repRange: 'ladder', emoji: '🏔️', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 30 },
      { name: 'Ladder: Squats',                    muscleGroup: 'Quads',     sets: 2, repRange: 'ladder', emoji: '🦵', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 30 },
      { name: 'Ladder: Sit-ups',                   muscleGroup: 'Core',      sets: 2, repRange: 'ladder', emoji: '💥', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30 },
      { name: 'Brisk Walk Finisher',               muscleGroup: 'Cardio',    sets: 1, repRange: '20 min', emoji: '🚶', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 0, isTime: true },
    ],
  },
  {
    dayOfWeek: 6, dayName: 'Sun', label: 'Rest Day', focus: 'Recovery · Sleep · Nutrition',
    color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#334155)',
    isRest: true, exercises: [],
  },
]

// ─── Gym Upper / Lower Split (4-day) ──────────────────────────────────────────
const GYM_UPPER_LOWER: ProgrammeDay[] = [
  {
    dayOfWeek: 0, dayName: 'Mon', label: 'Upper A', focus: 'Chest · Shoulders · Back · Arms',
    color: '#7c3aed', gradient: 'linear-gradient(135deg,#6d28d9,#5b21b6)',
    exercises: [
      { name: 'Barbell Bench Press', muscleGroup: 'Chest',      sets: 4, repRange: '6-8',   emoji: '🏋️', videoUrl: 'https://youtu.be/rT7DgCr-3pg', restSeconds: 120 },
      { name: 'Overhead Press',      muscleGroup: 'Shoulders',  sets: 3, repRange: '8-10',  emoji: '🔺', videoUrl: 'https://youtu.be/2yjwXTZQDDI', restSeconds: 90 },
      { name: 'Barbell Rows',        muscleGroup: 'Back',       sets: 4, repRange: '8-10',  emoji: '🚣', videoUrl: 'https://youtu.be/G8l_8chR5BE', restSeconds: 90 },
      { name: 'Pull-ups',            muscleGroup: 'Lats',       sets: 3, repRange: '6-10',  emoji: '💪', videoUrl: 'https://youtu.be/eGo4IYlbE5g', restSeconds: 90 },
      { name: 'Face Pulls',          muscleGroup: 'Rear Delts', sets: 3, repRange: '15-20', emoji: '😤', videoUrl: 'https://youtu.be/rep-qVOkqgk', restSeconds: 60 },
      { name: 'Lateral Raises',      muscleGroup: 'Shoulders',  sets: 3, repRange: '12-15', emoji: '✈️', videoUrl: 'https://youtu.be/3VcKaXpzqRo', restSeconds: 60 },
    ],
  },
  {
    dayOfWeek: 1, dayName: 'Tue', label: 'Lower A', focus: 'Quads · Hamstrings · Glutes · Calves',
    color: '#06b6d4', gradient: 'linear-gradient(135deg,#0891b2,#0e7490)',
    exercises: [
      { name: 'Barbell Squats',       muscleGroup: 'Quads',      sets: 4, repRange: '6-8',   emoji: '🦵', videoUrl: 'https://youtu.be/ultWZbUMPL8', restSeconds: 180 },
      { name: 'Romanian Deadlifts',   muscleGroup: 'Hamstrings', sets: 3, repRange: '8-10',  emoji: '🏗️', videoUrl: 'https://youtu.be/JCXUYuzwNrM', restSeconds: 120 },
      { name: 'Leg Press',            muscleGroup: 'Quads',      sets: 3, repRange: '10-12', emoji: '🖐️', videoUrl: 'https://youtu.be/IZxyjW7MPJQ', restSeconds: 90 },
      { name: 'Leg Curls',            muscleGroup: 'Hamstrings', sets: 3, repRange: '12-15', emoji: '🦿', videoUrl: 'https://youtu.be/n3unkKfBHQ4', restSeconds: 60 },
      { name: 'Standing Calf Raises', muscleGroup: 'Calves',     sets: 4, repRange: '15-20', emoji: '🦶', videoUrl: 'https://youtu.be/JbyjNymZOt0', restSeconds: 45 },
    ],
  },
  {
    dayOfWeek: 2, dayName: 'Wed', label: 'Rest Day', focus: 'Recovery · Sleep · Nutrition',
    color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#334155)',
    isRest: true, exercises: [],
  },
  {
    dayOfWeek: 3, dayName: 'Thu', label: 'Upper B', focus: 'Chest · Back · Arms · Shoulders',
    color: '#7c3aed', gradient: 'linear-gradient(135deg,#6d28d9,#5b21b6)',
    exercises: [
      { name: 'Incline Bench Press', muscleGroup: 'Upper Chest', sets: 4, repRange: '8-10',  emoji: '📐', videoUrl: 'https://youtu.be/jPLdzuHckI8', restSeconds: 120 },
      { name: 'Cable Rows',          muscleGroup: 'Back',        sets: 4, repRange: '10-12', emoji: '🔗', videoUrl: 'https://youtu.be/GZbfZ033f74', restSeconds: 90 },
      { name: 'Lateral Raises',      muscleGroup: 'Shoulders',   sets: 3, repRange: '12-15', emoji: '✈️', videoUrl: 'https://youtu.be/3VcKaXpzqRo', restSeconds: 60 },
      { name: 'Tricep Pushdowns',    muscleGroup: 'Triceps',     sets: 3, repRange: '12-15', emoji: '⬇️', videoUrl: 'https://youtu.be/2-LAMcpzODU', restSeconds: 60 },
      { name: 'Barbell Curls',       muscleGroup: 'Biceps',      sets: 3, repRange: '10-12', emoji: '💪', videoUrl: 'https://youtu.be/ykJmrZ5v0Oo', restSeconds: 60 },
    ],
  },
  {
    dayOfWeek: 4, dayName: 'Fri', label: 'Lower B', focus: 'Posterior Chain · Glutes · Legs',
    color: '#06b6d4', gradient: 'linear-gradient(135deg,#0891b2,#0e7490)',
    exercises: [
      { name: 'Conventional Deadlift',  muscleGroup: 'Back/Glutes', sets: 4, repRange: '4-6',      emoji: '⚡', videoUrl: 'https://youtu.be/op9kVnSso6Q', restSeconds: 180 },
      { name: 'Front Squats',           muscleGroup: 'Quads',       sets: 3, repRange: '8-10',     emoji: '🦵', videoUrl: 'https://youtu.be/uYumuL_G_V0', restSeconds: 120 },
      { name: 'Bulgarian Split Squats', muscleGroup: 'Glutes',      sets: 3, repRange: '8-10/leg', emoji: '🚶', videoUrl: 'https://youtu.be/2C-uNgKwPLE', restSeconds: 90 },
      { name: 'Hip Thrusts',            muscleGroup: 'Glutes',      sets: 3, repRange: '12-15',    emoji: '🍑', videoUrl: 'https://youtu.be/SEdqd1n0cvg', restSeconds: 90 },
      { name: 'Seated Calf Raises',     muscleGroup: 'Calves',      sets: 4, repRange: '15-20',    emoji: '🦶', videoUrl: 'https://youtu.be/JbyjNymZOt0', restSeconds: 45 },
    ],
  },
  {
    dayOfWeek: 5, dayName: 'Sat', label: 'Rest Day', focus: 'Recovery · Sleep · Nutrition',
    color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#334155)',
    isRest: true, exercises: [],
  },
  {
    dayOfWeek: 6, dayName: 'Sun', label: 'Rest Day', focus: 'Recovery · Sleep · Nutrition',
    color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#334155)',
    isRest: true, exercises: [],
  },
]

// ─── Beginner Bodyweight (3-day) ──────────────────────────────────────────────
const BEGINNER_3DAY: ProgrammeDay[] = [
  {
    dayOfWeek: 0, dayName: 'Mon', label: 'Full Body A', focus: 'Push · Hinge · Core',
    color: '#10b981', gradient: 'linear-gradient(135deg,#059669,#047857)',
    exercises: [
      { name: 'Push-ups',          muscleGroup: 'Chest',  sets: 3, repRange: '8-12', emoji: '💪', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
      { name: 'Bodyweight Squats', muscleGroup: 'Quads',  sets: 3, repRange: '15',   emoji: '🦵', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 60 },
      { name: 'Table Rows',        muscleGroup: 'Back',   sets: 3, repRange: '10-12',emoji: '🚣', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 60 },
      { name: 'Plank Hold',        muscleGroup: 'Core',   sets: 3, repRange: '30s',  emoji: '⏱️', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30, isTime: true },
      { name: 'Glute Bridges',     muscleGroup: 'Glutes', sets: 3, repRange: '15',   emoji: '🍑', videoUrl: 'https://youtu.be/SEdqd1n0cvg', restSeconds: 30 },
    ],
  },
  {
    dayOfWeek: 1, dayName: 'Tue', label: 'Rest Day', focus: 'Recovery · Sleep · Nutrition',
    color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#334155)',
    isRest: true, exercises: [],
  },
  {
    dayOfWeek: 2, dayName: 'Wed', label: 'Full Body B', focus: 'Push variation · Squat variation · Anti-rotation',
    color: '#f59e0b', gradient: 'linear-gradient(135deg,#d97706,#b45309)',
    exercises: [
      { name: 'Incline Push-ups', muscleGroup: 'Upper Chest', sets: 3, repRange: '10-15',   emoji: '📐', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
      { name: 'Reverse Lunges',   muscleGroup: 'Glutes',      sets: 3, repRange: '10/leg',  emoji: '🚶', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
      { name: 'Superman Hold',    muscleGroup: 'Lower Back',  sets: 3, repRange: '30s',     emoji: '🦸', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 30, isTime: true },
      { name: 'Side Plank',       muscleGroup: 'Obliques',    sets: 3, repRange: '25s/side', emoji: '↔️', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30, isTime: true },
      { name: 'Hip Thrusts',      muscleGroup: 'Glutes',      sets: 3, repRange: '12-15',   emoji: '⬆️', videoUrl: 'https://youtu.be/SEdqd1n0cvg', restSeconds: 45 },
    ],
  },
  {
    dayOfWeek: 3, dayName: 'Thu', label: 'Rest Day', focus: 'Recovery · Sleep · Nutrition',
    color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#334155)',
    isRest: true, exercises: [],
  },
  {
    dayOfWeek: 4, dayName: 'Fri', label: 'Full Body C', focus: 'Dip · Hinge · Pull · Core endurance',
    color: '#ec4899', gradient: 'linear-gradient(135deg,#db2777,#be185d)',
    exercises: [
      { name: 'Chair Dips',        muscleGroup: 'Triceps',   sets: 3, repRange: '8-12',  emoji: '🪑', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
      { name: 'Step-ups',          muscleGroup: 'Quads',     sets: 3, repRange: '10/leg', emoji: '🪜', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 45 },
      { name: 'Inverted Rows',     muscleGroup: 'Back',      sets: 3, repRange: '8-12',  emoji: '↩️', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 60 },
      { name: 'Hollow Body Hold',  muscleGroup: 'Core',      sets: 3, repRange: '20s',   emoji: '⭕', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30, isTime: true },
      { name: 'Mountain Climbers', muscleGroup: 'Full Body', sets: 3, repRange: '30s',   emoji: '🏔️', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 30, isTime: true },
    ],
  },
  {
    dayOfWeek: 5, dayName: 'Sat', label: 'Rest Day', focus: 'Recovery · Sleep · Nutrition',
    color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#334155)',
    isRest: true, exercises: [],
  },
  {
    dayOfWeek: 6, dayName: 'Sun', label: 'Rest Day', focus: 'Recovery · Sleep · Nutrition',
    color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#334155)',
    isRest: true, exercises: [],
  },
]

const PROGRAMMES: Record<ProgrammeKey, ProgrammeDay[]> = {
  home_6day: HOME_6DAY,
  gym_upper_lower: GYM_UPPER_LOWER,
  beginner_3day: BEGINNER_3DAY,
}

const PROGRAMME_LABELS: Record<ProgrammeKey, string> = {
  home_6day: '🏠 Home 6-Day',
  gym_upper_lower: '🏋️ Gym Upper/Lower',
  beginner_3day: '🌱 Beginner 3-Day',
}

// ─── 12-Week Phases ───────────────────────────────────────────────────────────
const PHASES = [
  { num: 1, weeks: '1–4',  name: 'Fat Loss Foundation', color: '#10b981', sub: 'High frequency · Fat oxidation · Mobility' },
  { num: 2, weeks: '5–8',  name: 'Muscle Growth',        color: '#6366f1', sub: 'Progressive overload · Strength · Volume' },
  { num: 3, weeks: '9–12', name: 'Definition & Power',   color: '#f59e0b', sub: 'HIIT · Circuit · Conditioning' },
]

function getCurrentPhase(programmeWeek: number): 1 | 2 | 3 {
  if (programmeWeek <= 4) return 1
  if (programmeWeek <= 8) return 2
  return 3
}

function buildExerciseLogs(dayIdx: number, key: ProgrammeKey): ExerciseLog[] {
  return PROGRAMMES[key][dayIdx].exercises.map(e => ({
    exerciseName: e.name,
    muscleGroup: e.muscleGroup,
    videoUrl: e.videoUrl,
    sets: Array.from({ length: e.sets }, (_, i) => ({
      setNumber: i + 1,
      weightKg: 0,
      reps: 0,
      completed: false,
      restSeconds: e.restSeconds,
    } satisfies SetLog)),
  }))
}

// ─── Progressive Overload Hint ────────────────────────────────────────────────
type OverloadHint = { type: 'reps' | 'weight'; message: string } | null

function getOverloadHint(
  exerciseName: string,
  def: ExerciseDef,
  lastWeek: DailyWorkout | null,
): OverloadHint {
  if (!lastWeek || def.isTime) return null
  const lastEx = lastWeek.exercises.find(e => e.exerciseName === exerciseName)
  if (!lastEx) return null
  const done = lastEx.sets.filter(s => s.completed)
  if (done.length === 0 || done.length / lastEx.sets.length < 0.9) return null
  const avgReps = done.reduce((t, s) => t + s.reps, 0) / done.length
  const upperRep = parseInt(def.repRange.split('-').pop() ?? '0')
  if (!isNaN(upperRep) && upperRep > 0 && avgReps >= upperRep) {
    return { type: 'weight', message: `↑ +2.5kg — hit ${avgReps.toFixed(0)} reps last week` }
  }
  return { type: 'reps', message: `↑ +2 reps — ${avgReps.toFixed(0)} avg last week` }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorkoutPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [programmeKey, setProgrammeKey] = useState<ProgrammeKey>('home_6day')
  const [selectedDay, setSelectedDay] = useState(() => {
    const dow = new Date().getDay()  // 0=Sun
    const mapped = dow === 0 ? 6 : dow - 1  // 0=Mon
    return Math.min(mapped, 5)
  })
  const [exercises, setExercises] = useState<ExerciseLog[]>([])
  const [lastWeekWorkout, setLastWeekWorkout] = useState<DailyWorkout | null>(null)
  const [startTime] = useState(Date.now())
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [programmeWeek, setProgrammeWeek] = useState(1)
  const [cardioLogged, setCardioLogged] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Derived from state — reactive to programmeKey
  const PROGRAMME = PROGRAMMES[programmeKey]

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      setUid(user.uid)
      const saved = localStorage.getItem(`sbh_week_${user.uid}`)
      setProgrammeWeek(saved ? Math.min(Math.max(parseInt(saved), 1), 12) : 1)
      const profile = await getProfile(user.uid)
      if (profile?.programme) setProgrammeKey(profile.programme)
    })
    return unsub
  }, [router])

  useEffect(() => {
    const day = PROGRAMME[selectedDay]
    if (!day.isRest) setExercises(buildExerciseLogs(selectedDay, programmeKey))
    else setExercises([])
    setCompleted(false)
    setLastWeekWorkout(null)

    // Fetch last week's workout for overload hints
    if (uid && !day.isRest) {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      const lastWeekDateStr = d.toISOString().slice(0, 10)
      getWorkout(uid, lastWeekDateStr).then(w => {
        if (w && w.programmeDay === day.label) setLastWeekWorkout(w)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, uid, programmeKey])

  useEffect(() => {
    if (restTimer === null) return
    if (restTimer <= 0) { setRestTimer(null); return }
    timerRef.current = setInterval(() => setRestTimer(t => (t ?? 0) - 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [restTimer])

  function updateSet(exIdx: number, setIdx: number, field: keyof SetLog, value: number | boolean) {
    setExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value }),
    }))
  }

  function completeSet(exIdx: number, setIdx: number) {
    updateSet(exIdx, setIdx, 'completed', true)
    const rest = exercises[exIdx].sets[setIdx].restSeconds
    if (rest > 0) setRestTimer(rest)
  }

  async function finishWorkout() {
    if (!uid) return
    setSaving(true)
    const durationMinutes = Math.round((Date.now() - startTime) / 60000)
    const totalVolumeKg = exercises.reduce((t, ex) =>
      t + ex.sets.filter(s => s.completed).reduce((tt, s) => tt + s.weightKg * s.reps, 0), 0)
    const prog = PROGRAMME[selectedDay]
    const workout: DailyWorkout = {
      date: new Date().toISOString().slice(0, 10),
      programmeDay: prog.label,
      exercises,
      durationMinutes,
      totalVolumeKg,
      estimatedCaloriesBurned: estimateCaloriesBurned(durationMinutes, 83),
      completedAt: serverTimestamp(),
    }
    await saveWorkout(uid, workout)
    setSaving(false)
    setCompleted(true)
  }

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  // ── Completion screen ────────────────────────────────────────────────────────
  if (completed) {
    const duration = Math.round((Date.now() - startTime) / 60000)
    const volume = exercises.reduce((t, ex) =>
      t + ex.sets.filter(s => s.completed).reduce((tt, s) => tt + s.weightKg * s.reps, 0), 0)
    return (
      <main className="min-h-screen mesh-bg flex items-center justify-center p-5">
        <div className="max-w-sm w-full glass-strong rounded-3xl p-8 text-center space-y-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto glow-violet"
            style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)'}}>
            <Trophy size={36} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-1">Workout Complete!</h2>
            <p className="text-sm font-semibold" style={{color:'#7c3aed'}}>+150 XP earned 🔥</p>
          </div>
          <div className="space-y-2 text-sm glass rounded-2xl p-4">
            {[
              ['Duration', `${duration} min`],
              ['Total Volume', `${volume.toFixed(1)} kg`],
              ['Est. Burned', `${estimateCaloriesBurned(duration, 83)} kcal`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-2">{k}</span>
                <span className="font-semibold" style={{color:'#7c3aed'}}>{v}</span>
              </div>
            ))}
          </div>
          {!cardioLogged && (
            <div className="glass rounded-2xl p-3 text-left">
              <p className="text-xs text-2 mb-2">Don&apos;t forget your daily cardio!</p>
              <button onClick={() => setCardioLogged(true)}
                className="w-full py-2 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2"
                style={{background:'#7c3aed'}}>
                <Heart size={14} /> Log 30-min Cardio Done (+25 XP)
              </button>
            </div>
          )}
          {cardioLogged && <p className="text-xs font-semibold" style={{color:'#7c3aed'}}>✓ Cardio logged! +25 XP</p>}
          <button onClick={() => router.push('/dashboard')}
            className="w-full py-3.5 rounded-2xl font-bold text-white"
            style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow:'0 0 32px -8px #7c3aed60'}}>
            Back to Dashboard
          </button>
        </div>
      </main>
    )
  }

  const prog = PROGRAMME[selectedDay]
  const phase = getCurrentPhase(programmeWeek)
  const currentPhase = PHASES[phase - 1]
  const totalSets = exercises.reduce((t, ex) => t + ex.sets.length, 0)
  const doneSets = exercises.reduce((t, ex) => t + ex.sets.filter(s => s.completed).length, 0)
  const pct = totalSets > 0 ? (doneSets / totalSets) * 100 : 0

  return (
    <main className="min-h-screen mesh-bg page-pad">
      {/* Rest timer banner */}
      {restTimer !== null && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 py-3 font-bold text-sm"
          style={{background:'#f59e0b', color:'#0f172a'}}>
          <Timer size={16} /> Rest: {restTimer}s — breathe deeply
        </div>
      )}

      {/* Header */}
      <header className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{background: currentPhase.color + '20', color: currentPhase.color}}>
            Phase {phase} · Week {programmeWeek}/12
          </span>
          <span className="text-xs text-2">{currentPhase.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full ml-auto"
            style={{background:'rgba(124,58,237,0.12)', color:'#7c3aed'}}>
            {PROGRAMME_LABELS[programmeKey]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Dumbbell size={18} style={{color: prog.color}} />
          <h1 className="text-xl font-bold text-1">{prog.label}</h1>
        </div>
        <p className="text-xs text-2 mt-0.5">{prog.focus}</p>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4">

        {/* 7-day week view */}
        <div className="glass rounded-2xl p-3">
          <div className="grid grid-cols-7 gap-1.5">
            {PROGRAMME.map((p, i) => {
              const isToday = i === selectedDay
              return (
                <button key={i} onClick={() => setSelectedDay(i)}
                  className="flex flex-col items-center gap-1.5 transition-all">
                  <p className="text-xs text-3">{p.dayName}</p>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all"
                    style={{
                      background: isToday ? p.color : p.isRest ? '#0D1526' : p.color + '15',
                      color: isToday ? '#fff' : p.isRest ? '#475569' : p.color,
                      boxShadow: isToday ? `0 0 16px -4px ${p.color}80` : 'none',
                    }}>
                    {p.isRest ? '—' : p.dayName.charAt(0)}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Phase info card */}
        <div className="glass rounded-2xl p-3 border" style={{borderColor: currentPhase.color + '30'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold" style={{color: currentPhase.color}}>
                12-Week Programme · Phase {phase}
              </p>
              <p className="text-xs text-2 mt-0.5">{currentPhase.sub}</p>
            </div>
            <div className="flex items-center gap-1">
              {PHASES.map(ph => (
                <div key={ph.num} className="w-2 h-2 rounded-full transition-all"
                  style={{background: ph.num === phase ? ph.color : '#1a2744'}} />
              ))}
            </div>
          </div>
        </div>

        {/* Rest day */}
        {prog.isRest && (
          <div className="glass-strong rounded-3xl p-8 text-center space-y-3">
            <div className="text-5xl">😴</div>
            <h2 className="text-xl font-bold text-1">Rest Day</h2>
            <p className="text-sm text-2">Recovery is where growth happens. Sleep 7–9hrs, hit 2L water, nail your macros.</p>
            <div className="glass rounded-2xl p-4 text-left space-y-2 text-sm">
              {['💤 Sleep 7–9 hours', '💧 Drink 3L water', '🥩 Hit protein target', '🧘 Optional light stretch'].map(t => (
                <p key={t} className="text-2">{t}</p>
              ))}
            </div>
          </div>
        )}

        {/* Progress bar */}
        {!prog.isRest && totalSets > 0 && (
          <div className="glass rounded-2xl p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-2">Sets completed</span>
              <span className="font-semibold" style={{color: prog.color}}>{doneSets} / {totalSets}</span>
            </div>
            <div className="w-full rounded-full h-2" style={{background:'rgba(255,255,255,0.06)'}}>
              <div className="h-2 rounded-full transition-all duration-500"
                style={{width:`${pct}%`, background: prog.gradient}} />
            </div>
            {pct === 100 && (
              <p className="text-xs mt-2 text-center font-semibold" style={{color:'#10b981'}}>
                All sets done! 🔥 Finish your workout below.
              </p>
            )}
          </div>
        )}

        {/* Progressive overload banner — data-driven */}
        {!prog.isRest && lastWeekWorkout && (
          <div className="glass rounded-2xl p-3 flex items-center gap-3">
            <span className="text-xl">📈</span>
            <div>
              <p className="text-xs font-semibold text-1">Progressive Overload Active</p>
              <p className="text-xs text-2">Per-exercise hints shown based on last week&apos;s performance</p>
            </div>
          </div>
        )}

        {/* Exercise cards */}
        {!prog.isRest && exercises.map((ex, exIdx) => {
          const def = prog.exercises[exIdx]
          const allDone = ex.sets.every(s => s.completed)
          const hint = getOverloadHint(ex.exerciseName, def, lastWeekWorkout)
          return (
            <div key={ex.exerciseName} className="glass rounded-2xl p-4 transition-all"
              style={allDone ? {border: `1px solid ${prog.color}60`} : {}}>
              <div className="flex items-start gap-3 mb-3">
                <div className="ex-thumb" style={{background: prog.color + '18'}}>
                  {def?.emoji ?? '💪'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {allDone && <Check size={13} style={{color: prog.color}} />}
                    <h3 className="font-semibold text-sm truncate" style={{color: allDone ? prog.color : '#f1f5f9'}}>
                      {ex.exerciseName}
                    </h3>
                  </div>
                  <p className="text-xs text-2 mt-0.5">
                    {ex.muscleGroup} · {def?.sets} sets × {def?.repRange} {def?.isTime ? '' : 'reps'}
                  </p>
                  {hint && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 font-medium"
                      style={{
                        background: hint.type === 'weight' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                        color: hint.type === 'weight' ? '#f59e0b' : '#10b981',
                      }}>
                      {hint.message}
                    </span>
                  )}
                </div>
                {ex.videoUrl && (
                  <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs shrink-0 px-2 py-1 rounded-lg glass"
                    style={{color: prog.color}}>
                    <Play size={11} fill="currentColor" /> Watch
                  </a>
                )}
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-xs text-3 text-center px-1">
                  <span>Set</span>
                  <span>{def?.isTime ? 'sec' : 'kg'}</span>
                  <span>{def?.isTime ? 'done' : 'reps'}</span>
                  <span>✓</span>
                </div>
                {ex.sets.map((set, setIdx) => (
                  <div key={setIdx} className={`grid grid-cols-4 gap-2 items-center ${set.completed ? 'opacity-40' : ''}`}>
                    <span className="text-center text-xs text-2">#{set.setNumber}</span>
                    {def?.isTime ? (
                      <span className="text-center text-xs text-2 col-span-2">{def.repRange}</span>
                    ) : (
                      <>
                        <input type="number" step="0.5" value={set.weightKg || ''}
                          onChange={e => updateSet(exIdx, setIdx, 'weightKg', Number(e.target.value))}
                          disabled={set.completed} placeholder="0"
                          className="px-2 py-1.5 rounded-lg text-sm text-1 text-center outline-none w-full glass"
                          style={{background:'rgba(255,255,255,0.04)'}}
                        />
                        <input type="number" value={set.reps || ''}
                          onChange={e => updateSet(exIdx, setIdx, 'reps', Number(e.target.value))}
                          disabled={set.completed} placeholder="0"
                          className="px-2 py-1.5 rounded-lg text-sm text-1 text-center outline-none w-full glass"
                          style={{background:'rgba(255,255,255,0.04)'}}
                        />
                      </>
                    )}
                    <button onClick={() => completeSet(exIdx, setIdx)} disabled={set.completed}
                      className="w-9 h-9 mx-auto rounded-full text-sm font-bold transition-all flex items-center justify-center"
                      style={{
                        background: set.completed ? prog.color + '25' : 'rgba(255,255,255,0.06)',
                        color: set.completed ? prog.color : '#94a3b8',
                      }}>
                      {set.completed ? <Check size={14} /> : '○'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Video references */}
        {!prog.isRest && (
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-2 font-semibold uppercase tracking-widest mb-3">Reference Videos</p>
            <div className="space-y-2">
              {[
                { label: 'Full Body Fat Loss', url: 'https://youtu.be/hJh4ze7s3GQ' },
                { label: 'Muscle Building Bodyweight', url: 'https://youtu.be/B12MXF0bSFo' },
                { label: 'Core & Abs', url: 'https://youtu.be/W7seSnZ1k1A' },
                { label: 'HIIT Fat Burning', url: 'https://youtu.be/QyCFeB8mBz8' },
              ].map(v => (
                <a key={v.url} href={v.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl glass hover:bg-white/10 transition-all">
                  <span className="text-xs text-1">{v.label}</span>
                  <ExternalLink size={12} className="text-2" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Week selector */}
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-2 font-semibold uppercase tracking-widest mb-3">Programme Week</p>
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({length: 12}, (_, i) => i + 1).map(w => {
              const ph = getCurrentPhase(w)
              const phColor = PHASES[ph - 1].color
              return (
                <button key={w} onClick={() => {
                  setProgrammeWeek(w)
                  if (uid) localStorage.setItem(`sbh_week_${uid}`, String(w))
                }}
                  className="py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: programmeWeek === w ? phColor : phColor + '15',
                    color: programmeWeek === w ? '#fff' : phColor,
                  }}>
                  W{w}
                </button>
              )
            })}
          </div>
          <div className="flex gap-3 mt-2 text-xs text-3">
            {PHASES.map(p => (
              <span key={p.num} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{background: p.color}} />
                P{p.num}: Wk{p.weeks}
              </span>
            ))}
          </div>
        </div>

        {!prog.isRest && (
          <button onClick={finishWorkout} disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white disabled:opacity-50 transition-opacity"
            style={{background: prog.gradient, boxShadow:`0 0 32px -8px ${prog.color}60`}}>
            {saving ? 'Saving...' : '🏁 Finish Workout + Log'}
          </button>
        )}

        <div className="text-center text-xs text-3 pb-4 flex items-center justify-center gap-1">
          <ChevronRight size={10} />
          SBH Training System
        </div>
      </div>
    </main>
  )
}
