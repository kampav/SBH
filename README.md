# SBH — Science Based Health

> AI-powered health tracking: nutrition, workouts, glucose, and body metrics — all in one science-backed app.

**Live:** https://sbh-app-m3nvdpbv4q-nw.a.run.app
**Stack:** Next.js 14 · Firebase · Tailwind · GCP Cloud Run · GitHub Actions
**Version:** 1.3.0

---

## Feature Modules

| Module | Routes | Description |
|---|---|---|
| **Auth** | `/login` `/register` | Google Sign-In + email/password (Firebase Auth) |
| **Onboarding** | `/onboarding` | 4-step wizard → BMR/TDEE/macro calc (Mifflin-St Jeor) |
| **Dashboard** | `/dashboard` | Insight badge, streak, calorie ring, quick-log actions |
| **Nutrition** | `/nutrition` | Calorie + macro rings, meal log, micronutrients, water, GI/GL badges |
| **Workout** | `/workout` `/workout/history` | 4-day Upper/Lower split, progressive overload hints, rest timer, 90-day history |
| **Metrics** | `/metrics` | Weight log, BMI, 7-day chart (Recharts), trend arrow |
| **Glucose** | `/glucose` `/glucose/trends` `/glucose/report` | Blood glucose logging, HbA1c, TIR chart, AI nudges, care team report |
| **AI Features** | API routes | Photo food recognition, barcode scan, glucose prediction, weekly insights |
| **Pricing** | `/pricing` | Free / Pro £9.99 / Premium £19.99 tiers via Stripe |
| **Profile** | `/profile` | Account, programme selector, theme, data export |
| **PWA** | — | Serwist service worker, offline Firestore persistence, install prompts |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router (TypeScript) |
| Styling | Tailwind CSS + CSS custom properties (glassmorphism) |
| Auth | Firebase Authentication (Google + email) |
| Database | Cloud Firestore (IndexedDB offline persistence) |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Charts | Recharts |
| Icons | lucide-react |
| PWA | Serwist v9 (NetworkFirst/CacheFirst/NetworkOnly) |
| Payments | Stripe (Checkout + Customer Portal + webhooks) |
| Monitoring | Sentry v10 (client + server + edge) |
| Hosting | GCP Cloud Run (europe-west2, London) |
| Container | Docker multi-stage, standalone output |
| CI/CD | GitHub Actions → Artifact Registry → Cloud Run |

---

## Architecture

```
User Browser (PWA + IndexedDB offline cache)
       │ HTTPS
       ▼
Cloud Run — Next.js 14 App Router (europe-west2)
       │
   ┌───┴────────────────────┐
   │                        │
Firebase Auth          Firestore DB
(Google + pwd)     (IndexedDB offline persistence)
                            │
                    users/{uid}/
                      profile/data
                      metrics/{date}
                      nutrition/{date}
                      workouts/{date}
                      glucose/{date}
                      hba1c/{id}
                      glucose_settings/config
                      streaks/current
                      achievements/{id}
                      subscription/data

External:  Stripe webhooks → /api/stripe/webhook
           Claude API      → /api/analyze-food  /api/glucose-nudge  etc.
           Sentry          → error telemetry
```

---

## 4-Day Workout Programme (Built With Science)

| Day | Focus | Key Exercises |
|---|---|---|
| Mon | Upper Push — Chest/Shoulders/Triceps | Flat DB Press, Incline DB Press, Shoulder Press, Lateral Raises, Tricep Pushdowns |
| Tue | Lower Posterior — Glutes/Hamstrings | Barbell Hip Thrust, Romanian Deadlift, Swiss Ball Leg Curl, Reverse Lunges, Side Lying Clam |
| Thu | Upper Pull — Back/Biceps | Lat Pulldown, Seated Row, Dumbbell Row, Face Pulls, Barbell Curl, Hammer Curls |
| Fri | Lower Anterior — Quads/Core | Barbell Back Squat, Sumo Deadlift, Goblet Squat, Lateral Band Walk, Leg Raises, Bicycle Crunches |
| Daily | Cardio | 30 min steady-state 120–140 bpm |

---

## Progressive Overload Engine

`lib/progressive-overload.ts` auto-suggests load changes each session:

| Condition | Action |
|---|---|
| All sets hit target reps | +2.5 kg upper body / +5 kg lower body |
| Last set missed by > 2 reps | Maintain weight |
| Every 12th workout (workoutCount % 12 = 0) | Deload to 90% of peak |
| No history | Start light suggestion |

---

## Glucose / Diabetes Management

All AI outputs are **informational only**. Insulin/dosing language is blocked at the prompt level and filtered post-response.

