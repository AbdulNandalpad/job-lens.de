'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'

const blue    = '#378ADD'
const navy    = '#042C53'
const green   = '#1D9E75'
const orange  = '#f59e0b'
const red     = '#ef4444'
const purple  = '#8b5cf6'

const bg      = '#07111f'
const card    = 'rgba(255,255,255,0.04)'
const border  = 'rgba(255,255,255,0.08)'
const txt1    = '#f1f5f9'
const txt2    = '#94a3b8'

type DashTab = 'pulse' | 'ai'

const QUICK_ACTIONS = [
  { label: 'Career Scan',  labelDE: 'Career Scan',    href: '/app/career-scan',  emoji: '🎯', color: blue   },
  { label: 'Job Search',   labelDE: 'Job-Suche',      href: '/app/jobs',         emoji: '🔍', color: green  },
  { label: 'AI Job Match', labelDE: 'KI-Bewerbung',   href: '/app/smart-apply',  emoji: '🤖', color: purple },
  { label: 'CV Builder',   labelDE: 'Lebenslauf',     href: '/app/cv-builder',   emoji: '📄', color: orange },
  { label: 'Cover Letter', labelDE: 'Anschreiben',    href: '/app/cover-letter', emoji: '✉️', color: blue   },
  { label: 'Tracker',      labelDE: 'Bewerbungs-Log', href: '/app/tracker',      emoji: '📊', color: green  },
]

const SALARY_GUIDE = [
  { role: 'Software Engineer',       min: 55, max: 95,  city: 'Berlin' },
  { role: 'Data Scientist',          min: 60, max: 100, city: 'München' },
  { role: 'Product Manager',         min: 70, max: 110, city: 'Berlin' },
  { role: 'UX/UI Designer',          min: 45, max: 75,  city: 'Hamburg' },
  { role: 'DevOps Engineer',         min: 60, max: 95,  city: 'Frankfurt' },
  { role: 'Marketing Manager',       min: 50, max: 80,  city: 'Düsseldorf' },
  { role: 'Finance Analyst',         min: 48, max: 78,  city: 'Frankfurt' },
  { role: 'HR Business Partner',     min: 45, max: 70,  city: 'Berlin' },
]

const AI_SECTOR_IMPACT = [
  { sector: 'Software & IT',         emoji: '💻', impact: 'creating',   score: 85, headline: 'KI-Engineering-Stellen +180% YoY',    color: green  },
  { sector: 'Data & Analytics',      emoji: '📊', impact: 'creating',   score: 80, headline: 'ML-Ops und Data Engineers sehr gefragt', color: green  },
  { sector: 'Automotive',            emoji: '🚗', impact: 'mixed',      score: 58, headline: 'E-Mobilität schafft neue, verdrängt alte Rollen', color: orange },
  { sector: 'Finance & Banking',     emoji: '🏦', impact: 'mixed',      score: 52, headline: 'Analysten bleiben wertvoll, Sachbearbeiter nicht', color: orange },
  { sector: 'Marketing',             emoji: '📣', impact: 'mixed',      score: 45, headline: 'KI-Copilots prägen die Rolle grundlegend um', color: orange },
  { sector: 'Shared Services / BPO', emoji: '🎧', impact: 'disrupting', score: 74, headline: 'Routineaufgaben durch LLMs stark automatisiert', color: red    },
  { sector: 'Logistik',              emoji: '🏭', impact: 'disrupting', score: 60, headline: 'Lagerautomatisierung verdrängt einfache Tätigkeiten', color: red    },
  { sector: 'Medizin & HealthTech',  emoji: '🏥', impact: 'creating',   score: 68, headline: 'KI-Diagnostik und MedTech boomen in DACH',  color: green  },
]

const MARKET_STATS = [
  { label: 'Arbeitslosenquote DE', value: '5.5%', sub: 'Stand Q1 2026',      color: green  },
  { label: 'Offene Stellen DACH',  value: '1.4M', sub: 'Adzuna Index Q1 2026', color: blue   },
  { label: 'Ø Gehaltsanstieg',     value: '+4.2%', sub: 'vs. Vorjahr 2025',   color: orange },
  { label: 'Remote-Anteil',        value: '34%',  sub: 'aller Stellenanzeigen', color: purple },
]

