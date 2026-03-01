import { ActivityLevel, CalcResult, Goal } from './types'

// ─── Activity Multipliers ─────────────────────────────────────────────────────
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
}

// ─── BMR (Mifflin-St Jeor — most accurate for South Asian males) ──────────────
export function calcBMR(weightKg: number, heightCm: number, age: number, sex: 'male' | 'female'): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(sex === 'male' ? base + 5 : base - 161)
}

// ─── TDEE ─────────────────────────────────────────────────────────────────────
export function calcTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel])
}

// ─── Calorie Target by Goal ───────────────────────────────────────────────────
export function calcCalorieTarget(tdee: number, goal: Goal): number {
  switch (goal) {
    case 'fat_loss':
      return Math.round(tdee - 500)
    case 'muscle_gain':
      return Math.round(tdee + 250)
    case 'recomp':
      return tdee
    case 'endurance':
      return Math.round(tdee - 200)
  }
}

// ─── Macros ───────────────────────────────────────────────────────────────────
export function calcMacros(totalCalories: number, weightKg: number) {
  // Protein: 2.0g/kg (BWS research-backed for muscle preservation on deficit)
  const proteinTargetG = Math.round(weightKg * 2.0)
  // Fat: 25% of total calories
  const fatTargetG = Math.round((totalCalories * 0.25) / 9)
  // Carbs: remainder
  const proteinCals = proteinTargetG * 4
  const fatCals = fatTargetG * 9
  const carbTargetG = Math.round((totalCalories - proteinCals - fatCals) / 4)

  return { proteinTargetG, fatTargetG, carbTargetG }
}

// ─── BMI ──────────────────────────────────────────────────────────────────────
export function calcBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25.0) return 'Normal'
  if (bmi < 30.0) return 'Overweight'
  if (bmi < 35.0) return 'Obese Class I'
  if (bmi < 40.0) return 'Obese Class II'
  return 'Obese Class III'
}

// ─── Full Calculation ─────────────────────────────────────────────────────────
export function calcAll(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'male' | 'female',
  activityLevel: ActivityLevel,
  goal: Goal,
): CalcResult {
  const bmr = calcBMR(weightKg, heightCm, age, sex)
  const tdee = calcTDEE(bmr, activityLevel)
  const calorieTarget = calcCalorieTarget(tdee, goal)
  const macros = calcMacros(calorieTarget, weightKg)

  return { bmr, tdee, calorieTarget, ...macros }
}

// ─── Weekly Weight Rate of Change ────────────────────────────────────────────
export function calcWeeklyRate(weightStart: number, weightEnd: number, days: number): number {
  if (days === 0) return 0
  const totalChange = weightEnd - weightStart
  return Math.round((totalChange / days) * 7 * 100) / 100 // kg/week
}

export function getWeightAlert(kgPerWeek: number): string | null {
  if (kgPerWeek < -1.0) return 'Losing > 1kg/week — risk of muscle loss. Consider increasing calories by 200-300 kcal.'
  if (kgPerWeek > 0.75) return 'Gaining faster than target. Consider a slight calorie reduction.'
  return null
}

// ─── 7-Day Moving Average ─────────────────────────────────────────────────────
export function movingAverage(values: number[], window = 7): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = values.slice(start, i + 1)
    return Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 10) / 10
  })
}

// ─── Estimated Calories Burned (workout) ─────────────────────────────────────
export function estimateCaloriesBurned(durationMinutes: number, weightKg: number, intensityMET = 5): number {
  // MET formula: kcal = MET × weight(kg) × time(hours)
  return Math.round(intensityMET * weightKg * (durationMinutes / 60))
}
