'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'
import CareerIntelPanel from '@/components/CareerIntelPanel'
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

const bg      = '#07111f'
const card    = 'rgba(255,255,255,0.07)'
const cardHov = 'rgba(255,255,255,0.11)'
const border  = 'rgba(255,255,255,0.10)'
const txt1    = '#f1f5f9'
const txt2    = '#94a3b8'
const txt3    = '#7a8fa8'

type Country = 'de' | 'ch' | 'at'

// ── Static market data ───────────────────────────────────────
const COUNTRY_META: Record<Country, { flag: string; name: string; currency: string }> = {
  de: { flag: '🇩🇪', name: 'Deutschland', currency: 'EUR' },
  ch: { flag: '🇨🇭', name: 'Schweiz',     currency: 'CHF' },
  at: { flag: '🇦🇹', name: 'Österreich',  currency: 'EUR' },
}

const KPI_DATA: Record<Country, { label: string; value: string; sub: string; color: string; icon: string }[]> = {
  de: [
    { label: 'Open Roles',     value: '186k',      sub: 'Adzuna Deutschland', color: blue,    icon: '📋' },
    { label: 'Hottest Sector', value: 'IT & Tech', sub: '42k listings',       color: cyan,    icon: '🔥' },
    { label: 'Top City',       value: 'Berlin',    sub: '28k openings',       color: emerald, icon: '📍' },
    { label: 'Fastest Rising', value: 'KI-Ing.',   sub: 'trending role 2026', color: purple,  icon: '⭐' },
  ],
  ch: [
    { label: 'Open Roles',     value: '67k',      sub: 'Adzuna Schweiz',     color: blue,    icon: '📋' },
    { label: 'Hottest Sector', value: 'Finance',  sub: '18k listings',       color: cyan,    icon: '🔥' },
    { label: 'Top City',       value: 'Zürich',   sub: '22k openings',       color: emerald, icon: '📍' },
    { label: 'Fastest Rising', value: 'Cloud',    sub: 'trending role 2026', color: purple,  icon: '⭐' },
  ],
  at: [
    { label: 'Open Roles',     value: '45k',        sub: 'Adzuna Österreich',  color: blue,    icon: '📋' },
    { label: 'Hottest Sector', value: 'Engineering', sub: '14k listings',       color: cyan,    icon: '🔥' },
    { label: 'Top City',       value: 'Wien',        sub: '18k openings',       color: emerald, icon: '📍' },
    { label: 'Fastest Rising', value: 'DevOps',      sub: 'trending role 2026', color: purple,  icon: '⭐' },
  ],
}

const SECTOR_DATA: Record<Country, { label: string; count: number; color: string; emoji: string }[]> = {
  de: [
    { label: 'IT & Software',     count: 42000, color: blue,    emoji: '💻' },
    { label: 'Engineering',       count: 38000, color: emerald, emoji: '⚙️' },
    { label: 'Healthcare',        count: 29000, color: red,     emoji: '🏥' },
    { label: 'Finance & Banking', count: 21000, color: orange,  emoji: '💰' },
    { label: 'Sales & Marketing', count: 18000, color: cyan,    emoji: '📣' },
    { label: 'HR & Operations',   count: 12000, color: purple,  emoji: '👥' },
  ],
  ch: [
    { label: 'Finance & Banking',  count: 18000, color: orange,  emoji: '💰' },
    { label: 'IT & Software',      count: 16000, color: blue,    emoji: '💻' },
    { label: 'Healthcare',         count: 11000, color: red,     emoji: '🏥' },
    { label: 'Engineering',        count: 9000,  color: emerald, emoji: '⚙️' },
    { label: 'Pharma & Life Sci.', count: 7000,  color: cyan,    emoji: '🧬' },
    { label: 'Operations',         count: 5000,  color: purple,  emoji: '🏭' },
  ],
  at: [
    { label: 'Engineering',      count: 14000, color: emerald, emoji: '⚙️' },
    { label: 'IT & Software',    count: 12000, color: blue,    emoji: '💻' },
    { label: 'Healthcare',       count: 8000,  color: red,     emoji: '🏥' },
    { label: 'Tourism & Hosp.', count: 6000,  color: orange,  emoji: '🏨' },
    { label: 'Finance',          count: 5000,  color: cyan,    emoji: '💰' },
    { label: 'Logistics',        count: 4000,  color: purple,  emoji: '🚚' },
  ],
}

