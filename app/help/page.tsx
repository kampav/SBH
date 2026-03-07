'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import { onAuthStateChanged, getIdToken } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import Link from 'next/link'
import {
  ArrowLeft, MessageSquare, ChevronDown, ChevronRight,
  Bot, Send, RefreshCw, User, Zap,
} from 'lucide-react'

const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'

// ── Feature guide content ──────────────────────────────────────────────────────
interface FeatureSection {
  id: string
  emoji: string
  title: string
  tagline: string
  color: string
  steps: string[]
  aiRole: string
}

const FEATURES: FeatureSection[] = [
  {
    id: 'nutrition',
    emoji: '🥗',
    title: 'Nutrition Tracker',
    tagline: 'Log what you eat, hit your targets, see the pattern',
    color: '#10b981',
    steps: [
      'Tap "Log Meal" from the home screen',
      'Search for food by name, scan a barcode, or take a photo',
      'Your daily calories, protein, carbs and fat are totalled automatically',
      'See your nutrition history and weekly trends in the Progress tab',
    ],
    aiRole: 'The AI recognises foods from photos (even home-cooked meals), estimates portions, and gives you a weekly nutrition summary every Sunday with three personalised tips.',
  },
  {
    id: 'workout',
    emoji: '🏋️',
    title: 'Workout Logger',
    tagline: 'Follow a programme or log your own sessions',
    color: '#6366f1',
    steps: [
      'Choose a programme (Home 6-Day, Gym Upper/Lower, or Beginner 3-Day)',
      'Log sets, reps and weight for each exercise',
      'SBH suggests weight increases based on your last session (progressive overload)',
      'View your workout history and volume charts in the History tab',
    ],
    aiRole: 'SBH calculates the right weight to progress each week using the progressive overload engine — it reads your last session and nudges you upwards when you\'re ready.',
  },
  {
    id: 'glucose',
    emoji: '📊',
    title: 'Glucose Tracker',
    tagline: 'Manual readings or real-time Dexcom sync',
    color: '#ef4444',
    steps: [
      'Log a manual glucose reading with context (fasting, after meal, bedtime)',
      'Connect your Dexcom G6/G7 under Settings → Integrations for automatic sync',
      'See time-in-range, daily averages, and trend arrows',
      'The AI predicts how meals will affect your glucose based on GI/GL scores',
    ],
    aiRole: 'After you connect a CGM, the AI monitors your glucose patterns and sends nudges when it detects risks — like a high-GI breakfast that historically causes a spike for you.',
  },
  {
    id: 'sleep',
    emoji: '🌙',
    title: 'Sleep Tracker',
    tagline: 'Log duration and quality, understand your rest',
    color: '#a78bfa',
    steps: [
      'Log last night\'s sleep from the home screen or the Sleep page',
      'Rate your sleep quality from 1–5',
      'See your sleep score (based on duration + quality)',
      'Weekly sleep trend shown in your AI weekly report',
    ],
    aiRole: 'The weekly AI report correlates your sleep with workout performance and mood — you\'ll see patterns like "Your mood is 30% higher after 7+ hours sleep".',
  },
  {
    id: 'mood',
    emoji: '🧠',
    title: 'Mood & Mental Wellness',
    tagline: 'Daily check-ins, CBT journal, PHQ-9 screening',
    color: '#ec4899',
    steps: [
      'Log your mood (1–5), energy, and anxiety level each day',
      'Write optional notes in the journal for a CBT thought record',
      'Complete the PHQ-9 monthly screening (shown if you have a Mental Health condition)',
      'If scores are high, SBH shows crisis links to Samaritans (116 123) — safety first',
    ],
    aiRole: 'The AI correlates your mood with sleep, nutrition, and exercise. Over time it surfaces insights like "Anxiety is lower on days you exercise before noon".',
  },
  {
    id: 'coach',
    emoji: '🤖',
    title: 'AI Health Coach',
    tagline: 'Chat with a condition-aware AI coach anytime',
    color: VIOLET,
    steps: [
      'Open the AI Coach from the home screen or use the chat below',
      'Ask anything — meal ideas, workout advice, glucose management, stress tips',
      'The coach knows your conditions, targets, and goals from your profile',
      'You get a personalised morning check-in every day with a focus and reflection prompt',
    ],
    aiRole: 'The coach uses Claude AI and is tailored to your exact conditions. It never prescribes medication or diagnoses — it gives lifestyle and nutritional guidance, and always points you to a professional for clinical questions.',
  },
  {
    id: 'integrations',
    emoji: '🔗',
    title: 'Integrations (CGM & Wearables)',
    tagline: 'Connect your devices for automatic data sync',
    color: CYAN,
    steps: [
      'Go to Profile → Integrations',
      'Connect Dexcom G6/G7 with one tap (OAuth secure login)',
      'Glucose readings sync automatically — no manual entry needed',
      'FreeStyle Libre, Apple Health, and Google Health Connect coming soon',
    ],
    aiRole: 'Once connected, your CGM data feeds into all AI features — meal recommendations, glucose prediction, and the weekly care team report you can share with your GP.',
  },
  {
    id: 'blood-pressure',
    emoji: '❤️',
    title: 'Blood Pressure',
    tagline: 'Track systolic, diastolic, and pulse',
    color: '#f43f5e',
    steps: [
      'Log a BP reading from the Blood Pressure page',
      'Add context: morning, evening, after exercise, stressed',
      'See your 7-day average and NHS/BHS classification',
      'If 3 consecutive readings are >140/90, SBH suggests speaking to your GP',
    ],
    aiRole: 'BP readings feed into your care team report and health feed. The AI flags sustained high readings and explains what lifestyle factors (sodium, stress, activity) typically contribute.',
  },
]

