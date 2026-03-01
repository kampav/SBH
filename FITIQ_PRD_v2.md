# FitIQ — Product Requirements Document (PRD)
## Version 2.0 — Claude Code Build Edition
### Owner: Pav | Updated: March 2026

---

## EXECUTIVE SUMMARY

**Product:** FitIQ — AI-powered personal fitness & nutrition web app
**MVP:** Web application (Next.js) hosted on GCP
**Timeline:** Build incrementally, deploy early, iterate
**User:** Initially Pav (personal use), then public launch
**Content:** Based on Jeremy Ethier "Built With Science" video library

---

## BUILD PHILOSOPHY

- **Incremental first:** Ship something usable in days, not months
- **Local → GitHub → GCP:** Every feature: build locally → test → commit → deploy
- **Security from day 1:** Auth, encrypted data, no PII exposure
- **Context-aware:** Claude Code sessions use CONTEXT.md to avoid starting from scratch

---

## PHASE 1 — MVP (Target: 2 weeks)

### P1.1 Project Scaffold

```
fitiq-app/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/
│   ├── workout/
│   ├── nutrition/
│   ├── metrics/
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── charts/            # Recharts wrappers
│   ├── workout/
│   └── nutrition/
├── lib/
│   ├── firebase.ts        # Firebase client
│   ├── calculations.ts    # BMR/TDEE/BMI formulas
│   └── types.ts           # TypeScript types
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions → Cloud Run
├── Dockerfile
├── docker-compose.yml     # Local dev
└── .env.example
```

### P1.2 Tech Stack (Locked)

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) | SSR, file-based routing, API routes |
| Styling | Tailwind CSS + shadcn/ui | Fast, clean, accessible |
| Auth | Firebase Authentication | Google SSO + email, works with GCP |
| Database | Firestore | Real-time, scales, Firebase ecosystem |
| Charts | Recharts | React-native, lightweight |
| Deployment | Cloud Run (via Docker) | Serverless, GCP native |
| CI/CD | GitHub Actions | Auto deploy on push to main |
| Local Dev | Docker Compose | Reproducible environment |
| Language | TypeScript throughout | Type safety, fewer bugs |

### P1.3 Feature Set (MVP)

#### Feature 1: Authentication (Day 1–2)
- Google Sign-In (Firebase)
- Email/password sign-up
- Protected routes middleware
- User profile creation on first login
- **Security:** Firebase Auth tokens, HTTPS only, no password storage

#### Feature 2: Onboarding & Profile (Day 2–3)
- First-login wizard: age, weight, height, sex, goal, activity level
- Auto-calculate: BMR, TDEE, calorie target, macro split
- Store in Firestore: `users/{uid}/profile`
- Edit profile anytime
- **Formulas (Mifflin-St Jeor):**
  ```
  BMR (male) = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) + 5
  BMR (female) = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) − 161
  TDEE = BMR × activity_multiplier
  Activity: Sedentary=1.2, Light=1.375, Moderate=1.55, Very Active=1.725
  Calorie deficit (fat loss): TDEE − 500
  Protein: weight_kg × 2.0 g
  Fat: total_calories × 0.25 / 9
  Carbs: (total_calories − protein_cals − fat_cals) / 4
  ```

#### Feature 3: Weight & Metrics Tracker (Day 3–4)
- Log weight daily (with timestamp)
- Auto-calculate BMI on each entry
- Line chart: weight over time (7d / 30d / 90d)
- 7-day moving average line (removes noise)
- Target weight marker on chart
- Smart alerts:
  - Losing > 1kg/week: "Risk of muscle loss — consider increasing calories"
  - No change in 3 weeks on deficit: "AI adjustment needed"
- Store in Firestore: `users/{uid}/metrics/{date}`

#### Feature 4: Calorie & Nutrition Tracker (Day 4–6)
- Daily calorie log: add meals with calories + macros
- Macro ring visualisation (protein / carbs / fat)
- Daily summary vs target
- Quick-add frequent meals
- Calorie remaining / over indicator
- Water intake tracker (glasses)
- Store in Firestore: `users/{uid}/nutrition/{date}`
- **Note:** Food database integration (Open Food Facts API) in Phase 2

#### Feature 5: Workout Logger (Day 6–8)
- Today's workout view (based on programme day)
- Log sets: exercise → weight → reps → complete
- Rest timer (auto-start after set completion)
- Progressive overload suggestion: "Last week: 60kg×8. Try 62.5kg today"
- Workout complete summary: total volume, duration, calories burned estimate
- Store in Firestore: `users/{uid}/workouts/{date}`

#### Feature 6: Dashboard (Day 8–9)
- Today's summary card: calories remaining, workout status, weight trend
- Quick actions: Log Meal | Log Workout | Log Weight
- Weekly streak display
- Simple motivational message (rule-based for MVP, AI in Phase 2)

