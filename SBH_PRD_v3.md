# SBH — PRD v3.0 | Claude Code Build Edition
**Owner:** Pav | **Updated:** March 2026 | **Status:** Active Build  
**Stack:** Next.js 15 · Firestore · Firebase Auth · Cloud Run (GCP) · PWA + Android TWA  
**Monetisation:** Free until 10,000 users · Feature flags pre-wired for future paid tiers  
**Markets:** UK (primary) → India → UAE → Global  

---

## HOW TO USE THIS PRD IN CLAUDE CODE

Start every Claude Code session by pasting CONTEXT.md then saying:
```
"I am continuing SBH. Read the PRD v3. 
We are in [PHASE X.Y]. 
Build [FEATURE NAME] only. 
Stop after tests pass."
```

Each phase section below is **self-contained** — paste only the phase you're working on to save tokens. Core references (Design System, Data Models, Security) are loaded once per project.

---

## PART 0 — APP IDENTITY (single source of truth — change name here only)

### 0.1 App Config File
Create this file FIRST. Every part of the codebase that references the app
name, tagline, domain or brand imports from here. To rename the app in future,
change this one file only.

```typescript
// lib/app-config.ts  ← THE ONLY PLACE THE APP NAME LIVES

export const APP = {
  // ── Identity ──────────────────────────────────────────────────────────
  name:        "SBH",                          // short display name
  fullName:    "Science Based Health",         // full name
  tagline:     "Your science-backed coach",    // one-line value prop
  initials:    "SBH",                          // for avatar / favicon text

  // ── URLs ──────────────────────────────────────────────────────────────
  domain:      "sbhealth.app",                 // production domain
  appUrl:      process.env.NEXT_PUBLIC_APP_URL ?? "https://sbhealth.app",

  // ── Branding ──────────────────────────────────────────────────────────
  logoPath:    "/brand/logo.svg",
  iconPath:    "/brand/icon.png",
  ogImagePath: "/brand/og-image.png",          // 1200×630 for social sharing
  themeColour: "#060A12",                      // matches manifest.json

  // ── Social ────────────────────────────────────────────────────────────
  twitterHandle: "@scibasedhealth",
  supportEmail:  "hello@sbhealth.app",

  // ── Legal ─────────────────────────────────────────────────────────────
  companyName:   "Science Based Health Ltd",
  privacyUrl:    "/legal/privacy",
  termsUrl:      "/legal/terms",
} as const;

// Type export so consumers get autocomplete
export type AppConfig = typeof APP;
```

### 0.2 Usage Everywhere
```typescript
// In any component or page — NEVER hardcode the app name
import { APP } from "@/lib/app-config";

// Page title
export const metadata = { title: `${APP.name} — Log your meal` };

// In JSX
<h1>{APP.fullName}</h1>
<p>{APP.tagline}</p>

// manifest.json is generated dynamically from app-config
// app/manifest.ts  (Next.js route handler)
import { APP } from "@/lib/app-config";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             APP.fullName,
    short_name:       APP.name,
    description:      APP.tagline,
    start_url:        "/?source=pwa",
    theme_color:      APP.themeColour,
    background_color: APP.themeColour,
    display:          "standalone",
    // ... rest of manifest
  };
}

// Metadata root layout
// app/layout.tsx
export const metadata: Metadata = {
  title:       { default: APP.fullName, template: `%s · ${APP.name}` },
  description: APP.tagline,
  metadataBase: new URL(APP.appUrl),
  openGraph: {
    siteName: APP.fullName,
    images:   [APP.ogImagePath],
  },
  twitter: {
    card:    "summary_large_image",
    creator: APP.twitterHandle,
  },
};
```

### 0.3 Environment Variables (.env.example)
```bash
# .env.example — copy to .env.local and fill in
NEXT_PUBLIC_APP_NAME="SBH"
NEXT_PUBLIC_APP_URL="https://sbhealth.app"
NEXT_PUBLIC_FIREBASE_API_KEY=""
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
NEXT_PUBLIC_FIREBASE_APP_ID=""
NEXT_PUBLIC_SENTRY_DSN=""
ANTHROPIC_API_KEY=""          # server-side only, never NEXT_PUBLIC_
STRIPE_SECRET_KEY=""          # server-side only
STRIPE_WEBHOOK_SECRET=""      # server-side only
```

### 0.4 How to Rename the App in Future
```
1. Edit lib/app-config.ts — change name, fullName, domain, etc.
2. Update .env.local with new domain
3. Update Firebase project settings (Auth domain)
4. Update assetlinks.json for Android TWA
5. Run: grep -r "sbhealth\|SBH\|Science Based Health" . --include="*.ts" --include="*.tsx"
   → should return ZERO results outside lib/app-config.ts
```

---

## PART 1 — DESIGN SYSTEM (load once, reference everywhere)

### 1.1 Design Philosophy
- **Apple-style restraint:** Surface only what the user needs TODAY. No feature sprawl.
- **Hyper-personalisation:** Every screen adapts to the user's goal, history, and time of day.
- **Award-winning bar:** Target Google Play "Editor's Choice" and Apple "App of the Day" aesthetics.
- **Offline-first:** Every interaction works without internet. Sync when back online.
- **Zero learning curve:** New user must log first meal within 45 seconds of onboarding.

### 1.2 Design Tokens (use as CSS variables in all components)

```typescript
// lib/design-tokens.ts  — import in globals.css as CSS vars
export const tokens = {
  // Backgrounds
  bgBase:     "#060A12",   // deepest background
  bgSurface1: "#0C1320",   // cards, sheets
  bgSurface2: "#111B2E",   // elevated cards
  bgGlass:    "rgba(255,255,255,0.045)", // frosted glass cards

  // Borders
  borderFaint: "rgba(255,255,255,0.07)",
  borderMid:   "rgba(255,255,255,0.12)",

  // Accent palette — ONE accent per data category (never mix)
  accentLime:   "#C8FF47",  // calories / primary CTA
  accentCyan:   "#00D4FF",  // hydration / cardio
  accentOrange: "#FF6B35",  // protein
  accentPurple: "#B47FFF",  // carbs
  accentRed:    "#FF4757",  // fat / warnings
  accentGold:   "#FFD700",  // streaks / achievements

  // Typography
  textPrimary:  "#EDF2FF",
  textSecondary:"#5A6A8A",
  textMid:      "#8B9DC3",

  // Spacing scale (4px base)
  space: [0,4,8,12,16,20,24,32,40,48,64,80],

  // Radius
  radiusSm: 12,
  radiusMd: 20,
  radiusLg: 28,
  radiusFull: 9999,

  // Shadows
  shadowCard: "0 8px 32px rgba(0,0,0,0.4)",
  shadowGlow: (color: string) => `0 0 20px ${color}33`,
};
```

