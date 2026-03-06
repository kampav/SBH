// app/terms/page.tsx — Terms of Service
// Version: 1.0 — effective 6 March 2026

export const dynamic = 'force-dynamic'

const LAST_UPDATED = '6 March 2026'
const VERSION      = '1.0'

export default function TermsPage() {
  return (
    <main className="min-h-screen mesh-bg py-16 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-1">Terms of Service</h1>
          <p className="text-sm text-2">Version {VERSION} · Last updated: {LAST_UPDATED}</p>
        </header>

        <div className="glass rounded-2xl p-6 space-y-6 text-sm text-2 leading-relaxed">

          {/* 1 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-1">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using SBH (Science Based Health), you agree to be bound by these
              Terms of Service and our Privacy Policy. If you do not agree, do not use the service.
            </p>
            <p>
              You must be at least 18 years old to use SBH. By registering, you confirm that you are 18
              years of age or older.
            </p>
          </section>

          {/* 2 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-1">2. Description of Service</h2>
            <p>
              SBH is a personal health and fitness tracking application that provides tools for
              nutrition logging, workout tracking, body metrics, sleep monitoring, and glucose
              management. All AI-generated content and calculations are provided for informational
              purposes only.
            </p>
            <p className="font-semibold text-1">
              SBH is not a medical device, clinical tool, or substitute for professional medical advice,
              diagnosis, or treatment. Always consult a qualified healthcare provider before making
              changes to your diet, exercise routine, or managing a medical condition.
            </p>
          </section>

          {/* 3 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-1">3. Health Data — Special Category Information</h2>
            <p>
              SBH processes health-related data including body metrics, glucose readings, sleep patterns,
              and dietary information. Under the UK GDPR, EU GDPR, India DPDP Act 2023, and UAE
              PDPL 2021, this constitutes special category personal data.
            </p>
            <p>
              By creating an account and enabling features such as glucose tracking, you provide explicit,
              informed consent for SBH to process this data as described in our Privacy Policy. You may
              withdraw consent at any time by deleting your account.
            </p>
          </section>

          {/* 4 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-1">4. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials. You
              agree to notify us immediately of any unauthorised use of your account. We reserve the
              right to terminate accounts that violate these terms.
            </p>
          </section>

          {/* 5 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-1">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Use SBH for any unlawful purpose</li>
              <li>Attempt to reverse engineer, scrape, or extract data from the service</li>
              <li>Share your account with others</li>
              <li>Upload content that is abusive, illegal, or violates third-party rights</li>
            </ul>
          </section>

          {/* 6 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-1">6. AI-Generated Content</h2>
            <p>
              SBH uses AI models (including Claude by Anthropic) to generate nutritional analysis,
              workout insights, glucose predictions, and health recommendations. All AI outputs:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Are for informational purposes only</li>
              <li>Are not validated clinical recommendations</li>
              <li>Must not be used as a basis for medication adjustments</li>
              <li>Should be discussed with your healthcare provider before acting on them</li>
            </ul>
          </section>

          {/* 7 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-1">7. Subscription and Billing</h2>
            <p>
              SBH offers Free, Pro, and Premium subscription tiers. Paid subscriptions are billed
              monthly or annually via Stripe. You may cancel your subscription at any time; cancellation
              takes effect at the end of the current billing period. Refunds are not provided for
              partial billing periods unless required by applicable law.
            </p>
          </section>

          {/* 8 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-1">8. Data Portability and Deletion</h2>
            <p>
              Under GDPR Article 20, you have the right to receive your personal data in a portable
              format. You can export all your data as a CSV file from your profile settings at any time.
            </p>
            <p>
              Under GDPR Article 17, you have the right to erasure. You can permanently delete your
              account and all associated data via the Account Deletion page. Deletion is irreversible.
            </p>
          </section>

          {/* 9 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-1">9. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, SBH and its operators shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising from your use of
              the service, including any health outcomes resulting from reliance on information provided
              by the app.
            </p>
          </section>

          {/* 10 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-1">10. Changes to Terms</h2>
            <p>
              We may update these Terms of Service from time to time. We will notify you of material
              changes via email or in-app notification. Continued use of SBH after changes constitutes
              acceptance of the updated terms.
            </p>
          </section>

          {/* 11 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-1">11. Governing Law</h2>
            <p>
              These terms are governed by the laws of England and Wales. Any disputes shall be resolved
              in the courts of England and Wales, without prejudice to any mandatory consumer protection
              laws in your jurisdiction.
            </p>
          </section>

          {/* 12 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-1">12. Contact</h2>
            <p>
              For questions about these Terms, contact us at{' '}
              <a href="mailto:legal@sbhapp.co.uk" className="text-violet-400 hover:underline">
                legal@sbhapp.co.uk
              </a>
            </p>
          </section>
        </div>

        <p className="text-center text-xs text-3">
          By using SBH you confirm you have read and agree to these Terms of Service.
        </p>
      </div>
    </main>
  )
}
