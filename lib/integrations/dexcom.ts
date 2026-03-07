// lib/integrations/dexcom.ts
// Dexcom OAuth 2.0 + Estimated Glucose Values (EGV) API client
// Sandbox: https://sandbox-api.dexcom.com  |  Production: https://api.dexcom.com
// Docs: https://developer.dexcom.com/authentication

import { DexcomCredentials, CGMReading } from '@/lib/types'

const BASE = process.env.DEXCOM_SANDBOX === 'true'
  ? 'https://sandbox-api.dexcom.com'
  : 'https://api.dexcom.com'

const CLIENT_ID     = process.env.DEXCOM_CLIENT_ID     ?? ''
const CLIENT_SECRET = process.env.DEXCOM_CLIENT_SECRET ?? ''
const REDIRECT_URI  = process.env.DEXCOM_REDIRECT_URI  ?? ''

// ── OAuth helpers ─────────────────────────────────────────────────────────────

export function getDexcomAuthUrl(uid: string): string {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         'offline_access egv',
    state:         uid,
  })
  return `${BASE}/v2/oauth2/login?${params}`
}

export async function exchangeCodeForTokens(code: string): Promise<DexcomCredentials> {
  const resp = await fetch(`${BASE}/v2/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type:    'authorization_code',
      redirect_uri:  REDIRECT_URI,
    }),
  })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Dexcom token exchange failed ${resp.status}: ${body}`)
  }
  const data = await resp.json()
  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:    Date.now() + (data.expires_in as number) * 1000,
    scope:        data.scope ?? 'offline_access egv',
    connectedAt:  new Date().toISOString(),
  }
}

export async function refreshDexcomToken(creds: DexcomCredentials): Promise<DexcomCredentials> {
  const resp = await fetch(`${BASE}/v2/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: creds.refreshToken,
      grant_type:    'refresh_token',
    }),
  })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Dexcom token refresh failed ${resp.status}: ${body}`)
  }
  const data = await resp.json()
  return {
    ...creds,
    accessToken:  data.access_token,
    refreshToken: data.refresh_token ?? creds.refreshToken,
    expiresAt:    Date.now() + (data.expires_in as number) * 1000,
  }
}

// Returns valid credentials, refreshing if needed
export async function getValidTokens(creds: DexcomCredentials): Promise<DexcomCredentials> {
  if (Date.now() < creds.expiresAt - 60_000) return creds
  return refreshDexcomToken(creds)
}

// ── EGV fetch ─────────────────────────────────────────────────────────────────

interface DexcomEGVRaw {
  systemTime:  string
  displayTime: string
  value:       number  // mg/dL
  trend?:      string
  trendRate?:  number  // mg/dL/min
}

export async function fetchEGVs(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<DexcomEGVRaw[]> {
  const params = new URLSearchParams({
    startDate: `${startDate}T00:00:00`,
    endDate:   `${endDate}T23:59:59`,
  })
  const resp = await fetch(`${BASE}/v3/users/self/egvs?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Dexcom EGV fetch failed ${resp.status}: ${body}`)
  }
  const data = await resp.json()
  return (data.egvs ?? []) as DexcomEGVRaw[]
}

// ── Unit conversion ───────────────────────────────────────────────────────────

export function mgdlToMmol(mgdl: number): number {
  return Math.round((mgdl / 18.0182) * 10) / 10
}

// ── Trend display ─────────────────────────────────────────────────────────────

export function dexcomTrendArrow(trend?: string): string {
  const arrows: Record<string, string> = {
    RISING_QUICKLY:   '↑↑',
    RISING:           '↑',
    RISING_SLIGHTLY:  '↗',
    STEADY:           '→',
    FALLING_SLIGHTLY: '↘',
    FALLING:          '↓',
    FALLING_QUICKLY:  '↓↓',
    NONE:             '–',
    NOT_COMPUTABLE:   '–',
  }
  return arrows[trend ?? ''] ?? '→'
}

export function trendColor(trend?: string): string {
  if (!trend) return '#22d3ee'
  if (trend.includes('FALLING_QUICKLY') || trend.includes('RISING_QUICKLY')) return '#ef4444'
  if (trend.includes('FALLING') || trend.includes('RISING')) return '#f59e0b'
  return '#10b981'
}

// ── Transform raw EGVs → CGMReading[] ────────────────────────────────────────

export function egvsToCGMReadings(raws: DexcomEGVRaw[]): CGMReading[] {
  return raws.map(r => ({
    time:      r.displayTime.slice(11, 16),  // HH:MM from displayTime
    valueMmol: mgdlToMmol(r.value),
    trend:     r.trend,
    trendRate: r.trendRate != null ? Math.round((r.trendRate / 18.0182) * 100) / 100 : undefined,
    source:    'dexcom' as const,
  }))
}

// ── Time-in-range calculation ─────────────────────────────────────────────────

export function calcTimeInRange(readings: CGMReading[], lowMmol = 3.9, highMmol = 10.0): number {
  if (readings.length === 0) return 0
  const inRange = readings.filter(r => r.valueMmol >= lowMmol && r.valueMmol <= highMmol).length
  return Math.round((inRange / readings.length) * 100)
}

export function calcAvgMmol(readings: CGMReading[]): number {
  if (readings.length === 0) return 0
  return Math.round((readings.reduce((s, r) => s + r.valueMmol, 0) / readings.length) * 10) / 10
}