### 1.3 Typography
```css
/* globals.css */
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,300;400;500;600;700&family=Noto+Sans+Arabic:wght@400;600&family=Noto+Sans+Devanagari:wght@400;600&display=swap');

--font-display:  'Bebas Neue', sans-serif;   /* hero numbers, stats */
--font-body:     'DM Sans', sans-serif;      /* all UI text */
--font-arabic:   'Noto Sans Arabic', sans-serif;
--font-hindi:    'Noto Sans Devanagari', sans-serif;
--font-mono:     'JetBrains Mono', monospace; /* data values */

/* Scale */
--text-hero:  clamp(48px, 12vw, 80px);  /* Bebas Neue — big stats */
--text-xl:    24px;
--text-lg:    18px;
--text-md:    15px;
--text-sm:    13px;
--text-xs:    11px;
--text-micro: 9px;
```

### 1.4 Core Components (build these first, reuse everywhere)

Each component lives in `components/ui/`. Build with shadcn/ui as base, override styles.

**`<RingProgress>`** — animated SVG ring for calories/macros. Props: `value, max, color, size, strokeWidth`. Rotated 10° for dynamism. Glow filter on fill arc. Centre slot for content.

**`<GlassCard>`** — backdrop-blur container. Props: `elevated?, onClick?, noPad?`. Uses `bgGlass` background + `borderFaint`. Scale 1.01 on hover.

**`<MacroBar>`** — thin 4px pill bar. Props: `label, value, max, color`. Shows label left, value right, remainder below in `textSecondary`.

**`<Sparkline>`** — inline SVG trend line. Props: `data[], color, height`. Area fill with gradient fade. Used in stat cards.

**`<AvatarBadge>`** — user avatar with streak ring. Ring animates on milestone.

**`<FloatingAction>`** — bottom-centre FAB for primary log action. Lime fill, pulse animation. Expands to reveal Log Meal / Log Workout / Log Weight.

**`<Toast>`** — top-swipe-down notification. Shows AI insight, streak alert, hydration reminder.

**`<BottomSheet>`** — modal from bottom. Used for all data entry. Drag handle, snap points.

**`<ChipTag>`** — small label chip. Variants: success (lime), warning (orange), danger (red), info (cyan).

**`<AnimatedNumber>`** — spring-animated counter for stats. Uses requestAnimationFrame.

### 1.5 Motion Rules
```typescript
// lib/motion.ts
// Use Framer Motion for all animations
export const spring = { type:"spring", stiffness:400, damping:28 };
export const fadeUp = { initial:{opacity:0,y:16}, animate:{opacity:1,y:0}, transition:{duration:0.35} };
export const stagger = (i:number) => ({ transition:{ delay: i * 0.06 } });
// Page transitions: shared-element on numbers (calories remaining)
// Micro: button press scale(0.96), release scale(1.0)
// Data entry: slide-up bottom sheet
// Achievement: confetti burst (canvas-confetti)
// Reduced motion: honour prefers-reduced-motion, replace all with opacity only
```

### 1.6 Navigation Structure
```
Bottom Tab Bar (5 tabs):
  [Today]  [Nutrition]  [⊕ Log]  [Workout]  [Profile]
         FAB centre — expands on press

Stack routes:
  /today                → Hyper-personal daily dashboard
  /nutrition            → Calorie & macro tracker
  /nutrition/food-search → Search + scan
  /nutrition/meal/:id   → Meal detail
  /workout              → Today's programme
  /workout/log          → Active workout logger
  /workout/history      → Past workouts
  /profile              → Settings, streaks, goals
  /onboarding/*         → First-launch wizard (5 screens)
  /insights             → Weekly AI report (Phase 3)
```

---

## PART 2 — HYPER-PERSONALISATION ENGINE

### 2.1 What It Is
The app re-computes a `DailyContext` object every morning at midnight (and on each app open) that drives EVERY piece of UI. This is what makes SBH feel alive, not static.

### 2.2 DailyContext (computed server-side, cached in Firestore)
```typescript
// lib/types/daily-context.ts
interface DailyContext {
  uid: string;
  date: string;                          // YYYY-MM-DD

  // Energy budget
  calorieTarget:    number;
  calorieLogged:    number;
  calorieRemaining: number;
  calorieStatus:    "on_track" | "ahead" | "behind" | "over";

  // Macro status
  proteinPct:  number;   // 0-100
  carbPct:     number;
  fatPct:      number;
  hydrationPct:number;

  // Workout
  workoutScheduledToday: boolean;
  workoutLogged:         boolean;
  workoutType:           string;         // "push" | "pull" | "legs" | "cardio" | "rest"
  isLondonDay:           boolean;        // commute = bodyweight only

  // Trend signals
  weightTrend:   "losing" | "gaining" | "stable" | "nodata";
  weeklyDeficit: number;                 // kcal
  streakDays:    number;
  longestStreak: number;

  // AI surface
  morningMessage:  string;              // Claude-generated, max 12 words
  priorityAction:  "log_meal" | "log_workout" | "drink_water" | "weigh_in" | "rest";
  insightBadge:    string | null;       // e.g. "Protein on fire 🔥"

  // Time of day
  timeSlot: "morning" | "midday" | "afternoon" | "evening" | "night";
}
```

### 2.3 Dashboard Surfaces Change Based on Context
```typescript
// app/today/page.tsx — render logic (pseudocode)
if (timeSlot === "morning")   → show "Good morning" hero + calorie ring empty → motivational
if (timeSlot === "midday")    → show calories remaining prominently → decision support  
if (timeSlot === "evening")   → show today's progress summary → reflection
if (calorieStatus === "over") → hero card turns amber, shows deficit recovery tip
if (workoutScheduledToday && !workoutLogged && timeSlot === "afternoon") → nudge card appears
if (streakDays >= 7)          → streak badge pulses gold
if (weightTrend === "losing") → show 7-day sparkline prominently
if (hydrationPct < 40)        → cyan hydration card rises to top of feed
```

