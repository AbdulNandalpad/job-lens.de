'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'
import CareerIntelPanel from '@/components/CareerIntelPanel'
import SvgIcon, { getIcon, type IconName } from '@/components/SvgIcon'
import { createClient } from '@/lib/supabase'
import { useDashWidgets } from '@/lib/useDashWidgets'
import { MARKET } from '@/lib/constants'

// ── Design tokens ────────────────────────────────────────────
const blue    = '#378ADD'
const cyan    = '#06b6d4'
const purple  = '#8b5cf6'
const emerald = '#10b981'
const red     = '#ef4444'
const orange  = '#f59e0b'

const bg      = '#f8fafc'
const card    = '#ffffff'
const cardHov = '#f1f5f9'
const border  = '#e2e8f0'
const txt1    = '#0f172a'
const txt2    = '#475569'
const txt3    = '#64748b'

type Country = 'de' | 'ch' | 'at'

// ── Static market data ───────────────────────────────────────
const COUNTRY_META: Record<Country, { flag: IconName; name: string; currency: string }> = {
  de: { flag: 'flag-de', name: 'Deutschland', currency: 'EUR' },
  ch: { flag: 'flag-ch', name: 'Schweiz',     currency: 'CHF' },
  at: { flag: 'flag-at', name: 'Österreich',  currency: 'EUR' },
}
const COUNTRIES: { code: Country; flag: IconName; name: string }[] = [
  { code: 'de', flag: 'flag-de', name: 'Deutschland' },
  { code: 'ch', flag: 'flag-ch', name: 'Schweiz'     },
  { code: 'at', flag: 'flag-at', name: 'Österreich'  },
]

const KPI_DATA: Record<Country, { label: string; value: string; sub: string; color: string; icon: IconName }[]> = {
  de: [
    { label: 'Open Roles',       value: '186k',      sub: 'Adzuna Deutschland',  color: blue,    icon: 'clipboard'    },
    { label: 'Hottest Sector',   value: 'IT & Tech', sub: '42k listings',        color: cyan,    icon: 'flame'        },
    { label: 'Top City',         value: 'Berlin',    sub: '28k openings',        color: emerald, icon: 'pin'          },
    { label: 'Fastest Rising',   value: 'KI-Ing.',   sub: 'trending role 2026',  color: purple,  icon: 'star'         },
    { label: 'Top Skill',        value: 'Gen AI',    sub: '+290% YoY demand',    color: orange,  icon: 'rocket'       },
    { label: 'Avg. Time to Hire',value: '28 days',   sub: 'DACH market avg 2026',color: red,     icon: 'trending-up'  },
  ],
  ch: [
    { label: 'Open Roles',       value: '67k',       sub: 'Adzuna Schweiz',      color: blue,    icon: 'clipboard'    },
    { label: 'Hottest Sector',   value: 'Finance',   sub: '18k listings',        color: cyan,    icon: 'flame'        },
    { label: 'Top City',         value: 'Zürich',    sub: '22k openings',        color: emerald, icon: 'pin'          },
    { label: 'Fastest Rising',   value: 'Cloud',     sub: 'trending role 2026',  color: purple,  icon: 'star'         },
    { label: 'Top Skill',        value: 'MLOps',     sub: '+180% YoY demand',    color: orange,  icon: 'rocket'       },
    { label: 'Avg. Time to Hire',value: '24 days',   sub: 'CH market avg 2026',  color: red,     icon: 'trending-up'  },
  ],
  at: [
    { label: 'Open Roles',       value: '45k',         sub: 'Adzuna Österreich',   color: blue,    icon: 'clipboard'    },
    { label: 'Hottest Sector',   value: 'Engineering', sub: '14k listings',        color: cyan,    icon: 'flame'        },
    { label: 'Top City',         value: 'Wien',        sub: '18k openings',        color: emerald, icon: 'pin'          },
    { label: 'Fastest Rising',   value: 'DevOps',      sub: 'trending role 2026',  color: purple,  icon: 'star'         },
    { label: 'Top Skill',        value: 'Cloud',       sub: '+88% YoY demand',     color: orange,  icon: 'rocket'       },
    { label: 'Avg. Time to Hire',value: '31 days',     sub: 'AT market avg 2026',  color: red,     icon: 'trending-up'  },
  ],
}

const SECTOR_DATA: Record<Country, { label: string; count: number; color: string }[]> = {
  de: [
    { label: 'IT & Software',     count: 42000, color: blue    },
    { label: 'Engineering',       count: 38000, color: emerald },
    { label: 'Healthcare',        count: 29000, color: red     },
    { label: 'Finance & Banking', count: 21000, color: orange  },
    { label: 'Sales & Marketing', count: 18000, color: cyan    },
    { label: 'HR & Operations',   count: 12000, color: purple  },
  ],
  ch: [
    { label: 'Finance & Banking',  count: 18000, color: orange  },
    { label: 'IT & Software',      count: 16000, color: blue    },
    { label: 'Healthcare',         count: 11000, color: red     },
    { label: 'Engineering',        count: 9000,  color: emerald },
    { label: 'Pharma & Life Sci.', count: 7000,  color: cyan    },
    { label: 'Operations',         count: 5000,  color: purple  },
  ],
  at: [
    { label: 'Engineering',      count: 14000, color: emerald },
    { label: 'IT & Software',    count: 12000, color: blue    },
    { label: 'Healthcare',       count: 8000,  color: red     },
    { label: 'Tourism & Hosp.', count: 6000,  color: orange  },
    { label: 'Finance',          count: 5000,  color: cyan    },
    { label: 'Logistics',        count: 4000,  color: purple  },
  ],
}

