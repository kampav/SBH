# SBH — Science Based Health
## Session Context File — Paste at start of every Claude session

> Last updated: March 2026 | Version: 0.1.0-scaffold

---

## APP IDENTITY
- **Name:** SBH (Science Based Health)
- **Based on:** Jeremy Ethier "Built With Science" content library
- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + Firebase + GCP Cloud Run
- **Local path:** `C:\Projects\SBH`
- **GitHub:** https://github.com/kampav/SBH
- **Live URL:** https://sbh-app-m3nvdpbv4q-nw.a.run.app
- **GCP Project:** `science-based-health` (billing enabled, europe-west2)
- **Firebase Project:** `science-based-health` (Firestore rules deployed)

---

## CURRENT BUILD STATUS

### Phase 1 MVP — In Progress

| Feature | Status | File(s) |
|---|---|---|
| Project scaffold | DONE | `package.json`, `next.config.mjs` |
| TypeScript types | DONE | `lib/types.ts` |
| Calculations engine | DONE | `lib/calculations.ts` (Mifflin-St Jeor, BMI, macros) |
| Firebase config | DONE | `lib/firebase.ts`, `lib/firestore.ts` |
| Auth — login page | DONE | `app/(auth)/login/page.tsx` |
| Auth — register page | DONE | `app/(auth)/register/page.tsx` |
| Onboarding wizard | DONE | `app/onboarding/page.tsx` (4 steps, saves to Firestore) |
| Dashboard | DONE | `app/dashboard/page.tsx` |
| Metrics tracker | DONE | `app/metrics/page.tsx` (weight log + chart + BMI) |
| Nutrition tracker | DONE | `app/nutrition/page.tsx` (meal log + macros + water) |
| Workout logger | DONE | `app/workout/page.tsx` (Phase 1 Full Body, sets/reps/rest timer) |
| Docker Compose | DONE | `Dockerfile`, `docker-compose.yml` |
| CI/CD pipeline | DONE | `.github/workflows/deploy.yml` |

### NEXT TASKS (Next session start here)
1. **Test full flow** — Open https://sbh-app-m3nvdpbv4q-nw.a.run.app, register with your email, complete onboarding, test dashboard / nutrition / workout / metrics
2. **Clean up** — Delete `.secrets/gcp-sa-key.json` (already in GitHub)
3. **Phase 1 polish** — Progressive overload suggestions, weekly streaks, food quick-add, programme selector
4. **Custom domain** (optional) — Map sbh.pav.dev or similar to the Cloud Run URL

---

## PERSONAL PROFILE (Pre-seeded for Pav's use)
- Age: 43, Male, 165cm, 83kg → target 68kg
- BMR: 1,651 | TDEE: 2,558 | Calorie target: 2,050 kcal
- Protein: 166g | Carbs: ~180g | Fat: ~65g
- Marathon training ongoing (London, April 2026)
- Moderately active (1.55 multiplier)

---

## KEY ARCHITECTURAL DECISIONS
- App Router (not Pages Router) — future-proof
- Firebase Auth (not NextAuth) — simpler for GCP ecosystem
- Firestore for user data — `users/{uid}/[metrics|nutrition|workouts]/{date}`
- `output: 'standalone'` in next.config.mjs — required for Docker/Cloud Run
- All NEXT_PUBLIC_FIREBASE_* vars passed as Docker build args in CI
- Cloud Run region: `europe-west2` (London — Pav's location)

---

## HOW TO RUN LOCALLY
```bash
# 1. Copy env file and fill in Firebase config
cp .env.example .env.local

# 2. Dev server
npm run dev
# → http://localhost:3000

# 3. Docker (production build test)
docker-compose up sbh
# → http://localhost:3000
```

---

---

## DESIGN SYSTEM (v3 — do not change mid-build)
- Background base: #060A12 | Surface cards: #0C1320
- Fonts: Bebas Neue (hero numbers) · DM Sans (all UI text)
- Accent colours:
    Lime   #C8FF47 → calories, primary CTA
    Cyan   #00D4FF → hydration, cardio
    Orange #FF6B35 → protein
    Purple #B47FFF → carbs
    Red    #FF4757 → fat, warnings, over-target
    Gold   #FFD700 → streaks, achievements
- Cards: glass morphism — rgba(255,255,255,0.045) bg + 1px rgba(255,255,255,0.07) border
- CSS: ALWAYS logical properties (margin-inline-start NOT margin-left)
- Touch targets: 48×48px minimum
- Motion: Framer Motion · spring(400,28) for sheets · fadeUp(350ms) for cards

---

## KEY PATTERNS (v3)
- App name lives in lib/app-config.ts only — never hardcode "SBH" elsewhere
- Pages: Server Components fetch DailyContext, pass as props to Client Components
- Feature flags: useFlag("feature.name") → Firebase Remote Config (all true, free tier)
- Offline: IndexedDB + Background Sync via Serwist service worker
- Analytics: logEvent() for key actions — NO raw health values, NO PII in events
- Sentry: strip all health data in beforeSend hook

---

## PRD v3 PHASE TRACKER
### Phase 1 — Foundation upgrades
[ ] P1.1  Design tokens (lib/design-tokens.ts) + core UI components
[ ] P1.2  App config single source of truth (lib/app-config.ts)
[ ] P1.4  DailyContext engine (lib/daily-context.ts)
[ ] P1.5  Today screen redesign (hero calorie ring, macro row, hydration strip)
[ ] P1.9  PWA manifest dynamic (app/manifest.ts) + Serwist service worker

### Phase 2 — Core product upgrades
[ ] P2.1  Barcode scanner (ZXing-JS + Open Food Facts API)
[ ] P2.2  Food search with database (Typesense + USDA + IFCT)
[ ] P2.4  Workout logger UX overhaul (active workout, rest timer, overload)
[ ] P2.5  Progressive overload engine (lib/progressive-overload.ts)
[ ] P2.7  Streak system + achievement badges
[ ] P2.8  E2E tests (Playwright + Firebase Emulator)
[ ] P2.9  Observability (Sentry + OpenTelemetry + Firebase Analytics)
[ ] P2.10 Android TWA (Bubblewrap CLI)

### Phase 3 — Intelligence
[ ] P3.1  Photo food recognition (Claude Vision API)
[ ] P3.2  Android Glance widgets (3 sizes)
[ ] P3.3  Push notifications (FCM)
[ ] P3.4  Weekly AI insights

## SESSION INSTRUCTIONS
Start next session with:
> "Continue building SBH. Here's my CONTEXT.md.
> Last completed: [paste status above].
> Next task: [pick from NEXT TASKS list]"

After each session, update the STATUS table and NEXT TASKS list above.
