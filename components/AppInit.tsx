'use client'

import { useEffect } from 'react'
import { initRemoteConfig } from '@/lib/feature-flags'

/**
 * Invisible component that runs one-time client-side app initialisation:
 * - Firebase Remote Config fetch (feature flags)
 * Rendered in the root layout so it runs on every page.
 */
export default function AppInit() {
  useEffect(() => {
    initRemoteConfig().catch(() => {/* non-critical */})
  }, [])
  return null
}
