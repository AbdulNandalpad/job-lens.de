'use client'

import Link from 'next/link'
import { theme } from '@/lib/theme'

const { colors: c, fonts: f } = theme

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: c.primary, marginBottom: 12, marginTop: 0, display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, background: c.primaryLight, color: c.navy, fontWeight: 700, flexShrink: 0 }}>§ {num}</span>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: c.text, lineHeight: 1.8 }}>{children}</div>
    </section>
  )
}

export default function AgbPage() {
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
            Allgemeine Geschäftsbedingungen
          </h1>
          <p style={{ fontSize: 13, color: c.textMuted, margin: 0 }}>
            Job-Lens AI · job-lens.de · Stand: Mai 2025
          </p>
        </div>

        <Section num="1" title="Geltungsbereich">
          <p style={{ margin: '0 0 12px' }}>
            Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Nutzerverträge zwischen dem Anbieter von Job-Lens AI (nachfolgend „Anbieter") und natürlichen Personen, die die Plattform job-lens.de nutzen (nachfolgend „Nutzer").
          </p>
          <p style={{ margin: 0 }}>
            Abweichende Bedingungen des Nutzers werden nicht anerkannt, es sei denn, der Anbieter stimmt ihrer Geltung ausdrücklich zu.
          </p>
        </Section>

        <Section num="2" title="Leistungsbeschreibung">
          <p style={{ margin: '0 0 12px' }}>
            Job-Lens AI ist eine KI-gestützte Plattform zur Unterstützung bei der Stellensuche im DACH-Raum (Deutschland, Österreich, Schweiz). Die Plattform bietet insbesondere folgende Funktionen:
          </p>
          <ul style={{ margin: '0 0 12px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>Career Scan:</strong> KI-gestützte Analyse des hochgeladenen Lebenslaufs mit Stärken-/Schwächenprofil und Gehaltsbewertung.</li>
            <li><strong>Smart Job Search:</strong> Automatisierte Jobsuche auf Basis des Nutzerprofils mit Live-Stellenangeboten.</li>
            <li><strong>CV Builder:</strong> KI-gestützte Anpassung des Lebenslaufs an eine konkrete Stellenausschreibung.</li>
            <li><strong>Cover Letter Builder:</strong> KI-gestützte Erstellung individueller Anschreiben.</li>
            <li><strong>Auto Apply (Beta):</strong> Automatisiertes Ausfüllen von Online-Bewerbungsformularen durch KI.</li>
          </ul>
          <p style={{ margin: 0 }}>
            Der Anbieter übernimmt keine Garantie für den Erfolg von Bewerbungen, die mithilfe der Plattform erstellt wurden. Die KI-generierten Inhalte sind als Entwurfsvorlagen zu verstehen und müssen vom Nutzer vor dem Versand geprüft und ggf. angepasst werden.
          </p>
        </Section>

        <Section num="3" title="Registrierung und Nutzerkonto">
          <p style={{ margin: '0 0 12px' }}>
            Die Nutzung kostenpflichtiger Funktionen erfordert die Anlage eines Nutzerkontos. Der Nutzer ist verpflichtet, zutreffende und vollständige Angaben bei der Registrierung zu machen.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            Jede natürliche Person darf nur ein Nutzerkonto anlegen. Das Nutzerkonto ist nicht übertragbar. Der Nutzer ist für alle Aktivitäten unter seinem Konto verantwortlich und verpflichtet, den Zugang vor unberechtigtem Zugriff Dritter zu schützen.
          </p>
          <p style={{ margin: 0 }}>
            Der Anbieter behält sich vor, Nutzerkonten bei missbräuchlicher Nutzung oder Verstoß gegen diese AGB zu sperren oder zu löschen.
          </p>
        </Section>

        <Section num="4" title="Credit-System und Preise">
          <p style={{ margin: '0 0 12px' }}>
            Die Nutzung kostenpflichtiger KI-Funktionen wird über ein Credit-System abgerechnet. Neue Nutzer erhalten bei der Registrierung <strong>5 Gratis-Credits</strong> ohne Angabe von Zahlungsdaten.
          </p>
          <p style={{ margin: '0 0 12px' }}>Die Credit-Kosten pro Aktion betragen:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, background: '#fff', border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden' }}>
            {[
              { action: 'Lebenslauf-Optimierung (CV Builder)', cost: '1 Credit' },
              { action: 'Anschreiben-Erstellung (Cover Letter)', cost: '1 Credit' },
              { action: 'Career Scan (vollständige Analyse)', cost: '2 Credits' },
              { action: 'Auto Apply (Formular-Ausfüllung)', cost: '3 Credits' },
            ].map((r, i) => (
              <div key={r.action} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: i === 0 ? 'none' : `1px solid ${c.border}` }}>
                <span style={{ fontSize: 13, color: c.text }}>{r.action}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: c.accent, background: c.primaryLight, padding: '2px 10px', borderRadius: 8 }}>{r.cost}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: '0 0 12px' }}>Credits sind in folgenden Paketen erhältlich:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, background: '#fff', border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden' }}>
            {[
              { pack: 'Starter', price: '€ 4,99', credits: '20 Credits' },
              { pack: 'Job Hunt', price: '€ 12,99', credits: '60 Credits' },
              { pack: 'Full Sprint', price: '€ 24,99', credits: '150 Credits' },
            ].map((p, i) => (
              <div key={p.pack} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: i === 0 ? 'none' : `1px solid ${c.border}` }}>
                <span style={{ fontSize: 13, color: c.text }}><strong>{p.pack}</strong> — {p.credits}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: c.primary }}>{p.price}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: 0 }}>
            Credits haben kein Ablaufdatum. Alle genannten Preise sind Endpreise gemäß § 19 UStG (Kleinunternehmerregelung); es wird keine Umsatzsteuer ausgewiesen.
          </p>
        </Section>

        <Section num="5" title="Zahlung und Widerrufsrecht">
          <p style={{ margin: '0 0 12px' }}>
            Zahlungen werden ausschließlich über PayPal abgewickelt. Mit dem Kauf eines Credit-Pakets kommt ein Kaufvertrag zwischen Anbieter und Nutzer zustande. Credits werden dem Konto nach Eingang der Zahlung sofort gutgeschrieben.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            <strong>Widerrufsrecht:</strong> Das gesetzliche Widerrufsrecht gemäß § 355 BGB erlischt für digitale Inhalte (Credits) mit Beginn der Ausführung des Vertrags, wenn der Nutzer ausdrücklich zugestimmt hat, dass die Ausführung vor Ablauf der Widerrufsfrist beginnt und bestätigt hat, dass er sein Widerrufsrecht verliert (§ 356 Abs. 5 BGB). Durch den Kauf von Credits und die sofortige Nutzbarkeit erlischt das Widerrufsrecht mit dem vollständigen Download/der Bereitstellung des digitalen Inhalts, sofern der Verbraucher der vorzeitigen Ausführung zugestimmt hat.
          </p>
          <p style={{ margin: 0 }}>
            Für technische Probleme oder versehentliche Mehrfachabbuchungen wenden Sie sich bitte innerhalb von 14 Tagen an: <a href="mailto:kontakt@job-lens.de" style={{ color: c.accent }}>kontakt@job-lens.de</a>.
          </p>
        </Section>

        <Section num="6" title="Pflichten des Nutzers">
          <p style={{ margin: '0 0 12px' }}>Der Nutzer verpflichtet sich,</p>
          <ul style={{ margin: '0 0 12px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>nur eigene Lebensläufe und Dokumente hochzuladen oder solche, für deren Verarbeitung er berechtigt ist,</li>
            <li>die Plattform nicht für automatisierte Massenanfragen oder missbräuchliche Nutzung zu verwenden,</li>
            <li>keine falschen oder irreführenden Angaben im Rahmen der Nutzung zu machen,</li>
            <li>die durch die KI generierten Inhalte vor dem Versand an Arbeitgeber auf Richtigkeit zu prüfen.</li>
          </ul>
          <p style={{ margin: 0 }}>
            Der Nutzer ist für alle mit seinem Konto durchgeführten Handlungen vollständig verantwortlich.
          </p>
        </Section>

        <Section num="7" title="Haftungsbeschränkung">
          <p style={{ margin: '0 0 12px' }}>
            Der Anbieter haftet unbegrenzt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie für Vorsatz und grobe Fahrlässigkeit.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            Im Übrigen ist die Haftung des Anbieters auf den vorhersehbaren, vertragstypischen Schaden begrenzt. Der Anbieter haftet nicht für:
          </p>
          <ul style={{ margin: '0 0 12px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>die inhaltliche Richtigkeit oder Vollständigkeit KI-generierter Texte,</li>
            <li>den Erfolg oder Misserfolg von Bewerbungsverfahren,</li>
            <li>vorübergehende Nichtverfügbarkeit der Plattform durch Wartungsarbeiten oder höhere Gewalt,</li>
            <li>Schäden durch Drittanbieter (Supabase, Anthropic, Adzuna, PayPal, Vercel).</li>
          </ul>
          <p style={{ margin: 0 }}>
            Die Haftungsbeschränkungen gelten nicht, soweit Schäden auf eine Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) zurückzuführen sind.
          </p>
        </Section>

        <Section num="8" title="Verfügbarkeit und Änderungen des Dienstes">
          <p style={{ margin: '0 0 12px' }}>
            Der Anbieter strebt eine Verfügbarkeit der Plattform von 99 % im Jahresmittel an, übernimmt jedoch keine Garantie. Geplante Wartungsarbeiten werden, soweit möglich, vorab angekündigt.
          </p>
          <p style={{ margin: 0 }}>
            Der Anbieter behält sich vor, den Funktionsumfang der Plattform jederzeit anzupassen, zu erweitern oder einzuschränken. Wesentliche Änderungen, die sich auf die Nutzbarkeit bereits erworbener Credits auswirken, werden dem Nutzer mindestens 14 Tage im Voraus per E-Mail mitgeteilt.
          </p>
        </Section>

        <Section num="9" title="Kündigung und Kontolöschung">
          <p style={{ margin: '0 0 12px' }}>
            Der Nutzer kann sein Konto jederzeit durch eine E-Mail an <a href="mailto:kontakt@job-lens.de" style={{ color: c.accent }}>kontakt@job-lens.de</a> löschen lassen. Nicht genutzte Credits werden dabei nicht erstattet, es sei denn, die Kündigung erfolgt wegen einer wesentlichen Leistungsminderung durch den Anbieter.
          </p>
          <p style={{ margin: 0 }}>
            Der Anbieter ist berechtigt, das Nutzerverhältnis aus wichtigem Grund fristlos zu kündigen, insbesondere bei missbräuchlicher Nutzung oder Verstoß gegen diese AGB.
          </p>
        </Section>

        <Section num="10" title="Schlussbestimmungen">
          <p style={{ margin: '0 0 12px' }}>
            <strong>Anwendbares Recht:</strong> Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            <strong>Gerichtsstand:</strong> Für Streitigkeiten mit Kaufleuten oder juristischen Personen des öffentlichen Rechts ist der Sitz des Anbieters ausschließlicher Gerichtsstand.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            <strong>Salvatorische Klausel:</strong> Sollten einzelne Bestimmungen dieser AGB unwirksam oder undurchführbar sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Änderungen dieser AGB</strong> werden dem Nutzer per E-Mail mitgeteilt. Widerspricht der Nutzer nicht innerhalb von 30 Tagen nach Zugang der Mitteilung, gelten die geänderten AGB als angenommen. Auf das Widerspruchsrecht und diese Folge wird in der Mitteilung gesondert hingewiesen.
          </p>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${c.border}`, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: c.textMuted }}>
          <Link href="/" style={{ color: c.textMuted, textDecoration: 'none' }}>Startseite</Link>
          <span style={{ color: c.border }}>·</span>
          <Link href="/impressum" style={{ color: c.textMuted, textDecoration: 'none' }}>Impressum</Link>
          <span style={{ color: c.border }}>·</span>
          <Link href="/datenschutz" style={{ color: c.textMuted, textDecoration: 'none' }}>Datenschutzerklärung</Link>
        </div>
      </div>
    </div>
  )
}
