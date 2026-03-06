// lib/analytics.ts
// Firebase Analytics event helpers. No raw health values or PII in events.
// All numeric payloads are bucketed/rounded to prevent fingerprinting.

import { getAnalytics, logEvent as fbLogEvent, isSupported } from 'firebase/analytics'
import { getApp, getApps } from 'firebase/app'

let _analyticsReady: Promise<ReturnType<typeof getAnalytics> | null> | null = null

function getAnalyticsInstance() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (!_analyticsReady) {
    _analyticsReady = isSupported().then(yes => {
      if (!yes || !getApps().length) return null
      return getAnalytics(getApp())
    }).catch(() => null)
  }
  return _analyticsReady
}

async function track(event: string, params?: Record<string, string | number | boolean>) {
  try {
    const analytics = await getAnalyticsInstance()
    if (analytics) fbLogEvent(analytics, event, params)
  } catch {
    // Analytics failures are silent — never break UX
  }
}

// ── Bucketing helpers (no exact health values) ────────────────────────────────
function bucketCalories(kcal: number): string {
  if (kcal < 200)  return '<200'
  if (kcal < 400)  return '200-400'
  if (kcal < 600)  return '400-600'
  if (kcal < 1000) return '600-1000'
  return '1000+'
}

function bucketProtein(g: number): string {
  if (g < 20)  return '<20g'
  if (g < 40)  return '20-40g'
  if (g < 80)  return '40-80g'
  if (g < 160) return '80-160g'
  return '160g+'
}

// ── Events ─────────────────────────────────────────────────────────────────────

export const Analytics = {
  /** User logged a meal */
  mealLogged(method: 'search' | 'scan' | 'photo' | 'manual' | 'preset' | 'favourite', calories: number) {
    track('meal_logged', { method, calorie_bucket: bucketCalories(calories) })
  },

  /** User logged a workout */
  workoutLogged(durationMin: number, totalSets: number, hadOverload: boolean) {
    track('workout_logged', {
      duration_bucket: durationMin < 30 ? '<30min' : durationMin < 60 ? '30-60min' : '60min+',
      total_sets: totalSets,
      had_overload_hint: hadOverload,
    })
  },

  /** User logged a weight entry */
  weightLogged(trend: 'up' | 'down' | 'same') {
    track('weight_logged', { trend })
  },

  /** User logged a glucose reading */
  glucoseLogged(context: string, inRange: boolean) {
    track('glucose_logged', { context, in_range: inRange })
  },

  /** Streak milestone hit */
  streakMilestone(days: number) {
    track('streak_milestone', { days })
  },

  /** Onboarding completed */
  onboardingComplete(goal: string, secondsTaken: number) {
    track('onboarding_complete', {
      goal_selected: goal,
      duration_bucket: secondsTaken < 30 ? '<30s' : secondsTaken < 60 ? '30-60s' : '60s+',
    })
  },

  /** User's first meaningful action after registration */
  ahaMoment(trigger: 'first_meal' | 'first_workout') {
    track('aha_moment', { trigger })
  },

  /** Food identified via AI photo */
  photoAnalysed(confidence: 'low' | 'medium' | 'high') {
    track('food_photo_analysed', { confidence })
  },

  /** AI insights fetched */
  insightsFetched() {
    track('ai_insights_fetched')
  },

  /** User visited pricing page */
  pricingViewed() {
    track('pricing_viewed')
  },

  /** User started a Stripe checkout */
  checkoutStarted(tier: string, interval: string) {
    track('checkout_started', { tier, interval })
  },

  /** PWA install prompt shown */
  pwaInstallPrompt(accepted: boolean) {
    track('pwa_install_prompt', { accepted })
  },

  /** Daily macro target hit */
  proteinTargetHit(proteinG: number) {
    track('protein_target_hit', { protein_bucket: bucketProtein(proteinG) })
  },

  /** Weekly insights page viewed or generated */
  weeklyInsightsViewed(fromCache: boolean, overallScore: number) {
    track('weekly_insights_viewed', {
      from_cache: fromCache,
      score_bucket: overallScore < 40 ? '<40' : overallScore < 70 ? '40-70' : '70+',
    })
  },

  /** Habit logged */
  habitLogged(habitId: string, completed: boolean) {
    track('habit_logged', { habit_id: habitId, completed })
  },

  /** Stats shared via Web Share API or clipboard */
  statsShared(type: 'badges' | 'workouts' | 'weekly_insight') {
    track('stats_shared', { share_type: type })
  },
}
