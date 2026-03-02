'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { getProfile, getNutrition, saveNutrition, getFavouriteFoods, saveFavouriteFood, deleteFavouriteFood } from '@/lib/firestore'
import { DailyNutrition, Meal, MealType, FavouriteFood } from '@/lib/types'
import { serverTimestamp } from 'firebase/firestore'
import { Droplets, Plus, X, Camera, ScanLine, Heart, HeartOff, Loader2, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { FOOD_DATABASE, FoodEntry } from '@/lib/foodDatabase'
import nextDynamic from 'next/dynamic'

const BarcodeScanner = nextDynamic(() => import('@/components/nutrition/BarcodeScanner'), { ssr: false })

const today = new Date().toISOString().slice(0, 10)
const EMPTY: DailyNutrition = {
  date: today, meals: [],
  totalCalories: 0, totalProteinG: 0, totalCarbsG: 0, totalFatG: 0,
  waterGlasses: 0, calorieTarget: 2050,
}
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'
const ROSE   = '#f43f5e'

// Quick-add preset foods (common Indian + international)
const PRESETS: Array<{emoji: string; name: string; calories: number; proteinG: number; carbsG: number; fatG: number; servingSize: string}> = [
  { emoji:'🥚', name:'Eggs (2 large)',      calories:140, proteinG:12, carbsG:1,  fatG:10, servingSize:'2 eggs' },
  { emoji:'🥣', name:'Oats (50g dry)',      calories:185, proteinG:7,  carbsG:32, fatG:4,  servingSize:'50g' },
  { emoji:'🍗', name:'Chicken Breast 150g', calories:248, proteinG:46, carbsG:0,  fatG:5,  servingSize:'150g' },
  { emoji:'🫙', name:'Greek Yogurt 200g',   calories:130, proteinG:20, carbsG:8,  fatG:2,  servingSize:'200g' },
  { emoji:'🫘', name:'Dal (1 cup cooked)',  calories:230, proteinG:18, carbsG:40, fatG:1,  servingSize:'240g' },
  { emoji:'🧀', name:'Paneer 100g',         calories:265, proteinG:18, carbsG:2,  fatG:20, servingSize:'100g' },
  { emoji:'🌾', name:'Rice (1 cup cooked)', calories:206, proteinG:4,  carbsG:45, fatG:0,  servingSize:'186g' },
  { emoji:'🥤', name:'Protein Shake',       calories:120, proteinG:25, carbsG:5,  fatG:2,  servingSize:'1 scoop' },
]

type Mode = 'idle' | 'form' | 'barcode' | 'photo'
type FormFill = { name: string; calories: string; proteinG: string; carbsG: string; fatG: string; brand?: string; servingSize?: string }

export default function NutritionPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [data, setData] = useState<DailyNutrition>(EMPTY)
  const [targets, setTargets] = useState({ cal: 2050, protein: 166, carbs: 180, fat: 65 })
  const [mode, setMode] = useState<Mode>('idle')
  const [form, setForm] = useState<FormFill>({ name: '', calories: '', proteinG: '', carbsG: '', fatG: '' })
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [saving, setSaving] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [aiError, setAiError] = useState('')
  const [favourites, setFavourites] = useState<FavouriteFood[]>([])
  const [showFavs, setShowFavs] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [savingFav, setSavingFav] = useState(false)
  const [presetMultiplier, setPresetMultiplier] = useState<0.5 | 1 | 1.5 | 2>(1)
  const [favSearch, setFavSearch] = useState('')
  const [recentFoods, setRecentFoods] = useState<string[]>([])
  const [quickAddTab, setQuickAddTab] = useState<'recent' | 'presets'>('presets')
  const [foodSearch, setFoodSearch] = useState('')
  const [aiLookupLoading, setAiLookupLoading] = useState(false)
  const [aiLookupError, setAiLookupError] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      setUid(user.uid)
      const raw = localStorage.getItem('sbh_recent_foods')
      if (raw) { try { setRecentFoods(JSON.parse(raw)) } catch { /* ignore */ } }
      const p = await getProfile(user.uid)
      if (p) setTargets({ cal: p.calorieTarget, protein: p.proteinTargetG, carbs: p.carbTargetG, fat: p.fatTargetG })
      const [n, favs] = await Promise.all([
        getNutrition(user.uid, today),
        getFavouriteFoods(user.uid),
      ])
      if (n) setData(n)
      else setData({ ...EMPTY, calorieTarget: p?.calorieTarget ?? 2050 })
      setFavourites(favs)
    })
    return unsub
  }, [router])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function fillForm(f: Partial<FormFill>) {
    setForm(prev => ({...prev, ...f}))
    setMode('form')
  }

  // ── AI photo analysis ─────────────────────────────────────────────────────
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAnalysing(true)
    setAiError('')
    setMode('form')
    try {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      })
      if (!res.ok) throw new Error('AI analysis failed')
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      fillForm({
        name: result.name ?? '',
        calories: String(result.calories ?? ''),
        proteinG: String(result.proteinG ?? ''),
        carbsG: String(result.carbsG ?? ''),
        fatG: String(result.fatG ?? ''),
        servingSize: result.servingSize ?? '',
      })
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Analysis failed. Please fill in manually.')
    } finally {
      setAnalysing(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  // ── Barcode result ────────────────────────────────────────────────────────
  function onBarcodeResult(r: {name:string;brand?:string;calories:number;proteinG:number;carbsG:number;fatG:number;servingSize:string}) {
    fillForm({
      name: r.brand ? `${r.name} (${r.brand})` : r.name,
      calories: String(r.calories),
      proteinG: String(r.proteinG),
      carbsG: String(r.carbsG),
      fatG: String(r.fatG),
      servingSize: r.servingSize,
    })
  }

  // ── Add meal ──────────────────────────────────────────────────────────────
  async function addMeal() {
    if (!uid || !form.name || !form.calories) return
    setSaving(true)
    const meal: Meal = {
      id: Date.now().toString(),
      name: form.name,
      calories: Number(form.calories),
      proteinG: Number(form.proteinG) || 0,
      carbsG: Number(form.carbsG) || 0,
      fatG: Number(form.fatG) || 0,
      time: new Date().toTimeString().slice(0, 5),
      mealType,
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
    setMode('idle')
    setForm({ name: '', calories: '', proteinG: '', carbsG: '', fatG: '' })
    setSaving(false)
  }

  // ── Save to favourites ────────────────────────────────────────────────────
  async function saveToFavourites() {
    if (!uid || !form.name) return
    setSavingFav(true)
    const fav: FavouriteFood = {
      id: Date.now().toString(),
      name: form.name,
      calories: Number(form.calories) || 0,
      proteinG: Number(form.proteinG) || 0,
      carbsG: Number(form.carbsG) || 0,
      fatG: Number(form.fatG) || 0,
      servingSize: form.servingSize || '1 serving',
      createdAt: serverTimestamp(),
    }
    await saveFavouriteFood(uid, fav)
    setFavourites(prev => [...prev, fav].sort((a,b) => a.name.localeCompare(b.name)))
    setSavingFav(false)
  }

  // ── Delete favourite ──────────────────────────────────────────────────────
  async function deleteFav(id: string) {
    if (!uid) return
    await deleteFavouriteFood(uid, id)
    setFavourites(prev => prev.filter(f => f.id !== id))
  }

  // ── Quick-add from favourite / preset ────────────────────────────────────
  async function quickAdd(item: {name:string;calories:number;proteinG:number;carbsG:number;fatG:number}) {
    if (!uid) return
    const meal: Meal = {
      id: Date.now().toString(),
      name: item.name,
      calories: item.calories,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      time: new Date().toTimeString().slice(0, 5),
      mealType,
    }
    const updated: DailyNutrition = {
      ...data, meals: [...data.meals, meal],
      totalCalories: data.totalCalories + meal.calories,
      totalProteinG: data.totalProteinG + meal.proteinG,
      totalCarbsG: data.totalCarbsG + meal.carbsG,
      totalFatG: data.totalFatG + meal.fatG,
    }
    await saveNutrition(uid, updated)
    setData(updated)
    // Track recently used
    setRecentFoods(prev => {
      const updated2 = [item.name, ...prev.filter(n => n !== item.name)].slice(0, 5)
      localStorage.setItem('sbh_recent_foods', JSON.stringify(updated2))
      return updated2
    })
  }

  // ── Quick-add preset with multiplier ─────────────────────────────────────
  function quickAddPreset(p: typeof PRESETS[0]) {
    quickAdd({
      name: presetMultiplier === 1 ? p.name : `${p.name} ×${presetMultiplier}`,
      calories: Math.round(p.calories * presetMultiplier),
      proteinG: Math.round(p.proteinG * presetMultiplier * 10) / 10,
      carbsG:   Math.round(p.carbsG   * presetMultiplier * 10) / 10,
      fatG:     Math.round(p.fatG     * presetMultiplier * 10) / 10,
    })
  }

  // ── Food search helpers ───────────────────────────────────────────────────
  async function lookupFoodWithAI() {
    if (!foodSearch.trim()) return
    setAiLookupLoading(true)
    setAiLookupError('')
    try {
      const res = await fetch('/api/lookup-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodName: foodSearch }),
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      fillForm({
        name: result.name,
        calories: String(result.calories),
        proteinG: String(result.proteinG),
        carbsG: String(result.carbsG),
        fatG: String(result.fatG),
        servingSize: result.servingSize,
      })
      setFoodSearch('')
      setShowSearchResults(false)
    } catch {
      setAiLookupError('AI lookup failed — fill in manually')
    } finally {
      setAiLookupLoading(false)
    }
  }

  function addFromSearch(food: FoodEntry) {
    quickAdd({
      name: `${food.name} (${food.servingSize})`,
      calories: food.calories,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
    })
    setFoodSearch('')
    setShowSearchResults(false)
  }

  // ── Remove meal ───────────────────────────────────────────────────────────
  async function removeMeal(id: string) {
    if (!uid) return
    const meal = data.meals.find(m => m.id === id)
    if (!meal) return
    const updated: DailyNutrition = {
      ...data,
      meals: data.meals.filter(m => m.id !== id),
      totalCalories: data.totalCalories - meal.calories,
      totalProteinG: data.totalProteinG - meal.proteinG,
      totalCarbsG: data.totalCarbsG - meal.carbsG,
      totalFatG: data.totalFatG - meal.fatG,
    }
    await saveNutrition(uid, updated)
    setData(updated)
  }

  async function addWater() {
    const updated = { ...data, waterGlasses: Math.min(data.waterGlasses + 1, 8) }
    setData(updated)
    if (uid) await saveNutrition(uid, updated)
  }

  const remaining = targets.cal - data.totalCalories
  const calPct = Math.min((data.totalCalories / targets.cal) * 100, 100)
  const filteredFavourites = favSearch.trim()
    ? favourites.filter(f => f.name.toLowerCase().includes(favSearch.toLowerCase()))
    : favourites
  const recentPresetItems = recentFoods
    .map(n => PRESETS.find(p => p.name === n))
    .filter((p): p is typeof PRESETS[0] => p !== undefined)
  const searchResults = foodSearch.trim().length >= 2
    ? FOOD_DATABASE.filter(f =>
        f.name.toLowerCase().includes(foodSearch.toLowerCase()) ||
        f.tags.some(t => t.includes(foodSearch.toLowerCase()))
      ).slice(0, 8)
    : []
  const noLocalResults = foodSearch.trim().length >= 2 && searchResults.length === 0

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen mesh-bg page-pad">
      {/* Barcode scanner overlay */}
      {mode === 'barcode' && (
        <BarcodeScanner onResult={onBarcodeResult} onClose={() => setMode('idle')} />
      )}

      {/* Hidden photo input */}
      <input ref={photoInputRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={handlePhoto} />

      <header className="px-4 pt-12 pb-4">
        <p className="text-xs text-2 mb-0.5">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="text-xl font-bold text-1">Nutrition</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4">

        {/* Food Search — always visible */}
        <div ref={searchRef} className="glass rounded-2xl p-3 relative">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-2 shrink-0 ml-1" />
            <input
              type="text"
              value={foodSearch}
              onChange={e => { setFoodSearch(e.target.value); setShowSearchResults(true) }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="Search foods… e.g. Dal Makhani, Roti, Chicken Tikka"
              className="flex-1 bg-transparent text-sm text-1 outline-none placeholder:text-slate-500"
            />
            {foodSearch && (
              <button onClick={() => { setFoodSearch(''); setShowSearchResults(false) }}
                className="text-slate-500 hover:text-slate-300 p-1">
                <X size={14} />
              </button>
            )}
          </div>

          {showSearchResults && foodSearch.trim().length >= 2 && (
            <div className="mt-2 space-y-1">
              {searchResults.map(food => (
                <button key={food.name} onClick={() => addFromSearch(food)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-violet-500/10 transition-all glass">
                  <span className="text-xl shrink-0">{food.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-1 truncate">{food.name}</p>
                    <p className="text-xs text-2">{food.servingSize}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{color: VIOLET}}>{food.calories}kcal</p>
                    <p className="text-xs text-2">P:{food.proteinG}g</p>
                  </div>
                </button>
              ))}

              {noLocalResults && (
                <div className="p-2.5 rounded-xl glass">
                  <p className="text-xs text-2 mb-2">Not in the list — ask AI?</p>
                  <button onClick={lookupFoodWithAI} disabled={aiLookupLoading}
                    className="w-full py-2 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{background:`linear-gradient(135deg,${VIOLET},#6d28d9)`}}>
                    {aiLookupLoading
                      ? <><Loader2 size={14} className="animate-spin" /> Looking up…</>
                      : <>✨ Ask AI: nutrients for &quot;{foodSearch}&quot;</>}
                  </button>
                  {aiLookupError && <p className="text-xs mt-1.5" style={{color: ROSE}}>{aiLookupError}</p>}
                </div>
              )}

              {searchResults.length > 0 && (
                <button onClick={lookupFoodWithAI} disabled={aiLookupLoading}
                  className="w-full py-2 rounded-xl text-xs text-2 glass hover:bg-violet-500/10 transition-all flex items-center justify-center gap-1.5">
                  {aiLookupLoading
                    ? <><Loader2 size={12} className="animate-spin" /> Looking up…</>
                    : <>✨ Ask AI for exact portion: &quot;{foodSearch}&quot;</>}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Calorie summary */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-4xl font-bold" style={{color: VIOLET}}>{data.totalCalories}</p>
              <p className="text-xs text-2 mt-0.5">of {targets.cal} kcal eaten</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold" style={{color: remaining < 0 ? ROSE : '#f1f5f9'}}>
                {Math.abs(remaining)}
              </p>
              <p className="text-xs text-2">{remaining < 0 ? 'over target' : 'remaining'}</p>
            </div>
          </div>
          <div className="w-full rounded-full h-2 mb-4" style={{background:'rgba(124,58,237,0.12)'}}>
            <div className="h-2 rounded-full transition-all" style={{
              width:`${calPct}%`,
              background: calPct > 100 ? ROSE : `linear-gradient(90deg,${VIOLET},${CYAN})`,
            }} />
          </div>
          {/* Macro rings */}
          <div className="flex items-center justify-around">
            <MacroRing label="Protein" current={data.totalProteinG} target={targets.protein} color={VIOLET} />
            <MacroRing label="Carbs"   current={data.totalCarbsG}   target={targets.carbs}   color={CYAN} />
            <MacroRing label="Fat"     current={data.totalFatG}      target={targets.fat}     color={ROSE} />
          </div>
        </div>

        {/* Water */}
        <div className="glass rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets size={18} className="text-blue-400" />
            <span className="font-semibold text-sm text-1">Water ({data.waterGlasses}/8 glasses)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {Array.from({length:8}).map((_,i) => (
                <div key={i} className="w-3 h-3 rounded-full transition-colors"
                  style={{background: i < data.waterGlasses ? '#60a5fa' : 'rgba(96,165,250,0.15)'}} />
              ))}
            </div>
            <button onClick={addWater}
              className="w-8 h-8 rounded-full text-white font-bold flex items-center justify-center"
              style={{background:'#3b82f6'}}>+</button>
          </div>
        </div>

        {/* Scan / Add buttons */}
        <div className="grid grid-cols-3 gap-2.5">
          <button onClick={() => photoInputRef.current?.click()}
            disabled={analysing}
            className="py-3 rounded-2xl font-semibold text-sm text-white flex flex-col items-center gap-1.5 transition-all disabled:opacity-50"
            style={{background:`linear-gradient(135deg,${VIOLET},#6d28d9)`}}>
            {analysing ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
            <span className="text-xs">{analysing ? 'Analysing…' : 'AI Photo'}</span>
          </button>
          <button onClick={() => setMode('barcode')}
            className="py-3 rounded-2xl font-semibold text-sm text-white flex flex-col items-center gap-1.5 transition-all"
            style={{background:`linear-gradient(135deg,${CYAN},#0891b2)`}}>
            <ScanLine size={20} />
            <span className="text-xs">Barcode</span>
          </button>
          <button onClick={() => setMode('form')}
            className="py-3 rounded-2xl font-semibold text-sm text-white flex flex-col items-center gap-1.5 transition-all glass-strong hover:bg-violet-500/20">
            <Plus size={20} />
            <span className="text-xs">Manual</span>
          </button>
        </div>

        {aiError && (
          <div className="glass rounded-xl p-3 text-sm" style={{borderColor: ROSE + '40', color: ROSE}}>
            ⚠ {aiError}
          </div>
        )}

        {/* Add meal form */}
        {mode === 'form' && (
          <div className="glass-strong rounded-2xl p-4 space-y-3 slide-up">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-1">Add to log</h3>
              <button onClick={() => setMode('idle')} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>
            <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              placeholder="Food name" className="input-glass" />
            <div className="grid grid-cols-2 gap-2">
              {([
                ['Calories (kcal)', 'calories'],
                ['Protein (g)',     'proteinG'],
                ['Carbs (g)',       'carbsG'],
                ['Fat (g)',         'fatG'],
              ] as const).map(([label, field]) => (
                <input key={field} type="number" value={form[field] ?? ''}
                  onChange={e => setForm(f => ({...f, [field]: e.target.value}))}
                  placeholder={label} className="input-glass" />
              ))}
            </div>
            <select value={mealType} onChange={e => setMealType(e.target.value as MealType)} className="input-glass">
              {(['breakfast','lunch','dinner','snack','pre_workout','post_workout'] as const).map(t => (
                <option key={t} value={t} style={{background:'#0a0819'}}>{t.replace('_',' ')}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={saveToFavourites} disabled={savingFav || !form.name}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs glass disabled:opacity-40"
                style={{color: ROSE}}>
                <Heart size={13} /> {savingFav ? 'Saving…' : 'Save to Favs'}
              </button>
              <div className="flex-1 flex gap-2">
                <button onClick={() => setMode('idle')} className="flex-1 py-2.5 rounded-xl text-sm text-2 glass">Cancel</button>
                <button onClick={addMeal} disabled={saving || !form.name || !form.calories}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{background:`linear-gradient(135deg,${VIOLET},#6d28d9)`}}>
                  {saving ? '…' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Favourites */}
        {favourites.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <button className="w-full flex items-center justify-between mb-0"
              onClick={() => setShowFavs(s => !s)}>
              <h2 className="text-xs font-semibold text-2 uppercase tracking-widest flex items-center gap-2">
                <Heart size={12} style={{color:ROSE}} /> Favourites ({favourites.length})
              </h2>
              {showFavs ? <ChevronUp size={14} className="text-2" /> : <ChevronDown size={14} className="text-2" />}
            </button>
            {showFavs && (
              <div className="mt-3">
                {favourites.length > 3 && (
                  <input type="text" value={favSearch} onChange={e => setFavSearch(e.target.value)}
                    placeholder="Search favourites…" className="input-glass mb-2 text-sm" />
                )}
                <div className="space-y-2">
                  {filteredFavourites.map(f => (
                    <div key={f.id} className="flex items-center gap-3 glass rounded-xl p-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-1 truncate">{f.name}</p>
                        <p className="text-xs text-2">{f.servingSize} · {f.calories}kcal · P:{f.proteinG}g</p>
                      </div>
                      <button onClick={() => quickAdd(f)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex-shrink-0"
                        style={{background:`linear-gradient(135deg,${VIOLET},#6d28d9)`}}>+Add</button>
                      <button onClick={() => deleteFav(f.id)}
                        className="p-1.5 rounded-lg glass text-slate-500 hover:text-rose-400 flex-shrink-0">
                        <HeartOff size={13} />
                      </button>
                    </div>
                  ))}
                  {filteredFavourites.length === 0 && favSearch && (
                    <p className="text-xs text-3 text-center py-2">No matches for &quot;{favSearch}&quot;</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick-add presets */}
        <div className="glass rounded-2xl p-4">
          <button className="w-full flex items-center justify-between"
            onClick={() => setShowPresets(s => !s)}>
            <h2 className="text-xs font-semibold text-2 uppercase tracking-widest">
              ⚡ Quick Add
            </h2>
            {showPresets ? <ChevronUp size={14} className="text-2" /> : <ChevronDown size={14} className="text-2" />}
          </button>
          {showPresets && (
            <>
              {/* Serving size multiplier */}
              <div className="flex items-center gap-2 mt-3 mb-1">
                <span className="text-xs text-2">Serving:</span>
                {([0.5, 1, 1.5, 2] as const).map(m => (
                  <button key={m} onClick={() => setPresetMultiplier(m)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: presetMultiplier === m ? VIOLET + '30' : 'rgba(255,255,255,0.04)',
                      color: presetMultiplier === m ? VIOLET : '#64748b',
                      border: `1px solid ${presetMultiplier === m ? VIOLET + '50' : 'transparent'}`,
                    }}>
                    ×{m}
                  </button>
                ))}
              </div>

              {/* Recent / Presets tabs */}
              <div className="flex gap-2 mb-3">
                {(['recent', 'presets'] as const).map(tab => (
                  <button key={tab} onClick={() => setQuickAddTab(tab)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold transition-all capitalize"
                    style={{
                      background: quickAddTab === tab ? VIOLET + '20' : 'transparent',
                      color: quickAddTab === tab ? VIOLET : '#64748b',
                    }}>
                    {tab === 'recent' ? `Recent (${recentPresetItems.length})` : 'Presets'}
                  </button>
                ))}
              </div>

              {quickAddTab === 'recent' && recentPresetItems.length === 0 && (
                <p className="text-xs text-3 text-center py-3">No recent adds yet — use Presets first</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                {(quickAddTab === 'recent' ? recentPresetItems : PRESETS).map(p => (
                  <button key={p.name} onClick={() => quickAddPreset(p)}
                    className="glass rounded-xl p-3 text-left hover:bg-violet-500/10 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{p.emoji}</span>
                      <span className="text-xs font-semibold text-1 leading-tight">{p.name}</span>
                    </div>
                    <div className="flex gap-2 text-xs text-2">
                      <span style={{color: VIOLET}}>{Math.round(p.calories * presetMultiplier)}kcal</span>
                      <span>P:{Math.round(p.proteinG * presetMultiplier * 10) / 10}g</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Today's meals */}
        {data.meals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-2 uppercase tracking-widest">Today&apos;s Log</h2>
              <span className="text-xs text-2">{data.meals.length} items</span>
            </div>
            {data.meals.map(meal => (
              <div key={meal.id} className="glass rounded-2xl p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-1 truncate">{meal.name}</p>
                  <p className="text-xs text-2 mt-0.5">
                    {meal.time} · {meal.mealType.replace('_',' ')}
                  </p>
                  <p className="text-xs text-3 mt-0.5">P:{meal.proteinG}g C:{meal.carbsG}g F:{meal.fatG}g</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <p className="font-bold text-sm" style={{color: VIOLET}}>{meal.calories} kcal</p>
                  <button onClick={() => removeMeal(meal.id)} className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function MacroRing({ label, current, target, color }: { label:string; current:number; target:number; color:string }) {
  const pct  = Math.min((current / target) * 100, 100)
  const r    = 22
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center" style={{width:56,height:56}}>
        <svg width={56} height={56} style={{transform:'rotate(-90deg)'}}>
          <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(124,58,237,0.12)" strokeWidth={6} />
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
