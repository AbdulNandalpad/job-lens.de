'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import { useLanguage, DEFlag, GBFlag } from '@/lib/i18n'
import KiraDemoWidget from '@/components/KiraDemoWidget'
import AutoApplyDemoWidget from '@/components/AutoApplyDemoWidget'
import SvgIcon, { type IconName } from '@/components/SvgIcon'
import HeroDACH from '@/components/HeroDACH'

const { colors: c, gradients: g, fonts: f, shadow: sh } = theme

type Lang = 'DE' | 'EN'

const translations = {
  DE: {
    navCareerScan: 'Career Scan',
    navJobSearch: 'Job-Suche',
    navSignIn: 'Anmelden',
    navGoToApp: 'Zur App',
    heroTag: 'Deutschland · Schweiz · Österreich',
    heroH1: 'Deinen nächsten Job auf dem DACH-Markt finden',
    heroSub: 'Lade deinen Lebenslauf hoch. Erfahre, wo du stehst. Finde passende Stellen in Deutschland, der Schweiz und Österreich. Bewirb dich mit einem maßgeschneiderten Lebenslauf und Anschreiben.',
    heroCta1: 'Kostenlos starten',
    heroCta2: 'Jobs entdecken',
    indiaPill: 'Jobs in Indien suchen?',
    indiaPillCta: 'Job-Lens India →',
    madeIn: 'Made in Germany',
    dataNote: 'Dein Lebenslauf wird nicht gespeichert',
    freeCredits: '5 kostenlose Credits',
    statsLabels: ['DACH', 'KI', '30 Sek', '1-Klick'],
    statsDescs: ['Marktfokus', 'Gestützte Analyse', 'Career Scan', 'Lebenslauf'],
    featuresTitle: 'Alles, was du für deinen nächsten Job brauchst',
    featuresSub: 'Speziell für Deutschland, die Schweiz und Österreich entwickelt',
    featuresExplore: 'Alle Funktionen entdecken →',
    features: [
      { title: 'Career Scan', desc: 'KI-Score, Gehaltsschätzung, Stärken & Lücken — in 30 Sek.' },
      { title: 'Intelligente Jobsuche', desc: 'Passende DACH-Stellen, abgestimmt auf deinen Lebenslauf.' },
      { title: 'Lebenslauf & Anschreiben', desc: 'Maßgeschneidert für jede Stelle, ATS-optimiert.' },
      { title: 'Interview-Training', desc: 'Rollenspezifische Fragen mit sofortigem KI-Feedback.' },
      { title: 'Gehaltsverhandlung', desc: 'Übe mit einem KI-HR-Manager — Debrief inklusive.' },
      { title: 'Career Card', desc: 'Teile deinen Score als Karte auf LinkedIn oder WhatsApp.' },
      { title: 'Bewerbungs-Tracker', desc: 'Alle Bewerbungen im Blick — von Gespeichert bis Angebot.' },
      { title: 'Auto-Bewerbung', desc: 'KI füllt das gesamte Bewerbungsformular automatisch aus.' },
    ],
    autoApplySpotlightTag: 'Neu · Auto-Bewerbung',
    autoApplySpotlightH2: 'Kira füllt das Formular. Du prüfst. Fertig.',
    autoApplySpotlightSub: 'Füge eine Bewerbungs-URL ein — Workday, Greenhouse, Lever oder jedes direkte Formular. Kira öffnet die Seite, liest alle Felder, ordnet deinen Lebenslauf zu und sendet ab. Du siehst Screenshots bei jedem Schritt.',
    autoApplyBullets: [
      'Funktioniert mit allen gängigen ATS-Plattformen',
      'Ordnet deinen Lebenslauf automatisch jedem Feld zu',
      'Überprüfen & bearbeiten, bevor irgendetwas abgeschickt wird',
      'Echte Browser-Screenshots — du siehst genau, was passiert ist',
    ],
    autoApplyCta: 'Mit Beispielformular testen →',
    autoApplyNote: 'Keine Kreditkarte nötig · 3 Credits pro Bewerbung',
    jobCaseTag: 'Demnächst · Job Case',
    jobCaseH2: 'Deine Bewerbung als interaktive Fallstudie.',
    jobCaseSub: 'Statt eines langweiligen Lebenslaufs präsentierst du Recruitern eine strukturierte Fallstudie: deine Stärken, Belege und Antworten auf die wichtigsten Anforderungen — alles auf einer Seite, mit KI analysiert.',
    jobCaseBullets: [
      'KI analysiert die Stellenanzeige und erstellt dein persönliches Profil',
      'Belege deine Eignung mit echten Beispielen aus deiner Karriere',
      'Optionales Kurzvideo — zeig wer du bist, nicht nur was du kannst',
      'Recruiter erhalten einen privaten Link — keine Registrierung nötig',
    ],
    jobCaseComingSoon: 'Coming Soon',
    howTitle: 'So funktioniert es',
    howSub: 'Vom Lebenslauf-Upload bis zur eingereichten Bewerbung in Minuten',
    steps: [
      { title: 'Lebenslauf hochladen', desc: 'PDF, DOCX oder Text einfügen. Wir extrahieren deine Fähigkeiten und Erfahrungen automatisch.' },
      { title: 'Career Scan erhalten', desc: 'Score, Gehaltsspanne, Stärken, Lücken und einen personalisierten Aktionsplan — in 30 Sekunden.' },
      { title: 'Passende Jobs finden', desc: 'KI durchsucht aktuelle Jobbörsen im DACH-Raum und sortiert Ergebnisse nach Eignung.' },
      { title: 'Mit einem Klick bewerben', desc: 'Maßgeschneiderter Lebenslauf und Anschreiben pro Stelle — oder lass Auto-Bewerbung das Formular ausfüllen.' },
    ],
    pricingTitle: 'Einfache, transparente Preise',
    pricingSub: 'Einmal kaufen, jederzeit nutzen. Credits verfallen nie — kein Abo, kein Stress.',
    plans: [
      {
        name: 'Free',
        price: '0',
        sub: 'Dauerhaft kostenlos · keine Karte nötig',
        credits: '5 Credits',
        features: ['5 Credits bei Registrierung', 'Career Scan — Vorschau', 'Unbegrenzte Jobsuche', 'KI-Jobmatching'],
        cta: 'Kostenlos starten',
        raised: false,
        badge: null,
      },
      {
        name: 'Starter',
        price: '4,99',
        sub: '20 Credits · verfallen nie',
        credits: '~5 Bewerbungen',
        features: ['20 Credits', 'Career Scan — 2 Credits', 'Lebenslauf-Anpassung — 1 Credit', 'Anschreiben — 1 Credit', 'Interview-Training — 1 Credit'],
        cta: 'Starter holen',
        raised: false,
        badge: null,
      },
      {
        name: 'Job Hunt',
        price: '9,99',
        sub: '50 Credits · verfallen nie',
        credits: '~12 Bewerbungen',
        features: ['50 Credits', 'Career Scan — 2 Credits', 'Lebenslauf-Anpassung — 1 Credit', 'Anschreiben — 1 Credit', 'Interview + Gehalts-Sim — je 1 Credit'],
        cta: 'Job Hunt holen',
        raised: true,
        badge: '★ BELIEBTESTE WAHL',
      },
      {
        name: 'Full Sprint',
        price: '13,99',
        sub: '75 Credits · verfallen nie',
        credits: '~18 Bewerbungen',
        features: ['75 Credits', 'Alles aus Job Hunt', 'Mehrmonatige Jobsuche', 'Auto-Bewerbung — 3 Credits', 'Ideal für Karrierewechsler'],
        cta: 'Full Sprint holen',
        raised: false,
        badge: null,
      },
    ] as { name: string; price: string; sub: string; credits: string; features: string[]; cta: string; raised: boolean; badge: string | null }[],
    startFree: 'Kostenlos starten',
    kiraHeroMsg: 'Dein nächster Job ist ein Gespräch entfernt.',
    kiraHeroBtn: 'Kira kennenlernen ↓',
    demoTag: 'Kira Preview',
    demoTitle: 'Sprich mit Kira — Live-Demo',
    demoSub: 'Kira liest deinen Lebenslauf, findet passende Jobs und optimiert deine Bewerbung. Sieh es in Aktion.',
    kiraTag: 'Lern Kira kennen — KI-Karriereassistentin',
    kiraHeadline1: 'Dein nächster Job ist',
    kiraHeadline2: 'ein Gespräch entfernt.',
    kiraSub: 'Kira kennt den DACH-Markt in- und auswendig. Sprich einfach mit ihr — sie findet passende Jobs, liest deinen Lebenslauf und gibt echte Gehaltsdaten. Voice-first. Keine Formulare. Keine Filter.',
    kiraFeatures: [
      { icon: 'mic',      label: 'Voice-first',          desc: 'Einfach sprechen — Kira hört zu' },
      { icon: 'search',   label: 'Live Jobsuche',         desc: 'Echte Stellen, passend zu dir' },
      { icon: 'document', label: 'Lebenslauf-Analyse',    desc: 'Score, Lücken & nächste Schritte' },
    ] as { icon: string; label: string; desc: string }[],
    freeNoteBottom: 'Neue Accounts erhalten',
    freeCreditsNote: '5 kostenlose Credits',
    noCard: '— keine Karte nötig. Credits verfallen nie.',
    ctaTag: '5 kostenlose Credits bei Registrierung · Keine Karte erforderlich',
    ctaTitle: 'Bereit, deine Jobsuche zu starten?',
    ctaSub: 'Karriere-Analyse, Job-Matching und Bewerbungen — alles an einem Ort.',
    ctaBtn1: 'Mit Career Scan starten',
    ctaBtn2: 'Jobs durchsuchen',
    footerBrand: 'Made in Germany · Job-Lens AI',
    footerSignIn: 'Anmelden',
    footerGoApp: 'Zur App',
    footerCareerScan: 'Career Scan',
    footerJobSearch: 'Job-Suche',
  },
  EN: {
    navCareerScan: 'Career Scan',
    navJobSearch: 'Job Search',
    navSignIn: 'Sign In',
    navGoToApp: 'Go to App',
    heroTag: 'Germany · Switzerland · Austria',
    heroH1: 'Find your next job in the DACH market',
    heroSub: 'Upload your CV. See where you stand. Get matched with real jobs across Germany, Switzerland and Austria. Apply with a tailored CV and cover letter.',
    heroCta1: 'Get Started Free',
    heroCta2: 'Explore Jobs',
    indiaPill: 'Looking for jobs in India?',
    indiaPillCta: 'Job-Lens India →',
    madeIn: 'Made in Germany',
    dataNote: 'Your CV is never saved',
    freeCredits: '5 free credits',
    statsLabels: ['DACH', 'AI', '30s', '1-click'],
    statsDescs: ['Market focus', 'Powered analysis', 'Career scan', 'CV tailoring'],
    featuresTitle: 'Everything you need to land your next role',
    featuresSub: 'Built specifically for Germany, Switzerland and Austria',
    featuresExplore: 'Explore all features →',
    features: [
      { title: 'Career Scan', desc: 'AI score, salary estimate, strengths and gaps — in 30 seconds.' },
      { title: 'Smart Job Search', desc: 'Best-matched DACH jobs pulled from your CV automatically.' },
      { title: 'CV & Cover Letter', desc: 'One-click tailored CV and cover letter, ATS-optimised.' },
      { title: 'Interview Prep', desc: 'Role-specific questions with instant AI feedback and scoring.' },
      { title: 'Salary Simulator', desc: 'Practice negotiating with an AI hiring manager. Get a debrief.' },
      { title: 'Career Card', desc: 'Share your score as a card on LinkedIn, Twitter or WhatsApp.' },
      { title: 'Application Tracker', desc: 'Track every application from Saved to Offer in one place.' },
      { title: 'Auto Apply', desc: 'AI fills the entire application form for you automatically.' },
    ],
    autoApplySpotlightTag: 'New · Auto Apply',
    autoApplySpotlightH2: 'Kira fills the form. You review. Done.',
    autoApplySpotlightSub: 'Paste any job application URL — Workday, Greenhouse, Lever, or any direct form. Kira opens the page, reads every field, maps your CV, and submits. You see screenshots at every step.',
    autoApplyBullets: [
      'Works on all major ATS platforms',
      'Maps your CV to every field automatically',
      'Review & edit before anything is submitted',
      'Real browser screenshots so you see exactly what happened',
    ],
    autoApplyCta: 'Try with sample form →',
    autoApplyNote: 'No credit card needed · 3 credits per application',
    jobCaseTag: 'Coming Soon · Job Case',
    jobCaseH2: 'Your application as an interactive case study.',
    jobCaseSub: 'Instead of a static CV, give recruiters a structured case: your strengths, evidence, and answers to each key requirement — one link, AI-powered.',
    jobCaseBullets: [
      'AI analyses the job posting and builds your personal fit profile',
      'Back up your skills with real examples from your career',
      'Optional short video — show who you are, not just what you\'ve done',
      'Recruiters get a private link — no sign-up required',
    ],
    jobCaseComingSoon: 'Coming Soon',
    howTitle: 'How it works',
    howSub: 'From CV upload to submitted application in minutes',
    steps: [
      { title: 'Upload your CV', desc: 'PDF, DOCX or paste text. We extract your skills and experience automatically.' },
      { title: 'Get your Career Scan', desc: 'Score, salary range, strengths, gaps and a personalised action plan — in 30 seconds.' },
      { title: 'Find matching jobs', desc: 'AI searches live boards across DACH and ranks results by how well they fit your profile.' },
      { title: 'Apply in one click', desc: 'Tailored CV and cover letter per job — or let Auto Apply fill the whole form for you.' },
    ],
    pricingTitle: 'Simple, honest pricing',
    pricingSub: 'Buy once, use anytime. Credits never expire — no subscription, no pressure.',
    plans: [
      {
        name: 'Free',
        price: '0',
        sub: 'Forever free · no card needed',
        credits: '5 credits',
        features: ['5 credits on signup', 'Career Scan — preview', 'Unlimited job browsing', 'Smart job matching'],
        cta: 'Start free',
        raised: false,
        badge: null,
      },
      {
        name: 'Starter',
        price: '4.99',
        sub: '20 credits · never expire',
        credits: '~5 applications',
        features: ['20 credits', 'Career Scan — 2 credits', 'CV tailoring — 1 credit each', 'Cover letter — 1 credit each', 'Interview Prep — 1 credit'],
        cta: 'Get Starter',
        raised: false,
        badge: null,
      },
      {
        name: 'Job Hunt',
        price: '9.99',
        sub: '50 credits · never expire',
        credits: '~12 applications',
        features: ['50 credits', 'Career Scan — 2 credits', 'CV tailoring — 1 credit each', 'Cover letter — 1 credit each', 'Interview + Salary Sim — 1 credit each'],
        cta: 'Get Job Hunt',
        raised: true,
        badge: '★ MOST POPULAR',
      },
      {
        name: 'Full Sprint',
        price: '13.99',
        sub: '75 credits · never expire',
        credits: '~18 applications',
        features: ['75 credits', 'Everything in Job Hunt', 'Multi-month job search', 'Auto Apply — 3 credits', 'Ideal for career changers'],
        cta: 'Get Full Sprint',
        raised: false,
        badge: null,
      },
    ] as { name: string; price: string; sub: string; credits: string; features: string[]; cta: string; raised: boolean; badge: string | null }[],
    startFree: 'Start free',
    kiraHeroMsg: 'Your next job is a conversation away.',
    kiraHeroBtn: 'Meet Kira ↓',
    demoTag: 'Kira Preview',
    demoTitle: 'Talk to Kira — live demo',
    demoSub: 'Kira reads your CV, finds matching jobs and optimises your application. See it in action.',
    kiraTag: 'Meet Kira — AI Career Assistant',
    kiraHeadline1: 'Your next job is a',
    kiraHeadline2: 'conversation away.',
    kiraSub: 'Kira knows the DACH market inside out. Just talk — she finds live jobs, reads your CV, gives real salary data. Voice-first. No forms. No fluff. Just results.',
    kiraFeatures: [
      { icon: 'mic', label: 'Voice-first', desc: 'Just speak — Kira listens' },
      { icon: 'search', label: 'Live job search', desc: 'Real roles, matched to you' },
      { icon: 'document', label: 'CV insight', desc: 'Score, gaps & next steps' },
    ] as { icon: string; label: string; desc: string }[],
    freeNoteBottom: 'New accounts get',
    freeCreditsNote: '5 free credits',
    noCard: '— no card needed. Credits never expire.',
    ctaTag: '5 free credits on signup · No card required',
    ctaTitle: 'Ready to start your job search?',
    ctaSub: 'Career analysis, job matching and applications — all in one place.',
    ctaBtn1: 'Start with Career Scan',
    ctaBtn2: 'Browse Jobs',
    footerBrand: 'Made in Germany · Job-Lens AI',
    footerSignIn: 'Sign in',
    footerGoApp: 'Go to App',
    footerCareerScan: 'Career Scan',
    footerJobSearch: 'Job Search',
  },
}

