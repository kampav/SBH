# SBH — Science Based Health
## Session Context File — Paste at start of every Claude session

> Last updated: March 2026 | Version: 0.1.0-scaffold

---

## APP IDENTITY
- **Name:** SBH (Science Based Health)
- **Based on:** Jeremy Ethier "Built With Science" content library
- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + Firebase + GCP Cloud Run
- **Local path:** `C:\Projects\SBH`
- **GitHub:** [ADD GITHUB URL WHEN CREATED]
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
1. **Enable Firebase Auth providers** — Go to [Firebase Console → Authentication](https://console.firebase.google.com/project/science-based-health/authentication) → Get Started → Enable Email/Password + Google
2. **Create GitHub repo** — Push code, add secrets from `SETUP_GITHUB_SECRETS.md`
3. **First test** — Open http://localhost:3000, register, complete onboarding, test all pages
4. **First deployment** — Push to GitHub main → auto-deploy to Cloud Run
5. Delete `.secrets/gcp-sa-key.json` after secrets are in GitHub

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

## SESSION INSTRUCTIONS
Start next session with:
> "Continue building SBH. Here's my CONTEXT.md.
> Last completed: [paste status above].
> Next task: [pick from NEXT TASKS list]"

After each session, update the STATUS table and NEXT TASKS list above.