const MACRO_DATA: Record<Country, { icon: IconName; label: string; value: string; unit: string; trend: 'up' | 'down' | 'flat'; year: string }[]> = {
  de: [
    { icon: 'worker',       label: 'Unemployment',  value: '5.5', unit: '%', trend: 'down', year: 'Q1 2026' },
    { icon: 'trending-up',  label: 'GDP Growth',    value: '1.2', unit: '%', trend: 'up',   year: '2025' },
    { icon: 'euro',         label: 'Salary Growth', value: '4.2', unit: '%', trend: 'up',   year: '2025' },
    { icon: 'home',         label: 'Remote Share',  value: '34',  unit: '%', trend: 'up',   year: 'Q1 2026' },
  ],
  ch: [
    { icon: 'worker',       label: 'Unemployment',  value: '2.3', unit: '%', trend: 'down', year: 'Q1 2026' },
    { icon: 'trending-up',  label: 'GDP Growth',    value: '1.6', unit: '%', trend: 'up',   year: '2025' },
    { icon: 'euro',         label: 'Salary Growth', value: '3.1', unit: '%', trend: 'up',   year: '2025' },
    { icon: 'home',         label: 'Remote Share',  value: '41',  unit: '%', trend: 'up',   year: 'Q1 2026' },
  ],
  at: [
    { icon: 'worker',       label: 'Unemployment',  value: '6.1', unit: '%', trend: 'flat', year: 'Q1 2026' },
    { icon: 'trending-up',  label: 'GDP Growth',    value: '0.9', unit: '%', trend: 'up',   year: '2025' },
    { icon: 'euro',         label: 'Salary Growth', value: '3.8', unit: '%', trend: 'up',   year: '2025' },
    { icon: 'home',         label: 'Remote Share',  value: '28',  unit: '%', trend: 'up',   year: 'Q1 2026' },
  ],
}

const SALARY_DATA: Record<Country, { role: string; min: number; max: number; avg: number }[]> = {
  de: [
    { role: 'ML / AI Engineer',  min: 75,  max: 130, avg: 95  },
    { role: 'Cloud Architect',   min: 80,  max: 140, avg: 105 },
    { role: 'Product Manager',   min: 70,  max: 115, avg: 88  },
    { role: 'Data Scientist',    min: 65,  max: 105, avg: 82  },
    { role: 'Backend Engineer',  min: 55,  max: 90,  avg: 70  },
    { role: 'DevOps Engineer',   min: 60,  max: 95,  avg: 75  },
  ],
  ch: [
    { role: 'ML / AI Engineer',  min: 110, max: 180, avg: 140 },
    { role: 'Cloud Architect',   min: 115, max: 190, avg: 150 },
    { role: 'Product Manager',   min: 100, max: 165, avg: 128 },
    { role: 'Data Scientist',    min: 95,  max: 155, avg: 120 },
    { role: 'Backend Engineer',  min: 85,  max: 135, avg: 105 },
    { role: 'DevOps Engineer',   min: 88,  max: 140, avg: 108 },
  ],
  at: [
    { role: 'ML / AI Engineer',  min: 65,  max: 110, avg: 82 },
    { role: 'Cloud Architect',   min: 68,  max: 115, avg: 88 },
    { role: 'Product Manager',   min: 60,  max: 100, avg: 76 },
    { role: 'Data Scientist',    min: 55,  max: 95,  avg: 72 },
    { role: 'Backend Engineer',  min: 48,  max: 80,  avg: 60 },
    { role: 'DevOps Engineer',   min: 50,  max: 85,  avg: 64 },
  ],
}

const AI_IMPACT: { sector: string; icon: IconName; impact: string; score: number; headline: string; color: string }[] = [
  { sector: 'Software & IT',    icon: 'laptop',      impact: 'creating',   score: 85, headline: 'KI-Engineering +180% YoY',              color: emerald },
  { sector: 'Data & Analytics', icon: 'chart-bar',   impact: 'creating',   score: 80, headline: 'MLOps & Data Engineers top-demanded',    color: emerald },
  { sector: 'MedTech & Health', icon: 'hospital',    impact: 'creating',   score: 68, headline: 'AI diagnostics boom — DACH leads',       color: emerald },
  { sector: 'Automotive',       icon: 'gear',        impact: 'mixed',      score: 58, headline: 'EV creates roles, disrupts legacy',      color: orange  },
  { sector: 'Finance & Banking',icon: 'coin',        impact: 'mixed',      score: 52, headline: 'Analysts valued, back-office automated', color: orange  },
  { sector: 'Marketing',        icon: 'megaphone',   impact: 'mixed',      score: 45, headline: 'GenAI copilots reshape every role',      color: orange  },
  { sector: 'Shared Services',  icon: 'headphone',   impact: 'disrupting', score: 74, headline: 'LLMs automating routine tasks fast',     color: red     },
  { sector: 'Logistics & Mfg.', icon: 'factory',     impact: 'disrupting', score: 62, headline: 'Robotics displacing manual roles',       color: red     },
]