#### Feature 7: Programme Display (Day 9–10)
- Show current programme (hardcoded Phase 1: Full Body 3x/week)
- Week view: which day is today, what's the session
- Each exercise: name, sets×reps, rest, video link (YouTube)
- London day: auto-show bodyweight-only circuit

---

## PHASE 2 — Enhanced (Weeks 3–4)

- Food barcode scanner (Open Food Facts API)
- Food search database
- Programme builder (choose from 6 templates)
- Exercise library (browse by muscle group)
- Progress photos upload (Cloud Storage)
- Body fat % estimator (Navy Method)
- Push notifications (Firebase Cloud Messaging)
- Spreadsheet import (CSV/Google Sheets)

---

## PHASE 3 — AI Coach (Weeks 5–8)

- Weekly AI check-in report (Vertex AI / Gemini)
- AI nutrition chat: "I had biryani and naan for lunch"
- Adaptive programme adjustment (data-driven)
- Wearable sync (Google Fit, Apple Health)
- Content library (Jeremy Ethier video categories)

---

## PHASE 4 — Mobile & Public Launch (Weeks 9–16)

- React Native app (Android + iOS)
- Multi-user support with proper data isolation
- Subscription model (Stripe)
- Public launch

---

## DATA MODELS (Firestore)

```typescript
// users/{uid}/profile
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  age: number;
  sex: 'male' | 'female';
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active';
  goal: 'fat_loss' | 'muscle_gain' | 'recomp' | 'endurance';
  bmr: number;
  tdee: number;
  calorieTarget: number;
  proteinTargetG: number;
  carbTargetG: number;
  fatTargetG: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// users/{uid}/metrics/{YYYY-MM-DD}
interface DailyMetric {
  date: string;
  weightKg: number;
  bmi: number;
  bodyFatPct?: number;
  notes?: string;
  loggedAt: Timestamp;
}

// users/{uid}/nutrition/{YYYY-MM-DD}
interface DailyNutrition {
  date: string;
  meals: Meal[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  waterGlasses: number;
  calorieTarget: number;
}

interface Meal {
  id: string;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  time: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';
}

// users/{uid}/workouts/{YYYY-MM-DD}
interface DailyWorkout {
  date: string;
  programmeDay: string;
  exercises: ExerciseLog[];
  durationMinutes: number;
  totalVolumeKg: number;
  estimatedCaloriesBurned: number;
  notes?: string;
  completedAt: Timestamp;
}

interface ExerciseLog {
  exerciseName: string;
  sets: SetLog[];
  videoUrl?: string;
}

interface SetLog {
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
  restSeconds: number;
}
```

---

## SECURITY REQUIREMENTS

- **Auth:** Firebase Auth (JWT tokens), all API routes verify token
- **Data isolation:** Firestore security rules enforce `users/{uid}` scoping — users can ONLY read/write their own data
- **HTTPS:** Enforced everywhere, no HTTP fallback
- **Environment variables:** All secrets in `.env.local` (never committed) + GCP Secret Manager
- **No PII in logs:** Strip weight/health data from any server logs
- **Rate limiting:** API routes rate-limited (prevent abuse)
- **CORS:** Restrict to app domain only

**Firestore Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## CI/CD PIPELINE (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloud Run
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      - uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: fitiq-app
          region: europe-west2  # London
          source: .
```

---

## GCP SETUP CHECKLIST

```bash
# Run once to set up GCP project
gcloud projects create fitiq-app-[YOUR-ID]
gcloud config set project fitiq-app-[YOUR-ID]
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Create service account for GitHub Actions
gcloud iam service-accounts create github-actions
gcloud projects add-iam-policy-binding fitiq-app-[YOUR-ID] \
  --member="serviceAccount:github-actions@fitiq-app-[YOUR-ID].iam.gserviceaccount.com" \
  --role="roles/run.admin"
```

---

## LOCAL DEVELOPMENT

```bash
# Clone and run
git clone https://github.com/[your-username]/fitiq-app
cd fitiq-app
cp .env.example .env.local
# Fill in Firebase config + any API keys
npm install
npm run dev
# App runs at http://localhost:3000

# Docker option
docker-compose up
```

---

## CONTENT LICENSING NOTE

Jeremy Ethier / Built With Science video integration:
- **MVP:** Link to YouTube videos only (no embedding that bypasses YouTube monetisation)
- **Phase 3:** Negotiate direct API/licensing with bws.plus
- **All video links** stored in exercise library as `youtubeUrl` — easy to swap to licensed content later

---

## IMMEDIATE NEXT SESSION INSTRUCTIONS

When starting Claude Code, paste CONTEXT.md then say:
```
"I want to build FitIQ. Read this context. 
Start with Phase 1 MVP scaffold. 
Create the Next.js project with TypeScript, Tailwind, shadcn/ui, Firebase Auth.
Set up Docker Compose for local dev.
Create the GitHub repo structure with the CI/CD pipeline."
```

---

*PRD v2.0 — March 2026 | Next review: After Phase 1 MVP complete*
