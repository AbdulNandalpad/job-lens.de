'use client'

// DACH landing — Kira-first, outcome-first: she finds jobs, scores fit, and
// produces ready-to-send applications, demonstrated by the self-playing hero
// demo. The previous feature-grid landing is on standby in _landing-v1.tsx.

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import { useLanguage } from '@/lib/i18n'
import KiraDemoWidget from '@/components/KiraDemoWidget'
import KiraOrb from '@/components/KiraOrb'

const { colors: c, gradients: g } = theme

const T = {
  DE: {
    navHow: 'So funktioniert’s',
    navOutput: 'Ergebnisse',
    navGuides: 'Visa Guides',
    navSignIn: 'Anmelden',
    navApp: 'Zur App',
    navCta: 'Mit Kira sprechen',
    eyebrow: 'KI-Karriere-Copilot · Deutschland · Schweiz · Österreich',
    h1a: 'Der richtige Job —',
    h1b: 'fertig beworben.',
    sub: 'Andere schicken dir Job-Links. Kira findet die Stelle in Deutschland, Österreich oder der Schweiz, schreibt deinen Lebenslauf darauf um und legt dir das Anschreiben dazu. Du prüfst und schickst ab.',
    cta1: 'Mit Kira sprechen',
    cta2: 'So funktioniert’s',
    trust: ['5 Credits geschenkt', 'Keine Kreditkarte', 'Made in Germany'],
    strip: ['186.000+ Stellen live', 'DSGVO-konform · EU-Hosting', 'Daten niemals verkauft', 'Powered by Claude AI'],
    howTitle: 'Ein Gespräch. Fertige Bewerbungen.',
    howSub: 'Kein Formular-Marathon. Du redest, Kira arbeitet.',
    steps: [
      { n: '01', title: 'Erzähl Kira von dir', desc: 'Lebenslauf hochladen oder einfach sprechen — per Text oder live mit Stimme. Sie versteht, wohin du willst.', mock: 'chat' },
      { n: '02', title: 'Sie sucht und bewertet', desc: 'Live-Suche über 186.000+ Stellen — inklusive der Jobbörse der Bundesagentur für Arbeit. Jede Stelle wird gegen dein Profil gescort.', mock: 'jobs' },
      { n: '03', title: 'Bewerbung fertig', desc: 'Maßgeschneiderter Lebenslauf, persönliches Anschreiben, Interview-Vorbereitung. Prüfen, herunterladen, abschicken.', mock: 'doc' },
    ],
    outputTitle: 'Echte Ergebnisse — nicht nur Scores.',
    outputSub: 'Das hältst du nach 10 Minuten in der Hand:',
    outputs: [
      { title: 'Ehrlicher CV-Check', desc: 'Score, Stärken, Lücken und konkrete Fixes — so wie ein Recruiter deinen Lebenslauf liest. In 30 Sekunden.', cost: '2 Credits' },
      { title: 'Maßgeschneiderter Lebenslauf', desc: 'Auf die konkrete Stelle umgeschrieben — Keywords, Reihenfolge, Wirkung. Nach deutschen Bewerbungsstandards.', cost: '1 Credit' },
      { title: 'Persönliches Anschreiben', desc: 'Kein Template. Frisch geschrieben für genau diese Stelle und dein Profil.', cost: '1 Credit' },
    ],
    outputNote: 'Eine komplette Bewerbung kostet dich ca. 3–4 Credits. Die ersten 5 sind geschenkt.',
    demoTag: 'Live-Demo',
    demoTitle: 'Sprich mit ihr. Jetzt gleich.',
    demoSub: 'Kira führt echte Gespräche, sucht echte Stellen und erledigt echte Aufgaben — per Text oder mit Stimme. Probier die Demo, ohne Anmeldung.',
    demoBullets: ['Live-Jobsuche im Gespräch', 'Erledigt Aufgaben: CV-Check, Tailoring, Anschreiben', 'Voice-Modus: 5 Minuten echtes Gespräch'],
    toolsTitle: 'Und wenn du’s lieber selbst machst:',
    toolsSub: 'Jedes Werkzeug funktioniert auch einzeln — klassisch, ohne Kira.',
    tools: [
      { icon: 'scan', label: 'Career Scan' },
      { icon: 'search', label: 'Job-Suche' },
      { icon: 'doc', label: 'CV Builder' },
      { icon: 'mail', label: 'Anschreiben' },
      { icon: 'mic', label: 'Interview-Training' },
      { icon: 'coin', label: 'Gehaltsverhandlung' },
      { icon: 'grid', label: 'Bewerbungs-Tracker' },
      { icon: 'shield', label: 'Zeugnis-Decoder' },
    ],
    guideTag: 'Kostenlos · Offizielle Quellen',
    guideTitle: 'Von außerhalb der EU? Wir kennen den Weg.',
    guideSub: 'Schritt-für-Schritt-Guides zu jedem deutschen Arbeitsvisum — Blue Card, Chancenkarte und mehr. Plus Punkte-Rechner mit den offiziellen 2026-Kriterien.',
    guideCta1: 'Chancenkarte-Punkte berechnen',
    guideCta2: 'Alle Visa-Guides',
    privacyTitle: 'Deine Daten. Deine Regeln.',
    privacy: [
      { title: 'DSGVO & EU-Hosting', desc: 'Entwickelt und gehostet in Europa, nach europäischem Recht.' },
      { title: 'Verschlüsselt gespeichert', desc: 'Dein Lebenslauf wird verschlüsselt abgelegt — und nur mit deiner Zustimmung.' },
      { title: 'Niemals verkauft', desc: 'Keine Weitergabe an Recruiter, Arbeitgeber oder Datenhändler. Punkt.' },
    ],
    faqTitle: 'Häufige Fragen',
    faq: [
      { q: 'Was kostet Job-Lens?', a: 'Der Start ist kostenlos — du bekommst 5 Credits geschenkt, ohne Kreditkarte. Danach zahlst du nur, was du nutzt: ein CV-Check kostet 2 Credits, ein maßgeschneiderter Lebenslauf 1 Credit, ein Anschreiben 1 Credit. Credits verfallen nie.' },
      { q: 'Was macht Kira anders als ChatGPT?', a: 'Kira redet nicht nur — sie arbeitet. Sie durchsucht live echte DACH-Stellenbörsen, bewertet deine Passung, schreibt deinen Lebenslauf auf die konkrete Stelle um und erstellt dein Anschreiben. Alles in einem Gespräch, per Text oder Stimme.' },
      { q: 'Woher kommen die Stellenanzeigen?', a: 'Aus der Jobbörse der Bundesagentur für Arbeit und von Adzuna — zusammen über 186.000 live Stellen in Deutschland, Österreich und der Schweiz. Keine erfundenen Listings.' },
      { q: 'Ist mein Lebenslauf sicher?', a: 'Ja. Gespeichert wird er nur mit deiner ausdrücklichen Zustimmung, verschlüsselt, auf EU-Servern. Er wird niemals an Dritte weitergegeben oder verkauft — und du kannst ihn jederzeit löschen.' },
      { q: 'Ich bin noch nicht in Deutschland — hilft mir das trotzdem?', a: 'Gerade dann. Der Visa-Check prüft alle 5 Wege zum deutschen Arbeitsvisum gegen dein Profil, die kostenlosen Guides erklären jeden Schritt, und der Chancenkarte-Rechner zeigt dir sofort, ob du die 6 Punkte erreichst.' },
    ],
    finalTitle: 'Dein nächster Job beginnt mit einem Satz.',
    finalSub: 'Kostenlos starten — 5 Credits geschenkt, keine Kreditkarte.',
    finalCta: 'Mit Kira sprechen',
    footBrand: 'Made in Germany · Job-Lens AI',
    footIndia: 'Job-Lens India',
    footGuides: 'Visa Guides',
    footContact: 'Kontakt',
    footPrivacy: 'Datenschutz',
  },
  EN: {
    navHow: 'How it works',
    navOutput: 'Results',
    navGuides: 'Visa Guides',
    navSignIn: 'Sign in',
    navApp: 'Go to App',
    navCta: 'Talk to Kira',
    eyebrow: 'AI career copilot · Germany · Switzerland · Austria',
    h1a: 'The right job —',
    h1b: 'application ready.',
    sub: 'Others send you job links. Kira finds the role in Germany, Austria or Switzerland, rewrites your CV for it and drafts the cover letter. You review and send.',
    cta1: 'Talk to Kira',
    cta2: 'See how it works',
    trust: ['5 free credits', 'No credit card', 'Made in Germany'],
    strip: ['186,000+ live jobs', 'GDPR-compliant · EU hosting', 'Data never sold', 'Powered by Claude AI'],
    howTitle: 'One conversation. Finished applications.',
    howSub: 'No form marathon. You talk, Kira works.',
    steps: [
      { n: '01', title: 'Tell Kira about yourself', desc: 'Upload your CV or just talk — by text or live voice. She understands where you want to go.', mock: 'chat' },
      { n: '02', title: 'She searches and scores', desc: 'Live search across 186,000+ openings — including the German Federal Employment Agency job board. Every role scored against your profile.', mock: 'jobs' },
      { n: '03', title: 'Application, done', desc: 'Tailored CV, personal cover letter, interview prep. Review, download, send.', mock: 'doc' },
    ],
    outputTitle: 'Real output — not just scores.',
    outputSub: 'What you actually hold after 10 minutes:',
    outputs: [
      { title: 'Honest CV check', desc: 'Score, strengths, gaps and concrete fixes — the way a recruiter reads your CV. In 30 seconds.', cost: '2 credits' },
      { title: 'Tailored CV', desc: 'Rewritten for the specific role — keywords, ordering, impact. Built to German hiring standards.', cost: '1 credit' },
      { title: 'Personal cover letter', desc: 'No template. Written fresh for exactly this role and your profile.', cost: '1 credit' },
    ],
    outputNote: 'A complete application costs about 3–4 credits. Your first 5 are free.',
    demoTag: 'Live demo',
    demoTitle: 'Talk to her. Right now.',
    demoSub: 'Kira holds real conversations, finds real jobs and executes real tasks — by text or voice. Try the demo, no signup needed.',
    demoBullets: ['Live job search inside the conversation', 'Executes tasks: CV check, tailoring, cover letters', 'Voice mode: 5 minutes of real conversation'],
    toolsTitle: 'Prefer doing it yourself?',
    toolsSub: 'Every tool also works standalone — classic mode, no Kira.',
    tools: [
      { icon: 'scan', label: 'Career Scan' },
      { icon: 'search', label: 'Job Search' },
      { icon: 'doc', label: 'CV Builder' },
      { icon: 'mail', label: 'Cover Letter' },
      { icon: 'mic', label: 'Interview Training' },
      { icon: 'coin', label: 'Salary Negotiation' },
      { icon: 'grid', label: 'Application Tracker' },
      { icon: 'shield', label: 'Zeugnis Decoder' },
    ],
    guideTag: 'Free · Official sources',
    guideTitle: 'Coming from outside the EU? We know the way.',
    guideSub: 'Step-by-step guides to every German work visa — Blue Card, Chancenkarte and more. Plus a points calculator with the official 2026 criteria.',
    guideCta1: 'Calculate Chancenkarte points',
    guideCta2: 'All visa guides',
    privacyTitle: 'Your data. Your rules.',
    privacy: [
      { title: 'GDPR & EU hosting', desc: 'Built and hosted in Europe, under European law.' },
      { title: 'Stored encrypted', desc: 'Your CV is stored encrypted — and only with your consent.' },
      { title: 'Never sold', desc: 'No sharing with recruiters, employers or data brokers. Full stop.' },
    ],
    faqTitle: 'Frequently asked questions',
    faq: [
      { q: 'What does Job-Lens cost?', a: 'Starting is free — you get 5 credits, no credit card. After that you pay only for what you use: a CV check costs 2 credits, a tailored CV 1 credit, a cover letter 1 credit. Credits never expire.' },
      { q: 'How is Kira different from ChatGPT?', a: 'Kira doesn’t just talk — she works. She searches real DACH job boards live, scores your fit, rewrites your CV for the specific role and drafts your cover letter. All in one conversation, by text or voice.' },
      { q: 'Where do the job listings come from?', a: 'From the German Federal Employment Agency’s job board and Adzuna — together over 186,000 live openings across Germany, Austria and Switzerland. No invented listings.' },
      { q: 'Is my CV safe?', a: 'Yes. It’s stored only with your explicit consent, encrypted, on EU servers. It is never shared or sold — and you can delete it at any time.' },
      { q: 'I’m not in Germany yet — does this still help?', a: 'Especially then. The visa check scores all 5 routes to a German work visa against your profile, the free guides explain every step, and the Chancenkarte calculator shows instantly whether you reach the 6 points.' },
    ],
    finalTitle: 'Your next job starts with one sentence.',
    finalSub: 'Start free — 5 credits included, no credit card.',
    finalCta: 'Talk to Kira',
    footBrand: 'Made in Germany · Job-Lens AI',
    footIndia: 'Job-Lens India',
    footGuides: 'Visa Guides',
    footContact: 'Contact',
    footPrivacy: 'Privacy',
  },
}

