'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import { onAuthStateChanged, getIdToken, type User as FirebaseUser } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import Link from 'next/link'
import { ArrowLeft, Send, Bot, User, Sparkles, RefreshCw, Sun } from 'lucide-react'

const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'

interface Message {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface DailyCheckin {
  greeting:   string
  focus:      string
  reflection: string
  date:       string
}

const SUGGESTED_PROMPTS = [
  'How can I improve my glucose control today?',
  'What should I eat before my workout?',
  'I\'m feeling low energy — what can help?',
  'Review my week and give me 3 tips',
  'How do I build a better sleep routine?',
  'What\'s a good low-GI breakfast idea?',
]

export default function CoachPage() {
  const router = useRouter()
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [checkin, setCheckin] = useState<DailyCheckin | null>(null)
  const [checkinLoading, setCheckinLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setAuthReady(true)
      if (!u) { router.push('/login'); return }
      setFirebaseUser(u)
    })
    return unsub
  }, [router])

  // Load daily check-in
  useEffect(() => {
    if (!firebaseUser) return
    setCheckinLoading(true)
    getIdToken(firebaseUser)
      .then(token => fetch('/api/coach/daily-checkin', {
        headers: { Authorization: `Bearer ${token}` },
      }))
      .then(r => r.json())
      .then(data => setCheckin(data))
      .catch(() => {})
      .finally(() => setCheckinLoading(false))
  }, [firebaseUser])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!firebaseUser || !text.trim() || sending) return
    setSending(true)

    // Always get a fresh token — Firebase SDK refreshes automatically if expired
    const idToken = await getIdToken(firebaseUser).catch(() => null)
    if (!idToken) { setSending(false); return }

    const userMsg: Message = { role: 'user', content: text.trim() }
    const history = messages.map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => [
      ...prev,
      userMsg,
      { role: 'assistant', content: '', streaming: true },
    ])
    setInput('')

    try {
      const resp = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text.trim(), history }),
      })

      if (!resp.ok || !resp.body) {
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: 'Sorry, I couldn\'t respond right now. Please try again.' }
          return copy
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
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: full, streaming: true }
          return copy
        })
      }

      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'assistant', content: full, streaming: false }
        return copy
      })
    } catch {
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'assistant', content: 'Connection error — please try again.' }
        return copy
      })
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [firebaseUser, messages, sending])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen mesh-bg flex flex-col">
      {/* Header */}
      <header className="page-header-bar px-4 flex items-center gap-3 h-14 shrink-0">
        <Link href="/dashboard" className="p-2 rounded-xl glass-elevated">
          <ArrowLeft size={16} style={{ color: 'var(--text-3)' }} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})` }}>
            <Bot size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-1">HealthOS Health Coach</p>
            <p className="text-xs text-3">AI-powered · condition-aware</p>
          </div>
        </div>
        <button onClick={() => setMessages([])} className="ml-auto p-2 rounded-xl glass"
          title="Clear conversation">
          <RefreshCw size={14} style={{ color: 'var(--text-3)' }} />
        </button>
      </header>

      {/* Scrollable chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-w-2xl lg:max-w-4xl mx-auto w-full">

        {/* Daily check-in card */}
        {!checkinLoading && checkin && messages.length === 0 && (
          <div className="glass-elevated rounded-2xl p-4 space-y-3"
            style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(6,182,212,0.06))' }}>
            <div className="flex items-center gap-2">
              <Sun size={14} style={{ color: '#fbbf24' }} />
              <p className="text-xs font-semibold text-3 uppercase tracking-wider">Today&apos;s Check-in</p>
            </div>
            <p className="text-sm text-1 leading-relaxed">{checkin.greeting}</p>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <Sparkles size={11} style={{ color: VIOLET, flexShrink: 0, marginTop: 3 }} />
                <p className="text-xs text-2"><strong className="text-1">Focus:</strong> {checkin.focus}</p>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles size={11} style={{ color: CYAN, flexShrink: 0, marginTop: 3 }} />
                <p className="text-xs text-2"><strong className="text-1">Tonight:</strong> {checkin.reflection}</p>
              </div>
            </div>
          </div>
        )}

        {/* Suggested prompts (when no messages) */}
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-3 uppercase tracking-wider px-1">Suggested questions</p>
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTED_PROMPTS.map(p => (
                <button key={p} onClick={() => sendMessage(p)}
                  className="glass rounded-xl px-3 py-2.5 text-left text-xs text-2 hover:text-1 transition-colors"
                  style={{ border: '1px solid var(--glass-border)' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
              msg.role === 'user'
                ? 'glass'
                : ''
            }`}
              style={msg.role === 'assistant'
                ? { background: `linear-gradient(135deg,${VIOLET},${CYAN})` }
                : {}}>
              {msg.role === 'user'
                ? <User size={12} style={{ color: 'var(--text-2)' }} />
                : <Bot size={12} className="text-white" />}
            </div>
            {/* Bubble */}
            <div className={`max-w-[80%] rounded-2xl px-3 py-2.5 ${
              msg.role === 'user'
                ? 'rounded-tr-sm'
                : 'rounded-tl-sm'
            }`}
              style={msg.role === 'user'
                ? { background: `linear-gradient(135deg,${VIOLET},${CYAN})`, color: '#fff' }
                : { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: msg.role === 'user' ? '#fff' : 'var(--text-1)' }}>
                {msg.content}
                {msg.streaming && (
                  <span className="inline-block w-1 h-4 ml-0.5 align-middle animate-pulse"
                    style={{ background: VIOLET }} />
                )}
              </p>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-4 pb-6 pt-2 max-w-2xl lg:max-w-4xl mx-auto w-full">
        <div className="glass-elevated rounded-2xl flex items-end gap-2 p-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            placeholder="Ask your health coach anything…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-1 placeholder:text-3 resize-none outline-none py-1.5 px-1 max-h-32"
            style={{ minHeight: 36 }}
          />
          <button
            disabled={!input.trim() || sending}
            onClick={() => sendMessage(input)}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
            style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})` }}>
            {sending
              ? <RefreshCw size={14} className="text-white animate-spin" />
              : <Send size={14} className="text-white" />}
          </button>
        </div>
        <p className="text-xs text-3 text-center mt-2">
          Not medical advice · Always consult your GP for clinical decisions
        </p>
      </div>
    </main>
  )
}
