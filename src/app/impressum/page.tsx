'use client'

import Link from 'next/link'
import { theme } from '@/lib/theme'

const { colors: c, fonts: f } = theme

export default function ImpressumPage() {
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
            Impressum
          </h1>
          <p style={{ fontSize: 13, color: c.textMuted, margin: 0 }}>Angaben gemäß § 5 TMG</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, fontSize: 14, color: c.text, lineHeight: 1.75 }}>

          <section>
            <h2 style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: c.primary, marginBottom: 12 }}>Anbieter</h2>
            <p style={{ margin: 0 }}>
              <strong>Abdul Rasheed Nandalpad</strong><br />
              Brühlstr 15<br />
              71034 Böblingen<br />
              Deutschland
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: c.primary, marginBottom: 12 }}>Kontakt</h2>
            <p style={{ margin: 0 }}>
              E-Mail: <a href="mailto:abdul.nandalpad@servicesphere.de" style={{ color: c.accent }}>abdul.nandalpad@servicesphere.de</a><br />
              Telefon: +49 151 41412851<br />
              Web: <a href="https://job-lens.de" style={{ color: c.accent }}>https://job-lens.de</a>
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: c.primary, marginBottom: 12 }}>Umsatzsteuer</h2>
            <p style={{ margin: 0 }}>
              Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: c.primary, marginBottom: 12 }}>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
            <p style={{ margin: 0 }}>
              Abdul Rasheed Nandalpad<br />
              Brühlstr 15, 71034 Böblingen
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: c.primary, marginBottom: 12 }}>Haftungsausschluss</h2>
            <h3 style={{ fontFamily: f.heading, fontSize: 14, fontWeight: 600, color: c.primary, margin: '0 0 8px' }}>Haftung für Inhalte</h3>
            <p style={{ margin: '0 0 16px' }}>
              Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
            <h3 style={{ fontFamily: f.heading, fontSize: 14, fontWeight: 600, color: c.primary, margin: '0 0 8px' }}>Haftung für Links</h3>
            <p style={{ margin: '0 0 16px' }}>
              Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
            </p>
            <h3 style={{ fontFamily: f.heading, fontSize: 14, fontWeight: 600, color: c.primary, margin: '0 0 8px' }}>Urheberrecht</h3>
            <p style={{ margin: 0 }}>
              Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Beiträge Dritter sind als solche gekennzeichnet. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: c.primary, marginBottom: 12 }}>Streitschlichtung</h2>
            <p style={{ margin: 0 }}>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" style={{ color: c.accent }}>
                https://ec.europa.eu/consumers/odr/
              </a>.<br />
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${c.border}`, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: c.textMuted }}>
          <Link href="/" style={{ color: c.textMuted, textDecoration: 'none' }}>Startseite</Link>
          <span style={{ color: c.border }}>·</span>
          <Link href="/datenschutz" style={{ color: c.textMuted, textDecoration: 'none' }}>Datenschutzerklärung</Link>
          <span style={{ color: c.border }}>·</span>
          <Link href="/agb" style={{ color: c.textMuted, textDecoration: 'none' }}>AGB</Link>
        </div>
      </div>
    </div>
  )
}
