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

// Detect real native binary (Android/iOS Capacitor app).
// @capacitor/core bundles its runtime into the web JS, so window.Capacitor
// exists in ALL browsers — only isNativePlatform() distinguishes native.
function getIsNative(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; platform?: string }
  }).Capacitor
  if (!cap) return false
  return !!(cap.isNativePlatform?.() || cap.platform === 'android' || cap.platform === 'ios')
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isNative, setIsNative] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    setIsNative(getIsNative())
  }, [])

  function friendlyError(code: string, fallback: string): string {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/invalid-credentials':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Incorrect email or password. Try again or reset your password.'
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Wait a few minutes and try again.'
      case 'auth/network-request-failed':
        return 'Network error. Check your internet connection and try again.'
      case 'auth/user-disabled':
        return 'This account has been disabled. Contact support.'
      case 'auth/popup-blocked':
        return 'Popup blocked. Allow popups for this site and try again.'
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'Sign in cancelled.'
      case 'auth/unauthorized-domain':
        return 'This domain is not authorised for Google sign in.'
      default:
        return fallback ? `${fallback} (${code})` : `Error: ${code}`
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const msg = (err as { message?: string }).message ?? 'Sign in failed'
      setError(friendlyError(code, msg))
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email above first, then click Forgot password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const msg = (err as { message?: string }).message ?? 'Failed to send reset email'
      setError(friendlyError(code, msg))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setError('')
    try {
      await signInWithPopup(auth, new GoogleAuthProvider(), browserPopupRedirectResolver)
      router.push('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const msg = (err as { message?: string }).message ?? 'Google sign in failed'
      setError(friendlyError(code, msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm bg-slate-800 rounded-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">SBH</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Google sign-in — web only (native Android/iOS uses email/password) */}
        {!isNative && (
          <>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-slate-500 text-xs">or</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>
          </>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            autoComplete="email"
            className="w-full px-4 py-2.5 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-violet-500 focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="current-password"
            className="w-full px-4 py-2.5 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-violet-500 focus:outline-none"
          />
          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}
          {resetSent && (
            <p className="text-emerald-400 text-sm">
              Password reset email sent — check your inbox.
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading}
            className="w-full text-slate-400 text-sm hover:text-slate-200 transition-colors"
          >
            Forgot password?
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm">
          No account?{' '}
          <Link href="/register" className="text-violet-400 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}
