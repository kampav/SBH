# SBH — PRD v4.0 | Health OS
**Owner:** Pav | **Drafted:** March 2026 | **Status:** Planning
**Vision:** Evolve SBH from a fitness tracker into a **condition-aware, Netflix-personalised health operating system** that earns revenue at every tier of the market — consumer, clinical, and corporate.

---

## EXECUTIVE SUMMARY

**The problem with most health apps:** they show everything to everyone. A diabetic sees the same dashboard as a gym bro. A person with anxiety gets the same onboarding as a marathon runner. Users churn because the app never feels like it's *for them*.

**SBH v4 answer:** Condition Intelligence + Netflix-style surfacing. The app learns who you are in the first 5 minutes and rebuilds itself around your conditions, goals, and daily patterns. Features are *earned and revealed* — not dumped on users at launch.

**Revenue answer:** Stop competing on features. Compete on *outcomes per condition*. Charge per condition, not per feature tier. Add B2B corporate wellness ($100B market). Add coaching marketplace (20% take rate). Add CGM/wearable integrations that competitors can't match at our price point.

---

## PART 1 — CONDITION INTELLIGENCE ENGINE

### 1.1 Supported Conditions (v4 launch set)

```
Primary conditions (full mode):
  DIABETES_T1     — Type 1 Diabetes
  DIABETES_T2     — Type 2 Diabetes / Pre-diabetes
  MENTAL_HEALTH   — Anxiety, Depression, Stress, Burnout
  HEART_HEALTH    — Hypertension, High Cholesterol, Post-cardiac rehab
  PCOS            — Polycystic Ovary Syndrome
  THYROID         — Hypothyroidism / Hyperthyroidism

Secondary overlays (add-ons, can stack):
  WEIGHT_LOSS     — calorie deficit + body composition focus
  MUSCLE_GAIN     — progressive overload + protein focus
  ATHLETIC        — performance, VO2max, race prep
  GENERAL         — no specific condition, healthy maintenance
```

### 1.2 Condition Profile (stored in UserProfile)

```typescript
// lib/types.ts — add to UserProfile
type ConditionKey =
  | 'DIABETES_T1' | 'DIABETES_T2'
  | 'MENTAL_HEALTH' | 'HEART_HEALTH'
  | 'PCOS' | 'THYROID'
  | 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'ATHLETIC' | 'GENERAL'

interface ConditionProfile {
  primary: ConditionKey[]          // e.g. ['DIABETES_T2', 'MENTAL_HEALTH']
  secondary: ConditionKey[]        // e.g. ['WEIGHT_LOSS']
  diagnosedYear?: number
  medicationManaged?: boolean      // affects safety warnings
  careTeamEmail?: string           // GP / endocrinologist for report sharing
  usesCGM?: boolean                // triggers CGM integration onboarding
  cgmProvider?: 'dexcom' | 'libre' | 'other'
  mentalHealthScreenedAt?: string  // date of last PHQ-9
  ramadanMode?: boolean            // UAE/India — adjusts meal timing logic
}
```

### 1.3 Condition → Feature Mapping

Each condition activates a specific set of modules that appear in the Health Feed:

| Condition | Activates |
|---|---|
| DIABETES_T1/T2 | Glucose tracker, CGM integration, GI/GL meal scoring, HbA1c log, care team reports, low-GI swap suggestions, Ramadan fasting mode |
| MENTAL_HEALTH | Mood tracker, daily check-in, CBT journal, PHQ-9/GAD-7 screening, stress correlation dashboard, crisis safety protocol |
| HEART_HEALTH | Blood pressure log, heart rate zones, cholesterol tracker, sodium intake monitoring, cardiac zone workouts |
| PCOS | Cycle tracking, insulin resistance nutrition mode, hormone-friendly workout phasing, supplement tracker |
| THYROID | Medication reminder, fatigue-aware workout adjustment, TSH log, energy correlation charts |

---

## PART 2 — NETFLIX-STYLE HEALTH FEED

### 2.1 Philosophy

Replace the static dashboard with a **dynamic Health Feed** — a ranked list of cards that answers *"what does this person need to see right now?"*

Netflix drives 80% of engagement from algorithmic recommendations. SBH v4 will apply the same principle: no two users see the same home screen, and the screen changes by time of day, condition events, and logged data.

### 2.2 Card Types