const RISING_SKILLS = [
  { skill: 'Generative AI',      growth: '+290%', hot: true  },
  { skill: 'LLM / RAG Systems',  growth: '+260%', hot: true  },
  { skill: 'MLOps',              growth: '+180%', hot: true  },
  { skill: 'Prompt Engineering', growth: '+155%', hot: false },
  { skill: 'Cloud (AWS/Azure)',  growth: '+88%',  hot: false },
  { skill: 'Data Engineering',   growth: '+80%',  hot: false },
]
const DECLINING_SKILLS = [
  { skill: 'Manual Testing',    drop: '-45%' },
  { skill: 'Data Entry',        drop: '-58%' },
  { skill: 'Basic Excel',       drop: '-37%' },
  { skill: 'Legacy SAP (ABAP)', drop: '-42%' },
  { skill: 'Cold Calling',      drop: '-31%' },
  { skill: 'Manual SEO',        drop: '-40%' },
]

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`
  return n.toString()
}

function GlowDot({ color }: { color: string }) {
  return (
    <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 7px ${color}`, flexShrink: 0 }} />
  )
}

// ── Source tag — small credibility footnote at the bottom of a card ──────────
function SourceTag({ sources }: { sources: { label: string; url?: string }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 16, paddingTop: 12, borderTop: 'rgba(255,255,255,0.07) 1px solid' }}>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 0.4, flexShrink: 0 }}>Sources:</span>
      {sources.map((s, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {s.url
            ? <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'rgba(55,138,221,0.6)', textDecoration: 'none', borderBottom: '1px dotted rgba(55,138,221,0.3)' }}>{s.label}</a>
            : <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{s.label}</span>
          }
          {i < sources.length - 1 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>·</span>}
        </span>
      ))}
    </div>
  )
}

// ── Section header ───────────────────────────────────────────
function SectionHeader({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <GlowDot color={blue} />
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: '#fff' }}>
          {getIcon(icon, 14, '#fff')}
          {title}
        </div>
        <div style={{ fontSize: 11, color: txt3, marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  )
}

