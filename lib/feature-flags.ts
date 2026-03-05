// lib/feature-flags.ts
// All flags default TRUE during free phase (until 10k users / billing launch).
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

/**
 * Check if a flag is enabled. During free phase all flags default true.
 * Replace this with Firebase Remote Config lookup post-launch.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isEnabled(flag: FlagKey, tier: UserTier = 'free'): boolean {
  return FLAGS[flag]?.default ?? false
}

/** React hook — synchronous during free phase */
export function useFlag(flag: FlagKey, tier: UserTier = 'free'): boolean {
  return isEnabled(flag, tier)
}
