'use client'

import Link from 'next/link'
import { useState, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import { useLanguage, DEFlag, GBFlag } from '@/lib/i18n'
import KiraDemoWidget from '@/components/KiraDemoWidget'

const { colors: c, gradients: g, fonts: f, shadow: sh } = theme

type Lang = 'DE' | 'EN'

const translations = {
  DE: {
    navCareerScan: 'Career Scan',
    navJobSearch: 'Job-Suche',
    navSignIn: 'Anmelden',
    navGoToApp: 'Zur App',
    heroTag: '🇩🇪 Deutschland · 🇨🇭 Schweiz · 🇦🇹 Österreich',
    heroH1: 'Deinen nächsten Job auf dem DACH-Markt finden',
    heroSub: 'Lade deinen Lebenslauf hoch. Erfahre, wo du stehst. Finde passende Stellen in Deutschland, der Schweiz und Österreich. Bewirb dich mit einem maßgeschneiderten Lebenslauf und Anschreiben.',
    heroCta1: 'Kostenlos starten',
    heroCta2: 'Jobs entdecken',
    indiaPill: '🇮🇳 Jobs in Indien suchen?',
    indiaPillCta: 'Job-Lens India →',
    madeIn: '🇩🇪 Made in Germany',
    dataNote: 'Deine Daten werden nie gespeichert',
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
      { title: 'Bewerbungs-Tracker', desc: 'Alle Bewerbungen im Blick — von Gespeichert bis Angebot.' },
      { title: 'Auto-Bewerbung', desc: 'KI füllt das gesamte Bewerbungsformular automatisch aus.' },
    ],
    howTitle: 'So funktioniert es',
    howSub: 'Vom Lebenslauf-Upload bis zur eingereichten Bewerbung in Minuten',
    steps: [
      { title: 'Lebenslauf hochladen', desc: 'PDF, DOCX oder Text einfügen. Wir extrahieren deine Fähigkeiten und Erfahrungen automatisch.' },
      { title: 'Career Scan erhalten', desc: 'Score, Gehaltsspanne, Stärken, Lücken und einen personalisierten Aktionsplan — in 30 Sekunden.' },
      { title: 'Passende Jobs finden', desc: 'KI durchsucht aktuelle Jobbörsen im DACH-Raum und sortiert Ergebnisse nach Eignung.' },
      { title: 'Mit einem Klick bewerben', desc: 'Maßgeschneiderter Lebenslauf und Anschreiben pro Stelle — oder lass Auto-Bewerbung das Formular ausfüllen.' },
    ],
    pricingTitle: 'Einfache, transparente Preise',
    pricingSub: 'Einmal kaufen, jederzeit nutzen. Credits verfallen nie — ideal für eine fokussierte Jobsuche.',
    freeTierSub: 'Dauerhaft kostenlos · keine Karte nötig',
    freeFeatures: ['5 Credits bei Registrierung', 'Career Scan (Vorschau)', 'Unbegrenzte Jobsuche', 'Intelligentes Job-Matching'],
    startFree: 'Kostenlos starten',
    popularBadge: '★ BELIEBTESTE WAHL',
    jobHuntSub: '60 Credits · verfallen nie',
    jobHuntFeatures: ['60 Credits (~20 komplette Bewerbungen)', 'Lebenslauf-Anpassung — 1 Credit', 'Anschreiben — 1 Credit', 'Career Scan — 2 Credits', 'Auto-Bewerbung — 3 Credits'],
    jobHuntNote: 'Bestes Preis-Leistungs-Verhältnis für aktive Bewerber',
    getJobHunt: 'Job Hunt holen',
    fullSprintSub: '150 Credits · verfallen nie',
    fullSprintFeatures: ['150 Credits (~50 komplette Bewerbungen)', 'Alles aus Job Hunt', 'Mehrmonatige Jobsuche', 'Ideal für Karrierewechsler'],
    starterNote: 'Auch erhältlich: Starter-Paket €4,99 / 20 Credits',
    getFullSprint: 'Full Sprint holen',
    kiraHeroMsg: 'Dein nächster Job ist ein Gespräch entfernt.',
    kiraHeroBtn: 'Kira kennenlernen ↓',
    demoTag: '✨ Kira Preview',
    demoTitle: 'Sprich mit Kira — Live-Demo',
    demoSub: 'Kira liest deinen Lebenslauf, findet passende Jobs und optimiert deine Bewerbung. Sieh es in Aktion.',
    kiraTag: 'Lern Kira kennen — KI-Karriereassistentin',
    kiraHeadline1: 'Dein nächster Job ist',
    kiraHeadline2: 'ein Gespräch entfernt.',
    kiraSub: 'Kira kennt den DACH-Markt in- und auswendig. Sprich einfach mit ihr — sie findet passende Jobs, liest deinen Lebenslauf und gibt echte Gehaltsdaten. Voice-first. Keine Formulare. Keine Filter.',
    kiraFeatures: [
      { icon: '🎙', label: 'Voice-first', desc: 'Einfach sprechen — Kira hört zu' },
      { icon: '🔍', label: 'Live Jobsuche', desc: 'Echte Stellen, passend zu dir' },
      { icon: '📄', label: 'Lebenslauf-Analyse', desc: 'Score, Lücken & nächste Schritte' },
    ] as { icon: string; label: string; desc: string }[],
    freeNoteBottom: 'Neue Accounts erhalten',
    freeCreditsNote: '5 kostenlose Credits',
    noCard: '— keine Karte nötig. Credits verfallen nie.',
    ctaTag: '5 kostenlose Credits bei Registrierung · Keine Karte erforderlich',
    ctaTitle: 'Bereit, deine Jobsuche zu starten?',
    ctaSub: 'Karriere-Analyse, Job-Matching und Bewerbungen — alles an einem Ort.',
    ctaBtn1: 'Mit Career Scan starten',
    ctaBtn2: 'Jobs durchsuchen',
    footerBrand: '🇩🇪 Made in Germany · Job-Lens AI',
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
    heroTag: '🇩🇪 Germany · 🇨🇭 Switzerland · 🇦🇹 Austria',
    heroH1: 'Find your next job in the DACH market',
    heroSub: 'Upload your CV. See where you stand. Get matched with real jobs across Germany, Switzerland and Austria. Apply with a tailored CV and cover letter.',
    heroCta1: 'Get Started Free',
    heroCta2: 'Explore Jobs',
    indiaPill: '🇮🇳 Looking for jobs in India?',
    indiaPillCta: 'Job-Lens India →',
    madeIn: '🇩🇪 Made in Germany',
    dataNote: 'Your data is never stored',
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
      { title: 'Application Tracker', desc: 'Track every application from Saved to Offer in one place.' },
      { title: 'Auto Apply', desc: 'AI fills the entire application form for you automatically.' },
    ],
    howTitle: 'How it works',
    howSub: 'From CV upload to submitted application in minutes',
    steps: [
      { title: 'Upload your CV', desc: 'PDF, DOCX or paste text. We extract your skills and experience automatically.' },
      { title: 'Get your Career Scan', desc: 'Score, salary range, strengths, gaps and a personalised action plan — in 30 seconds.' },
      { title: 'Find matching jobs', desc: 'AI searches live boards across DACH and ranks results by how well they fit your profile.' },
      { title: 'Apply in one click', desc: 'Tailored CV and cover letter per job — or let Auto Apply fill the whole form for you.' },
    ],
    pricingTitle: 'Simple, honest pricing',
    pricingSub: 'Buy once, use anytime. Credits never expire — perfect for a focused job search.',
    freeTierSub: 'Forever free · no card needed',
    freeFeatures: ['5 credits on signup', 'Career Scan (preview)', 'Unlimited job browsing', 'Smart job matching'],
    startFree: 'Start free',
    popularBadge: '★ MOST POPULAR',
    jobHuntSub: '60 credits · never expire',
    jobHuntFeatures: ['60 credits (~20 full applications)', 'CV tailoring — 1 credit each', 'Cover letter — 1 credit each', 'Career Scan — 2 credits', 'Auto Apply — 3 credits'],
    jobHuntNote: 'Best value for active job seekers',
    getJobHunt: 'Get Job Hunt',
    fullSprintSub: '150 credits · never expire',
    fullSprintFeatures: ['150 credits (~50 full applications)', 'Everything in Job Hunt', 'Multi-month job search', 'Ideal for career changers'],
    starterNote: 'Also available: Starter pack €4.99 / 20 credits',
    getFullSprint: 'Get Full Sprint',
    kiraHeroMsg: 'Your next job is a conversation away.',
    kiraHeroBtn: 'Meet Kira ↓',
    demoTag: '✨ Kira Preview',
    demoTitle: 'Talk to Kira — live demo',
    demoSub: 'Kira reads your CV, finds matching jobs and optimises your application. See it in action.',
    kiraTag: 'Meet Kira — AI Career Assistant',
    kiraHeadline1: 'Your next job is a',
    kiraHeadline2: 'conversation away.',
    kiraSub: 'Kira knows the DACH market inside out. Just talk — she finds live jobs, reads your CV, gives real salary data. Voice-first. No forms. No fluff. Just results.',
    kiraFeatures: [
      { icon: '🎙', label: 'Voice-first', desc: 'Just speak — Kira listens' },
      { icon: '🔍', label: 'Live job search', desc: 'Real roles, matched to you' },
      { icon: '📄', label: 'CV insight', desc: 'Score, gaps & next steps' },
    ] as { icon: string; label: string; desc: string }[],
    freeNoteBottom: 'New accounts get',
    freeCreditsNote: '5 free credits',
    noCard: '— no card needed. Credits never expire.',
    ctaTag: '5 free credits on signup · No card required',
    ctaTitle: 'Ready to start your job search?',
    ctaSub: 'Career analysis, job matching and applications — all in one place.',
    ctaBtn1: 'Start with Career Scan',
    ctaBtn2: 'Browse Jobs',
    footerBrand: '🇩🇪 Made in Germany · Job-Lens AI',
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

  const go = (path: string) => user ? path : '/login'

  const featureIcons = ['◎', '🔍', '📄', '🎙', '📋', '⚡']
  const featureBgs = [c.primaryLight, c.successLight, c.warningLight, c.primaryLight, c.successLight, c.aiLight]
  const featureColors = [c.navy, c.success, c.warning, c.accent, c.success, c.ai]
  const featureBadges = [null, null, null, null, null, lang === 'DE' ? 'Beta' : 'Beta']
  const featureHrefs = [go('/app/career-scan'), go('/app/jobs'), go('/app/cv-builder'), go('/app/interview'), go('/app/tracker'), go('/app/auto-apply')]

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

        .jl-feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 900px) { .jl-feature-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .jl-feature-grid { grid-template-columns: 1fr; } }
        .jl-pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 900px; margin: 0 auto; align-items: start; }
        @media (max-width: 700px) { .jl-pricing-grid { grid-template-columns: 1fr; } }
        @media (max-width: 700px) { .jl-pricing-grid > *:nth-child(2) { margin-top: 0 !important; } }

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
            <span className="jl-home-dach-pill" style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 10, border: '1px solid rgba(55,138,221,0.4)', background: 'rgba(55,138,221,0.12)', color: '#85B7EB', fontFamily: 'inherit' }}>
              🇩🇪 DACH
            </span>
            <Link href="/in" style={{ fontSize: 11, fontWeight: 600, textDecoration: 'none', padding: '5px 12px', borderRadius: 10, border: '1px solid rgba(255,153,51,0.2)', background: 'rgba(255,153,51,0.07)', color: '#FF9933', fontFamily: 'inherit' }}>
              🇮🇳 India
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
      <div style={{ background: g.hero, padding: '80px 24px 108px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto' }}>
          <div className="jl-hero-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', padding: '5px 16px', borderRadius: 20, letterSpacing: 0.5 }}>
              {t.heroTag}
            </span>
          </div>

          <h1 className="jl-hero-h1" style={{ fontFamily: f.heading, fontSize: 'clamp(30px, 4.5vw, 50px)', fontWeight: 700, color: '#fff', margin: '0 0 20px', lineHeight: 1.15, letterSpacing: -0.5 }}>
            {t.heroH1}
          </h1>

          <p className="jl-hero-sub" style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)', maxWidth: 500, margin: '0 auto 40px', lineHeight: 1.75, fontWeight: 400 }}>
            {t.heroSub}
          </p>

          <div className="jl-hero-btns" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={go('/app/career-scan')} className="jl-btn-primary" style={{ padding: '14px 32px', borderRadius: 12, color: '#fff', textDecoration: 'none', fontWeight: 700, fontFamily: f.heading, fontSize: 15 }}>
              {t.heroCta1}
            </Link>
            <Link href={go('/app/jobs')} className="jl-btn-glass" style={{ padding: '14px 32px', borderRadius: 12, color: theme.navbar.text, textDecoration: 'none', fontWeight: 600, fontFamily: f.heading, fontSize: 15 }}>
              {t.heroCta2}
            </Link>
          </div>

          {/* Kira hero teaser */}
          <div style={{ marginTop: 36, display: 'flex', justifyContent: 'center' }}>
            <a href="#kira-demo" style={{
              display: 'inline-flex', alignItems: 'center', gap: 14,
              background: 'linear-gradient(135deg,rgba(109,40,217,0.18),rgba(55,138,221,0.14))',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 20, padding: '14px 18px 14px 14px',
              textDecoration: 'none', maxWidth: 480,
              transition: 'border-color 0.2s, background 0.2s',
              backdropFilter: 'blur(12px)',
            }}>
              {/* Kira avatar with pulse */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#6D28D9,#378ADD)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                </div>
                <span style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid #0c1c30' }} />
              </div>
              {/* Text */}
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 4, fontFamily: f.heading }}>Kira AI · Online now</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.4, fontFamily: f.heading }}>
                  {t.kiraHeroMsg}
                </div>
              </div>
              {/* CTA */}
              <div style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#6D28D9,#378ADD)', color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: f.heading, whiteSpace: 'nowrap' as const, boxShadow: '0 4px 12px rgba(109,40,217,0.4)' }}>
                {t.kiraHeroBtn}
              </div>
            </a>
          </div>

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            <span>{t.madeIn}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{t.dataNote}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{t.freeCredits}</span>
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div style={{ maxWidth: 860, margin: '-44px auto 0', padding: '0 24px', position: 'relative', zIndex: 10 }}>
        <div style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 14, padding: '20px 32px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: f.heading, fontSize: 20, fontWeight: 700, color: c.text }}>{s.value}</div>
              <div style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 56px' }}>
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
                <div style={{ width: 44, height: 44, borderRadius: 12, background: featureBgs[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
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

        {/* Single explore CTA */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link href={go('/app/career-scan')} style={{ fontSize: 14, fontWeight: 600, color: c.accent, textDecoration: 'none', fontFamily: f.heading }}>
            {t.featuresExplore}
          </Link>
        </div>

        {/* ── How it works ── */}
        <div style={{ marginTop: 80 }}>
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
        <div id="kira-demo" style={{ marginTop: 80 }}>
          <div style={{
            background: 'linear-gradient(160deg,#0c1c30 0%,#08121f 100%)',
            borderRadius: 24, padding: '64px 32px 52px',
            position: 'relative', overflow: 'hidden',
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
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{feat.icon}</span>
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
        <div style={{ marginTop: 80 }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontFamily: f.heading, fontSize: 26, fontWeight: 700, color: c.primary, marginBottom: 10 }}>{t.pricingTitle}</div>
            <div style={{ fontSize: 14, color: c.textMuted, maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
              {t.pricingSub}
            </div>
          </div>

          <div className="jl-pricing-grid" style={{ alignItems: 'start' }}>

            {/* Free */}
            <div style={{ background: '#fff', border: `1.5px solid ${c.border}`, borderRadius: 16, padding: '28px 24px', display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.success, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>Free</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: f.heading, fontSize: 34, fontWeight: 700, color: c.primary, lineHeight: 1 }}>€0</span>
                </div>
                <div style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>{t.freeTierSub}</div>
              </div>
              <div style={{ height: 1, background: c.border }} />
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, flex: 1 }}>
                {t.freeFeatures.map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: c.text }}>
                    <span style={{ color: c.success, fontWeight: 700, fontSize: 15, lineHeight: '1.4', flexShrink: 0 }}>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <Link href={go('/app/career-scan')} style={{ padding: '11px 0', borderRadius: 9, background: c.primaryLight, color: c.navy, textDecoration: 'none', fontWeight: 700, fontFamily: f.heading, fontSize: 13, textAlign: 'center' as const, display: 'block', transition: 'opacity 0.15s' }}>
                {t.startFree} &rarr;
              </Link>
            </div>

            {/* Job Hunt — Most Popular */}
            <div style={{ position: 'relative', background: '#fff', border: `2px solid ${c.accent}`, borderRadius: 18, padding: '36px 24px 28px', display: 'flex', flexDirection: 'column' as const, gap: 16, boxShadow: `0 12px 40px ${c.accent}22, 0 2px 8px rgba(0,0,0,0.06)`, marginTop: -16 }}>
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: g.button, color: '#fff', fontSize: 10, fontWeight: 700, padding: '5px 18px', borderRadius: 20, whiteSpace: 'nowrap' as const, letterSpacing: 0.8, boxShadow: `0 4px 12px ${c.accent}40` }}>
                {t.popularBadge}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.accent, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>Job Hunt</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: f.heading, fontSize: 34, fontWeight: 700, color: c.primary, lineHeight: 1 }}>€12.99</span>
                </div>
                <div style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>{t.jobHuntSub}</div>
              </div>
              <div style={{ height: 1, background: `${c.accent}22` }} />
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, flex: 1 }}>
                {t.jobHuntFeatures.map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: c.text }}>
                    <span style={{ color: c.accent, fontWeight: 700, fontSize: 15, lineHeight: '1.4', flexShrink: 0 }}>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
                <div style={{ marginTop: 4, padding: '8px 12px', background: c.primaryLight, borderRadius: 8, fontSize: 12, color: c.navy, fontWeight: 600 }}>
                  {t.jobHuntNote}
                </div>
              </div>
              <Link href={go('/app/account')} style={{ padding: '13px 0', borderRadius: 10, background: g.button, color: '#fff', textDecoration: 'none', fontWeight: 700, fontFamily: f.heading, fontSize: 14, textAlign: 'center' as const, display: 'block', boxShadow: `0 4px 14px ${c.accent}35` }}>
                {t.getJobHunt} &rarr;
              </Link>
            </div>

            {/* Full Sprint */}
            <div style={{ background: '#fff', border: `1.5px solid ${c.border}`, borderRadius: 16, padding: '28px 24px', display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.primary, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>Full Sprint</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: f.heading, fontSize: 34, fontWeight: 700, color: c.primary, lineHeight: 1 }}>€24.99</span>
                </div>
                <div style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>{t.fullSprintSub}</div>
              </div>
              <div style={{ height: 1, background: c.border }} />
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, flex: 1 }}>
                {t.fullSprintFeatures.map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: c.text }}>
                    <span style={{ color: c.success, fontWeight: 700, fontSize: 15, lineHeight: '1.4', flexShrink: 0 }}>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
                <div style={{ marginTop: 4, padding: '8px 12px', background: c.bg, borderRadius: 8, border: `1px solid ${c.border}`, fontSize: 12, color: c.textMuted }}>
                  {t.starterNote}
                </div>
              </div>
              <Link href={go('/app/account')} style={{ padding: '11px 0', borderRadius: 9, background: c.primaryLight, color: c.navy, textDecoration: 'none', fontWeight: 700, fontFamily: f.heading, fontSize: 13, textAlign: 'center' as const, display: 'block' }}>
                {t.getFullSprint} &rarr;
              </Link>
            </div>

          </div>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <span style={{ fontSize: 13, color: c.textMuted }}>
              {t.freeNoteBottom} <strong style={{ color: c.success }}>{t.freeCreditsNote}</strong> {t.noCard}
            </span>
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div style={{ marginTop: 80, background: g.ctaBlock, borderRadius: 20, padding: '56px 32px', textAlign: 'center' }}>
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