export default function DACHDashboard() {
  const router   = useRouter()
  const { lang } = useLanguage()
  const [userName, setUserName] = useState('')
  const [credits,  setCredits]  = useState<number | null>(null)
  const [tab,      setTab]      = useState<DashTab>('pulse')

  const t = (de: string, en: string) => lang === 'DE' ? de : en

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const full = data.user.user_metadata?.full_name ?? data.user.email ?? ''
      setUserName(full.split(' ')[0] || 'there')
    })
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(d => {
        const total = (d.credits ?? 0) + (d.eu_credits ?? 0)
        setCredits(total)
      })
      .catch(() => {})
  }, [router])

  const hour = new Date().getHours()
  const greeting = lang === 'DE'
    ? (hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend')
    : (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        @keyframes fadein { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        .dash-card { animation: fadein .35s ease; }
        .qa-btn { transition: all .15s; }
        .qa-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .sal-row { transition: background .12s; }
        .sal-row:hover { background: rgba(255,255,255,0.06) !important; }
        .mob-dash-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 600px) { .mob-dash-col { grid-template-columns: 1fr; } }
        .mob-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 480px) { .mob-stats { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ background: bg, minHeight: 'calc(100vh - 52px)', padding: '28px 20px', fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Greeting header ─────────────────────────── */}
          <div className="dash-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: txt2, marginBottom: 4, letterSpacing: .8, textTransform: 'uppercase' }}>Job-Lens DACH</div>
              <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 700, color: txt1, margin: 0 }}>
                {greeting}{userName ? `, ${userName}` : ''}!
              </h1>
              <p style={{ fontSize: 13, color: txt2, margin: '4px 0 0' }}>
                {t('Dein DACH-Karriere-Dashboard', 'Your DACH career dashboard')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {credits !== null && (
                <div style={{ padding: '6px 14px', borderRadius: 20, background: card, border: `1px solid ${border}`, fontSize: 12, color: txt2 }}>
                  <span style={{ color: blue, fontWeight: 700 }}>{credits}</span> {t('Credits', 'credits')}
                </div>
              )}
              <Link href="/" style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`, fontSize: 12, color: txt2, textDecoration: 'none' }}>
                {t('Zur Startseite', 'Landing page')} →
              </Link>
            </div>
          </div>

          {/* ── Quick actions ────────────────────────────── */}
          <div className="dash-card mob-dash-col" style={{ display: 'grid' }}>
            {QUICK_ACTIONS.map(a => (
              <Link key={a.href} href={a.href}
                className="qa-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: card, border: `1px solid ${border}`, textDecoration: 'none', cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: a.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {a.emoji}
                </div>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: txt1 }}>
                  {lang === 'DE' ? a.labelDE : a.label}
                </span>
              </Link>
            ))}
          </div>

          {/* ── Tab selector ─────────────────────────────── */}
          <div className="dash-card" style={{ display: 'flex', gap: 8 }}>
            {(['pulse', 'ai'] as DashTab[]).map(t2 => (
              <button key={t2} onClick={() => setTab(t2)}
                style={{ padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: tab === t2 ? blue : 'rgba(255,255,255,0.06)', color: tab === t2 ? '#fff' : txt2, transition: 'all .15s' }}>
                {t2 === 'pulse' ? t('Marktpuls', 'Market Pulse') : t('KI-Impact', 'AI Impact')}
              </button>
            ))}
          </div>

          {/* ── Market Pulse ─────────────────────────────── */}
          {tab === 'pulse' && (
            <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Stats row */}
              <div className="mob-stats" style={{ display: 'grid' }}>
                {MARKET_STATS.map(s => (
                  <div key={s.label} style={{ padding: '16px 18px', borderRadius: 12, background: card, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: 10, color: txt2, marginBottom: 6, letterSpacing: .5, textTransform: 'uppercase' }}>{s.label}</div>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800, color: s.color, marginBottom: 2 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: txt2 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Salary guide */}
              <div style={{ borderRadius: 12, background: card, border: `1px solid ${border}`, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}` }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: txt1 }}>
                    {t('Gehaltsguide DACH 2026', 'DACH Salary Guide 2026')}
                  </div>
                  <div style={{ fontSize: 11, color: txt2 }}>{t('Jahresgehalt in EUR (brutto)', 'Annual gross salary in EUR')}</div>
                </div>
                {SALARY_GUIDE.map((r, i) => (
                  <div key={i} className="sal-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: i < SALARY_GUIDE.length - 1 ? `1px solid ${border}` : 'none', background: 'transparent' }}>
                    <div>
                      <div style={{ fontSize: 13, color: txt1, fontWeight: 500 }}>{r.role}</div>
                      <div style={{ fontSize: 11, color: txt2 }}>{r.city}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: green }}>€{r.min}k – €{r.max}k</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div style={{ padding: '16px 20px', borderRadius: 12, background: blue + '12', border: `1px solid ${blue}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: txt1, marginBottom: 2 }}>
                    {t('Wie gut passt dein Profil?', 'How well does your profile fit?')}
                  </div>
                  <div style={{ fontSize: 12, color: txt2 }}>
                    {t('Career Scan gibt dir in 30 Sekunden eine Antwort.', 'Career Scan gives you an answer in 30 seconds.')}
                  </div>
                </div>
                <Link href="/app/career-scan"
                  style={{ padding: '10px 20px', borderRadius: 10, background: `linear-gradient(135deg,${blue},#2563eb)`, color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  {t('Career Scan starten →', 'Start Career Scan →')}
                </Link>
              </div>
            </div>
          )}

          {/* ── AI Impact ────────────────────────────────── */}
          {tab === 'ai' && (
            <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: '14px 18px', borderRadius: 12, background: card, border: `1px solid ${border}` }}>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: txt1, marginBottom: 4 }}>
                  {t('KI-Disruption nach Branche', 'AI Disruption by Sector')}
                </div>
                <div style={{ fontSize: 12, color: txt2 }}>
                  {t('Auswirkungen auf den DACH-Markt 2025–2027', 'Impact on the DACH market 2025–2027')}
                </div>
              </div>

              {AI_SECTOR_IMPACT.map((s, i) => (
                <div key={i} style={{ padding: '14px 18px', borderRadius: 12, background: card, border: `1px solid ${border}`, display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ fontSize: 22, flexShrink: 0, width: 36, textAlign: 'center' }}>{s.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: txt1 }}>{s.sector}</div>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: s.color + '20', color: s.color, fontWeight: 700, flexShrink: 0 }}>
                        {s.impact === 'creating' ? (lang === 'DE' ? 'Wachstum' : 'Growing') : s.impact === 'disrupting' ? (lang === 'DE' ? 'Disruption' : 'Disrupting') : (lang === 'DE' ? 'Gemischt' : 'Mixed')}
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${s.score}%`, background: s.color, borderRadius: 3, transition: 'width 1s ease' }}/>
                    </div>
                    <div style={{ fontSize: 11, color: txt2 }}>{s.headline}</div>
                  </div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800, color: s.color, flexShrink: 0, minWidth: 32, textAlign: 'right' }}>
                    {s.score}
                  </div>
                </div>
              ))}

              <div style={{ padding: '16px 20px', borderRadius: 12, background: purple + '12', border: `1px solid ${purple}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: txt1, marginBottom: 2 }}>
                    {t('Wie KI-resilient ist dein Profil?', 'How AI-resilient is your profile?')}
                  </div>
                  <div style={{ fontSize: 12, color: txt2 }}>
                    {t('Career Scan analysiert dein KI-Risiko in Sekunden.', 'Career Scan analyses your AI risk in seconds.')}
                  </div>
                </div>
                <Link href="/app/career-scan"
                  style={{ padding: '10px 20px', borderRadius: 10, background: `linear-gradient(135deg,${purple},#a855f7)`, color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  {t('Risiko prüfen →', 'Check AI Risk →')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
