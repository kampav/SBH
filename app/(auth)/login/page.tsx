'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  browserPopupRedirectResolver,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Returns true only when running inside a real native Capacitor binary
// (Android/iOS). @capacitor/core is bundled into the web JS too, so
// window.Capacitor exists in all browsers — only isNativePlatform()
// correctly distinguishes a native binary from a browser session.
function detectNative(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; platform?: string }
  }).Capacitor
  if (!cap) return false
  return !!(cap.isNativePlatform?.() || cap.platform === 'android' || cap.platform === 'ios')
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [hint, setHint]         = useState('')   // secondary guidance below error
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [isNative, setIsNative] = useState(false)

  useEffect(() => { setIsNative(detectNative()) }, [])

  // ── Email / password sign-in ───────────────────────────────────────────────
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setHint(''); setSuccess('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        setError('Incorrect email or password.')
        setHint(
          isNative
            ? 'If you signed up with Google, tap "Forgot password" below to set a password for this device.'
            : 'If you signed up with Google, use "Continue with Google" above — or tap "Forgot password" to add an email/password to your account.'
        )
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait a few minutes and try again.')
      } else if (code === 'auth/network-request-failed') {
        setError('No internet connection. Check your network and try again.')
      } else if (code === 'auth/user-disabled') {
        setError('This account has been disabled. Contact support.')
      } else {
        setError(`Sign in failed — ${code || 'unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Google sign-in (web only) ──────────────────────────────────────────────
  async function handleGoogleLogin() {
    setLoading(true); setError(''); setHint(''); setSuccess('')
    try {
      await signInWithPopup(auth, new GoogleAuthProvider(), browserPopupRedirectResolver)
      router.push('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User dismissed — not an error worth showing
      } else if (code === 'auth/popup-blocked') {
        setError('Popup blocked by your browser. Allow popups for this site and try again.')
      } else if (code === 'auth/account-exists-with-different-credential') {
        setError('This email is already registered with a different sign-in method.')
        setHint('Try signing in with your email and password, or use "Forgot password" to set one.')
      } else {
        setError(`Google sign in failed — ${code || 'unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Password reset ─────────────────────────────────────────────────────────
  // This also works for Google accounts: Firebase sends a reset email that
  // lets the user add an email/password method to their existing account.
  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('Enter your email address above first, then tap "Forgot password".')
      return
    }
    setLoading(true); setError(''); setHint(''); setSuccess('')
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setSuccess(
        `Password reset email sent to ${email.trim()}. Check your inbox (and spam folder), ` +
        'click the link to set your password, then sign in here.'
      )
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      if (code === 'auth/user-not-found') {
        setError('No account found with that email address.')
        setHint('Check the address or create a new account below.')
      } else {
        setError(`Could not send reset email — ${code || 'unknown error'}`)
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
            <span className="text-xl font-black text-white">SBH</span>
          </div>
          <h1 className="text-xl font-bold text-white">Science Based Health</h1>
          <p className="text-slate-400 text-sm mt-0.5">Sign in to your account</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 space-y-4">

          {/* ── Google sign-in — web only ── */}
          {!isNative && (
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 px-4 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm"
              >
                <GoogleLogo />
                Continue with Google
              </button>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-slate-500 text-xs">or sign in with email</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
            </>
          )}

          {/* ── Android note ── */}
          {isNative && (
            <div className="rounded-xl p-3 text-xs text-slate-400 bg-slate-700/50 border border-slate-700">
              <strong className="text-slate-300 block mb-0.5">Using this app on Android?</strong>
              Sign in with your email and password below.
              If you created your account with Google, tap{' '}
              <strong className="text-violet-400">Forgot password</strong> to set a password
              — both will then work seamlessly with the same account.
            </div>
          )}

          {/* ── Email / password form ── */}
          <form onSubmit={handleEmailLogin} className="space-y-3">
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
                placeholder="Password"
                required
                autoComplete="current-password"
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

            {/* Error message */}
            {error && (
              <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm font-medium">{error}</p>
                {hint && <p className="text-slate-400 text-xs mt-1 leading-relaxed">{hint}</p>}
              </div>
            )}

            {/* Success message (password reset sent) */}
            {success && (
              <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-emerald-400 text-sm font-medium">Email sent!</p>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-50 active:scale-[0.98] transition-all text-sm"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Forgot / set password */}
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading}
            className="w-full py-2 text-sm text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors"
          >
            Forgot password? / Set password for Google account
          </button>
        </div>

        <p className="text-center text-slate-400 text-sm">
          No account?{' '}
          <Link href="/register" className="text-violet-400 hover:text-violet-300 font-semibold">
            Create one free
          </Link>
        </p>
      </div>
    </main>
  )
}