```typescript
type HealthCardType =
  | 'log_prompt'        // "Log your breakfast — 3 days streak!"
  | 'insight'           // AI-generated: "Your glucose spiked after pasta twice this week"
  | 'discover'          // Feature reveal: "You haven't tried the CGM connect yet"
  | 'progress'          // Milestone: "7 days of mood logging — here's your pattern"
  | 'condition_alert'   // "Your average BP this week is above your target"
  | 'challenge'         // "Weekly step goal: 43% complete"
  | 'coach_message'     // Message from assigned coach
  | 'community'         // Leaderboard highlight, challenge invite
  | 'tip'               // Science-backed micro-tip (Jeremy Ethier content library)
  | 'upsell'            // Soft upgrade prompt (shown max 1x per week)
```

### 2.3 Feed Ranking Algorithm

```typescript
// lib/health/feedEngine.ts
interface CardScore {
  cardId: string
  type: HealthCardType
  baseScore: number      // 0-100
  boosts: {
    conditionRelevant: number  // +30 if card matches user's conditions
    timely: number             // +20 if time-of-day match (e.g. breakfast log at 8am)
    notLogged: number          // +25 if today's data is missing for this card
    streakRisk: number         // +15 if streak about to break
    abVariant: number          // +/-10 from A/B experiment
  }
  finalScore: number     // sum, capped at 100
}

export function rankFeedCards(ctx: DailyContext, conditions: ConditionKey[], hour: number): HealthCard[] {
  const cards = generateAllEligibleCards(ctx, conditions)
  return cards
    .map(card => ({...card, finalScore: scoreCard(card, ctx, conditions, hour)}))
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 8)  // max 8 cards in feed at once
}
```

### 2.4 Feature Discovery Cards (Progressive Reveal)

```
Day 0:  Core cards only (calorie ring, log meal, log workout)
Day 3:  "Discover" card — introduce glucose tracking (if diabetic) or mood tracking (if mental health)
Day 7:  "Discover" card — weekly insights unlock
Day 14: "Discover" card — CGM integration or habit tracker
Day 21: "Discover" card — coaching marketplace or challenges
Day 30: Full feature set surfaced + upgrade prompt

Rule: Never surface a feature the user hasn't been prepared for.
Rule: Max 1 Discover card per day.
Rule: Never show upsell within 7 days of showing a Discover card.
```

### 2.5 Customisable Home Screen

Users can tap "Customise" on the feed to:
- Pin/unpin card types
- Reorder sections via drag-and-drop
- Enable **Focus Mode** (minimal UI — calorie ring + log button only, all cards hidden)
- Toggle condition sections on/off
- Set preferred time for daily check-in prompt

Preferences stored in `users/{uid}/profile/data.feedPreferences`.

---

## PART 3 — SMART ONBOARDING v2 ("THE MAGICAL FIRST 7 DAYS")

### 3.1 Onboarding Flow (redesigned — 7 screens, <90 seconds)

```
Screen 1: "What brought you here today?"
  Full-screen cards with icon + copy. Multi-select allowed.
  [ Lose weight ]  [ Manage diabetes ]  [ Improve mental health ]
  [ Build muscle ]  [ Heart health ]    [ General wellness ]
  Sets conditions from first tap.

Screen 2: "Tell us about yourself"
  Age, sex, height, weight. Smart defaults from locale.

Screen 3: "How active are you?"
  4 activity level cards (same as v3).

Screen 4: CONDITION-SPECIFIC (shown only if relevant condition selected)
  DIABETES:      "Do you use a CGM?" [Dexcom / Libre / No] + medication? [Yes/No]
  MENTAL_HEALTH: "How are you feeling this week?" (PHQ-2 — 2 questions)
  HEART_HEALTH:  "Do you know your blood pressure?" + input if yes
  User feels immediately seen — the app already knows their world.

Screen 5: "When do you train?"
  Day selector + training time chips (same as v3).

Screen 6: GDPR consent (required — same as v3).

Screen 7: "Your personalised health plan" — animated reveal
  Shows ONLY features relevant to their conditions:
  "Your SBH plan: Glucose tracking · Nutrition · Mental wellness check-ins"
  [Let's start →]
```

### 3.2 The 7-Day Activation Sequence