function ToolIcon({ name }: { name: string }) {
  const s = { width: 18, height: 18, fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'scan':   return <svg {...s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>
    case 'search': return <svg {...s} viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
    case 'doc':    return <svg {...s} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>
    case 'mail':   return <svg {...s} viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    case 'mic':    return <svg {...s} viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
    case 'coin':   return <svg {...s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="6" x2="12" y2="18"/><path d="M15 9H10.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H9"/></svg>
    case 'grid':   return <svg {...s} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
    default:       return <svg {...s} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  }
}

// Self-playing hero demo — a scripted loop of Kira doing the real job:
// search → scored matches → tailor → finished application. Every element
// shown is a true product capability.
type DemoItem =
  | { kind: 'user' | 'kira'; text: string }
  | { kind: 'file'; name: string; note: string }
  | { kind: 'job'; title: string; co: string; pct: string }
  | { kind: 'done'; text: string; dl: string }

type DemoStep = { delay: number; item: DemoItem | null; mode?: 'type' | 'voice' }

function HeroDemo({ lang }: { lang: string }) {
  const [items, setItems] = useState<DemoItem[]>([])
  const [mode, setMode] = useState<'type' | 'voice'>('type')

  useEffect(() => {
    const de = lang === 'DE'
    const steps: DemoStep[] = [
      { delay: 700,  item: { kind: 'user', text: de ? 'Hier ist mein Lebenslauf — such mir Product-Manager-Stellen in Berlin.' : 'Here’s my CV — find me product manager roles in Berlin.' } },
      { delay: 600,  item: { kind: 'file', name: 'Lebenslauf.pdf', note: de ? 'hochgeladen ✓' : 'uploaded ✓' } },
      { delay: 1500, item: { kind: 'kira', text: de ? 'Starkes Profil! 34 passende Stellen gefunden — die besten zwei:' : 'Strong profile! Found 34 matching roles — the top two:' } },
      { delay: 700,  item: { kind: 'job', title: 'Senior Product Manager', co: 'Zalando · Berlin', pct: de ? '92% Match' : '92% match' } },
      { delay: 500,  item: { kind: 'job', title: 'Product Lead', co: 'N26 · Berlin', pct: de ? '87% Match' : '87% match' } },
      { delay: 1700, item: { kind: 'user', text: de ? 'Pass meinen Lebenslauf auf die erste an.' : 'Tailor my CV for the first one.' } },
      { delay: 1500, item: { kind: 'kira', text: de ? 'Erledigt — umgeschrieben auf die Anzeige, Anschreiben dazu:' : 'Done — rewritten for the posting, cover letter attached:' } },
      { delay: 800,  item: { kind: 'done', text: de ? '✓ Bewerbung fertig — Zalando' : '✓ Application ready — Zalando', dl: de ? 'Herunterladen ↓' : 'Download ↓' } },
      { delay: 3400, item: null, mode: 'voice' },
      { delay: 3600, item: null, mode: 'type' },
    ]
    let idx = 0
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      timer = setTimeout(() => {
        const s = steps[idx]
        if (s.mode) setMode(s.mode)
        if (s.item === null) setItems([])
        else { const item = s.item; setItems(prev => [...prev, item]) }
        idx = (idx + 1) % steps.length
        tick()
      }, steps[idx].delay)
    }
    setItems([])
    setMode('type')
    tick()
    return () => clearTimeout(timer)
  }, [lang])

  return (
    <div style={{ background: '#fff', border: `1px solid ${c.borderLight}`, borderRadius: 18, boxShadow: '0 18px 50px rgba(4,44,83,0.13)', padding: '16px 16px 14px', height: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingBottom: 11, borderBottom: `1px solid ${c.border}`, marginBottom: 11, flexShrink: 0 }}>
        <div className="v2-orb-mini" style={{ width: 26, height: 26, borderRadius: '50%', background: `linear-gradient(135deg, ${c.ai}, ${c.accent})`, flexShrink: 0 }} />
        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13.5, fontWeight: 700, color: c.text }}>Kira</span>
        <span style={{ fontSize: 9.5, fontWeight: 800, color: c.accent, background: `${c.accent}12`, padding: '2px 8px', borderRadius: 9, letterSpacing: 0.5 }}>LIVE</span>
        <span style={{ flex: 1 }} />
        <span style={{ display: 'inline-flex', background: c.bg, borderRadius: 16, padding: 3, gap: 2 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 11px', borderRadius: 13, transition: 'all .3s', background: mode === 'type' ? '#fff' : 'transparent', color: mode === 'type' ? c.accent : c.textFaint, boxShadow: mode === 'type' ? '0 1px 4px rgba(4,44,83,0.12)' : 'none' }}>
            ⌨ {lang === 'DE' ? 'Tippen' : 'Type'}
          </span>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 11px', borderRadius: 13, transition: 'all .3s', background: mode === 'voice' ? '#fff' : 'transparent', color: mode === 'voice' ? c.ai : c.textFaint, boxShadow: mode === 'voice' ? '0 1px 4px rgba(4,44,83,0.12)' : 'none' }}>
            🎤 {lang === 'DE' ? 'Sprechen' : 'Talk'}
          </span>
        </span>
      </div>
      {mode === 'voice' ? (
        <div className="v2-chat-item" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' }}>
          <KiraOrb state="speaking" />
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14.5, fontWeight: 700, color: c.text, textAlign: 'center' }}>
            {lang === 'DE' ? 'Oder sprich einfach mit ihr — live.' : 'Or just talk to her — live.'}
          </div>
          <div style={{ fontSize: 11.5, color: c.textFaint, textAlign: 'center' }}>
            {lang === 'DE' ? 'Gleiches Gespräch, gleiche Ergebnisse. Per Stimme.' : 'Same conversation, same results. By voice.'}
          </div>
        </div>
      ) : (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
        {items.map((item, i) => {
          if (item.kind === 'user') return (
            <div key={i} className="v2-chat-item" style={{ alignSelf: 'flex-end', background: c.accent, color: '#fff', padding: '8px 13px', borderRadius: '13px 13px 3px 13px', maxWidth: '80%', lineHeight: 1.5 }}>{item.text}</div>
          )
          if (item.kind === 'file') return (
            <div key={i} className="v2-chat-item" style={{ alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${c.borderLight}`, background: c.bgSubtle, borderRadius: 10, padding: '7px 12px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: c.text }}>{item.name}</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: c.success }}>{item.note}</span>
            </div>
          )
          if (item.kind === 'kira') return (
            <div key={i} className="v2-chat-item" style={{ alignSelf: 'flex-start', background: c.bg, color: c.text, padding: '8px 13px', borderRadius: '3px 13px 13px 13px', maxWidth: '84%', lineHeight: 1.5 }}>{item.text}</div>
          )
          if (item.kind === 'job') return (
            <div key={i} className="v2-chat-item" style={{ alignSelf: 'stretch', border: `1px solid ${c.borderLight}`, borderRadius: 11, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
              <span>
                <span style={{ fontWeight: 700, color: c.text }}>{item.title}</span><br />
                <span style={{ fontSize: 11, color: c.textFaint }}>{item.co}</span>
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, color: c.success, background: `${c.success}12`, padding: '3px 9px', borderRadius: 9, flexShrink: 0 }}>{item.pct}</span>
            </div>
          )
          if (item.kind === 'done') return (
            <div key={i} className="v2-chat-item" style={{ alignSelf: 'stretch', border: `1.5px solid ${c.success}55`, background: `${c.success}0a`, borderRadius: 11, padding: '10px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: c.text }}>{item.text}</span>
              <span style={{ fontSize: 11.5, color: c.accent, fontWeight: 700, flexShrink: 0 }}>{item.dl}</span>
            </div>
          )
          return null
        })}
      </div>
      )}
    </div>
  )
}

export default function LandingV2() {
  const [user, setUser] = useState<{ name: string } | null>(null)
  const { lang, setLang } = useLanguage()
  const t = T[lang === 'DE' ? 'DE' : 'EN']

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ name: data.user.user_metadata?.full_name ?? data.user.email ?? 'User' })
    })
  }, [])

  const go = (path: string) => (user ? path : `/login?next=${encodeURIComponent(path)}`)

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: c.text, background: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700;800&display=swap');
        .v2-wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
        .v2-cta { transition: transform .18s ease, box-shadow .18s ease; }
        .v2-cta:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(55,138,221,0.35); }
        .v2-ghost:hover { border-color: ${c.accent} !important; color: ${c.accent} !important; }
        .v2-tool { transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
        .v2-tool:hover { transform: translateY(-3px); border-color: ${c.accent}66; box-shadow: 0 10px 26px rgba(4,44,83,0.10); }
        .v2-nav-link { color: ${c.textMuted}; text-decoration: none; font-size: 14px; }
        .v2-nav-link:hover { color: ${c.accent}; }
        @keyframes v2-rise { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
        .v2-rise { opacity: 0; animation: v2-rise .7s cubic-bezier(.22,1,.36,1) forwards; }
        .v2-chat-item { animation: v2-rise .35s ease forwards; opacity: 0; }
        @keyframes v2-pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.08) } }
        .v2-orb-mini { animation: v2-pulse 2.6s ease-in-out infinite; }
        .v2-hero-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 30px; align-items: center; }
        .v2-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .v2-outputs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .v2-tools-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .v2-privacy-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .v2-demo-grid { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 34px; align-items: center; }
        @media (max-width: 900px) {
          .v2-hero-grid { grid-template-columns: 1fr; text-align: center; }
          .v2-hero-copy { display: flex; flex-direction: column; align-items: center; }
          .v2-steps, .v2-outputs, .v2-privacy-grid { grid-template-columns: 1fr; }
          .v2-tools-grid { grid-template-columns: repeat(2, 1fr); }
          .v2-demo-grid { grid-template-columns: 1fr; }
          .v2-h1 { font-size: 38px !important; }
          .v2-nav-links { display: none; }
        }
      `}</style>

      {/* ── Header ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${c.border}` }}>
        <div className="v2-wrap" style={{ height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.svg" alt="Job-Lens AI" width={30} height={30} style={{ display: 'block' }} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 800, color: c.primary }}>
              Job-Lens <span style={{ color: c.accent }}>AI</span>
            </span>
          </Link>
          <nav className="v2-nav-links" style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
            <a href="#how" className="v2-nav-link">{t.navHow}</a>
            <a href="#output" className="v2-nav-link">{t.navOutput}</a>
            <Link href="/guides" className="v2-nav-link">{t.navGuides}</Link>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setLang(lang === 'DE' ? 'EN' : 'DE')}
              style={{ border: `1px solid ${c.borderLight}`, background: '#fff', color: c.textMuted, borderRadius: 8, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {lang === 'DE' ? 'EN' : 'DE'}
            </button>
            <Link href={user ? '/app' : '/login'} className="v2-nav-link" style={{ fontWeight: 600 }}>
              {user ? t.navApp : t.navSignIn}
            </Link>
            <Link href={go('/app')} className="v2-cta"
              style={{ background: g.button, color: '#fff', padding: '9px 20px', borderRadius: 10, fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 13.5, textDecoration: 'none' }}>
              {t.navCta}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ background: g.heroLight, overflow: 'hidden' }}>
        <div className="v2-wrap" style={{ paddingTop: 72, paddingBottom: 60 }}>
          <div className="v2-hero-grid">
            <div className="v2-hero-copy">
              <div className="v2-rise" style={{ fontSize: 12.5, fontWeight: 700, color: c.accent, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 18 }}>
                {t.eyebrow}
              </div>
              <h1 className="v2-rise v2-h1" style={{ animationDelay: '.08s', fontFamily: "'Outfit', sans-serif", fontSize: 56, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.5, margin: '0 0 20px', color: c.primary }}>
                {t.h1a}<br />
                <span style={{ background: `linear-gradient(90deg, ${c.accent}, ${c.ai})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {t.h1b}
                </span>
              </h1>
              <p className="v2-rise" style={{ animationDelay: '.16s', fontSize: 17, color: c.textMuted, lineHeight: 1.7, maxWidth: 480, margin: '0 0 28px' }}>
                {t.sub}
              </p>
              <div className="v2-rise" style={{ animationDelay: '.24s', display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                <Link href={go('/app')} className="v2-cta"
                  style={{ background: g.button, color: '#fff', padding: '15px 32px', borderRadius: 12, fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 8px 24px rgba(55,138,221,0.3)' }}>
                  {t.cta1} →
                </Link>
                <a href="#how" className="v2-ghost"
                  style={{ background: '#fff', border: `1.5px solid ${c.borderLight}`, color: c.text, padding: '15px 28px', borderRadius: 12, fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 15, textDecoration: 'none', transition: 'all .15s' }}>
                  {t.cta2}
                </a>
              </div>
              <div className="v2-rise" style={{ animationDelay: '.32s', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {t.trust.map(item => (
                  <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: c.textFaint }}>
                    <span style={{ color: c.success, fontWeight: 800 }}>✓</span>{item}
                  </span>
                ))}
              </div>
            </div>

            {/* Self-playing product demo — Kira working, on loop */}
            <div className="v2-rise" style={{ animationDelay: '.2s' }}>
              <HeroDemo lang={lang} />
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div style={{ borderTop: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.6)' }}>
          <div className="v2-wrap" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', padding: '16px 24px' }}>
            {t.strip.map(item => (
              <span key={item} style={{ fontSize: 12.5, fontWeight: 600, color: c.textMuted, background: '#fff', border: `1px solid ${c.border}`, borderRadius: 20, padding: '7px 16px' }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" style={{ padding: '84px 0 70px', background: '#fff' }}>
        <div className="v2-wrap">
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 34, fontWeight: 800, color: c.primary, textAlign: 'center', margin: '0 0 10px', letterSpacing: -0.5 }}>
            {t.howTitle}
          </h2>
          <p style={{ fontSize: 15, color: c.textMuted, textAlign: 'center', margin: '0 0 44px' }}>{t.howSub}</p>
          <div className="v2-steps">
            {t.steps.map(step => (
              <div key={step.n} style={{ background: '#fafcff', border: `1px solid ${c.borderLight}`, borderRadius: 18, padding: '26px 24px', position: 'relative' }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 800, color: c.accent, marginBottom: 12 }}>{step.n}</div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13.5, color: c.textMuted, lineHeight: 1.65, marginBottom: 18 }}>{step.desc}</div>
                {step.mock === 'chat' && (
                  <div style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ background: `${c.accent}12`, borderRadius: '12px 12px 3px 12px', padding: '8px 12px', fontSize: 12, color: c.text, marginBottom: 8, marginLeft: 24 }}>
                      {lang === 'DE' ? '„Ich suche Product-Management-Jobs in Berlin."' : '“I’m looking for product management roles in Berlin.”'}
                    </div>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.accent, opacity: 0.9 }} />
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.accent, opacity: 0.55 }} />
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.accent, opacity: 0.3 }} />
                    </div>
                  </div>
                )}
                {step.mock === 'jobs' && (
                  <div style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {[['92%', c.success], ['87%', c.success], ['74%', c.warning]].map(([pct, col], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ height: 8, borderRadius: 4, background: c.border, width: `${68 - i * 10}%` }} />
                        <span style={{ fontSize: 11, fontWeight: 800, color: col as string }}>{pct}</span>
                      </div>
                    ))}
                  </div>
                )}
                {step.mock === 'doc' && (
                  <div style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ height: 9, width: '46%', borderRadius: 4, background: c.primary, opacity: 0.85, marginBottom: 8 }} />
                    {[86, 74, 80].map((w, i) => (
                      <div key={i} style={{ height: 6, width: `${w}%`, borderRadius: 3, background: c.border, marginBottom: 5 }} />
                    ))}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 11, fontWeight: 700, color: c.success }}>
                      ✓ {lang === 'DE' ? 'Bereit zum Senden' : 'Ready to send'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Real output ── */}
      <section id="output" style={{ padding: '70px 0', background: g.heroLight }}>
        <div className="v2-wrap">
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 34, fontWeight: 800, color: c.primary, textAlign: 'center', margin: '0 0 10px', letterSpacing: -0.5 }}>
            {t.outputTitle}
          </h2>
          <p style={{ fontSize: 15, color: c.textMuted, textAlign: 'center', margin: '0 0 44px' }}>{t.outputSub}</p>
          <div className="v2-outputs">
            {t.outputs.map(o => (
              <div key={o.title} style={{ background: '#fff', border: `1px solid ${c.borderLight}`, borderRadius: 18, padding: '26px 24px', boxShadow: '0 4px 18px rgba(4,44,83,0.06)' }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 700, color: c.text, marginBottom: 8 }}>{o.title}</div>
                <div style={{ fontSize: 13.5, color: c.textMuted, lineHeight: 1.65, marginBottom: 14 }}>{o.desc}</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.accent, background: `${c.accent}10`, border: `1px solid ${c.accent}30`, borderRadius: 16, padding: '4px 12px' }}>
                  {o.cost}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: c.textFaint, textAlign: 'center', marginTop: 24 }}>{t.outputNote}</p>

          <div style={{ marginTop: 44, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: c.text, marginBottom: 4 }}>{t.toolsTitle}</div>
            <div style={{ fontSize: 12.5, color: c.textMuted, marginBottom: 16 }}>{t.toolsSub}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {t.tools.map(tool => (
                <Link key={tool.label} href={go('/app')} className="v2-tool"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${c.borderLight}`, borderRadius: 20, padding: '8px 16px', textDecoration: 'none' }}>
                  <span style={{ color: c.accent, display: 'flex' }}><ToolIcon name={tool.icon} /></span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: c.text }}>{tool.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Live demo ── */}
      <section style={{ padding: '84px 0', background: '#fff' }}>
        <div className="v2-wrap">
          <div style={{ background: 'linear-gradient(160deg,#0c1c30 0%,#08121f 100%)', borderRadius: 26, padding: '52px 36px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -70, left: '30%', width: 500, height: 280, background: 'radial-gradient(ellipse, rgba(55,138,221,0.18) 0%, rgba(109,40,217,0.1) 45%, transparent 70%)', pointerEvents: 'none' }} />
            <div className="v2-demo-grid" style={{ position: 'relative', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: c.accentLight, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>{t.demoTag}</div>
                <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: -0.5 }}>
                  {t.demoTitle}
                </h2>
                <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 0 22px' }}>{t.demoSub}</p>
                {t.demoBullets.map(b => (
                  <div key={b} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ color: '#00e8d0', fontWeight: 800, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>{b}</span>
                  </div>
                ))}
              </div>
              <KiraDemoWidget market="eu" lang={lang} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Visa guides teaser ── */}
      <section style={{ padding: '70px 0', background: '#fff' }}>
        <div className="v2-wrap">
          <div style={{ background: `${c.accent}08`, border: `1.5px solid ${c.accent}40`, borderRadius: 20, padding: '30px 30px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20, justifyContent: 'space-between' }}>
            <div style={{ flex: '1 1 380px' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: c.accent, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>{t.guideTag}</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, color: c.primary, marginBottom: 8, lineHeight: 1.3 }}>{t.guideTitle}</div>
              <div style={{ fontSize: 13.5, color: c.textMuted, lineHeight: 1.65 }}>{t.guideSub}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/guides/chancenkarte-calculator" className="v2-cta"
                style={{ background: g.button, color: '#fff', padding: '12px 22px', borderRadius: 10, fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 13.5, textDecoration: 'none' }}>
                {t.guideCta1} →
              </Link>
              <Link href="/guides" className="v2-ghost"
                style={{ background: '#fff', border: `1.5px solid ${c.borderLight}`, color: c.text, padding: '12px 22px', borderRadius: 10, fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13.5, textDecoration: 'none', transition: 'all .15s' }}>
                {t.guideCta2}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: '70px 0', background: g.heroLight }}>
        <div className="v2-wrap" style={{ maxWidth: 760 }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 30, fontWeight: 800, color: c.primary, textAlign: 'center', margin: '0 0 34px', letterSpacing: -0.5 }}>
            {t.faqTitle}
          </h2>
          {t.faq.map(f => (
            <details key={f.q} style={{ borderBottom: `1px solid ${c.border}`, padding: '16px 4px' }}>
              <summary style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15.5, fontWeight: 700, color: c.text, cursor: 'pointer', listStyle: 'none' }}>
                {f.q}
              </summary>
              <p style={{ fontSize: 14, color: c.textMuted, lineHeight: 1.7, margin: '10px 0 4px' }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ padding: '0 0 84px', background: '#fff' }}>
        <div className="v2-wrap">
          <div style={{ background: g.ctaBlock, borderRadius: 26, padding: '56px 36px', textAlign: 'center' }}>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: -0.5 }}>
              {t.finalTitle}
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: '0 0 28px' }}>{t.finalSub}</p>
            <Link href={go('/app')} className="v2-cta"
              style={{ display: 'inline-block', background: g.button, color: '#fff', padding: '16px 40px', borderRadius: 12, fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 8px 24px rgba(55,138,221,0.4)' }}>
              {t.finalCta} →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${c.border}`, padding: '30px 0 36px', background: '#fff' }}>
        <div className="v2-wrap" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12.5, color: c.textFaint, marginBottom: 14 }}>{t.footBrand}</div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/in" style={{ fontSize: 12.5, color: c.textMuted, textDecoration: 'none' }}>{t.footIndia}</Link>
            <Link href="/guides" style={{ fontSize: 12.5, color: c.textMuted, textDecoration: 'none' }}>{t.footGuides}</Link>
            <Link href="/contact" style={{ fontSize: 12.5, color: c.textMuted, textDecoration: 'none' }}>{t.footContact}</Link>
            <Link href="/impressum" style={{ fontSize: 12.5, color: c.textMuted, textDecoration: 'none' }}>Impressum</Link>
            <Link href="/privacy" style={{ fontSize: 12.5, color: c.textMuted, textDecoration: 'none' }}>{t.footPrivacy}</Link>
            <Link href="/agb" style={{ fontSize: 12.5, color: c.textMuted, textDecoration: 'none' }}>AGB</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