### 2.4 Personalisation Signals (stored in UserProfile, updated continuously)
```typescript
interface PersonalisationProfile {
  // Goals
  primaryGoal:    "fat_loss" | "muscle_gain" | "recomp" | "endurance" | "maintain";
  activityLevel:  "sedentary" | "light" | "moderate" | "very_active";
  trainingDays:   number[];                    // [1,3,5] = Mon/Wed/Fri
  wakeTime:       string;                      // "07:00"
  bedTime:        string;                      // "22:30"
  commutedays:    number[];                    // days user is away from home gym

  // Dietary preferences
  dietType:       "standard" | "vegetarian" | "vegan" | "keto" | "halal" | "kosher";
  allergies:      string[];
  preferredCuisines: string[];                 // ["indian","mediterranean"]

  // Locale
  locale:         string;                      // "en-GB" | "hi-IN" | "ar-AE"
  unitSystem:     "metric" | "imperial";
  currency:       string;                      // "GBP" | "INR" | "AED"

  // Behaviour
  preferredLogMethod: "search" | "photo" | "barcode" | "voice";
  avgLogTime:         number;                  // seconds — used to optimise UX
  quickAddFoods:      string[];                // last 10 frequently logged foods
}
```

---

## PART 3 — FEATURE FLAG ARCHITECTURE

### 3.1 Tier Model (future-proof, all FREE until 10k users)
```typescript
// lib/feature-flags.ts
export type UserTier = "free" | "pro" | "premium";

// All flags default TRUE (free) until monetisation launches
export const FLAGS = {
  // Core (always free)
  "core.calorie_tracking":    { default: true,  tiers: ["free","pro","premium"] },
  "core.workout_logging":     { default: true,  tiers: ["free","pro","premium"] },
  "core.weight_tracker":      { default: true,  tiers: ["free","pro","premium"] },
  "core.barcode_scan":        { default: true,  tiers: ["free","pro","premium"] },

  // Pro features (gated post-launch)
  "pro.photo_recognition":    { default: true,  tiers: ["pro","premium"] },
  "pro.advanced_analytics":   { default: true,  tiers: ["pro","premium"] },
  "pro.programme_builder":    { default: true,  tiers: ["pro","premium"] },
  "pro.export_data":          { default: true,  tiers: ["pro","premium"] },
  "pro.no_ads":               { default: true,  tiers: ["pro","premium"] },

  // Premium features (gated post-launch)
  "premium.ai_coach":         { default: true,  tiers: ["premium"] },
  "premium.meal_plans":       { default: true,  tiers: ["premium"] },
  "premium.body_analysis":    { default: true,  tiers: ["premium"] },
  "premium.care_team_share":  { default: true,  tiers: ["premium"] },

  // Ops kill-switches
  "ops.food_photo_api":       { default: true,  tiers: ["free","pro","premium"] },
  "ops.ai_insights":          { default: true,  tiers: ["free","pro","premium"] },
} as const;
```

### 3.2 Implementation Pattern
```typescript
// Use Firebase Remote Config as backend, OpenFeature as abstraction
// lib/flags-client.ts

import { getRemoteConfig, getValue } from "firebase/remote-config";

export async function getFlag(flagKey: string, uid: string): Promise<boolean> {
  const rc = getRemoteConfig();
  rc.settings.minimumFetchIntervalMillis = 3600000; // 1hr cache
  await fetchAndActivate(rc);
  return getValue(rc, flagKey.replace(".","_")).asBoolean();
}

// React hook — use in components
export function useFlag(flagKey: string): boolean {
  const [enabled, setEnabled] = useState(FLAGS[flagKey]?.default ?? false);
  useEffect(() => {
    getFlag(flagKey, currentUser.uid).then(setEnabled);
  }, [flagKey]);
  return enabled;
}

// Usage in component:
// const hasAICoach = useFlag("premium.ai_coach");
// if (!hasAICoach) return <LockedFeatureCard feature="AI Coach" />;
```

### 3.3 LockedFeatureCard Component
```typescript
// Show blurred preview + upgrade prompt — NOT a hidden feature
// components/ui/LockedFeatureCard.tsx
// Props: feature (string), description (string), tier ("pro"|"premium")
// Shows: blurred screenshot, tier badge, "Coming soon — unlock when we launch Pro"
// During free phase: never show this. All features enabled.
```

---

## PART 4 — DATA MODELS (Firestore schema)

### 4.1 Collections
```
users/{uid}/
  profile           → UserProfile (extended from v2 with PersonalisationProfile)
  dailyContext/{date} → DailyContext (computed daily)
  metrics/{date}    → DailyMetric
  nutrition/{date}  → DailyNutrition
  workouts/{date}   → DailyWorkout
  streaks/current   → StreakRecord
  achievements/[]   → Achievement[]

food_database/{id}  → FoodItem (global, shared across users)
food_search_index/  → Typesense sync (managed by Cloud Function)
```

### 4.2 Extended UserProfile
```typescript
interface UserProfile {
  // v2 fields (keep all)
  uid, email, displayName, age, sex, heightCm, weightKg,
  targetWeightKg, activityLevel, goal, bmr, tdee,
  calorieTarget, proteinTargetG, carbTargetG, fatTargetG,
  createdAt, updatedAt,

  // v3 additions
  personalisation: PersonalisationProfile,
  tier: UserTier,                          // "free" until monetisation
  consentVersion: string,                  // GDPR consent record
  dataRegion: "eu" | "in" | "ae" | "us",  // for data residency
  onboardingComplete: boolean,
  onboardingStep: number,
  firstLogDate: Timestamp | null,          // for aha-moment tracking
  totalLoggingDays: number,
  referralSource: string | null,
}
```

### 4.3 FoodItem (global database)
```typescript
interface FoodItem {
  id: string;
  name: string;
  nameAliases: string[];            // ["chapati","roti","flatbread"]
  nameTranslations: Record<string,string>; // {hi:"रोटी", ar:"خبز"}
  brand: string | null;
  barcode: string | null;

  per100g: {
    calories: number;
    proteinG: number; carbsG: number; fatG: number;
    fibreG: number; sugarG: number; saltG: number;
    saturatesG: number; sodiumMg: number;
  };

  servingSizes: Array<{
    label: string;      // "1 roti" | "1 cup" | "1 tbsp"
    grams: number;
  }>;

  gi: number | null;             // Glycaemic Index
  gl: number | null;             // Glycaemic Load (per typical serving)

  region: string[];              // ["IN","UK","global"]
  cuisine: string[];             // ["indian","south_asian"]
  dietTags: string[];            // ["vegetarian","vegan","halal","gluten-free"]
  allergens: string[];

  source: "usda" | "cofid" | "ifct" | "open_food_facts" | "fatsecret" | "user";
  verified: boolean;
  confidenceScore: number;       // 0-1
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4.4 StreakRecord
```typescript
interface StreakRecord {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string;
  streakType: "logging" | "workout" | "calorie_goal";
  milestones: number[];          // [7, 14, 30, 50, 100] days hit
}
```

---

## PART 5 — TODAY SCREEN (Priority 1 — this is the MONEY screen)

### 5.1 Design Intent
The Today screen is the app. It answers one question per time slot:
- **Morning:** "Here's your plan for today"
- **Midday:** "Here's where you stand"
- **Evening:** "Here's what you achieved"

No tabs within Today. Pure vertical scroll. Cards reorder dynamically based on `DailyContext.priorityAction`.

### 5.2 Screen Anatomy (top to bottom)

**A. Status Bar Zone** (safe area)
```
[Avatar + streak ring]  "Good morning, Pav"  [Notification bell]
                    "Tuesday · Mar 5"