```typescript
// lib/onboarding/activationPlan.ts
const ACTIVATION_SEQUENCE = {
  day1: { mission: "Log your first meal",        unlock: "Calorie ring + streak" },
  day2: { mission: "Log your weight",             unlock: "Weight trend chart" },
  day3: { mission: "Complete a workout",          unlock: "Progressive overload badge + first insight" },
  day4: { mission: "Log water all day",           unlock: "Hydration streak" },
  day5: { mission: "Check your weekly insight",   unlock: "AI weekly report" },
  day6: { mission: "Invite a friend",             unlock: "Referral badge + XP bonus" },
  day7: { mission: "Day 7 check-in",              unlock: "Full dashboard + Pro upgrade offer" },
}
// Shown as "Today's Mission" card in the Health Feed.
// Completing missions earns XP and unlocks the next feature.
// Pro upgrade prompt appears at Day 7 ONLY — after value demonstrated.
```

---

## PART 4 — MENTAL HEALTH SUITE

### 4.1 Core Features

**Daily Mood Check-in**
```typescript
// app/mood/page.tsx — shown every day at user's preferred time (default 8pm)
interface MoodLog {
  date: string
  hour: number
  mood: 1 | 2 | 3 | 4 | 5        // 1=very low, 5=excellent
  emotions: string[]               // ['anxious','grateful','tired','motivated']
  note?: string                    // optional free text
  energyLevel: 1 | 2 | 3 | 4 | 5
  sleepLast?: number               // auto-pulled from sleep log
}
// Firestore: users/{uid}/mood/{date}
// lib/health/moodUtils.ts: calcMoodTrend, moodLabel, moodColor, avgMood7d
```

**CBT Thought Journal**
```typescript
// app/journal/page.tsx
interface ThoughtRecord {
  date: string
  situation: string           // "What happened?"
  automaticThought: string    // "What went through your mind?"
  emotion: string             // + intensity 0-10
  evidence_for: string        // "What supports this thought?"
  evidence_against: string    // "What doesn't support it?"
  balancedThought: string     // "A more balanced view"
  outcomeEmotion: string      // "How do you feel now?" + intensity 0-10
}
// Firestore: users/{uid}/thought_records/{id}
```

**Clinical Screening (PHQ-9 / GAD-7)**
```typescript
// Run PHQ-9 monthly if MENTAL_HEALTH condition active.
// Run GAD-7 monthly for anxiety tracking.
// Display scores as trend chart over time.
// If PHQ-9 >= 15 (moderately severe): show professional help prompt + crisis resources.
// NEVER diagnose — always "speak to a healthcare professional".
// Clinical disclaimer on every mental health screen.
// Firestore: users/{uid}/phq9/{YYYY-MM}, users/{uid}/gad7/{YYYY-MM}
```

**Stress Correlation Dashboard**
```typescript
// Correlates mood scores with: sleep quality, nutrition adherence, workout days, glucose
// "Your mood is 23% higher on days you exercise"
// "Anxiety peaks on days with <6h sleep"
// Weekly summary: mood trend, best day, worst day, top correlating factor
```

**Crisis Safety Protocol**
```typescript
// Triggered if: PHQ-9 >= 20 OR mood = 1 for 3 consecutive days
// Shows crisis card: "We noticed you're having a tough time"
// Crisis links: UK Samaritans 116 123 | India iCall | UAE Thistle Hotline
// Emergency contact notification (if user has set one)
// Never attempt therapy — signpost only. Safety above engagement.
```

### 4.2 Firestore Schema (Mental Health additions)

```
users/{uid}/
  mood/{date}                 → MoodLog
  thought_records/{id}        → ThoughtRecord
  phq9/{YYYY-MM}              → { score, date, responses[] }
  gad7/{YYYY-MM}              → { score, date, responses[] }
  mental_settings/config      → { checkInTime, screeningEnabled, emergencyContact }
  blood_pressure/{date}       → BloodPressureLog (Heart Health)
  coach_messages/{id}         → CoachMessage (Coaching add-on)
  coach_chats/{sessionId}     → CoachChat (AI coach conversations)
```

---

## PART 5 — CGM & WEARABLE INTEGRATION

### 5.1 Dexcom Integration (OAuth 2.0 — FDA cleared)

```typescript
// lib/integrations/dexcom.ts
// OAuth 2.0 flow: user authorises SBH → receives access_token + refresh_token
// Scopes: offline_access, egv (estimated glucose values), events
// Endpoint: https://api.dexcom.com/v3/users/self/egvs
// Supported devices: G5, G6, G7, Dexcom One+
// Sync: every 5 minutes via background fetch or FCM trigger
// Store: merged into users/{uid}/glucose/{date} alongside manual readings
// UI: real-time trend arrow in dashboard header (rising/falling/steady)

interface DexcomReading {
  systemTime: string
  displayTime: string
  value: number              // mg/dL — convert to mmol/L for UK users
  trend?: 'rising' | 'falling' | 'steady' | 'rising_rapidly' | 'falling_rapidly'
  trendRate?: number         // mg/dL/min
}
```

