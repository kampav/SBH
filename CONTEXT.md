# SBH — Science Based Health
## Session Context File — Paste at start of every Claude session

> Last updated: 2026-03-05 | Version: 1.5.0

---

## APP IDENTITY
- **Name:** SBH (Science Based Health) — `lib/app-config.ts` is single source of truth
- **Based on:** Jeremy Ethier "Built With Science" content library
- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + Firebase + GCP Cloud Run
- **Local path:** `C:\Projects\SBH`
- **GitHub:** https://github.com/kampav/SBH
- **Live URL:** https://sbh-app-m3nvdpbv4q-nw.a.run.app
- **GCP Project:** `science-based-health` (billing enabled, europe-west2)
- **Firebase Project:** `science-based-health` (Firestore rules deployed)

---

## CURRENT BUILD STATUS — v1.5.0 ✅ DEPLOYED

### Completed Features

| Feature | Status | Key Files |
|---|---|---|
| Auth (Google + email) | ✅ | `app/login`, `app/register` |
| Onboarding wizard | ✅ | `app/onboarding/page.tsx` |
| Dashboard + insight badge | ✅ | `app/dashboard/page.tsx`, `lib/daily-context.ts` |
| Nutrition tracker + micronutrients | ✅ | `app/nutrition/page.tsx` |
| Workout logger + progressive overload | ✅ | `app/workout/page.tsx`, `lib/progressive-overload.ts` |
| Workout history (90-day) | ✅ | `app/workout/history/page.tsx` |
| Metrics + weight chart | ✅ | `app/metrics/page.tsx` |
| Glucose management (FR-01–FR-10) | ✅ | `app/glucose/`, `lib/glucoseUtils.ts` |
| AI food photo + barcode | ✅ | `app/api/analyze-food`, `app/api/lookup-food` |
| AI glucose predict/nudge/report | ✅ | `app/api/glucose-*` |
| Stripe billing (Free/Pro/Premium) | ✅ | `app/pricing`, `lib/stripe.ts`, `app/api/stripe/` |
| Sentry monitoring | ✅ | `sentry.*.config.ts`, `instrumentation.ts` |
| PWA (Serwist SW + offline cache) | ✅ | `app/sw.ts`, `lib/firebase.ts`, `components/OfflineBanner.tsx` |
| Streaks + achievements | ✅ | `lib/firestore.ts` (getStreak/updateStreak/getAchievements) |
| Feature flags | ✅ | `lib/feature-flags.ts` |
| Analytics (Firebase) | ✅ | `lib/analytics.ts` |
| Design tokens | ✅ | `lib/design-tokens.ts` |
| Unit tests (59 tests) | ✅ | `__tests__/lib/` |
| E2E tests (19 tests) | ✅ | `e2e/` |
| Changelog + README | ✅ | `CHANGELOG.md`, `README.md` |

---

## KEY ARCHITECTURAL DECISIONS
- **Firebase offline:** `initializeFirestore` with `persistentLocalCache` + `persistentMultipleTabManager` (NOT `getFirestore`) — enables IndexedDB offline persistence
- **App Router** (not Pages Router) — all pages use `export const dynamic = 'force-dynamic'` + `authReady` guard
- **Firebase Admin:** lazy `getAdminDb()` function; `serverExternalPackages: ['firebase-admin']` in next.config.mjs
- **Sentry:** `SENTRYCLI_SKIP_DOWNLOAD=1 npm ci` in Dockerfile; conditional webpack wrap only if `SENTRY_AUTH_TOKEN` set
- **Docker:** node:20-alpine, standalone output, no `--legacy-peer-deps`
- **AI safety:** clinical safety filters in all 3 glucose routes; dosing language filter; hypo first-aid protocol
- **Analytics:** all health values bucketed (no raw PII); `isSupported()` + `getApps().length` guard

---

## FIRESTORE SCHEMA
```
users/{uid}/
  profile/data          → UserProfile
  metrics/{date}        → DailyMetric
  nutrition/{date}      → DailyNutrition (meals[], macros, water)
  workouts/{date}       → DailyWorkout (exercises[], volume, duration)
  glucose/{date}        → DailyGlucose (readings[])
  hba1c/{id}            → HbA1cEntry
  glucose_settings/config → GlucoseSettings
  streaks/current       → StreakRecord
  achievements/{id}     → Achievement
  subscription/data     → { tier, status, stripeCustomerId, ... }
```

---

## DESIGN SYSTEM
- **Background:** `#060A12` base | `#0C1320` surface1 | `#111B2E` surface2
- **Accents:** Lime `#C8FF47` | Cyan `#00D4FF` | Orange `#FF6B35` | Purple `#B47FFF` | Red `#FF4757` | Gold `#FFD700`
- **App accents:** Violet `#7c3aed` | Cyan `#06b6d4` | Rose `#f43f5e`
- **Cards:** glassmorphism — `rgba(255,255,255,0.045)` bg + 1px `rgba(255,255,255,0.07)` border
- **Classes:** `.glass`, `.glass-strong`, `.glass-dark`, `mesh-bg`, `.page-pad`
- Design tokens in `lib/design-tokens.ts`