```

**B. Hero Card — Calorie Ring**
```
Large RingProgress (180px) centred.
  Inner: [AnimatedNumber calorieRemaining] "kcal left" 
  Subtext: of [calorieTarget] target
Ring colour changes:
  >50% remaining → lime
  25-50%         → orange  
  <25%           → red (pulses)
  over target    → red solid
Below ring: morningMessage from DailyContext (12 words, changes per timeSlot)
```

**C. Macro Row** (horizontal, 3 cards)
```
[Protein card]  [Carbs card]  [Fat card]
Each: icon + grams logged / target + mini ring (40px)
Colours: orange / purple / red
Tap → opens nutrition screen filtered to that macro
```

**D. Hydration Strip** (rises to top if <40%)
```
Thin card. Cyan. [glass icon] 4/8 glasses · [+] button
Progress bar full width.
```

**E. Today's Workout Card** (only if workoutScheduledToday)
```
[Workout type badge]  "Push Day"
Exercise preview: Bench Press · OHP · Dips
[Start Workout] button  |  [Bodyweight] if isLondonDay
If already logged: shows checkmark + volume summary
```

**F. Quick Log Strip** (always visible)
```
Last 3 logged foods as chips → one tap re-log
+ [Search] [Scan] [Photo] buttons
```

**G. Weight Trend Card** (if data > 3 days)
```
Sparkline (7-day) with target line
[AnimatedNumber currentWeight] kg → target: [targetWeight]
Trend arrow + "↓ 0.8kg this week"
```

**H. Insights Badge** (if insightBadge set)
```
Small lime chip: "Protein on fire 🔥" or "3 days under target ⚡"
```

**I. Bottom padding** (for tab bar)

### 5.3 File Structure
```
app/today/
  page.tsx              → server component, fetches DailyContext
  components/
    HeroCalorieRing.tsx
    MacroRow.tsx
    HydrationStrip.tsx
    WorkoutCard.tsx
    QuickLogStrip.tsx
    WeightTrendCard.tsx
    InsightBadge.tsx
    MorningMessage.tsx
```

### 5.4 Server Component Pattern
```typescript
// app/today/page.tsx
import { getDailyContext } from "@/lib/daily-context";
import { getServerSession } from "@/lib/auth";

export default async function TodayPage() {
  const session = await getServerSession();
  const ctx = await getDailyContext(session.uid, new Date());
  
  return (
    <main className="px-4 pb-24 space-y-3">
      <MorningGreeting ctx={ctx} />
      <HeroCalorieRing ctx={ctx} />
      <MacroRow ctx={ctx} />
      {ctx.hydrationPct < 40 && <HydrationStrip ctx={ctx} />}
      {ctx.workoutScheduledToday && <WorkoutCard ctx={ctx} />}
      <QuickLogStrip ctx={ctx} />
      <WeightTrendCard ctx={ctx} />
    </main>
  );
}
```

---

## PART 6 — NUTRITION SCREEN

### 6.1 Design Intent
Three zones: daily total at top, meal log in middle, quick-add at bottom. No tabs. Scrollable.

### 6.2 Layout
```
A. Daily Summary Header
   Calories: [RingProgress 100px] + [MacroBar x3 horizontal]
   Net = eaten - burned. Show both.

B. Meal Timeline (vertical list, grouped)
   Breakfast · Lunch · Dinner · Snacks · Pre/Post Workout
   Each meal group:
     [meal type icon + label + total kcal]
     Food items → name + kcal + macros
     [+ Add to Breakfast] ghost button
   Empty state: "Nothing logged yet — add your first meal"

C. Water Log (collapsible)
   8-glass tracker with tap-to-fill interaction

D. Bottom Sheet (triggered by any + button)
   Search input (autofocus)
   [Barcode] [Camera] [Voice] icon row
   Recent foods (last 10)
   Frequent foods (top 5 by frequency)
   Search results (Typesense, sub-200ms)
```

### 6.3 Food Search Implementation
```typescript
// lib/food-search.ts
// Priority order: Typesense local index → Open Food Facts API → USDA fallback
// For Indian foods: IFCT database first, then Open Food Facts

export async function searchFood(query: string, locale: string): Promise<FoodItem[]> {
  // 1. Typesense (hosted index, <50ms)
  const local = await typesenseSearch(query, { region: getRegionFromLocale(locale) });
  if (local.length >= 5) return local;
  
  // 2. Open Food Facts (fallback, ~300ms)
  const off = await openFoodFactsSearch(query);
  
  // 3. Merge, dedupe, rank by confidence
  return mergeAndRank([...local, ...off]);
}
```

### 6.4 Barcode Scanner (PWA)
```typescript
// components/nutrition/BarcodeScanner.tsx
// Uses ZXing-JS (zxing-js/library) via getUserMedia
// On scan: lookup Open Food Facts by barcode
// If not found: fallback to FatSecret Premier API
// Always show user confirmation before logging
```

### 6.5 Photo Recognition (Phase 3 hook)
```typescript
// Feature-flagged: ops.food_photo_api
// MVP: Claude Vision API (claude-3-5-sonnet) with prompt:
//   "Identify all food items visible. For each: name, estimated portion size in grams,
//    and macronutrients per 100g. Return JSON array only."
// User confirms/edits before logging
// Accuracy disclaimer shown on first use
```

---

## PART 7 — WORKOUT SCREEN

### 7.1 Design Intent
Workout logging must feel fast and tactile. Target: log a set in 2 taps. No friction.

### 7.2 Active Workout View
```
A. Header
   [← Back]  "Push Day · Week 3"  [⏱ 00:42:17]

