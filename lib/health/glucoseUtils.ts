import { GlucoseReading, GlucoseSettings, MealWithGI } from '../types'

export const DEFAULT_GLUCOSE_SETTINGS: GlucoseSettings = {
  hypoThresholdMmol: 3.9,
  hyperThresholdMmol: 10.0,
  targetRangeLowMmol: 4.0,
  targetRangeHighMmol: 8.0,
  dailyCarbBudgetG: 130,
  preferredUnit: 'mmol/L',
  consentGiven: false,
}

export function mmolToMgdl(mmol: number): number {
  return Math.round(mmol * 18.016)
}

export function mgdlToMmol(mgdl: number): number {
  return Math.round((mgdl / 18.016) * 10) / 10
}

export function displayGlucose(mmol: number, unit: 'mmol/L' | 'mg/dL'): string {
  if (unit === 'mg/dL') return `${mmolToMgdl(mmol)} mg/dL`
  return `${mmol.toFixed(1)} mmol/L`
}

// Nathan formula: HbA1c (%) = (avgGlucoseMgdl + 46.7) / 28.7
export function estimateHbA1c(avgMmol: number): number {
  const avgMgdl = mmolToMgdl(avgMmol)
  return Math.round(((avgMgdl + 46.7) / 28.7) * 10) / 10
}

// Glycaemic Load = (GI × net carbs) / 100
export function calcGL(gi: number, carbsG: number, fibreG: number = 0): number {
  const netCarbs = Math.max(0, carbsG - fibreG)
  return Math.round((gi * netCarbs) / 100 * 10) / 10
}

export function calcTimeInRange(
  readings: GlucoseReading[],
  lowMmol: number,
  highMmol: number
): { inRangePct: number; belowPct: number; abovePct: number; total: number } {
  if (readings.length === 0) return { inRangePct: 0, belowPct: 0, abovePct: 0, total: 0 }
  const total = readings.length
  const inRange = readings.filter(r => r.valueMmol >= lowMmol && r.valueMmol <= highMmol).length
  const below = readings.filter(r => r.valueMmol < lowMmol).length
  const above = readings.filter(r => r.valueMmol > highMmol).length
  return {
    inRangePct: Math.round((inRange / total) * 100),
    belowPct: Math.round((below / total) * 100),
    abovePct: Math.round((above / total) * 100),
    total,
  }
}

// Returns true if two high-GL meals (GL >= 15) are logged within 2 hours of each other
export function hasMealTimingRisk(meals: MealWithGI[]): boolean {
  const highGL = meals
    .filter(m => (m.glEstimate ?? 0) >= 15)
    .sort((a, b) => a.time.localeCompare(b.time))
  for (let i = 1; i < highGL.length; i++) {
    const [h1, m1] = highGL[i - 1].time.split(':').map(Number)
    const [h2, m2] = highGL[i].time.split(':').map(Number)
    const diffMins = (h2 * 60 + m2) - (h1 * 60 + m1)
    if (diffMins < 120) return true
  }
  return false
}

// GI category label
export function giCategory(gi: number): { label: string; color: string } {
  if (gi <= 55) return { label: 'Low GI', color: '#10b981' }
  if (gi <= 69) return { label: 'Medium GI', color: '#f59e0b' }
  return { label: 'High GI', color: '#f43f5e' }
}

// Glucose reading status colour
export function glucoseColor(mmol: number, settings: GlucoseSettings): string {
  if (mmol < settings.hypoThresholdMmol) return '#f43f5e'
  if (mmol > settings.hyperThresholdMmol) return '#f59e0b'
  return '#10b981'
}

// Context display label
export function contextLabel(context: GlucoseReading['context']): string {
  const map: Record<GlucoseReading['context'], string> = {
    fasting: 'Fasting',
    pre_meal: 'Pre-meal',
    post_meal_1h: '1h post-meal',
    post_meal_2h: '2h post-meal',
    bedtime: 'Bedtime',
    other: 'Other',
  }
  return map[context]
}
