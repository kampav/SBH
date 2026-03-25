'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import {
  getProfile, getMetrics, getNutritionHistory, getRecentWorkouts,
  getSleepHistory, getMoodHistory, getPHQ9History, getGAD7History,
  getBloodPressureHistory,
} from '@/lib/firebase/firestore'
import { UserProfile, DailyMetric, DailyNutrition, DailyWorkout, SleepEntry, MoodEntry, PHQ9Assessment, GAD7Assessment, BloodPressureReading } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft, FileText, Share2, Download, Printer } from 'lucide-react'

// ── Date helpers ──────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10)
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
function avg(nums: number[]) {
  return nums.length ? Math.round(nums.reduce((s, n) => s + n, 0) / nums.length * 10) / 10 : null
}


const PHQ9_SEVERITY: Record<string, string> = {
  minimal: 'Minimal (0–4)', mild: 'Mild (5–9)', moderate: 'Moderate (10–14)',
  moderately_severe: 'Moderately Severe (15–19)', severe: 'Severe (20–27)',
}
const GAD7_SEVERITY: Record<string, string> = {
  minimal: 'Minimal (0–4)', mild: 'Mild (5–9)', moderate: 'Moderate (10–14)', severe: 'Severe (15–21)',
}

interface ReportData {
  profile: UserProfile
  metrics: DailyMetric[]
  nutrition: DailyNutrition[]
  workouts: DailyWorkout[]
  sleep: SleepEntry[]
  mood: MoodEntry[]
  phq9: PHQ9Assessment[]
  gad7: GAD7Assessment[]
  bp: BloodPressureReading[]
}