B. Exercise Cards (vertical list)
   Each card:
     Exercise name (large, Bebas Neue)
     [Video link icon] → YouTube
     Sets table:
       SET | LAST | WEIGHT | REPS | ✓
       1   | 60kg×8 | [60 ▾] | [8 ▾] | [ ]
     Progressive overload badge: "↑ Try 62.5kg"
     [+ Add set] ghost button

C. Rest Timer (bottom sheet, auto-triggers after set completion)
   Large countdown circle
   Skip / +30s / -15s controls
   Vibrates at 0

D. Finish Workout FAB
   Shows after first set logged
   → opens completion summary
```

### 7.3 Progressive Overload Engine
```typescript
// lib/progressive-overload.ts
// Logic: if user completed all target reps with last weight → suggest +2.5kg (upper body)
//        if failed last set by >2 reps → maintain weight
//        deload week: 90% of peak volume every 4th week

export function getSuggestion(history: SetLog[], exercise: string): ProgressionSuggestion {
  const lastSession = history.filter(s => s.exerciseName === exercise).slice(-1)[0];
  if (!lastSession) return { weight: null, reps: null, note: "First time — start light" };
  // ... calculation logic
}
```

### 7.4 London Day Mode
```typescript
// If isLondonDay === true: replace programme with bodyweight circuit
// Store in UserProfile.commutedays
// Bodyweight programme: Push-ups, Dips, Pull-ups, Pistol squats, Pike press
// Hotels/travel: same bodyweight circuit, no equipment
```

---

## PART 8 — ONBOARDING (5 screens, <60 seconds)

### 8.1 Screen Flow
```
Screen 1: "What's your main goal?"
  4 large cards: Lose Fat · Build Muscle · Recomp · Endurance
  Select one → next. No other UI.

Screen 2: "Tell us about yourself"
  Age (scroll picker) · Sex (2 chips) · Height (slider) · Weight (number input)
  Smart defaults from device locale (metric/imperial)

Screen 3: "How active are you?"
  4 cards with illustrations: Desk Job · Light Activity · Regular Exercise · Very Active

Screen 4: "When do you train?"
  Day selector (Mon-Sun toggle chips)
  Training time (morning/afternoon/evening chips)

Screen 5: "You're ready"
  Animated stats reveal:
    "Your daily target: [X] kcal"
    "Protein: [X]g · Carbs: [X]g · Fat: [X]g"
  [Let's go →] → Dashboard
```

### 8.2 Implementation Notes
```typescript
// app/onboarding/ — client component (no SSR needed)
// Store partial progress in Firestore as user completes screens
// Skip button ONLY on screens 3-5 (never on 1-2)
// Back button always works
// No account creation until screen 5 — guest mode allowed
// After screen 5: createUserWithEmailAndPassword or Google sign-in
```

---

## PART 9 — ANDROID PWA + WIDGET

### 9.1 PWA Requirements (Next.js)
```typescript
// Install Serwist: npm install serwist @serwist/next
// next.config.ts — wrap with withSerwist()
// app/sw.ts — service worker
// public/manifest.json — see below
```

```json
// public/manifest.json
{
  "name": "SBH — Your AI Fitness Coach",
  "short_name": "SBH",
  "start_url": "/?source=pwa",
  "display": "standalone",
  "background_color": "#060A12",
  "theme_color": "#060A12",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "Log Meal",    "url": "/nutrition?action=log", "icons": [{"src":"/icons/shortcut-meal.png","sizes":"96x96"}] },
    { "name": "Log Workout", "url": "/workout?action=start", "icons": [{"src":"/icons/shortcut-workout.png","sizes":"96x96"}] }
  ],
  "screenshots": [
    { "src": "/screenshots/today.png",     "sizes": "390x844", "type": "image/png", "form_factor": "narrow" },
    { "src": "/screenshots/nutrition.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow" }
  ],
  "share_target": {
    "action": "/nutrition/add-from-share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": { "files": [{ "name": "food_photo", "accept": ["image/*"] }] }
  }
}
```

### 9.2 Offline Strategy (Serwist)
```typescript
// app/sw.ts
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

const sw = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // App shell: cache-first
    { matcher: /\/_next\/static\/.*/i, handler: "CacheFirst", options: { cacheName: "static-assets", expiration: { maxAgeSeconds: 30 * 24 * 3600 } } },
    // API: network-first, fallback to cache
    { matcher: /\/api\/.*/i, handler: "NetworkFirst", options: { cacheName: "api-cache", networkTimeoutSeconds: 3 } },
    // Food images: stale-while-revalidate
    { matcher: /\/food-images\/.*/i, handler: "StaleWhileRevalidate", options: { cacheName: "food-images" } },
  ],
});

// Background Sync for offline meal/workout logging
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-logs") event.waitUntil(replayOfflineLogs());
});
```

### 9.3 Android TWA + Widget (Hybrid Approach)
```
Architecture:
  sbh-android/                    ← Kotlin Android project
    app/
      twa/                          ← Bubblewrap-generated TWA shell
      widget/
        SBHWidgetReceiver.kt      ← extends GlanceAppWidgetReceiver
        SBHWidget.kt              ← Jetpack Glance 1.1.0
        WidgetDataSync.kt           ← reads Firestore, updates widget

Steps to generate TWA:
  1. npx @bubblewrap/cli init --manifest https://sbh.app/manifest.json
  2. npx @bubblewrap/cli build
  3. Add native widget module to the generated project (see below)
  4. Configure assetlinks.json at /.well-known/assetlinks.json (use Play signing cert)
```

### 9.4 Widget — Three Sizes (Jetpack Glance)
```kotlin
// widget/SBHWidget.kt
// Small  (2×1): Calorie ring (60dp) + streak count
// Medium (2×2): Calorie ring + 3 macro bars + hydration + Log Meal button
// Large  (4×2): Full macro breakdown + today's meals + workout status + 2 action buttons

// Data flow:
//   1. WorkManager task runs every 30min → reads Firestore → updates widget state
//   2. FCM data message from PWA → triggers immediate widget refresh
//   3. Widget deep-links: "sbh://nutrition/log" → opens TWA at /nutrition?action=log

