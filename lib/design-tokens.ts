// lib/design-tokens.ts — PRD v3 Design System Tokens
// Import into globals.css as CSS variables. Never hardcode colour values elsewhere.

export const tokens = {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  bgBase:     '#060A12',   // deepest background
  bgSurface1: '#0C1320',   // cards, sheets
  bgSurface2: '#111B2E',   // elevated cards
  bgGlass:    'rgba(255,255,255,0.045)',  // frosted glass cards

  // ── Borders ────────────────────────────────────────────────────────────────
  borderFaint: 'rgba(255,255,255,0.07)',
  borderMid:   'rgba(255,255,255,0.12)',

  // ── Accent palette — ONE accent per data category ─────────────────────────
  accentLime:   '#C8FF47',  // calories / primary CTA
  accentCyan:   '#00D4FF',  // hydration / cardio
  accentOrange: '#FF6B35',  // protein
  accentPurple: '#B47FFF',  // carbs
  accentRed:    '#FF4757',  // fat / warnings / over-target
  accentGold:   '#FFD700',  // streaks / achievements

  // ── Current palette (glassmorphism — keep) ────────────────────────────────
  violet: '#7c3aed',
  cyan:   '#06b6d4',
  rose:   '#f43f5e',

  // ── Typography ─────────────────────────────────────────────────────────────
  textPrimary:   '#EDF2FF',
  textSecondary: '#5A6A8A',
  textMid:       '#8B9DC3',

  // ── Spacing scale (4px base) ───────────────────────────────────────────────
  space: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80] as const,

  // ── Radius ─────────────────────────────────────────────────────────────────
  radiusSm:   12,
  radiusMd:   20,
  radiusLg:   28,
  radiusFull: 9999,

  // ── Shadows ────────────────────────────────────────────────────────────────
  shadowCard: '0 8px 32px rgba(0,0,0,0.4)',
  shadowGlow: (color: string) => `0 0 20px ${color}33`,

  // ── Motion ─────────────────────────────────────────────────────────────────
  springStiffness: 400,
  springDamping:   28,
  fadeUpDuration:  0.35,
} as const

export type Tokens = typeof tokens

/** CSS custom properties string — inject into :root in globals.css */
export const cssVars = `
  --color-bg-base:      ${tokens.bgBase};
  --color-surface-1:    ${tokens.bgSurface1};
  --color-surface-2:    ${tokens.bgSurface2};
  --color-glass:        ${tokens.bgGlass};
  --color-border-faint: ${tokens.borderFaint};
  --color-border-mid:   ${tokens.borderMid};
  --color-lime:         ${tokens.accentLime};
  --color-cyan-accent:  ${tokens.accentCyan};
  --color-orange:       ${tokens.accentOrange};
  --color-purple:       ${tokens.accentPurple};
  --color-red-accent:   ${tokens.accentRed};
  --color-gold:         ${tokens.accentGold};
  --color-violet:       ${tokens.violet};
  --color-cyan:         ${tokens.cyan};
  --color-rose:         ${tokens.rose};
  --text-primary:       ${tokens.textPrimary};
  --text-secondary:     ${tokens.textSecondary};
  --text-mid:           ${tokens.textMid};
`
