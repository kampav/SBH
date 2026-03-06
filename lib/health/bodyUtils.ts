// lib/health/bodyUtils.ts
// Pure helpers for body composition calculations.
// No Firebase / Next.js dependencies — fully unit-testable.

// ── BMI ───────────────────────────────────────────────────────────────────────

export function calcBMI(weightKg: number, heightCm: number): number {
  if (heightCm <= 0) return 0
  return Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10
}

export interface BMICategory {
  label: string
  color: string
  recommendation: string
}

export function getBMICategory(bmi: number): BMICategory {
  if (bmi < 18.5) return { label: 'Underweight', color: '#06b6d4', recommendation: 'Consider a muscle-gain programme with a calorie surplus.' }
  if (bmi < 25.0) return { label: 'Healthy',     color: '#10b981', recommendation: 'Maintain current weight through balanced nutrition and exercise.' }
  if (bmi < 30.0) return { label: 'Overweight',  color: '#f59e0b', recommendation: 'A modest calorie deficit (300–500 kcal) and progressive training can help.' }
  return              { label: 'Obese',        color: '#f43f5e', recommendation: 'Speak to your healthcare provider for a personalised plan.' }
}

// ── Body fat % — US Navy circumference method ──────────────────────────────────
// Male:   %BF = 86.010 × log10(waist − neck) − 70.041 × log10(height) + 36.76
// Female: %BF = 163.205 × log10(waist + hips − neck) − 97.684 × log10(height) − 78.387
// All measurements in cm.

export function calcBodyFatPct(
  sex: 'male' | 'female',
  heightCm: number,
  waistCm: number,
  neckCm: number,
  hipsCm?: number,
): number | null {
  if (heightCm <= 0 || waistCm <= 0 || neckCm <= 0) return null
  try {
    if (sex === 'male') {
      const val = 86.010 * Math.log10(waistCm - neckCm) - 70.041 * Math.log10(heightCm) + 36.76
      return Math.round(val * 10) / 10
    } else {
      if (!hipsCm || hipsCm <= 0) return null
      const val = 163.205 * Math.log10(waistCm + hipsCm - neckCm) - 97.684 * Math.log10(heightCm) - 78.387
      return Math.round(val * 10) / 10
    }
  } catch {
    return null
  }
}

// ── Body fat category ──────────────────────────────────────────────────────────

export interface BodyFatCategory {
  label: string
  color: string
}

export function getBodyFatCategory(pct: number, sex: 'male' | 'female'): BodyFatCategory {
  if (sex === 'male') {
    if (pct <  6) return { label: 'Essential fat',  color: '#f43f5e' }
    if (pct < 14) return { label: 'Athletes',       color: '#06b6d4' }
    if (pct < 18) return { label: 'Fitness',        color: '#10b981' }
    if (pct < 25) return { label: 'Acceptable',     color: '#f59e0b' }
    return              { label: 'Obese',            color: '#f43f5e' }
  } else {
    if (pct < 14) return { label: 'Essential fat',  color: '#f43f5e' }
    if (pct < 21) return { label: 'Athletes',       color: '#06b6d4' }
    if (pct < 25) return { label: 'Fitness',        color: '#10b981' }
    if (pct < 32) return { label: 'Acceptable',     color: '#f59e0b' }
    return              { label: 'Obese',            color: '#f43f5e' }
  }
}

// ── Lean mass ─────────────────────────────────────────────────────────────────

export function calcLeanMassKg(weightKg: number, bodyFatPct: number): number {
  return Math.round(weightKg * (1 - bodyFatPct / 100) * 10) / 10
}

export function calcFatMassKg(weightKg: number, bodyFatPct: number): number {
  return Math.round(weightKg * (bodyFatPct / 100) * 10) / 10
}

// ── Waist-to-height ratio ─────────────────────────────────────────────────────

export function calcWaistToHeightRatio(waistCm: number, heightCm: number): number {
  if (heightCm <= 0) return 0
  return Math.round((waistCm / heightCm) * 1000) / 1000
}

export function getWaistToHeightRisk(ratio: number): { label: string; color: string } {
  if (ratio < 0.43) return { label: 'Very slim',            color: '#06b6d4' }
  if (ratio < 0.53) return { label: 'Healthy',              color: '#10b981' }
  if (ratio < 0.58) return { label: 'Overweight',           color: '#f59e0b' }
  if (ratio < 0.63) return { label: 'Very overweight',      color: '#f97316' }
  return              { label: 'Morbidly obese risk',        color: '#f43f5e' }
}

// ── Ideal weight ranges (Devine formula) ──────────────────────────────────────

export function calcIdealWeightKg(sex: 'male' | 'female', heightCm: number): { low: number; high: number } {
  const inchesOverFiveFt = Math.max(0, (heightCm / 2.54) - 60)
  const base = sex === 'male' ? 50 : 45.5
  const mid  = Math.round((base + 2.3 * inchesOverFiveFt) * 10) / 10
  return { low: Math.round((mid - 5) * 10) / 10, high: Math.round((mid + 5) * 10) / 10 }
}
