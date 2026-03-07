'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, storage } from '@/lib/firebase'
import { getProfile, saveProfile, deleteAllUserData, saveFcmToken, getFcmTokenDoc, deleteFcmToken, getRecentWorkouts, getStreak, getSleepHistory, savePublicProfileFields } from '@/lib/firebase/firestore'
import { UserProfile, ProgrammeKey } from '@/lib/types'
import { LogOut, ChevronRight, Target, Activity, Scale, Zap, Calendar, Edit3, Check, Dumbbell, X, Camera, Trash2, AlertTriangle, Bell, BellOff, BarChart2, Share2, Link2, Users } from 'lucide-react'
import { shareStats } from '@/lib/utils'
import { calcMacros } from '@/lib/health/calculations'
import { enableNotifications, isNotificationSupported } from '@/lib/firebase/fcm'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import Link from 'next/link'

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

  // Notifications
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState({ streakReminder: true, workoutReminder: true, hydrationNudge: false })
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifSupported, setNotifSupported] = useState(false)
  const [testNotifStatus, setTestNotifStatus] = useState<'idle'|'sending'|'ok'|'err'>('idle')

  // My Stats
  const [myStats, setMyStats] = useState<{ totalWorkouts: number; totalVolumeKg: number; currentStreak: number; avgSleepH: number | null } | null>(null)

  // Social
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [togglingPublic, setTogglingPublic] = useState(false)
  const [copied, setCopied] = useState(false)

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
      // Lazily generate username + referral code if not yet set
      savePublicProfileFields(user.uid, p.displayName ?? '').then(({ username: u, referralCode: rc }) => {
        setUsername(u)
        setReferralCode(rc)
        setProfile(prev => prev ? { ...prev, username: u, referralCode: rc } : prev)
      })
      // Load notification state
      setNotifSupported(isNotificationSupported())
      const tokenDoc = await getFcmTokenDoc(user.uid)
      if (tokenDoc) { setNotifEnabled(true); setNotifPrefs(tokenDoc.prefs) }
      // Load My Stats
      const [workouts, streak, sleepHistory] = await Promise.all([
        getRecentWorkouts(user.uid, 90),
        getStreak(user.uid),
        getSleepHistory(user.uid, 30),
      ])
      const totalVolumeKg = workouts.reduce((sum, w) =>
        sum + w.exercises.reduce((es, ex) =>
          es + ex.sets.reduce((ss, s) => ss + (s.completed ? (s.weightKg || 0) * (s.reps || 0) : 0), 0), 0), 0)
      const sleepEntries = sleepHistory.filter(s => s.durationH != null && s.durationH > 0)
      const avgSleepH = sleepEntries.length > 0
        ? sleepEntries.reduce((s, e) => s + (e.durationH ?? 0), 0) / sleepEntries.length
        : null
      setMyStats({
        totalWorkouts: workouts.filter(w => w.exercises.some(e => e.sets.some(s => s.completed))).length,
        totalVolumeKg: Math.round(totalVolumeKg),
        currentStreak: streak?.currentStreak ?? 0,
        avgSleepH: avgSleepH != null ? Math.round(avgSleepH * 10) / 10 : null,
      })
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

        {/* My Stats */}
        {myStats && (
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={16} className="text-violet-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-2">My Stats</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/workout/history" className="glass rounded-xl p-3 hover:bg-violet-500/10 transition-colors">
                <p className="text-xs text-2">Workouts (90d)</p>
                <p className="font-bold text-lg" style={{ color: '#7c3aed' }}>{myStats.totalWorkouts}</p>
              </Link>
              <Link href="/workout/history" className="glass rounded-xl p-3 hover:bg-violet-500/10 transition-colors">
                <p className="text-xs text-2">Volume lifted</p>
                <p className="font-bold text-lg" style={{ color: '#06b6d4' }}>
                  {myStats.totalVolumeKg >= 1000
                    ? `${(myStats.totalVolumeKg / 1000).toFixed(1)}t`
                    : `${myStats.totalVolumeKg}kg`}
                </p>
              </Link>
              <Link href="/metrics" className="glass rounded-xl p-3 hover:bg-violet-500/10 transition-colors">
                <p className="text-xs text-2">Current streak</p>
                <p className="font-bold text-lg" style={{ color: '#f59e0b' }}>
                  {myStats.currentStreak} {myStats.currentStreak === 1 ? 'day' : 'days'}
                </p>
              </Link>
              <Link href="/sleep" className="glass rounded-xl p-3 hover:bg-violet-500/10 transition-colors">
                <p className="text-xs text-2">Avg sleep (30d)</p>
                <p className="font-bold text-lg" style={{ color: '#10b981' }}>
                  {myStats.avgSleepH != null ? `${myStats.avgSleepH}h` : '--'}
                </p>
              </Link>
            </div>
          </div>
        )}

        {/* Invite Friends + Public Profile */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-violet-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-2">Invite Friends</p>
          </div>

          {/* Public profile toggle */}
          <div className="flex items-center justify-between glass rounded-xl px-3 py-2.5 mb-3">
            <div>
              <p className="text-xs font-semibold text-1">Public Profile</p>
              <p className="text-xs text-3">Appear on the weekly leaderboard</p>
            </div>
            <button
              onClick={async () => {
                if (!uid || togglingPublic) return
                setTogglingPublic(true)
                const next = !profile?.publicProfile
                await saveProfile(uid, { publicProfile: next })
                setProfile(p => p ? { ...p, publicProfile: next } : p)
                setTogglingPublic(false)
              }}
              disabled={togglingPublic}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
              style={{ background: profile?.publicProfile ? '#7c3aed' : 'rgba(255,255,255,0.1)' }}>
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${profile?.publicProfile ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Referral link */}
          {referralCode && (
            <>
              <div className="glass rounded-xl p-3 mb-2">
                <p className="text-xs text-2 mb-1">Your invite link</p>
                <p className="text-xs font-mono text-violet-300 break-all">
                  {typeof window !== 'undefined' ? window.location.origin : 'https://sbhealth.app'}/register?ref={referralCode}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const url = `${window.location.origin}/register?ref=${referralCode}`
                    await navigator.clipboard.writeText(url)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2500)
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 glass"
                  style={{ color: copied ? '#34d399' : '#7c3aed', borderColor: 'rgba(124,58,237,0.3)', border: '1px solid' }}>
                  <Link2 size={12} />
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={() => shareStats(
                    'Join me on SBH',
                    `I'm tracking my health & fitness on Science Based Health. Join me! 💪\n${window.location.origin}/register?ref=${referralCode}`,
                  )}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 glass"
                  style={{ color: '#06b6d4', borderColor: 'rgba(6,182,212,0.3)', border: '1px solid' }}>
                  <Share2 size={12} />
                  Share
                </button>
              </div>
              {username && profile?.publicProfile && (
                <p className="text-xs text-2 mt-2 text-center">
                  Public profile:{' '}
                  <a href={`/u/${username}`} className="text-violet-400 hover:underline font-mono">/u/{username}</a>
                </p>
              )}
            </>
          )}
        </div>

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

        {/* Notifications */}
        {notifSupported && (
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-violet-400" />
                <p className="text-xs font-semibold uppercase tracking-widest text-2">Push Notifications</p>
              </div>
              <button
                onClick={async () => {
                  if (!uid) return
                  setNotifLoading(true)
                  try {
                    if (notifEnabled) {
                      await deleteFcmToken(uid)
                      setNotifEnabled(false)
                    } else {
                      const token = await enableNotifications()
                      if (token) {
                        await saveFcmToken(uid, token, notifPrefs)
                        setNotifEnabled(true)
                      }
                    }
                  } finally {
                    setNotifLoading(false)
                  }
                }}
                disabled={notifLoading}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{ background: notifEnabled ? '#7c3aed' : 'rgba(255,255,255,0.1)' }}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${notifEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {notifEnabled ? (
              <div className="space-y-2">
                {([
                  { key: 'streakReminder', label: 'Daily streak reminder', desc: 'If nothing logged by 8 pm' },
                  { key: 'workoutReminder', label: 'Workout reminders', desc: 'On scheduled training days' },
                  { key: 'hydrationNudge', label: 'Hydration nudge', desc: 'At noon if water intake is low' },
                ] as const).map(({ key, label, desc }) => (
                  <div key={key} className="glass rounded-xl px-3 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-1">{label}</p>
                      <p className="text-xs text-3">{desc}</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (!uid) return
                        const next = { ...notifPrefs, [key]: !notifPrefs[key] }
                        setNotifPrefs(next)
                        const tokenDoc = await getFcmTokenDoc(uid)
                        if (tokenDoc) await saveFcmToken(uid, tokenDoc.token, next)
                      }}
                      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0"
                      style={{ background: notifPrefs[key] ? '#7c3aed' : 'rgba(255,255,255,0.1)' }}>
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${notifPrefs[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
                {/* Test notification button */}
                <button
                  onClick={async () => {
                    if (!uid || testNotifStatus === 'sending') return
                    setTestNotifStatus('sending')
                    try {
                      let tokenDoc = await getFcmTokenDoc(uid)
                      // If no stored token, try to refresh it
                      if (!tokenDoc?.token) {
                        const freshToken = await enableNotifications()
                        if (freshToken) {
                          await saveFcmToken(uid, freshToken, notifPrefs)
                          tokenDoc = { token: freshToken, prefs: notifPrefs }
                        } else {
                          setTestNotifStatus('err')
                          return
                        }
                      }
                      const res = await fetch('/api/fcm/notify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          token: tokenDoc.token,
                          title: '🔔 SBH Test Notification',
                          body: 'Push notifications are working correctly!',
                          url: '/dashboard',
                          tag: 'test',
                        }),
                      })
                      setTestNotifStatus(res.ok ? 'ok' : 'err')
                    } catch {
                      setTestNotifStatus('err')
                    } finally {
                      setTimeout(() => setTestNotifStatus('idle'), 4000)
                    }
                  }}
                  disabled={testNotifStatus === 'sending'}
                  className="w-full mt-1 py-2 rounded-xl text-xs font-semibold border border-white/10 transition-all"
                  style={{
                    color: testNotifStatus === 'ok' ? '#34d399' : testNotifStatus === 'err' ? '#f87171' : '#a78bfa',
                    background: 'rgba(255,255,255,0.03)',
                  }}>
                  {testNotifStatus === 'sending' ? 'Sending…'
                    : testNotifStatus === 'ok' ? '✓ Test sent!'
                    : testNotifStatus === 'err' ? '✗ Failed — enable notifications first'
                    : 'Send test notification'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <BellOff size={14} />
                <span>Enable to get streak, workout, and hydration reminders</span>
              </div>
            )}
          </div>
        )}

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
            { label: 'Weekly Challenges & Leaderboard', href: '/challenges' },
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

        {/* Data portability (GDPR Art 20) */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-2">Data Export</p>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Download all your SBH data as a CSV file (GDPR Article 20 — Right to Data Portability).
            Includes nutrition, workouts, body metrics, sleep, and glucose readings.
          </p>
          <button
            onClick={async () => {
              const token = await auth.currentUser?.getIdToken()
              if (!token) return
              const res = await fetch('/api/export', { headers: { Authorization: `Bearer ${token}` } })
              if (!res.ok) return
              const blob = await res.blob()
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = `sbh-export-${new Date().toISOString().slice(0,10)}.csv`
              a.click(); URL.revokeObjectURL(url)
            }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold border border-violet-500/30 hover:bg-violet-500/10 transition-all flex items-center justify-center gap-2"
            style={{ color: '#7c3aed' }}>
            ↓ Export my data (CSV)
          </button>
        </div>

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

        <p className="text-center text-xs text-3 pb-4">SBH · Science Based Health · v1.8.0</p>
      </div>
    </main>
  )
}
