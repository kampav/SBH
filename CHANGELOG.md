# Changelog

All notable changes to HealthOS are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [2.6.0] — 2026-03-09

### Changed
- **App renamed HealthOS** — all user-facing "SBH" / "Science Based Health" strings replaced across 35+ files
- New **HealthOS icons** generated (SVG→sharp): violet→cyan "H" monogram, 48–512px PNG+WebP
- Admin, manifest, capacitor, Android strings all updated

### Added
- **Dashboard action tiles → responsive grid**: lg: 2-col, xl: 3-col on desktop (was vertical list)
- Desktop sidebar logo updated: "H" monogram + "HealthOS / Your science-backed coach"

---

## [2.5.0] — 2026-03-08

### Added
- **AI Coach fully grounded** — chat route now fetches last 7d nutrition, workouts, sleep, glucose (diabetics), mood (mental health), habits and passes to Claude system prompt
- **Admin real subscription tiers** — `/api/admin/stats` uses Firestore `collectionGroup('subscription')` for real Free/Pro/Premium counts
- **Weekly insights enriched** — mood history + condition profile sent to AI route; mood score included in overall score
- **README** completely rewritten for v2.6.0 with full feature table

---

## [2.4.0] — 2026-03-08

### Added
- **Left sidebar navigation** (tablet/desktop ≥768px): gradient accent line, logo, scrollable nav sections, profile strip
- **Bottom nav hidden on md+**: `md:hidden` applied to tab bar, More drawer, backdrop
- **Content safe area**: `.page-header-bar` gains `padding-top: env(safe-area-inset-top)`
- **Responsive page widths**: all 24 pages use `max-w-2xl lg:max-w-4xl mx-auto px-4 lg:px-8`
- **CoachWidget repositioned** on md+: `bottom: 1.25rem` (no bottom nav offset)
- **Dashboard bento grid**: `lg:grid-cols-[1fr_340px]` — left: readiness + actions + nutrition; right: AI coach + insight + condition tip + health feed

### Fixed
- **Admin infinite spinner** — `setChecking(false)` was missing on auth success path
- **Sleep page hang** — removed blocking `getSleepHistory` re-fetch after save; update local state directly

---

## [2.3.0] — 2026-03-07

### Added
- **Phase 14 — Personalised Health Feed** (`/health-feed`): Daily Health Score 0–100 from 8 dimensions; HealthCard[] ranked by priority; condition-specific tips for all 10 ConditionKeys
- **Phase 15 — CGM + Wearables**: Dexcom OAuth + EGV fetch + TIR calc + trend arrows; `/settings/integrations` page; DexcomCredentials / CGMDay / CGMReading types

---

## [2.2.0] — 2026-03-07

### Added
- **Apple-quality UI polish**: glassmorphism refinements, typography scale, spacing pass
- **Light theme fixes**: ProgressRing, XP bar, workout bars use `var(--ring-track)`; onboarding ConsentBox border uses `var(--input-border)`

### Fixed
- CI/CD: Android build pipeline stabilised (AAB + APK)



## [2.1.0] — 2026-03-07

### Added
- **Workout Share Card** (`components/workout/WorkoutShareCard.tsx`)
  - html2canvas screenshot of a styled card showing programme, date, duration, volume, calories, XP
  - "Share Workout" button on completion screen; uses Web Share API with PNG download fallback
- **Weekly Challenges + Leaderboard** (`app/challenges/page.tsx`)
  - Personal weekly goals: workout ring, nutrition days ring, streak ring (SVG progress)
  - Opt-in leaderboard at `leaderboards/{weekKey}/entries/{uid}` (public read, own-entry write)
  - Leaderboard ranks by workout count; current user row highlighted in violet
- **Referral / Invite System**
  - `/api/referral/[code]` — Admin SDK collectionGroup query, returns inviter's display name
  - Register page reads `?ref=` param; shows "Invited by {name} 🎉" banner; saves `referredBy`
  - Profile page: Public Profile toggle, copy invite link, Web Share button, public profile URL
