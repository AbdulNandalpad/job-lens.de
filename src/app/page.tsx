'use client'

import Link from 'next/link'
import { useState, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import { useLanguage, DEFlag, GBFlag } from '@/lib/i18n'
import KiraDemoWidget from '@/components/KiraDemoWidget'
import AutoApplyDemoWidget from '@/components/AutoApplyDemoWidget'
import SvgIcon, { type IconName } from '@/components/SvgIcon'
import HeroFeatures from '@/components/HeroFeatures'

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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');

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
        @media (max-width: 560px) { .jl-feature-grid { grid-template-columns: 1fr; } }
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
        .jl-hero-trust { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; font-size: 12px; color: rgba(255,255,255,0.3); }
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
      <div style={{ background: theme.navbar.bg, padding: '0 24px', height: theme.navbar.height, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, borderBottom: `1px solid ${theme.navbar.border}`, boxShadow: '0 1px 0 rgba(255,255,255,0.05)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="26" height="26" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke={c.accent} strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="8" fill="none" stroke={c.accentLight} strokeWidth="1.2"/>
            <circle cx="20" cy="20" r="3" fill={c.accent}/>
            <line x1="7" y1="20" x2="33" y2="20" stroke={c.accent} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5"/>
            <line x1="28" y1="28" x2="36" y2="36" stroke={c.accent} strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span className="jl-home-logo-text" style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: theme.navbar.text }}>
            Job-Lens <span style={{ color: c.accent }}>AI</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Language dropdown */}
          <div className="jl-home-lang" style={{ position: 'relative' }}>
            <button onClick={() => setLangOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#fff', fontFamily: 'inherit' }}>
              {lang} <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 2 }}>{langOpen ? '▲' : '▼'}</span>
            </button>
            {langOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: '#0d2137', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden', zIndex: 200, minWidth: 110, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                {(['DE', 'EN'] as const).map(code => (
                  <button key={code} onClick={() => { setLang(code); setLangOpen(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', border: 'none', background: lang === code ? 'rgba(55,138,221,0.2)' : 'transparent', color: lang === code ? '#fff' : 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: lang === code ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    {code} <span style={{ opacity: 0.5, fontWeight: 400 }}>— {code === 'DE' ? 'Deutsch' : 'English'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Market pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            <span className="jl-home-dach-pill" style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 10, border: '1px solid rgba(55,138,221,0.4)', background: 'rgba(55,138,221,0.12)', color: '#85B7EB', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <SvgIcon name="flag-de" size={14} /> DACH
            </span>
            <Link href="/in" style={{ fontSize: 11, fontWeight: 600, textDecoration: 'none', padding: '5px 12px', borderRadius: 10, border: '1px solid rgba(255,153,51,0.2)', background: 'rgba(255,153,51,0.07)', color: '#FF9933', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <SvgIcon name="flag-in" size={14} /> India
            </Link>
          </div>

          {!loading && (user ? (
            <>
              <span className="jl-home-greeting" style={{ fontSize: 13, color: theme.navbar.textMuted }}>Hi, {user.name}</span>
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
      <HeroFeatures
        market="eu"
        lang={lang}
        autoApplyHref={go('/app/auto-apply')}
        kiraHref="#kira-demo"
        loginHref="/login"
      />

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
              <div style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.6 }}>{feat.desc}</div>
            </Link>
          ))}
        </div>

        {/* ── Auto Apply spotlight ── */}
        <div className="jl-subsection">
          <div style={{
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
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
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
        </div>

        {/* ── How it works ── */}
        <div className="jl-subsection">
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
                  <div style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.65, maxWidth: 200 }}>{t.steps[idx].desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Kira Section ── */}
        <div id="kira-demo" className="jl-subsection">
          <div className="jl-kira-demo-box" style={{
            background: 'linear-gradient(160deg,#0c1c30 0%,#08121f 100%)',
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
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: 1.5, textTransform: 'uppercase' as const }}>
                  {t.kiraTag}
                </span>
              </div>

              {/* Headline */}
              <h2 style={{ fontFamily: f.heading, fontSize: 'clamp(30px,4.5vw,52px)', fontWeight: 700, color: '#fff', margin: '0 0 20px', lineHeight: 1.12, letterSpacing: -0.8 }}>
                {t.kiraHeadline1}{' '}
                <span style={{ background: 'linear-gradient(90deg,#00e8d0,#378ADD,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {t.kiraHeadline2}
                </span>
              </h2>

              {/* Sub */}
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.8, fontWeight: 400 }}>
                {t.kiraSub}
              </p>

              {/* Feature pills */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {t.kiraFeatures.map(feat => (
                  <div key={feat.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                    <SvgIcon name={feat.icon as IconName} size={20} color="rgba(255,255,255,0.8)" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: f.heading }}>{feat.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>{feat.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Demo widget */}
            <KiraDemoWidget market="eu" lang={lang} />
          </div>
        </div>

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
        <div className="jl-subsection jl-cta-block" style={{ background: g.ctaBlock, borderRadius: 20, padding: '56px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16, letterSpacing: 0.5 }}>
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
          </div>
        </div>
      </div>
    </div>
  )
}
