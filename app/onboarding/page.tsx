'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { saveProfile } from '@/lib/firestore'
import { calcAll } from '@/lib/calculations'
import { ActivityLevel, Goal } from '@/lib/types'
import { serverTimestamp } from 'firebase/firestore'

type Step = 'goal' | 'metrics' | 'activity' | 'confirm'

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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setAuthReady(true)
      if (!user) router.push('/login')
      else setUid(user.uid)
    })
    return unsub
  }, [router])

  const calc = calcAll(form.weightKg, form.heightCm, form.age, form.sex, form.activityLevel, form.goal)

  async function handleComplete() {
    if (!uid) return
    setSaving(true)
    await saveProfile(uid, {
      uid,
      email: auth.currentUser?.email ?? '',
      displayName: auth.currentUser?.displayName ?? '',
      ...form,
      ...calc,
      onboardingComplete: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    router.push('/dashboard')
  }

  const set = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }))

  if (!authReady) return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center">
      <p className="text-slate-400">Loading...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-xl p-8">
        <h1 className="text-xl font-bold mb-2">Set Up Your Profile</h1>
        <p className="text-slate-400 text-sm mb-6">Step {['goal','metrics','activity','confirm'].indexOf(step)+1} of 4</p>

        {step === 'goal' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">What&apos;s your primary goal?</h2>
            {([['fat_loss','Lose Fat','Burn fat, preserve muscle'],['muscle_gain','Build Muscle','Lean bulk, progressive overload'],['recomp','Body Recomp','Lose fat & gain muscle simultaneously'],['endurance','Improve Endurance','Marathon, cardio, stamina']] as const).map(([val, label, desc]) => (
              <button key={val} onClick={() => set('goal', val)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${form.goal === val ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 hover:border-slate-500'}`}>
                <p className="font-semibold">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </button>
            ))}
            <button onClick={() => setStep('metrics')} className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold mt-2">Next</button>
          </div>
        )}

        {step === 'metrics' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Your measurements</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Age', 'age', 'number', 18, 80],
                ['Height (cm)', 'heightCm', 'number', 140, 220],
                ['Weight (kg)', 'weightKg', 'number', 40, 200],
                ['Target (kg)', 'targetWeightKg', 'number', 40, 200],
              ].map(([label, field, type, min, max]) => (
                <div key={field as string}>
                  <label className="text-xs text-slate-400 mb-1 block">{label as string}</label>
                  <input type={type as string} min={min as number} max={max as number}
                    value={form[field as keyof typeof form] as number}
                    onChange={e => set(field as string, Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Sex</label>
              <div className="grid grid-cols-2 gap-2">
                {(['male','female'] as const).map(s => (
                  <button key={s} onClick={() => set('sex', s)}
                    className={`py-2 rounded-lg border text-sm capitalize transition-colors ${form.sex === s ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('goal')} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg">Back</button>
              <button onClick={() => setStep('activity')} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold">Next</button>
            </div>
          </div>
        )}

        {step === 'activity' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Activity level</h2>
            {([
              ['sedentary','Sedentary','Desk job, little exercise (x1.2)'],
              ['light','Lightly Active','1-3 days/week exercise (x1.375)'],
              ['moderate','Moderately Active','3-5 days/week — marathon training (x1.55)'],
              ['very_active','Very Active','Hard training 6-7 days/week (x1.725)'],
            ] as const).map(([val, label, desc]) => (
              <button key={val} onClick={() => set('activityLevel', val)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${form.activityLevel === val ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 hover:border-slate-500'}`}>
                <p className="font-semibold">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </button>
            ))}
            <div className="flex gap-2">
              <button onClick={() => setStep('metrics')} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg">Back</button>
              <button onClick={() => setStep('confirm')} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold">Next</button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Your plan</h2>
            <div className="bg-slate-900 rounded-xl p-4 space-y-2 text-sm">
              <Row label="BMR" value={`${calc.bmr} kcal/day`} />
              <Row label="TDEE" value={`${calc.tdee} kcal/day`} />
              <Row label="Calorie Target" value={`${calc.calorieTarget} kcal/day`} highlight />
              <div className="border-t border-slate-700 pt-2 mt-2" />
              <Row label="Protein" value={`${calc.proteinTargetG}g`} />
              <Row label="Carbs" value={`${calc.carbTargetG}g`} />
              <Row label="Fat" value={`${calc.fatTargetG}g`} />
            </div>
            <p className="text-xs text-slate-500">Based on Mifflin-St Jeor formula. Recalculated when weight changes 2+ kg.</p>
            <div className="flex gap-2">
              <button onClick={() => setStep('activity')} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg">Back</button>
              <button onClick={handleComplete} disabled={saving} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold disabled:opacity-50">
                {saving ? 'Saving...' : 'Start SBH'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={highlight ? 'text-emerald-400 font-bold' : ''}>{value}</span>
    </div>
  )
}
