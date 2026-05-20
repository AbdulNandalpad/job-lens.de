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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
      `}</style>

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
            Gemäß DSGVO (EU) 2016/679 · Stand: Mai 2025
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
            E-Mail: <a href="mailto:munira.nandalpad@servicesphere.de" style={{ color: c.accent }}>munira.nandalpad@servicesphere.de</a>
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
            Wenn Sie einen Lebenslauf oder LinkedIn-Export hochladen, wird der Textinhalt <strong>ausschließlich für die Dauer Ihrer Sitzung</strong> im Browser-Speicher (sessionStorage) gehalten und zur KI-Analyse an unsere Verarbeitungspartner (Anthropic) übermittelt. Die Rohdatei wird nicht auf unseren Servern gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
          </p>

          <p style={{ margin: '0 0 6px', fontWeight: 600, color: c.primary }}>c) Zahlungsdaten</p>
          <p style={{ margin: '0 0 16px' }}>
            Zahlungen werden über PayPal abgewickelt. Wir erhalten lediglich eine Bestätigung und die PayPal-E-Mail-Adresse des Zahlers. Kreditkarten- oder Bankdaten gelangen nicht zu uns. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
          </p>

          <p style={{ margin: '0 0 6px', fontWeight: 600, color: c.primary }}>d) Nutzungsprotokoll (Credits)</p>
          <p style={{ margin: '0 0 0' }}>
            Wir speichern, welche KI-Aktionen (z.B. Lebenslauf-Optimierung, Anschreiben-Erstellung) Sie durchgeführt haben, um das Credit-System zu verwalten. Diese Daten beinhalten keine Inhalte Ihres Lebenslaufs. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
          </p>
        </Section>

        <Section title="3. Auftragsverarbeiter und Drittanbieter">
          <p style={{ margin: '0 0 12px' }}>Wir setzen folgende Dienstleister ein:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { name: 'Vercel Inc.', country: 'USA', purpose: 'Hosting der Webanwendung', link: 'https://vercel.com/legal/privacy-policy' },
              { name: 'Supabase Inc.', country: 'USA / EU-Region', purpose: 'Datenbank und Authentifizierung', link: 'https://supabase.com/privacy' },
              { name: 'Anthropic PBC', country: 'USA', purpose: 'KI-Analyse (Claude API)', link: 'https://www.anthropic.com/privacy' },
              { name: 'Adzuna Ltd.', country: 'Großbritannien', purpose: 'Jobsuche-API', link: 'https://www.adzuna.de/privacy' },
              { name: 'PayPal (Europe) S.à r.l.', country: 'Luxemburg / USA', purpose: 'Zahlungsabwicklung', link: 'https://www.paypal.com/de/webapps/mpp/ua/privacy-full' },
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
          <p style={{ margin: 0 }}>
            Wir verwenden ausschließlich technisch notwendige Cookies (Session-Management durch Supabase). Es werden keine Analyse- oder Werbe-Cookies eingesetzt. Es erfolgt kein Tracking durch Dritte.
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
            Zur Ausübung Ihrer Rechte wenden Sie sich bitte an:{' '}
            <a href="mailto:munira.nandalpad@servicesphere.de" style={{ color: c.accent }}>munira.nandalpad@servicesphere.de</a>.
            Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist die Aufsichtsbehörde Ihres Bundeslandes.
          </p>
        </Section>

        <Section title="7. Datensicherheit">
          <p style={{ margin: 0 }}>
            Alle Datenübertragungen erfolgen verschlüsselt über HTTPS/TLS. Passwörter werden durch Supabase mit bcrypt gehasht und niemals im Klartext gespeichert. Der Zugriff auf Produktionsdaten ist auf autorisierte Administratoren beschränkt.
          </p>
        </Section>

        <Section title="8. Änderungen dieser Datenschutzerklärung">
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
