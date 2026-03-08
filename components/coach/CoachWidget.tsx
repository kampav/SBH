'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { onAuthStateChanged, getIdToken, type User as FirebaseUser } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Bot, X, Send, Minimize2, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Message {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

const QUICK_PROMPTS = [
  'Quick tip for today',
  'How am I doing?',
  'What should I focus on?',
]

const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'

export default function CoachWidget() {
  const pathname = usePathname()
  const [open, setOpen]         = useState(false)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setFirebaseUser(u)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!firebaseUser || !text.trim() || sending) return
    setSending(true)

    // Always get a fresh token — Firebase SDK auto-refreshes if expired
    const idToken = await getIdToken(firebaseUser).catch(() => null)
    if (!idToken) {
      setSending(false)
      return
    }

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
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text.trim(), history }),
      })

      if (!resp.ok || !resp.body) {
        const errText = resp.status === 503
          ? 'AI service is temporarily unavailable.'
          : resp.status === 401
          ? 'Session expired — please refresh.'
          : 'Could not reach the coach right now.'
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: errText }
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
    }
  }, [firebaseUser, messages, sending])

  if (pathname.startsWith('/admin')) return null

  return (
    <>
      {/* ── Chat panel ─────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="coachwidget-panel fixed right-4 z-50 flex flex-col rounded-2xl overflow-hidden"
          style={{
            bottom: 'calc(4.5rem + env(safe-area-inset-bottom) + 4rem)',
            width: 'min(360px, calc(100vw - 2rem))',
            height: 'min(480px, 60vh)',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{
              background: `linear-gradient(135deg,${VIOLET}22,${CYAN}22)`,
              borderBottom: '1px solid var(--glass-border)',
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})` }}
            >
              <Bot size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>SBH Health Coach</p>
              <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>AI-powered · condition-aware</p>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/coach"
                className="p-1.5 rounded-lg transition-opacity active:opacity-70"
                style={{ background: 'rgba(255,255,255,0.08)' }}
                title="Open full coach"
              >
                <ChevronRight size={13} style={{ color: 'var(--text-3)' }} />
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg transition-opacity active:opacity-70"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <Minimize2 size={13} style={{ color: 'var(--text-3)' }} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-center py-2" style={{ color: 'var(--text-3)' }}>
                  Ask me anything about your health
                </p>
                {QUICK_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="w-full text-left text-xs px-3 py-2 rounded-xl transition-all duration-200 active:scale-98"
                    style={{
                      background: 'rgba(124,58,237,0.08)',
                      border: '1px solid rgba(124,58,237,0.2)',
                      color: VIOLET,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed"
                    style={
                      m.role === 'user'
                        ? { background: `linear-gradient(135deg,${VIOLET},${CYAN})`, color: '#fff', borderRadius: '16px 16px 4px 16px' }
                        : { background: 'var(--glass-elevated)', color: 'var(--text-1)', borderRadius: '16px 16px 16px 4px', border: '1px solid var(--glass-border)' }
                    }
                  >
                    {m.content || (m.streaming ? (
                      <span className="inline-flex gap-1">
                        {[0,1,2].map(d => (
                          <span
                            key={d}
                            className="w-1 h-1 rounded-full animate-bounce"
                            style={{ background: 'var(--text-3)', animationDelay: `${d * 0.15}s` }}
                          />
                        ))}
                      </span>
                    ) : '')}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="shrink-0 flex items-center gap-2 px-3 py-3"
            style={{ borderTop: '1px solid var(--glass-border)' }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              placeholder="Ask your coach..."
              disabled={sending || !firebaseUser}
              className="flex-1 text-xs px-3 py-2 rounded-xl outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-1)',
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={sending || !input.trim() || !firebaseUser}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90 disabled:opacity-40"
              style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})` }}
            >
              <Send size={13} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ── FAB trigger ────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="coachwidget-fab fixed right-4 z-50 flex items-center justify-center rounded-full shadow-xl transition-all duration-300 active:scale-90"
        style={{
          bottom: 'calc(4.5rem + env(safe-area-inset-bottom) + 0.75rem)',
          width: 52,
          height: 52,
          background: open
            ? 'rgba(30,30,40,0.9)'
            : `linear-gradient(135deg,${VIOLET},${CYAN})`,
          border: `2px solid ${open ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
          boxShadow: `0 8px 32px ${VIOLET}55`,
        }}
        aria-label="Open AI Coach"
      >
        {open
          ? <X size={20} style={{ color: 'var(--text-2)' }} />
          : <Bot size={20} className="text-white" />
        }
      </button>
    </>
  )
}
