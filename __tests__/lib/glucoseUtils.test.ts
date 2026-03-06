import { describe, it, expect } from 'vitest'
import {
  mmolToMgdl, mgdlToMmol, displayGlucose, estimateHbA1c,
  calcGL, calcTimeInRange, hasMealTimingRisk, giCategory, glucoseColor,
  DEFAULT_GLUCOSE_SETTINGS,
} from '@/lib/health/glucoseUtils'
import type { GlucoseReading, MealWithGI } from '@/lib/types'

describe('mmolToMgdl', () => {
  it('converts 5.0 mmol/L to ~90 mg/dL', () => {
    expect(mmolToMgdl(5.0)).toBe(90)
  })
  it('converts 3.9 mmol/L to ~70 mg/dL', () => {
    expect(mmolToMgdl(3.9)).toBe(70)
  })
})

describe('mgdlToMmol', () => {
  it('converts 90 mg/dL to ~5.0 mmol/L', () => {
    expect(mgdlToMmol(90)).toBeCloseTo(5.0, 1)
  })
  it('is inverse of mmolToMgdl (within rounding)', () => {
    expect(mgdlToMmol(mmolToMgdl(7.0))).toBeCloseTo(7.0, 1)
  })
})

describe('displayGlucose', () => {
  it('returns mmol/L string', () => {
    expect(displayGlucose(5.5, 'mmol/L')).toBe('5.5 mmol/L')
  })
  it('returns mg/dL string', () => {
    expect(displayGlucose(5.5, 'mg/dL')).toContain('mg/dL')
  })
})

describe('estimateHbA1c', () => {
  it('returns ~5.4% for avg 6.0 mmol/L', () => {
    // Nathan formula: (avgMgdl + 46.7) / 28.7
    const result = estimateHbA1c(6.0)
    expect(result).toBeCloseTo(5.4, 1)
    // Nathan formula check
  })
})

describe('calcGL', () => {
  it('calculates glycaemic load correctly', () => {
    // White rice: GI=72, carbs=45g, fibre=1g → GL = 72 * 44 / 100 = 31.68
    expect(calcGL(72, 45, 1)).toBeCloseTo(31.7, 0)
  })
  it('returns 0 for 0 carbs', () => {
    expect(calcGL(50, 0, 0)).toBe(0)
  })
})

describe('calcTimeInRange', () => {
  const makeReading = (v: number): GlucoseReading => ({
    id: v.toString(), time: '12:00', valueMmol: v, context: 'fasting',
  })

  it('calculates correct percentages', () => {
    const readings = [3.5, 5.0, 5.5, 11.0].map(makeReading)
    const result = calcTimeInRange(readings, 4.0, 8.0)
    expect(result.belowPct).toBe(25)
    expect(result.inRangePct).toBe(50)
    expect(result.abovePct).toBe(25)
    expect(result.total).toBe(4)
  })

  it('returns 0% for empty readings', () => {
    const result = calcTimeInRange([], 4.0, 8.0)
    expect(result.inRangePct).toBe(0)
    expect(result.total).toBe(0)
  })

  it('returns 100% in-range when all readings are in range', () => {
    const result = calcTimeInRange([5.0, 6.0, 7.0].map(makeReading), 4.0, 8.0)
    expect(result.inRangePct).toBe(100)
  })
})

describe('hasMealTimingRisk', () => {
  const makeMeal = (time: string, gl: number): MealWithGI => ({
    id: time, name: 'food', calories: 400, proteinG: 20, carbsG: 50, fatG: 10,
    time, mealType: 'lunch', glEstimate: gl,
  })

  it('flags risk when two high-GL meals are within 2 hours', () => {
    const meals = [makeMeal('12:00', 20), makeMeal('13:00', 18)]
    expect(hasMealTimingRisk(meals)).toBe(true)
  })

  it('no risk when meals are more than 2 hours apart', () => {
    const meals = [makeMeal('12:00', 20), makeMeal('14:30', 18)]
    expect(hasMealTimingRisk(meals)).toBe(false)
  })

  it('no risk when GL is below threshold', () => {
    const meals = [makeMeal('12:00', 10), makeMeal('12:30', 10)]
    expect(hasMealTimingRisk(meals)).toBe(false)
  })
})

describe('giCategory', () => {
  it('labels low GI correctly', () => expect(giCategory(30).label).toBe('Low GI'))
  it('labels medium GI correctly', () => expect(giCategory(57).label).toBe('Medium GI'))
  it('labels high GI correctly', () => expect(giCategory(75).label).toBe('High GI'))
})

describe('glucoseColor', () => {
  it('returns rose for hypo reading', () => {
    expect(glucoseColor(3.5, DEFAULT_GLUCOSE_SETTINGS)).toContain('f43f5e')
  })
  it('returns emerald for in-range reading', () => {
    expect(glucoseColor(5.5, DEFAULT_GLUCOSE_SETTINGS)).toContain('10b981')
  })
  it('returns amber for hyper reading', () => {
    expect(glucoseColor(12.0, DEFAULT_GLUCOSE_SETTINGS)).toContain('f59e0b')
  })
})
