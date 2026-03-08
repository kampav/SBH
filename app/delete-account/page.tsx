'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getProfile, deleteAllUserData } from '@/lib/firebase/firestore'
import { AlertTriangle, Check, Trash2, LogIn } from 'lucide-react'
import Link from 'next/link'

// Standalone account-deletion page — can be shared as a URL.
// Requires the user to be authenticated. If not, shows a sign-in prompt.
export default function DeleteAccountPage() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [uid, setUid] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [step, setStep] = useState<'idle' | 'deleting' | 'done'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) return
      setUid(user.uid)
      setEmail(user.email ?? null)
      const p = await getProfile(user.uid)
      setDisplayName(p?.displayName ?? user.displayName ?? user.email ?? null)
    })
    return unsub
  }, [])

  async function handleDelete() {
    if (!uid || !email || confirmText !== 'DELETE') return
    setStep('deleting')
    setError('')
    try {
      await deleteAllUserData(uid)
      // Fire confirmation email — best-effort
      fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName }),
      }).catch(() => {/* ignore */})
      setStep('done')
      await signOut(auth)
      // Clean up localStorage
      Object.keys(localStorage).filter(k => k.includes(uid)).forEach(k => localStorage.removeItem(k))
      setTimeout(() => router.push('/'), 3000)
    } catch {
      setError('Deletion failed. Please try again or contact support.')
      setStep('idle')
    }
  }

  if (!authReady) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  // Not authenticated
  if (!uid) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="w-full max-w-sm space-y-5 text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
            <span className="text-xl font-black text-white">HealthOS</span>
          </div>
          <h1 className="text-xl font-bold text-white">Account Deletion</h1>
          <div className="bg-slate-800 rounded-2xl p-6 space-y-4 text-left">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300">
                You must be signed in to delete your account. Please sign in first.
              </p>
            </div>
            <Link href="/login"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              <LogIn size={16} /> Sign In to Continue
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // Done
  if (step === 'done') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <Check size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Account Deleted</h1>
          <p className="text-slate-400 text-sm">
            All your data has been permanently removed. A confirmation email has been sent to{' '}
            <span className="text-white">{email}</span>.
          </p>
          <p className="text-slate-500 text-xs">Redirecting to home in 3 seconds…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
            <span className="text-xl font-black text-white">HealthOS</span>
          </div>
          <h1 className="text-xl font-bold text-white">Delete Account & Data</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Signed in as <span className="text-white">{email}</span>
          </p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-300">
              <span className="text-rose-400 font-bold">This cannot be undone.</span>{' '}
              All your data will be permanently and irreversibly deleted.
            </p>
          </div>

          {/* What gets deleted */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Data that will be deleted
            </p>
            {[
              'Profile & personal information',
              'All workout history & exercise logs',
              'All nutrition logs & meal entries',
              'Body measurements & progress photos',
              'Favourite foods',
              'All app settings & preferences',
            ].map(item => (
              <div key={item} className="flex items-center gap-2">
                <Trash2 size={11} className="text-rose-400 shrink-0" />
                <span className="text-xs text-slate-400">{item}</span>
              </div>
            ))}
          </div>

          {/* Email notice */}
          <p className="text-xs text-slate-500 border-t border-slate-700 pt-3">
            A confirmation email will be sent to{' '}
            <span className="text-slate-300 font-medium">{email}</span>{' '}
            after deletion is complete.
          </p>

          {/* Confirm input */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Type <span className="text-rose-400 font-bold font-mono">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value.toUpperCase())}
              placeholder="DELETE"
              disabled={step === 'deleting'}
              className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:border-rose-500 focus:outline-none placeholder:text-slate-500 text-sm font-mono"
            />
          </div>

          {error && (
            <p className="text-rose-400 text-xs">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Link href="/profile"
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-center text-slate-300 border border-slate-700 hover:bg-white/5 transition-colors">
              Cancel
            </Link>
            <button
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || step === 'deleting'}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: '#ef4444' }}>
              {step === 'deleting' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  Delete Everything
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