### 5.2 FreeStyle Libre (LibreLink Up API)

```typescript
// lib/integrations/libre.ts
// Abbott LibreLink Up API (OAuth2, similar to Dexcom pattern)
// 15-minute interval glucose readings
// Supported: Libre 2, Libre 3 (UK NHS prescribes Libre for T1DM — key market)
// Store same as Dexcom: merged into glucose/{date}
```

### 5.3 Google Health Connect

```typescript
// lib/integrations/health-connect.ts
// Android — replaces manual Capacitor plugin approach
// Read permissions: STEPS, HEART_RATE, SLEEP, WEIGHT, BLOOD_PRESSURE, BLOOD_GLUCOSE
// Write permissions: NUTRITION (calories), EXERCISE_SESSION (workout), WEIGHT
// Sync: daily at midnight + on app open
// Routes data to existing Firestore collections (no new schema)
```

### 5.4 Apple HealthKit (iOS PWA)

```typescript
// lib/integrations/healthkit.ts
// iOS 17.4+ — Web API limited but usable
// Request: steps, heart rate, weight
// Full integration requires native iOS app (Phase 20 backlog)
```

### 5.5 Samsung Health Connect

```typescript
// Uses Health Connect API (same Android layer — no separate SDK)
// Additional Samsung-specific: stress index, body composition from smart scale
// Route: /settings/integrations — toggle per provider
```

---

## PART 6 — REVENUE ENGINE v2

### 6.1 Pricing (Condition-Tiered)

```
FREE TIER (permanent free):
  - Calorie tracking + nutrition log
  - 3 workouts/week (beginner programme only)
  - Basic glucose log (manual entry)
  - Mood check-in (7-day history)
  - 1 weekly AI insight per week

SBH FITNESS PRO — £9.99/month | £79/year
  - All workout programmes + custom routines
  - Progressive overload engine
  - Exercise library + form cues + personal bests
  - Advanced nutrition analytics
  - Full workout + nutrition history

SBH DIABETES PRO — £14.99/month | £119/year
  - CGM integration (Dexcom + Libre)
  - Real-time glucose trend in dashboard
  - GI/GL scoring on every meal
  - HbA1c tracker + trend chart
  - Care team PDF report (shareable with GP/endocrinologist)
  - Ramadan fasting mode
  - Low-GI meal planning
  + Everything in Fitness Pro

SBH MENTAL WELLNESS — £9.99/month | £79/year
  - CBT Thought Journal (unlimited)
  - PHQ-9 / GAD-7 monthly screening + trend
  - Mood-sleep-exercise correlation dashboard
  - AI daily mental check-in (Claude)
  - Guided breathing + mindfulness exercises
  - Mood history export (PDF/CSV)

SBH HEALTH OS — £24.99/month | £199/year  ← PRIMARY REVENUE DRIVER
  - ALL conditions active simultaneously
  - CGM integration (Dexcom + Libre)
  - All wearable integrations (Garmin, Fitbit, Apple, Samsung)
  - Unlimited AI coaching conversations
  - Family plan (up to 3 profiles — powerful for diabetic families)
  - Priority support + early feature access

COACHING ADD-ON — from £49.99/month
  - Matched with certified coach (nutritionist, PT, or therapist)
  - Weekly 1:1 video/message session
  - Personalised plan updated weekly
  - Coach sees user's SBH data (with permission)
  - SBH takes 20% commission from coach payment
```

### 6.2 B2B Corporate Wellness

```
SBH for Teams — from £5/employee/month (min 50 seats)

Features:
  - Admin dashboard: aggregate wellbeing scores (anonymised, never individual)
  - Team challenges: step goals, nutrition, mental health check-ins
  - Mental health check-in aggregate reports (compliant with employment law)
  - Customisable company branding + SSO (Google Workspace / Azure AD)
  - Quarterly ROI report (sick days correlated with engagement score)

Revenue potential:
  - Single contract: £3,000-£30,000/year (50-500 employees)
  - Target: 50 UK SMEs in year 1 = £500k ARR from B2B
  - Sales target: HR Directors, Chief People Officers, Employee Benefits Managers
  - Sales cycle: 4-8 weeks
```

