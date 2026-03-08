// lib/app-config.ts — THE ONLY PLACE THE APP NAME LIVES
// To rename the app: change this file only.

export const APP = {
  // ── Identity ──────────────────────────────────────────────────────────
  name:        'HealthOS',
  fullName:    'HealthOS',
  tagline:     'Your science-backed coach',
  initials:    'H',

  // ── URLs ──────────────────────────────────────────────────────────────
  domain:      'sbhealth.app',
  appUrl:      process.env.NEXT_PUBLIC_APP_URL ?? 'https://sbh-app-m3nvdpbv4q-nw.a.run.app',

  // ── Branding ──────────────────────────────────────────────────────────
  themeColour: '#060A12',

  // ── Social ────────────────────────────────────────────────────────────
  supportEmail:  'hello@sbhealth.app',
  privacyEmail:  'privacy@sbhealth.app',

  // ── Legal ─────────────────────────────────────────────────────────────
  companyName: 'HealthOS Ltd',
  privacyUrl:  '/privacy',
  termsUrl:    '/privacy',
} as const

export type AppConfig = typeof APP
