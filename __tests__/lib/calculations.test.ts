import { describe, it, expect } from 'vitest'
import { calcBMR, calcTDEE, calcMacros } from '@/lib/health/calculations'

describe('calcBMR', () => {
  it('male BMR (Mifflin-St Jeor)', () => {
    expect(calcBMR(83, 165, 43, 'male')).toBeCloseTo(1651, 0)
  })
  it('female BMR', () => {
    expect(calcBMR(60, 165, 30, 'female')).toBeCloseTo(1320, 0)
  })
})

describe('calcTDEE', () => {
  it('moderate multiplier 1.55', () => {
    expect(calcTDEE(1651, 'moderate')).toBeCloseTo(1651 * 1.55, 0)
  })
  it('sedentary multiplier 1.2', () => {
    expect(calcTDEE(1651, 'sedentary')).toBeCloseTo(1651 * 1.2, 0)
  })
})

describe('calcMacros', () => {
  it('protein = weight × 2g', () => {
    const m = calcMacros(2000, 80)
    expect(m.proteinTargetG).toBe(160)
  })
  it('macro calories sum ≈ total', () => {
    const m = calcMacros(2000, 80)
    const total = m.proteinTargetG * 4 + m.carbTargetG * 4 + m.fatTargetG * 9
    expect(total).toBeCloseTo(2000, -1)
  })
})