### 6.3 Insurance Partnerships

```
UK:
  - BUPA wellness credit: SBH subscription counts toward BUPA wellness benefit
  - AXA Health: integrate as digital health tool in corporate plans
  - Vitality Health: steps/workouts feed into Vitality points (API)

India:
  - Star Health / HDFC ERGO wellness tie-ups
  - Ayushman Bharat digital health ecosystem

US (future):
  - HSA/FSA eligibility letter generator
  - Letter of Medical Necessity for CGM subscription
```

### 6.4 Revenue Projections (18-month)

```
Consumer:
  Month 6:   2,000 paid x £12 avg = £24,000/month
  Month 12:  8,000 paid x £14 avg = £112,000/month
  Month 18: 20,000 paid x £16 avg = £320,000/month

B2B:
  Month 12:  10 contracts x £2,000/month = £20,000/month
  Month 18:  30 contracts x £3,000/month = £90,000/month

Coaching marketplace:
  Month 18:  500 sessions/month x £60 x 20% = £6,000/month

Target Month 18 ARR run rate: ~£5M
```

---

## PART 7 — A/B EXPERIMENT PLAN

### 7.1 Key Experiments (use existing ab-testing.ts framework)

```typescript
// Add to EXPERIMENTS in lib/firebase/ab-testing.ts

'feed_layout': {
  variants: ['cards', 'list', 'grid'],
  weights: [0.34, 0.33, 0.33],
  metric: 'daily_active_logging_rate',
}

'feature_reveal_timing': {
  variants: ['day3', 'day7', 'day14'],
  weights: [0.33, 0.34, 0.33],
  metric: 'feature_adoption_rate',
}

'upsell_trigger': {
  variants: ['after_first_insight', 'day7', 'streak_milestone'],
  weights: [0.33, 0.34, 0.33],
  metric: 'conversion_to_paid',
  // Hypothesis: after_first_insight converts best (value demonstrated first)
}

'onboarding_length': {
  variants: ['5_screens', '7_screens_with_condition'],
  weights: [0.5, 0.5],
  metric: 'day7_retention',
}

'home_screen_style': {
  variants: ['calorie_hero', 'condition_feed', 'today_mission'],
  weights: [0.33, 0.34, 0.33],
  metric: 'session_length_minutes',
}
```

### 7.2 Analytics Admin Dashboard

```
Route: /admin/analytics (password-gated)

Panels:
  - Funnel: Install → Onboard → Day1 log → Day7 active → Paid
  - Experiment results with statistical significance
  - Revenue by tier + condition + market (UK/IN/AE)
  - Cohort retention curves (D1/D7/D30)
  - MRR / ARR tracker
```

---

## PART 8 — HEART HEALTH + PCOS MODULES

### 8.1 Heart Health

```typescript
// app/heart/page.tsx + lib/health/heartUtils.ts

interface BloodPressureLog {
  date: string; time: string
  systolic: number; diastolic: number; pulse: number
  context: 'morning' | 'evening' | 'after_exercise' | 'stressed'
  notes?: string
}
// Firestore: users/{uid}/blood_pressure/{date}

// Dashboard widget: 7-day avg + trend arrow + BHS category
// Alert: 3 consecutive readings >140/90 → "Please speak to your GP"
// Sodium tracker: nutrition integration, warns if >2.3g/day (NHS guideline)
// Heart rate zones: synced from Health Connect; Zone 2 workout mode
```

### 8.2 PCOS Module

```typescript
// app/pcos/page.tsx — empathetic, non-clinical tone
// Features:
//   - Cycle tracking (period start, duration, symptoms)
//   - Insulin resistance nutrition mode (lower GI, leucine-rich protein)
//   - Hormone-friendly workout phasing:
//       Phase 1 menstrual:   recovery, gentle movement
//       Phase 2 follicular:  strength, high intensity
//       Phase 3 ovulatory:   peak performance window
//       Phase 4 luteal:      moderate, reduce HIIT
//   - Supplement tracker (inositol, vitamin D, magnesium, spearmint)
//   - Symptom log (bloating, cramps, mood, acne, hair loss)
//   - Correlation dashboard: symptoms vs nutrition vs cycle day
```

---

## PART 9 — AI HEALTH COACH (Claude-Powered)

