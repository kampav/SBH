'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('sbh_theme')
    setDark(saved !== 'light')
  }, [])

  function toggle() {
    const next = dark ? 'light' : 'dark'
    localStorage.setItem('sbh_theme', next)
    document.documentElement.setAttribute('data-theme', next)
    setDark(!dark)
  }

  const iconSize = size === 'md' ? 18 : 15

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-2 rounded-xl glass transition-all active:scale-90"
      style={{ color: dark ? '#f59e0b' : '#7c3aed' }}
    >
      {dark ? <Sun size={iconSize} /> : <Moon size={iconSize} />}
    </button>
  )
}