- **Public Profile** (`app/u/[username]`)
  - Server component; 404 for private/unknown users
  - Shows avatar, goal chip, experience chip, streak, 30-day workout count, member since year
  - "Join SBH →" CTA for unauthenticated visitors
- **UserProfile extensions** — `publicProfile?`, `username?`, `referralCode?`, `referredBy?`
- **Admin SDK helpers** — `getPublicProfileByUsername`, `getPublicStats` (server-side only)
- **Firestore helpers** — `updateLeaderboardEntry`, `getLeaderboard`, `savePublicProfileFields`, `generateUsername`
- **Challenges link** added to Profile page navigation

### Fixed
- **Glucose save undefined crash** — `notes: readingNotes || undefined` replaced with conditional spread; Firebase SDK v12 throws on explicit `undefined` values
- **Sunday workout crash** — `Math.min(mapped, 5)` replaced with `dow === 0 ? 6 : dow - 1`; Sunday was incorrectly showing Saturday's exercises
- **Rest timer restart bug** — `onDismiss` callback wrapped in `useCallback`; inline arrow caused RestTimerOverlay interval to cancel/restart on every parent render

### Tests
- `__tests__/lib/workout.test.ts` — 28 tests: day mapping, all programmes 7-day completeness, Sunday rest, Saturday exercises, ladder repRange, ALL_EXERCISES deduplication
- `__tests__/lib/glucoseSave.test.ts` — 8 tests: notes field omission, no undefined values, Firestore safety
- Total: **167 tests** (was 131)

---

## [2.0.0] — 2026-03-07

### Added
- **Exercise Library** (`app/exercises/page.tsx`)
  - Browse all exercises across all 3 training programmes (Home, Gym, Beginner)
  - Real-time search + muscle group filter chips (colour-coded badges)
  - Accordion cards — tap to expand: description, programme labels, YouTube tutorial link
  - Derived from `lib/workout/exerciseData.ts`: `ALL_EXERCISES` (deduplicated) + `MUSCLE_GROUPS`
- **Exercise data module** (`lib/workout/exerciseData.ts`)
  - Extracted `ExerciseDef`, `ProgrammeDay`, `EXERCISE_INFO`, `HOME_6DAY`, `GYM_UPPER_LOWER`, `BEGINNER_3DAY`, `PROGRAMMES`, `PROGRAMME_LABELS` from workout page into a shared module
  - Exports `ALL_EXERCISES` (unique, deduplicated) and `MUSCLE_GROUPS` (sorted) as derived helpers
- **Enhanced Rest Timer** (`components/workout/RestTimerOverlay.tsx`)
  - Full-screen backdrop-blur overlay replaces the old inline banner
  - SVG countdown ring with smooth `stroke-dasharray` animation
  - Web Audio API beep (880Hz, 0.4s decay) on timer completion
  - +15s extend button and Skip → dismiss button
  - Shows next exercise name during rest
- **Workout page** — BookOpen icon link to `/exercises` in page header alongside History link
- **Meal-type breakdown pie chart** in Nutrition page
  - Recharts `PieChart` with `innerRadius` donut style
  - Groups today's meals by type (Breakfast/Lunch/Dinner/Snack/Pre-WO/Post-WO)
  - Colour-coded segments with matching legend; shown only when ≥ 2 meal types logged
- **My Stats card** in Profile page
  - Shows: Workouts (90d), Total Volume lifted, Current Streak, Avg Sleep (30d)
  - Each stat is a tappable link to the relevant page (/workout/history, /metrics, /sleep)
  - Loaded in parallel with profile data on mount

### Changed
- Workout page no longer defines exercise data inline — all constants imported from `lib/workout/exerciseData`

---

## [1.9.0] — 2026-03-06

