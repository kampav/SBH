'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { getProfile, getNutrition, saveNutrition } from '@/lib/firestore'
import { DailyNutrition, Meal, MealType } from '@/lib/types'
import { Droplets, Plus, X } from 'lucide-react'

const today = new Date().toISOString().slice(0, 10)

const EMPTY: DailyNutrition = {
  date: today, meals: [],
  totalCalories: 0, totalProteinG: 0, totalCarbsG: 0, totalFatG: 0,
  waterGlasses: 0, calorieTarget: 2050,
}

export default function NutritionPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [data, setData] = useState<DailyNutrition>(EMPTY)
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
      else setData({ ...EMPTY, calorieTarget: p?.calorieTarget ?? 2050 })
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

  async function addWater() {
    const updated = { ...data, waterGlasses: Math.min(data.waterGlasses + 1, 8) }
    setData(updated)
    if (uid) await saveNutrition(uid, updated)
  }

  const remaining = targets.cal - data.totalCalories
  const calPct = Math.min((data.totalCalories / targets.cal) * 100, 100)

  if (!authReady) return (
    <main className="min-h-screen bg-app flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen bg-app page-pad">
      <header className="px-4 pt-12 pb-4">
        <p className="text-xs text-2 mb-0.5">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="text-xl font-bold text-1">Nutrition</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4">

        {/* Calorie summary */}
        <div className="bg-card-sbh rounded-2xl p-4 border border-sbh">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-4xl font-bold text-emerald-400">{data.totalCalories}</p>
              <p className="text-xs text-2 mt-0.5">of {targets.cal} kcal eaten</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${remaining < 0 ? 'text-rose-400' : 'text-1'}`}>{Math.abs(remaining)}</p>
              <p className="text-xs text-2">{remaining < 0 ? 'over target' : 'remaining'}</p>
            </div>
          </div>
          {/* Calorie bar */}
          <div className="w-full rounded-full h-2 mb-4" style={{background:'#1a2744'}}>
            <div className="h-2 rounded-full transition-all" style={{
              width:`${calPct}%`,
              background: calPct > 100 ? '#ef4444' : 'linear-gradient(90deg,#10b981,#059669)'
            }} />
          </div>
          {/* Macros */}
          <div className="grid grid-cols-3 gap-3">
            <MacroRing label="Protein" current={data.totalProteinG} target={targets.protein} color="#6366f1" />
            <MacroRing label="Carbs"   current={data.totalCarbsG}   target={targets.carbs}   color="#f59e0b" />
            <MacroRing label="Fat"     current={data.totalFatG}      target={targets.fat}     color="#f87171" />
          </div>
        </div>

        {/* Water tracker */}
        <div className="bg-card-sbh rounded-2xl p-4 border border-sbh flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets size={18} className="text-blue-400" />
            <span className="font-semibold text-sm text-1">Water</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-3 h-3 rounded-full transition-colors"
                  style={{background: i < data.waterGlasses ? '#60a5fa' : '#1a2744'}} />
              ))}
            </div>
            <span className="text-xs text-2 w-10 text-right">{data.waterGlasses}/8</span>
            <button onClick={addWater}
              className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full text-white text-sm font-bold transition-colors flex items-center justify-center">
              +
            </button>
          </div>
        </div>

        {/* Add meal button */}
        <button onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors glow-emerald"
          style={{background:'linear-gradient(135deg,#059669,#047857)'}}>
          <Plus size={18} />
          Add Meal / Snack
        </button>

        {/* Add meal form */}
        {showForm && (
          <div className="bg-card-sbh rounded-2xl p-4 border border-sbh space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-1">Add meal</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>
            <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              placeholder="Meal name (e.g. Chicken & rice)"
              className="w-full px-3 py-2.5 rounded-xl border text-sm text-1 outline-none transition-colors"
              style={{background:'#111d35',borderColor:'#1a2744'}}
              onFocus={e => e.target.style.borderColor='#10b981'}
              onBlur={e => e.target.style.borderColor='#1a2744'}
            />
            <div className="grid grid-cols-2 gap-2">
              {([['Calories (kcal)','calories'],['Protein (g)','proteinG'],['Carbs (g)','carbsG'],['Fat (g)','fatG']] as const).map(([label, field]) => (
                <input key={field} type="number" value={form[field]} onChange={e => setForm(f => ({...f, [field]: e.target.value}))}
                  placeholder={label}
                  className="px-3 py-2.5 rounded-xl border text-sm text-1 outline-none"
                  style={{background:'#111d35',borderColor:'#1a2744'}}
                />
              ))}
            </div>
            <select value={form.mealType} onChange={e => setForm(f => ({...f, mealType: e.target.value as MealType}))}
              className="w-full px-3 py-2.5 rounded-xl border text-sm text-1 outline-none"
              style={{background:'#111d35',borderColor:'#1a2744'}}>
              {(['breakfast','lunch','dinner','snack','pre_workout','post_workout'] as const).map(t => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-2 transition-colors"
                style={{background:'#1a2744'}}>Cancel</button>
              <button onClick={addMeal}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{background:'#10b981'}}>Add Meal</button>
            </div>
          </div>
        )}

        {/* Meal list */}
        {data.meals.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-2 uppercase tracking-widest">Today&#39;s meals</h2>
            {data.meals.map(meal => (
              <div key={meal.id} className="bg-card-sbh rounded-2xl p-3 border border-sbh flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-1">{meal.name}</p>
                  <p className="text-xs text-2 mt-0.5">{meal.time} &middot; {meal.mealType.replace('_', ' ')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-emerald-400">{meal.calories} kcal</p>
                  <p className="text-xs text-3">P:{meal.proteinG}g C:{meal.carbsG}g F:{meal.fatG}g</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function MacroRing({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = Math.min((current / target) * 100, 100)
  const r = 22, circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center" style={{width:56,height:56}}>
        <svg width={56} height={56} style={{transform:'rotate(-90deg)'}}>
          <circle cx={28} cy={28} r={r} fill="none" stroke="#1a2744" strokeWidth={6} />
          <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={6}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{transition:'stroke-dashoffset .7s ease'}} />
        </svg>
        <span className="absolute text-xs font-bold" style={{color}}>{Math.round(pct)}%</span>
      </div>
      <p className="text-xs font-bold text-1">{current}g</p>
      <p className="text-xs text-3">/ {target}g</p>
      <p className="text-xs text-2">{label}</p>
    </div>
  )
}
