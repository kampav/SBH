'use client'

import { Activity, Shield, AlertTriangle } from 'lucide-react'

interface Props {
  onAccept: () => void
  onDecline: () => void
}

export default function GlucoseConsentModal({ onAccept, onDecline }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(3,5,10,0.88)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-strong rounded-t-3xl p-6 max-w-lg w-full space-y-4"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>

        <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.15)' }}>
          <Activity size={24} style={{ color: '#10b981' }} />
        </div>

        <h2 className="text-center font-bold text-lg text-1">Glucose Tracking</h2>

        <div className="glass rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} style={{ color: '#06b6d4' }} />
            <p className="text-xs font-semibold text-1">Your data &amp; privacy</p>
          </div>
          <ul className="space-y-1.5 text-xs text-2">
            <li>• Blood glucose is <strong className="text-1">special category health data</strong> under UK GDPR</li>
            <li>• Stored securely in your account on Google Cloud (europe-west2)</li>
            <li>• Encrypted in transit and at rest — only you can access it</li>
            <li>• Never shared with third parties</li>
            <li>• Delete at any time via Profile → Delete Account</li>
          </ul>
        </div>

        <div className="rounded-2xl p-4 space-y-2"
          style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} style={{ color: '#f43f5e' }} />
            <p className="text-xs font-semibold" style={{ color: '#f43f5e' }}>Medical disclaimer</p>
          </div>
          <p className="text-xs text-2 leading-relaxed">
            This feature is for <strong className="text-1">personal tracking and informational purposes only</strong>.
            It does not provide medical advice, diagnosis, or treatment.
            AI predictions are nutritional estimates — not a substitute for professional medical care.
            <strong className="text-1"> Never adjust insulin or any medication based on this app.</strong>
            Always consult your healthcare team for clinical decisions.
          </p>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onDecline}
            className="flex-1 py-3.5 rounded-2xl text-sm font-medium text-2 glass transition-all">
            Not now
          </button>
          <button onClick={onAccept}
            className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            I understand — Enable
          </button>
        </div>

        <p className="text-center text-xs text-3">
          You can disable glucose tracking anytime in Profile
        </p>
      </div>
    </div>
  )
}
