'use client'

import { useOnlineStatus } from '@/lib/offline'

/**
 * Thin banner pinned at the top of the viewport while the device is offline.
 * Renders nothing when online — zero layout impact.
 */
export default function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2
                 bg-amber-500/90 backdrop-blur-sm text-black text-xs font-semibold py-2 px-4"
    >
      <span className="w-2 h-2 rounded-full bg-black/40 animate-pulse" />
      Offline — changes will sync when reconnected
    </div>
  )
}
