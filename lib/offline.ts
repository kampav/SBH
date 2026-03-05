// lib/offline.ts
// PWA offline utilities: network status hook + sync queue helpers.
// Firestore offline persistence is enabled at the SDK level (lib/firebase.ts).
// This module handles UI-level online/offline signalling.
'use client'

import { useEffect, useState } from 'react'

/** Returns true when the browser has network connectivity. Reacts in real-time. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    const handleOnline  = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return online
}

/** Returns a stable string label for displaying sync state. */
export function syncStatusLabel(online: boolean, pendingCount = 0): string {
  if (!online) return pendingCount > 0 ? `Offline · ${pendingCount} pending` : 'Offline'
  if (pendingCount > 0) return `Syncing ${pendingCount} item${pendingCount > 1 ? 's' : ''}…`
  return 'Online'
}
