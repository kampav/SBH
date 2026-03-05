// lib/app-config.ts — THE ONLY PLACE THE APP NAME LIVES
// To rename the app: change this file only.

export const APP = {
  // ── Identity ──────────────────────────────────────────────────────────
  name:        'SBH',
  fullName:    'Science Based Health',
  tagline:     'Your science-backed coach',
  initials:    'SBH',

  // ── URLs ──────────────────────────────────────────────────────────────
  domain:      'sbhealth.app',
  appUrl:      process.env.NEXT_PUBLIC_APP_URL ?? 'https://sbh-app-m3nvdpbv4q-nw.a.run.app',

  // ── Branding ──────────────────────────────────────────────────────────
  themeColour: '#060A12',

  // ── Social ────────────────────────────────────────────────────────────
  supportEmail:  'hello@sbhealth.app',
  privacyEmail:  'privacy@sciencebasedhealth.app',

  // ── Legal ─────────────────────────────────────────────────────────────
  companyName: 'Science Based Health Ltd',
  privacyUrl:  '/privacy',
  termsUrl:    '/privacy',
} as const

export type AppConfig = typeof APP
