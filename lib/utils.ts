import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Share text via Web Share API; falls back to clipboard copy. Returns true if shared, false if copied. */
export async function shareStats(title: string, text: string): Promise<boolean> {
  if (typeof navigator === 'undefined') return false
  if (navigator.share) {
    try { await navigator.share({ title, text }); return true } catch { /* dismissed */ }
  }
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    return false
  }
  return false
}

/** Get the Monday date (YYYY-MM-DD) for the current or a given week. */
export function getWeekStart(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day   // adjust so Monday = 0
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}
