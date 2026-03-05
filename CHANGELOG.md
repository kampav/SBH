# Changelog

All notable changes to SBH are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.3.0] — 2026-03-05

### Added
- **Offline support** — Firestore IndexedDB persistent cache (multi-tab); offline banner in UI
- `lib/offline.ts` — `useOnlineStatus()` hook; `syncStatusLabel()` utility
- `components/OfflineBanner.tsx` — amber banner shown when device has no network
- **Unit tests** — `dailyContext.test.ts` (13 tests), `featureFlags.test.ts` (11 tests)
- **E2E tests** — `auth.spec.ts`, `nutrition.spec.ts`, `workout.spec.ts` (16 new Playwright tests)

### Changed
- `lib/firebase.ts` — Switched from `getFirestore` to `initializeFirestore` with `persistentLocalCache` + `persistentMultipleTabManager` for proper PWA offline support

---

## [1.2.0] — 2026-03-05

### Added
- **Workout history page** (`/workout/history`) — 90-day session log, weekly volume bar chart, summary stats
- **Progressive overload** wired into workout page — uses `getSuggestion`/`formatSuggestion` from `lib/progressive-overload.ts`; deload every 12th session; history icon link in header
- `lib/analytics.ts` — Firebase Analytics with 12 privacy-safe event helpers (all health values bucketed)
- `lib/design-tokens.ts` — PRD v3 design system colour palette

---

## [1.1.0] — 2026-03-04

### Added
- **Micronutrient tracking** — 13 optional micro fields on `Meal` (fibre, saturated fat, vitamins, minerals); expandable breakdown in nutrition meal list
- **Progressive overload engine** (`lib/progressive-overload.ts`) — +2.5 kg upper / +5 kg lower body; deload on every 12th workout
- **Daily context engine** (`lib/daily-context.ts`) — `computeDailyContext()`, `getGreeting()`; insight badge on dashboard
- **Streak system** — `StreakRecord` in Firestore; milestone tracking (7/14/30/50/100 days); `getStreak()` / `updateStreak()` / `getAchievements()` in firestore lib
- **Feature flags** (`lib/feature-flags.ts`) — 16 flags (core/pro/premium/ops); all `default: true` during free phase
- **App config** (`lib/app-config.ts`) — single source of truth for app identity
- `lib/analytics.ts` — Firebase Analytics events wired into AI analysis calls
- AI food APIs extended — prompt returns all 13 micronutrients + GI/GL estimates
- `deleteaccount` page updated — lists glucose, billing, and subscription data

### Fixed
- `deleteAllUserData` now wipes `subscription`, `streaks`, and `achievements` subcollections

---

## [1.0.0] — 2026-03-03

### Added
- **Glucose / Diabetes management** (FR-01–FR-10)
  - `/glucose` — log readings (mmol/L or mg/dL), HbA1c tracking, alert settings
  - `/glucose/trends` — 7/30-day charts, time-in-range bar, weekly carb correlation
  - `/glucose/report` — AI-generated clinical summary, print-to-PDF
  - `lib/glucoseUtils.ts` — TIR calc, HbA1c estimate, GL calc, meal timing risk
  - AI routes: `glucose-predict`, `glucose-nudge`, `glucose-report`
  - GDPR consent modal with special-category notice
  - Clinical safety: insulin/dosing language blocked at API + filter level
- **Sentry error monitoring** (`@sentry/nextjs` v10) — client + server + edge configs; conditional source maps
- **Stripe billing** — Free / Pro £9.99 / Premium £19.99; hosted Checkout + webhook; `/pricing` page
- **PWA enhancements** — Serwist service worker (NetworkFirst/CacheFirst), manifest shortcuts
- Glucose nav item in BottomNav (6-item layout)
- GI/GL badges in nutrition meal log; carb budget bar; meal timing warning
- Glucose widget card on dashboard

### Changed
- BottomNav expanded to 6 items; icon size 20 → 18; label 10px → 9px

---

## [0.5.0] — 2026-03-01

### Added
- Full UI redesign — dark premium glassmorphism theme
- Gamification: XP system, 7 levels, 8 achievement badges
- 4-day Upper/Lower split workout programme (Jeremy Ethier / Built With Science)
- BottomNav, ProgressRing component
- Daily science tips carousel
- `/privacy` and `/deleteaccount` pages (Play Store compliance)
- Android TWA build pipeline (Capacitor + Bubblewrap)
- Play Store CI/CD workflow

---

## [0.4.0] — 2025-03

### Fixed
- Firebase auth: unauthorized-domain error on first deploy
- Email login race condition on fast connections

---

## [0.3.0] — 2025-03

### Added
- GCP Cloud Run deployment (europe-west2)
- GitHub Actions CI/CD pipeline (Docker → Artifact Registry → Cloud Run)
- Docker multi-stage build with standalone output

---

## [0.2.0] — 2025-03

### Added
- Dashboard with progress rings and XP bar
- Nutrition tracker — calorie + macro rings, meal log, water intake
- Workout logger — 4-day programme, sets/reps, rest timer, YouTube form links
- Metrics page — weight log, BMI, 7-day moving average (Recharts)

---

## [0.1.0] — 2025-03

### Added
- Initial Next.js 14 + Firebase setup
- Firebase Auth (Google Sign-In + email/password)
- Onboarding wizard — 4 steps → Mifflin-St Jeor BMR/TDEE/macro calculation
- Firestore schema: `users/{uid}/{profile|metrics|nutrition|workouts}`
- TypeScript types, calculations engine, CI scaffold
