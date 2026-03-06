import { describe, it, expect } from 'vitest'
import {
  calcBMI, getBMICategory,
  calcBodyFatPct,
  getBodyFatCategory,
  calcLeanMassKg, calcFatMassKg,
  calcWaistToHeightRatio, getWaistToHeightRisk,
  calcIdealWeightKg,
} from '@/lib/health/bodyUtils'

// ── calcBMI ───────────────────────────────────────────────────────────────────

describe('calcBMI', () => {
  it('returns correct BMI for known values', () => {
    // 80 kg, 180 cm → 80 / (1.8²) = 24.7
    expect(calcBMI(80, 180)).toBe(24.7)
  })

  it('returns correct BMI for Pav profile (83kg, 165cm)', () => {
    // 83 / (1.65²) = 30.5
    expect(calcBMI(83, 165)).toBe(30.5)
  })

  it('returns 0 for invalid height', () => {
    expect(calcBMI(80, 0)).toBe(0)
    expect(calcBMI(80, -10)).toBe(0)
  })
})

// ── getBMICategory ────────────────────────────────────────────────────────────

describe('getBMICategory', () => {
  it('classifies underweight', () => {
    expect(getBMICategory(17).label).toBe('Underweight')
  })

  it('classifies healthy', () => {
    expect(getBMICategory(22).label).toBe('Healthy')
  })

  it('classifies overweight', () => {
    expect(getBMICategory(27).label).toBe('Overweight')
  })

  it('classifies obese', () => {
    expect(getBMICategory(32).label).toBe('Obese')
  })

  it('returns a color and recommendation for all categories', () => {
    for (const bmi of [16, 22, 27, 32]) {
      const cat = getBMICategory(bmi)
      expect(cat.color).toBeTruthy()
      expect(cat.recommendation).toBeTruthy()
    }
  })
})

// ── calcBodyFatPct ────────────────────────────────────────────────────────────

describe('calcBodyFatPct', () => {
  it('returns a reasonable body fat % for a male', () => {
    // Typical values: height 180cm, waist 90cm, neck 38cm
    const pct = calcBodyFatPct('male', 180, 90, 38)
    expect(pct).not.toBeNull()
    expect(pct!).toBeGreaterThan(5)
    expect(pct!).toBeLessThan(40)
  })

  it('returns a reasonable body fat % for a female', () => {
    const pct = calcBodyFatPct('female', 165, 80, 33, 95)
    expect(pct).not.toBeNull()
    expect(pct!).toBeGreaterThan(10)
    expect(pct!).toBeLessThan(65)
  })

  it('returns null when female hips not provided', () => {
    expect(calcBodyFatPct('female', 165, 80, 33)).toBeNull()
  })

  it('returns null for invalid measurements', () => {
    expect(calcBodyFatPct('male', 0, 90, 38)).toBeNull()
    expect(calcBodyFatPct('male', 180, 0, 38)).toBeNull()
    expect(calcBodyFatPct('male', 180, 90, 0)).toBeNull()
  })

  it('is deterministic', () => {
    const a = calcBodyFatPct('male', 180, 90, 38)
    const b = calcBodyFatPct('male', 180, 90, 38)
    expect(a).toBe(b)
  })
})

// ── getBodyFatCategory ────────────────────────────────────────────────────────

describe('getBodyFatCategory', () => {
  it('classifies male essential fat', () => {
    expect(getBodyFatCategory(4, 'male').label).toBe('Essential fat')
  })

  it('classifies male athlete', () => {
    expect(getBodyFatCategory(10, 'male').label).toBe('Athletes')
  })

  it('classifies male fitness', () => {
    expect(getBodyFatCategory(16, 'male').label).toBe('Fitness')
  })

  it('classifies male acceptable', () => {
    expect(getBodyFatCategory(22, 'male').label).toBe('Acceptable')
  })

  it('classifies male obese', () => {
    expect(getBodyFatCategory(30, 'male').label).toBe('Obese')
  })

  it('classifies female athletes', () => {
    expect(getBodyFatCategory(17, 'female').label).toBe('Athletes')
  })

  it('classifies female obese', () => {
    expect(getBodyFatCategory(35, 'female').label).toBe('Obese')
  })

  it('returns a color for all categories', () => {
    for (const pct of [4, 10, 16, 22, 30]) {
      expect(getBodyFatCategory(pct, 'male').color).toBeTruthy()
    }
  })
})

// ── calcLeanMassKg / calcFatMassKg ────────────────────────────────────────────

describe('calcLeanMassKg', () => {
  it('calculates lean mass correctly', () => {
    // 80kg at 20% body fat → 64kg lean mass
    expect(calcLeanMassKg(80, 20)).toBe(64)
  })

  it('lean + fat = total weight', () => {
    const lean = calcLeanMassKg(80, 20)
    const fat  = calcFatMassKg(80, 20)
    expect(lean + fat).toBeCloseTo(80, 1)
  })
})

describe('calcFatMassKg', () => {
  it('calculates fat mass correctly', () => {
    // 80kg at 20% body fat → 16kg fat
    expect(calcFatMassKg(80, 20)).toBe(16)
  })
})

// ── calcWaistToHeightRatio ────────────────────────────────────────────────────

describe('calcWaistToHeightRatio', () => {
  it('calculates ratio correctly', () => {
    expect(calcWaistToHeightRatio(90, 180)).toBe(0.5)
  })

  it('returns 0 for invalid height', () => {
    expect(calcWaistToHeightRatio(90, 0)).toBe(0)
  })
})

describe('getWaistToHeightRisk', () => {
  it('classifies very slim', () => {
    expect(getWaistToHeightRisk(0.40).label).toBe('Very slim')
  })

  it('classifies healthy', () => {
    expect(getWaistToHeightRisk(0.50).label).toBe('Healthy')
  })

  it('classifies overweight', () => {
    expect(getWaistToHeightRisk(0.55).label).toBe('Overweight')
  })

  it('classifies morbidly obese risk', () => {
    expect(getWaistToHeightRisk(0.65).label).toBe('Morbidly obese risk')
  })
})

// ── calcIdealWeightKg ─────────────────────────────────────────────────────────

describe('calcIdealWeightKg', () => {
  it('returns a range for a male 180cm', () => {
    const { low, high } = calcIdealWeightKg('male', 180)
    expect(low).toBeLessThan(high)
    expect(low).toBeGreaterThan(50)
    expect(high).toBeLessThan(100)
  })

  it('female range is lower than male for same height', () => {
    const male   = calcIdealWeightKg('male',   170)
    const female = calcIdealWeightKg('female', 170)
    expect(female.high).toBeLessThan(male.high)
  })

  it('clamps to base weight for heights at or below 5 ft', () => {
    const { low, high } = calcIdealWeightKg('male', 150) // below 5ft (152.4cm)
    expect(low).toBe(45)
    expect(high).toBe(55)
  })
})