export default function HomePage() {
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [langOpen, setLangOpen] = useState(false)
  const { lang, setLang, t: _ctxT } = useLanguage()

  // Use local translations object for homepage-specific strings (matches existing structure)
  const t = translations[lang]

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const name = data.user.user_metadata?.full_name ?? data.user.email ?? 'User'
        setUser({ name: name.split(' ')[0] })
      }
      setLoading(false)
    })
  }, [])

  const go = (path: string) => user ? path : `/login?next=${encodeURIComponent(path)}`

  const trustRef = useRef<HTMLDivElement>(null)

  // Order: Career Scan, Job Search, CV+CL, Interview, Salary Sim, Career Card, Tracker, Auto Apply
  const featureBgs    = [c.primaryLight, c.successLight,  c.warningLight, c.primaryLight, c.successLight, c.aiLight, c.warningLight, c.aiLight]
  const featureColors = [c.navy,         c.success,       c.warning,      c.accent,       c.success,      c.ai,      c.warning,     c.ai]
  const featureBadges: (string | null)[] = [null, null, null, null, null, null, null, lang === 'DE' ? 'Beta' : 'Beta']
  const featureHrefs  = [
    go('/app/career-scan'), go('/app/jobs'), go('/app/cv-builder'), go('/app/interview'),
    go('/app/salary-sim'),  go('/app/career-scan'), go('/app/tracker'), go('/app/auto-apply'),
  ]
  // SVG icons — stroke="currentColor" picks up color from wrapper div
  const featureIcons: ReactNode[] = [
    // Career Scan — radar rings
    <svg key={0} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="5"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
    </svg>,
    // Job Search — briefcase + magnifier
    <svg key={1} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="13" height="11" rx="2"/>
      <path d="M9 7V5a2 2 0 0 1 4 0v2"/>
      <circle cx="18.5" cy="9.5" r="3"/>
      <line x1="20.6" y1="11.6" x2="22.5" y2="13.5"/>
    </svg>,
    // CV & Cover Letter — document with fold
    <svg key={2} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="12" y2="17"/>
    </svg>,
    // Interview Prep — microphone + stand
    <svg key={3} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
      <line x1="9" y1="21" x2="15" y2="21"/>
    </svg>,
    // Salary Sim — coin with currency paths
    <svg key={4} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <line x1="12" y1="6" x2="12" y2="18"/>
      <path d="M15 9H10.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H9"/>
    </svg>,
    // Career Card — ID card with avatar line
    <svg key={5} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="15" rx="2"/>
      <circle cx="8.5" cy="12" r="2.5"/>
      <line x1="13" y1="10.5" x2="19.5" y2="10.5"/>
      <line x1="13" y1="14" x2="17" y2="14"/>
    </svg>,
    // Application Tracker — kanban board
    <svg key={6} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
      <line x1="15" y1="3" x2="15" y2="21"/>
      <rect x="4.5" y="6.5" width="3" height="2.5" rx="0.5" fill="currentColor" stroke="none" fillOpacity="0.5"/>
      <rect x="10.5" y="8.5" width="3" height="2.5" rx="0.5" fill="currentColor" stroke="none" fillOpacity="0.5"/>
      <rect x="16.5" y="6.5" width="3" height="2.5" rx="0.5" fill="currentColor" stroke="none" fillOpacity="0.5"/>
      <rect x="4.5" y="12" width="3" height="2.5" rx="0.5" fill="currentColor" stroke="none" fillOpacity="0.3"/>
    </svg>,
    // Auto Apply — lightning bolt
    <svg key={7} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" fillOpacity="0.15"/>
    </svg>,
  ]

  const stats = t.statsLabels.map((v, i) => ({ value: v, label: t.statsDescs[i] }))

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body, overflowX: 'hidden' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideCard { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }

        .jl-hero-tag   { animation: fadeIn 0.4s ease 0.1s both; }
        .jl-hero-h1    { animation: fadeUp 0.6s ease 0.25s both; }
        .jl-hero-sub   { animation: fadeUp 0.6s ease 0.4s both; }
        .jl-hero-btns  { animation: fadeUp 0.6s ease 0.55s both; }

        .jl-nav-link:hover { color: ${c.text} !important; }
        .jl-btn-primary {
          background: ${g.button};
          transition: all 0.2s;
        }
        .jl-btn-primary:hover {
          background: ${g.buttonHover};
          box-shadow: ${sh.glow};
          transform: translateY(-1px);
        }
        .jl-btn-glass {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.18);
          transition: all 0.2s;
        }
        .jl-btn-glass:hover {
          background: rgba(255,255,255,0.14);
          transform: translateY(-1px);
        }
        .jl-card { animation: slideCard 0.5s ease both; }

        .jl-feat-card {
          background: #fff;
          border: 1.5px solid ${c.border};
          border-radius: 16px;
          padding: 22px;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
        }
        .jl-feat-card:hover {
          border-color: ${c.accent};
          box-shadow: ${sh.cardHover};
          transform: translateY(-3px);
        }

        .jl-feature-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        @media (max-width: 1000px) { .jl-feature-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .jl-feature-grid { grid-template-columns: 1fr 1fr; gap: 10px; } }
        @media (max-width: 560px) { .jl-feat-desc { display: none !important; } .jl-feat-card { padding: 16px !important; } }
        @media (max-width: 768px) { .jl-pill-desc { display: none !important; } }
        @media (max-width: 680px) { .jl-step-desc { display: none !important; } }
        .jl-pricing-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; max-width: 1040px; margin: 0 auto; align-items: start; }
        @media (max-width: 900px)  { .jl-pricing-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px)  { .jl-pricing-grid { grid-template-columns: 1fr; } }
        @media (max-width: 900px)  { .jl-pricing-grid > * { margin-top: 0 !important; } }

        .jl-steps { display: flex; gap: 0; position: relative; }
        .jl-step { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 0 12px; position: relative; z-index: 1; }
        .jl-step-circle {
          width: 56px; height: 56px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; line-height: 1; margin-bottom: 20px; flex-shrink: 0;
          position: relative;
        }
        .jl-step-circle::after {
          content: ''; position: absolute; inset: -3px; border-radius: 50%;
          opacity: 0; transition: opacity 0.25s;
        }
        .jl-step:hover .jl-step-circle::after { opacity: 1; }
        @media (max-width: 680px) {
          .jl-steps { flex-direction: column; gap: 0; }
          .jl-step { flex-direction: row; text-align: left; padding: 0 0 28px 0; align-items: flex-start; }
          .jl-step-circle { margin-bottom: 0; margin-right: 20px; flex-shrink: 0; }
          .jl-steps-track { display: none !important; }
        }

        .jl-lang-btn { display: flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 8px; border: 1px solid transparent; cursor: pointer; font-size: 11px; font-weight: 600; font-family: inherit; transition: all 0.15s; background: transparent; }
        .jl-lang-btn.active { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.2); }
        .jl-lang-btn:not(.active) { color: rgba(255,255,255,0.4); }
        .jl-lang-btn:not(.active):hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.06); }
        .jl-home-logo-text { display: inline; }
        .jl-home-lang { display: flex; }
        .jl-home-dach-pill { display: inline-flex; }
        .jl-home-india { display: flex; }
        .jl-home-greeting { display: inline; }
        .jl-home-nav-links { display: contents; }
        @media (max-width: 768px) {
          .jl-home-logo-text { display: none !important; }
          .jl-home-dach-pill { display: none !important; }
          .jl-home-greeting { display: none !important; }
          .jl-home-nav-links { display: none !important; }
        }

        /* ── Mobile section spacing ── */
        .jl-section { padding: 80px 24px 56px; }
        @media (max-width: 768px) { .jl-section { padding: 48px 16px 40px; } }

        /* ── Hero trust bar ── */
        .jl-hero-trust { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; font-size: 12px; color: rgba(255,255,255,0.55); }
        @media (max-width: 480px) { .jl-hero-trust { gap: 8px; font-size: 11px; } .jl-hero-trust .jl-dot { display: none; } }

        /* ── Kira hero teaser ── */
        .jl-kira-teaser { display: inline-flex; align-items: center; gap: 14px; border-radius: 20px; padding: 14px 18px 14px 14px; max-width: 480px; width: 100%; }
        @media (max-width: 480px) { .jl-kira-teaser { gap: 10px; padding: 12px 14px; } .jl-kira-teaser-cta { display: none !important; } }

        /* ── Kira demo section ── */
        .jl-kira-demo-box { border-radius: 24px; padding: 64px 32px 52px; position: relative; overflow: hidden; }
        @media (max-width: 768px) { .jl-kira-demo-box { padding: 40px 16px 36px; border-radius: 16px; } }

        /* ── How it works section ── */
        @media (max-width: 480px) { .jl-step { padding-bottom: 20px !important; } }

        /* ── Hero ── */
        @media (max-width: 768px) { .jl-hero { padding: 52px 20px 80px !important; } }
        @media (max-width: 480px) { .jl-hero { padding: 40px 16px 72px !important; } }

        /* ── Sub-sections inside main wrapper ── */
        .jl-subsection { margin-top: 80px; }
        @media (max-width: 768px) { .jl-subsection { margin-top: 48px; } }

        /* ── Bottom CTA block ── */
        @media (max-width: 768px) { .jl-cta-block { padding: 40px 20px !important; border-radius: 16px !important; } }
      `}</style>

      {/* ── Navbar ── */}
      <div style={{ background: '#fff', padding: '0 24px', height: theme.navbar.height, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(55,138,221,0.07)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="26" height="26" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke={c.accent} strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="8" fill="none" stroke={c.accentLight} strokeWidth="1.2"/>
            <circle cx="20" cy="20" r="3" fill={c.accent}/>
            <line x1="7" y1="20" x2="33" y2="20" stroke={c.accent} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5"/>
            <line x1="28" y1="28" x2="36" y2="36" stroke={c.accent} strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span className="jl-home-logo-text" style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: '#1a2332' }}>
            Job-Lens <span style={{ color: c.accent }}>AI</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Language dropdown */}
          <div className="jl-home-lang" style={{ position: 'relative' }}>
            <button onClick={() => setLangOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8faff', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#1a2332', fontFamily: 'inherit' }}>
              {lang} <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 2 }}>{langOpen ? '▲' : '▼'}</span>
            </button>
            {langOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', zIndex: 200, minWidth: 110, boxShadow: '0 8px 24px rgba(55,138,221,0.12)' }}>
                {(['DE', 'EN'] as const).map(code => (
                  <button key={code} onClick={() => { setLang(code); setLangOpen(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', border: 'none', background: lang === code ? 'rgba(55,138,221,0.08)' : 'transparent', color: lang === code ? '#378ADD' : '#4a5568', fontSize: 12, fontWeight: lang === code ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    {code} <span style={{ opacity: 0.5, fontWeight: 400 }}>— {code === 'DE' ? 'Deutsch' : 'English'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Market pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            <span className="jl-home-dach-pill" style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 10, border: '1px solid rgba(55,138,221,0.35)', background: 'rgba(55,138,221,0.08)', color: '#378ADD', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <SvgIcon name="flag-de" size={14} /> DACH
            </span>
            <Link href="/in" style={{ fontSize: 11, fontWeight: 600, textDecoration: 'none', padding: '5px 12px', borderRadius: 10, border: '1px solid rgba(255,153,51,0.2)', background: 'rgba(255,153,51,0.07)', color: '#FF9933', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <SvgIcon name="flag-in" size={14} /> India
            </Link>
          </div>

          {!loading && (user ? (
            <>
              <span className="jl-home-greeting" style={{ fontSize: 13, color: '#4a5568' }}>Hi, {user.name}</span>
              <Link href="/app" className="jl-btn-primary" style={{ fontSize: 12, padding: '6px 18px', borderRadius: 20, color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
                {t.navGoToApp}
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="jl-btn-primary" style={{ fontSize: 12, padding: '6px 18px', borderRadius: 20, color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
                {t.navSignIn}
              </Link>
            </>
          ))}
        </div>
      </div>

      {/* ── Hero ── */}
      <HeroDACH lang={lang} user={user} />

      {/* ── Job Case spotlight ── */}
      <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)', borderTop: '1px solid rgba(34,197,94,0.2)', borderBottom: '1px solid rgba(34,197,94,0.2)', padding: '60px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Top: hook + headline */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.22)', borderRadius: 20, padding: '5px 14px', marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: 1.2, textTransform: 'uppercase' as const }}>
                {lang === 'DE' ? 'Neu — Job Case' : 'New — Job Case'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#4a5568', margin: '0 0 14px', letterSpacing: 0.2 }}>
              {lang === 'DE' ? 'Der PDF-Lebenslauf ist 30 Jahre alt. Es ist Zeit, ihn zu ersetzen.' : 'The PDF résumé is 30 years old. It\'s time to move on.'}
            </p>
            <h2 style={{ fontFamily: f.heading, fontSize: 'clamp(24px,3.2vw,42px)', fontWeight: 800, color: '#1a2332', lineHeight: 1.1, letterSpacing: -1.2, margin: '0 auto 18px', maxWidth: 700 }}>
              {lang === 'DE'
                ? <><span style={{ color: '#1a2332' }}>Job Case ist ein lebendes, teilbares</span><br /><span style={{ color: '#22c55e' }}>Karriereprofil — kein statisches Dokument.</span></>
                : <><span style={{ color: '#1a2332' }}>Job Case is a living, shareable career profile</span><br /><span style={{ color: '#22c55e' }}>— not a static document.</span></>}
            </h2>
            <p style={{ fontSize: 15, color: '#4a5568', lineHeight: 1.8, margin: '0 auto 32px', maxWidth: 540 }}>
              {lang === 'DE'
                ? 'Recruiter verbringen 6 Sekunden mit einem Lebenslauf. Job Case macht diese 6 Sekunden bedeutsam.'
                : 'Recruiters spend 6 seconds on a CV. Job Case makes those 6 seconds count.'}
            </p>
            <a href={user ? '/app/job-case/new' : `/login?next=${encodeURIComponent('/app/job-case/new')}`}
              style={{ display: 'inline-block', background: '#22c55e', color: '#000', padding: '14px 32px', borderRadius: 10, fontFamily: f.heading, fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 24px rgba(34,197,94,0.38)', letterSpacing: -0.2 }}>
              {lang === 'DE' ? 'Job Case erstellen →' : 'Create Job Case →'}
            </a>
          </div>

          {/* Bottom: 4 differentiators */}
          <style>{`@media(max-width:768px){.jc-diff-body{display:none!important}.jc-diff-grid{grid-template-columns:1fr 1fr!important;gap:10px!important}.jc-diff-tile{padding:14px 12px!important}}`}</style>
          <div className="jc-diff-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {([
              {
                icon: '📱',
                title: lang === 'DE' ? 'Profil, kein PDF' : 'A profile, not a PDF',
                body: lang === 'DE' ? 'Skills, Impact, ein kurzes Pitch-Video und Nachweise — auf einen Blick sichtbar, auf jedem Gerät.' : 'Skills, impact, a short pitch video & proof visible at a glance, on any device.',
              },
              {
                icon: '🔗',
                title: lang === 'DE' ? 'Ein Link — überall einsetzbar' : 'One link, anywhere',
                body: lang === 'DE' ? 'Teilen, einbetten oder in jede Bewerbung einfügen. Recruiter brauchen keinen Account.' : 'Share, embed or drop into any application. Recruiters need no account to open it.',
              },
              {
                icon: '⚡',
                title: lang === 'DE' ? 'Immer aktuell' : 'Always current',
                body: lang === 'DE' ? 'Automatisch aus deinem Lebenslauf und deiner Job-Lens-Aktivität generiert — immer auf dem neuesten Stand.' : 'Generated from your CV and Job-Lens activity — always up to date, never stale.',
              },
              {
                icon: '✅',
                title: lang === 'DE' ? 'Erfahrungstiefe & Nachweise' : 'Experience depth & verified skills',
                body: lang === 'DE' ? 'Zeigt konkrete Belege und echte Erfahrungstiefe — was ein Lebenslauf selten schafft.' : 'Shows your experience depth and verified skills — what a CV rarely conveys.',
              },
            ] as { icon: string; title: string; body: string }[]).map((item, i) => (
              <div key={i} className="jc-diff-tile" style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, padding: '20px 18px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: 16 }}>
                <span style={{ fontSize: 26 }}>{item.icon}</span>
                <div style={{ fontFamily: f.heading, fontSize: 14, fontWeight: 700, color: '#1a2332' }}>{item.title}</div>
                <div className="jc-diff-body" style={{ fontSize: 12, color: '#4a5568', lineHeight: 1.65 }}>{item.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Market Facts Bar ── */}
      <div ref={trustRef} style={{ background: 'linear-gradient(90deg,#f0f6ff 0%,#eef4ff 50%,#f0f6ff 100%)', borderBottom: '1px solid rgba(55,138,221,0.15)' }}>
        <div className="jl-trust-grid" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {([
            { val: '75%', label: lang === 'DE' ? 'der Lebensläufe scheitern am ATS-Filter' : 'of CVs fail the ATS filter', color: '#E24B4A', src: 'Jobscan 2024' },
            { val: '6 Sek', label: lang === 'DE' ? 'Recruiter-Zeit pro Lebenslauf' : 'recruiter time per CV', color: '#f59e0b', src: 'TheLadders' },
            { val: '186k+', label: lang === 'DE' ? 'offene Stellen in DACH' : 'open positions in DACH', color: '#10b981', src: 'Adzuna' },
            { val: '3 Mon.', label: lang === 'DE' ? 'ø Jobsuche in Deutschland' : 'avg job search in Germany', color: '#a855f7', src: 'Statista 2024' },
          ] as const).map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '22px 12px', borderRight: i < 3 ? '1px solid rgba(55,138,221,0.1)' : 'none' }}>
              <div style={{ fontFamily: f.heading, fontSize: 'clamp(20px,2.8vw,30px)', fontWeight: 800, color: s.color, lineHeight: 1, letterSpacing: -0.5 }}>{s.val}</div>
              <div style={{ fontSize: 11, color: '#4a5568', marginTop: 6, lineHeight: 1.45 }}>{s.label}</div>
              <div style={{ fontSize: 9, color: '#6b7c93', marginTop: 4 }}>{s.src}</div>
            </div>
          ))}
        </div>
        <style>{`@media(max-width:640px){.jl-trust-grid{grid-template-columns:1fr 1fr!important}}`}</style>
      </div>

      {/* ── Features ── */}
      <div className="jl-section" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ fontFamily: f.heading, fontSize: 26, fontWeight: 700, color: c.primary, marginBottom: 10 }}>
            {t.featuresTitle}
          </div>
          <div style={{ fontSize: 14, color: c.textMuted, maxWidth: 440, margin: '0 auto', lineHeight: 1.65 }}>
            {t.featuresSub}
          </div>
        </div>

        <div className="jl-feature-grid">
          {t.features.map((feat, idx) => (
            <Link
              key={feat.title}
              href={featureHrefs[idx]}
              className="jl-card jl-feat-card"
              style={{ animationDelay: `${idx * 0.12}s`, textDecoration: 'none', display: 'flex', flexDirection: 'column' as const, gap: 10 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: featureBgs[idx], color: featureColors[idx], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {featureIcons[idx]}
                </div>
                {featureBadges[idx] && (
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' as const, background: featureBgs[idx], color: featureColors[idx], padding: '3px 10px', borderRadius: 20, border: `1px solid ${featureColors[idx]}30` }}>
                    {featureBadges[idx]}
                  </span>
                )}
              </div>
              <div style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 700, color: c.primary }}>{feat.title}</div>
              <div className="jl-feat-desc" style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.6 }}>{feat.desc}</div>
            </Link>
          ))}
        </div>

        {/* ── Auto Apply spotlight — removed, covered by hero slider + feature grid ── */}
        {false && <div className="jl-subsection">
          <div className="aa-spotlight-grid" style={{
            background: 'linear-gradient(160deg, #0d1f30 0%, #091624 100%)',
            borderRadius: 20,
            border: '1px solid rgba(55,138,221,0.18)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            overflow: 'hidden',
            padding: '48px 40px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 48,
            alignItems: 'center',
          }}>
            {/* Left — copy */}
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(55,138,221,0.15)', border: '1px solid rgba(55,138,221,0.3)',
                borderRadius: 20, padding: '4px 14px', marginBottom: 20,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#378ADD', display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#378ADD', letterSpacing: 0.6, textTransform: 'uppercase' as const }}>
                  {t.autoApplySpotlightTag}
                </span>
              </div>

              <h2 style={{ fontFamily: f.heading, fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1.25, marginBottom: 16, margin: '0 0 16px' }}>
                {t.autoApplySpotlightH2}
              </h2>

              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 24, margin: '0 0 24px' }}>
                {t.autoApplySpotlightSub}
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                {t.autoApplyBullets.map((b, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(55,138,221,0.2)', border: '1px solid rgba(55,138,221,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#378ADD', flexShrink: 0, marginTop: 1 }}>✓</span>
                    {b}
                  </li>
                ))}
              </ul>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' as const }}>
                <Link
                  href={user ? '/app/auto-apply' : '/login'}
                  style={{
                    display: 'inline-block', padding: '12px 28px', borderRadius: 11,
                    background: 'linear-gradient(135deg, #378ADD, #185FA5)',
                    color: '#fff', fontWeight: 700, fontSize: 14,
                    textDecoration: 'none', fontFamily: f.heading,
                    boxShadow: '0 6px 24px rgba(55,138,221,0.35)',
                  }}
                >
                  {t.autoApplyCta}
                </Link>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)' }}>
                  {t.autoApplyNote}
                </span>
              </div>
            </div>

            {/* Right — live demo widget */}
            <div>
              <AutoApplyDemoWidget
                market="eu"
                onTryItYourself={() => { window.location.href = user ? '/app/auto-apply' : '/login' }}
                onTryWithSample={() => { window.location.href = user ? '/app/auto-apply' : '/login' }}
              />
            </div>
          </div>

          {/* Mobile fallback styles */}
          <style>{`
            @media (max-width: 768px) {
              .aa-spotlight-grid { grid-template-columns: 1fr !important; padding: 28px 20px !important; gap: 32px !important; }
            }
          `}</style>
        </div>}

        {/* ── The DACH Reality ── */}
        <div className="jl-subsection">
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #edf1f6', borderTop: '4px solid #E24B4A', padding: 'clamp(28px,5vw,52px) clamp(20px,5vw,44px)', boxShadow: '0 4px 32px rgba(4,44,83,0.06)' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#E24B4A', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 14 }}>
                {lang === 'DE' ? 'Die DACH-Realität' : 'The DACH Reality'}
              </div>
              <h2 style={{ fontFamily: f.heading, fontSize: 'clamp(20px,3.5vw,30px)', fontWeight: 700, color: c.primary, lineHeight: 1.25, maxWidth: 560, margin: '0 auto 14px' }}>
                {lang === 'DE'
                  ? 'Die meisten Bewerber wissen nicht, was mit ihrem Lebenslauf passiert.'
                  : "Most job seekers don't realise what's happening to their CV."}
              </h2>
              <p style={{ fontSize: 14, color: c.textMuted, maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>
                {lang === 'DE'
                  ? 'Bevor dein Lebenslauf einen Recruiter erreicht, durchläuft er automatische KI-Filter — und die meisten scheitern unsichtbar.'
                  : 'Before your CV reaches a recruiter, it passes through automated AI filters — and most are rejected invisibly.'}
              </p>
            </div>

            {/* Stat cards */}
            <div className="jl-reality-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 40 }}>
              {([
                { stat: '75%', color: '#E24B4A', label: lang === 'DE' ? 'Lebensläufe werden von ATS abgelehnt, bevor ein Mensch sie sieht' : 'CVs are auto-rejected by ATS before any human reads them' },
                { stat: '6 Sek', color: '#f59e0b', label: lang === 'DE' ? 'verbringt ein Recruiter im Schnitt mit jedem Lebenslauf' : 'is all a recruiter spends on each CV that does get through' },
                { stat: '3 Mon.', color: c.navy, label: lang === 'DE' ? 'dauert die durchschnittliche Jobsuche in Deutschland' : 'is the average job search duration in the DACH region' },
                { stat: '0', color: '#10b981', label: lang === 'DE' ? 'andere DACH-Plattformen bieten ATS-Scan + Anpassung + Auto-Bewerbung in einem' : 'other DACH platforms offer full ATS scan + tailoring + Auto Apply in one place' },
              ] as const).map((item, i) => (
                <div key={i} style={{ padding: '22px 18px', borderRadius: 14, background: '#f8fafd', border: '1px solid #edf1f6', borderTop: `3px solid ${item.color}` }}>
                  <div style={{ fontFamily: f.heading, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 800, color: item.color, marginBottom: 10, lineHeight: 1 }}>{item.stat}</div>
                  <div style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.6 }}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* ATS flow diagram */}
            <div style={{ background: '#f4f7fa', borderRadius: 16, padding: '28px 24px', marginBottom: 32 }}>
              <div style={{ fontSize: 11, color: c.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center', marginBottom: 22 }}>
                {lang === 'DE' ? 'Was mit deiner Bewerbung passiert' : 'What actually happens to your application'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                {/* Step: You Apply */}
                <div style={{ textAlign: 'center', padding: '14px 18px', background: '#fff', borderRadius: 14, border: '1px solid #dce4ef', minWidth: 110 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <div style={{ fontFamily: f.heading, fontSize: 12, fontWeight: 700, color: c.primary }}>{lang === 'DE' ? 'Du bewirbst dich' : 'You Apply'}</div>
                  <div style={{ fontSize: 11, color: c.textMuted, marginTop: 3 }}>{lang === 'DE' ? 'Lebenslauf absenden' : 'Submit your CV'}</div>
                </div>
                <div style={{ fontSize: 22, color: '#c8d6e5', fontWeight: 300 }}>→</div>
                {/* Step: ATS Bot */}
                <div style={{ textAlign: 'center', padding: '14px 18px', background: c.navy, borderRadius: 14, minWidth: 120 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="5" width="18" height="14" rx="2" stroke="white" strokeWidth="1.6"/>
                      <line x1="8" y1="10" x2="16" y2="10" stroke="#FF9933" strokeWidth="1.6" strokeLinecap="round"/>
                      <line x1="8" y1="14" x2="13" y2="14" stroke="#E24B4A" strokeWidth="1.6" strokeLinecap="round"/>
                      <circle cx="6.5" cy="10" r="1" fill="#FF9933"/>
                      <circle cx="6.5" cy="14" r="1" fill="#E24B4A"/>
                    </svg>
                  </div>
                  <div style={{ fontFamily: f.heading, fontSize: 12, fontWeight: 700, color: '#fff' }}>{lang === 'DE' ? 'ATS-Bot scannt' : 'ATS Bot Reads'}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 3, maxWidth: 110, margin: '3px auto 0' }}>{lang === 'DE' ? 'Sucht Keywords aus der Stelle' : 'Hunts for job keywords'}</div>
                </div>
                <div style={{ fontSize: 22, color: '#c8d6e5', fontWeight: 300 }}>→</div>
                {/* Decision split */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ textAlign: 'center', padding: '12px 18px', background: 'rgba(16,185,129,0.07)', borderRadius: 12, border: '2px solid rgba(16,185,129,0.25)', minWidth: 140 }}>
                    <div style={{ fontFamily: f.heading, fontSize: 12, fontWeight: 700, color: '#10b981' }}>✓ {lang === 'DE' ? 'Keywords passen' : 'Keywords match'}</div>
                    <div style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{lang === 'DE' ? 'Weiter zum Recruiter (25%)' : 'Reaches recruiter (25%)'}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '12px 18px', background: 'rgba(226,75,74,0.07)', borderRadius: 12, border: '2px solid rgba(226,75,74,0.25)', minWidth: 140 }}>
                    <div style={{ fontFamily: f.heading, fontSize: 12, fontWeight: 700, color: '#E24B4A' }}>✗ {lang === 'DE' ? 'Keywords fehlen' : 'Keywords missing'}</div>
                    <div style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{lang === 'DE' ? 'Automatisch abgelehnt (75%)' : 'Auto rejected (75%)'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ textAlign: 'center' }}>
              <Link href={go('/app/career-scan')} className="jl-btn-primary" style={{ display: 'inline-block', padding: '14px 34px', borderRadius: 10, color: '#fff', textDecoration: 'none', fontWeight: 700, fontFamily: f.heading, fontSize: 15 }}>
                {lang === 'DE' ? 'Meinen Lebenslauf jetzt prüfen →' : 'Check my CV against ATS now →'}
              </Link>
              <div style={{ fontSize: 12, color: c.textMuted, marginTop: 10 }}>
                {lang === 'DE' ? '5 kostenlose Credits · keine Kreditkarte · 30 Sekunden' : '5 free credits · no card needed · 30 seconds'}
              </div>
            </div>
          </div>

          <style>{`
            @media(max-width:900px){ .jl-reality-grid{ grid-template-columns:1fr 1fr!important } }
            @media(max-width:480px){ .jl-reality-grid{ grid-template-columns:1fr!important } }
          `}</style>
        </div>

        {/* ── How it works ── */}
        <div id="how-it-works" className="jl-subsection">
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontFamily: f.heading, fontSize: 26, fontWeight: 700, color: c.primary, marginBottom: 10 }}>{t.howTitle}</div>
            <div style={{ fontSize: 14, color: c.textMuted }}>{t.howSub}</div>
          </div>

          <div style={{ maxWidth: 920, margin: '0 auto', position: 'relative' }}>
            <div className="jl-steps-track" style={{ position: 'absolute', top: 28, left: 'calc(12.5% + 4px)', right: 'calc(12.5% + 4px)', height: 2, background: `linear-gradient(90deg, ${c.accent} 0%, ${c.success} 40%, ${c.warning} 70%, ${c.accent} 100%)`, opacity: 0.18, borderRadius: 1 }} />
            <div className="jl-steps-track" style={{ position: 'absolute', top: 28, left: 'calc(12.5% + 4px)', right: 'calc(12.5% + 4px)', height: 2, background: c.borderLight, borderRadius: 1 }} />

            <div className="jl-steps">
              {([
                {
                  num: '01', color: c.accent, bg: c.primaryLight,
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                  ),
                },
                {
                  num: '02', color: c.success, bg: c.successLight,
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  ),
                },
                {
                  num: '03', color: c.warning, bg: c.warningLight,
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  ),
                },
                {
                  num: '04', color: c.accent, bg: c.primaryLight,
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                  ),
                },
              ] as { num: string; color: string; bg: string; icon: ReactNode }[]).map((step, idx) => (
                <div key={idx} className="jl-step">
                  <div className="jl-step-circle" style={{ background: step.bg, border: `2px solid ${step.color}22` }}>
                    {step.icon}
                    <div style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', fontFamily: f.heading, letterSpacing: 0.5 }}>
                      {step.num}
                    </div>
                  </div>
                  <div style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 700, color: c.primary, marginBottom: 8, lineHeight: 1.3 }}>{t.steps[idx].title}</div>
                  <div className="jl-step-desc" style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.65, maxWidth: 200 }}>{t.steps[idx].desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Kira Section ── */}
        <div id="kira-demo" className="jl-subsection">
          <div className="jl-kira-demo-box" style={{
            background: 'linear-gradient(160deg,#f0f4ff 0%,#eef0ff 100%)',
          }}>
            {/* Background glow */}
            <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 600, height: 320, background: 'radial-gradient(ellipse, rgba(109,40,217,0.18) 0%, rgba(55,138,221,0.1) 45%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -40, left: '20%', width: 300, height: 200, background: 'radial-gradient(ellipse, rgba(0,200,200,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -40, right: '15%', width: 280, height: 180, background: 'radial-gradient(ellipse, rgba(255,20,160,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: 48 }}>
              {/* Tag */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6D28D9,#378ADD)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', letterSpacing: 1.5, textTransform: 'uppercase' as const }}>
                  {t.kiraTag}
                </span>
              </div>

              {/* Headline */}
              <h2 style={{ fontFamily: f.heading, fontSize: 'clamp(30px,4.5vw,52px)', fontWeight: 700, color: '#1a2332', margin: '0 0 20px', lineHeight: 1.12, letterSpacing: -0.8 }}>
                {t.kiraHeadline1}{' '}
                <span style={{ background: 'linear-gradient(90deg,#00e8d0,#378ADD,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {t.kiraHeadline2}
                </span>
              </h2>

              {/* Sub */}
              <p style={{ fontSize: 16, color: '#4a5568', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.8, fontWeight: 400 }}>
                {t.kiraSub}
              </p>

              {/* Feature pills */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {t.kiraFeatures.map(feat => (
                  <div key={feat.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 14, background: 'rgba(55,138,221,0.07)', border: '1px solid rgba(55,138,221,0.15)' }}>
                    <SvgIcon name={feat.icon as IconName} size={20} color="#378ADD" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2332', fontFamily: f.heading }}>{feat.label}</div>
                      <div className="jl-pill-desc" style={{ fontSize: 11, color: '#4a5568', marginTop: 1 }}>{feat.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Demo widget */}
            <KiraDemoWidget market="eu" lang={lang} />
          </div>
        </div>

        {/* ── Job Case Coming Soon — hidden until ready ── */}
        {false && <div className="jl-subsection">
          <div style={{
            background: 'linear-gradient(160deg, #0d1f30 0%, #091624 100%)',
            borderRadius: 20,
            border: '1px solid rgba(55,138,221,0.18)',
            overflow: 'hidden',
            padding: '48px 40px',
            position: 'relative',
          }}>
            {/* Background glow */}
            <div style={{ position: 'absolute', top: -60, right: -60, width: 400, height: 300, background: 'radial-gradient(ellipse, rgba(55,138,221,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -40, left: '10%', width: 280, height: 200, background: 'radial-gradient(ellipse, rgba(109,40,217,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div className="jc-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center', position: 'relative', zIndex: 1 }}>
              {/* Left — copy */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'rgba(109,40,217,0.18)', border: '1px solid rgba(109,40,217,0.4)',
                    borderRadius: 20, padding: '4px 14px',
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#a855f7', display: 'inline-block' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#a855f7', letterSpacing: 0.6, textTransform: 'uppercase' as const }}>
                      {t.jobCaseTag}
                    </span>
                  </div>
                </div>

                <h2 style={{ fontFamily: f.heading, fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1.25, margin: '0 0 16px' }}>
                  {t.jobCaseH2}
                </h2>

                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 0 24px' }}>
                  {t.jobCaseSub}
                </p>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                  {t.jobCaseBullets.map((b, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#a855f7', flexShrink: 0, marginTop: 1 }}>✓</span>
                      {b}
                    </li>
                  ))}
                </ul>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 24px', borderRadius: 11, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#a855f7', fontFamily: f.heading }}>{t.jobCaseComingSoon}</span>
                </div>
              </div>

              {/* Right — visual mock */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 16, padding: '24px 20px', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: c.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontFamily: f.heading, fontSize: 13, fontWeight: 700, color: c.primary }}>Senior Product Manager</div>
                      <div style={{ fontSize: 11, color: c.textMuted }}>Acme GmbH · Berlin</div>
                    </div>
                    <div style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 20, background: '#F0FFF4', border: '1px solid #86EFAC', fontSize: 10, fontWeight: 700, color: '#16a34a' }}>92%</div>
                  </div>
                  <div style={{ height: 1, background: c.border }} />
                  {/* Requirements */}
                  {[
                    { label: lang === 'DE' ? 'Produktstrategie' : 'Product Strategy', match: true },
                    { label: lang === 'DE' ? 'Stakeholder-Management' : 'Stakeholder Mgmt', match: true },
                    { label: lang === 'DE' ? 'Datengetrieben' : 'Data-driven mindset', match: true },
                    { label: lang === 'DE' ? 'SCRUM / Agile' : 'SCRUM / Agile', match: false },
                  ].map(req => (
                    <div key={req.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: req.match ? '#F0FFF4' : '#FEF2F2', border: `1px solid ${req.match ? '#86EFAC' : '#FCA5A5'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: req.match ? '#16a34a' : '#dc2626', flexShrink: 0 }}>
                        {req.match ? '✓' : '○'}
                      </span>
                      <span style={{ fontSize: 12, color: c.text }}>{req.label}</span>
                    </div>
                  ))}
                  <div style={{ height: 1, background: c.border }} />
                  {/* Video placeholder */}
                  <div style={{ borderRadius: 10, background: c.primaryLight, border: `1.5px dashed ${c.accent}44`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                    </svg>
                    <span style={{ fontSize: 12, color: c.accent, fontWeight: 600 }}>{lang === 'DE' ? '90-Sek-Video · bereit' : '90s intro video · ready'}</span>
                  </div>
                  {/* Footer */}
                  <div style={{ background: 'linear-gradient(135deg, #378ADD, #185FA5)', borderRadius: 9, padding: '9px 0', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: f.heading }}>
                    {lang === 'DE' ? 'Link an Recruiter senden →' : 'Send link to recruiter →'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <style>{`
            @media (max-width: 768px) {
              .jc-hero-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
            }
            @media (max-width: 560px) {
              .jc-hero-grid > div:last-child { display: none !important; }
            }
          `}</style>
        </div>}

        {/* ── Pricing ── */}
        <div className="jl-subsection">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontFamily: f.heading, fontSize: 26, fontWeight: 700, color: c.primary, marginBottom: 10 }}>{t.pricingTitle}</div>
            <div style={{ fontSize: 14, color: c.textMuted, maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>{t.pricingSub}</div>
          </div>

          <div className="jl-pricing-grid">
            {t.plans.map((plan) => (
              <div key={plan.name} style={{
                position: 'relative',
                background: '#fff',
                border: plan.raised ? `2px solid ${c.accent}` : `1.5px solid ${c.border}`,
                borderRadius: plan.raised ? 18 : 16,
                padding: plan.raised ? '40px 24px 28px' : '28px 24px',
                display: 'flex', flexDirection: 'column' as const, gap: 14,
                boxShadow: plan.raised ? `0 12px 40px ${c.accent}22, 0 2px 8px rgba(0,0,0,0.05)` : '0 2px 8px rgba(0,0,0,0.04)',
                marginTop: plan.raised ? -12 : 0,
              }}>
                {plan.badge && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: g.button, color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 16px', borderRadius: 20, whiteSpace: 'nowrap' as const, letterSpacing: 0.8, boxShadow: `0 4px 12px ${c.accent}40` }}>
                    {plan.badge}
                  </div>
                )}

                {/* Name + price */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: plan.raised ? c.accent : c.success, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>{plan.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    {plan.price !== '0' && <span style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 600, color: c.textMuted, lineHeight: 1, marginBottom: 2 }}>€</span>}
                    <span style={{ fontFamily: f.heading, fontSize: 34, fontWeight: 700, color: plan.raised ? c.accent : c.primary, lineHeight: 1 }}>
                      {plan.price === '0' ? 'Free' : plan.price}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: c.textMuted, marginTop: 5 }}>{plan.sub}</div>
                  <div style={{ marginTop: 8, display: 'inline-block', padding: '3px 10px', borderRadius: 20, background: plan.raised ? `${c.accent}12` : c.bg, border: `1px solid ${plan.raised ? c.accent+'33' : c.border}`, fontSize: 11, fontWeight: 700, color: plan.raised ? c.accent : c.textMuted }}>
                    {plan.credits}
                  </div>
                </div>

                <div style={{ height: 1, background: plan.raised ? `${c.accent}18` : c.border }} />

                {/* Features */}
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 9, flex: 1 }}>
                  {plan.features.map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: c.text }}>
                      <span style={{ color: plan.raised ? c.accent : c.success, fontWeight: 700, fontSize: 14, lineHeight: '1.5', flexShrink: 0 }}>✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Link
                  href={plan.price === '0' ? go('/app/career-scan') : go('/app/account')}
                  style={{
                    padding: plan.raised ? '13px 0' : '11px 0',
                    borderRadius: plan.raised ? 10 : 9,
                    background: plan.raised ? g.button : c.primaryLight,
                    color: plan.raised ? '#fff' : c.navy,
                    textDecoration: 'none', fontWeight: 700,
                    fontFamily: f.heading, fontSize: plan.raised ? 14 : 13,
                    textAlign: 'center' as const, display: 'block',
                    boxShadow: plan.raised ? `0 4px 14px ${c.accent}35` : 'none',
                  }}>
                  {plan.cta} →
                </Link>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <span style={{ fontSize: 12, color: c.textMuted }}>
              {t.freeNoteBottom} <strong style={{ color: c.success }}>{t.freeCreditsNote}</strong> {t.noCard}
            </span>
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div className="jl-subsection jl-cta-block" style={{ background: 'linear-gradient(135deg,#042C53 0%,#0d3f72 50%,#1a5499 100%)', borderRadius: 20, padding: '56px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 16, letterSpacing: 0.5 }}>
            {t.ctaTag}
          </div>
          <div style={{ fontFamily: f.heading, fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 10, letterSpacing: -0.3 }}>
            {t.ctaTitle}
          </div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', marginBottom: 36, lineHeight: 1.65 }}>
            {t.ctaSub}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={go('/app/career-scan')} className="jl-btn-primary" style={{ padding: '13px 28px', borderRadius: 10, color: '#fff', textDecoration: 'none', fontWeight: 700, fontFamily: f.heading, fontSize: 14 }}>
              {t.ctaBtn1}
            </Link>
            <Link href={go('/app/jobs')} className="jl-btn-glass" style={{ padding: '13px 28px', borderRadius: 10, color: theme.navbar.text, textDecoration: 'none', fontWeight: 600, fontFamily: f.heading, fontSize: 14 }}>
              {t.ctaBtn2}
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 48, paddingBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: c.textFaint }}>{t.footerBrand}</span>
            <span style={{ fontSize: 12, color: c.border }}>|</span>
            {user ? (
              <Link href="/app/career-scan" style={{ fontSize: 12, color: c.textFaint, textDecoration: 'none' }}>{t.footerGoApp}</Link>
            ) : (
              <Link href="/login" style={{ fontSize: 12, color: c.textFaint, textDecoration: 'none' }}>{t.footerSignIn}</Link>
            )}
            <Link href="/app/career-scan" style={{ fontSize: 12, color: c.textFaint, textDecoration: 'none' }}>{t.footerCareerScan}</Link>
            <Link href="/app/jobs" style={{ fontSize: 12, color: c.textFaint, textDecoration: 'none' }}>{t.footerJobSearch}</Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link href="/impressum" style={{ fontSize: 11, color: c.textFaint, textDecoration: 'none' }}>Impressum</Link>
            <span style={{ fontSize: 11, color: c.border }}>·</span>
            <Link href="/datenschutz" style={{ fontSize: 11, color: c.textFaint, textDecoration: 'none' }}>Datenschutzerklärung</Link>
            <span style={{ fontSize: 11, color: c.border }}>·</span>
            <Link href="/privacy" style={{ fontSize: 11, color: c.textFaint, textDecoration: 'none' }}>Privacy Policy</Link>
            <span style={{ fontSize: 11, color: c.border }}>·</span>
            <Link href="/agb" style={{ fontSize: 11, color: c.textFaint, textDecoration: 'none' }}>AGB</Link>
            <span style={{ fontSize: 11, color: c.border }}>·</span>
            <Link href="/contact" style={{ fontSize: 11, color: c.textFaint, textDecoration: 'none' }}>Contact</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