// Widget colours: use Material You dynamic colours (GlanceTheme.colors)
// Fallback: hardcoded SBH tokens if dynamic unavailable
// Google Play Widget Quality Tier 1: dynamic data, personalised, generated preview
```

### 9.5 Data Bridge
```kotlin
// WidgetDataSync.kt
// Uses Firebase Firestore Android SDK
// Reads: users/{uid}/dailyContext/{today}
// Caches to DataStore (shared prefs equivalent)
// FCM payload that triggers refresh:
//   { "data": { "type": "widget_refresh", "date": "2026-03-05" } }
// Next.js sends FCM via Admin SDK after each meal/workout log
```

---

## PART 10 — OBSERVABILITY

### 10.1 Error Tracking (Sentry)
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

```typescript
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,         // 10% in production
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0, // 100% on error
  integrations: [Sentry.replayIntegration()],
  beforeSend(event) {
    // Strip health data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs.values = event.breadcrumbs.values?.filter(
        b => !b.message?.includes("weight") && !b.message?.includes("calorie")
      );
    }
    return event;
  },
});
```

### 10.2 Distributed Tracing (OpenTelemetry → Cloud Trace)
```typescript
// instrumentation.ts (Next.js built-in hook)
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { TraceExporter } = await import("@google-cloud/opentelemetry-cloud-trace-exporter");
    const sdk = new NodeSDK({ traceExporter: new TraceExporter() });
    sdk.start();
  }
}
```

### 10.3 Structured Logging (Pino → Cloud Logging)
```typescript
// lib/logger.ts
import pino from "pino";
export const logger = pino({
  messageKey: "message",
  formatters: {
    level: (label) => ({ severity: label.toUpperCase() }),
  },
  // Never log: weight, calories, health values
  redact: ["user.weightKg", "user.calorieTarget", "*.healthData"],
});
```

### 10.4 Key SLOs
| SLI | SLO |
|---|---|
| API p95 response | < 500ms |
| Error rate (5xx) | < 0.1% |
| Availability | 99.9% |
| LCP | < 2.5s (75th pct) |
| INP | < 200ms |
| Firestore read latency | < 100ms |

### 10.5 Firebase Analytics Events (custom)
```typescript
// lib/analytics.ts — track these in all key flows
logEvent(analytics, "meal_logged",    { method: "search"|"scan"|"photo", calories });
logEvent(analytics, "workout_logged", { type: "strength"|"cardio", duration_min });
logEvent(analytics, "weight_logged",  { trend: "up"|"down"|"same" });
logEvent(analytics, "streak_milestone", { days: 7|14|30|50|100 });
logEvent(analytics, "onboarding_complete", { seconds_taken, goal_selected });
logEvent(analytics, "aha_moment",     { trigger: "first_log"|"first_workout" });
// No PII, no raw health values in events
```

### 10.6 GCP Dashboards (create in Cloud Monitoring)
```
Dashboard 1: API Health      → p50/p95/p99, error rate, cold starts
Dashboard 2: User Engagement → DAU, WAU, MAU, retention D1/D7/D30
Dashboard 3: Firestore       → reads/writes/deletes, latency, costs
Dashboard 4: Core Web Vitals → LCP, INP, CLS via RUM
Dashboard 5: PWA Health      → SW registration, offline usage, install rate
Dashboard 6: SLO Burn Rate   → alert if burning budget >2× baseline
```

---

## PART 11 — TESTING PIPELINE

### 11.1 Stack
```
Unit/Component: Vitest + React Testing Library + @testing-library/user-event
Integration:    Vitest + Firebase Emulator
E2E:            Playwright + Firebase Emulator + playwright-firebase
Coverage:       @vitest/coverage-v8 → Codecov
Reports:        Allure (allure-playwright reporter)
```

### 11.2 Directory Structure
```
__tests__/
  unit/
    lib/calculations.test.ts       → BMR/TDEE/macro formulas
    lib/daily-context.test.ts      → DailyContext computation
    lib/progressive-overload.test.ts
    lib/food-search.test.ts
  integration/
    api/nutrition.test.ts          → API routes with Firebase Emulator
    api/workouts.test.ts
    firestore/security-rules.test.ts  → Firestore rules validation
  components/
    HeroCalorieRing.test.tsx
    MacroRow.test.tsx
    BarcodeScanner.test.tsx
e2e/
  onboarding.spec.ts
  log-meal.spec.ts
  log-workout.spec.ts
  streak.spec.ts
  offline.spec.ts                  → PWA offline behaviour