### Added
- **AI Weekly Insights** (`app/insights/page.tsx`, `app/api/insights/weekly/route.ts`)
  - Deterministic nutrition/workout/sleep/overall scores (server-side, no hallucination)
  - Claude Haiku generates narrative, 3 highlights, 3 actionable tips
  - 24-hour Firestore cache (`users/{uid}/insights/{weekStartDate}`)
  - Score rings (SVG), week-at-a-glance stats grid, 7-day bar chart (calories/protein/sleep tabs)
  - Share button via Web Share API with clipboard fallback
- **Habit Tracker** (`app/habits/page.tsx`)
  - 5 default habits seeded on first visit (water, steps, meditation, sleep, fruit & veg)
  - Increment/decrement stepper per habit with target progress
  - 7-day streak dots, add custom habit form, soft-delete habits
  - Firestore: `users/{uid}/habits/{id}` + `users/{uid}/habit_logs/{date}`
- **Stats sharing** on metrics and workout history pages
  - Share2 icon buttons generate summary text and call Web Share API
  - Clipboard toast shown when Web Share API unavailable
- **PWA Install Banner** (`components/PWAInstallBanner.tsx`)
  - Intercepts `beforeinstallprompt` event; shows dismissible bottom banner
  - Dismissal persisted in `localStorage.sbh_pwa_dismissed`
  - Added to root layout above BottomNav
- **Dashboard QuickCards** — added Habits and Weekly Report cards
- **Feature flags** — `core.habit_tracker`, `pro.weekly_insights`
- **Analytics events** — `weeklyInsightsViewed`, `habitLogged`, `statsShared`
- **Utilities** — `shareStats(title, text)`, `getWeekStart(date?)` in `lib/utils.ts`

### Fixed
- **Test notification "check token" error** — handler now attempts `enableNotifications()` to refresh stale FCM token before failing
- **Workout page crash on Saturday** — added `if (!def) return null` guard for stale `exercises` state during day switch
- **Insights API** — corrected `DailyNutrition` field references (`totalCalories`, `totalProteinG`) replacing incorrect `macros.*` access

---

## [1.8.0] — 2026-03-06

### Added
- **Body composition page** (`app/body/page.tsx`)
  - BMI card (always visible) with category colour coding
  - US Navy circumference body fat % (waist + neck + hips inputs)
  - Lean mass / fat mass breakdown cards
  - Waist-to-height ratio risk card
  - Ideal weight range (Devine formula)
  - Recharts `LineChart` for measurement trends
  - `lib/health/bodyUtils.ts` — `calcBMI`, `getBMICategory`, `calcBodyFatPct`, `getBodyFatCategory`, `calcLeanMassKg`, `calcFatMassKg`, `calcWaistToHeightRatio`, `getWaistToHeightRisk`, `calcIdealWeightKg`
- **GDPR data export** (`app/api/export/route.ts`)
  - GDPR Art 20 data portability — exports nutrition, workouts, metrics, glucose, sleep, profile as labelled CSV
  - Verifies Firebase ID token; export button added to profile page
- **Terms of Service page** (`app/terms/page.tsx`)
  - 12-section ToS (v1.0, 6 March 2026); governing law England & Wales
  - Covers: health data special category, AI content disclaimer, billing, data portability/deletion
- **Onboarding consent step** (`app/onboarding/page.tsx` — step 5 of 5)
  - Explicit GDPR Art 9 consent for special-category health data
  - Age verification (18+), Terms, Privacy Policy, health data consent (all required)
  - Optional marketing opt-in
  - `UserConsents` interface saved to Firestore `users/{uid}/profile/data`
  - Compliant with UK GDPR, EU GDPR, India DPDP Act 2023, UAE PDPL 2021
- **Typesense IFCT import script** (`scripts/typesense-import-ifct.mjs`)
  - Imports IFCT 2017 Indian food composition table JSON; food group → SBH category mapping
  - IDs prefixed `ifct_` to avoid collisions with USDA data
