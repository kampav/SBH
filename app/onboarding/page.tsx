'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { saveProfile } from '@/lib/firebase/firestore'
import { calcAll } from '@/lib/health/calculations'
import { ActivityLevel, Goal, UserConsents, ConditionKey, ConditionProfile } from '@/lib/types'
import { serverTimestamp } from 'firebase/firestore'
import Link from 'next/link'

const CONSENT_VERSION = '2026-03'

type Step = 'goal' | 'metrics' | 'activity' | 'confirm' | 'conditions' | 'consent'

const CONDITION_OPTIONS: Array<{ key: ConditionKey; label: string; emoji: string }> = [
  { key: 'type2_diabetes',  label: 'Type 2 Diabetes',     emoji: '🩸' },
  { key: 'prediabetes',     label: 'Prediabetes',          emoji: '⚠️' },
  { key: 'hypertension',    label: 'High Blood Pressure',  emoji: '❤️' },
  { key: 'pcos',            label: 'PCOS',                 emoji: '🔄' },
  { key: 'hypothyroidism',  label: 'Hypothyroidism',       emoji: '🦋' },
  { key: 'anxiety',         label: 'Anxiety',              emoji: '🧠' },
  { key: 'depression',      label: 'Depression',           emoji: '💙' },
  { key: 'ibs',             label: 'IBS / Gut Issues',     emoji: '🌿' },
  { key: 'heart_disease',   label: 'Heart Disease',        emoji: '💗' },
  { key: 'obesity',         label: 'Obesity (BMI ≥ 30)',   emoji: '⚖️' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [step, setStep] = useState<Step>('goal')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    goal: 'fat_loss' as Goal,
    activityLevel: 'moderate' as ActivityLevel,
    age: 30,
    sex: 'male' as 'male' | 'female',
    heightCm: 170,
    weightKg: 80,
    targetWeightKg: 70,
  })

  // Condition state (Phase 13)
  const [selectedConditions, setSelectedConditions] = useState<ConditionKey[]>([])
  const [diagnosedByDoctor, setDiagnosedByDoctor]   = useState(false)
  const [onMedication, setOnMedication]               = useState(false)

  function toggleCondition(key: ConditionKey) {
    setSelectedConditions(prev =>
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    )
  }

  // Consent state
  const [termsAccepted,     setTermsAccepted]     = useState(false)
  const [privacyAccepted,   setPrivacyAccepted]   = useState(false)
  const [healthDataConsent, setHealthDataConsent] = useState(false)
  const [ageVerified,       setAgeVerified]       = useState(false)
  const [marketingConsent,  setMarketingConsent]  = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setAuthReady(true)
      if (!user) router.push('/login')
      else setUid(user.uid)
    })
    return unsub
  }, [router])

  const calc = calcAll(form.weightKg, form.heightCm, form.age, form.sex, form.activityLevel, form.goal)
  const STEPS: Step[] = ['goal', 'metrics', 'activity', 'confirm', 'conditions', 'consent']
  const stepIdx = STEPS.indexOf(step)
  const canProceedConsent = termsAccepted && privacyAccepted && healthDataConsent && ageVerified

  async function handleComplete() {
    if (!uid) return
    setSaving(true)
    const consents: UserConsents = {
      termsAccepted, privacyAccepted, healthDataConsent, ageVerified, marketingConsent,
      consentVersion: CONSENT_VERSION,
      consentDate: new Date().toISOString().slice(0, 10),
    }
    const conditionProfile: ConditionProfile | undefined = selectedConditions.length > 0 ? {
      conditions: selectedConditions,
      diagnosedByDoctor,
      onMedication,
      lastUpdated: new Date().toISOString().slice(0, 10),
    } : undefined

    await saveProfile(uid, {
      uid,
      email: auth.currentUser?.email ?? '',
      displayName: auth.currentUser?.displayName ?? '',
      ...form,
      ...calc,
      onboardingComplete: true,
      consents,
      ...(conditionProfile ? { conditionProfile } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    router.push('/dashboard')
  }

  const set = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }))

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen mesh-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md glass rounded-2xl p-8 space-y-6">

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-1">Set Up Your Profile</h1>
            <span className="text-xs text-2">{stepIdx + 1} / {STEPS.length}</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'var(--ring-track)' }}>
            <div className="h-1.5 rounded-full transition-all"
              style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%`, background: 'linear-gradient(90deg,#7c3aed,#06b6d4)' }} />
          </div>
        </div>

        {/* STEP 1: GOAL */}
        {step === 'goal' && (
          <div className="space-y-3">
            <h2 className="font-semibold text-1">What&apos;s your primary goal?</h2>
            {([
              ['fat_loss',    'Lose Fat',         'Burn fat, preserve muscle'],
              ['muscle_gain', 'Build Muscle',     'Lean bulk, progressive overload'],
              ['recomp',      'Body Recomp',      'Lose fat & gain muscle simultaneously'],
              ['endurance',   'Improve Endurance','Marathon, cardio, stamina'],
            ] as const).map(([val, label, desc]) => (
              <button key={val} onClick={() => set('goal', val)}
                className="w-full text-left p-4 rounded-xl border transition-colors"
                style={{ borderColor: form.goal === val ? '#7c3aed' : 'rgba(255,255,255,0.08)', background: form.goal === val ? 'rgba(124,58,237,0.12)' : 'transparent' }}>
                <p className="font-semibold text-1 text-sm">{label}</p>
                <p className="text-xs text-2 mt-0.5">{desc}</p>
              </button>
            ))}
            <button onClick={() => setStep('metrics')} className="w-full py-3 rounded-xl font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>Next</button>
          </div>
        )}

        {/* STEP 2: METRICS */}
        {step === 'metrics' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-1">Your measurements</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Age', 'age', 18, 80],
                ['Height (cm)', 'heightCm', 140, 220],
                ['Weight (kg)', 'weightKg', 40, 200],
                ['Target (kg)', 'targetWeightKg', 40, 200],
              ].map(([label, field, min, max]) => (
                <div key={field as string}>
                  <label className="text-xs text-2 mb-1 block">{label as string}</label>
                  <input type="number" min={min as number} max={max as number}
                    value={form[field as keyof typeof form] as number}
                    onChange={e => set(field as string, Number(e.target.value))}
                    className="w-full px-3 py-2.5 glass-dark rounded-xl border border-white/10 text-sm text-1" />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs text-2 mb-1 block">Biological sex</label>
              <div className="grid grid-cols-2 gap-2">
                {(['male', 'female'] as const).map(s => (
                  <button key={s} onClick={() => set('sex', s)}
                    className="py-2.5 rounded-xl border text-sm capitalize transition-colors text-1"
                    style={{ borderColor: form.sex === s ? '#7c3aed' : 'rgba(255,255,255,0.08)', background: form.sex === s ? 'rgba(124,58,237,0.12)' : 'transparent' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('goal')} className="flex-1 py-2.5 glass rounded-xl text-sm text-2">Back</button>
              <button onClick={() => setStep('activity')} className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>Next</button>
            </div>
          </div>
        )}

        {/* STEP 3: ACTIVITY */}
        {step === 'activity' && (
          <div className="space-y-3">
            <h2 className="font-semibold text-1">Activity level</h2>
            {([
              ['sedentary',   'Sedentary',         'Desk job, little exercise (×1.2)'],
              ['light',       'Lightly Active',    '1–3 days/week exercise (×1.375)'],
              ['moderate',    'Moderately Active', '3–5 days/week (×1.55)'],
              ['very_active', 'Very Active',       'Hard training 6–7 days/week (×1.725)'],
            ] as const).map(([val, label, desc]) => (
              <button key={val} onClick={() => set('activityLevel', val)}
                className="w-full text-left p-4 rounded-xl border transition-colors"
                style={{ borderColor: form.activityLevel === val ? '#7c3aed' : 'rgba(255,255,255,0.08)', background: form.activityLevel === val ? 'rgba(124,58,237,0.12)' : 'transparent' }}>
                <p className="font-semibold text-1 text-sm">{label}</p>
                <p className="text-xs text-2 mt-0.5">{desc}</p>
              </button>
            ))}
            <div className="flex gap-2">
              <button onClick={() => setStep('metrics')} className="flex-1 py-2.5 glass rounded-xl text-sm text-2">Back</button>
              <button onClick={() => setStep('confirm')} className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>Next</button>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRM */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-1">Your personalised plan</h2>
            <div className="glass-dark rounded-xl p-4 space-y-2 text-sm">
              <Row label="BMR"            value={`${calc.bmr} kcal/day`} />
              <Row label="TDEE"           value={`${calc.tdee} kcal/day`} />
              <Row label="Calorie Target" value={`${calc.calorieTarget} kcal/day`} highlight />
              <div className="border-t border-white/10 pt-2 mt-2" />
              <Row label="Protein" value={`${calc.proteinTargetG}g`} />
              <Row label="Carbs"   value={`${calc.carbTargetG}g`} />
              <Row label="Fat"     value={`${calc.fatTargetG}g`} />
            </div>
            <p className="text-xs text-3">Based on Mifflin-St Jeor formula. Recalculated when weight changes 2+ kg.</p>
            <div className="flex gap-2">
              <button onClick={() => setStep('activity')} className="flex-1 py-2.5 glass rounded-xl text-sm text-2">Back</button>
              <button onClick={() => setStep('conditions')} className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>Next</button>
            </div>
          </div>
        )}

        {/* STEP 5: CONDITIONS (optional, Phase 13) */}
        {step === 'conditions' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-1 mb-1">Any health conditions? <span className="text-xs font-normal text-3">(optional)</span></h2>
              <p className="text-xs text-2">
                Selecting conditions helps HealthOS personalise recommendations. This data is stored only for you
                and never shared. You can skip this step.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {CONDITION_OPTIONS.map(({ key, label, emoji }) => {
                const selected = selectedConditions.includes(key)
                return (
                  <button key={key} onClick={() => toggleCondition(key)}
                    className="text-left p-3 rounded-xl border transition-all"
                    style={{
                      borderColor: selected ? '#7c3aed' : 'var(--input-border)',
                      background: selected ? 'rgba(124,58,237,0.12)' : 'transparent',
                    }}>
                    <span className="text-xl">{emoji}</span>
                    <p className="text-xs font-semibold text-1 mt-1 leading-snug">{label}</p>
                  </button>
                )
              })}
            </div>

            {selectedConditions.length > 0 && (
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setDiagnosedByDoctor(d => !d)}
                    className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ borderColor: diagnosedByDoctor ? '#7c3aed' : 'var(--input-border)', background: diagnosedByDoctor ? '#7c3aed' : 'transparent' }}>
                    {diagnosedByDoctor && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>}
                  </div>
                  <span className="text-xs text-2">Diagnosed by a doctor</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setOnMedication(m => !m)}
                    className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ borderColor: onMedication ? '#7c3aed' : 'var(--input-border)', background: onMedication ? '#7c3aed' : 'transparent' }}>
                    {onMedication && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>}
                  </div>
                  <span className="text-xs text-2">Currently on medication for this condition</span>
                </label>
              </div>
            )}

            <div className="rounded-xl px-3 py-2.5 text-xs"
              style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--text-2)', border: '1px solid rgba(124,58,237,0.15)' }}>
              HealthOS is a wellness app, not a medical device. Always follow your doctor&apos;s advice.
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep('confirm')} className="flex-1 py-2.5 glass rounded-xl text-sm text-2">Back</button>
              <button onClick={() => setStep('consent')} className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
                {selectedConditions.length > 0 ? 'Next' : 'Skip'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: CONSENT (GDPR / DPDP / PDPL) */}
        {step === 'consent' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-1 mb-1">Privacy &amp; Consent</h2>
              <p className="text-xs text-2">
                HealthOS collects health data to provide personalised insights. Under UK GDPR, EU GDPR,
                India DPDP Act 2023, and UAE PDPL 2021, we need your explicit consent before
                processing special category health data.
              </p>
            </div>

            <div className="space-y-3">
              <ConsentBox id="age" checked={ageVerified} onChange={setAgeVerified} required
                label="I confirm I am 18 years of age or older." />
              <ConsentBox id="terms" checked={termsAccepted} onChange={setTermsAccepted} required
                label={<>I have read and agree to the{' '}
                  <Link href="/terms" target="_blank" className="text-violet-400 underline">Terms of Service</Link>.</>} />
              <ConsentBox id="privacy" checked={privacyAccepted} onChange={setPrivacyAccepted} required
                label={<>I have read and agree to the{' '}
                  <Link href="/privacy" target="_blank" className="text-violet-400 underline">Privacy Policy</Link>.</>} />
              <ConsentBox id="health" checked={healthDataConsent} onChange={setHealthDataConsent} required
                label={<>I give <strong>explicit consent</strong> for HealthOS to process my health data
                  (nutrition, workouts, sleep, glucose, body metrics) as described in the Privacy Policy.
                  This is special category data under GDPR Art 9 — I can withdraw consent by deleting my account.</>} />
              <ConsentBox id="marketing" checked={marketingConsent} onChange={setMarketingConsent}
                label="I agree to receive occasional product updates by email (optional)." />
            </div>

            <div className="glass-dark rounded-xl p-3">
              <p className="text-xs text-3">
                <strong className="text-2">Data controller:</strong> HealthOS.
                Stored in Google Cloud (europe-west2, London). Export or delete your data at any time
                from your profile.
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep('conditions')} className="flex-1 py-2.5 glass rounded-xl text-sm text-2">Back</button>
              <button onClick={handleComplete} disabled={saving || !canProceedConsent}
                className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-40 transition-opacity"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
                {saving ? 'Setting up…' : 'Start HealthOS →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-2">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-violet-400' : 'text-1'}`}>{value}</span>
    </div>
  )
}

function ConsentBox({
  id, checked, onChange, label, required = false,
}: {
  id: string; checked: boolean; onChange: (v: boolean) => void
  label: React.ReactNode; required?: boolean
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
      <div className="relative flex-shrink-0 mt-0.5">
        <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only" />
        <div onClick={() => onChange(!checked)}
          className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer"
          style={{ borderColor: checked ? '#7c3aed' : 'var(--input-border)', background: checked ? '#7c3aed' : 'transparent' }}>
          {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>}
        </div>
      </div>
      <span className="text-xs text-2 leading-relaxed">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </span>
    </label>
  )
}
