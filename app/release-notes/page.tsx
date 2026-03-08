'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Bug, Wrench, Shield } from 'lucide-react'

interface Release {
  version: string
  date: string
  highlights: string[]
  fixes?: string[]
  privacy?: string[]
  breaking?: string[]
}

const RELEASES: Release[] = [
  {
    version: 'v2.8.0',
    date: '2026-03-07',
    highlights: [
      'AI Health Coach — streaming Claude-powered conversational coach with condition-aware system prompt',
      'Daily Check-in — personalised morning message with focus + evening reflection, cached in Firestore',
      'PCOS Tracker — cycle log, symptom tracking, hormone-friendly workout phasing by menstrual phase, supplement log',
      'Thyroid Tracker — TSH/FT4 history with range classification, daily fatigue + brain fog log, medication reminder',
      'Care Team Report API — 30-day glucose, CGM, HbA1c, BP summary for GP/endocrinologist sharing (Diabetes Pro)',
      'Coach card added to dashboard · PCOS + Thyroid quick-links in profile',
    ],
    fixes: [
      'Coach chat falls back to default greeting if Claude API is unavailable',
      'TSH range uses NICE/NHS standard (0.4–4.0 mIU/L) with per-lab disclaimer',
    ],
    privacy: [
      'Cycle, fatigue, and TSH logs stored in users/{uid} subcollections — not shared',
      'Care team report generated on-demand — never auto-shared; user controls distribution',
      'Mental health safety rails: coach never prescribes, never diagnoses, always signposts professionals',
    ],
  },
  {
    version: 'v2.7.0',
    date: '2026-03-07',
    highlights: [
      'Condition-tiered pricing — 4 specialised plans: Fitness Pro (£9.99/mo), Diabetes Pro (£14.99/mo), Mental Wellness (£9.99/mo), Health OS (£24.99/mo)',
      'Coaching Marketplace — browse and book certified diabetes educators, sports dietitians, and mental health coaches',
      'Coach profiles — credentials, ratings, session count, response time, and live availability status',
      'Free intro session booking flow with in-app request confirmation',
      'Coach specialty filter — filter by Diabetes, Fitness, Nutrition, Mental Health, Weight Loss',
      'Coaching Add-On upsell card on pricing page — from £49/month',
    ],
    fixes: [
      'Legacy pro/premium plan keys remapped to Fitness Pro / Health OS for existing subscribers',
      'Pricing page cards now show condition-specific accent colours and tailored feature lists',
    ],
    privacy: [
      'No health data is shared with coaches until the user explicitly authorises data sharing (coming in v2.8.0)',
      'Coach enquiries handled via email — no third-party booking platform data collection',
    ],
  },
  {
    version: 'v2.6.0',
    date: '2026-03-07',
    highlights: [
      'CGM Integrations — connect Dexcom G6/G7 via OAuth to sync real-time glucose readings',
      '/settings/integrations — manage all device connections with live status and sync controls',
      'CGM Day summary — time-in-range %, average mmol/L, and trend arrow per day',
      'FreeStyle Libre, Google Health Connect, Apple Health (coming soon)',
    ],
    fixes: [
      'Dexcom tokens auto-refreshed 60 seconds before expiry during sync',
      'CGM data stored in cgm/{date} subcollection — does not overwrite manual glucose readings',
    ],
    privacy: [
      'OAuth tokens stored in users/{uid}/integrations — never shared with third parties',
      'Disconnecting Dexcom immediately deletes all stored tokens',
      'GDPR Art. 20 data export now includes CGM readings',
    ],
  },
  {
    version: 'v2.5.0',
    date: '2026-03-07',
    highlights: [
      'Personalised Health Feed — ranked, condition-aware insight cards with Daily Health Score (0-100)',
      'Condition Intelligence — onboarding step for 10 health conditions (hypertension, diabetes, PCOS, anxiety, and more)',
      'Mood Tracker — daily check-ins, energy & anxiety levels, 7-day history',
      'PHQ-9 Depression Screening — validated 9-question tool with severity scoring and crisis signposting',
      'Blood Pressure Logger — ESC/AHA classification, 7-reading average, live preview while typing',
    ],
    fixes: [
      'Condition-specific tip cards rotate daily for variety',
      'Health Feed score penalises missing BP data only for cardiac/hypertension conditions',
    ],
    privacy: [
      'Mood, PHQ-9, and blood pressure data stored in users/{uid} subcollections — not shared',
      'PHQ-9 crisis messaging links to Samaritans (116 123) — no data transmitted',
      'Condition profile stored only if user explicitly selects conditions in onboarding',
    ],
  },
  {
    version: 'v2.3.0',
    date: '2026-03-07',
    highlights: [
      'Light / Dark theme toggle added to profile and dashboard',
      'Exercise Library — personal best tracker with form cues and common mistakes',
      'Fixed invisible elements in light mode (food button, consent checkboxes, progress rings)',
      'Progress ring tracks now adapt correctly to both light and dark themes',
    ],
    fixes: [
      'Manual food button text colour invisible in light theme',
      'Onboarding consent checkbox borders invisible in light theme',
      'Calorie and protein progress rings invisible track in light theme',
      'Weekly challenges progress ring track invisible in light theme',
    ],
    privacy: [
      'Consent version updated to 2026-03',
      'No new data categories collected in this release',
    ],
  },
  {
    version: 'v2.2.0',
    date: '2026-02-15',
    highlights: [
      'Exercise Library with 100+ exercises across 3 training programmes',
      'Muscle-group filtering and exercise search',
      'AI-powered weekly insights with 24-hour cache',
      'Social sharing — workout cards, referral links, public profiles',
      'Weekly Challenges & Leaderboard',
      'Apple-quality UI polish — glassmorphism refinements',
    ],
    fixes: [
      'Sunday mapping bug in workout day selector',
      'Glucose notes field no longer throws undefined error on save',
      'Rest timer overlay dismiss animation',
    ],
    privacy: [
      'Public profile data (username, referral code, display name) stored only when user opts in',
      'Leaderboard entries are public-read but only the owner can write',
    ],
  },
  {
    version: 'v2.1.0',
    date: '2026-01-20',
    highlights: [
      'Weekly Insights page with deterministic health scores',
      'Habit Tracker — 5 default habits with 7-day streaks',
      'PWA Install Banner for Add to Home Screen',
      'Stats sharing — shareable workout and metric cards',
      'Body Composition — US Navy body fat % calculator',
    ],
    fixes: [
      'Streak counter edge case on Sunday resets',
      'Sleep score NaN when no entries logged',
    ],
    privacy: [
      'Habit logs stored under users/{uid}/habit_logs — not shared',
    ],
  },
  {
    version: 'v2.0.0',
    date: '2025-12-10',
    highlights: [
      'Push Notifications (FCM) — streak, workout, and hydration reminders',
      'Progressive Overload Engine — auto-suggests weight increases',
      'Workout History page with volume charts',
      'Nutrition Pie Chart — macro breakdown by meal type',
      'Food Barcode Scanner',
      'AI Photo Food Recognition',
      'Android App (Play Store)',
    ],
    privacy: [
      'FCM tokens stored at users/{uid}/fcm_tokens/primary — deleted when notifications are disabled',
      'UK GDPR, India DPDP Act 2023, and UAE PDPL 2021 compliance sections added to Privacy Policy',
      'GDPR Art. 20 data export available from profile page',
    ],
  },
  {
    version: 'v1.8.0',
    date: '2025-10-15',
    highlights: [
      'Glucose Monitoring — manual readings, HbA1c estimation, time-in-range',
      'Sleep Tracker with sleep score',
      'Cardio Logger',
      'GDPR-compliant data deletion (Art. 17)',
      'Onboarding consent step (UK GDPR, DPDP, PDPL)',
    ],
    privacy: [
      'Explicit consent required before health data processing (GDPR Art. 9)',
      'Age verification step added to onboarding',
      'Users can withdraw consent by deleting their account',
    ],
  },
  {
    version: 'v1.0.0',
    date: '2025-08-01',
    highlights: [
      'Initial release — nutrition tracking, workout logging, body metrics',
      'Firebase Authentication (email + Google)',
      'Calorie and macro targets calculated from Mifflin-St Jeor formula',
      '3 training programmes: Home 6-Day, Gym Upper/Lower, Beginner 3-Day',
      'Dashboard with daily progress rings',
    ],
    privacy: [
      'Data stored in Firebase Firestore under users/{uid}',
      'No data sold or shared with third parties',
      'Users can delete all data at any time from the profile page',
    ],
  },
]