// ── SVG Horizontal Bar Chart ─────────────────────────────────
function BarChart({ data }: { data: { label: string; count: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.count))
  const ROW = 38, LEFT = 118, BAR = 170
  const h = data.length * ROW + 16
  return (
    <svg viewBox={`0 0 ${LEFT + BAR + 56} ${h}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
      {data.map((d, i) => {
        const bw = Math.round((d.count / max) * BAR)
        const y  = i * ROW + 8
        return (
          <g key={d.label}>
            <text x={LEFT - 8} y={y + 14} fontSize="11.5" fill={txt2} textAnchor="end" dominantBaseline="middle">
              {d.label}
            </text>
            <rect x={LEFT} y={y + 6} width={BAR} height={16} rx={8} fill="rgba(255,255,255,0.04)" />
            <rect x={LEFT} y={y + 6} width={0} height={16} rx={8} fill={d.color} opacity={0.75}>
              <animate attributeName="width" from="0" to={bw} dur="0.7s" begin={`${i * 0.08}s`} fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" />
            </rect>
            <text x={LEFT + bw + 8} y={y + 14} fontSize="11" fill={d.color} dominantBaseline="middle" fontWeight="700">
              {fmt(d.count)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── CSS Salary Range Bar ─────────────────────────────────────
function SalaryBar({ role, min, max, avg, sym, scaleMax }: { role: string; min: number; max: number; avg: number; sym: string; scaleMax: number }) {
  const minPct = (min / scaleMax) * 100
  const maxPct = (max / scaleMax) * 100
  const avgPct = (avg / scaleMax) * 100
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: txt2, fontWeight: 500 }}>{role}</span>
        <span style={{ fontSize: 12, color: blue, fontWeight: 700 }}>{sym}{avg}k avg</span>
      </div>
      <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
        <div style={{ position: 'absolute', left: `${minPct}%`, width: `${maxPct - minPct}%`, height: '100%', background: `linear-gradient(90deg,${blue}35,${blue}70)`, borderRadius: 4 }} />
        <div style={{ position: 'absolute', left: `${avgPct}%`, top: '50%', transform: 'translate(-50%,-50%)', width: 14, height: 14, borderRadius: '50%', background: blue, border: `2.5px solid ${bg}`, boxShadow: `0 0 8px ${blue}90` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: txt3 }}>{sym}{min}k min</span>
        <span style={{ fontSize: 10, color: txt3 }}>{sym}{max}k max</span>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────
export default function DACHDashboard() {
  const router   = useRouter()
  const { lang } = useLanguage()
  const [profile,  setProfile]  = useState<{ full_name?: string; credits?: number; eu_credits?: number } | null>(null)
  const [loadingP, setLoadingP] = useState(true)
  const [country,         setCountry]         = useState<Country>('de')
  const [sectorsExpanded,  setSectorsExpanded]  = useState(false)
  const [salaryExpanded,   setSalaryExpanded]   = useState(false)
  const [aiExpanded,       setAiExpanded]       = useState(false)
  const [showCustomize,    setShowCustomize]    = useState(false)
  const { isVisible, widgets, toggle, resetDefaults } = useDashWidgets(MARKET.eu)

  const t = (de: string, en: string) => lang === 'DE' ? de : en

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  useEffect(() => {
    fetch('/api/user/profile').then(r => r.json()).then(setProfile).finally(() => setLoadingP(false))
  }, [])

  const hour     = new Date().getHours()
  const greeting = lang === 'DE'
    ? (hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend')
    : (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening')
  const firstName    = (profile?.full_name ?? '').split(' ')[0]
  const totalCredits = (profile?.credits ?? 0) + (profile?.eu_credits ?? 0)

  const meta     = COUNTRY_META[country]
  const kpi      = KPI_DATA[country]
  const sectors  = SECTOR_DATA[country]
  const macro    = MACRO_DATA[country]
  const salaries = SALARY_DATA[country]
  const sym      = meta.currency === 'CHF' ? 'Fr.' : '€'
  const scaleMax = meta.currency === 'CHF' ? 200 : 155

  // COUNTRIES defined at module level (above)

  const creating   = AI_IMPACT.filter(x => x.impact === 'creating')
  const mixed      = AI_IMPACT.filter(x => x.impact === 'mixed')
  const disrupting = AI_IMPACT.filter(x => x.impact === 'disrupting')

  const cardStyle: React.CSSProperties = { background: card, border: `1px solid ${border}`, borderRadius: 20, padding: '22px 24px' }

  const visibleSectors = sectorsExpanded ? sectors : sectors.slice(0, 5)
  const visibleSalaries = salaryExpanded ? salaries : salaries.slice(0, 5)

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: "'DM Sans',sans-serif", color: txt1 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700;800&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes glow   { 0%,100%{box-shadow:0 0 20px rgba(55,138,221,.15)} 50%{box-shadow:0 0 40px rgba(55,138,221,.4)} }
        * { box-sizing:border-box }

        .dash-page {
          background-color:${bg};
          background-image:linear-gradient(rgba(0,0,0,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.04) 1px,transparent 1px);
          background-size:52px 52px;
        }
        .dash-hero {
          background:linear-gradient(135deg,#e8f0fb 0%,#f0f7ff 55%,#f8fafc 100%);
          padding:32px 28px 36px;
          position:relative; overflow:hidden;
          border-bottom:1px solid ${border};
        }
        /* KPI */
        .kpi-grid { display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin-bottom:24px }
        .kpi-card { background:${card};border:1px solid ${border};border-radius:16px;padding:20px;transition:all .2s }
        .kpi-card:hover { background:${cardHov};border-color:rgba(255,255,255,.18) }
        /* Two column layouts */
        .two-col   { display:grid;grid-template-columns:1fr 1fr;gap:18px }
        .skills-cols { display:grid;grid-template-columns:1fr 1fr;gap:16px }
        .macro-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px }
        /* AI heatmap */
        .ai-heat { display:grid;grid-template-columns:repeat(3,1fr);gap:16px }
        /* country pill */
        .country-pill { cursor:pointer;transition:all .15s }
        .country-pill:hover { border-color:rgba(55,138,221,.5) !important }
        /* expand button */
        .expand-btn { background:none;border:1px solid rgba(255,255,255,.1);color:${txt2};border-radius:8px;padding:6px 18px;font-size:12px;cursor:pointer;margin-top:14px;width:100%;font-family:inherit;transition:all .15s }
        .expand-btn:hover { border-color:rgba(55,138,221,.4);color:${blue} }
        /* go to app button */
        .goto-app-btn { display:flex;align-items:center;gap:7px;padding:10px 20px;border-radius:12px;border:1px solid rgba(55,138,221,.6);background:linear-gradient(135deg,rgba(55,138,221,.2),rgba(55,138,221,.1));color:${blue};font-size:13px;font-weight:700;cursor:pointer;font-family:"Outfit",sans-serif;transition:all .2s;animation:glow 3s infinite }
        .goto-app-btn:hover { background:linear-gradient(135deg,rgba(55,138,221,.35),rgba(55,138,221,.2));border-color:${blue};transform:translateY(-1px);box-shadow:0 4px 20px rgba(55,138,221,.35) }

        @media(max-width:1100px){
          .kpi-grid    { grid-template-columns:repeat(3,1fr)!important }
        }
        @media(max-width:900px){
          .kpi-grid    { grid-template-columns:repeat(2,1fr)!important }
          .two-col     { grid-template-columns:1fr!important }
          .skills-cols { grid-template-columns:1fr!important }
          .ai-heat     { grid-template-columns:1fr!important }
        }
        @media(max-width:600px){
          .dash-hero   { padding:20px 16px 28px!important }
          .kpi-grid    { grid-template-columns:1fr 1fr!important;gap:10px!important }
          .macro-grid  { grid-template-columns:1fr!important }
          .hero-top    { flex-direction:column!important;align-items:flex-start!important }
          .country-pills-desktop { display:none!important }
          .country-select-mobile { display:flex!important }
        }
        @media(min-width:601px){
          .country-select-mobile { display:none!important }
        }
        @media(max-width:380px){
          .kpi-grid    { grid-template-columns:1fr!important }
        }
        .start-cards { display:grid;grid-template-columns:repeat(3,1fr);gap:14px }
        .more-tools  { display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px }
        @media(max-width:768px){ .start-cards { grid-template-columns:1fr!important } }
        @media(max-width:500px){ .more-tools  { grid-template-columns:repeat(2,1fr)!important } }
      `}</style>

      {/* ── HERO ─────────────────────────────────────── */}
      <div className="dash-hero">
        {/* Ambient glows */}
        <div style={{ position: 'absolute', top: -100, right: -60, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle,rgba(55,138,221,.14) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -120, left: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,.08) 0%,transparent 65%)', pointerEvents: 'none' }} />

        {/* Faint logo watermark */}
        <div style={{ position: 'absolute', right: 32, top: '50%', transform: 'translateY(-50%)', opacity: 0.04, pointerEvents: 'none', userSelect: 'none' }}>
          <svg width="220" height="220" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke="#378ADD" strokeWidth="2" />
            <circle cx="20" cy="20" r="8"  fill="none" stroke="#378ADD" strokeWidth="1" />
            <circle cx="20" cy="20" r="3"  fill="#378ADD" />
            <line x1="7" y1="20" x2="33" y2="20" stroke="#378ADD" strokeWidth="0.6" />
            <line x1="28" y1="28" x2="36" y2="36" stroke="#378ADD" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          {/* Top row: brand + controls */}
          <div className="hero-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>

            {/* Brand + greeting */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <svg width="20" height="20" viewBox="0 0 44 44">
                  <circle cx="20" cy="20" r="13" fill="none" stroke={blue} strokeWidth="2.5" />
                  <circle cx="20" cy="20" r="8"  fill="none" stroke="#85B7EB" strokeWidth="1.2" />
                  <circle cx="20" cy="20" r="3"  fill={blue} />
                  <line x1="7" y1="20" x2="33" y2="20" stroke={blue} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5" />
                  <line x1="28" y1="28" x2="36" y2="36" stroke={blue} strokeWidth="3" strokeLinecap="round" />
                </svg>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5 }}>
                  Job-Lens <span style={{ color: blue }}>AI</span>
                  <span style={{ color: txt3, fontWeight: 400, marginLeft: 7 }}>· DACH Intelligence</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <GlowDot color={emerald} />
                <span style={{ fontSize: 11, color: txt3, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  {new Date().toLocaleDateString(lang === 'DE' ? 'de-DE' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <h1 style={{ margin: 0, fontFamily: "'Outfit',sans-serif", fontSize: 'clamp(20px,4.5vw,30px)', fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
                {greeting}{firstName ? `, ${firstName}` : ''}
              </h1>
              <p style={{ margin: '5px 0 0', fontSize: 13, color: txt2 }}>
                {t('Dein DACH-Karriere-Intelligence-Dashboard', 'Your DACH career intelligence dashboard')}
              </p>
            </div>

            {/* Right controls */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Country switcher — pills on desktop, select on mobile */}
              <div className="country-pills-desktop" style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,.04)', border: `1px solid ${border}`, borderRadius: 12, padding: 4 }}>
                {COUNTRIES.map(c => (
                  <button key={c.code} className="country-pill" onClick={() => setCountry(c.code)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 8, border: `1px solid ${country === c.code ? blue : 'transparent'}`, background: country === c.code ? blue + '22' : 'transparent', color: country === c.code ? '#fff' : txt2, fontSize: 12, fontWeight: country === c.code ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                    <SvgIcon name={c.flag} size={18} />
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="country-select-mobile" style={{ alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.04)', border: `1px solid ${border}`, borderRadius: 12, padding: '2px 6px' }}>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value as Country)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', outline: 'none', padding: '7px 4px' }}>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code} style={{ background: '#0e1a28', color: '#fff' }}>
                      {c.code.toUpperCase()} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Credits */}
              {!loadingP && profile && (
                <div onClick={() => router.push('/app/account')}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(55,138,221,.1)', border: '1px solid rgba(55,138,221,.28)', borderRadius: 12, padding: '8px 16px', cursor: 'pointer', animation: 'glow 3s infinite' }}>
                  <SvgIcon name="lightning" size={18} color={blue} />
                  <div>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: blue, lineHeight: 1 }}>{totalCredits}</div>
                    <div style={{ fontSize: 10, color: 'rgba(55,138,221,.55)', letterSpacing: 0.5 }}>CREDITS</div>
                  </div>
                </div>
              )}

              {/* Customize */}
              <button
                onClick={() => setShowCustomize(p => !p)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, border: `1px solid ${showCustomize ? blue + '80' : 'rgba(255,255,255,.12)'}`, background: showCustomize ? blue + '18' : 'rgba(255,255,255,.04)', color: showCustomize ? blue : txt2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .2s' }}>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10" cy="10" r="3"/><path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.5 3.5l1.4 1.4M15.1 15.1l1.4 1.4M3.5 16.5l1.4-1.4M15.1 4.9l1.4-1.4"/></svg>
                {t('Anpassen', 'Customize')}
              </button>

              {/* Go to App */}
              <button className="goto-app-btn" onClick={() => router.push('/app/jobs')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                {t('Zur App', 'Go to App')}
              </button>

              {/* Sign Out */}
              <button onClick={signOut}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)', color: txt3, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .2s' }}>
                ↩ {t('Abmelden', 'Sign Out')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── CUSTOMIZE PANEL ──────────────────────────── */}
      {showCustomize && (
        <div style={{ background: 'rgba(55,138,221,.06)', borderBottom: `1px solid ${border}`, padding: '18px 28px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, color: '#fff' }}>
                {t('Widgets auswählen', 'Choose your widgets')}
              </span>
              <button onClick={resetDefaults} style={{ fontSize: 11, color: txt3, background: 'none', border: `1px solid rgba(255,255,255,.12)`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                {t('Alle entfernen', 'Clear all')}
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {widgets.map(w => {
                const on = isVisible(w.id)
                return (
                  <button key={w.id} onClick={() => toggle(w.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 20, border: `1px solid ${on ? blue + '60' : 'rgba(255,255,255,.12)'}`, background: on ? blue + '18' : 'rgba(255,255,255,.04)', color: on ? blue : txt2, fontSize: 12, fontWeight: on ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .15s' }}>
                    <SvgIcon name={w.icon as Parameters<typeof SvgIcon>[0]['name']} size={13} color="currentColor" />
                    {w.label}
                    {on && <span style={{ fontSize: 10, opacity: .7 }}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYTICS BODY ───────────────────────────── */}
      <div className="dash-page" style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 80px' }}>

        {/* ── Start Here — 3 prominent action cards ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: txt3, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 14, fontWeight: 600 }}>
            {t('Wo möchtest du starten?', 'Where would you like to start?')}
          </div>
          <div className="start-cards">
            {([
              {
                step: 'STEP 1', color: blue, href: '/app/career-scan', icon: 'target' as IconName,
                title: t('Career Scan', 'Career Scan'),
                desc: t('KI analysiert deinen Lebenslauf in 30 Sek. — Score, Gehaltsspanne & Skill-Lücken.', 'AI analyses your CV in 30s — score, salary range and skill gaps.'),
                cta: t('Jetzt starten →', 'Start now →'),
              },
              {
                step: 'STEP 2', color: emerald, href: '/app/jobs', icon: 'search' as IconName,
                title: t('Jobs finden', 'Find Jobs'),
                desc: t('KI-Jobsuche im DACH-Markt — passend zu deinem Profil und deiner Erfahrung.', 'AI job search across DACH — matched to your profile and experience.'),
                cta: t('Jobs durchsuchen →', 'Browse jobs →'),
              },
              {
                step: 'STEP 3', color: purple, href: '/app/cv-builder', icon: 'document' as IconName,
                title: t('Bewerben', 'Apply'),
                desc: t('Lebenslauf & Anschreiben auf jede Stelle zuschneiden — ein Klick, ATS-optimiert.', 'Tailor your CV and cover letter to every job — one click, ATS-optimised.'),
                cta: t('CV Builder öffnen →', 'Open CV Builder →'),
              },
            ]).map(card => (
              <button key={card.href} onClick={() => router.push(card.href)}
                style={{ background: `linear-gradient(135deg,${card.color}18,${card.color}08)`, border: `1.5px solid ${card.color}40`, borderRadius: 18, padding: '24px 20px', cursor: 'pointer', textAlign: 'left' as const, fontFamily: "'DM Sans',sans-serif", transition: 'all .2s', width: '100%' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = card.color; e.currentTarget.style.background = `linear-gradient(135deg,${card.color}28,${card.color}12)` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${card.color}40`; e.currentTarget.style.background = `linear-gradient(135deg,${card.color}18,${card.color}08)` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${card.color}20`, border: `1px solid ${card.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SvgIcon name={card.icon} size={22} color={card.color} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: card.color, background: `${card.color}15`, padding: '3px 10px', borderRadius: 20, letterSpacing: 0.5 }}>{card.step}</span>
                </div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 17, fontWeight: 700, color: txt1, marginBottom: 6 }}>{card.title}</div>
                <div style={{ fontSize: 13, color: txt2, lineHeight: 1.55 }}>{card.desc}</div>
                <div style={{ marginTop: 16, fontSize: 12, color: card.color, fontWeight: 600 }}>{card.cta}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── More Tools ── */}
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: txt3, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 12, fontWeight: 600 }}>
            {t('Weitere Tools', 'More Tools')}
          </div>
          <div className="more-tools">
            {([
              { label: t('Anschreiben', 'Cover Letter'), icon: 'email'    as IconName, href: '/app/cover-letter' },
              { label: t('Auto Apply',  'Auto Apply'),   icon: 'bot'      as IconName, href: '/app/auto-apply'   },
              { label: t('Interview',   'Interview'),    icon: 'mic'      as IconName, href: '/app/interview'    },
              { label: t('Gehalt Sim.', 'Salary Sim.'),  icon: 'coin'     as IconName, href: '/app/salary-sim'   },
              { label: t('Tracker',     'Tracker'),      icon: 'clipboard'as IconName, href: '/app/tracker'      },
              { label: t('Zeugnis',     'Zeugnis'),      icon: 'flag-de'  as IconName, href: '/app/zeugnis'      },
            ] as { label: string; icon: IconName; href: string }[]).map(a => (
              <button key={a.href} onClick={() => router.push(a.href)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: `1px solid ${border}`, background: 'rgba(255,255,255,.04)', color: txt2, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .15s', textAlign: 'left' as const }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = blue + '60'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = txt2 }}>
                <SvgIcon name={a.icon} size={15} color="currentColor" />
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Career Intelligence Panel ── */}
        {isVisible('career_intel') && <CareerIntelPanel accentColor={blue} market="eu" />}

        {/* ── KPI snapshot ── */}
        {isVisible('kpi') && (
          <div className="kpi-grid" style={{ marginBottom: 28 }}>
            {kpi.map((k, i) => (
              <div key={k.label} className="kpi-card" style={{ animation: `fadeUp .45s ease ${i * 0.07}s both` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: txt3, letterSpacing: 0.7, textTransform: 'uppercase' }}>{k.label}</span>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `${k.color}15`, border: `1px solid ${k.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SvgIcon name={k.icon} size={15} color={k.color} /></div>
                </div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800, color: k.color, lineHeight: 1, letterSpacing: -0.5 }}>{k.value}</div>
                <div style={{ fontSize: 11, color: txt3, marginTop: 6 }}>{k.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── 1. Skills: Rising + Declining ── */}
        {isVisible('skills') && <div style={{ marginBottom: 20 }}>
          <div className="skills-cols">
            {/* Rising */}
            <div style={cardStyle}>
              <SectionHeader icon="rocket" title={t('Wachsende Skills', 'Rising Skills')} sub={t('Nachfrage-Anstieg YoY · DACH', 'YoY demand growth · DACH market')} />
              {RISING_SKILLS.map(s => (
                <div key={s.skill} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid rgba(255,255,255,.05)` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {s.hot && <span style={{ fontSize: 9, fontWeight: 700, color: orange, background: `${orange}20`, padding: '1px 6px', borderRadius: 8, letterSpacing: 0.3 }}>HOT</span>}
                    <span style={{ fontSize: 13, color: txt2 }}>{s.skill}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: emerald }}>{s.growth}</span>
                </div>
              ))}
              <SourceTag sources={[
                { label: 'LinkedIn Talent Insights 2025', url: 'https://business.linkedin.com/talent-solutions/talent-insights' },
                { label: 'Stepstone Jobmarktreport 2025', url: 'https://www.stepstone.de/magazin/artikel/jobmarktreport' },
              ]} />
            </div>
            {/* Declining */}
            <div style={cardStyle}>
              <SectionHeader icon="trending-down" title={t('Sinkende Skills', 'Declining Skills')} sub={t('Rückgang der Jobnachfrage · DACH', 'Drop in job demand · DACH market')} />
              {DECLINING_SKILLS.map(s => (
                <div key={s.skill} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid rgba(255,255,255,.05)` }}>
                  <span style={{ fontSize: 13, color: txt2 }}>{s.skill}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: red }}>{s.drop}</span>
                </div>
              ))}
              <SourceTag sources={[
                { label: 'LinkedIn Talent Insights 2025', url: 'https://business.linkedin.com/talent-solutions/talent-insights' },
                { label: 'WEF Future of Jobs 2025', url: 'https://www.weforum.org/reports/the-future-of-jobs-report-2025' },
              ]} />
            </div>
          </div>
        </div>}

        {/* ── 2. Jobs by Sector + Salary Ranges ── */}
        {isVisible('sectors_salary') && <div style={{ marginBottom: 20 }}>
          <div className="two-col">
            {/* Jobs by Sector */}
            <div style={cardStyle}>
              <SectionHeader icon="clipboard" title={t('Jobs nach Branche', 'Jobs by Sector')} sub={`Adzuna ${meta.name} · ${t('Top 5 Branchen', 'Top 5 sectors')}`} />
              <BarChart data={visibleSectors} />
              {sectors.length > 5 && (
                <button className="expand-btn" onClick={() => setSectorsExpanded(p => !p)}>
                  {sectorsExpanded ? t('Weniger anzeigen ▲', 'Show less ▲') : t(`Alle ${sectors.length} anzeigen ▼`, `Show all ${sectors.length} ▼`)}
                </button>
              )}
            </div>

            {/* Salary Ranges */}
            <div style={cardStyle}>
              <SectionHeader icon="euro" title={t('Gehaltsspannen 2026', 'Salary Ranges 2026')} sub={`${t('Bruttojahresgehalt in', 'Annual gross in')} ${meta.currency} · min ● avg ● max`} />
              {visibleSalaries.map(s => (
                <SalaryBar key={s.role} role={s.role} min={s.min} max={s.max} avg={s.avg} sym={sym} scaleMax={scaleMax} />
              ))}
              {salaries.length > 5 && (
                <button className="expand-btn" onClick={() => setSalaryExpanded(p => !p)}>
                  {salaryExpanded ? t('Weniger anzeigen ▲', 'Show less ▲') : t(`Alle ${salaries.length} anzeigen ▼`, `Show all ${salaries.length} ▼`)}
                </button>
              )}
              <SourceTag sources={[
                { label: 'Stepstone Gehaltsreport 2025', url: 'https://www.stepstone.de/magazin/artikel/gehaltsreport' },
                { label: 'LinkedIn Salary Insights', url: 'https://www.linkedin.com/salary/' },
              ]} />
            </div>
          </div>
        </div>}

        {/* ── 3. Macro Indicators ── */}
        {isVisible('macro') && <div style={{ ...cardStyle, marginBottom: 20 }}>
          <SectionHeader icon="globe" title={`${meta.name} — ${t('Makro-Indikatoren', 'Macro Indicators')}`} sub={`Eurostat · Destatis · ${t('aktualisiert jährlich', 'updated annually')}`} />
          <div className="macro-grid">
            {macro.map(ind => {
              const good = ind.label === 'Unemployment' ? ind.trend === 'down' : ind.trend === 'up'
              const tc   = ind.trend === 'flat' ? txt3 : good ? emerald : red
              const arr  = ind.trend === 'up' ? '↑' : ind.trend === 'down' ? '↓' : '→'
              return (
                <div key={ind.label} style={{ background: cardHov, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', borderTop: `2px solid ${tc}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <SvgIcon name={ind.icon} size={22} color={tc} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: tc, background: `${tc}18`, padding: '2px 8px', borderRadius: 20 }}>{arr}</span>
                  </div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 28, fontWeight: 800, color: tc, lineHeight: 1 }}>{ind.value}{ind.unit}</div>
                  <div style={{ fontSize: 12, color: txt2, marginTop: 6 }}>{ind.label}</div>
                  <div style={{ fontSize: 10, color: txt3, marginTop: 2 }}>{ind.year}</div>
                </div>
              )
            })}
          </div>
        </div>}

        {/* ── 4. AI Impact Heat Map ── */}
        {isVisible('ai_impact') && <div style={{ ...cardStyle, marginBottom: 20 }}>
          {/* Collapsible header */}
          <div onClick={() => setAiExpanded(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
            <SectionHeader icon="bot" title={t('KI-Auswirkung nach Sektor', 'AI Impact by Sector')} sub={t('DACH-Markt 2026 · Grün = schafft Jobs · Rot = verdrängt Jobs', 'DACH 2026 · Green = creating jobs · Red = disrupting roles')} />
            <span style={{ fontSize: 18, color: txt2, marginTop: -12, flexShrink: 0 }}>{aiExpanded ? '▲' : '▼'}</span>
          </div>
          {aiExpanded && (
            <div>
            <div className="ai-heat" style={{ marginTop: 8 }}>
              {/* Creating */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: emerald, display: 'inline-block', boxShadow: `0 0 7px ${emerald}` }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: emerald }}>{t('Schafft Jobs', 'Creating Jobs')}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {creating.map(x => (
                    <div key={x.sector} style={{ background: `${emerald}08`, border: `1px solid ${emerald}28`, borderRadius: 12, padding: '11px 13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <SvgIcon name={x.icon} size={16} color={x.color} />
                        <div style={{ display: 'flex', gap: 3 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} style={{ width: 6, height: 6, borderRadius: 1, background: i < Math.round(x.score / 20) ? emerald : 'rgba(255,255,255,.1)' }} />
                          ))}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: txt1 }}>{x.sector}</div>
                      <div style={{ fontSize: 11, color: txt3, marginTop: 2 }}>{x.headline}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mixed */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: orange, display: 'inline-block', boxShadow: `0 0 7px ${orange}` }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: orange }}>{t('Gemischt', 'Mixed Impact')}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {mixed.map(x => (
                    <div key={x.sector} style={{ background: `${orange}08`, border: `1px solid ${orange}28`, borderRadius: 12, padding: '11px 13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <SvgIcon name={x.icon} size={16} color={x.color} />
                        <div style={{ display: 'flex', gap: 3 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} style={{ width: 6, height: 6, borderRadius: 1, background: i < Math.round(x.score / 20) ? orange : 'rgba(255,255,255,.1)' }} />
                          ))}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: txt1 }}>{x.sector}</div>
                      <div style={{ fontSize: 11, color: txt3, marginTop: 2 }}>{x.headline}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disrupting */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: red, display: 'inline-block', boxShadow: `0 0 7px ${red}` }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: red }}>{t('Verdrängt Jobs', 'Disrupting Jobs')}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {disrupting.map(x => (
                    <div key={x.sector} style={{ background: `${red}08`, border: `1px solid ${red}28`, borderRadius: 12, padding: '11px 13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <SvgIcon name={x.icon} size={16} color={x.color} />
                        <div style={{ display: 'flex', gap: 3 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} style={{ width: 6, height: 6, borderRadius: 1, background: i < Math.round(x.score / 20) ? red : 'rgba(255,255,255,.1)' }} />
                          ))}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: txt1 }}>{x.sector}</div>
                      <div style={{ fontSize: 11, color: txt3, marginTop: 2 }}>{x.headline}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <SourceTag sources={[
              { label: 'McKinsey Global Institute 2025', url: 'https://www.mckinsey.com/mgi/our-research' },
              { label: 'WEF Future of Jobs 2025', url: 'https://www.weforum.org/reports/the-future-of-jobs-report-2025' },
              { label: 'Bitkom AI Report 2025', url: 'https://www.bitkom.org/Bitkom/Publikationen/Bitkom-AI-Report' },
            ]} />
            </div>
          )}
        </div>}

      </div>
    </div>
  )
}
