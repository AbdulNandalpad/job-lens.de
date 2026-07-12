import Link from 'next/link'

const navy = '#042C53'
const saffron = '#FF9933'
const indiaGreen = '#138808'
const textMuted = '#6b7c93'
const border = '#edf1f6'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: navy, marginBottom: 12, marginTop: 0 }}>{title}</h2>
      <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans',sans-serif" }}>
      {/* Google Fonts CDN removed — IP would be sent to Google, violating GDPR G10.
          Fonts are loaded via Next.js font optimization (self-hosted) in layout.tsx. */}

      {/* Navbar */}
      <div style={{ background: navy, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/in" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="22" height="22" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke={saffron} strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="8" fill="none" stroke={saffron} strokeWidth="1.2" opacity="0.5"/>
            <circle cx="20" cy="20" r="3" fill={saffron}/>
            <line x1="28" y1="28" x2="36" y2="36" stroke={saffron} strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: '#fff' }}>
            Job-Lens <span style={{ color: saffron }}>India</span>
          </span>
        </Link>
        <Link href="/in" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>&larr; Back to home</Link>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 28, fontWeight: 700, color: navy, margin: '0 0 8px', paddingLeft: 14, borderLeft: `3px solid ${saffron}` }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>
            Job-Lens India · Compliant with GDPR (EU) 2016/679 and India&apos;s Digital Personal Data Protection Act, 2023 · Last updated: May 2026
          </p>
        </div>

        <Section title="1. Data Controller">
          <p style={{ margin: '0 0 8px' }}>
            The data controller responsible for processing your personal data is:
          </p>
          <p style={{ margin: 0 }}>
            <strong>Munira Nandalpad</strong><br />
            Brühlstr 15, 71034 Böblingen, Germany<br />
            Email:{' '}
            <a href="mailto:munira.nandalpad@job-lens.de" style={{ color: saffron }}>
              munira.nandalpad@job-lens.de
            </a>
          </p>
          <p style={{ margin: '12px 0 0', padding: '12px 14px', background: '#fff', borderRadius: 10, border: `1px solid ${border}` }}>
            <strong>India DPDP Act notice:</strong> Job-Lens processes personal data of Indian data principals (users) as a &ldquo;Data Fiduciary&rdquo; under the Digital Personal Data Protection Act, 2023. You have the rights set out in Section 6 below, including the right to erasure of your data.
          </p>
        </Section>

        <Section title="2. What Data We Collect and Why">
          <p style={{ margin: '0 0 12px' }}>We process your personal data only to the extent necessary to provide our service.</p>

          <p style={{ margin: '0 0 6px', fontWeight: 600, color: navy }}>a) Account and Authentication</p>
          <p style={{ margin: '0 0 16px' }}>
            When you register, we collect your email address and a password (stored encrypted). Legal basis: GDPR Art. 6(1)(b) — contract performance; DPDP Act S. 4 — lawful purpose.
          </p>

          <p style={{ margin: '0 0 6px', fontWeight: 600, color: navy }}>b) CV Text (session only)</p>
          <p style={{ margin: '0 0 16px' }}>
            When you upload or paste a CV, the text content is held <strong>only for the duration of your browser session</strong> (sessionStorage) and transmitted to our AI processing partners (Anthropic) for analysis. The raw file is never stored on our servers. Legal basis: GDPR Art. 6(1)(b); DPDP Act S. 4.
          </p>

          <p style={{ margin: '0 0 6px', fontWeight: 600, color: navy }}>c) Kira AI Career Profile</p>
          <p style={{ margin: '0 0 16px' }}>
            If you consent to Kira&apos;s AI analysis, we extract structured career data (job title, skills, years of experience, target roles) and store it permanently in your account in our database (Supabase, EU-West region, Ireland). This data is used solely for personalised job recommendations and CV optimisation within the platform. Legal basis: GDPR Art. 6(1)(a) — consent; DPDP Act S. 6 — consent. You may delete this data at any time under <em>Settings → Kira AI Profile Data</em>.
          </p>

          <p style={{ margin: '0 0 6px', fontWeight: 600, color: navy }}>d) Credits Usage Log</p>
          <p style={{ margin: '0 0 16px' }}>
            We store which AI actions you have performed (e.g., ATS scan, CV tailoring, cover letter) to manage the credits system. This log does not contain CV content. Legal basis: GDPR Art. 6(1)(b); DPDP Act S. 4.
          </p>

          <p style={{ margin: '0 0 6px', fontWeight: 600, color: navy }}>e) Payment Data</p>
          <p style={{ margin: '0 0 16px' }}>
            Payments are handled by Razorpay. We receive only a transaction confirmation and your contact details as provided to Razorpay. Card or bank details are never held by us. Legal basis: GDPR Art. 6(1)(b); DPDP Act S. 4.
          </p>

          <p style={{ margin: '0 0 6px', fontWeight: 600, color: navy }}>f) Voice Synthesis (Kira voice)</p>
          <p style={{ margin: '0 0 0' }}>
            When you use Kira&apos;s voice feature, the text of Kira&apos;s response is sent to OpenAI&apos;s Text-to-Speech API to generate audio. This text is not linked to your personal identity. Legal basis: GDPR Art. 6(1)(b); DPDP Act S. 4.
          </p>
        </Section>

        <Section title="3. Service Providers and Third Parties">
          <p style={{ margin: '0 0 12px' }}>We use the following service providers to operate Job-Lens India:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { name: 'Vercel Inc.', country: 'USA', purpose: 'Web application hosting', link: 'https://vercel.com/legal/privacy-policy' },
              { name: 'Supabase Inc.', country: 'USA / EU-West (Ireland)', purpose: 'Database and authentication — career profile data stored in Ireland', link: 'https://supabase.com/privacy' },
              { name: 'Anthropic PBC', country: 'USA', purpose: 'AI analysis — CV text extraction and career profile (Claude API)', link: 'https://www.anthropic.com/privacy' },
              { name: 'OpenAI Inc.', country: 'USA', purpose: 'AI voice synthesis — text-to-speech for the Kira assistant (TTS API)', link: 'https://openai.com/policies/privacy-policy' },
              { name: 'Adzuna Ltd.', country: 'United Kingdom', purpose: 'Job search API — live job listings', link: 'https://www.adzuna.in/privacy' },
              { name: 'Razorpay Software Pvt. Ltd.', country: 'India', purpose: 'Payment processing for credit top-ups (INR)', link: 'https://razorpay.com/privacy/' },
              { name: 'Resend Inc.', country: 'USA', purpose: 'Transactional emails (e.g., notifications when a recruiter views your Job Case)', link: 'https://resend.com/legal/privacy-policy' },
            ].map(p => (
              <div key={p.name} style={{ padding: '12px 14px', borderRadius: 10, background: '#fff', border: `1px solid ${border}` }}>
                <div style={{ fontWeight: 600, color: navy, marginBottom: 2 }}>{p.name} ({p.country})</div>
                <div style={{ fontSize: 13, color: textMuted, marginBottom: 4 }}>{p.purpose}</div>
                <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: saffron }}>{p.link}</a>
              </div>
            ))}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 13, color: textMuted }}>
            Data transfers to providers outside the EU/EEA are based on EU Standard Contractual Clauses (GDPR Art. 46). Data transfers to US providers are additionally covered by their Data Privacy Framework certifications where applicable.
          </p>
        </Section>

        <Section title="4. Data Retention">
          <p style={{ margin: 0 }}>
            Account data and the credits usage log are retained for the duration of your active account. Upon account deletion or on request, your data is fully deleted within 30 days, unless legal retention obligations apply. Your Kira AI career profile can be deleted at any time from your account settings without deleting your full account.
          </p>
        </Section>

        <Section title="5. Cookies and Tracking">
          <p style={{ margin: 0 }}>
            We use only technically necessary cookies (session management by Supabase). No analytics or advertising cookies are used. No third-party tracking occurs.
          </p>
        </Section>

        <Section title="6. Your Rights">
          <p style={{ margin: '0 0 12px' }}>
            Under GDPR and the DPDP Act 2023, you have the following rights regarding your personal data:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { tag: 'Access', desc: 'You may request a copy of all personal data we hold about you.' },
              { tag: 'Correction', desc: 'You may request correction of inaccurate data.' },
              { tag: 'Erasure', desc: 'You may request deletion of your data ("right to be forgotten"). For Kira AI profile data, use the self-service option in Settings → Kira AI Profile Data.' },
              { tag: 'Restriction', desc: 'You may request that we restrict processing of your data.' },
              { tag: 'Portability', desc: 'You have the right to receive your data in a machine-readable format.' },
              { tag: 'Withdrawal', desc: 'Where processing is based on consent, you may withdraw consent at any time. This does not affect lawfulness of prior processing.' },
            ].map(r => (
              <div key={r.tag} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: `rgba(255,153,51,0.12)`, color: '#b36200', fontWeight: 700, flexShrink: 0, marginTop: 2, whiteSpace: 'nowrap' as const }}>{r.tag}</span>
                <div style={{ fontSize: 14, color: '#374151' }}>{r.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ margin: '16px 0 0' }}>
            To exercise your rights or export your data, use the self-service option in{' '}
            <Link href="/app/account" style={{ color: saffron }}>Account Settings → Export my data</Link>.
            You may also contact us at:{' '}
            <a href="mailto:privacy@job-lens.de" style={{ color: saffron }}>
              privacy@job-lens.de
            </a>
            . Under the DPDP Act 2023, you may also lodge a complaint with the Data Protection Board of India once it is operational.
          </p>
        </Section>

        <Section title="7. Grievance Mechanism (DPDP Act 2023 — Section 13)">
          <p style={{ margin: '0 0 12px' }}>
            If you have a complaint about how we process your personal data, you may raise a grievance:
          </p>
          <ol style={{ margin: '0 0 12px', paddingLeft: 20, lineHeight: 2 }}>
            <li>Email <a href="mailto:privacy@job-lens.de?subject=DPDP%20Grievance" style={{ color: saffron }}>privacy@job-lens.de</a> with subject line <strong>"DPDP Grievance"</strong>.</li>
            <li>We will acknowledge receipt within <strong>48 hours</strong>.</li>
            <li>We will resolve or respond to your grievance within <strong>30 days</strong>.</li>
            <li>If unresolved, you may escalate your complaint to the <strong>Data Protection Board of India</strong> once it is operational.</li>
          </ol>
          <p style={{ margin: 0 }}>
            <strong>Data Fiduciary:</strong> Munira Nandalpad, Job-Lens AI, Böblingen, Germany.
          </p>
        </Section>

        <Section title="8. Age Restriction">
          <p style={{ margin: 0 }}>
            Job-Lens is intended for users who are <strong>18 years of age or older</strong>. We do not knowingly collect personal data from persons under 18. If you believe a minor has registered, please contact us immediately at <a href="mailto:privacy@job-lens.de" style={{ color: saffron }}>privacy@job-lens.de</a> and we will delete the data promptly.
          </p>
        </Section>

        <Section title="9. Data Security">
          <p style={{ margin: 0 }}>
            All data transmissions are encrypted via HTTPS/TLS. Passwords are hashed with bcrypt by Supabase and never stored in plain text. Your Kira AI career profile is stored with row-level security — only you can access your own data. Access to production data is restricted to authorised personnel.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p style={{ margin: 0 }}>
            We may update this policy as the service evolves. The current version is always available on this page. For material changes, registered users will be notified by email.
          </p>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${border}`, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: textMuted }}>
          <Link href="/in" style={{ color: textMuted, textDecoration: 'none' }}>Home</Link>
          <span style={{ color: border }}>·</span>
          <Link href="/impressum" style={{ color: textMuted, textDecoration: 'none' }}>Impressum</Link>
          <span style={{ color: border }}>·</span>
          <Link href="/datenschutz" style={{ color: textMuted, textDecoration: 'none' }}>Datenschutzerklärung (DE)</Link>
        </div>
      </div>
    </div>
  )
}