const MACRO_DATA: Record<Country, { icon: string; label: string; value: string; unit: string; trend: 'up' | 'down' | 'flat'; year: string }[]> = {
  de: [
    { icon: '👷', label: 'Unemployment',  value: '5.5', unit: '%', trend: 'down', year: 'Q1 2026' },
    { icon: '📈', label: 'GDP Growth',    value: '1.2', unit: '%', trend: 'up',   year: '2025' },
    { icon: '💶', label: 'Salary Growth', value: '4.2', unit: '%', trend: 'up',   year: '2025' },
    { icon: '🏠', label: 'Remote Share',  value: '34',  unit: '%', trend: 'up',   year: 'Q1 2026' },
  ],
  ch: [
    { icon: '👷', label: 'Unemployment',  value: '2.3', unit: '%', trend: 'down', year: 'Q1 2026' },
    { icon: '📈', label: 'GDP Growth',    value: '1.6', unit: '%', trend: 'up',   year: '2025' },
    { icon: '💶', label: 'Salary Growth', value: '3.1', unit: '%', trend: 'up',   year: '2025' },
    { icon: '🏠', label: 'Remote Share',  value: '41',  unit: '%', trend: 'up',   year: 'Q1 2026' },
  ],
  at: [
    { icon: '👷', label: 'Unemployment',  value: '6.1', unit: '%', trend: 'flat', year: 'Q1 2026' },
    { icon: '📈', label: 'GDP Growth',    value: '0.9', unit: '%', trend: 'up',   year: '2025' },
    { icon: '💶', label: 'Salary Growth', value: '3.8', unit: '%', trend: 'up',   year: '2025' },
    { icon: '🏠', label: 'Remote Share',  value: '28',  unit: '%', trend: 'up',   year: 'Q1 2026' },
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

const AI_IMPACT = [
  { sector: 'Software & IT',    emoji: '💻', impact: 'creating',   score: 85, headline: 'KI-Engineering +180% YoY',              color: emerald },
  { sector: 'Data & Analytics', emoji: '📊', impact: 'creating',   score: 80, headline: 'MLOps & Data Engineers top-demanded',    color: emerald },
  { sector: 'MedTech & Health', emoji: '🏥', impact: 'creating',   score: 68, headline: 'AI diagnostics boom — DACH leads',       color: emerald },
  { sector: 'Automotive',       emoji: '🚗', impact: 'mixed',      score: 58, headline: 'EV creates roles, disrupts legacy',      color: orange  },
  { sector: 'Finance & Banking',emoji: '🏦', impact: 'mixed',      score: 52, headline: 'Analysts valued, back-office automated', color: orange  },
  { sector: 'Marketing',        emoji: '📣', impact: 'mixed',      score: 45, headline: 'GenAI copilots reshape every role',      color: orange  },
  { sector: 'Shared Services',  emoji: '🎧', impact: 'disrupting', score: 74, headline: 'LLMs automating routine tasks fast',     color: red     },
  { sector: 'Logistics & Mfg.', emoji: '🏭', impact: 'disrupting', score: 62, headline: 'Robotics displacing manual roles',       color: red     },
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

// ── Section header ───────────────────────────────────────────
function SectionHeader({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <GlowDot color={blue} />
      <div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: '#fff' }}>{icon} {title}</div>
        <div style={{ fontSize: 11, color: txt3, marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  )
}

// ── SVG Horizontal Bar Chart ─────────────────────────────────
function BarChart({ data }: { data: { label: string; count: number; color: string; emoji: string }[] }) {
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
              {d.emoji} {d.label}
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
  const [sectorsExpanded, setSectorsExpanded] = useState(false)
  const [salaryExpanded,  setSalaryExpanded]  = useState(false)
  const [aiExpanded,      setAiExpanded]      = useState(false)
  const [customiseOpen,   setCustomiseOpen]   = useState(false)

  const { widgets, isVisible, toggle, resetDefaults } = useDashWidgets(MARKET.eu)

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

  const COUNTRIES = [
    { code: 'de' as Country, flag: '🇩🇪', name: 'DE' },
    { code: 'ch' as Country, flag: '🇨🇭', name: 'CH' },
    { code: 'at' as Country, flag: '🇦🇹', name: 'AT' },
  ]

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
          background-image:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);
          background-size:52px 52px;
        }
        .dash-hero {
          background:linear-gradient(135deg,#081525 0%,#091522 55%,#080d1a 100%);
          padding:32px 28px 36px;
          position:relative; overflow:hidden;
          border-bottom:1px solid ${border};
        }
        /* KPI */
        .kpi-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px }
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
        .goto-app-btn { display:flex;align-items:center;gap:7px;padding:10px 20px;border-radius:12px;border:1px solid rgba(55,138,221,.35);background:rgba(55,138,221,.1);color:${blue};font-size:13px;font-weight:700;cursor:pointer;font-family:"Outfit",sans-serif;transition:all .2s }
        .goto-app-btn:hover { background:rgba(55,138,221,.18);border-color:rgba(55,138,221,.6);transform:translateY(-1px) }

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
        }
        @media(max-width:380px){
          .kpi-grid    { grid-template-columns:1fr!important }
        }
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
                {greeting}{firstName ? `, ${firstName}` : ''} 👋
              </h1>
              <p style={{ margin: '5px 0 0', fontSize: 13, color: txt2 }}>
                {t('Dein DACH-Karriere-Intelligence-Dashboard', 'Your DACH career intelligence dashboard')}
              </p>
            </div>

            {/* Right controls */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Country switcher */}
              <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,.04)', border: `1px solid ${border}`, borderRadius: 12, padding: 4 }}>
                {COUNTRIES.map(c => (
                  <button key={c.code} className="country-pill" onClick={() => setCountry(c.code)}
                    style={{ padding: '7px 13px', borderRadius: 8, border: `1px solid ${country === c.code ? blue : 'transparent'}`, background: country === c.code ? blue + '22' : 'transparent', color: country === c.code ? '#fff' : txt2, fontSize: 12, fontWeight: country === c.code ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                    {c.flag} {c.name}
                  </button>
                ))}
              </div>

              {/* Credits */}
              {!loadingP && profile && (
                <div onClick={() => router.push('/app/account')}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(55,138,221,.1)', border: '1px solid rgba(55,138,221,.28)', borderRadius: 12, padding: '8px 16px', cursor: 'pointer', animation: 'glow 3s infinite' }}>
                  <span style={{ fontSize: 18 }}>⚡</span>
                  <div>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: blue, lineHeight: 1 }}>{totalCredits}</div>
                    <div style={{ fontSize: 10, color: 'rgba(55,138,221,.55)', letterSpacing: 0.5 }}>CREDITS</div>
                  </div>
                </div>
              )}

              {/* Go to App */}
              <button className="goto-app-btn" onClick={() => router.push('/app/jobs')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                {t('Zur App', 'Go to App')}
              </button>

              {/* Customise widgets */}
              <button onClick={() => setCustomiseOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, border: `1px solid ${customiseOpen ? blue : 'rgba(255,255,255,.18)'}`, background: customiseOpen ? blue + '22' : 'rgba(255,255,255,.06)', color: customiseOpen ? blue : txt2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .2s' }}>
                ⚙ {t('Widgets', 'Widgets')}
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

      {/* ── CUSTOMISE STRIP ── */}
      {customiseOpen && (
        <div style={{ background: 'rgba(7,17,31,.96)', borderBottom: `1px solid rgba(255,255,255,.08)`, padding: '16px 28px', backdropFilter: 'blur(12px)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: txt2, letterSpacing: 0.5, textTransform: 'uppercase' }}>{t('Widgets anpassen', 'Customise Dashboard')}</span>
              <button onClick={resetDefaults} style={{ fontSize: 11, color: txt3, background: 'none', border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{t('Zurücksetzen', 'Reset defaults')}</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {widgets.map(w => {
                const on = isVisible(w.id)
                return (
                  <button key={w.id} onClick={() => toggle(w.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, border: `1px solid ${on ? blue : 'rgba(255,255,255,.1)'}`, background: on ? blue + '18' : 'transparent', color: on ? blue : txt3, fontSize: 12, fontWeight: on ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .15s' }}>
                    <span>{w.icon}</span>
                    <span>{w.label}</span>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>{on ? '✓' : '+'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYTICS BODY ───────────────────────────── */}
      <div className="dash-page" style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 80px' }}>

        {/* ── Quick Actions ── */}
        {isVisible('quick_actions') && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <SectionHeader icon="⚡" title={t('Schnellzugriff', 'Quick Actions')} sub={t('Direkt zu deinen Tools', 'Jump straight to your tools')} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {[
                { label: t('Career Scan', 'Career Scan'),      icon: '🎯', href: '/app/career-scan'  },
                { label: t('Job-Suche', 'Job Search'),          icon: '🔍', href: '/app/jobs'          },
                { label: t('Lebenslauf', 'CV Builder'),         icon: '📄', href: '/app/cv-builder'    },
                { label: t('Anschreiben', 'Cover Letter'),      icon: '✉️', href: '/app/cover-letter'  },
                { label: t('Auto Apply', 'Auto Apply'),         icon: '🤖', href: '/app/auto-apply'    },
                { label: t('Zeugnis-Decoder', 'Zeugnis Decoder'), icon: '🇩🇪', href: '/app/zeugnis'   },
                { label: t('Visa Check', 'Visa Check'),         icon: '🛂', href: '/app/visa'          },
              ].map(a => (
                <button key={a.href} onClick={() => router.push(a.href)}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', borderRadius: 12, border: `1px solid ${border}`, background: 'rgba(255,255,255,.04)', color: txt2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .15s', textAlign: 'left' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = blue + '60'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = border; (e.currentTarget as HTMLButtonElement).style.color = txt2 }}>
                  <span style={{ fontSize: 16 }}>{a.icon}</span>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Career Intelligence Panel ── */}
        {isVisible('career_intel') && <CareerIntelPanel accentColor={blue} market="eu" />}

        {/* ── KPI snapshot ── */}
        {isVisible('kpi') && (
          <div className="kpi-grid" style={{ marginBottom: 28 }}>
            {kpi.map((k, i) => (
              <div key={k.label} className="kpi-card" style={{ animation: `fadeUp .45s ease ${i * 0.07}s both` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: txt3, letterSpacing: 0.7, textTransform: 'uppercase' }}>{k.label}</span>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `${k.color}15`, border: `1px solid ${k.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{k.icon}</div>
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
              <SectionHeader icon="🚀" title={t('Wachsende Skills', 'Rising Skills')} sub={t('Nachfrage-Anstieg YoY · DACH', 'YoY demand growth · DACH market')} />
              {RISING_SKILLS.map(s => (
                <div key={s.skill} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid rgba(255,255,255,.05)` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {s.hot && <span style={{ fontSize: 9, fontWeight: 700, color: orange, background: `${orange}20`, padding: '1px 6px', borderRadius: 8, letterSpacing: 0.3 }}>HOT</span>}
                    <span style={{ fontSize: 13, color: txt2 }}>{s.skill}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: emerald }}>{s.growth}</span>
                </div>
              ))}
            </div>
            {/* Declining */}
            <div style={cardStyle}>
              <SectionHeader icon="📉" title={t('Sinkende Skills', 'Declining Skills')} sub={t('Rückgang der Jobnachfrage · DACH', 'Drop in job demand · DACH market')} />
              {DECLINING_SKILLS.map(s => (
                <div key={s.skill} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid rgba(255,255,255,.05)` }}>
                  <span style={{ fontSize: 13, color: txt2 }}>{s.skill}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: red }}>{s.drop}</span>
                </div>
              ))}
            </div>
          </div>
        </div>}

        {/* ── 2. Jobs by Sector + Salary Ranges ── */}
        {isVisible('sectors_salary') && <div style={{ marginBottom: 20 }}>
          <div className="two-col">
            {/* Jobs by Sector */}
            <div style={cardStyle}>
              <SectionHeader icon={meta.flag} title={t('Jobs nach Branche', 'Jobs by Sector')} sub={`Adzuna ${meta.name} · ${t('Top 5 Branchen', 'Top 5 sectors')}`} />
              <BarChart data={visibleSectors} />
              {sectors.length > 5 && (
                <button className="expand-btn" onClick={() => setSectorsExpanded(p => !p)}>
                  {sectorsExpanded ? t('Weniger anzeigen ▲', 'Show less ▲') : t(`Alle ${sectors.length} anzeigen ▼`, `Show all ${sectors.length} ▼`)}
                </button>
              )}
            </div>

            {/* Salary Ranges */}
            <div style={cardStyle}>
              <SectionHeader icon="💶" title={t('Gehaltsspannen 2026', 'Salary Ranges 2026')} sub={`${t('Bruttojahresgehalt in', 'Annual gross in')} ${meta.currency} · min ● avg ● max`} />
              {visibleSalaries.map(s => (
                <SalaryBar key={s.role} role={s.role} min={s.min} max={s.max} avg={s.avg} sym={sym} scaleMax={scaleMax} />
              ))}
              {salaries.length > 5 && (
                <button className="expand-btn" onClick={() => setSalaryExpanded(p => !p)}>
                  {salaryExpanded ? t('Weniger anzeigen ▲', 'Show less ▲') : t(`Alle ${salaries.length} anzeigen ▼`, `Show all ${salaries.length} ▼`)}
                </button>
              )}
            </div>
          </div>
        </div>}

        {/* ── 3. Macro Indicators ── */}
        {isVisible('macro') && <div style={{ ...cardStyle, marginBottom: 20 }}>
          <SectionHeader icon={meta.flag} title={`${meta.name} — ${t('Makro-Indikatoren', 'Macro Indicators')}`} sub={`Eurostat · ${t('aktualisiert jährlich', 'updated annually')}`} />
          <div className="macro-grid">
            {macro.map(ind => {
              const good = ind.label === 'Unemployment' ? ind.trend === 'down' : ind.trend === 'up'
              const tc   = ind.trend === 'flat' ? txt3 : good ? emerald : red
              const arr  = ind.trend === 'up' ? '↑' : ind.trend === 'down' ? '↓' : '→'
              return (
                <div key={ind.label} style={{ background: cardHov, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', borderTop: `2px solid ${tc}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 22 }}>{ind.icon}</span>
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
            <SectionHeader icon="🤖" title={t('KI-Auswirkung nach Sektor', 'AI Impact by Sector')} sub={t('DACH-Markt 2026 · Grün = schafft Jobs · Rot = verdrängt Jobs', 'DACH 2026 · Green = creating jobs · Red = disrupting roles')} />
            <span style={{ fontSize: 18, color: txt2, marginTop: -12, flexShrink: 0 }}>{aiExpanded ? '▲' : '▼'}</span>
          </div>
          {aiExpanded && (
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
                        <span style={{ fontSize: 14 }}>{x.emoji}</span>
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
                        <span style={{ fontSize: 14 }}>{x.emoji}</span>
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
                        <span style={{ fontSize: 14 }}>{x.emoji}</span>
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
          )}
        </div>}

      </div>
    </div>
  )
}
