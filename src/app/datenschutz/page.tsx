'use client'

import Link from 'next/link'
import { theme } from '@/lib/theme'

const { colors: c, fonts: f } = theme

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: c.primary, marginBottom: 12, marginTop: 0 }}>{title}</h2>
      <div style={{ fontSize: 14, color: c.text, lineHeight: 1.8 }}>{children}</div>
    </section>
  )
}

export default function DatenschutzPage() {
  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body }}>
      {/* Google Fonts CDN removed — IP would be sent to Google, violating GDPR G10.
          Fonts are loaded via Next.js font optimization (self-hosted) in layout.tsx. */}

      {/* Navbar */}
      <div style={{ background: theme.navbar.bg, padding: '0 24px', height: theme.navbar.height, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, borderBottom: `1px solid ${theme.navbar.border}` }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="24" height="24" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke={c.accent} strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="8" fill="none" stroke={c.accentLight} strokeWidth="1.2"/>
            <circle cx="20" cy="20" r="3" fill={c.accent}/>
            <line x1="28" y1="28" x2="36" y2="36" stroke={c.accent} strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 700, color: theme.navbar.text }}>
            Job-Lens <span style={{ color: c.accent }}>AI</span>
          </span>
        </Link>
        <Link href="/" style={{ fontSize: 13, color: theme.navbar.textMuted, textDecoration: 'none' }}>&larr; Zurück zur Startseite</Link>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: f.heading, fontSize: 28, fontWeight: 700, color: c.primary, margin: '0 0 8px', paddingLeft: 14, borderLeft: `3px solid ${c.accent}` }}>
            Datenschutzerklärung
          </h1>
          <p style={{ fontSize: 13, color: c.textMuted, margin: 0 }}>
            Gemäß DSGVO (EU) 2016/679 · Stand: Juli 2026
          </p>
        </div>

        <Section title="1. Verantwortlicher">
          <p style={{ margin: '0 0 8px' }}>
            Verantwortlicher im Sinne der DSGVO ist:
          </p>
          <p style={{ margin: 0 }}>
            <strong>Munira Nandalpad</strong><br />
            Brühlstr 15<br />
            71034 Böblingen<br />
            Deutschland<br />
            E-Mail: <a href="mailto:munira.nandalpad@job-lens.de" style={{ color: c.accent }}>munira.nandalpad@job-lens.de</a>
          </p>
        </Section>

        <Section title="2. Erhobene Daten und Zwecke der Verarbeitung">
          <p style={{ margin: '0 0 12px' }}>Wir verarbeiten personenbezogene Daten nur, soweit dies für die Bereitstellung unseres Dienstes erforderlich ist.</p>

          <p style={{ margin: '0 0 6px', fontWeight: 600, color: c.primary }}>a) Registrierung und Authentifizierung</p>
          <p style={{ margin: '0 0 16px' }}>
            Bei der Registrierung erheben wir Ihre E-Mail-Adresse und ein Passwort (verschlüsselt gespeichert). Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
          </p>

          <p style={{ margin: '0 0 6px', fontWeight: 600, color: c.primary }}>b) Hochgeladene Lebenslaufdaten</p>
          <p style={{ margin: '0 0 16px' }}>
            Wenn Sie einen Lebenslauf oder LinkedIn-Export hochladen, wird der Textinhalt für die KI-Analyse an unsere Verarbeitungspartner (Anthropic, OpenAI) übermittelt. Der rohe Lebenslauf-Text wird <strong>nicht dauerhaft auf unseren Servern gespeichert</strong> — er verbleibt im Browser-Speicher (sessionStorage) Ihres Geräts für die Dauer der Sitzung. Aus dem Career Scan werden strukturierte, anonymisierte Karrieredaten extrahiert und in Ihrem Nutzerkonto gespeichert (vgl. Abschnitt e) unten). Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
          </p>

          <p style={{ margin: '0 0 6px', fontWeight: 600, color: c.primary }}>c) Zahlungsdaten</p>
          <p style={{ margin: '0 0 16px' }}>
            Zahlungen werden über PayPal abgewickelt. Wir erhalten lediglich eine Bestätigung und die PayPal-E-Mail-Adresse des Zahlers. Kreditkarten- oder Bankdaten gelangen nicht zu uns. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
          </p>

          <p style={{ margin: '0 0 6px', fontWeight: 600, color: c.primary }}>d) Nutzungsprotokoll (Credits)</p>
          <p style={{ margin: '0 0 16px' }}>
            Wir speichern, welche KI-Aktionen (z.B. Lebenslauf-Optimierung, Anschreiben-Erstellung) Sie durchgeführt haben, um das Credit-System zu verwalten. Diese Daten beinhalten keine Inhalte Ihres Lebenslaufs. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
          </p>

          <p style={{ margin: '0 0 6px', fontWeight: 600, color: c.primary }}>e) KI-Karriereprofil (Kira)</p>
          <p style={{ margin: '0 0 0' }}>
            Wenn Sie einen Lebenslauf hochladen und in die KI-Analyse durch Kira einwilligen, extrahieren wir strukturierte Karrieredaten (u.a. Berufsbezeichnung, Fähigkeiten, Berufserfahrung in Jahren, Zielrollen) und speichern diese dauerhaft in Ihrem Nutzerkonto in unserer Datenbank (Supabase, Region EU-West, Irland). Diese Daten dienen ausschließlich der personalisierten Job-Empfehlung und CV-Optimierung innerhalb der Plattform. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung). Sie können Ihr Karriereprofil jederzeit unter <em>Einstellungen → Kira AI Profildaten</em> vollständig löschen.
          </p>
        </Section>

        <Section title="3. Auftragsverarbeiter und Drittanbieter">
          <p style={{ margin: '0 0 12px' }}>Wir setzen folgende Dienstleister ein:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { name: 'Vercel Inc.', country: 'USA', purpose: 'Hosting der Webanwendung', link: 'https://vercel.com/legal/privacy-policy' },
              { name: 'Supabase Inc.', country: 'USA / EU-Region', purpose: 'Datenbank und Authentifizierung', link: 'https://supabase.com/privacy' },
              { name: 'Anthropic PBC', country: 'USA', purpose: 'KI-Analyse — Lebenslauf-Extraktion und Karriereprofil (Claude API)', link: 'https://www.anthropic.com/privacy' },
              { name: 'OpenAI Inc.', country: 'USA', purpose: 'KI-Sprachsynthese — Text-zu-Sprache für den Kira-Assistenten (TTS API)', link: 'https://openai.com/policies/privacy-policy' },
              { name: 'Adzuna Ltd.', country: 'Großbritannien', purpose: 'Jobsuche-API', link: 'https://www.adzuna.de/privacy' },
              { name: 'PayPal (Europe) S.à r.l.', country: 'Luxemburg / USA', purpose: 'Zahlungsabwicklung', link: 'https://www.paypal.com/de/webapps/mpp/ua/privacy-full' },
              { name: 'Resend Inc.', country: 'USA', purpose: 'Transaktions-E-Mails (z.B. Benachrichtigungen bei Job Case-Ansichten)', link: 'https://resend.com/legal/privacy-policy' },
            ].map(p => (
              <div key={p.name} style={{ padding: '12px 14px', borderRadius: 10, background: '#fff', border: `1px solid ${c.border}` }}>
                <div style={{ fontWeight: 600, color: c.primary, marginBottom: 2 }}>{p.name} ({p.country})</div>
                <div style={{ fontSize: 13, color: c.textMuted, marginBottom: 4 }}>{p.purpose}</div>
                <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: c.accent }}>{p.link}</a>
              </div>
            ))}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 13, color: c.textMuted }}>
            Für Drittanbieter außerhalb der EU erfolgt die Datenübertragung auf Basis der EU-Standardvertragsklauseln (Art. 46 DSGVO).
          </p>
        </Section>

        <Section title="4. Speicherdauer">
          <p style={{ margin: 0 }}>
            Kontodaten und das Credit-Nutzungsprotokoll werden für die Dauer der aktiven Nutzung Ihres Kontos gespeichert. Nach Kündigung oder auf Wunsch werden Ihre Daten innerhalb von 30 Tagen vollständig gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen (§ 147 AO: 10 Jahre für Zahlungsbelege).
          </p>
        </Section>

        <Section title="5. Cookies und Tracking">
          <p style={{ margin: '0 0 12px' }}>
            Wir setzen ausschließlich technisch notwendige Cookies ein, die für den Betrieb der Plattform erforderlich sind. Werbecookies werden nicht verwendet.
          </p>
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(55,138,221,0.06)' }}>
                  {['Cookie-Name', 'Zweck', 'Speicherdauer', 'Anbieter'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left' as const, fontWeight: 700, color: c.primary, borderBottom: `1px solid ${c.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'sb-*', purpose: 'Authentifizierung (Supabase Session)', duration: '1 Stunde / 7 Tage', provider: 'Supabase (EU-West, Irland)' },
                  { name: 'jl_cv', purpose: 'Recruiter-Zugriffstoken für Job Case', duration: '24 Stunden', provider: 'Job-Lens (First Party)' },
                  { name: 'jl_login_next', purpose: 'OAuth-Zustand bei der Anmeldung', duration: '5 Minuten', provider: 'Job-Lens (First Party)' },
                ].map(row => (
                  <tr key={row.name} style={{ borderBottom: `1px solid ${c.border}` }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>{row.name}</td>
                    <td style={{ padding: '8px 12px' }}>{row.purpose}</td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' as const }}>{row.duration}</td>
                    <td style={{ padding: '8px 12px' }}>{row.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 13 }}>
            Es werden keine Analyse- oder Werbe-Cookies von Dritten gesetzt. Website-Analysedienste werden nur mit ausdrücklicher Einwilligung aktiviert (TTDSG §25).
          </p>
        </Section>

        <Section title="6. Ihre Rechte nach DSGVO">
          <p style={{ margin: '0 0 12px' }}>Sie haben folgende Rechte gegenüber uns bezüglich Ihrer personenbezogenen Daten:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { art: 'Art. 15', right: 'Auskunft', desc: 'Sie können Auskunft über die von uns gespeicherten Daten verlangen.' },
              { art: 'Art. 16', right: 'Berichtigung', desc: 'Sie können die Berichtigung unrichtiger Daten verlangen.' },
              { art: 'Art. 17', right: 'Löschung', desc: 'Sie können die Löschung Ihrer Daten verlangen ("Recht auf Vergessenwerden").' },
              { art: 'Art. 18', right: 'Einschränkung', desc: 'Sie können die Einschränkung der Verarbeitung verlangen.' },
              { art: 'Art. 20', right: 'Datenübertragbarkeit', desc: 'Sie haben das Recht, Ihre Daten in einem maschinenlesbaren Format zu erhalten.' },
              { art: 'Art. 21', right: 'Widerspruch', desc: 'Sie können der Verarbeitung Ihrer Daten jederzeit widersprechen.' },
            ].map(r => (
              <div key={r.art} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: c.primaryLight, color: c.navy, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{r.art}</span>
                <div>
                  <strong style={{ color: c.primary }}>{r.right}:</strong> {r.desc}
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin: '16px 0 0' }}>
            Den Datenexport (Art. 20 – Datenübertragbarkeit) können Sie selbst unter{' '}
            <Link href="/app/account" style={{ color: c.accent }}>Einstellungen → Daten exportieren</Link> durchführen.
            Für alle anderen Anfragen wenden Sie sich bitte an:{' '}
            <a href="mailto:privacy@job-lens.de" style={{ color: c.accent }}>privacy@job-lens.de</a>.
            Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist die Aufsichtsbehörde Ihres Bundeslandes.
          </p>
        </Section>

        <Section title="7. Datensicherheit">
          <p style={{ margin: 0 }}>
            Alle Datenübertragungen erfolgen verschlüsselt über HTTPS/TLS. Passwörter werden durch Supabase mit bcrypt gehasht und niemals im Klartext gespeichert. Der Zugriff auf Produktionsdaten ist auf autorisierte Administratoren beschränkt.
          </p>
        </Section>

        <Section title="8. Datenpannenmeldung (Art. 33 DSGVO)">
          <p style={{ margin: '0 0 12px' }}>
            Im Falle einer Verletzung des Schutzes personenbezogener Daten (Datenpanne) handeln wir unverzüglich nach folgendem Verfahren:
          </p>
          <ol style={{ margin: '0 0 12px', paddingLeft: 20, lineHeight: 2 }}>
            <li><strong>Sofortmaßnahme:</strong> Benachrichtigung des Verantwortlichen telefonisch unter <a href="tel:+4915141412851" style={{ color: c.accent }}>+49 151 41412851</a> und per E-Mail an <a href="mailto:privacy@job-lens.de" style={{ color: c.accent }}>privacy@job-lens.de</a>.</li>
            <li><strong>Meldung an die Behörde:</strong> Innerhalb von <strong>72 Stunden</strong> nach Bekanntwerden der Datenpanne wird diese dem Landesbeauftragten für den Datenschutz und die Informationsfreiheit Baden-Württemberg (LfDI BW) gemeldet (Art. 33 DSGVO).</li>
            <li><strong>Benachrichtigung der Betroffenen:</strong> Sofern die Datenpanne voraussichtlich ein hohes Risiko für betroffene Personen mit sich bringt, werden diese unverzüglich informiert (Art. 34 DSGVO).</li>
            <li><strong>Dokumentation:</strong> Alle Datenpannen werden intern dokumentiert (Art. 33 Abs. 5 DSGVO), auch wenn keine Meldepflicht besteht.</li>
          </ol>
          <p style={{ margin: 0, padding: '12px 14px', background: '#fff', borderRadius: 10, border: `1px solid ${c.border ?? '#edf1f6'}`, fontSize: 13 }}>
            <strong>Kontakt im Notfall:</strong><br />
            Telefon: <a href="tel:+4915141412851" style={{ color: c.accent }}>+49 151 41412851</a> (Munira Nandalpad)<br />
            E-Mail: <a href="mailto:privacy@job-lens.de" style={{ color: c.accent }}>privacy@job-lens.de</a><br />
            Aufsichtsbehörde: LfDI Baden-Württemberg, Königstraße 10a, 70173 Stuttgart
          </p>
        </Section>

        <Section title="9. Änderungen dieser Datenschutzerklärung">
          <p style={{ margin: 0 }}>
            Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen. Die jeweils aktuelle Version ist auf dieser Seite abrufbar. Bei wesentlichen Änderungen werden registrierte Nutzer per E-Mail informiert.
          </p>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${c.border}`, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: c.textMuted }}>
          <Link href="/" style={{ color: c.textMuted, textDecoration: 'none' }}>Startseite</Link>
          <span style={{ color: c.border }}>·</span>
          <Link href="/impressum" style={{ color: c.textMuted, textDecoration: 'none' }}>Impressum</Link>
          <span style={{ color: c.border }}>·</span>
          <Link href="/agb" style={{ color: c.textMuted, textDecoration: 'none' }}>AGB</Link>
        </div>
      </div>
    </div>
  )
}