| Feature | Detail |
|---|---|
| Reading log | mmol/L or mg/dL; context tags (fasting / pre-meal / post-meal / bedtime) |
| Time-in-range | Colour-coded bar: rose = below / green = in range / amber = above |
| HbA1c | Estimated from 30-day avg (Nathan formula) + manual clinic entry |
| AI nudge | Corrective suggestion for out-of-range readings; no dosing language |
| Hypo protocol | < 3.0 mmol/L → 15 g fast carbs + seek medical help (first-aid only) |
| Care team report | AI-generated clinical narrative, print-to-PDF |
| Consent | GDPR special-category modal; all features blocked until consent saved |

---

## Offline Support (PWA)

- **Firestore persistence** — `initializeFirestore` with `persistentLocalCache` + `persistentMultipleTabManager`; reads serve from IndexedDB cache; writes queue and sync automatically when reconnected
- **Service worker** (Serwist) — pages cached with NetworkFirst (3 s timeout); static assets CacheFirst; API routes NetworkOnly
- **Offline banner** — amber indicator shown at top of screen while offline

---

## Macro Calculation (Mifflin-St Jeor)

```
BMR (male)  = 10 × weight_kg + 6.25 × height_cm − 5 × age + 5
BMR (female)= 10 × weight_kg + 6.25 × height_cm − 5 × age − 161
TDEE        = BMR × activity_multiplier
Target      = TDEE − 500 (cut) | TDEE + 300 (bulk) | TDEE (maintain)
Protein     = weight_kg × 2.0 g
Fat         = target_kcal × 0.25 / 9
Carbs       = (target − protein×4 − fat×9) / 4
```

---

## Local Development

```bash
git clone https://github.com/kampav/SBH
cd SBH
npm install

cp .env.local.example .env.local
# Fill in Firebase + Anthropic + Stripe credentials

npm run dev           # http://localhost:3000
npm test              # Vitest unit tests (59 tests)
npm run test:e2e      # Playwright e2e (19 tests)
npm run test:coverage # Coverage report
```

### Environment Variables

```bash
# Firebase (required)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=science-based-health
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# AI (required for AI features)
ANTHROPIC_API_KEY=

# Stripe (required for billing)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_YEARLY_PRICE_ID=
STRIPE_PREMIUM_MONTHLY_PRICE_ID=
STRIPE_PREMIUM_YEARLY_PRICE_ID=

# Firebase Admin (required for Stripe webhook)
FIREBASE_SERVICE_ACCOUNT_JSON=   # base64-encoded service account JSON

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

---

## Deployment

Push to `master` triggers automatic deploy:

```bash
git push origin master
```

GitHub Actions (`.github/workflows/deploy.yml`):
1. Authenticate to GCP (`SENTRYCLI_SKIP_DOWNLOAD=1 npm ci`)
2. Build Docker image (standalone)
3. Push → `europe-west2-docker.pkg.dev/science-based-health/sbh/sbh-app`
4. Deploy → Cloud Run `sbh-app` (512 Mi RAM, europe-west2)

---

## Testing

| Suite | Command | Tests |
|---|---|---|
| Unit (Vitest) | `npm test` | 59 |
| E2E (Playwright) | `npm run test:e2e` | 19 |
| Coverage | `npm run test:coverage` | — |

Unit test files:
- `__tests__/lib/calculations.test.ts` — BMR, TDEE, macros
- `__tests__/lib/glucoseUtils.test.ts` — unit conversions, TIR, HbA1c estimate
- `__tests__/lib/progressiveOverload.test.ts` — suggestion logic, deload, format
- `__tests__/lib/dailyContext.test.ts` — calorie status, weight trend, streak, greeting
- `__tests__/lib/featureFlags.test.ts` — flag structure, isEnabled, useFlag

---

## GCP Resources

| Resource | Name | Region |
|---|---|---|
| Cloud Run | sbh-app | europe-west2 |
| Artifact Registry | sbh | europe-west2 |
| Firebase Project | science-based-health | — |
| Billing Budget | £10/month alert | — |

---

## Gamification

| Action | XP |
|---|---|
| Complete workout | +150 |
| Log nutrition day | +75 |
| Log weight | +25 |

**Streak milestones:** 7 · 14 · 30 · 50 · 100 days logged
**Levels:** Beginner (0) → Committed (500) → Consistent (1,200) → Dedicated (2,500) → Iron Will (5,000) → Elite (10,000) → Legend (20,000)

---

## Security

- Firestore rules: each user can only access `users/{uid}/...`
- Firebase API key is Auth domain-allowlisted — safe to expose
- AI routes: clinical safety filters; insulin/dosing language blocked
- Sentry `beforeSend`: strips health data and PII
- Analytics: health values bucketed; no raw PII in events

---

## Credits

- Workout programming: [Jeremy Ethier — Built With Science](https://builtwithscience.com)
- BMR formula: Mifflin-St Jeor (1990)
- HbA1c estimation: Nathan et al. formula
- Exercise videos: [Built With Science YouTube](https://youtube.com/@JeremyEthier)
