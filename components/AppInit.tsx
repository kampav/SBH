'use client'

import { useEffect } from 'react'
import { initRemoteConfig } from '@/lib/firebase/feature-flags'
import { loadExperimentConfigs } from '@/lib/firebase/ab-testing'

/**
 * Invisible component that runs one-time client-side app initialisation:
 * - Firebase Remote Config fetch (feature flags)
 * - A/B experiment config load (also from Remote Config)
 * Rendered in the root layout so it runs on every page.
 */
export default function AppInit() {
  useEffect(() => {
    initRemoteConfig()
      .then(() => loadExperimentConfigs())
      .catch(() => {/* non-critical */})
  }, [])
  return null
}
