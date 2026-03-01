# SBH — Science Based Health

> A science-backed personal training and nutrition tracking app, inspired by Jeremy Ethier's [Built With Science](https://builtwithscience.com) programme. Track workouts, macros, weight, and earn XP for consistency.

**Live:** https://sbh-app-m3nvdpbv4q-nw.a.run.app
**Stack:** Next.js 14 · Firebase · Tailwind · GCP Cloud Run · GitHub Actions CI/CD

---

## Features

| Module | Details |
|---|---|
| **Auth** | Google Sign-In + email/password via Firebase Auth |
| **Onboarding** | 4-step wizard → BMR/TDEE/macro calculation (Mifflin-St Jeor) |
| **Dashboard** | Progress rings, XP level bar, streak counter, daily science tip |
| **Workout** | 4-day Upper/Lower split + daily 30-min cardio, sets/reps logging, rest timer, YouTube form videos |
| **Nutrition** | Calorie + macro tracker (protein/carbs/fat rings), water intake, meal log |
| **Metrics** | Weight log, BMI, 7-day moving average chart (Recharts), weight alert |
| **Gamification** | XP system (150 XP/workout, 75 XP/nutrition day, 25 XP/weight), 7 levels, 8 badges, daily science tips |

---

## 4-Day Programme

| Day | Focus | Key Exercises |
|---|---|---|
| **Day 1 — Mon** | Upper Push · Chest/Shoulders/Triceps | Flat DB Press, Incline DB Press, Shoulder Press, Lateral Raises, Tricep Pushdowns |
| **Day 2 — Tue** | Lower Posterior · Glutes/Hamstrings | Barbell Hip Thrust, Romanian Deadlift, Swiss Ball Leg Curls, Reverse Lunges, Side Lying Clam |
| **Day 3 — Thu** | Upper Pull · Back/Biceps | Lat Pulldowns, Seated Row, Dumbbell Row, Face Pulls, Barbell Curl, Hammer Curls |
| **Day 4 — Fri** | Lower Anterior · Quads/Core | Barbell Back Squat, Sumo Deadlift, Goblet Squat, Lateral Band Walk, Leg Raises, Bicycle Crunches |
| **Daily** | Cardio | 30 min steady-state, 120-140 bpm (walk/cycle/elliptical/row) |

---

## Architecture

```
                        ┌─────────────────┐
                        │   User Browser  │
                        └────────┬────────┘
                                 │ HTTPS
                        ┌────────▼────────┐
                        │  Cloud Run      │  europe-west2
                        │  Next.js 14     │  sbh-app
                        │  (standalone)   │
                        └────────┬────────┘
                    ┌────────────┴────────────┐
                    │                         │
           ┌────────▼────────┐      ┌─────────▼────────┐
           │  Firebase Auth  │      │    Firestore DB   │
           │  (Google + pwd) │      │  (user data)      │
           └─────────────────┘      └──────────────────-┘

CI/CD:  GitHub push → GitHub Actions → Docker build →
        Artifact Registry → Cloud Run deploy
```

### Firestore Schema

```
users/{uid}/
  profile/data          # UserProfile (BMR, TDEE, targets, goals)
  metrics/{date}        # DailyMetric (weightKg, bmi)
  nutrition/{date}      # DailyNutrition (meals[], macros, water)
  workouts/{date}       # DailyWorkout (exercises[], volume, duration)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router (TypeScript) |
| Styling | Tailwind CSS + custom CSS variables |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Charts | Recharts |
| Icons | lucide-react |
| Hosting | GCP Cloud Run (europe-west2, London) |
| Container | Docker (multi-stage, standalone output) |
| CI/CD | GitHub Actions |
| Registry | Artifact Registry (`europe-west2/sbh`) |
| Budget | GCP billing alert: £10/month |

---

## Local Development

```bash
# Prerequisites: Node 18+, npm

git clone https://github.com/kampav/SBH
cd SBH
npm install

# Create .env.local (see .env.local.example)
cp .env.local.example .env.local
# Fill in your Firebase credentials

npm run dev
# Open http://localhost:3000
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=science-based-health
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

---

## Deployment

Push to `master` branch triggers automatic deploy:

```
git push origin master
```

GitHub Actions workflow (`.github/workflows/deploy.yml`):
1. Authenticate to GCP with service account
2. Build Docker image (Next.js standalone)
3. Push to Artifact Registry: `europe-west2-docker.pkg.dev/science-based-health/sbh/sbh-app`
4. Deploy to Cloud Run: `sbh-app` service, europe-west2, 512Mi RAM

---

## GCP Resources

| Resource | Name | Region |
|---|---|---|
| Cloud Run | sbh-app | europe-west2 |
| Artifact Registry | sbh | europe-west2 |
| Firebase Project | science-based-health | — |
| Billing Budget | SBH £10/month alert | — |

---

## Gamification

### XP System

| Action | XP Earned |
|---|---|
| Complete workout | +150 XP |
| Log nutrition day | +75 XP |
| Log weight | +25 XP |

### Levels

| Level | Title | XP Required |
|---|---|---|
| 1 | Beginner | 0 |
| 2 | Committed | 500 |
| 3 | Consistent | 1,200 |
| 4 | Dedicated | 2,500 |
| 5 | Iron Will | 5,000 |
| 6 | Elite | 10,000 |
| 7 | Legend | 20,000 |

### Badges

| Badge | Requirement |
|---|---|
| First Step | Log first workout |
| Fuel Up | Log first nutrition day |
| Scale Warrior | Log weight 7 days |
| Week Warrior | 7-day workout streak |
| Iron Will | 30-day all-activity streak |
| Ten Workouts | Complete 10 workouts |
| Protein King | Log nutrition 14 days |
| Elite | Reach 5,000 XP |

---

## Macro Calculation (Mifflin-St Jeor)

```
BMR (male) = 10 × weightKg + 6.25 × heightCm − 5 × age + 5
TDEE       = BMR × activityMultiplier
Target     = TDEE − 500  (cut)  / TDEE + 300  (bulk)  / TDEE (maintain)
Protein    = weightKg × 2.0g
Fat        = Target × 0.25 / 9
Carbs      = (Target − protein×4 − fat×9) / 4
```

---

## Version History

| Version | Date | Changes |
|---|---|---|
| v0.1 | 2025-03 | Initial Next.js + Firebase setup, auth, onboarding |
| v0.2 | 2025-03 | Dashboard, nutrition, workout, metrics pages |
| v0.3 | 2025-03 | GCP Cloud Run deployment, CI/CD pipeline |
| v0.4 | 2025-03 | Auth bug fixes (unauthorized-domain, email login race condition) |
| v0.5 | 2026-03 | Full UI redesign (dark premium theme), gamification (XP/badges/streaks), 4-day workout programme, BottomNav, ProgressRing, daily science tips |

---

## Security

- Firestore rules: each user can only read/write their own data (`users/{userId}/{document=**}`)
- Firebase Auth: enforces authentication before any data access
- Environment variables: credentials stored as GitHub Actions secrets, never in repo
- Firebase API key is public-safe (restricted by Firebase Auth domain allowlist)

---

## Credits

- Workout programming: [Jeremy Ethier — Built With Science](https://builtwithscience.com)
- Science-based nutrition: Mifflin-St Jeor equation
- Exercise videos: [Built With Science YouTube](https://youtube.com/@JeremyEthier)