---

## PRD v3 PHASE TRACKER

### ✅ Phase 1 — Foundation
- [x] Design tokens (`lib/design-tokens.ts`)
- [x] App config (`lib/app-config.ts`)
- [x] DailyContext engine (`lib/daily-context.ts`)
- [x] PWA manifest + Serwist service worker
- [x] Streak system + achievement badges

### ✅ Phase 2 — Core Product
- [x] Progressive overload engine (`lib/progressive-overload.ts`)
- [x] Workout history page (`/workout/history`)
- [x] Feature flags (`lib/feature-flags.ts`)
- [x] Firebase Analytics (`lib/analytics.ts`)
- [x] Firestore offline persistence (IndexedDB)
- [x] Offline banner (`components/OfflineBanner.tsx`)
- [x] Unit test coverage (59 tests across 5 suites)
- [x] E2E tests (19 Playwright specs)

### ✅ Phase 3 — Intelligence
- [x] Photo food recognition (Claude Vision)
- [x] Micronutrient tracking (13 fields)
- [x] GI/GL badges in nutrition
- [x] Glucose management (FR-01–FR-10)
- [x] AI glucose nudge / predict / care team report

### ✅ Phase 4 — Growth
- [x] Firebase Remote Config (`lib/feature-flags.ts` + `components/AppInit.tsx`)
- [x] FCM push notifications (`lib/fcm.ts`, SW push handler, `/api/fcm/notify`, profile UI)
- [x] Typesense food search client (`lib/typesense-client.ts` + `/api/food-search`)

### ✅ Phase 5 — Scale
- [x] FCM batch scheduled sender (`app/api/fcm/send-daily/route.ts` — `CRON_SECRET` auth, collectionGroup query, stale-token purge)
- [x] Food database expanded 75 → 156 entries (fruits, UK mains, nuts/seeds, more proteins, dairy, veg)
- [x] Typesense scripts (`scripts/typesense-setup.mjs`, `scripts/typesense-import.mjs`)
- [x] Multi-market compliance: India DPDP 2023 + UAE PDPL 2021 in privacy policy
- [x] Test notification button on profile page

### ⬜ Phase 6 — Platform (Next)
- [ ] Android Glance widgets (Jetpack Glance 1.1.0) — calories ring, macros, streak
- [ ] Typesense cloud provisioning + USDA/IFCT food data import (50k+ items)
- [ ] Cloud Scheduler CRON job → `/api/fcm/send-daily` (daily 8 pm UTC)
- [ ] OpenFeature + Remote Config A/B testing

---

## PERSONAL PROFILE (Pav)
- Age: 43, Male, 165cm, 83kg → target 68kg
- BMR: 1,651 | TDEE: 2,558 | Calorie target: 2,050 kcal
- Protein: 166g | Carbs: ~180g | Fat: ~65g
- Moderate activity (1.55×)

---

## HOW TO RUN LOCALLY
```bash
npm run dev         # http://localhost:3000
npm test            # Vitest unit tests
npm run test:e2e    # Playwright e2e
npm run build       # production build check
```

---

## IMPORTANT PATTERNS
- TypeScript: `FirestoreTimestamp = Timestamp | FieldValue`
- All auth-gated pages: `export const dynamic = 'force-dynamic'` + `onAuthStateChanged` + `authReady` guard
- ESLint: no-unused-expressions — use `if/else` not ternary for void side-effects
- Meal micronutrients: 13 optional fields directly on `Meal` interface (backward-compatible)
- Progressive overload: deload every 12th workout, not just on milestones
- FCM: `isNotificationSupported()` guard before push API; token → `users/{uid}/fcm_tokens/primary`; `getAdminApp()` in firebaseAdmin.ts for Messaging
- FCM batch: `/api/fcm/send-daily` requires `Authorization: Bearer ${CRON_SECRET}`; uses `collectionGroup('fcm_tokens')` (Admin SDK); rotates notif types by day of week
- Typesense: `isTypesenseConfigured` gate; `/api/food-search` returns `source: 'typesense'|'local'`; local fallback always works; setup/import via `scripts/typesense-setup.mjs` + `scripts/typesense-import.mjs`
- Remote Config: `initRemoteConfig()` in `AppInit` (layout); `isEnabled()` reads `_rcCache` first then `FLAGS.default`
- Firebase offline: uses `initializeFirestore` with persistent cache — do NOT call `getFirestore` elsewhere
- Food database: 156 entries, categories include `fruit`, `uk_main`, `nut_seed`; `LOWER_GI_SWAPS` map has 29 entries
