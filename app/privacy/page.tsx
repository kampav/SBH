// Static privacy policy — no auth required, publicly accessible for Google Play Store.
export const dynamic = 'force-static'

import Link from 'next/link'

const LAST_UPDATED = '5 March 2026'
const CONTACT_EMAIL = 'privacy@sciencebasedhealth.app'
const APP_NAME = 'Science Based Health (SBH)'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-300">
      {/* Header */}
      <header className="border-b border-slate-800 px-4 py-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
          <span className="text-sm font-black text-white">SBH</span>
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">Privacy Policy</h1>
          <p className="text-xs text-slate-500">Science Based Health · Last updated {LAST_UPDATED}</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8 text-sm leading-relaxed">

        <section>
          <p>
            This Privacy Policy explains how <strong className="text-white">{APP_NAME}</strong>{' '}
            (&quot;we&quot;, &quot;our&quot;, &quot;the app&quot;) collects, uses, stores, and protects your personal data when
            you use our mobile application and web service. By creating an account or using the app,
            you agree to the practices described here.
          </p>
        </section>

        {/* 1 */}
        <Section title="1. Data We Collect">
          <SubSection title="Account information">
            <Li>Full name and email address (provided at registration)</Li>
            <Li>Profile photo (optional — uploaded by you)</Li>
            <Li>Authentication credentials managed by Google Firebase</Li>
          </SubSection>
          <SubSection title="Health & fitness data">
            <Li>Age, biological sex, height, and body weight</Li>
            <Li>Target weight and fitness goal</Li>
            <Li>Daily body-weight log entries</Li>
            <Li>Body measurements (chest, waist, neck, hips, bicep — optional)</Li>
            <Li>Body-fat percentage estimates (optional)</Li>
          </SubSection>
          <SubSection title="Activity & nutrition data">
            <Li>Workout logs: exercises completed, sets, reps, weights, duration</Li>
            <Li>Nutrition logs: meals, calories, and macronutrients you enter</Li>
            <Li>Water intake records</Li>
            <Li>Cardio activity records</Li>
          </SubSection>
          <SubSection title="Usage data">
            <Li>App settings and preferences stored locally on your device</Li>
            <Li>Session-level analytics collected by Firebase (crash reports, performance)</Li>
          </SubSection>
        </Section>

        {/* 2 */}
        <Section title="2. How We Use Your Data">
          <p>We use your data solely to provide and improve the app:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Calculate personalised calorie and macro targets using the Mifflin-St Jeor formula</li>
            <li>Generate AI-powered food identification results and nutrition estimates via the Claude API (Anthropic)</li>
            <li>Display your progress trends in charts and dashboards</li>
            <li>Provide progressive-overload hints based on your previous workout logs</li>
            <li>Maintain streaks, XP, and milestone tracking</li>
          </ul>
          <p className="mt-3 text-slate-400">
            We do <strong className="text-white">not</strong> use your data for advertising, do not
            sell it to third parties, and do not share it with any party outside those listed in
            section 3.
          </p>
        </Section>

        {/* 3 */}
        <Section title="3. Third-Party Services">
          <table className="w-full text-xs border-collapse mt-2">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="text-left py-2 pr-4 font-semibold">Service</th>
                <th className="text-left py-2 pr-4 font-semibold">Provider</th>
                <th className="text-left py-2 font-semibold">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {[
                ['Firebase Auth', 'Google LLC', 'Secure account authentication'],
                ['Cloud Firestore', 'Google LLC', 'Encrypted cloud storage of your app data'],
                ['Firebase Storage', 'Google LLC', 'Profile photo storage'],
                ['Claude AI API', 'Anthropic PBC', 'Food photo analysis & AI nutrition lookup'],
                ['Open Food Facts', 'Open Food Facts', 'Barcode nutrition lookup (no account data sent)'],
              ].map(([svc, prov, purpose]) => (
                <tr key={svc} className="text-slate-400">
                  <td className="py-2 pr-4 text-white font-medium">{svc}</td>
                  <td className="py-2 pr-4">{prov}</td>
                  <td className="py-2">{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-500">
            Each provider has its own privacy policy. Google&apos;s policy applies to Firebase services;
            Anthropic&apos;s policy applies to Claude API calls. Food images sent for AI analysis are
            processed ephemerally and not stored by Anthropic beyond the API request.
          </p>
        </Section>

        {/* 4 */}
        <Section title="4. Data Storage & Security">
          <ul className="list-disc pl-5 space-y-1">
            <li>All cloud data is stored in Google Cloud (Firestore) with encryption at rest and in transit</li>
            <li>Authentication tokens are stored securely in device storage (IndexedDB on Android; localStorage on web)</li>
            <li>App preferences are stored locally on your device and are not transmitted to our servers</li>
            <li>Our Cloud Run service runs in the <strong className="text-white">europe-west2 (London)</strong> region</li>
          </ul>
        </Section>

        {/* 5 */}
        <Section title="5. Data Retention">
          <p>
            Your data is retained for as long as your account is active. If you delete your account,
            all associated data is permanently removed from our systems within <strong className="text-white">72 hours</strong>.
            Backups are purged within <strong className="text-white">30 days</strong>.
          </p>
        </Section>

        {/* 6 */}
        <Section title="6. Your Rights">
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong className="text-white">Access</strong> — view all data stored in the app at any time</li>
            <li><strong className="text-white">Correct</strong> — update your profile via the onboarding flow</li>
            <li><strong className="text-white">Delete</strong> — permanently erase all your data (see below)</li>
            <li><strong className="text-white">Export</strong> — contact us to request a copy of your data</li>
          </ul>
        </Section>

        {/* 7 */}
        <Section title="7. Account & Data Deletion">
          <p>
            You can permanently delete your account and all associated data at any time. Deletion
            is irreversible and removes all health data, workout logs, nutrition entries, body
            measurements, and your profile.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <Link href="/delete-account"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: '#ef4444' }}>
              Delete My Account
            </Link>
            <Link href="/login"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">
              Sign In First
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            You must be signed in to complete deletion. A confirmation email is sent to your
            registered address after your data is removed.
          </p>
        </Section>

        {/* 8 */}
        <Section title="8. Children's Privacy">
          <p>
            {APP_NAME} is not directed at children under 13. We do not knowingly collect personal
            data from anyone under 13 years of age. If you believe a child has provided us with
            data, please contact us and we will delete it promptly.
          </p>
        </Section>

        {/* 9 */}
        <Section title="9. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will update the
            &quot;Last updated&quot; date at the top of this page. Continued use of the app after changes
            constitutes acceptance of the revised policy.
          </p>
        </Section>

        {/* 10 */}
        <Section title="10. India — Digital Personal Data Protection Act 2023 (DPDP)">
          <p>
            If you access {APP_NAME} from India, the following additional rights and obligations
            apply under the <strong className="text-white">Digital Personal Data Protection Act 2023</strong> (DPDP Act):
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <strong className="text-white">Consent</strong> — We process your personal data only on the basis of your
              free, informed, specific, and unconditional consent. You may withdraw consent at any time by deleting your
              account (see section 7).
            </li>
            <li>
              <strong className="text-white">Notice</strong> — We have provided this Policy in clear language to inform
              you of the nature and purpose of processing before collection.
            </li>
            <li>
              <strong className="text-white">Right to Correction & Erasure</strong> — You have the right to correct
              inaccurate personal data and to erase personal data that is no longer necessary for the purpose for which
              it was collected.
            </li>
            <li>
              <strong className="text-white">Right to Grievance Redressal</strong> — To raise a grievance, contact our
              Data Protection Officer at <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400">{CONTACT_EMAIL}</a>.
              We will respond within <strong className="text-white">30 days</strong>.
            </li>
            <li>
              <strong className="text-white">Children&apos;s data</strong> — We do not knowingly process personal data of
              individuals under 18 years of age. Verifiable parental consent is required for users under 18.
            </li>
            <li>
              <strong className="text-white">Data Fiduciary</strong> — Science Based Health acts as the Data Fiduciary
              under the DPDP Act for data collected through this application.
            </li>
            <li>
              <strong className="text-white">Cross-border transfers</strong> — Your data is stored in Google Cloud
              (europe-west2) and may be processed in the United States (Anthropic API). These transfers occur under
              standard contractual safeguards consistent with DPDP requirements as notified by the Government of India.
            </li>
          </ul>
        </Section>

        {/* 11 */}
        <Section title="11. UAE — Personal Data Protection Law 2021 (PDPL)">
          <p>
            If you access {APP_NAME} from the United Arab Emirates, the following additional rights and
            obligations apply under <strong className="text-white">Federal Decree-Law No. 45 of 2021</strong> on the
            Protection of Personal Data (PDPL):
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <strong className="text-white">Lawful basis</strong> — We process your personal data based on your
              explicit consent provided during registration and, where applicable, for the performance of our contract
              with you.
            </li>
            <li>
              <strong className="text-white">Special category data</strong> — Health and fitness information
              constitutes sensitive personal data under UAE PDPL. We process such data only with your explicit consent
              and implement enhanced security measures accordingly.
            </li>
            <li>
              <strong className="text-white">Your rights</strong> — You have the right to: access your personal data;
              correct inaccurate data; request erasure of data no longer required; object to processing; and request
              restriction of processing.
            </li>
            <li>
              <strong className="text-white">Cross-border transfers</strong> — We transfer personal data outside the
              UAE to Google Cloud (EU) and Anthropic (USA). Such transfers are made under safeguards that ensure an
              adequate level of protection consistent with UAE PDPL requirements.
            </li>
            <li>
              <strong className="text-white">Data Protection Officer</strong> — For UAE-specific data requests or
              complaints, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400">{CONTACT_EMAIL}</a>.
            </li>
          </ul>
        </Section>

        {/* 12 */}
        <Section title="12. Contact Us">
          <p>
            For privacy-related questions, data requests, or to report a concern, contact us at:
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`}
            className="inline-block mt-2 text-violet-400 hover:text-violet-300 font-medium">
            {CONTACT_EMAIL}
          </a>
        </Section>

        {/* Footer */}
        <footer className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">{APP_NAME} · {LAST_UPDATED}</p>
          <div className="flex gap-4 text-xs">
            <Link href="/deleteaccount" className="text-slate-500 hover:text-slate-300 transition-colors">
              Delete Account
            </Link>
            <Link href="/" className="text-violet-400 hover:text-violet-300 transition-colors">
              Back to App
            </Link>
          </div>
        </footer>
      </div>
    </main>
  )
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-white font-bold text-base border-b border-slate-800 pb-2">{title}</h2>
      {children}
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <h3 className="text-slate-300 font-semibold text-xs uppercase tracking-wider mb-1.5">{title}</h3>
      <ul className="list-disc pl-5 space-y-1">{children}</ul>
    </div>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>
}
