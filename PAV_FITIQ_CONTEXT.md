# PAV'S FITIQ — PERSONAL CONTEXT FILE
## 🔁 PASTE THIS AT THE START OF EVERY NEW CLAUDE SESSION
> Last updated: March 2026 | Update this file after every session with new data/decisions

---

## 1. PERSONAL PROFILE

| Field | Value |
|---|---|
| Name | Pav |
| Age | 43 |
| Sex | Male |
| Ethnicity | Indian (South Asian) |
| Location | Colchester, UK |
| Height | 165 cm (5'5") |
| Current Weight | 83 kg |
| Target Weight | 68 kg (stretch: 65 kg) |
| Previous Best | 72 kg (~4 years ago) |
| BMI (current) | 30.5 (Obese Class I) |
| BMI (target) | 25.0 (top of healthy range) |
| Timeline | 3 months primary target: lose 5–10 kg |
| London Marathon | April 2026 (training ongoing) |

---

## 2. CALORIE & METABOLIC CALCULATIONS

Using **Mifflin-St Jeor** (most accurate for South Asian males):

```
BMR = (10 × 83) + (6.25 × 165) − (5 × 43) + 5 = 1,651 kcal/day
TDEE (Moderately Active) = BMR × 1.55 = 2,558 kcal/day
Fat Loss Target = TDEE − 500 = ~2,050 kcal/day
Protein Target = 2.0g × 83kg = 166g/day (preserve muscle while cutting)
Carbs = ~180g/day (prioritise around training)
Fat = ~65g/day
```

**Rate of loss target:** 0.5–0.75 kg/week (safe for muscle preservation)
**Recalculate TDEE** every time weight changes by 2+ kg

---

## 3. HEALTH CONTEXT (Critical for AI personalisation)

- **Mental health:** Low-grade depression — this significantly affects consistency and motivation
- **Eating pattern:** Intermittent fasting (IF) attempted but frequently broken by binge eating after the fast window
- **Root cause:** Restriction → extreme hunger → binge. Need to solve the binge cycle, not just track calories
- **Approach:** Flexible dieting (IIFLEX) preferred over strict IF. If IF is used, 16:8 max with planned break-fast meal
- **Key principle:** Never skip protein. Even on bad days, hit protein target first — everything else is secondary

---

## 4. WEEKLY SCHEDULE & CONSTRAINTS

| Day | Constraint | Workout Option |
|---|---|---|
| Monday | London commute — leave 6am, return ~9pm | Bodyweight morning (15 min) OR rest |
| Tuesday | London commute (same as Monday) | Bodyweight morning (15 min) OR rest |
| Wednesday | Work from home (Colchester) | Full 45–60 min gym/home session |
| Thursday | WFH or London (variable) | 30–45 min session |
| Friday | WFH | Full 45–60 min session |
| Saturday | Free | Long run (marathon training) + weights |
| Sunday | Free | Active recovery / mobility |

> **London days:** Bodyweight-only, done at home before 6am OR skipped with no guilt — consistency over perfection

---

## 5. FITNESS BACKGROUND & CURRENT LEVEL

- **Level:** Intermediate (has trained on and off for years, knows movements)
- **Previous success:** Got to 72 kg — so has proven it's possible
- **Current state:** Inconsistent — building back habits
- **Marathon training:** Running is part of the programme (April 2026 target: sub-4 hour)
- **Goals priority order:**
  1. Fat loss (5–10 kg in 3 months)
  2. Cardio / marathon fitness
  3. Functional strength & flexibility
  4. Long-term: lean, enduring, high-physical-capacity body

---

## 6. 3-MONTH WORKOUT PROGRAMME (Starting March 2026)

### Phase 1 — Foundation (Weeks 1–4)
Focus: Build the habit, activate metabolism, establish movement patterns

**Training Days: 4x/week** (Wed, Thu/Fri, Sat + 1 London day bodyweight)

| Day | Session | Duration |
|---|---|---|
| Wed | Full Body Strength (gym or home weights) | 45 min |
| Fri | Full Body Strength + Core | 45 min |
| Sat | Long Run (5–8 km building) + Mobility | 60 min |
| London day (Mon/Tue) | Bodyweight circuit | 15 min |

**Full Body Strength Session (Wed & Fri):**
1. Goblet Squat — 3×12
2. Romanian Deadlift — 3×10
3. Push-Up (or Dumbbell Press) — 3×12
4. Dumbbell Row — 3×12 each side
5. Shoulder Press — 3×10
6. Plank — 3×30 sec
7. Walking Lunges — 2×12 each leg

**London Day Bodyweight Circuit (15 min):**
1. Jump Squats — 3×15
2. Push-Ups — 3×15
3. Mountain Climbers — 3×30 sec
4. Glute Bridges — 3×20
5. Dead Bugs — 3×10

### Phase 2 — Build (Weeks 5–8)
Push/Pull/Legs split, increase volume, add running distance (8–12 km)

### Phase 3 — Peak (Weeks 9–12)
Maintain strength, increase running (12–18 km), refine calories for final cut

---

## 7. NUTRITION APPROACH

- **Style:** Flexible dieting (not strict IF) — eat within an 8–10 hour window naturally
- **Priority:** Hit protein first (166g) — rest fills itself
- **Meal timing:** 3 meals, no skipping
  - **Meal 1 (Break-fast ~9–10am):** High protein (eggs, Greek yoghurt, paneer)
  - **Meal 2 (Lunch ~1–2pm):** Balanced (lean protein + veg + complex carbs)
  - **Meal 3 (Dinner ~6–7pm):** Lighter, protein-focused
- **South Asian foods to leverage:** Dal (high protein), paneer, curd, roti (portion-controlled), sabzi, eggs
- **Key rule:** On London days, prep food in advance — hunger while commuting causes binges

---

## 8. FITIQ APP — PROJECT STATUS

**Vision:** Cross-platform fitness app (Android/iOS/Web) hosted on GCP, AI-coached, personalised to Pav's data, using Jeremy Ethier's "Built With Science" content as training material.

**PRD Status:** v1.0 complete (see PRD file)
**GitHub Repo:** [TO BE CREATED — name: `fitiq-app`]
**GCP Project:** [TO BE CREATED]
**Current Phase:** Pre-development (PRD complete, starting build)

### Tech Stack Decision
- **Frontend:** React + Next.js (Web MVP first), then React Native (mobile)
- **Backend:** Node.js / Express on Cloud Run
- **Database:** Firestore (user data) + Cloud SQL PostgreSQL (exercise/food library)
- **Auth:** Firebase Authentication
- **AI:** Vertex AI (Gemini)
- **Storage:** Cloud Storage
- **CI/CD:** GitHub Actions → Cloud Run
- **Local dev:** Docker Compose

### Build Order (Incremental)
1. ✅ PRD Complete
2. 🔄 **NEXT:** Scaffold web app locally (Next.js + Firebase Auth)
3. GitHub repo + CI/CD pipeline
4. Calorie tracker (with Pav's formulas)
5. Weight/BMI tracker + charts
6. Workout logger
7. GCP deployment
8. AI coach (Vertex AI)

---

## 9. SESSION CONTINUITY INSTRUCTIONS

When starting a new Claude Code session, paste this file and say:
> "Continue building FitIQ. Here's my context. We last completed: [X]. Next task: [Y]"

**After each session, update this file with:**
- What was built/completed
- Current GitHub commit/branch
- Any decisions made (tech choices, feature changes)
- Next session's starting point

---

## 10. QUICK REFERENCE — TOMORROW'S PLAN

**Date:** Monday 2 March 2026 (London commute day)
**Before 6am bodyweight circuit:**
- 3 rounds: 15 push-ups → 20 squats → 10 burpees → 30 sec plank
- Duration: 12–15 minutes
- No equipment needed

**Calorie target today:** 2,050 kcal
**Protein target:** 166g
**Prep for London:** Pack high-protein snacks (boiled eggs, Greek yoghurt, protein bar) — DON'T rely on buying food when hungry