### 9.1 Daily Check-in (Scheduled)

```typescript
// POST /api/coach/daily-checkin
// Triggered by FCM at user's wake time
// Input: DailyContext + last 7 days all tracked data + conditions
// Output (Claude claude-sonnet-4-6):
//   - 3-sentence personalised morning message
//   - "Focus for today" (single actionable)
//   - Evening reflection prompt
// Cached: users/{uid}/coach/{date}
// Cost control: claude-haiku-4-5 for Free tier, sonnet for paid

// Safety rails:
// - Never prescribe medication
// - Never diagnose
// - Clinical symptoms described → "Please see a doctor"
// - Mental health crisis signals → escalate to crisis card
// - Never mention eating disorder triggers (no calorie numbers in mental health context)
```

### 9.2 Conversational Coach (Chat)

```typescript
// app/coach/page.tsx
// Pro: unlimited | Free: 5 messages/week
// System prompt: full health profile + last 30 days context + active conditions
// Conversation history: last 20 messages in Firestore
// Streaming responses (SSE) for natural feel
```

### 9.3 Condition-Specific Weekly Narrative

```typescript
// Extends /api/insights/weekly with condition sections:
// Diabetes: avg glucose, time-in-range %, HbA1c estimate
// Mental health: mood trend, best/worst day, top correlating factor
// Fitness: PRs set, volume, streak
// 200-word narrative: 3 wins + 2 focus areas for next week
// Shareable PDF for care team (Diabetes Pro feature)
```

---

## PART 10 — COMPETITIVE DIFFERENTIATION

| Feature | Cronometer | MyFitnessPal | Noom | **SBH v4** |
|---|---|---|---|---|
| Diabetes CGM integration | No | No | No | **Yes (Dexcom + Libre)** |
| Mental health suite | No | No | Partial | **Full CBT + PHQ-9 + mood** |
| Condition-aware feed | No | No | No | **Yes — Netflix-style** |
| Progressive feature reveal | No | No | No | **Yes — 7-day activation** |
| Coaching marketplace | No | No | Proprietary | **Open marketplace** |
| UK NHS focus | No | No | No | **Yes (GP reports, BUPA)** |
| Indian food + AYUSH | Partial | Partial | No | **Yes** |
| B2B corporate | No | No | Yes | **Yes** |
| Family plan | No | No | No | **Yes (up to 3 profiles)** |
| Price | $9.99/mo | $19.99/mo | $70/mo | **£9.99-£24.99/mo** |

---

## PART 11 — DESIGN PRINCIPLES FOR v4

**Condition-first, not feature-first.** When a user says "I have diabetes", the app reorganises around that immediately. The glucose card is at top. GI badges appear on every meal. Care team sharing is in plain sight.

**Progressive trust.** The app reveals itself like a great onboarding conversation — never shows all features at once. Earns the right to show each feature by demonstrating value first.

**Safety above engagement.** Mental health and chronic disease features have clinical safety rails built in. Every screen that could relate to a medical issue has a professional signpost. No dark patterns.

**Revenue-aligned UX.** The upgrade prompt appears at the exact moment of maximum perceived value (after first AI insight, after connecting CGM, after first week of mood logging). Never before. Soft prompt, easy dismiss.

---

## PART 12 — v4 PHASE ROADMAP

### Phase 13 — Condition Intelligence (Start here)
```
[ ] P13.1  ConditionKey type + ConditionProfile interface in lib/types.ts
[ ] P13.2  Update onboarding Screen 1: condition selection (multi-select)
[ ] P13.3  Condition-specific Screen 4 in onboarding (CGM/PHQ-2/BP branches)
[ ] P13.4  Store conditions in UserProfile.conditionProfile on onboarding complete
[ ] P13.5  Dashboard rearranges by active conditions (glucose top if DIABETES, mood card if MENTAL_HEALTH)
[ ] P13.6  Mental Health: mood check-in page (/mood) + Firestore CRUD + moodUtils.ts
[ ] P13.7  Mental Health: CBT thought journal (/journal) + ThoughtRecord Firestore
[ ] P13.8  Mental Health: PHQ-9 screening (/mood/screening) + monthly trigger
[ ] P13.9  Heart Health: blood pressure log (/heart) + BloodPressureLog Firestore
[ ] P13.10 Crisis safety protocol (card + crisis links when PHQ-9 >= 15 or mood=1 x3)
[ ] P13.11 Unit tests: moodUtils.test.ts + heartUtils.test.ts
```

