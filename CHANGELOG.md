# Changelog

All notable changes to SBH are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.6.0] — 2026-03-06

### Added
- **Cloud Scheduler cron workflow** (`.github/workflows/cron.yml`) — GitHub Actions daily schedule (20:00 UTC) that calls `/api/fcm/send-daily` with CRON_SECRET auth; manual trigger supported; Cloud Scheduler gcloud setup instructions in comments
- **Android Glance home-screen widget** — Jetpack Glance 1.1.0
  - `SBHWidget.kt` — `GlanceAppWidget` showing calorie progress bar, macro row (P/C/F), streak counter; brand colours (violet/cyan/rose)
  - `WidgetDataPlugin.kt` — `@CapacitorPlugin(name="WidgetData")` that writes to SharedPreferences and triggers `GlanceAppWidgetManager.updateAll()`
  - `sbh_widget_info.xml` — 2×2 min, resizable to 4×2
  - `AndroidManifest.xml` — `SBHWidgetReceiver` + `APPWIDGET_UPDATE` intent-filter registered
  - `MainActivity.java` — `registerPlugin(WidgetDataPlugin.class)` added
  - Kotlin 2.0.21 + Compose BOM 2024.12.01 + Glance 1.1.0 wired into Gradle build files
- **Web-side widget bridge** (`lib/widget-plugin.ts`, `lib/widget.ts`) — typed `registerPlugin('WidgetData')` wrapper; `updateWidgetData()` + `buildWidgetData()` helpers; called after every `addMeal`; silently no-ops on web and iOS
- **A/B testing framework** (`lib/ab-testing.ts`) — deterministic `getVariant(name, uid)` via djb2 hash; `isInExperiment()` shorthand; `loadExperimentConfigs()` reads Remote Config `experiment__<name>` JSON overrides; 3 default experiments defined; loaded in `AppInit`
- **Weekly digest API** (`app/api/digest/weekly/route.ts`) — CRON_SECRET POST endpoint; queries 7-day nutrition + workout data per user (or targeted by `uid`); computes avg calories, compliance %, workouts logged, best day of week; sends personalised FCM notification; auto-purges stale tokens

### Changed
- `components/AppInit.tsx` — `loadExperimentConfigs()` chained after `initRemoteConfig()`
- `android/variables.gradle` — added `kotlinVersion`, `composeBomVersion`, `glanceVersion`
- `android/build.gradle` — added Kotlin + Kotlin Compose Compiler classpaths
- `android/app/build.gradle` — Kotlin Android + Compose plugins, `buildFeatures { compose }`, JVM 11, Glance + Compose BOM dependencies
- `android/app/src/main/res/values/strings.xml` — added `widget_description`

---

## [1.5.0] — 2026-03-05

### Added
- **FCM scheduled batch sender** (`app/api/fcm/send-daily/route.ts`) — `CRON_SECRET`-authenticated POST endpoint; queries all users via `collectionGroup('fcm_tokens')`; sends targeted notifications (streak/workout/hydration) rotated by day of week; automatically purges stale/invalid tokens in a batched write
- **Food database expanded 75 → 156 entries** (`lib/foodDatabase.ts`)
  - New categories: `fruit`, `uk_main`, `nut_seed`
  - 10 new vegetables (cucumber, bell pepper, tomato, carrot, mushrooms, kale, courgette, peas, sweetcorn, edamame)
  - 10 fruits (apple, orange, mango, strawberries, blueberries, grapes, watermelon, pear, kiwi, lemon)
  - 7 UK mains (porridge, baked beans, jacket potato, fish & chips, full English, cheese sandwich, lentil soup)
  - 12 new proteins (chicken thigh, turkey, cod, king prawns, tofu, tempeh, sardines, mackerel, lean beef mince, pork loin, chickpeas, black beans)
  - 7 new dairy (whole milk, semi-skimmed milk, skyr, kefir, cheddar, mozzarella, feta)
  - 8 new carbs (quinoa, wholegrain bread, pasta, boiled potato, couscous, rice cakes, granola, corn tortilla)
  - 7 nuts & seeds (walnuts, cashews, chia seeds, pumpkin seeds, flaxseed, brazil nuts, sunflower seeds)
  - 5 new fats (olive oil, coconut oil, butter, tahini, hummus)
  - 8 more Indian foods (kadai paneer, mutter paneer, aloo matar, rasam, pongal, pav bhaji, uttapam, methi thepla, missi roti, vada pav, pani puri)
  - 4 more Indian sweets (besan ladoo, gajar halwa, jalebi, barfi)
  - 3 supplements (creatine monohydrate, BCAA, mass gainer)
  - 15 new lower-GI swap suggestions
- **Typesense setup + import scripts**
  - `scripts/typesense-setup.mjs` — creates/recreates the `foods` Typesense collection with correct schema (name, tags, calories, macros, GI, fibre, category facet)
  - `scripts/typesense-import.mjs` — JSONL bulk upsert of all FOOD_DATABASE entries; reports per-document success/failure; inline TS-to-JS transform so no tsx required
- **Privacy policy — multi-market compliance** (`app/privacy/page.tsx`)
  - Section 10: India DPDP 2023 — consent basis, rights (correction/erasure), grievance redressal (30-day SLA), children's data (under 18), Data Fiduciary declaration, cross-border transfer disclosure
  - Section 11: UAE PDPL 2021 — lawful basis, special category data (health), data subject rights, cross-border transfer safeguards, DPO contact
  - Last updated date → 5 March 2026
- **Test notification button** in profile page (`app/profile/page.tsx`) — visible when notifications are enabled; POSTs to `/api/fcm/notify` with user's FCM token; shows success/error/sending states; auto-resets after 4 s

### Changed
- `app/profile/page.tsx` — added `testNotifStatus` state; test notification button in Notifications card

---

## [1.4.0] — 2026-03-05

### Added
- **Firebase Remote Config** (`lib/feature-flags.ts`) — `initRemoteConfig()` async init; flags now read from Remote Config cache (12 h TTL) with fallback to `FLAGS.default`; `components/AppInit.tsx` calls init at app startup via root layout
- **FCM Push Notifications**
  - `lib/fcm.ts` — `enableNotifications()`, `requestNotificationPermission()`, `getFcmToken()`, `isNotificationSupported()`
  - `lib/firebaseAdmin.ts` — added `getAdminApp()` export alongside `getAdminDb()`
  - `lib/firestore.ts` — `saveFcmToken()`, `getFcmTokenDoc()`, `deleteFcmToken()`; `deleteAllUserData` wipes `fcm_tokens` subcollection
  - `app/api/fcm/notify/route.ts` — POST endpoint; firebase-admin Messaging sends to specific FCM token
  - `app/sw.ts` — `push` event listener (showNotification) + `notificationclick` event (opens URL, focuses existing tab)
  - `app/profile/page.tsx` — Notifications card with master toggle and per-type prefs (streak reminder / workout reminder / hydration nudge)
- **Typesense Food Search**
  - `lib/typesense-client.ts` — typed Typesense client; `searchTypesense(query, perPage)` with `TYPESENSE_URL` + `TYPESENSE_API_KEY` env vars; returns empty array when not configured
  - `app/api/food-search/route.ts` — unified `GET /api/food-search?q=&limit=` endpoint; Typesense first → local `FOOD_DATABASE` fallback; returns `source` field for observability
- `.env.local.example` — comprehensive env var template with all required + optional vars

### Changed
- `app/layout.tsx` — `<AppInit />` added to root layout
- `app/profile/page.tsx` — version label updated to v1.4.0


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
