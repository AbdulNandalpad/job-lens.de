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

const ROW = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: `1px solid ${c.border}` }}>
    <span style={{ fontSize: 13, color: c.text }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 700, color: c.accent, background: c.primaryLight, padding: '2px 10px', borderRadius: 8 }}>{value}</span>
  </div>
)

export default function AgbPage() {
  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body }}>

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
            Job-Lens AI · job-lens.de · Stand: Juli 2026
          </p>
        </div>

        <Section num="1" title="Geltungsbereich">
          <p style={{ margin: '0 0 12px' }}>
            Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Nutzerverträge zwischen dem Anbieter von Job-Lens AI
            (nachfolgend „Anbieter": Munira Nandalpad, Brühlstr 15, 71034 Böblingen) und natürlichen Personen,
            die die Plattform job-lens.de nutzen (nachfolgend „Nutzer").
          </p>
          <p style={{ margin: 0 }}>
            Abweichende Bedingungen des Nutzers werden nicht anerkannt, es sei denn, der Anbieter stimmt ihrer Geltung ausdrücklich zu.
          </p>
        </Section>

        <Section num="2" title="Leistungsbeschreibung">
          <p style={{ margin: '0 0 12px' }}>
            Job-Lens AI ist eine KI-gestützte Plattform zur Unterstützung bei der Stellensuche im DACH-Raum (Deutschland, Österreich, Schweiz)
            sowie im indischen Markt. Die Plattform bietet insbesondere folgende Funktionen:
          </p>
          <ul style={{ margin: '0 0 12px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>Career Scan:</strong> KI-Analyse des Lebenslaufs mit Stärken-/Schwächenprofil, Marktbewertung und Gehaltsschätzung.</li>
            <li><strong>Smart Job Search:</strong> Automatisierte Jobsuche auf Basis des Nutzerprofils mit Live-Stellenangeboten.</li>
            <li><strong>CV Builder:</strong> KI-gestützte Anpassung des Lebenslaufs an eine konkrete Stellenausschreibung.</li>
            <li><strong>Cover Letter Builder:</strong> KI-gestützte Erstellung individueller Anschreiben.</li>
            <li><strong>Auto Apply (Beta):</strong> Automatisiertes Ausfüllen von Online-Bewerbungsformularen. Derzeit nur für Administratoren verfügbar (Wartungsmodus).</li>
            <li><strong>Kira AI Assistant:</strong> KI-Karriereassistent für Chat und Sprachgespräche — Jobsuche, CV-Coaching, Gehaltsverhandlung, Interviewvorbereitung.</li>
            <li><strong>Interview Prep:</strong> KI-generierte Interviewfragen und Coaching-Sitzungen für konkrete Rollen.</li>
            <li><strong>Gehaltsverhandlungs-Simulation (Salary Sim):</strong> Interaktive Simulation einer Gehaltsverhandlung.</li>
            <li><strong>Job Case:</strong> Strukturierte Bewerbungsunterlage mit KI-Analyse, Mini-Test und Videopräsentation für Recruiter.</li>
            <li><strong>Arbeitszeugnis-Decoder (Zeugnis):</strong> KI-Analyse und Entschlüsselung von Arbeitszeugnissen.</li>
            <li><strong>Visa Check (Fachkräftezuwanderung):</strong> KI-Analyse der Voraussetzungen für das Fachkräfteeinwanderungsgesetz.</li>
          </ul>
          <p style={{ margin: 0 }}>
            <strong>Wichtiger Hinweis:</strong> Alle KI-generierten Inhalte — einschließlich Career-Scan-Ergebnisse, CV-Optimierungen,
            Anschreiben und Jobempfehlungen — sind als Orientierungshilfe zu verstehen und ersetzen keine professionelle Karriereberatung.
            Der Nutzer ist verpflichtet, alle Inhalte vor dem Versand an Arbeitgeber auf Richtigkeit, Vollständigkeit und Eignung zu prüfen.
            Der Anbieter übernimmt keine Garantie für den Erfolg von Bewerbungsverfahren.
          </p>
        </Section>

        <Section num="3" title="Registrierung, Nutzerkonto und Mindestalter">
          <p style={{ margin: '0 0 12px' }}>
            Die Nutzung kostenpflichtiger Funktionen erfordert ein Nutzerkonto. Die Registrierung erfolgt über Google OAuth.
            Der Nutzer versichert, bei der Registrierung wahrheitsgemäße Angaben zu machen.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            <strong>Mindestalter:</strong> Die Plattform ist ausschließlich Personen ab <strong>16 Jahren</strong> zugänglich.
            Personen unter 16 Jahren dürfen die Plattform nur mit ausdrücklicher Einwilligung eines Erziehungsberechtigten nutzen.
            Mit der Registrierung bestätigt der Nutzer, mindestens 16 Jahre alt zu sein.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            Jede natürliche Person darf nur ein Nutzerkonto anlegen. Das Konto ist nicht übertragbar.
            Der Nutzer ist für alle Aktivitäten unter seinem Konto verantwortlich.
          </p>
          <p style={{ margin: 0 }}>
            Der Anbieter behält sich vor, Nutzerkonten bei missbräuchlicher Nutzung oder Verstoß gegen diese AGB zu sperren oder zu löschen.
          </p>
        </Section>

        <Section num="4" title="KI-Systeme und EU-KI-Verordnung">
          <p style={{ margin: '0 0 12px' }}>
            Job-Lens AI nutzt KI-Modelle von Anthropic (Claude) und OpenAI zur Verarbeitung von Lebensläufen, Erstellung von Texten
            und Analyse von Karrieredaten. Diese KI-Systeme werden gemäß der EU-Verordnung 2024/1689 (EU-KI-Verordnung) eingesetzt.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            <strong>Transparenzpflicht (Art. 50 EU-KI-VO):</strong> Alle von KI-Systemen generierten Ergebnisse —
            insbesondere Career-Scan-Scores, CV-Optimierungen und Anschreiben — sind als KI-generierte Inhalte gekennzeichnet
            und mit einem entsprechenden Hinweis auf der Plattform versehen.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Kein Ersatz für menschliches Urteil:</strong> KI-generierte Bewertungen und Empfehlungen auf Job-Lens AI
            sind rein beratender Natur. Der Nutzer hat jederzeit das Recht, eine menschliche Überprüfung zu verlangen.
            Dazu genügt eine E-Mail an{' '}
            <a href="mailto:privacy@job-lens.de" style={{ color: c.accent }}>privacy@job-lens.de</a> oder
            ein Anruf unter <a href="tel:+4915141412851" style={{ color: c.accent }}>+49 151 41412851</a>.
          </p>
        </Section>

        <Section num="5" title="Credit-System und Preise">
          <p style={{ margin: '0 0 12px' }}>
            Die Nutzung kostenpflichtiger KI-Funktionen wird über ein Credit-System abgerechnet.
            Neue Nutzer erhalten bei der Registrierung <strong>5 Gratis-Credits</strong>.
          </p>
          <p style={{ margin: '0 0 12px' }}>Credit-Kosten pro Aktion:</p>
          <div style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: c.primaryLight }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: c.navy }}>Funktion</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: c.navy }}>Credits</span>
            </div>
            {[
              ['Career Scan (vollständige Analyse)', '2'],
              ['CV Builder (Lebenslauf-Optimierung)', '1'],
              ['Cover Letter Builder (Anschreiben)', '1'],
              ['Kira AI Chat (pro 20 Nachrichten nach Freikontingent)', '1'],
              ['Kira Voice Session (5 Minuten)', '3'],
              ['Interview Prep (5 Fragen generieren)', '1'],
              ['Interview Coaching (vollständiges Coaching freischalten)', '1'],
              ['Gehaltsverhandlungs-Simulation (Salary Sim)', '1'],
              ['Arbeitszeugnis-Decoder (Zeugnis)', '1'],
              ['Visa Check (Fachkräftezuwanderung)', '1'],
              ['Auto Apply – Formularanalyse (Beta)', '3'],
              ['Job Case (vollständige Bewerbungsunterlage)', '6'],
            ].map(([action, cost]) => (
              <ROW key={action} label={action} value={`${cost} Credit${cost === '1' ? '' : 's'}`} />
            ))}
          </div>
          <p style={{ margin: '0 0 12px' }}>Credit-Pakete (DACH-Markt, via PayPal):</p>
          <div style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: c.primaryLight }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: c.navy }}>Paket</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: c.navy }}>Preis</span>
            </div>
            {[
              ['Starter — 20 Credits', '€ 4,99'],
              ['Job Hunt — 50 Credits', '€ 9,99'],
              ['Full Sprint — 75 Credits', '€ 13,99'],
            ].map(([pack, price]) => (
              <ROW key={pack} label={pack} value={price} />
            ))}
          </div>
          <p style={{ margin: '0 0 12px' }}>Credit-Pakete (India-Markt, via Razorpay, in INR):</p>
          <div style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: c.primaryLight }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: c.navy }}>Paket</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: c.navy }}>Preis</span>
            </div>
            {[
              ['10 Credits', '₹ 149'],
              ['35 Credits', '₹ 499'],
              ['70 Credits', '₹ 999'],
            ].map(([pack, price]) => (
              <ROW key={pack} label={pack} value={price} />
            ))}
          </div>
          <p style={{ margin: 0 }}>
            Credits haben kein Ablaufdatum. Alle Preise sind Endpreise gemäß § 19 UStG (Kleinunternehmerregelung); es wird keine Umsatzsteuer ausgewiesen.
          </p>
        </Section>

        <Section num="6" title="Job Case — Besondere Bedingungen">
          <p style={{ margin: '0 0 12px' }}>
            Der Job Case ist eine strukturierte Bewerbungsunterlage, die nach Erstellung 30 Tage lang aktiv ist und
            Recruitern über einen einmaligen Zugriffslink zugänglich gemacht werden kann.
          </p>
          <ul style={{ margin: '0 0 12px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>Ablauf:</strong> Job Cases werden nach 30 Tagen automatisch deaktiviert und nach weiteren 30 Tagen gelöscht.</li>
            <li><strong>Credits-Rückerstattung:</strong> Wurde der Job Case innerhalb von 14 Tagen nach Erstellung von keinem Recruiter aufgerufen, werden die 6 Credits automatisch zurückerstattet.</li>
            <li><strong>Video:</strong> Hochgeladene Pitchvideos werden im privaten Supabase-Speicher (EU-Region, Irland) gespeichert und nur über zeitlich begrenzte signierte URLs (30 Minuten Gültigkeit) ausgegeben.</li>
            <li><strong>Einwilligung:</strong> Der Nutzer stimmt mit der Erstellung des Job Case der Verarbeitung seiner Bewerbungsunterlagen und des Videos zur Darstellung gegenüber Recruitern ausdrücklich zu.</li>
          </ul>
        </Section>

        <Section num="7" title="Zahlung und Widerrufsrecht">
          <p style={{ margin: '0 0 12px' }}>
            Zahlungen werden über PayPal (DACH) oder Razorpay (India) abgewickelt. Credits werden nach Zahlungseingang sofort gutgeschrieben.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            <strong>Widerrufsrecht:</strong> Das gesetzliche Widerrufsrecht gemäß § 355 BGB erlischt für digitale Inhalte (Credits)
            mit Beginn der Vertragsausführung, wenn der Nutzer ausdrücklich zugestimmt hat, dass die Ausführung vor Ablauf der
            Widerrufsfrist beginnt, und seine Kenntnis vom Erlöschen des Widerrufsrechts bestätigt hat (§ 356 Abs. 5 BGB).
          </p>
          <p style={{ margin: 0 }}>
            Bei technischen Problemen oder versehentlichen Mehrfachabbuchungen wenden Sie sich bitte innerhalb von 14 Tagen
            an <a href="mailto:kontakt@job-lens.de" style={{ color: c.accent }}>kontakt@job-lens.de</a>{' '}
            oder rufen Sie an unter <a href="tel:+4915141412851" style={{ color: c.accent }}>+49 151 41412851</a>.
          </p>
        </Section>

        <Section num="8" title="Pflichten des Nutzers">
          <p style={{ margin: '0 0 12px' }}>Der Nutzer verpflichtet sich,</p>
          <ul style={{ margin: '0 0 12px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>nur eigene Lebensläufe und Dokumente hochzuladen oder solche, für deren Verarbeitung er berechtigt ist,</li>
            <li>die Plattform nicht für automatisierte Massenanfragen oder missbräuchliche Zwecke zu verwenden,</li>
            <li>keine falschen oder irreführenden Angaben gegenüber Arbeitgebern unter Verwendung KI-generierter Inhalte zu machen,</li>
            <li>alle KI-generierten Inhalte vor dem Versand an Arbeitgeber auf Richtigkeit, Vollständigkeit und Eignung zu prüfen,</li>
            <li>keine Inhalte hochzuladen, die gegen geltendes Recht verstoßen oder Rechte Dritter verletzen.</li>
          </ul>
          <p style={{ margin: 0 }}>
            Der Nutzer ist für alle mit seinem Konto durchgeführten Handlungen vollständig verantwortlich.
          </p>
        </Section>

        <Section num="9" title="Haftungsbeschränkung">
          <p style={{ margin: '0 0 12px' }}>
            Der Anbieter haftet unbegrenzt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie für Vorsatz und grobe Fahrlässigkeit.
          </p>
          <p style={{ margin: '0 0 12px' }}>Im Übrigen ist die Haftung des Anbieters auf den vorhersehbaren, vertragstypischen Schaden begrenzt. Der Anbieter haftet insbesondere nicht für:</p>
          <ul style={{ margin: '0 0 12px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>die inhaltliche Richtigkeit, Vollständigkeit oder Eignung KI-generierter Texte für konkrete Bewerbungen,</li>
            <li>den Erfolg oder Misserfolg von Bewerbungsverfahren,</li>
            <li>vorübergehende Nichtverfügbarkeit der Plattform durch Wartungsarbeiten, Ausfall von Drittdiensten oder höhere Gewalt,</li>
            <li>Schäden durch Drittanbieter (Supabase, Anthropic, OpenAI, Adzuna, PayPal, Razorpay, Vercel, Resend).</li>
          </ul>
          <p style={{ margin: 0 }}>
            Die Haftungsbeschränkungen gelten nicht, soweit Schäden auf eine Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) zurückzuführen sind.
          </p>
        </Section>

        <Section num="10" title="Verfügbarkeit und Änderungen des Dienstes">
          <p style={{ margin: '0 0 12px' }}>
            Der Anbieter strebt eine hohe Verfügbarkeit der Plattform an, übernimmt jedoch keine Garantie für ununterbrochene Verfügbarkeit.
            Geplante Wartungsarbeiten werden, soweit möglich, vorab angekündigt.
          </p>
          <p style={{ margin: 0 }}>
            Der Anbieter behält sich vor, den Funktionsumfang der Plattform jederzeit anzupassen, zu erweitern oder einzuschränken.
            Wesentliche Änderungen, die sich auf die Nutzbarkeit bereits erworbener Credits auswirken,
            werden dem Nutzer mindestens 14 Tage im Voraus per E-Mail mitgeteilt.
          </p>
        </Section>

        <Section num="11" title="Kündigung und Kontolöschung">
          <p style={{ margin: '0 0 12px' }}>
            Der Nutzer kann sein Konto jederzeit selbst unter <strong>Einstellungen → Konto löschen</strong> löschen
            oder eine Löschung per E-Mail an <a href="mailto:kontakt@job-lens.de" style={{ color: c.accent }}>kontakt@job-lens.de</a>{' '}
            beantragen. Nicht genutzte Credits werden dabei nicht erstattet, es sei denn, die Kündigung erfolgt wegen
            einer wesentlichen Leistungsminderung durch den Anbieter.
          </p>
          <p style={{ margin: 0 }}>
            Der Anbieter ist berechtigt, das Nutzerverhältnis aus wichtigem Grund fristlos zu kündigen, insbesondere bei
            missbräuchlicher Nutzung oder Verstoß gegen diese AGB.
          </p>
        </Section>

        <Section num="12" title="Schlussbestimmungen">
          <p style={{ margin: '0 0 12px' }}>
            <strong>Anwendbares Recht:</strong> Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            <strong>Gerichtsstand:</strong> Für Streitigkeiten mit Kaufleuten oder juristischen Personen des öffentlichen Rechts
            ist der Sitz des Anbieters (Böblingen) ausschließlicher Gerichtsstand.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            <strong>Salvatorische Klausel:</strong> Sollten einzelne Bestimmungen dieser AGB unwirksam oder undurchführbar sein,
            bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Änderungen dieser AGB</strong> werden dem Nutzer per E-Mail mitgeteilt. Widerspricht der Nutzer nicht
            innerhalb von 30 Tagen nach Zugang der Mitteilung, gelten die geänderten AGB als angenommen.
            Auf das Widerspruchsrecht und diese Folge wird in der Mitteilung gesondert hingewiesen.
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
