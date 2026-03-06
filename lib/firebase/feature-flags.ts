// lib/feature-flags.ts
// All flags default TRUE during free phase (until 10k users / billing launch).
// Firebase Remote Config overrides the defaults when initRemoteConfig() has run.
// When monetisation launches: change defaults to false and tier-gate accordingly.

export type UserTier = 'free' | 'pro' | 'premium'

export const FLAGS = {
  // Core — always free
  'core.calorie_tracking':     { default: true, tiers: ['free','pro','premium'] as UserTier[] },
  'core.workout_logging':      { default: true, tiers: ['free','pro','premium'] as UserTier[] },
  'core.weight_tracker':       { default: true, tiers: ['free','pro','premium'] as UserTier[] },
  'core.barcode_scan':         { default: true, tiers: ['free','pro','premium'] as UserTier[] },
  'core.glucose_tracking':     { default: true, tiers: ['free','pro','premium'] as UserTier[] },

  // Pro features (gated post-launch)
  'pro.photo_recognition':     { default: true, tiers: ['pro','premium'] as UserTier[] },
  'pro.advanced_analytics':    { default: true, tiers: ['pro','premium'] as UserTier[] },
  'pro.micronutrients':        { default: true, tiers: ['pro','premium'] as UserTier[] },
  'pro.export_data':           { default: true, tiers: ['pro','premium'] as UserTier[] },
  'pro.no_ads':                { default: true, tiers: ['pro','premium'] as UserTier[] },

  // Premium features (gated post-launch)
  'premium.ai_coach':          { default: true, tiers: ['premium'] as UserTier[] },
  'premium.meal_plans':        { default: true, tiers: ['premium'] as UserTier[] },
  'premium.care_team_share':   { default: true, tiers: ['premium'] as UserTier[] },
  'premium.glucose_predict':   { default: true, tiers: ['premium'] as UserTier[] },

  // Ops kill-switches
  'ops.food_photo_api':        { default: true, tiers: ['free','pro','premium'] as UserTier[] },
  'ops.ai_insights':           { default: true, tiers: ['free','pro','premium'] as UserTier[] },
  'ops.glucose_nudge':         { default: true, tiers: ['free','pro','premium'] as UserTier[] },
} as const

export type FlagKey = keyof typeof FLAGS

// ── Firebase Remote Config cache ───────────────────────────────────────────────
// Populated by initRemoteConfig() on first app load; isEnabled() reads from here.
const _rcCache: Partial<Record<FlagKey, boolean>> = {}

/**
 * Async init — call once at app startup (client-side only).
 * Fetches Remote Config, activates, and populates _rcCache.
 * Falls back silently to FLAGS.default if Remote Config is unavailable.
 * Cache TTL: 12 hours (minimumFetchIntervalMillis).
 */
export async function initRemoteConfig(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const [{ getRemoteConfig, fetchAndActivate, getBoolean }, { getApp, getApps }] =
      await Promise.all([
        import('firebase/remote-config'),
        import('firebase/app'),
      ])
    if (!getApps().length) return
    const rc = getRemoteConfig(getApp())
    rc.settings.minimumFetchIntervalMillis = 12 * 60 * 60 * 1000

    // Seed defaults so Remote Config has sensible values before first fetch
    rc.defaultConfig = Object.fromEntries(
      Object.entries(FLAGS).map(([k, v]) => [k.replace(/\./g, '_'), v.default])
    )

    await fetchAndActivate(rc)
    ;(Object.keys(FLAGS) as FlagKey[]).forEach(flag => {
      const rcKey = flag.replace(/\./g, '_')
      _rcCache[flag] = getBoolean(rc, rcKey)
    })
  } catch {
    // Remote Config unavailable — keep using FLAGS.default values
  }
}

/**
 * Check if a flag is enabled.
 * Reads from Remote Config cache when available, otherwise defaults to FLAGS.default.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isEnabled(flag: FlagKey, tier: UserTier = 'free'): boolean {
  if (flag in _rcCache) return _rcCache[flag]!
  return FLAGS[flag]?.default ?? false
}

/** Synchronous React hook — reads Remote Config cache (populated after initRemoteConfig) */
export function useFlag(flag: FlagKey, tier: UserTier = 'free'): boolean {
  return isEnabled(flag, tier)
}
