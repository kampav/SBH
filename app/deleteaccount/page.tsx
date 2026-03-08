'use client'

// /deleteaccount — Google Play Store compliant data-deletion page.
// Must be publicly accessible (unauthenticated users can view it).
// Authenticated users get the full deletion flow inline.
// Unauthenticated users see instructions and a sign-in prompt.

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getProfile, deleteAllUserData } from '@/lib/firebase/firestore'
import { AlertTriangle, Check, Trash2, LogIn, Mail, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

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
      fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName }),
      }).catch(() => {/* best-effort */})
      setStep('done')
      await signOut(auth)
      Object.keys(localStorage).filter(k => k.includes(uid)).forEach(k => localStorage.removeItem(k))
      setTimeout(() => router.push('/'), 3500)
    } catch {
      setError('Deletion failed. Please try again or email us at privacy@sciencebasedhealth.app')
      setStep('idle')
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!authReady) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </PageShell>
    )
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <PageShell>
        <div className="text-center space-y-4 py-10">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <Check size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Account Deleted</h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            All your data has been permanently deleted. A confirmation email has been sent to{' '}
            <span className="text-white">{email}</span>.
          </p>
          <p className="text-slate-500 text-xs">Redirecting…</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      {/* What gets deleted — always visible */}
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <AlertTriangle size={20} className="text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-white">Permanent deletion — cannot be undone</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Once deleted, your data cannot be recovered. You will receive a confirmation email.
            </p>
          </div>
        </div>

        {/* Data inventory */}
        <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Data permanently removed
          </p>
          {[
            ['👤', 'Account profile & personal information'],
            ['🏋️', 'All workout history & exercise logs'],
            ['🥗', 'All nutrition logs & meal entries (incl. micronutrients)'],
            ['🩸', 'Glucose readings & HbA1c history'],
            ['⚙️', 'Glucose settings & diabetic consent records'],
            ['📏', 'Body measurements & progress records'],
            ['⭐', 'Favourite foods & app preferences'],
            ['💳', 'Subscription & billing data'],
            ['🖼️', 'Profile photo'],
          ].map(([icon, label]) => (
            <div key={label as string} className="flex items-center gap-2.5">
              <span className="text-base">{icon}</span>
              <span className="text-xs text-slate-300">{label}</span>
            </div>
          ))}
        </div>

        {/* Alternative — request by email */}
        <div className="bg-slate-800/50 rounded-xl p-4 flex items-start gap-3">
          <Mail size={16} className="text-violet-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-slate-300">Prefer to delete by email?</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Send a deletion request from your registered email to{' '}
              <a href="mailto:privacy@sciencebasedhealth.app"
                className="text-violet-400 hover:text-violet-300">
                privacy@sciencebasedhealth.app
              </a>
              . We will complete deletion within 72 hours.
            </p>
          </div>
        </div>

        {/* ── Authenticated flow ──────────────────────────────────────────── */}
        {uid ? (
          <div className="bg-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-emerald-400" />
              <p className="text-xs text-slate-300">
                Signed in as <span className="text-white font-medium">{email}</span>
              </p>
            </div>

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

            {error && <p className="text-rose-400 text-xs">{error}</p>}

            <div className="flex gap-2">
              <Link href="/"
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-center text-slate-300 border border-slate-700 hover:bg-white/5 transition-colors">
                Cancel
              </Link>
              <button
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE' || step === 'deleting'}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
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
        ) : (
          /* ── Unauthenticated — sign in prompt ─────────────────────────── */
          <div className="bg-slate-800 rounded-2xl p-5 space-y-3">
            <p className="text-sm text-slate-300">
              You need to be signed in to delete your account. Please sign in first, then return
              to this page to complete deletion.
            </p>
            <Link href="/login"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              <LogIn size={16} />
              Sign In to Delete Account
            </Link>
            <p className="text-center text-xs text-slate-500">
              No account? Nothing to delete.{' '}
              <Link href="/" className="text-violet-400 hover:text-violet-300">Go home</Link>
            </p>
          </div>
        )}

        {/* Privacy policy link */}
        <p className="text-center text-xs text-slate-500">
          Read our{' '}
          <Link href="/privacy" className="text-violet-400 hover:text-violet-300">
            Privacy Policy
          </Link>{' '}
          to understand what data we hold and how it is used.
        </p>
      </div>
    </PageShell>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-900 flex items-start justify-center p-4 pt-10">
      <div className="w-full max-w-sm space-y-5">
        {/* Branding */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
            <span className="text-xl font-black text-white">HealthOS</span>
          </div>
          <h1 className="text-xl font-bold text-white">Delete Account & Data</h1>
          <p className="text-slate-400 text-sm mt-0.5">HealthOS</p>
        </div>
        {children}
      </div>
    </main>
  )
}
