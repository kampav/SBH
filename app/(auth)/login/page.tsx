'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isNativeApp, setIsNativeApp] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    // window.Capacitor exists in all Capacitor WebViews (native and web platform)
    // isNativePlatform() returns true only when running as a real native binary
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; platform?: string } }).Capacitor
    setIsNativeApp(!!(cap && (cap.isNativePlatform?.() || cap.platform === 'android' || cap.platform === 'ios')))
  }, [])

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/invalid-credential' || code === 'auth/invalid-credentials' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Incorrect email or password. Please try again or create an account.')
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait a few minutes and try again.')
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your internet connection and try again.')
      } else {
        setError(err instanceof Error ? err.message : 'Sign in failed')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email) { setError('Enter your email above first, then click Forgot password.'); return }
    setLoading(true)
    setError('')
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/user-not-found') {
        setError('No account found with that email.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to send reset email')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setError('')
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      router.push('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      if (code === 'auth/popup-blocked') {
        setError('Popup blocked by your browser. Allow popups for this site and try again.')
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('Sign in cancelled.')
      } else if (code === 'auth/unauthorized-domain') {
        setError('This domain is not authorised for Google sign in. Contact support.')
      } else {
        setError((err as { message?: string }).message ?? 'Google sign in failed')
      }
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

        {!isNativeApp && (
          <>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
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
            className="w-full px-4 py-2.5 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-4 py-2.5 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {resetSent && <p className="text-emerald-400 text-sm">Password reset email sent — check your inbox, then log in with your new password.</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading}
            className="w-full text-slate-400 text-sm hover:text-slate-200 transition-colors"
          >
            Forgot password / set password for Google account
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm">
          No account?{' '}
          <Link href="/register" className="text-emerald-400 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}
