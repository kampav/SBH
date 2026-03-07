'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Star, CheckCircle, Calendar, MessageSquare, Award, Filter } from 'lucide-react'

const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'

type Specialty =
  | 'all'
  | 'diabetes'
  | 'fitness'
  | 'nutrition'
  | 'mental_health'
  | 'weight_loss'

const SPECIALTY_LABELS: Record<Specialty, string> = {
  all:           'All',
  diabetes:      'Diabetes',
  fitness:       'Fitness',
  nutrition:     'Nutrition',
  mental_health: 'Mental Health',
  weight_loss:   'Weight Loss',
}

interface Coach {
  id: string
  name: string
  title: string
  specialties: Specialty[]
  rating: number
  reviewCount: number
  pricePerMonth: number
  availability: 'available' | 'limited' | 'full'
  credentials: string[]
  bio: string
  avatar: string
  sessionsCompleted: number
  responseTime: string
}

const COACHES: Coach[] = [
  {
    id: 'c1',
    name: 'Dr. Sarah Okonkwo',
    title: 'Certified Diabetes Educator & Registered Dietitian',
    specialties: ['diabetes', 'nutrition', 'weight_loss'],
    rating: 4.9,
    reviewCount: 214,
    pricePerMonth: 79,
    availability: 'available',
    credentials: ['CDE', 'RD', 'MSc Nutrition'],
    bio: 'Specialising in T1D and T2D management with 10+ years helping patients achieve stable glucose control through evidence-based nutrition and lifestyle coaching.',
    avatar: '👩🏾‍⚕️',
    sessionsCompleted: 1840,
    responseTime: 'Within 2 hours',
  },
  {
    id: 'c2',
    name: 'James Hartley',
    title: 'Sports Dietitian & Strength Coach',
    specialties: ['fitness', 'nutrition', 'weight_loss'],
    rating: 4.8,
    reviewCount: 167,
    pricePerMonth: 59,
    availability: 'available',
    credentials: ['BSc Sports Science', 'SENr', 'CSCS'],
    bio: 'Former elite athlete turned coach. Specialising in body recomposition, progressive overload programming, and sports nutrition for amateur and competitive athletes.',
    avatar: '🏋️',
    sessionsCompleted: 1250,
    responseTime: 'Within 4 hours',
  },
  {
    id: 'c3',
    name: 'Dr. Priya Mehta',
    title: 'Clinical Psychologist & CBT Practitioner',
    specialties: ['mental_health'],
    rating: 5.0,
    reviewCount: 98,
    pricePerMonth: 99,
    availability: 'limited',
    credentials: ['DClinPsy', 'BABCP Accredited', 'EMDR Certified'],
    bio: 'Specialising in health anxiety, chronic illness adjustment, and the psychological impact of diabetes and other long-term conditions. Evidence-based CBT approach.',
    avatar: '🧠',
    sessionsCompleted: 890,
    responseTime: 'Within 6 hours',
  },
  {
    id: 'c4',
    name: 'Marcus Thompson',
    title: 'PCOS & Hormonal Health Nutritionist',
    specialties: ['nutrition', 'weight_loss', 'diabetes'],
    rating: 4.7,
    reviewCount: 143,
    pricePerMonth: 69,
    availability: 'available',
    credentials: ['ANutr', 'mBANT', 'CNHC Registered'],
    bio: 'Expert in insulin resistance, PCOS, and hormonal health. Uses functional nutrition principles alongside CGM data to optimise glucose stability and metabolic health.',
    avatar: '🥗',
    sessionsCompleted: 1100,
    responseTime: 'Same day',
  },
  {
    id: 'c5',
    name: 'Aisha Kamara',
    title: 'Mental Health Coach & Sleep Specialist',
    specialties: ['mental_health'],
    rating: 4.8,
    reviewCount: 89,
    pricePerMonth: 49,
    availability: 'available',
    credentials: ['MSc Psychology', 'ICF ACC', 'CBT-i Trained'],
    bio: 'Helping people overcome anxiety, burnout, and chronic fatigue through sleep optimisation, mindfulness, and structured lifestyle coaching. Integrates wearable data into sessions.',
    avatar: '🌙',
    sessionsCompleted: 760,
    responseTime: 'Within 3 hours',
  },
  {
    id: 'c6',
    name: 'Tom Ridley',
    title: 'Cardio & Metabolic Fitness Coach',
    specialties: ['fitness', 'weight_loss'],
    rating: 4.6,
    reviewCount: 205,
    pricePerMonth: 49,
    availability: 'limited',
    credentials: ['PT Level 4', 'REPS Registered', 'First Aid'],
    bio: 'Specialising in heart health, metabolic syndrome, and sustainable weight loss through zone-2 training and habit-based nutrition. Great for beginners to intermediates.',
    avatar: '🏃',
    sessionsCompleted: 2100,
    responseTime: 'Within 5 hours',
  },
]