- **Typesense provisioning health check** (`scripts/typesense-provision.mjs`)
  - Checks cluster health + collection existence; `--reset` flag to drop and recreate
  - Prints next-step commands after provisioning
- **Unit tests — body utils** (`__tests__/lib/bodyUtils.test.ts` — 33 tests)
  - Covers: BMI, BMI category, body fat % (male + female + edge cases), body fat category, lean/fat mass, waist-to-height ratio, ideal weight range

### Changed
- **lib/ directory reorganised into feature subdirectories** (zero breaking changes)
  - `lib/firebase/` — client.ts, admin.ts, firestore.ts, fcm.ts, analytics.ts, feature-flags.ts, ab-testing.ts
  - `lib/health/` — calculations.ts, glucoseUtils.ts, sleepUtils.ts, bodyUtils.ts, progressive-overload.ts, daily-context.ts
  - `lib/food/` — foodDatabase.ts, typesense-client.ts
  - `lib/platform/` — offline.ts, widget.ts, widget-plugin.ts
  - Barrel `index.ts` in each subdirectory — all existing `@/lib/firebase`, `@/lib/health/calculations` etc. imports continue to work
  - All page + API route imports updated to new paths
- **app/metrics/page.tsx** — BMI/category now sourced from `lib/health/bodyUtils` (richer `BMICategory` objects with colour + recommendation)
- **app/profile/page.tsx** — version bumped to v1.8.0; Data Export card added

### Tests
- 8 test files · **131 tests** · 100% pass

---

## [1.7.0] — 2026-03-06

### Added
- **Sleep tracking** (`app/sleep/page.tsx`)
  - Log bedtime, wake time, quality (1–5 stars), optional notes
  - Duration calculated automatically; handles midnight crossing
  - Sleep score (0–100) combining duration fitness + quality
  - 7-day bar chart (Recharts) with target reference line (8 h)
  - Stats row: 7-day average, target, sleep debt
  - History list with delete; dismissible log form
  - Sleep widget card on dashboard (last logged sleep + score colour)
  - Firestore path: `users/{uid}/sleep/{date}` → `SleepEntry`
  - `lib/sleepUtils.ts` — `calcSleepDuration`, `calcSleepScore`, `sleepQualityLabel`, `sleepScoreLabel`, `avgSleepH`, `sleepDebtH`, `sleepWeekData`
  - `SleepEntry` / `SleepQuality` types added to `lib/types.ts`
  - Sleep CRUD in `lib/firestore.ts`; `sleep` subcollection added to `deleteAllUserData`
- **A/B experiment reporting dashboard** (`app/experiments/page.tsx`)
  - Lists all experiments from `EXPERIMENTS` registry (expandable rows)
  - Shows variant weights as progress bars
  - Shows the current user's deterministic variant assignment
  - Displays Remote Config key + JSON payload for each experiment
  - Developer tool — accessible at `/experiments`
- **Typesense USDA import script** (`scripts/typesense-import-usda.mjs`)
  - Handles USDA FoodData Central Foundation Foods, SR Legacy, and Branded Foods JSON formats
  - Maps USDA nutrient IDs (1003/1004/1005/1008/1079/1093/2000) to SBH schema
  - Bulk upserts in batches of 250 via JSONL endpoint
  - Prints per-batch progress + final success/fail counts
- **Unit tests expanded** (74 tests total, +15 new)
  - `sleepUtils.test.ts` — 22 tests covering all pure helpers
  - `abTesting.test.ts` — 12 tests covering variant assignment, distribution, registry invariants

### Changed
- `app/dashboard/page.tsx` — sleep widget card below glucose widget; `getSleepHistory(uid, 3)` loaded in initial Promise.all
- `lib/firestore.ts` — 4 new sleep CRUD functions; `deleteAllUserData` includes `sleep` subcollection

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
