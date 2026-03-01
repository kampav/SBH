import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div>
          <h1 className="text-5xl font-bold tracking-tight">SBH</h1>
          <p className="text-lg text-slate-300 mt-2">Science Based Health</p>
          <p className="text-sm text-slate-400 mt-1">Evidence-backed training, nutrition & AI coaching</p>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Link
            href="/login"
            className="w-full py-3 px-6 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
          >
            Create Account
          </Link>
        </div>

        <p className="text-xs text-slate-500 pt-4">
          Powered by science. Built with Next.js + Firebase + GCP.
        </p>
      </div>
    </main>
  )
}