// ── Chat ───────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

const HELP_SYSTEM_PROMPT = `You are the SBH Help Assistant — friendly, clear, and concise.

SBH (Science Based Health) is a health tracking app with these features:
- Nutrition Tracker (calorie/macro logging, barcode scan, AI photo recognition)
- Workout Logger (3 programmes, progressive overload, history)
- Glucose Tracker (manual + Dexcom CGM integration)
- Sleep Tracker (duration + quality scoring)
- Mood & Mental Wellness (daily check-in, CBT journal, PHQ-9 screening)
- Blood Pressure logger
- Habits tracker
- AI Health Coach (Claude-powered conversational coach)
- PCOS Tracker (cycle phases, supplements, hormone-friendly workouts)
- Thyroid Tracker (TSH log, fatigue tracking, medication reminder)
- Weekly AI Insights (personalised summary every Sunday)
- Coaching Marketplace (certified coaches)
- Dexcom + wearable integrations

Answer app usage questions concisely (1-3 sentences). For health questions, give helpful lifestyle guidance and always note "speak to your GP for medical advice". Be warm, never robotic.

If the user asks something unrelated to health or the app, politely redirect.`

export default function HelpPage() {
  const router = useRouter()
  const [idToken, setIdToken] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setAuthReady(true)
      if (!u) { router.push('/login'); return }
      const token = await getIdToken(u)
      setIdToken(token)
    })
    return unsub
  }, [router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!idToken || !text.trim() || sending) return
    setSending(true)

    const history = messages.map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [
      ...prev,
      { role: 'user', content: text.trim() },
      { role: 'assistant', content: '', streaming: true },
    ])
    setInput('')

    try {
      const resp = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history,
          systemOverride: HELP_SYSTEM_PROMPT,
        }),
      })

      if (!resp.ok || !resp.body) {
        setMessages(prev => {
          const c = [...prev]; c[c.length - 1] = { role: 'assistant', content: 'Sorry, I couldn\'t respond. Please try again.' }; return c
        })
        return
      }

      const reader  = resp.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const c = [...prev]; c[c.length - 1] = { role: 'assistant', content: full, streaming: true }; return c
        })
      }
      setMessages(prev => {
        const c = [...prev]; c[c.length - 1] = { role: 'assistant', content: full, streaming: false }; return c
      })
    } catch {
      setMessages(prev => {
        const c = [...prev]; c[c.length - 1] = { role: 'assistant', content: 'Connection error. Try again.' }; return c
      })
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [idToken, messages, sending])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  const QUICK_QUESTIONS = [
    'How do I connect my Dexcom?',
    'How does the progressive overload engine work?',
    'What is time-in-range for glucose?',
    'How do I log a meal using a photo?',
    'What is the PHQ-9 screening?',
    'How does the AI coach know about my conditions?',
  ]

  return (
    <main className="min-h-screen mesh-bg page-pad pb-20">
      <header className="page-header-bar px-4 flex items-center gap-3 h-14">
        <Link href="/dashboard" className="p-2 rounded-xl glass-elevated">
          <ArrowLeft size={16} style={{ color: 'var(--text-3)' }} />
        </Link>
        <div>
          <p className="section-label">SBH</p>
          <h1 className="page-title" style={{ fontSize: '1.25rem' }}>Help & Features</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4 pt-3">

        {/* ── Ask the AI ───────────────────────────────────────── */}
        <div className="glass-elevated rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${VIOLET}30` }}>
          <div className="px-4 pt-4 pb-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})` }}>
              <Bot size={13} className="text-white" />
            </div>
            <p className="text-sm font-bold text-1">Ask the SBH Assistant</p>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} className="ml-auto p-1 rounded-lg glass">
                <RefreshCw size={11} style={{ color: 'var(--text-3)' }} />
              </button>
            )}
          </div>

          {/* Quick questions (shown when empty) */}
          {messages.length === 0 && (
            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="text-xs px-2.5 py-1 rounded-xl font-medium transition-colors"
                  style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Chat messages */}
          {messages.length > 0 && (
            <div className="px-3 pb-3 space-y-2.5 max-h-72 overflow-y-auto">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={msg.role === 'assistant'
                      ? { background: `linear-gradient(135deg,${VIOLET},${CYAN})` }
                      : { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                    {msg.role === 'user'
                      ? <User size={10} style={{ color: 'var(--text-2)' }} />
                      : <Bot size={10} className="text-white" />}
                  </div>
                  <div className="max-w-[80%] rounded-xl px-3 py-2"
                    style={msg.role === 'user'
                      ? { background: `linear-gradient(135deg,${VIOLET},${CYAN})` }
                      : { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap"
                      style={{ color: msg.role === 'user' ? '#fff' : 'var(--text-1)' }}>
                      {msg.content}
                      {msg.streaming && <span className="inline-block w-1 h-3 ml-0.5 align-middle animate-pulse" style={{ background: VIOLET }} />}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Input */}
          <div className="flex items-end gap-2 px-3 pb-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              placeholder="Ask anything about SBH…"
              rows={1}
              className="flex-1 glass rounded-xl px-3 py-2 text-xs text-1 placeholder:text-3 resize-none outline-none"
              style={{ minHeight: 34 }}
            />
            <button disabled={!input.trim() || sending} onClick={() => sendMessage(input)}
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40"
              style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})` }}>
              {sending ? <RefreshCw size={12} className="text-white animate-spin" /> : <Send size={12} className="text-white" />}
            </button>
          </div>
        </div>

        {/* ── Feature sections ──────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider px-1 mb-3" style={{ color: 'var(--text-3)' }}>
            Features Guide
          </p>
          <div className="space-y-2">
            {FEATURES.map(f => (
              <div key={f.id} className="glass rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(prev => prev === f.id ? null : f.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                  <span className="text-xl shrink-0">{f.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-1">{f.title}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{f.tagline}</p>
                  </div>
                  {expandedId === f.id
                    ? <ChevronDown size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                    : <ChevronRight size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
                </button>

                {expandedId === f.id && (
                  <div className="px-4 pb-4 space-y-3"
                    style={{ borderTop: '1px solid var(--glass-border)' }}>
                    {/* How to use */}
                    <div className="pt-3">
                      <p className="text-xs font-semibold text-3 uppercase tracking-wider mb-2">How to use</p>
                      <ol className="space-y-1.5">
                        {f.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded-lg shrink-0 mt-0.5"
                              style={{ background: `${f.color}15`, color: f.color }}>
                              {i + 1}
                            </span>
                            <p className="text-xs text-2 leading-relaxed">{step}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                    {/* How AI helps */}
                    <div className="rounded-xl p-3 space-y-1"
                      style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
                      <div className="flex items-center gap-1.5">
                        <Zap size={11} style={{ color: VIOLET }} />
                        <p className="text-xs font-semibold" style={{ color: VIOLET }}>How AI helps</p>
                      </div>
                      <p className="text-xs text-2 leading-relaxed">{f.aiRole}</p>
                    </div>
                    <Link href={`/${f.id === 'integrations' ? 'settings/integrations' : f.id}`}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white"
                      style={{ background: `linear-gradient(135deg,${f.color},${f.color}cc)` }}>
                      <MessageSquare size={11} /> Open {f.title}
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Privacy note ─────────────────────────────────────── */}
        <div className="rounded-2xl px-4 py-3 space-y-1"
          style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
          <p className="text-xs font-semibold" style={{ color: '#22d3ee' }}>Your data, your control</p>
          <p className="text-xs text-2 leading-relaxed">
            All your health data is stored privately in your account. SBH never sells data or shares it with third parties. You can export or delete everything from Profile → Account.
          </p>
        </div>

      </div>
    </main>
  )
}
