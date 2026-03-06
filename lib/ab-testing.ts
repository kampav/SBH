// lib/ab-testing.ts
// Lightweight A/B / multivariate experiment framework backed by Firebase Remote Config.
//
// Usage:
//   const variant = getVariant('dashboard_cta', uid)
//   // Returns 'control' | 'variant_a' | 'variant_b'
//
// Remote Config key format: experiment__<name>
// Remote Config value format: JSON like { "variants": ["control","variant_a"], "weights": [0.5, 0.5] }
// If the RC key is absent or malformed, falls back to 'control'.
//
// Variant assignment is deterministic per (uid + experimentName) — the same
// user always sees the same variant until you change the experiment config.

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExperimentConfig {
  variants: string[]     // e.g. ['control', 'variant_a', 'variant_b']
  weights:  number[]     // must sum to 1; e.g. [0.5, 0.25, 0.25]
}

// Cache of experiment configs loaded from Remote Config
const _experimentCache: Record<string, ExperimentConfig> = {}

// ── Experiment registry ────────────────────────────────────────────────────────
// Define experiments here. Remote Config can override any of these at runtime.

export const EXPERIMENTS: Record<string, ExperimentConfig> = {
  // Example: test a "Quick Add" shortcut on the dashboard CTA
  dashboard_quick_add: {
    variants: ['control', 'quick_add_button'],
    weights:  [0.5, 0.5],
  },
  // Example: test two different calorie-remaining copy styles
  calories_display_style: {
    variants: ['control', 'percentage', 'traffic_light'],
    weights:  [0.5, 0.25, 0.25],
  },
  // Example: onboarding flow length
  onboarding_length: {
    variants: ['control', 'short'],
    weights:  [0.5, 0.5],
  },
}

export type ExperimentName = keyof typeof EXPERIMENTS

// ── Hash function ─────────────────────────────────────────────────────────────

/**
 * djb2 hash — fast, deterministic, returns a float in [0, 1).
 * Same (uid + name) always returns the same bucket.
 */
function hashToBucket(uid: string, experimentName: string): number {
  const key = `${uid}::${experimentName}`
  let h = 5381
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h) ^ key.charCodeAt(i)
    h = h >>> 0 // keep as unsigned 32-bit
  }
  return (h % 10000) / 10000 // [0, 1)
}

// ── Core ─────────────────────────────────────────────────────────────────────

/**
 * Returns the variant assigned to `uid` for `experimentName`.
 *
 * Priority:
 *  1. Remote Config override (populated by `loadExperimentConfig`)
 *  2. EXPERIMENTS registry defaults
 *  3. 'control' (safe fallback)
 */
export function getVariant(experimentName: ExperimentName | string, uid: string): string {
  const config: ExperimentConfig =
    _experimentCache[experimentName] ??
    EXPERIMENTS[experimentName as ExperimentName] ??
    { variants: ['control'], weights: [1] }

  if (!config.variants.length) return 'control'

  const bucket = hashToBucket(uid, experimentName)
  let cumulative = 0
  for (let i = 0; i < config.variants.length; i++) {
    cumulative += config.weights[i] ?? 0
    if (bucket < cumulative) return config.variants[i]
  }
  return config.variants[config.variants.length - 1] ?? 'control'
}

/**
 * Returns true if the user is in a non-control variant for this experiment.
 * Useful for simple on/off feature tests.
 */
export function isInExperiment(experimentName: ExperimentName | string, uid: string): boolean {
  return getVariant(experimentName, uid) !== 'control'
}

/**
 * Load experiment configurations from Firebase Remote Config.
 * Called once at app startup (in AppInit or a layout component).
 * Remote Config keys follow the pattern: `experiment__<name>`
 */
export async function loadExperimentConfigs(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const [{ getRemoteConfig, getValue }, { getApp, getApps }] =
      await Promise.all([
        import('firebase/remote-config'),
        import('firebase/app'),
      ])
    if (!getApps().length) return

    const rc = getRemoteConfig(getApp())

    for (const name of Object.keys(EXPERIMENTS)) {
      const raw = getValue(rc, `experiment__${name}`).asString()
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw) as ExperimentConfig
        if (Array.isArray(parsed.variants) && Array.isArray(parsed.weights)) {
          _experimentCache[name] = parsed
        }
      } catch {
        // malformed JSON — fall back to registry default
      }
    }
  } catch {
    // Remote Config not available — use registry defaults
  }
}
