'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@/lib/firebase/analytics'
import { Download, X } from 'lucide-react'

const DISMISSED_KEY = 'sbh_pwa_dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(DISMISSED_KEY)) return

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!visible || !prompt) return null

  async function handleInstall() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    Analytics.pwaInstallPrompt(outcome === 'accepted')
    setVisible(false)
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    Analytics.pwaInstallPrompt(false)
    setVisible(false)
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 glass-strong rounded-2xl p-4 flex items-center gap-3 border border-violet-500/30"
      style={{ boxShadow: '0 8px 32px -4px rgba(124,58,237,0.3)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
        <Download size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-1">Add SBH to Home Screen</p>
        <p className="text-xs text-2">Faster access · Works offline</p>
      </div>
      <button onClick={handleInstall}
        className="px-3 py-1.5 rounded-xl text-xs font-bold text-white flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
        Install
      </button>
      <button onClick={handleDismiss} className="p-1 flex-shrink-0 opacity-50 hover:opacity-80">
        <X size={14} style={{ color: 'var(--text-2)' }} />
      </button>
    </div>
  )
}
