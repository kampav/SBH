# HealthOS

> AI-powered personal health OS — nutrition, workouts, glucose, sleep, mood, and body metrics in one science-backed app.

**Live:** https://sbh-app-m3nvdpbv4q-nw.a.run.app
**Stack:** Next.js 14 · Firebase · Tailwind · GCP Cloud Run · GitHub Actions
**Version:** 2.6.0

---

## Feature Modules

| Module | Routes | Description |
|---|---|---|
| **Auth** | `/login` `/register` | Google Sign-In + email/password; referral `?ref=` invite param |
| **Onboarding** | `/onboarding` | 5-step wizard: profile → goals → programme → conditions → consent |
| **Dashboard** | `/dashboard` | Daily readiness ring, Today's Actions grid, AI Coach card, condition tip, XP/streak |
| **Nutrition** | `/nutrition` | Calorie + macro rings, meal log, 13 micronutrients, GI/GL badges, photo recognition, barcode scan |
| **Workout** | `/workout` `/workout/history` | 3 programmes (Gym/Home/Beginner), progressive overload engine, rest timer, share card |
| **Metrics** | `/metrics` | Weight log, BMI, XP/level/badges, 7-day chart, stats sharing |
| **Body Composition** | `/body` | US Navy body fat %, measurements log |
| **Glucose** | `/glucose` `/glucose/trends` `/glucose/report` | Blood glucose log, HbA1c, TIR chart, AI nudges, care team PDF |
| **Sleep** | `/sleep` | Sleep log (duration + quality), history, weekly chart |
| **Mood** | `/mood` | Daily mood/energy/anxiety check-in, PHQ-9 screening, crisis links |
| **Blood Pressure** | `/blood-pressure` | BP log, ESC/AHA classification, 30-day history |
| **Habits** | `/habits` | 5 default habits, daily stepper, 7-day streak view |
| **Health Feed** | `/health-feed` | Daily Health Score (8 dimensions), personalised condition tips |
| **Weekly Insights** | `/insights` | AI weekly report: scores + narrative + actions; 24h cache |
| **AI Coach** | `/coach` | Streaming Claude chat grounded in real user health data |
| **Exercises** | `/exercises` | Browse/search all exercises; muscle group filter; detail sheet |
| **Challenges** | `/challenges` | Weekly goals rings, opt-in leaderboard |
| **PCOS** | `/pcos` | Cycle-phase workout phasing, TSH log, symptom tracker |
| **Thyroid** | `/thyroid` | TSH tracking, medication reminders, energy-aware exercise |
| **CGM / Wearables** | `/settings/integrations` | Dexcom OAuth + EGV sync; Apple Health coming soon |
| **Coaching Marketplace** | `/coaching` | 1-on-1 coach matching |
| **Public Profile** | `/u/[username]` | Public stats page; referral link |
| **Pricing** | `/pricing` | Free / Pro £9.99 / Premium £19.99 via Stripe |
| **Profile** | `/profile` | Account, theme toggle, FCM notifications, data export, referral |
| **Help** | `/help` | Feature guide + embedded HealthOS AI assistant |
| **Admin** | `/admin` | Real-time user stats, subscription tiers, DAU chart, user management, feature flags |
| **PWA** | — | Serwist service worker, offline Firestore persistence, install prompts |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router (TypeScript) |
| Styling | Tailwind CSS + CSS custom properties (glassmorphism, light/dark theme) |
| Auth | Firebase Authentication (Google + email) |
| Database | Cloud Firestore (IndexedDB offline persistence) |
| AI | Anthropic Claude (haiku-4-5 for chat/insights, sonnet-4-6 for vision) |
| Charts | Recharts |
| Icons | lucide-react |
| PWA | Serwist v9 |
| Payments | Stripe (Checkout + Customer Portal + webhooks) |
| Monitoring | Sentry v10 |
| Hosting | GCP Cloud Run (europe-west2) |
| Android | Capacitor + Glance home-screen widget |
| Notifications | Firebase Cloud Messaging (FCM) |

---

## AI Features

All AI responses are grounded in the user's **real health data** fetched from Firestore:

| Feature | Data Used |
|---|---|
| AI Coach chat | Profile + conditions + last 7d nutrition/sleep/workouts/glucose/mood/habits |
| Weekly insights | 7d nutrition + workouts + sleep + mood + metrics + conditions |
| Photo food recognition | Vision — meal photo → macros + GI estimate |
| Glucose nudge | Reading, context tag, profile, conditions |
| Care team report | 30d glucose history, HbA1c, profile |

Safety rules enforced at prompt level: no insulin dosing, no diagnosis, crisis protocol (Samaritans 116 123), eating-disorder calorie filter.

---

## Local Development

```bash
git clone https://github.com/kampav/SBH
cd SBH
npm install
cp .env.local.example .env.local
# Fill in Firebase + Anthropic + Stripe credentials
npm run dev           # http://localhost:3000
npm test              # 167 unit tests
npm run test:e2e      # 19 Playwright e2e tests
```

---

## Deployment

Push to `master` → GitHub Actions → Docker → Cloud Run (europe-west2).
Tag `v*` → Play Store AAB build.

```bash
git push origin master   # deploys to production
```

---

## Testing

| Suite | Tests |
|---|---|
| Unit (Vitest) | 167 |
| E2E (Playwright) | 19 |

---

## Credits

- Workout programming: [Jeremy Ethier — Built With Science](https://builtwithscience.com)
- BMR: Mifflin-St Jeor (1990) · HbA1c: Nathan et al. · Body fat: US Navy method