### Phase 14 — Netflix Health Feed
```
[ ] P14.1  Health Feed card system — HealthCard interface + card generators
[ ] P14.2  Feed ranking engine (feedEngine.ts) — score + sort
[ ] P14.3  Replace static dashboard with ranked feed (keep existing cards as feed cards)
[ ] P14.4  Feature discovery cards (day 3/7/14/21/30 reveal schedule)
[ ] P14.5  "Today's Mission" activation card (7-day sequence)
[ ] P14.6  Customisable home screen (pin/unpin, focus mode)
[ ] P14.7  A/B experiments: feed_layout + upsell_trigger + onboarding_length
```

### Phase 15 — CGM + Wearables
```
[ ] P15.1  Dexcom OAuth flow (/api/integrations/dexcom/auth + callback)
[ ] P15.2  Dexcom readings sync + merge with glucose/{date}
[ ] P15.3  FreeStyle Libre API integration
[ ] P15.4  Google Health Connect (steps, HR, sleep, weight)
[ ] P15.5  Apple HealthKit (iOS PWA, limited)
[ ] P15.6  Samsung Health Connect
[ ] P15.7  /settings/integrations page (toggle per provider, sync status)
[ ] P15.8  Real-time glucose trend arrow in dashboard header
```

### Phase 16 — Revenue v2
```
[ ] P16.1  Condition-tiered Stripe products (Fitness Pro, Diabetes Pro, Mental Wellness, Health OS)
[ ] P16.2  Stripe price IDs for each tier + billing page redesign
[ ] P16.3  Feature gating by tier AND condition (not just tier)
[ ] P16.4  Coaching marketplace (/coaching) — coach profiles, booking, Stripe Connect payouts
[ ] P16.5  B2B admin dashboard (/admin/corporate) — team stats, SSO, reports
[ ] P16.6  Family plan — link up to 3 UIDs to single billing subscription
[ ] P16.7  BUPA/AXA wellness receipt generator
```

### Phase 17 — AI Coach
```
[ ] P17.1  /api/coach/daily-checkin — FCM scheduled, Claude generated, cached
[ ] P17.2  /coach page — conversational chat UI with streaming responses
[ ] P17.3  Condition-specific weekly narrative in /api/insights/weekly
[ ] P17.4  Care team PDF report (Diabetes Pro) — /api/reports/care-team
[ ] P17.5  PCOS module (/pcos) — cycle tracking + hormone-friendly workout phasing
[ ] P17.6  Thyroid module (/thyroid) — TSH log, medication reminder, fatigue tracking
```

### Phase 18 — Analytics + Admin
```
[ ] P18.1  /admin/analytics — funnel, retention, experiment significance
[ ] P18.2  Revenue dashboard — MRR/ARR by tier/condition/market
[ ] P18.3  B2B aggregate wellness report (anonymous team stats)
[ ] P18.4  Feed engine performance metrics (card click-through rates)
```

### Phase 19 — Global Expansion
```
[ ] P19.1  i18n: Hindi, Arabic (RTL), Bengali — next-intl setup
[ ] P19.2  Ramadan mode: adjusted meal timing, fasting window, hydration plan
[ ] P19.3  India AYUSH supplement tracking (Ayurvedic herbs, dosage)
[ ] P19.4  NHS GP report generator (clinical PDF — UK)
[ ] P19.5  Multi-language AI coach (Hindi + Arabic system prompts)
```

### Phase 20 — Native iOS
```
[ ] P20.1  Native iOS app (SwiftUI + HealthKit deep integration)
[ ] P20.2  App Store submission + review
[ ] P20.3  Apple Watch complication (calories, streak)
[ ] P20.4  Play Store feature tab (Jetpack widgets, Health Connect badge submission)
```

---

## SESSION PROMPT TEMPLATE (for each v4 build session)

```
Continue building SBH. Here is my CONTEXT.md:
[paste CONTEXT.md]

Here is the PRD v4 spec for today:
[paste only the Part(s) from SBH_PRD_v4.md relevant to today's task]

Task: [one specific thing to build]
Stop when: tests pass.
Do not: modify screens outside this task, refactor unrelated code, start next phase.
```

---

*SBH PRD v4.0 — March 2026*
*Vision: From fitness tracker to universal health OS.*
*Every person managing a chronic condition in the UK, India, or UAE has SBH as their daily health companion.*
