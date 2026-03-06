// lib/widget-plugin.ts
// Typed Capacitor plugin registration for the WidgetData native plugin.
// Used only by lib/widget.ts — do not call directly.
//
// Native side: android/app/src/main/java/com/.../plugin/WidgetDataPlugin.kt

import { registerPlugin } from '@capacitor/core'

export interface WidgetDataInput {
  caloriesConsumed: number
  caloriesTarget:   number
  proteinConsumed:  number
  carbsConsumed:    number
  fatConsumed:      number
  streak:           number
}

export interface WidgetDataPluginInterface {
  update(data: WidgetDataInput): Promise<{ ok: boolean }>
}

// Auto-resolved to the native plugin on Android; no-op on web/iOS.
export const WidgetDataPlugin = registerPlugin<WidgetDataPluginInterface>('WidgetData')
