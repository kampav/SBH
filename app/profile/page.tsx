'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, storage } from '@/lib/firebase'
import { getProfile, saveProfile, deleteAllUserData } from '@/lib/firestore'
import { UserProfile, ProgrammeKey } from '@/lib/types'
import { LogOut, ChevronRight, Target, Activity, Scale, Zap, Calendar, Edit3, Check, Dumbbell, X, Camera, Trash2, AlertTriangle } from 'lucide-react'
import { calcMacros } from '@/lib/calculations'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'

const PHASE_INFO = [
  { num: 1, name: 'Fat Loss Foundation',  weeks: '1–4',  color: '#10b981', desc: 'High frequency cardio, fat oxidation, mobility work' },
  { num: 2, name: 'Muscle Growth',         weeks: '5–8',  color: '#6366f1', desc: 'Progressive overload, volume increase, strength focus' },
  { num: 3, name: 'Definition & Power',    weeks: '9–12', color: '#f59e0b', desc: 'HIIT circuits, conditioning, peak physique' },
]

const GOAL_LABELS: Record<string, string> = {
  fat_loss: '🔥 Fat Loss', muscle_gain: '💪 Muscle Gain',
  recomp: '⚖️ Recomposition', endurance: '🏃 Endurance',
}
const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary (desk job)', light: 'Light (1-3 days/wk)',
  moderate: 'Moderate (3-5 days/wk)', very_active: 'Very Active (6-7 days/wk)',
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [uid, setUid] = useState<string | null>(null)
  const [programmeWeek, setProgrammeWeek] = useState(1)
  const [editingWeek, setEditingWeek] = useState(false)
  const [saved] = useState(false)
  const [selectedProgramme, setSelectedProgramme] = useState<ProgrammeKey>('home_6day')
  const [savingProgramme, setSavingProgramme] = useState(false)
  const [editingCalories, setEditingCalories] = useState(false)
  const [calorieInput, setCalorieInput] = useState('')
  const [savingCalories, setSavingCalories] = useState(false)

  // Profile picture
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Account deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteStep, setDeleteStep] = useState<'confirm' | 'deleting' | 'done'>('confirm')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      setUid(user.uid)
      const saved = localStorage.getItem(`sbh_week_${user.uid}`)
      setProgrammeWeek(saved ? Math.min(Math.max(parseInt(saved), 1), 12) : 1)
      const p = await getProfile(user.uid)
      if (!p) { router.push('/onboarding'); return }
      setProfile(p)
      if (p.programme) setSelectedProgramme(p.programme)
    })
    return unsub
  }, [router])

  function updateWeek(w: number) {
    setProgrammeWeek(w)
    if (uid) localStorage.setItem(`sbh_week_${uid}`, String(w))
  }

  async function saveCalorieTarget() {
    if (!uid || !profile) return
    const cal = Number(calorieInput)
    if (!cal || cal < 800 || cal > 6000) return
    setSavingCalories(true)
    const macros = calcMacros(cal, profile.weightKg)
    const updates = {
      calorieTarget: cal,
      proteinTargetG: macros.proteinTargetG,
      carbTargetG: macros.carbTargetG,
      fatTargetG: macros.fatTargetG,
    }
    await saveProfile(uid, updates)
    setProfile(p => p ? { ...p, ...updates } : p)
    setEditingCalories(false)
    setSavingCalories(false)
  }

  async function changeProgramme(key: ProgrammeKey) {
    if (!uid) return
    setSelectedProgramme(key)
    setSavingProgramme(true)
    await saveProfile(uid, { programme: key })
    setSavingProgramme(false)
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uid) return
    setUploadingPhoto(true)
    try {
      const fileRef = storageRef(storage, `profile-pictures/${uid}`)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)
      await saveProfile(uid, { photoUrl: url })
      setProfile(p => p ? { ...p, photoUrl: url } : p)
    } catch (err) {
      console.error('Photo upload failed', err)
    } finally {
      setUploadingPhoto(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  async function handleDeleteAccount() {
    if (!uid || !profile || deleteConfirm !== 'DELETE') return
    setDeleting(true)
    setDeleteStep('deleting')
    try {
      await deleteAllUserData(uid)
      // Send confirmation email (fire-and-forget — don't block on it)
      fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email, displayName: profile.displayName }),
      }).catch(() => {/* email is best-effort */})
      setDeleteStep('done')
      // Sign out then redirect
      await signOut(auth)
      // Clear all local storage for this user
      Object.keys(localStorage).filter(k => k.includes(uid)).forEach(k => localStorage.removeItem(k))
      router.push('/')
    } catch (err) {
      console.error('Account deletion failed', err)
      setDeleting(false)
      setDeleteStep('confirm')
    }
  }

  const PROGRAMME_OPTIONS: Array<{key: ProgrammeKey; label: string; days: string; desc: string; color: string; emoji: string}> = [
    { key: 'home_6day',       label: '6-Day Home Transformation',  days: 'Mon–Sat',        desc: 'Push/Pull/HIIT/Recovery · No equipment needed', color: '#10b981', emoji: '🏠' },
    { key: 'gym_upper_lower', label: '4-Day Gym Upper/Lower',      days: 'Mon/Tue/Thu/Fri', desc: 'Barbell compounds · Gym required',               color: '#7c3aed', emoji: '🏋️' },
    { key: 'beginner_3day',   label: '3-Day Beginner Bodyweight',  days: 'Mon/Wed/Fri',    desc: 'Full body circuits · Perfect for beginners',     color: '#f59e0b', emoji: '🌱' },
  ]

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const phase = programmeWeek <= 4 ? 1 : programmeWeek <= 8 ? 2 : 3
  const currentPhase = PHASE_INFO[phase - 1]
  const progressPct = profile ? Math.round(((profile.weightKg - profile.targetWeightKg) /
    (profile.weightKg - profile.targetWeightKg + 1)) * 100) : 0

  // Initials for avatar fallback
  const initials = profile?.displayName
    ? profile.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <main className="min-h-screen mesh-bg page-pad">
      {/* Background orb */}
      <div className="fixed top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
        style={{background:'radial-gradient(circle, #6366f1, transparent)', filter:'blur(50px)'}} />

      {/* Account Deletion Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)'}}>
          <div className="w-full max-w-sm glass-strong rounded-3xl p-6 space-y-4">
            {deleteStep === 'done' ? (
              <div className="text-center space-y-3">
                <Check size={40} className="mx-auto text-emerald-400" />
                <p className="text-white font-bold text-lg">Data deleted</p>
                <p className="text-xs text-slate-400">Redirecting…</p>
              </div>
            ) : deleteStep === 'deleting' ? (
              <div className="text-center space-y-3">
                <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-white font-semibold">Deleting all data…</p>
                <p className="text-xs text-slate-400">This may take a moment</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} className="text-rose-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Delete Account & All Data</p>
                    <p className="text-xs text-slate-400">This action is permanent and cannot be undone</p>
                  </div>
                </div>

                <div className="glass rounded-xl p-3 text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300 mb-1">The following will be permanently deleted:</p>
                  {['Profile & body metrics', 'All workout history', 'All nutrition logs', 'Body measurements', 'Favourite foods'].map(item => (
                    <p key={item} className="flex items-center gap-1.5">
                      <span className="text-rose-400">✕</span> {item}
                    </p>
                  ))}
                </div>

                <p className="text-xs text-slate-400">
                  A confirmation email will be sent to <span className="text-white font-medium">{profile?.email}</span>
                </p>

                <div>
                  <p className="text-xs text-slate-400 mb-1.5">
                    Type <span className="text-rose-400 font-bold">DELETE</span> to confirm
                  </p>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value.toUpperCase())}
                    placeholder="DELETE"
                    className="w-full px-3 py-2.5 bg-slate-800 text-white rounded-xl border border-slate-700 focus:border-rose-500 focus:outline-none text-sm font-mono"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowDeleteModal(false); setDeleteConfirm('') }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold glass text-slate-300">
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirm !== 'DELETE' || deleting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                    style={{background:'#ef4444'}}>
                    Delete Everything
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hidden photo input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      <header className="px-4 pt-12 pb-4 flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Profile picture */}
          <button
            onClick={() => photoInputRef.current?.click()}
            className="relative shrink-0"
            disabled={uploadingPhoto}
          >
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center text-xl font-black"
              style={{background: profile?.photoUrl ? 'transparent' : 'linear-gradient(135deg,#7c3aed,#06b6d4)'}}>
              {profile?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white">{initials}</span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              {uploadingPhoto
                ? <div className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin" />
                : <Camera size={11} className="text-slate-400" />}
            </div>
          </button>
          <div>
            <p className="text-xs text-2 mb-0.5">Your Profile</p>
            <h1 className="text-xl font-bold text-1">{profile?.displayName ?? 'Athlete'}</h1>
            <p className="text-xs text-2 mt-0.5">{profile?.email}</p>
          </div>
        </div>
        <button onClick={() => signOut(auth).then(() => router.push('/login'))}
          className="p-2 rounded-xl glass text-slate-500 hover:text-slate-300 transition-colors mt-1">
          <LogOut size={16} />
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4">

        {/* Programme Phase */}
        <div className="glass rounded-2xl p-5 border" style={{borderColor: currentPhase.color + '30'}}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} style={{color: currentPhase.color}} />
            <p className="text-xs font-semibold uppercase tracking-widest text-2">12-Week Programme</p>
          </div>

          {/* Phase progress */}
          <div className="flex gap-2 mb-4">
            {PHASE_INFO.map(p => (
              <div key={p.num} className="flex-1 rounded-xl p-3 border text-center"
                style={{
                  background: p.num === phase ? p.color + '15' : 'rgba(255,255,255,0.03)',
                  borderColor: p.num === phase ? p.color + '40' : 'rgba(255,255,255,0.06)',
                }}>
                <p className="text-xs font-bold" style={{color: p.num === phase ? p.color : '#475569'}}>
                  Phase {p.num}
                </p>
                <p className="text-xs text-3">Wk {p.weeks}</p>
                {p.num === phase && <div className="w-1.5 h-1.5 rounded-full mx-auto mt-1.5" style={{background: p.color}} />}
              </div>
            ))}
          </div>

          <div className="glass rounded-xl p-3 mb-3">
            <p className="text-xs font-semibold text-1">{currentPhase.name}</p>
            <p className="text-xs text-2 mt-0.5">{currentPhase.desc}</p>
          </div>

          {/* Week selector */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-2">Current week: <span className="font-bold text-1">W{programmeWeek}</span></p>
            <button onClick={() => setEditingWeek(!editingWeek)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg glass"
              style={{color: currentPhase.color}}>
              <Edit3 size={11} /> {editingWeek ? 'Done' : 'Change'}
            </button>
          </div>

          {editingWeek && (
            <div className="grid grid-cols-6 gap-1.5">
              {Array.from({length: 12}, (_, i) => i + 1).map(w => {
                const ph = PHASE_INFO[w <= 4 ? 0 : w <= 8 ? 1 : 2]
                return (
                  <button key={w} onClick={() => updateWeek(w)}
                    className="py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: programmeWeek === w ? ph.color : ph.color + '15',
                      color: programmeWeek === w ? '#fff' : ph.color,
                    }}>
                    W{w}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Training Programme Selector */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Dumbbell size={16} className="text-violet-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-2">Training Programme</p>
            </div>
            {savingProgramme && <span className="text-xs text-2 animate-pulse">Saving…</span>}
          </div>
          <div className="space-y-2">
            {PROGRAMME_OPTIONS.map(opt => {
              const isActive = selectedProgramme === opt.key
              return (
                <button key={opt.key} onClick={() => changeProgramme(opt.key)}
                  className="w-full text-left glass rounded-xl p-3 transition-all"
                  style={{
                    background: isActive ? opt.color + '15' : undefined,
                    border: isActive ? `1px solid ${opt.color}40` : '1px solid transparent',
                  }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{opt.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-1 truncate">{opt.label}</p>
                        {isActive && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                            style={{background: opt.color + '20', color: opt.color}}>
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-2 mt-0.5">{opt.days} · {opt.desc}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Body Stats */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Scale size={16} className="text-violet-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-2">Body Metrics</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Current Weight', value: `${profile?.weightKg ?? '--'} kg`, color: 'text-indigo-400' },
              { label: 'Target Weight',  value: `${profile?.targetWeightKg ?? '--'} kg`, color: 'text-emerald-400' },
              { label: 'Height',         value: `${profile?.heightCm ?? '--'} cm`, color: 'text-amber-400' },
              { label: 'Age',            value: `${profile?.age ?? '--'} yrs`, color: 'text-rose-400' },
            ].map(item => (
              <div key={item.label} className="glass rounded-xl p-3">
                <p className="text-xs text-2">{item.label}</p>
                <p className={`font-bold text-lg ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Weight to goal */}
          {profile && (
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-2">Progress to goal</span>
                <span className="text-emerald-400 font-semibold">
                  {Math.max(0, profile.weightKg - profile.targetWeightKg).toFixed(1)} kg to go
                </span>
              </div>
              <div className="w-full rounded-full h-2" style={{background:'rgba(255,255,255,0.06)'}}>
                <div className="h-2 rounded-full transition-all"
                  style={{width:`${Math.min(progressPct, 100)}%`, background:'linear-gradient(90deg,#10b981,#059669)'}} />
              </div>
            </div>
          )}
        </div>

        {/* Nutrition Targets */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-emerald-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-2">Daily Targets</p>
            </div>
            <p className="text-xs text-3">Macros auto-adjust when you edit calories</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* Calories — editable */}
            <div className="glass rounded-xl p-3 col-span-2">
              {editingCalories ? (
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔥</span>
                  <input
                    type="number"
                    value={calorieInput}
                    onChange={e => setCalorieInput(e.target.value)}
                    min={800} max={6000}
                    className="flex-1 bg-transparent text-emerald-400 font-bold text-sm outline-none border-b border-emerald-500/50 pb-0.5"
                    placeholder="e.g. 2000"
                    autoFocus
                  />
                  <span className="text-xs text-2">kcal</span>
                  <button onClick={saveCalorieTarget} disabled={savingCalories}
                    className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingCalories(false)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-white/10 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🔥</span>
                  <div className="flex-1">
                    <p className="text-xs text-2">Calories</p>
                    <p className="font-bold text-sm" style={{color:'#10b981'}}>{profile?.calorieTarget ?? '--'} kcal</p>
                  </div>
                  <button onClick={() => { setCalorieInput(String(profile?.calorieTarget ?? '')); setEditingCalories(true) }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/10 transition-colors">
                    <Edit3 size={13} />
                  </button>
                </div>
              )}
            </div>
            {[
              { label: 'Protein', value: `${profile?.proteinTargetG ?? '--'}g`, color: '#6366f1', emoji: '🥩' },
              { label: 'Carbs',   value: `${profile?.carbTargetG ?? '--'}g`,    color: '#f59e0b', emoji: '🍚' },
              { label: 'Fat',     value: `${profile?.fatTargetG ?? '--'}g`,     color: '#ec4899', emoji: '🥑' },
            ].map(item => (
              <div key={item.label} className="glass rounded-xl p-3 flex items-center gap-2.5">
                <span className="text-xl">{item.emoji}</span>
                <div>
                  <p className="text-xs text-2">{item.label}</p>
                  <p className="font-bold text-sm" style={{color: item.color}}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Training Info */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-amber-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-2">Training Profile</p>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Goal',           value: GOAL_LABELS[profile?.goal ?? ''] ?? profile?.goal ?? '--' },
              { label: 'Activity Level', value: ACTIVITY_LABELS[profile?.activityLevel ?? ''] ?? profile?.activityLevel ?? '--' },
              { label: 'Experience',     value: profile?.experienceLevel ? profile.experienceLevel.charAt(0).toUpperCase() + profile.experienceLevel.slice(1) : '--' },
              { label: 'Equipment',      value: profile?.equipmentAccess === 'home' ? '🏠 Home Training' : profile?.equipmentAccess ?? '--' },
              { label: 'BMR',            value: `${profile?.bmr ?? '--'} kcal/day` },
              { label: 'TDEE',           value: `${profile?.tdee ?? '--'} kcal/day` },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-xs text-2">{item.label}</span>
                <span className="text-xs font-semibold text-1">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* XP info */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-amber-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-2">XP Rewards</p>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { action: 'Complete a workout', xp: '+150 XP', color: 'text-emerald-400' },
              { action: 'Log nutrition', xp: '+75 XP', color: 'text-indigo-400' },
              { action: 'Log weight', xp: '+25 XP', color: 'text-amber-400' },
              { action: 'Log cardio', xp: '+25 XP', color: 'text-rose-400' },
            ].map(item => (
              <div key={item.action} className="flex justify-between items-center glass rounded-xl px-3 py-2">
                <span className="text-2">{item.action}</span>
                <span className={`font-bold ${item.color}`}>{item.xp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Saved feedback */}
        {saved && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-2xl glass-strong text-sm font-semibold text-emerald-400">
            <Check size={14} /> Saved!
          </div>
        )}

        {/* Navigation */}
        <div className="glass rounded-2xl overflow-hidden">
          {[
            { label: 'Edit Onboarding / Recalculate Targets', href: '/onboarding' },
            { label: 'View Progress & Metrics', href: '/metrics' },
            { label: 'Request Data Deletion', href: '/delete-account' },
          ].map(item => (
            <a key={item.href} href={item.href}
              className="flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors border-b last:border-0 border-white/5">
              <span className={`text-sm ${item.href === '/delete-account' ? 'text-rose-400' : 'text-1'}`}>{item.label}</span>
              <ChevronRight size={16} className="text-2" />
            </a>
          ))}
        </div>

        <button onClick={() => signOut(auth).then(() => router.push('/'))}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm glass text-rose-400 hover:bg-rose-500/10 transition-all">
          Sign Out
        </button>

        {/* Danger zone */}
        <div className="glass rounded-2xl p-4 border border-rose-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Trash2 size={14} className="text-rose-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-rose-400">Danger Zone</p>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Permanently delete your account and all associated data. This cannot be undone.
            A confirmation email will be sent to your address.
          </p>
          <button
            onClick={() => { setShowDeleteModal(true); setDeleteConfirm(''); setDeleteStep('confirm') }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2">
            <Trash2 size={14} /> Delete Account & All Data
          </button>
        </div>

        <p className="text-center text-xs text-3 pb-4">SBH · Science Based Health · v0.11</p>
      </div>
    </main>
  )
}
