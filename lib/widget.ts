// lib/widget.ts
// Updates the Android Glance home-screen widget whenever the user logs a meal
// or opens the Nutrition page.
//
// Safe to call from any platform — silently does nothing on web and iOS.
// Only executes when running inside the Capacitor Android wrapper.

import { type WidgetDataInput } from './widget-plugin'

/**
 * Push today's calorie/macro totals and current streak to the Android widget.
 * Call this after every addMeal / deleteMeal and on page load.
 */
export async function updateWidgetData(data: WidgetDataInput): Promise<void> {
  if (typeof window === 'undefined') return   // SSR guard

  try {
    const { Capacitor } = await import('@capacitor/core')
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return

    const { WidgetDataPlugin } = await import('./widget-plugin')
    await WidgetDataPlugin.update(data)
  } catch {
    // Not in a Capacitor context, plugin not available, or no widget pinned — safe to ignore
  }
}

/**
 * Build a WidgetDataInput from the data already available in the Nutrition page.
 */
export function buildWidgetData(opts: {
  caloriesConsumed: number
  caloriesTarget:   number
  proteinConsumed:  number
  carbsConsumed:    number
  fatConsumed:      number
  streak:           number
}): WidgetDataInput {
  return {
    caloriesConsumed: Math.round(opts.caloriesConsumed),
    caloriesTarget:   Math.round(opts.caloriesTarget),
    proteinConsumed:  Math.round(opts.proteinConsumed),
    carbsConsumed:    Math.round(opts.carbsConsumed),
    fatConsumed:      Math.round(opts.fatConsumed),
    streak:           opts.streak,
  }
}