export default function ReportsPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ReportData | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      if (!u) { router.replace('/login'); return }
      setUid(u.uid)
      setAuthReady(true)
    })
    return unsub
  }, [router])

  const loadData = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    try {
      const [profile, metrics, nutrition, workouts, sleep, mood, phq9, gad7, bp] = await Promise.all([
        getProfile(uid),
        getMetrics(uid, 90),
        getNutritionHistory(uid, 30),
        getRecentWorkouts(uid, 30),
        getSleepHistory(uid, 30),
        getMoodHistory(uid, 30),
        getPHQ9History(uid, 6),
        getGAD7History(uid, 6),
        getBloodPressureHistory(uid, 30),
      ])
      if (profile) {
        setData({ profile, metrics, nutrition, workouts, sleep, mood, phq9, gad7, bp })
      }
    } catch {
      // best-effort
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    if (uid) loadData()
  }, [uid, loadData])

  function handlePrint() {
    window.print()
  }

  async function handleShare() {
    if (!navigator.share) {
      alert('Sharing is not supported on this device. Use the print button to save as PDF.')
      return
    }
    await navigator.share({
      title: `SBH Health Report — ${data?.profile.displayName ?? 'Patient'}`,
      text: `Health summary generated on ${formatDate(today)} via SBH.`,
    })
  }

  if (!authReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-2">No profile data found.</p>
          <Link href="/onboarding" className="text-xs text-violet-400 underline">Complete onboarding</Link>
        </div>
      </div>
    )
  }

  const { profile, metrics, nutrition, workouts, sleep, mood, phq9, gad7, bp } = data
  const conditions = profile.conditionProfile?.conditions ?? []

  // ── Computed stats ────────────────────────────────────────────────────────
  const weightEntries = metrics.filter(m => m.weightKg > 0)
  const latestWeight = weightEntries[weightEntries.length - 1]?.weightKg
  const firstWeight = weightEntries[0]?.weightKg
  const weightChange = latestWeight && firstWeight ? Math.round((latestWeight - firstWeight) * 10) / 10 : null

  const avgCalories = avg(nutrition.map(n => n.totalCalories))
  const avgProtein  = avg(nutrition.map(n => n.totalProteinG))
  const workoutCount = workouts.length
  const avgSleep = avg(sleep.map(s => s.durationH))
  const avgMood  = avg(mood.map(m => m.mood))

  const latestPHQ9 = phq9[0]
  const latestGAD7 = gad7[0]

  const bpSystolic = avg(bp.map(r => r.systolic))
  const bpDiastolic = avg(bp.map(r => r.diastolic))

  const SECTION_STYLE = 'glass rounded-2xl p-5 space-y-3 print:rounded-none print:border print:border-gray-200'
  const LABEL_STYLE   = 'text-xs font-semibold uppercase tracking-wider text-3 mb-2'
  const STAT_ROW = 'flex items-center justify-between py-1.5 border-b last:border-0'

  return (
    <div className="min-h-screen mesh-bg pb-24 print:bg-white print:pb-4">
      {/* Header — hidden when printing */}
      <div className="sticky top-0 z-30 glass-strong border-b print:hidden" style={{ borderColor: 'var(--sbh-border)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl glass-elevated">
            <ArrowLeft size={16} style={{ color: 'var(--text-3)' }} />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-1">Care Team Report</h1>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>30-day health summary for your GP / care team</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleShare} className="p-2 rounded-xl glass-elevated" title="Share">
              <Share2 size={15} style={{ color: 'var(--text-3)' }} />
            </button>
            <button onClick={handlePrint} className="p-2 rounded-xl glass-elevated" title="Print / Save PDF">
              <Printer size={15} style={{ color: 'var(--text-3)' }} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4 print:px-0 print:pt-0">

        {/* Report title (shown when printing) */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">SBH Health Report</h1>
          <p className="text-sm text-gray-500 mt-1">Generated {formatDate(today)}</p>
        </div>

        {/* Patient info */}
        <div className={SECTION_STYLE}>
          <p className={LABEL_STYLE}>Patient</p>
          <div className="space-y-1">
            <div className={STAT_ROW} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span className="text-xs text-2">Name</span>
              <span className="text-sm font-semibold text-1">{profile.displayName || '—'}</span>
            </div>
            <div className={STAT_ROW} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span className="text-xs text-2">Age / Sex</span>
              <span className="text-sm font-semibold text-1">{profile.age}y {profile.sex}</span>
            </div>
            <div className={STAT_ROW} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span className="text-xs text-2">Current weight</span>
              <span className="text-sm font-semibold text-1">{latestWeight ?? '—'} kg</span>
            </div>
            <div className={STAT_ROW} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span className="text-xs text-2">BMI</span>
              <span className="text-sm font-semibold text-1">{latestWeight ? Math.round(latestWeight / ((profile.heightCm / 100) ** 2) * 10) / 10 : '—'}</span>
            </div>
            <div className={STAT_ROW} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span className="text-xs text-2">Reported conditions</span>
              <span className="text-sm font-semibold text-1 text-right max-w-48">
                {conditions.length > 0 ? conditions.join(', ') : 'None reported'}
              </span>
            </div>
            <div className={STAT_ROW} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span className="text-xs text-2">Medication managed</span>
              <span className="text-sm font-semibold text-1">{profile.conditionProfile?.onMedication ? 'Yes' : 'No / Not specified'}</span>
            </div>
          </div>
        </div>

        {/* Report period */}
        <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
          <FileText size={16} style={{ color: '#7c3aed' }} />
          <p className="text-xs text-2">
            Report covers <strong className="text-1">30 days</strong> of self-reported data.
            All values are patient-logged; not clinically validated.
          </p>
        </div>

        {/* Nutrition */}
        <div className={SECTION_STYLE}>
          <p className={LABEL_STYLE}>Nutrition (30-day average)</p>
          <div className="space-y-1">
            {[
              ['Avg daily calories', avgCalories ? `${avgCalories} kcal` : '—', profile.calorieTarget ? `Target: ${profile.calorieTarget} kcal` : null],
              ['Avg daily protein',  avgProtein  ? `${avgProtein}g` : '—', profile.proteinTargetG ? `Target: ${profile.proteinTargetG}g` : null],
              ['Days logged',        `${nutrition.length} / 30`, null],
            ].map(([label, value, sub]) => (
              <div key={label} className={STAT_ROW} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                  <span className="text-xs text-2">{label}</span>
                  {sub && <p className="text-xs" style={{ color: 'var(--text-3)' }}>{sub}</p>}
                </div>
                <span className="text-sm font-semibold text-1">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Physical activity */}
        <div className={SECTION_STYLE}>
          <p className={LABEL_STYLE}>Physical Activity (30 days)</p>
          <div className="space-y-1">
            {[
              ['Workout sessions', `${workoutCount}`, null],
              ['Avg sessions / week', `${Math.round(workoutCount / 4.3 * 10) / 10}`, 'NHS recommendation: ≥2×/week'],
              ['Total volume tracked', workouts.length ? `${Math.round(workouts.reduce((s, w) => s + w.totalVolumeKg, 0))} kg` : '—', null],
            ].map(([label, value, sub]) => (
              <div key={label} className={STAT_ROW} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                  <span className="text-xs text-2">{label}</span>
                  {sub && <p className="text-xs" style={{ color: 'var(--text-3)' }}>{sub}</p>}
                </div>
                <span className="text-sm font-semibold text-1">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sleep */}
        <div className={SECTION_STYLE}>
          <p className={LABEL_STYLE}>Sleep (30-day average)</p>
          <div className="space-y-1">
            {[
              ['Avg sleep duration', avgSleep ? `${avgSleep}h` : '—', 'NHS recommendation: 7–9h/night'],
              ['Days logged', `${sleep.length} / 30`, null],
            ].map(([label, value, sub]) => (
              <div key={label} className={STAT_ROW} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                  <span className="text-xs text-2">{label}</span>
                  {sub && <p className="text-xs" style={{ color: 'var(--text-3)' }}>{sub}</p>}
                </div>
                <span className="text-sm font-semibold text-1">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weight trend */}
        {weightEntries.length > 1 && (
          <div className={SECTION_STYLE}>
            <p className={LABEL_STYLE}>Weight Trend (last 90 days)</p>
            <div className="space-y-1">
              {[
                ['Starting weight', firstWeight ? `${firstWeight} kg` : '—', null],
                ['Current weight', latestWeight ? `${latestWeight} kg` : '—', null],
                ['Change', weightChange !== null ? `${weightChange > 0 ? '+' : ''}${weightChange} kg` : '—', null],
              ].map(([label, value]) => (
                <div key={label} className={STAT_ROW} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-xs text-2">{label}</span>
                  <span className="text-sm font-semibold text-1">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mental health screening */}
        {(latestPHQ9 || latestGAD7 || mood.length > 0) && (
          <div className={SECTION_STYLE}>
            <p className={LABEL_STYLE}>Mental Wellbeing</p>
            <div className="space-y-1">
              {avgMood !== null && (
                <div className={STAT_ROW} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div>
                    <span className="text-xs text-2">Avg mood score (30 days)</span>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>1=very low, 5=excellent (self-reported)</p>
                  </div>
                  <span className="text-sm font-semibold text-1">{avgMood} / 5</span>
                </div>
              )}
              {latestPHQ9 && (
                <div className={STAT_ROW} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div>
                    <span className="text-xs text-2">PHQ-9 (last taken {formatDate(latestPHQ9.date)})</span>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>Patient Health Questionnaire © Pfizer Inc.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-1">{latestPHQ9.totalScore} / 27</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{PHQ9_SEVERITY[latestPHQ9.severity]}</p>
                  </div>
                </div>
              )}
              {latestGAD7 && (
                <div className={STAT_ROW} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div>
                    <span className="text-xs text-2">GAD-7 (last taken {formatDate(latestGAD7.date)})</span>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>Generalised Anxiety Disorder Scale © Pfizer Inc.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-1">{latestGAD7.totalScore} / 21</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{GAD7_SEVERITY[latestGAD7.severity]}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Blood pressure */}
        {bp.length > 0 && (
          <div className={SECTION_STYLE}>
            <p className={LABEL_STYLE}>Blood Pressure (30-day average)</p>
            <div className="space-y-1">
              {[
                ['Avg systolic', bpSystolic ? `${bpSystolic} mmHg` : '—', 'Normal: <130 mmHg (AHA)'],
                ['Avg diastolic', bpDiastolic ? `${bpDiastolic} mmHg` : '—', 'Normal: <80 mmHg (AHA)'],
                ['Readings logged', `${bp.length}`, null],
              ].map(([label, value, sub]) => (
                <div key={label} className={STAT_ROW} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div>
                    <span className="text-xs text-2">{label}</span>
                    {sub && <p className="text-xs" style={{ color: 'var(--text-3)' }}>{sub}</p>}
                  </div>
                  <span className="text-sm font-semibold text-1">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Glucose (if conditions include diabetes) */}
        {conditions.some(c => c === 'type2_diabetes' || c === 'prediabetes') && (
          <div className={SECTION_STYLE} style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className={LABEL_STYLE} style={{ color: '#fca5a5' }}>Glucose / Diabetes</p>
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>
              Glucose data is available in the full app. Connect Dexcom or FreeStyle Libre CGM for detailed
              time-in-range analytics, glucose trend charts, and HbA1c estimates to include in this report.
            </p>
            <Link href="/settings/integrations"
              className="inline-flex items-center gap-1.5 text-xs font-semibold mt-1"
              style={{ color: '#7c3aed' }}>
              Connect CGM →
            </Link>
          </div>
        )}

        {/* Disclaimer */}
        <div className="glass rounded-2xl p-4 space-y-2" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-xs font-semibold text-3 uppercase tracking-wider">Important disclaimer</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
            This report contains self-reported data logged by the patient using the SBH app. Values have not been
            clinically validated. This report is intended to support (not replace) clinical assessment. All screening
            scores (PHQ-9, GAD-7) are patient-completed questionnaires. Please interpret in the context of a full
            clinical assessment.
          </p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            SBH is a CE-unmarked consumer wellness application. It is not a medical device.
          </p>
        </div>

        {/* Print/share buttons */}
        <div className="flex gap-3 print:hidden">
          <button onClick={handlePrint}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff' }}>
            <Download size={15} /> Save as PDF
          </button>
          <button onClick={handleShare}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 glass text-1">
            <Share2 size={15} /> Share
          </button>
        </div>
      </div>
    </div>
  )
}