const TAG_COLOURS = {
  highlights: { bg: 'rgba(124,58,237,0.12)', text: '#a78bfa', label: "What's New", Icon: Sparkles },
  fixes:      { bg: 'rgba(16,185,129,0.10)', text: '#34d399',  label: 'Bug Fixes',  Icon: Bug },
  privacy:    { bg: 'rgba(6,182,212,0.10)',  text: '#22d3ee',  label: 'Privacy & Compliance', Icon: Shield },
  breaking:   { bg: 'rgba(244,63,94,0.10)',  text: '#f87171',  label: 'Breaking Changes', Icon: Wrench },
}

export default function ReleaseNotesPage() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setAuthReady(true)
      if (!u) router.push('/login')
    })
    return unsub
  }, [router])

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen mesh-bg page-pad pb-28">
      <header className="page-header-bar px-4 flex items-center gap-3 h-14">
        <Link href="/profile" className="p-2 rounded-xl glass-elevated">
          <ArrowLeft size={16} className="text-slate-400" />
        </Link>
        <div>
          <p className="section-label">Science Based Health</p>
          <h1 className="page-title" style={{ fontSize: '1.25rem' }}>Release Notes</h1>
        </div>
      </header>

      <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 lg:px-8 space-y-4 pt-4">

        {/* Latest badge */}
        <div className="glass rounded-2xl p-4 flex items-center gap-3"
          style={{ border: '1px solid rgba(124,58,237,0.25)' }}>
          <Sparkles size={18} style={{ color: '#a78bfa' }} />
          <div>
            <p className="text-xs font-semibold text-1">Current version: v2.8.0</p>
            <p className="text-xs text-3">Released {RELEASES[0].date}</p>
          </div>
        </div>

        {RELEASES.map((release, idx) => (
          <div key={release.version} className="glass rounded-2xl overflow-hidden">
            {/* Version header */}
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-1">{release.version}</span>
                {idx === 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
                    Latest
                  </span>
                )}
              </div>
              <span className="text-xs text-3">{release.date}</span>
            </div>

            <div className="px-5 py-4 space-y-4">
              {(Object.entries(TAG_COLOURS) as Array<[keyof typeof TAG_COLOURS, typeof TAG_COLOURS[keyof typeof TAG_COLOURS]]>)
                .filter(([key]) => release[key as keyof Release])
                .map(([key, { bg, text, label, Icon }]) => {
                  const items = release[key as keyof Release] as string[] | undefined
                  if (!items || items.length === 0) return null
                  return (
                    <div key={key}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={13} style={{ color: text }} />
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: text }}>
                          {label}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        {items.map((item, i) => (
                          <div key={i} className="flex items-start gap-2.5 rounded-xl px-3 py-2"
                            style={{ background: bg }}>
                            <span className="text-xs mt-0.5 flex-shrink-0" style={{ color: text }}>•</span>
                            <p className="text-xs leading-relaxed text-1">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        ))}

        <div className="glass rounded-2xl p-4 text-center space-y-2">
          <p className="text-xs text-2">Found a bug or have a suggestion?</p>
          <a
            href="https://github.com/kampav/SBH/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-semibold px-4 py-2 rounded-xl"
            style={{ background: 'rgba(124,58,237,0.12)', color: '#a78bfa' }}
          >
            Report on GitHub
          </a>
        </div>
      </div>
    </main>
  )
}
