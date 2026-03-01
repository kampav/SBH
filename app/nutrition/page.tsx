'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { getProfile, getNutrition, saveNutrition } from '@/lib/firestore'
import { DailyNutrition, Meal, MealType } from '@/lib/types'

const today = new Date().toISOString().slice(0, 10)

const EMPTY_NUTRITION: DailyNutrition = {
  date: today,
  meals: [],
  totalCalories: 0,
  totalProteinG: 0,
  totalCarbsG: 0,
  totalFatG: 0,
  waterGlasses: 0,
  calorieTarget: 2050,
}

export default function NutritionPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [data, setData] = useState<DailyNutrition>(EMPTY_NUTRITION)
  const [targets, setTargets] = useState({ cal: 2050, protein: 166, carbs: 180, fat: 65 })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', calories: '', proteinG: '', carbsG: '', fatG: '', mealType: 'lunch' as MealType })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      setUid(user.uid)
      const p = await getProfile(user.uid)
      if (p) setTargets({ cal: p.calorieTarget, protein: p.proteinTargetG, carbs: p.carbTargetG, fat: p.fatTargetG })
      const n = await getNutrition(user.uid, today)
      if (n) setData(n)
      else setData({ ...EMPTY_NUTRITION, calorieTarget: p?.calorieTarget ?? 2050 })
    })
    return unsub
  }, [router])

  async function addMeal() {
    if (!uid || !form.name || !form.calories) return
    const meal: Meal = {
      id: Date.now().toString(),
      name: form.name,
      calories: Number(form.calories),
      proteinG: Number(form.proteinG) || 0,
      carbsG: Number(form.carbsG) || 0,
      fatG: Number(form.fatG) || 0,
      time: new Date().toTimeString().slice(0, 5),
      mealType: form.mealType,
    }
    const updated: DailyNutrition = {
      ...data,
      meals: [...data.meals, meal],
      totalCalories: data.totalCalories + meal.calories,
      totalProteinG: data.totalProteinG + meal.proteinG,
      totalCarbsG: data.totalCarbsG + meal.carbsG,
      totalFatG: data.totalFatG + meal.fatG,
    }
    await saveNutrition(uid, updated)
    setData(updated)
    setShowForm(false)
    setForm({ name: '', calories: '', proteinG: '', carbsG: '', fatG: '', mealType: 'lunch' })
  }

  const remaining = targets.cal - data.totalCalories
  const pct = Math.min((data.totalCalories / targets.cal) * 100, 100)

  if (!authReady) return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center">
      <p className="text-slate-400">Loading...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4 flex items-center justify-between">
        <h1 className="font-bold text-lg">Nutrition</h1>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-slate-400 hover:text-slate-200">Dashboard</button>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Calorie Ring Summary */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-3xl font-bold text-emerald-400">{data.totalCalories}</p>
              <p className="text-xs text-slate-400">of {targets.cal} kcal</p>
            </div>
            <div className="text-right">
              <p className={`text-xl font-bold ${remaining < 0 ? 'text-red-400' : 'text-white'}`}>{Math.abs(remaining)}</p>
              <p className="text-xs text-slate-400">{remaining < 0 ? 'over' : 'remaining'}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          {/* Macros */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <MacroBar label="Protein" current={data.totalProteinG} target={targets.protein} color="#60a5fa" unit="g" />
            <MacroBar label="Carbs" current={data.totalCarbsG} target={targets.carbs} color="#f59e0b" unit="g" />
            <MacroBar label="Fat" current={data.totalFatG} target={targets.fat} color="#f87171" unit="g" />
          </div>
        </div>

        {/* Water */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center justify-between">
          <p className="font-semibold text-sm">Water intake</p>
          <div className="flex items-center gap-2">
            <span className="text-slate-300">{data.waterGlasses} / 8 glasses</span>
            <button onClick={async () => {
              const updated = { ...data, waterGlasses: Math.min(data.waterGlasses + 1, 8) }
              setData(updated)
              if (uid) await saveNutrition(uid, updated)
            }} className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full text-sm font-bold">+</button>
          </div>
        </div>

        {/* Add Meal */}
        <button onClick={() => setShowForm(true)} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-semibold transition-colors">
          + Add Meal / Snack
        </button>

        {showForm && (
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-3">
            <h3 className="font-semibold">Add meal</h3>
            <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              placeholder="Meal name (e.g. Chicken & rice)"
              className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              {([['Calories (kcal)','calories'],['Protein (g)','proteinG'],['Carbs (g)','carbsG'],['Fat (g)','fatG']] as const).map(([label, field]) => (
                <input key={field} type="number" value={form[field]} onChange={e => setForm(f => ({...f, [field]: e.target.value}))}
                  placeholder={label}
                  className="px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
                />
              ))}
            </div>
            <select value={form.mealType} onChange={e => setForm(f => ({...f, mealType: e.target.value as MealType}))}
              className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm">
              {(['breakfast','lunch','dinner','snack','pre_workout','post_workout'] as const).map(t => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">Cancel</button>
              <button onClick={addMeal} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-semibold">Add</button>
            </div>
          </div>
        )}

        {/* Meal List */}
        {data.meals.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Today&apos;s meals</h2>
            {data.meals.map(meal => (
              <div key={meal.id} className="bg-slate-800 rounded-xl p-3 border border-slate-700 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{meal.name}</p>
                  <p className="text-xs text-slate-400">{meal.time} · {meal.mealType.replace('_', ' ')}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-bold text-emerald-400">{meal.calories} kcal</p>
                  <p className="text-xs text-slate-500">P:{meal.proteinG}g C:{meal.carbsG}g F:{meal.fatG}g</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function MacroBar({ label, current, target, color, unit }: { label: string; current: number; target: number; color: string; unit: string }) {
  const pct = Math.min((current / target) * 100, 100)
  return (
    <div className="text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-bold text-sm">{current}{unit}</p>
      <p className="text-xs text-slate-500">/ {target}{unit}</p>
      <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