const AVAILABILITY_COLORS: Record<Coach['availability'], string> = {
  available: '#10b981',
  limited:   '#f59e0b',
  full:      '#ef4444',
}

const AVAILABILITY_LABELS: Record<Coach['availability'], string> = {
  available: 'Available',
  limited:   'Limited spots',
  full:      'Fully booked',
}

export default function CoachingPage() {
  const [filter, setFilter] = useState<Specialty>('all')
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null)

  const filtered = filter === 'all'
    ? COACHES
    : COACHES.filter(c => c.specialties.includes(filter))

  if (selectedCoach) {
    return <CoachDetail coach={selectedCoach} onBack={() => setSelectedCoach(null)} />
  }

  return (
    <main className="min-h-screen mesh-bg page-pad pb-20">
      <header className="page-header-bar px-4 flex items-center gap-3 h-14">
        <Link href="/pricing" className="p-2 rounded-xl glass-elevated">
          <ArrowLeft size={16} style={{ color: 'var(--text-3)' }} />
        </Link>
        <div>
          <p className="section-label">Revenue</p>
          <h1 className="page-title" style={{ fontSize: '1.25rem' }}>Coaching Marketplace</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4 pt-3">

        {/* Hero banner */}
        <div className="glass-elevated rounded-2xl p-5 space-y-1"
          style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(6,182,212,0.08))' }}>
          <p className="text-sm font-bold text-1">1-on-1 expert coaching, built into SBH</p>
          <p className="text-xs text-2 leading-relaxed">
            Work with certified diabetes educators, sports dietitians, and mental health specialists.
            Sessions sync with your SBH data — no need to share screenshots.
          </p>
          <div className="flex items-center gap-4 pt-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={12} style={{ color: '#10b981' }} />
              <span className="text-xs text-2">Qualified & verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={12} style={{ color: VIOLET }} />
              <span className="text-xs text-2">Flexible scheduling</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageSquare size={12} style={{ color: CYAN }} />
              <span className="text-xs text-2">In-app messaging</span>
            </div>
          </div>
        </div>

        {/* Specialty filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Filter size={14} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 6 }} />
          {(Object.keys(SPECIALTY_LABELS) as Specialty[]).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={filter === s
                ? { background: `linear-gradient(135deg,${VIOLET},${CYAN})`, color: '#fff' }
                : { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}>
              {SPECIALTY_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Coach cards */}
        <div className="space-y-3">
          {filtered.map(coach => (
            <div key={coach.id} className="glass rounded-2xl p-4 space-y-3">
              {/* Header row */}
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl glass flex items-center justify-center text-2xl shrink-0">
                  {coach.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-1">{coach.name}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                      style={{
                        background: `${AVAILABILITY_COLORS[coach.availability]}18`,
                        color: AVAILABILITY_COLORS[coach.availability],
                      }}>
                      {AVAILABILITY_LABELS[coach.availability]}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{coach.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={11} style={{ color: '#fbbf24' }} />
                    <span className="text-xs font-semibold text-1">{coach.rating.toFixed(1)}</span>
                    <span className="text-xs text-3">({coach.reviewCount} reviews)</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black" style={{ color: VIOLET }}>£{coach.pricePerMonth}</p>
                  <p className="text-xs text-3">/month</p>
                </div>
              </div>

              {/* Credentials */}
              <div className="flex gap-1.5 flex-wrap">
                {coach.credentials.map(c => (
                  <span key={c} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(124,58,237,0.08)', color: '#a78bfa' }}>
                    <Award size={9} />{c}
                  </span>
                ))}
              </div>

              {/* Bio */}
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                {coach.bio}
              </p>

              {/* Footer */}
              <div className="flex items-center gap-2">
                <div className="flex-1 text-xs text-3">
                  <span>{coach.sessionsCompleted.toLocaleString()} sessions · </span>
                  <span>Replies {coach.responseTime.toLowerCase()}</span>
                </div>
                <button
                  onClick={() => setSelectedCoach(coach)}
                  disabled={coach.availability === 'full'}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40"
                  style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})` }}>
                  <Calendar size={11} />
                  {coach.availability === 'full' ? 'Join waitlist' : 'Book session'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Become a coach CTA */}
        <div className="glass rounded-2xl p-4 flex items-center gap-3"
          style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
          <div className="text-2xl">🎓</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-1">Are you a health professional?</p>
            <p className="text-xs text-2 mt-0.5">
              Join the SBH coaching network. Set your own rates, manage your schedule, and help clients using their real health data.
            </p>
          </div>
          <a href="mailto:coaches@sbhealth.app"
            className="shrink-0 text-xs font-semibold px-3 py-2 rounded-xl"
            style={{ background: 'rgba(124,58,237,0.1)', color: '#a78bfa' }}>
            Apply
          </a>
        </div>
      </div>
    </main>
  )
}

function CoachDetail({ coach, onBack }: { coach: Coach; onBack: () => void }) {
  const [booked, setBooked] = useState(false)

  function handleBook() {
    // In production this would open a Calendly / booking flow
    setBooked(true)
  }

  return (
    <main className="min-h-screen mesh-bg page-pad pb-20">
      <header className="page-header-bar px-4 flex items-center gap-3 h-14">
        <button onClick={onBack} className="p-2 rounded-xl glass-elevated">
          <ArrowLeft size={16} style={{ color: 'var(--text-3)' }} />
        </button>
        <h1 className="page-title" style={{ fontSize: '1.1rem' }}>{coach.name}</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 space-y-4 pt-3">

        {/* Profile card */}
        <div className="glass-elevated rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center text-3xl">
              {coach.avatar}
            </div>
            <div>
              <p className="font-bold text-1">{coach.name}</p>
              <p className="text-xs text-3 mt-0.5">{coach.title}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star size={12} style={{ color: '#fbbf24' }} />
                <span className="text-sm font-bold text-1">{coach.rating.toFixed(1)}</span>
                <span className="text-xs text-3">({coach.reviewCount} reviews)</span>
              </div>
            </div>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {coach.credentials.map(c => (
              <span key={c} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(124,58,237,0.08)', color: '#a78bfa' }}>
                <Award size={9} />{c}
              </span>
            ))}
          </div>

          <p className="text-sm leading-relaxed text-2">{coach.bio}</p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Sessions', value: coach.sessionsCompleted.toLocaleString() },
              { label: 'Rating',   value: `${coach.rating}/5` },
              { label: 'Response', value: coach.responseTime },
            ].map(stat => (
              <div key={stat.label} className="glass rounded-xl p-3 text-center">
                <p className="text-sm font-bold text-1">{stat.value}</p>
                <p className="text-xs text-3 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="glass rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-3">Monthly coaching</p>
            <p className="text-2xl font-black" style={{ color: VIOLET }}>£{coach.pricePerMonth}<span className="text-sm font-normal text-3">/mo</span></p>
            <p className="text-xs text-3 mt-0.5">Includes 4 × 50-min video sessions + in-app messaging</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full font-semibold"
            style={{
              background: `${AVAILABILITY_COLORS[coach.availability]}18`,
              color: AVAILABILITY_COLORS[coach.availability],
            }}>
            {AVAILABILITY_LABELS[coach.availability]}
          </span>
        </div>

        {/* Book CTA */}
        {booked ? (
          <div className="glass-elevated rounded-2xl p-5 text-center space-y-2">
            <CheckCircle size={28} style={{ color: '#10b981', margin: '0 auto' }} />
            <p className="font-bold text-1">Request sent!</p>
            <p className="text-xs text-2">
              {coach.name} will reach out within {coach.responseTime.toLowerCase()} to confirm your first session.
            </p>
          </div>
        ) : (
          <button
            disabled={coach.availability === 'full'}
            onClick={handleBook}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})` }}>
            {coach.availability === 'full' ? 'Join Waitlist' : 'Book Free Intro Session'}
          </button>
        )}

        <p className="text-xs text-3 text-center">
          No commitment · Cancel or switch coaches anytime
        </p>
      </div>
    </main>
  )
}
