// lib/progressive-overload.ts
// Progressive overload engine for workout suggestions.
// Logic: if all sets completed at target reps → suggest +2.5kg (upper), +5kg (lower)
//        if last set underperformed by >2 reps → maintain weight
//        deload: 90% of last peak every 4 weeks (tracked via workoutCount)

import { SetLog } from '../types'

export interface ProgressionSuggestion {
  suggestedWeightKg: number | null
  suggestedReps: number
  note: string
  action: 'increase' | 'maintain' | 'deload' | 'start'
}

const LOWER_BODY_EXERCISES = [
  'squat', 'deadlift', 'leg press', 'romanian', 'rdl', 'hip thrust',
  'lunge', 'step up', 'leg curl', 'leg extension', 'calf raise', 'glute bridge',
]

function isLowerBody(exerciseName: string): boolean {
  const lower = exerciseName.toLowerCase()
  return LOWER_BODY_EXERCISES.some(k => lower.includes(k))
}

function incrementKg(exerciseName: string): number {
  return isLowerBody(exerciseName) ? 5 : 2.5
}

/**
 * Given the previous session's sets for an exercise, return a progression suggestion.
 * @param lastSets   Sets from the most recent completed session
 * @param exerciseName  Name of the exercise
 * @param targetReps    Target rep count for the exercise
 * @param workoutCount  Total number of times this exercise has been logged (for deload detection)
 */
export function getSuggestion(
  lastSets: SetLog[],
  exerciseName: string,
  targetReps: number,
  workoutCount: number,
): ProgressionSuggestion {
  if (!lastSets || lastSets.length === 0) {
    return { suggestedWeightKg: null, suggestedReps: targetReps, note: 'First time — start light and focus on form', action: 'start' }
  }

  // Deload every 4th week (approximately every 12 workouts if 3x/week)
  if (workoutCount > 0 && workoutCount % 12 === 0) {
    const peakWeight = Math.max(...lastSets.map(s => s.weightKg))
    const deloadWeight = Math.round(peakWeight * 0.9 * 4) / 4  // round to nearest 0.25kg
    return {
      suggestedWeightKg: deloadWeight,
      suggestedReps: targetReps,
      note: 'Deload week — 90% of last weight. Prioritise form.',
      action: 'deload',
    }
  }

  const completedSets = lastSets.filter(s => s.completed)
  if (completedSets.length === 0) {
    const w = lastSets[0]?.weightKg ?? null
    return { suggestedWeightKg: w, suggestedReps: targetReps, note: 'Repeat same weight — complete all sets first', action: 'maintain' }
  }

  const lastWeight = completedSets[completedSets.length - 1].weightKg
  const lastReps = completedSets[completedSets.length - 1].reps
  const allSetsCompleted = completedSets.length >= lastSets.length

  // If last set underperformed by >2 reps — maintain
  if (lastReps < targetReps - 2) {
    return {
      suggestedWeightKg: lastWeight,
      suggestedReps: targetReps,
      note: 'Maintain — hit target reps before adding weight',
      action: 'maintain',
    }
  }

  // All sets completed at or above target reps — increase
  if (allSetsCompleted && lastReps >= targetReps) {
    const newWeight = lastWeight + incrementKg(exerciseName)
    return {
      suggestedWeightKg: newWeight,
      suggestedReps: targetReps,
      note: `Great work! Try ${newWeight}kg this session`,
      action: 'increase',
    }
  }

  // Some sets completed but not all — maintain
  return {
    suggestedWeightKg: lastWeight,
    suggestedReps: targetReps,
    note: 'Complete all sets at this weight before progressing',
    action: 'maintain',
  }
}

/**
 * Format suggestion into a display string.
 */
export function formatSuggestion(s: ProgressionSuggestion): string {
  if (s.action === 'start') return s.note
  if (s.suggestedWeightKg == null) return s.note
  const prefix = s.action === 'increase' ? '↑ ' : s.action === 'deload' ? '↓ ' : ''
  return `${prefix}${s.suggestedWeightKg}kg × ${s.suggestedReps}`
}