```

### 11.3 GitHub Actions Pipeline
```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:    { branches: [main, develop] }
  pull_request: { branches: [main] }

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  unit-tests:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v4
        with: { files: ./coverage/lcov.info }
      - uses: actions/upload-artifact@v4
        with: { name: coverage-report, path: coverage/ }

  e2e-tests:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm install -g firebase-tools
      - run: npx playwright install --with-deps
      - run: |
          firebase emulators:exec \
            'npx playwright test --reporter=line,allure-playwright' \
            --project sbh-dev
        env: { FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }} }
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: playwright-report, path: allure-results/ }

  lighthouse:
    needs: [unit-tests, e2e-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:3000/today
            http://localhost:3000/nutrition
          budgetPath: .lighthouse-budget.json
          uploadArtifacts: true

  deploy:
    needs: lighthouse
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with: { credentials_json: '${{ secrets.GCP_SA_KEY }}' }
      - uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: sbh-app
          region: europe-west2
          source: .
          tag: ${{ github.sha }}
      - name: Generate Release Notes
        run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 11.4 Coverage Thresholds (vitest.config.ts)
```typescript
coverage: {
  provider: "v8",
  thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
  exclude: ["**/*.stories.tsx", "**/e2e/**", "next.config.ts"],
}
```

### 11.5 Test Patterns
```typescript
// Unit — pure functions (calculations.test.ts)
describe("BMR calculation", () => {
  it("returns correct BMR for 43yo male 75kg 175cm", () => {
    expect(calculateBMR({ sex:"male", age:43, weightKg:75, heightCm:175 })).toBe(1726);
  });
});

// Component (HeroCalorieRing.test.tsx)
it("shows red ring when over calorie target", () => {
  render(<HeroCalorieRing ctx={{ calorieRemaining: -200, calorieStatus: "over" }} />);
  expect(screen.getByTestId("ring-arc")).toHaveStyle({ stroke: tokens.accentRed });
});

// E2E (log-meal.spec.ts)
test("user can log a meal via search in under 10 taps", async ({ page }) => {
  await page.goto("/nutrition");
  await page.click("[data-testid='add-meal-btn']");
  await page.fill("[data-testid='food-search-input']", "banana");
  await page.click("[data-testid='food-result-0']");
  await page.click("[data-testid='confirm-log']");
  await expect(page.locator("[data-testid='meal-logged-toast']")).toBeVisible();
});
```

---

## PART 12 — MULTI-MARKET COMPLIANCE

### 12.1 Consent & Legal (implement in Phase 1)
```typescript
// Required on first launch, before any data collection
// lib/consent.ts

const CONSENT_VERSION = "1.0";

interface ConsentRecord {
  uid: string;
  version: string;
  locale: string;
  dataRegion: string;
  healthDataConsent: boolean;  // explicit, cannot be pre-ticked
  analyticsConsent:  boolean;  // optional
  marketingConsent:  boolean;  // optional
  timestamp: Timestamp;
  ipHash: string;              // hashed, not raw
}
// Store in Firestore: users/{uid}/consent/{version}
// UK GDPR: health data = special category → explicit consent mandatory
// India DPDP: all personal data → consent required, Hindi notice option
// UAE PDPL: follow GDPR-equivalent precautionary standard
```

### 12.2 Required Legal Screens
```
1. Privacy Policy    → /legal/privacy    (per-locale versions: en-GB, en-IN, en-AE)
2. Terms of Use      → /legal/terms
3. Health Disclaimer → shown during onboarding:
   "SBH provides general fitness and nutrition information for personal tracking.
    It is not medical advice. Consult a healthcare professional before making
    significant changes to your diet or exercise programme."
4. Data Rights       → /legal/data-rights  (erasure, portability, objection)
```

### 12.3 Data Residency
```typescript
// Assign on registration based on country selection
const DATA_REGIONS = {
  "GB": "europe-west2",    // London
  "IE": "europe-west2",
  "IN": "asia-south1",     // Mumbai
  "AE": "me-west1",        // UAE (or europe-west2 if unavailable)
  "SA": "me-west1",
  default: "us-central1",
};
// Configure multi-region Firestore or route via API layer
```

### 12.4 Cookie Consent Banner
```typescript
// Use Cookiebot (GDPR-ready, £8/month) or build minimal own
// Only analytics + performance cookies used by SBH
// No advertising cookies (free tier has no ads)
// UK: opt-in banner required
// India: notice required
// USA (California): opt-out link required
```

---

## PART 13 — FOOD DATABASE STRATEGY

### 13.1 Phase 1 Sources (import into Firestore)
```
UK foods:    McCance & Widdowson CoFID — download from GOV.UK (free Excel)
US foods:    USDA FoodData Central API (free, 300k+ items)
Indian foods: IFCT 2017 npm package (@nodef/ifct2017, 542 items)
             + INDB GitHub dataset (1,095 items + 1,014 recipes)
Global:      Open Food Facts API (barcode lookup, 2.5M+ products)
```

### 13.2 Phase 2 — Enhanced Coverage
```
Branded/packaged: FatSecret Premier API (1M+ verified, 56 countries)
Barcode:          Open Food Facts (primary) → FatSecret (fallback)
Middle East:      Manual curation of 500 common dishes (Phase 2 backlog)
Search engine:    Typesense (self-hosted, ~$20/month on Cloud Run)
```

### 13.3 Food Recognition (Phase 3)
```typescript
// Claude claude-sonnet-4-20250514 via Anthropic API
// Route: POST /api/nutrition/recognise-photo
// Accepts: multipart/form-data with image
// Prompt strategy: structured JSON extraction
// User always confirms before logging
// Accuracy disclaimer on first use
// Feature-flagged: ops.food_photo_api
```

### 13.4 Import Script
```typescript
// scripts/import-food-db.ts
// Run once: npx ts-node scripts/import-food-db.ts
// Imports USDA, CoFID, IFCT into Firestore food_database collection
// Assigns region tags, diet tags, confidence scores
// Creates Typesense index with aliases and translations
// Estimated: ~15k items for v1 global launch
```

---

## PART 14 — I18N & ACCESSIBILITY

### 14.1 next-intl Setup
```bash
npm install next-intl
```

```
messages/
  en-GB.json    → English (UK) — default
  en-IN.json    → English (India)
  hi-IN.json    → Hindi
  ar-AE.json    → Arabic (UAE)
```

### 14.2 RTL Support
```css
/* globals.css — use logical properties throughout */
/* NEVER: margin-left, margin-right, padding-left, text-align: left */
/* ALWAYS: margin-inline-start, padding-inline-start, text-align: start */

[dir="rtl"] { font-family: var(--font-arabic); line-height: 1.75; }
/* Tailwind: use rtl: modifier for directional overrides */
```

### 14.3 Accessibility Standards (WCAG 2.2 AA)
```
Colour contrast: 4.5:1 text, 3:1 non-text (verify all token colours)
Touch targets:   48×48px minimum (larger than WCAG minimum — sweaty hands)
Focus rings:     visible on all interactive elements (lime outline)
Reduced motion:  prefers-reduced-motion → opacity-only transitions
Screen reader:   aria-labels on all icon-only buttons
                 aria-live on calorie/macro values that update
Font size:       min 15px body, 13px secondary — no smaller
```

---

## PART 15 — PHASE ROADMAP

### PHASE 1 — Foundation (Weeks 1–2)
```
P1.1  Design system tokens + core components (Ring, Card, MacroBar, etc.)
P1.2  Onboarding wizard (5 screens)
P1.3  Firebase Auth + user profile creation
P1.4  DailyContext engine
P1.5  Today screen (hero ring + macro row + hydration + quick log)
P1.6  Basic nutrition tracker (manual entry, no barcode yet)
P1.7  Weight logger + sparkline
P1.8  CI/CD pipeline (lint + unit tests + deploy)
P1.9  PWA manifest + Serwist service worker
P1.10 Consent flow + privacy policy
```

### PHASE 2 — Core Product (Weeks 3–4)
```
P2.1  Barcode scanner (ZXing + Open Food Facts)
P2.2  Food search (Typesense + USDA + IFCT import)
P2.3  Full nutrition screen (meal timeline, meal types)
P2.4  Workout logger (active workout, sets/reps, rest timer)
P2.5  Progressive overload engine
P2.6  London day mode (bodyweight circuit)
P2.7  Streak system + achievement badges
P2.8  E2E tests (onboarding, meal log, workout log)
P2.9  Observability (Sentry + OpenTelemetry + Firebase Analytics)
P2.10 Android TWA generation (Bubblewrap)
```

### PHASE 3 — Intelligence & Android Widget (Weeks 5–8)
```
P3.1  Photo food recognition (Claude Vision API)
P3.2  Android Glance widgets (3 sizes)
P3.3  FCM push notifications (streak, hydration, workout reminders)
P3.4  Weekly AI insights (Claude-generated, max 200 words)
P3.5  Programme builder (6 templates)
P3.6  Body fat estimator (Navy Method)
P3.7  Exercise library (browseable, filter by muscle group)
P3.8  Wearable sync (Google Fit / Health Connect)
P3.9  Feature flag infrastructure (Firebase Remote Config)
P3.10 i18n (Hindi + Arabic)
```

### PHASE 4 — Scale & Monetise (post 10k users)
```
P4.1  Stripe billing (web-first, not Play Billing)
P4.2  Tier gating (pro/premium features activate)
P4.3  iOS PWA polish + App Store submission
P4.4  Social features (challenges, friends, leaderboard)
P4.5  Dietitian/trainer portal (B2B)
P4.6  Diabetes mode (blood glucose, GI/GL) — see Diabetes PRD
```

---

## HOW TO USE YOUR EXISTING CONTEXT.md

Your `CONTEXT.md` already exists at `C:\Projects\SBH\CONTEXT.md`.
**Do not recreate it.** It is the live status file for your project.

Before every Claude Code session, do these two things to your existing file:

### 1. Update the STATUS table
Tick off anything you completed. Add new files to the table.
```markdown
| Nutrition tracker | DONE | app/nutrition/page.tsx |
| Food search       | IN PROGRESS | app/nutrition/food-search/ |  ← add new rows
```

### 2. Update NEXT TASKS
Replace the completed task at the top with the new one:
```markdown
### NEXT TASKS (Next session start here)
1. **[Your next task]** — [brief description]
2. ...
```

### 3. Add a PRD SECTION block at the bottom before pasting
When starting a new feature from PRD v3, append this block temporarily:
```markdown
---
## CURRENT PRD SECTION
[Paste only the relevant Part from SBH_PRD_v3.md here]
---
```

### Your session prompt (use this every time)
```
Continue building SBH. Here is my CONTEXT.md:

[paste your full updated CONTEXT.md]

[paste only the PRD v3 Part relevant to today's task]

Task: [one sentence — exactly what to build today]
Stop when: tests pass. Do not touch anything outside this task.
```

### What to add to your existing CONTEXT.md (one-time additions)

Add these sections to your existing file — they are missing from v0.1:

```markdown
## DESIGN SYSTEM (v3 additions — do not change these mid-build)
- Background base: #060A12 | Surface cards: #0C1320
- Fonts: Bebas Neue (hero numbers/stats) · DM Sans (all UI text)
- Accent colours:
    Lime   #C8FF47 → calories, primary CTA
    Cyan   #00D4FF → hydration, cardio
    Orange #FF6B35 → protein
    Purple #B47FFF → carbs
    Red    #FF4757 → fat, warnings, over-target
    Gold   #FFD700 → streaks, achievements
- Cards: glass morphism — rgba(255,255,255,0.045) bg + 1px rgba(255,255,255,0.07) border
- CSS: ALWAYS logical properties (margin-inline-start, NOT margin-left)
- Touch targets: 48×48px minimum
- Motion: Framer Motion · spring(400,28) sheets · fadeUp(350ms) cards

## KEY PATTERNS (v3 additions)
- App name: import { APP } from "@/lib/app-config" — never hardcode "SBH"
- Pages: Server Components fetch DailyContext, pass as props to Client Components
- Feature flags: useFlag("feature.name") → Firebase Remote Config (all true now)
- Offline: IndexedDB + Background Sync via Serwist service worker
- Analytics: logEvent() for key actions — NO raw health values, NO PII
- Sentry: strip health data in beforeSend hook

## PRD v3 PHASE TRACKER
[ ] P1.1  Design tokens + core components (Ring, Card, MacroBar, Sparkline)
[ ] P1.4  DailyContext engine (lib/daily-context.ts)
[ ] P1.5  Today screen redesign (hero ring + macro row + hydration)
[ ] P1.9  PWA manifest (app/manifest.ts) + Serwist service worker
[ ] P2.1  Barcode scanner (ZXing + Open Food Facts)
[ ] P2.2  Food search (Typesense + USDA + IFCT import)
[ ] P2.4  Workout logger (active workout UX — sets/reps/rest timer)
[ ] P2.5  Progressive overload engine
[ ] P2.7  Streak system + achievement badges
[ ] P2.8  E2E tests (Playwright)
[ ] P2.9  Observability (Sentry + OpenTelemetry)
[ ] P2.10 Android TWA (Bubblewrap CLI)
[ ] P3.1  Photo food recognition (Claude Vision)
[ ] P3.2  Android Glance widgets (3 sizes)
[ ] P3.3  Push notifications (FCM)
```

---

## APPENDIX A — ICON SYSTEM

Use **Phosphor Icons** (`phosphor-react`). Consistent weight: Regular for navigation, Bold for CTAs, Fill for active states.

Key icons used:
```
Flame (calories), Drop (hydration), Barbell (workout),
Carrot (nutrition), ChartLine (progress), User (profile),
Camera (photo scan), Barcode (barcode scan), MicrophoneStage (voice),
Trophy (achievement), Seal (streak), Lightning (energy),
AppleWatch → no native, use watch icon + custom
```

## APPENDIX B — ANIMATION SPECS

```typescript
// All animations use Framer Motion
// Page transitions: cross-fade (150ms) — not slide, too aggressive
// Bottom sheet: spring(400,28) from y:100% to y:0
// Ring progress: tween(1.2s, easeOut) on mount
// Streak milestone: canvas-confetti burst, 1.5s
// Number counters: spring(300,20), 800ms
// Card press: scale(0.97) on pointerdown, (1.0) on pointerup
// Achievement unlock: scale(0→1.15→1.0), opacity(0→1), spring
```

## APPENDIX C — RELEASE NOTES FORMAT

```markdown
<!-- Auto-generated by semantic-release from conventional commits -->
## SBH v2.3.0 — 2026-03-15

### ✨ New Features
- Barcode scanner for packaged foods (Open Food Facts + FatSecret)
- Today screen adapts to time of day (morning/midday/evening modes)

### 🐛 Bug Fixes
- Fixed protein bar not updating after quick-add

### 🔧 Improvements
- Food search results now under 100ms (Typesense migration)

### 📊 Metrics
- Test coverage: 84% (↑ from 79%)
- Lighthouse Performance: 96 (↑ from 91)
- Bundle size: 187kb gzipped (↓ 12kb)
```

---

*SBH PRD v3.0 — March 2026 | Next review: Phase 1 complete*
*Build order: Design System → Onboarding → Today Screen → Nutrition → Workout → PWA → Android*
