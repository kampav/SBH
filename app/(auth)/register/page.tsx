'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter, useSearchParams } from 'next/navigation'
import { saveProfile } from '@/lib/firebase/firestore'
import Link from 'next/link'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [hint, setHint]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [inviterName, setInviterName] = useState<string | null>(null)
  const [refCode, setRefCode]   = useState<string | null>(null)

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (!ref) return
    setRefCode(ref)
    fetch(`/api/referral/${ref}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.displayName) setInviterName(data.displayName) })
      .catch(() => {})
  }, [searchParams])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setHint('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      await updateProfile(cred.user, { displayName: name.trim() })
      if (refCode) {
        await saveProfile(cred.user.uid, { referredBy: refCode })
      }
      router.push('/onboarding')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.')
        setHint('Try signing in instead, or use "Forgot password" on the sign-in page to reset your password.')
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.')
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
      } else if (code === 'auth/network-request-failed') {
        setError('No internet connection. Check your network and try again.')
      } else {
        setError(`Registration failed — ${code || 'unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm space-y-5">

        {/* Branding */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
            <span className="text-xl font-black text-white">HealthOS</span>
          </div>
          <h1 className="text-xl font-bold text-white">Create your account</h1>
          <p className="text-slate-400 text-sm mt-0.5">Start your health journey today</p>
        </div>

        {/* Invited-by banner */}
        {inviterName && (
          <div className="rounded-xl p-3 text-center text-sm font-medium"
            style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>
            🎉 Invited by {inviterName} — welcome to HealthOS!
          </div>
        )}

        <div className="bg-slate-800 rounded-2xl p-6 space-y-4">
          <form onSubmit={handleRegister} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name"
              required
              autoComplete="name"
              className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:border-violet-500 focus:outline-none placeholder:text-slate-500 text-sm"
            />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              required
              autoComplete="email"
              className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:border-violet-500 focus:outline-none placeholder:text-slate-500 text-sm"
            />
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                minLength={6}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 pr-16 bg-slate-700 text-white rounded-xl border border-slate-600 focus:border-violet-500 focus:outline-none placeholder:text-slate-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-medium px-1 py-0.5"
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>

            {error && (
              <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm font-medium">{error}</p>
                {hint && <p className="text-slate-400 text-xs mt-1 leading-relaxed">{hint}</p>}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-50 active:scale-[0.98] transition-all text-sm"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-400 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-violet-400 hover:text-violet-300 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
