'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'

// ── Design tokens ───────────────────────────────────────
const blue    = '#378ADD'
const cyan    = '#06b6d4'
const purple  = '#8b5cf6'
const emerald = '#10b981'
const red     = '#ef4444'
const orange  = '#f59e0b'

const bg      = '#07111f'
const card    = 'rgba(255,255,255,0.04)'
const cardHov = 'rgba(255,255,255,0.07)'
const border  = 'rgba(255,255,255,0.08)'
const borderH = 'rgba(255,255,255,0.18)'
const txt1    = '#f1f5f9'
const txt2    = '#94a3b8'
const txt3    = '#475569'

type Country = 'de' | 'ch' | 'at' | 'gb'
type DashTab = 'pulse' | 'ai'

// ── Static market data per country ──────────────────────
const COUNTRY_META: Record<Country, { flag: string; name: string; currency: string; salaryNote: string }> = {
  de: { flag: '🇩🇪', name: 'Deutschland',    currency: 'EUR', salaryNote: 'Bruttojahresgehalt in EUR · 2025–26' },
  ch: { flag: '🇨🇭', name: 'Schweiz',        currency: 'CHF', salaryNote: 'Bruttojahresgehalt in CHF · 2025–26' },
  at: { flag: '🇦🇹', name: 'Österreich',     currency: 'EUR', salaryNote: 'Bruttojahresgehalt in EUR · 2025–26' },
  gb: { flag: '🇬🇧', name: 'United Kingdom', currency: 'GBP', salaryNote: 'Annual gross salary in GBP · 2025–26' },
}

const KPI_DATA: Record<Country, { label: string; value: string; sub: string; color: string; icon: string }[]> = {
  de: [
    { label: 'Open Roles',     value: '186k',  sub: 'Adzuna Deutschland',    color: blue,   icon: '📋' },
    { label: 'Hottest Sector', value: 'IT & Tech', sub: '42k listings',       color: cyan,   icon: '🔥' },
    { label: 'Top City',       value: 'Berlin', sub: '28k openings',          color: emerald,icon: '📍' },
    { label: 'Fastest Rising', value: 'KI-Ing.',sub: 'trending role 2026',   color: purple, icon: '⭐' },
  ],
  ch: [
    { label: 'Open Roles',     value: '67k',   sub: 'Adzuna Schweiz',        color: blue,   icon: '📋' },
    { label: 'Hottest Sector', value: 'Finance',sub: '18k listings',          color: cyan,   icon: '🔥' },
    { label: 'Top City',       value: 'Zürich', sub: '22k openings',          color: emerald,icon: '📍' },
    { label: 'Fastest Rising', value: 'Cloud',  sub: 'trending role 2026',   color: purple, icon: '⭐' },
  ],
  at: [
    { label: 'Open Roles',     value: '45k',   sub: 'Adzuna Österreich',     color: blue,   icon: '📋' },
    { label: 'Hottest Sector', value: 'Engineering',sub: '14k listings',      color: cyan,   icon: '🔥' },
    { label: 'Top City',       value: 'Wien',   sub: '18k openings',          color: emerald,icon: '📍' },
    { label: 'Fastest Rising', value: 'DevOps', sub: 'trending role 2026',   color: purple, icon: '⭐' },
  ],
  gb: [
    { label: 'Open Roles',     value: '320k',  sub: 'Adzuna UK',             color: blue,   icon: '📋' },
    { label: 'Hottest Sector', value: 'IT & Tech',sub: '89k listings',        color: cyan,   icon: '🔥' },
    { label: 'Top City',       value: 'London', sub: '95k openings',          color: emerald,icon: '📍' },
    { label: 'Fastest Rising', value: 'Data Eng',sub: 'trending role 2026',  color: purple, icon: '⭐' },
  ],
}

const SECTOR_DATA: Record<Country, { label: string; count: number; color: string; emoji: string }[]> = {
  de: [
    { label: 'IT & Software',      count: 42000, color: blue,   emoji: '💻' },
    { label: 'Engineering',         count: 38000, color: emerald,emoji: '⚙️' },
    { label: 'Healthcare',          count: 29000, color: red,    emoji: '🏥' },
    { label: 'Finance & Banking',   count: 21000, color: orange, emoji: '💰' },
    { label: 'Sales & Marketing',   count: 18000, color: cyan,   emoji: '📣' },
    { label: 'HR & Operations',     count: 12000, color: purple, emoji: '👥' },
  ],
  ch: [
    { label: 'Finance & Banking',   count: 18000, color: orange, emoji: '💰' },
    { label: 'IT & Software',       count: 16000, color: blue,   emoji: '💻' },
    { label: 'Healthcare',          count: 11000, color: red,    emoji: '🏥' },
    { label: 'Engineering',         count: 9000,  color: emerald,emoji: '⚙️' },
    { label: 'Pharma & Life Sci.',  count: 7000,  color: cyan,   emoji: '🧬' },
    { label: 'Operations',          count: 5000,  color: purple, emoji: '🏭' },
  ],
  at: [
    { label: 'Engineering',         count: 14000, color: emerald,emoji: '⚙️' },
    { label: 'IT & Software',       count: 12000, color: blue,   emoji: '💻' },
    { label: 'Healthcare',          count: 8000,  color: red,    emoji: '🏥' },
    { label: 'Tourism & Hospitality',count: 6000, color: orange, emoji: '🏨' },
    { label: 'Finance',             count: 5000,  color: cyan,   emoji: '💰' },
    { label: 'Logistics',           count: 4000,  color: purple, emoji: '🚚' },
  ],
  gb: [
    { label: 'IT & Software',       count: 89000, color: blue,   emoji: '💻' },
    { label: 'Healthcare & NHS',    count: 74000, color: red,    emoji: '🏥' },
    { label: 'Finance & FinTech',   count: 52000, color: orange, emoji: '💰' },
    { label: 'Engineering',         count: 41000, color: emerald,emoji: '⚙️' },
    { label: 'Sales & Marketing',   count: 35000, color: cyan,   emoji: '📣' },
    { label: 'HR & Operations',     count: 28000, color: purple, emoji: '👥' },
  ],
}

const MACRO_DATA: Record<Country, { icon: string; label: string; value: string; unit: string; trend: 'up' | 'down' | 'flat'; year: string }[]> = {
  de: [
    { icon: '📉', label: 'Unemployment Rate', value: '5.5',  unit: '%', trend: 'down', year: 'Q1 2026' },
    { icon: '📈', label: 'GDP Growth',         value: '1.2',  unit: '%', trend: 'up',   year: '2025' },
    { icon: '💰', label: 'Avg. Salary Growth', value: '4.2',  unit: '%', trend: 'up',   year: '2025 vs 2024' },
    { icon: '🤖', label: 'Remote Job Share',   value: '34',   unit: '%', trend: 'up',   year: 'Q1 2026' },
  ],
  ch: [
    { icon: '📉', label: 'Unemployment Rate', value: '2.3',  unit: '%', trend: 'down', year: 'Q1 2026' },
    { icon: '📈', label: 'GDP Growth',         value: '1.6',  unit: '%', trend: 'up',   year: '2025' },
    { icon: '💰', label: 'Avg. Salary Growth', value: '3.1',  unit: '%', trend: 'up',   year: '2025 vs 2024' },
    { icon: '🤖', label: 'Remote Job Share',   value: '41',   unit: '%', trend: 'up',   year: 'Q1 2026' },
  ],
  at: [
    { icon: '📉', label: 'Unemployment Rate', value: '6.1',  unit: '%', trend: 'flat', year: 'Q1 2026' },
    { icon: '📈', label: 'GDP Growth',         value: '0.9',  unit: '%', trend: 'up',   year: '2025' },
    { icon: '💰', label: 'Avg. Salary Growth', value: '3.8',  unit: '%', trend: 'up',   year: '2025 vs 2024' },
    { icon: '🤖', label: 'Remote Job Share',   value: '28',   unit: '%', trend: 'up',   year: 'Q1 2026' },
  ],
  gb: [
    { icon: '📉', label: 'Unemployment Rate', value: '4.4',  unit: '%', trend: 'flat', year: 'Q1 2026' },
    { icon: '📈', label: 'GDP Growth',         value: '0.8',  unit: '%', trend: 'up',   year: '2025' },
    { icon: '💰', label: 'Avg. Salary Growth', value: '5.1',  unit: '%', trend: 'up',   year: '2025 vs 2024' },
    { icon: '🤖', label: 'Remote Job Share',   value: '38',   unit: '%', trend: 'up',   year: 'Q1 2026' },
  ],
}

const SALARY_DATA: Record<Country, { role: string; min: number; max: number; avg: number }[]> = {
  de: [
    { role: 'ML / AI Engineer',    min: 75,  max: 130, avg: 95  },
    { role: 'Cloud Architect',     min: 80,  max: 140, avg: 105 },
    { role: 'Product Manager',     min: 70,  max: 115, avg: 88  },
    { role: 'Data Scientist',      min: 65,  max: 105, avg: 82  },
    { role: 'Backend Engineer',    min: 55,  max: 90,  avg: 70  },
    { role: 'DevOps Engineer',     min: 60,  max: 95,  avg: 75  },
    { role: 'Frontend Developer',  min: 50,  max: 80,  avg: 62  },
    { role: 'Business Analyst',    min: 48,  max: 75,  avg: 58  },
  ],
  ch: [
    { role: 'ML / AI Engineer',    min: 110, max: 180, avg: 140 },
    { role: 'Cloud Architect',     min: 115, max: 190, avg: 150 },
    { role: 'Product Manager',     min: 100, max: 165, avg: 128 },
    { role: 'Data Scientist',      min: 95,  max: 155, avg: 120 },
    { role: 'Backend Engineer',    min: 85,  max: 135, avg: 105 },
    { role: 'DevOps Engineer',     min: 88,  max: 140, avg: 108 },
    { role: 'Frontend Developer',  min: 78,  max: 120, avg: 95  },
    { role: 'Business Analyst',    min: 75,  max: 115, avg: 88  },
  ],
  at: [
    { role: 'ML / AI Engineer',    min: 65,  max: 110, avg: 82  },
    { role: 'Cloud Architect',     min: 68,  max: 115, avg: 88  },
    { role: 'Product Manager',     min: 60,  max: 100, avg: 76  },
    { role: 'Data Scientist',      min: 55,  max: 95,  avg: 72  },
    { role: 'Backend Engineer',    min: 48,  max: 80,  avg: 60  },
    { role: 'DevOps Engineer',     min: 50,  max: 85,  avg: 64  },
    { role: 'Frontend Developer',  min: 44,  max: 72,  avg: 55  },
    { role: 'Business Analyst',    min: 42,  max: 68,  avg: 52  },
  ],
  gb: [
    { role: 'ML / AI Engineer',    min: 70,  max: 130, avg: 95  },
    { role: 'Cloud Architect',     min: 75,  max: 140, avg: 105 },
    { role: 'Product Manager',     min: 65,  max: 115, avg: 88  },
    { role: 'Data Scientist',      min: 60,  max: 105, avg: 80  },
    { role: 'Backend Engineer',    min: 55,  max: 90,  avg: 70  },
    { role: 'DevOps Engineer',     min: 58,  max: 95,  avg: 74  },
    { role: 'Frontend Developer',  min: 48,  max: 78,  avg: 60  },
    { role: 'Business Analyst',    min: 45,  max: 72,  avg: 56  },
  ],
}

const AI_SECTOR_IMPACT = [
  { sector: 'Software & IT',          emoji: '💻', impact: 'creating',   score: 85, headline: 'KI-Engineering-Stellen +180% YoY — DACH unter den Top-Märkten', color: emerald },
  { sector: 'Data & Analytics',       emoji: '📊', impact: 'creating',   score: 80, headline: 'MLOps & Data Engineers weiterhin sehr stark nachgefragt',          color: emerald },
  { sector: 'Automotive',             emoji: '🚗', impact: 'mixed',      score: 58, headline: 'E-Mobilität schafft neue Rollen, verdrängt klassische Berufsbilder',color: orange },
  { sector: 'Finance & Banking',      emoji: '🏦', impact: 'mixed',      score: 52, headline: 'Analysten bleiben wertvoll — Sachbearbeitung wird zunehmend automatisiert', color: orange },
  { sector: 'Marketing',              emoji: '📣', impact: 'mixed',      score: 45, headline: 'GenAI-Copilots prägen die Rolle grundlegend um',                    color: orange },
  { sector: 'Shared Services / BPO',  emoji: '🎧', impact: 'disrupting', score: 74, headline: 'Routineaufgaben durch LLMs stark automatisiert',                   color: red    },
  { sector: 'Logistik & Fertigung',   emoji: '🏭', impact: 'disrupting', score: 62, headline: 'Lagerautomatisierung und Robotik verdrängen einfache Tätigkeiten',  color: red    },
  { sector: 'Medizin & HealthTech',   emoji: '🏥', impact: 'creating',   score: 68, headline: 'KI-Diagnostik und MedTech boomen — DACH ist führend',              color: emerald },
]

const RISING_SKILLS = [
  { skill: 'Generative AI',      growth: '+290%', hot: true  },
  { skill: 'LLM / RAG Systems',  growth: '+260%', hot: true  },
  { skill: 'MLOps',              growth: '+180%', hot: true  },
  { skill: 'Prompt Engineering', growth: '+155%', hot: false },
  { skill: 'Cloud (AWS/Azure)',  growth: '+88%',  hot: false },
  { skill: 'Data Engineering',   growth: '+80%',  hot: false },
  { skill: 'Kubernetes',         growth: '+68%',  hot: false },
  { skill: 'Python',             growth: '+62%',  hot: false },
]
const DECLINING_SKILLS = [
  { skill: 'Manuelle Tests',      drop: '-45%' },
  { skill: 'Dateneingabe',        drop: '-58%' },
  { skill: 'Basic Excel',         drop: '-37%' },
  { skill: 'Legacy SAP (ABAP)',   drop: '-42%' },
  { skill: 'Kaltakquise',         drop: '-31%' },
  { skill: 'Manuelles SEO',       drop: '-40%' },
]

function fmt(n: number) {
  if (n >= 100000) return `${(n / 1000).toFixed(0)}k`
  if (n >= 1000)   return `${(n / 1000).toFixed(0)}k`
  return n.toString()
}
function Shimmer({ h = 20, r = 8, w = '100%' }: { h?: number; r?: number; w?: string }) {
  return <div style={{ height: h, borderRadius: r, width: w, background: 'linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
}
function GlowDot({ color }: { color: string }) {
  return <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, animation: 'pulse 2s infinite', flexShrink: 0 }} />
}

export default function DACHDashboard() {
  const router    = useRouter()
  const { lang }  = useLanguage()
  const [profile,  setProfile]  = useState<{ full_name?: string; credits?: number; eu_credits?: number } | null>(null)
  const [loadingP, setLoadingP] = useState(true)
  const [dashTab,  setDashTab]  = useState<DashTab>('pulse')
  const [country,  setCountry]  = useState<Country>('de')
  const [hoveredCat, setHoveredCat] = useState<string | null>(null)
  const [mobSec,   setMobSec]   = useState<Record<string, boolean>>({})

  const t = (de: string, en: string) => lang === 'DE' ? de : en

  function toggleMob(id: string) { setMobSec(p => ({ ...p, [id]: !p[id] })) }
  function MobSection({ id, title, icon, children }: { id: string; title: string; icon: string; children: React.ReactNode }) {
    const open = !!mobSec[id]
    return (
      <div>
        <button className="mob-sec-hdr" onClick={() => toggleMob(id)}
          style={{ width: '100%', display: 'none', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', background: 'rgba(255,255,255,.04)', border: `1px solid ${border}`, borderRadius: open ? '16px 16px 0 0' : 16, color: txt1, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: open ? 0 : 8, transition: 'border-radius .2s' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 18 }}>{icon}</span>{title}</span>
          <span style={{ fontSize: 14, color: txt3, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
        </button>
        <div className={open ? 'mob-sec-body mob-sec-open' : 'mob-sec-body'}>{children}</div>
      </div>
    )
  }

  useEffect(() => {
    fetch('/api/user/profile').then(r => r.json()).then(setProfile).finally(() => setLoadingP(false))
  }, [])

  const hour      = new Date().getHours()
  const greeting  = lang === 'DE'
    ? (hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend')
    : (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening')
  const firstName = (profile?.full_name ?? '').split(' ')[0]
  const totalCredits = (profile?.credits ?? 0) + (profile?.eu_credits ?? 0)

  const kpi      = KPI_DATA[country]
  const sectors  = SECTOR_DATA[country]
  const macro    = MACRO_DATA[country]
  const salaries = SALARY_DATA[country]
  const maxCount = sectors[0]?.count ?? 1
  const meta     = COUNTRY_META[country]

  const DASH_TABS: { id: DashTab; label: string; labelDE: string; icon: string; color: string }[] = [
    { id: 'pulse', label: 'Market Pulse', labelDE: 'Marktpuls',  icon: '📊', color: cyan   },
    { id: 'ai',    label: 'AI Impact',    labelDE: 'KI-Impact',  icon: '🤖', color: purple },
  ]
  const COUNTRIES: { code: Country; flag: string; name: string }[] = [
    { code: 'de', flag: '🇩🇪', name: 'DE' },
    { code: 'ch', flag: '🇨🇭', name: 'CH' },
    { code: 'at', flag: '🇦🇹', name: 'AT' },
    { code: 'gb', flag: '🇬🇧', name: 'GB' },
  ]

  function searchJobs(q: string) {
    router.push(`/app/jobs?q=${encodeURIComponent(q)}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: "'DM Sans',sans-serif", color: txt1 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700;800&display=swap');
        @keyframes shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes glow     { 0%,100%{box-shadow:0 0 20px rgba(55,138,221,.15)} 50%{box-shadow:0 0 40px rgba(55,138,221,.35)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        * { box-sizing:border-box }
        .dash-page {
          background-color:${bg};
          background-image:
            linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),
            linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);
          background-size:48px 48px;
        }
        .dash-hero {
          background:linear-gradient(135deg,#0a1628 0%,#091420 60%,#0a0d1a 100%);
          padding:40px 28px 50px;
          position:relative;
          overflow:hidden;
          border-bottom:1px solid ${border};
        }
        .act-card {
          background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.08);
          border-radius:18px;
          padding:20px 14px;
          display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;
          cursor:pointer;transition:all .2s;
        }
        .act-card:hover {
          background:rgba(255,255,255,.08);
          border-color:rgba(55,138,221,.4);
          transform:translateY(-3px);
          box-shadow:0 12px 40px rgba(55,138,221,.12);
        }
        .kpi-grid   { display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px }
        .kpi-card   { background:${card};border:1px solid ${border};border-radius:16px;padding:20px;transition:all .2s;animation:fadeUp .4s ease both }
        .kpi-card:hover { background:${cardHov};border-color:${borderH} }
        .tab-nav    { display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:22px;background:rgba(255,255,255,.03);border:1px solid ${border};border-radius:16px;padding:6px }
        .tab-btn    { padding:13px 16px;border-radius:12px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;background:transparent;color:${txt2} }
        .tab-btn.active { font-weight:700;color:#fff }
        .macro-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px }
        .macro-card { background:${card};border:1px solid ${border};border-radius:14px;padding:16px 18px;transition:all .2s }
        .macro-card:hover { background:${cardHov};border-color:${borderH} }
        .cat-grid   { display:grid;grid-template-columns:repeat(3,1fr);gap:12px }
        .cat-card   { background:${card};border:1px solid ${border};border-radius:16px;padding:20px;cursor:pointer;transition:all .22s;position:relative;overflow:hidden }
        .salary-row { display:grid;grid-template-columns:160px 1fr 80px;gap:14px;align-items:center;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.05) }
        .ai-sector-grid { display:grid;grid-template-columns:repeat(2,1fr);gap:12px }
        .ai-card    { background:${card};border:1px solid ${border};border-radius:14px;padding:18px;transition:all .2s }
        .ai-card:hover { background:${cardHov} }
        .skill-grid { display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px }
        .dash-actions { display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:28px }
        .country-pill { transition:all .15s;cursor:pointer }
        .country-pill:hover { border-color:rgba(55,138,221,.5) !important }

        @media(max-width:900px){
          .dash-hero  { padding:28px 18px 38px!important }
          .dash-actions { grid-template-columns:repeat(2,1fr)!important }
          .kpi-grid   { grid-template-columns:repeat(2,1fr)!important }
          .macro-grid { grid-template-columns:repeat(2,1fr)!important }
          .cat-grid   { grid-template-columns:repeat(2,1fr)!important }
          .cat-card   { padding:14px!important }
          .ai-sector-grid { grid-template-columns:1fr!important }
          .skill-grid { grid-template-columns:1fr!important }
          .salary-row { grid-template-columns:130px 1fr 70px!important }
        }
        @media(max-width:600px){
          .tab-btn    { font-size:11px!important;padding:10px 8px!important;gap:5px!important }
          .kpi-grid   { grid-template-columns:repeat(2,1fr)!important;gap:10px!important }
          .macro-grid { grid-template-columns:repeat(2,1fr)!important }
          .cat-grid   { grid-template-columns:1fr 1fr!important;gap:8px!important }
          .cat-card   { padding:12px!important;border-radius:12px!important }
          .salary-row { grid-template-columns:1fr!important;gap:6px!important }
          .dash-actions { gap:8px!important }
          .act-card   { padding:14px 10px!important }
          .mob-sec-hdr { display:flex!important }
          .mob-sec-body { display:none;border:1px solid rgba(255,255,255,.08);border-top:none;border-radius:0 0 16px 16px;margin-bottom:10px;overflow:hidden }
          .mob-sec-body.mob-sec-open { display:block }
          .mob-sec-body > div:first-child { border-radius:0!important;border:none!important;margin-bottom:0!important }
          .mob-sec-body > .kpi-grid { padding:14px!important;margin-bottom:0!important }
        }
        @media(max-width:360px){
          .cat-grid { grid-template-columns:1fr!important }
          .kpi-grid { grid-template-columns:1fr 1fr!important }
        }
      `}</style>

      {/* ── HERO ─────────────────────────────────────── */}
      <div className="dash-hero">
        {/* Ambient glows */}
        <div style={{ position: 'absolute', top: -120, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(55,138,221,.12) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -140, left: -100, width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,.08) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '30%', left: '40%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,.07) 0%,transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <GlowDot color={emerald} />
                <span style={{ fontSize: 11, color: txt3, letterSpacing: .8, textTransform: 'uppercase' }}>
                  {new Date().toLocaleDateString(lang === 'DE' ? 'de-DE' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <h1 style={{ margin: 0, fontFamily: "'Outfit',sans-serif", fontSize: 'clamp(22px,5vw,30px)', fontWeight: 800, color: '#fff', letterSpacing: -.5 }}>
                {greeting}{firstName ? `, ${firstName}` : ''} 👋
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: txt2 }}>
                {t('Dein DACH-Karriere-Dashboard', 'Your DACH career intelligence platform')}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Country selector */}
              <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,.04)', border: `1px solid ${border}`, borderRadius: 12, padding: 6 }}>
                {COUNTRIES.map(c => (
                  <button key={c.code} className="country-pill" onClick={() => setCountry(c.code)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${country === c.code ? blue : 'transparent'}`, background: country === c.code ? blue + '20' : 'transparent', color: country === c.code ? '#fff' : txt2, fontSize: 12, fontWeight: country === c.code ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                    {c.flag} {c.name}
                  </button>
                ))}
              </div>

              {/* Credits */}
              {!loadingP && profile && (
                <div onClick={() => router.push('/app/account')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(55,138,221,.1)', border: '1px solid rgba(55,138,221,.25)', borderRadius: 14, padding: '10px 18px', cursor: 'pointer', transition: 'all .2s', animation: 'glow 3s infinite' }}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  <div>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, color: blue, lineHeight: 1 }}>{totalCredits}</div>
                    <div style={{ fontSize: 10, color: `rgba(55,138,221,.5)`, letterSpacing: .4 }}>{t('CREDITS', 'CREDITS')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="dash-actions">
            {([
              { icon: '🔍', label: t('Jobs suchen',     'Find Jobs'),      sub: t('Live-Stellen DACH', 'Browse DACH openings'),      href: '/app/jobs',         accent: blue   },
              { icon: '🎯', label: t('Career Scan',     'Career Scan'),    sub: t('Profil analysieren','Analyse your profile'),      href: '/app/career-scan',  accent: cyan   },
              { icon: '📄', label: t('Lebenslauf',      'Build CV'),       sub: t('KI-optimiert',     'AI-tailored for any role'),   href: '/app/cv-builder',   accent: emerald },
              { icon: '✉️', label: t('Anschreiben',     'Cover Letter'),   sub: t('In deiner Stimme', 'In your voice, in minutes'),  href: '/app/cover-letter', accent: purple },
            ] as const).map(a => (
              <div key={a.href} className="act-card" onClick={() => router.push(a.href)}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${a.accent}20`, border: `1px solid ${a.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{a.icon}</div>
                <div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: '#fff' }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: txt3, marginTop: 2 }}>{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────── */}
      <div className="dash-page" style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 80px' }}>

        {/* KPI row */}
        <MobSection id="kpi" title={t('Markt-Snapshot', 'Market Snapshot')} icon="📊">
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            {kpi.map(k => (
              <div key={k.label} className="kpi-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: txt3, letterSpacing: .6, textTransform: 'uppercase' }}>{k.label}</span>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `${k.color}15`, border: `1px solid ${k.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{k.icon}</div>
                </div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: k.color, lineHeight: 1, letterSpacing: -.5 }}>{k.value}</div>
                <div style={{ fontSize: 11, color: txt3, marginTop: 6 }}>{k.sub}</div>
              </div>
            ))}
          </div>
        </MobSection>

        {/* Tab nav */}
        <div className="tab-nav">
          {DASH_TABS.map(t2 => {
            const active = dashTab === t2.id
            return (
              <button key={t2.id} className={`tab-btn${active ? ' active' : ''}`} onClick={() => setDashTab(t2.id)}
                style={{ background: active ? `linear-gradient(135deg,${t2.color}20,${t2.color}08)` : undefined, color: active ? '#fff' : txt2, fontWeight: active ? 700 : 400, boxShadow: active ? `inset 0 0 0 1px ${t2.color}50,0 4px 20px ${t2.color}10` : undefined }}>
                <span style={{ fontSize: 17 }}>{t2.icon}</span>
                {lang === 'DE' ? t2.labelDE : t2.label}
              </button>
            )
          })}
        </div>

        {/* ══ TAB 1: MARKET PULSE ══ */}
        {dashTab === 'pulse' && (
          <div style={{ animation: 'fadeUp .3s ease both' }}>

            {/* Macro indicators */}
            <MobSection id="macro" title={t(`${meta.flag} ${meta.name} Makro`, `${meta.flag} ${meta.name} Macro`)} icon="🌐">
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 20, padding: '22px 26px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <GlowDot color={cyan} />
                  <div>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: '#fff' }}>
                      {meta.flag} {meta.name} — {t('Makro-Indikatoren', 'Macro Indicators')}
                    </div>
                    <div style={{ fontSize: 11, color: txt3, marginTop: 2 }}>Eurostat / ONS · {t('aktualisiert jährlich', 'updated annually')}</div>
                  </div>
                </div>
                <div className="macro-grid">
                  {macro.map(ind => {
                    const good = ind.label === 'Unemployment Rate' ? ind.trend === 'down' : ind.trend === 'up'
                    const tc   = ind.trend === 'flat' ? txt3 : good ? emerald : red
                    const arr  = ind.trend === 'up' ? '↑' : ind.trend === 'down' ? '↓' : '→'
                    return (
                      <div key={ind.label} className="macro-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontSize: 20 }}>{ind.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: tc, background: `${tc}18`, padding: '3px 8px', borderRadius: 20 }}>{arr}</span>
                        </div>
                        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800, color: tc, lineHeight: 1 }}>
                          {ind.value}{ind.unit}
                        </div>
                        <div style={{ fontSize: 11, color: txt2, marginTop: 5 }}>{ind.label}</div>
                        <div style={{ fontSize: 10, color: txt3, marginTop: 2 }}>{ind.year}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </MobSection>

            {/* Sector heatmap */}
            <MobSection id="sectors" title={t('Job-Markt nach Branche', 'Job Market by Sector')} icon={meta.flag}>
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 20, padding: '22px 26px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <GlowDot color={blue} />
                  <div>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: '#fff' }}>
                      {meta.flag} {t('Job-Markt nach Branche', 'Live Job Market by Sector')} — {meta.name}
                    </div>
                    <div style={{ fontSize: 11, color: txt3, marginTop: 2 }}>Adzuna {meta.name} · {t('klicken zum Suchen', 'click to search')}</div>
                  </div>
                </div>
                <div className="cat-grid">
                  {sectors.map((cat, i) => {
                    const pct    = Math.round((cat.count / maxCount) * 100)
                    const isHov  = hoveredCat === cat.label
                    const isHot  = i < 2
                    return (
                      <div key={cat.label} className="cat-card"
                        style={{ borderColor: isHov ? cat.color : border, boxShadow: isHov ? `0 0 30px ${cat.color}20,inset 0 0 30px ${cat.color}06` : 'none', background: isHov ? `${cat.color}06` : card, animation: `fadeUp .4s ${i * .06}s ease both` }}
                        onMouseEnter={() => setHoveredCat(cat.label)}
                        onMouseLeave={() => setHoveredCat(null)}
                        onClick={() => searchJobs(cat.label)}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${cat.color},${cat.color}33)`, borderRadius: '16px 16px 0 0', opacity: isHov ? 1 : .4 }} />
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                          <div style={{ width: 42, height: 42, borderRadius: 12, background: `${cat.color}18`, border: `1px solid ${cat.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                            {cat.emoji}
                          </div>
                          {isHot && <span style={{ fontSize: 10, fontWeight: 700, color: red, background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.2)', padding: '3px 8px', borderRadius: 20 }}>🔥 HOT</span>}
                          {isHov && !isHot && <span style={{ fontSize: 11, fontWeight: 700, color: cat.color }}>Search →</span>}
                        </div>
                        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 28, fontWeight: 800, color: cat.color, lineHeight: 1, marginBottom: 4 }}>{fmt(cat.count)}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: txt1, marginBottom: 12 }}>{cat.label}</div>
                        <div style={{ height: 3, borderRadius: 4, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,${cat.color}88,${cat.color})`, borderRadius: 4, boxShadow: `0 0 8px ${cat.color}60`, transition: 'width .8s ease' }} />
                        </div>
                        <div style={{ fontSize: 10, color: txt3, marginTop: 5 }}>{pct}% {t('des Top-Sektors', 'of top sector')}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: 14, fontSize: 11, color: txt3 }}>
                  ⓘ {t('Daten von', 'Data from')} <a href="https://www.adzuna.de" target="_blank" rel="noopener noreferrer" style={{ color: txt2 }}>Adzuna</a> · {t('öffentlich gelistete Stellen · zu Informationszwecken', 'publicly listed postings only · informational purposes')}
                </div>
              </div>
            </MobSection>

            {/* Salary guide */}
            <MobSection id="salary" title={t('Gehaltsguide 2026', 'Salary Guide 2026')} icon="💸">
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 20, padding: '22px 26px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <GlowDot color={emerald} />
                  <div>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: '#fff' }}>
                      💸 {meta.flag} {t('Gehaltsguide 2026', 'Salary Guide 2026')}
                    </div>
                    <div style={{ fontSize: 11, color: txt3, marginTop: 2 }}>{meta.salaryNote}</div>
                  </div>
                </div>
                {salaries.map((row, i) => {
                  const maxVal  = country === 'ch' ? 200 : 150
                  const minPct  = (row.min / maxVal) * 100
                  const rangePct = ((row.max - row.min) / maxVal) * 100
                  const avgPct  = (row.avg / maxVal) * 100
                  return (
                    <div key={row.role} className="salary-row" style={{ borderBottomColor: i === salaries.length - 1 ? 'transparent' : 'rgba(255,255,255,.05)' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: txt1 }}>{row.role}</div>
                      <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,.06)', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: `${minPct}%`, width: `${rangePct}%`, height: '100%', background: `linear-gradient(90deg,${blue}50,${blue})`, borderRadius: 6, boxShadow: `0 0 10px ${blue}40` }} />
                        <div style={{ position: 'absolute', left: `${avgPct}%`, top: 0, width: 2, height: '100%', background: '#fff', borderRadius: 2, transform: 'translateX(-50%)', boxShadow: '0 0 6px rgba(255,255,255,.8)' }} />
                      </div>
                      <div style={{ textAlign: 'right' as const }}>
                        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: blue }}>{meta.currency === 'GBP' ? '£' : meta.currency === 'CHF' ? 'Fr.'  : '€'}{row.avg}k</span>
                        <span style={{ fontSize: 10, color: txt3, display: 'block' }}>{row.min}–{row.max}k</span>
                      </div>
                    </div>
                  )
                })}
                <div style={{ marginTop: 14, fontSize: 11, color: txt3 }}>
                  ⓘ {t('Balken = Spanne · weißer Marker = Median · 2025–26', 'Bar = range · white marker = median · 2025–26')}
                </div>
              </div>
            </MobSection>
          </div>
        )}

        {/* ══ TAB 2: AI IMPACT ══ */}
        {dashTab === 'ai' && (
          <div style={{ animation: 'fadeUp .3s ease both' }}>

            {/* Big 3 stats */}
            <MobSection id="aistats" title={t('KI-Markt DACH 2026', 'AI Jobs Impact 2026')} icon="🚀">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16 }}>
                {[
                  { icon: '🚀', label: t('Neue KI-Stellen in DACH (2025)', 'New AI roles created in DACH (2025)'), value: '680k+', color: emerald },
                  { icon: '⚠️', label: t('Gefährdete Jobs bis 2030',       'Jobs at risk from automation by 2030'), value: '4.1M',  color: red    },
                  { icon: '📈', label: t('KI-Skill-Nachfrage YoY',          'AI skill demand growth YoY'),          value: '+290%', color: purple },
                ].map(s => (
                  <div key={s.label} style={{ background: card, border: `1px solid ${s.color}20`, borderRadius: 18, padding: '24px', textAlign: 'center', boxShadow: `0 0 30px ${s.color}08` }}>
                    <div style={{ fontSize: 30, marginBottom: 10 }}>{s.icon}</div>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 8, textShadow: `0 0 20px ${s.color}60` }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: txt2, lineHeight: 1.5 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </MobSection>

            {/* Sector disruption */}
            <MobSection id="disruption" title={t('KI-Disruption nach Branche', 'AI Disruption by Sector')} icon="🔬">
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 20, padding: '22px 26px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <GlowDot color={purple} />
                  <div>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: '#fff' }}>
                      🔬 {t('KI-Disruption nach Branche', 'AI Disruption by Sector')}
                    </div>
                    <div style={{ fontSize: 11, color: txt3, marginTop: 2 }}>WEF, McKinsey & Goldman Sachs · DACH {t('Prognosen', 'projections')}</div>
                  </div>
                </div>
                <div className="ai-sector-grid">
                  {AI_SECTOR_IMPACT.map((s, i) => {
                    const badge = s.impact === 'creating' ? t('✅ Wächst', '✅ Growing') : s.impact === 'disrupting' ? t('⚠️ Disruption', '⚠️ Disrupting') : t('⚡ Gemischt', '⚡ Mixed')
                    return (
                      <div key={s.sector} className="ai-card" style={{ borderColor: `${s.color}20`, animation: `fadeUp .3s ${i * .05}s ease both` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>{s.emoji}</span>
                            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: txt1 }}>{s.sector}</span>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: `${s.color}15`, padding: '3px 9px', borderRadius: 20, flexShrink: 0 }}>{badge}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${s.score}%`, height: '100%', background: `linear-gradient(90deg,${s.color}60,${s.color})`, borderRadius: 4, boxShadow: `0 0 10px ${s.color}50`, transition: 'width 1s ease' }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: s.color, minWidth: 32 }}>{s.score}%</span>
                        </div>
                        <div style={{ fontSize: 12, color: txt2, lineHeight: 1.45 }}>{s.headline}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </MobSection>

            {/* Skills */}
            <MobSection id="skills" title={t('Skill-Nachfrage-Signale', 'Skill Demand Signals')} icon="📡">
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 20, padding: '22px 26px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <GlowDot color={cyan} />
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: '#fff' }}>
                    📡 {t('Skill-Nachfrage-Signale', 'Skill Demand Signals')}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: txt3, marginBottom: 4 }}>{t('Welche Skills lernen · welche abbauen', 'Which skills to learn · which to move away from')}</div>
                <div className="skill-grid">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '9px 13px', background: `${emerald}10`, border: `1px solid ${emerald}20`, borderRadius: 10 }}>
                      <span style={{ fontSize: 15 }}>🚀</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: emerald }}>{t('Steigende Skills', 'Rising Skills')}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {RISING_SKILLS.map((s, i) => (
                        <div key={s.skill} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 10, background: i % 2 === 0 ? 'rgba(255,255,255,.03)' : 'transparent', border: `1px solid ${border}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {s.hot && <span style={{ fontSize: 11, animation: 'pulse 2s infinite' }}>🔥</span>}
                            <span style={{ fontSize: 13, color: s.hot ? txt1 : txt2, fontWeight: s.hot ? 600 : 400 }}>{s.skill}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: emerald, background: `${emerald}15`, padding: '2px 8px', borderRadius: 8, flexShrink: 0 }}>{s.growth}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '9px 13px', background: `${red}10`, border: `1px solid ${red}20`, borderRadius: 10 }}>
                      <span style={{ fontSize: 15 }}>⚠️</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: red }}>{t('Sinkende Nachfrage', 'Declining Demand')}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {DECLINING_SKILLS.map((s, i) => (
                        <div key={s.skill} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 10, background: i % 2 === 0 ? 'rgba(255,255,255,.03)' : 'transparent', border: `1px solid ${border}` }}>
                          <span style={{ fontSize: 13, color: txt2 }}>{s.skill}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: red, background: `${red}15`, padding: '2px 8px', borderRadius: 8, flexShrink: 0 }}>{s.drop}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 14, padding: '14px 16px', background: `${purple}10`, border: `1px solid ${purple}25`, borderRadius: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: purple, marginBottom: 5 }}>💡 {t('Skill-Gap analysieren', 'See your skill gap')}</div>
                      <div style={{ fontSize: 12, color: txt2, lineHeight: 1.5, marginBottom: 10 }}>
                        {t('Lade deinen Lebenslauf hoch für einen Career Scan, um zu sehen wie du im Markt stehst.', 'Upload your CV for a Career Scan to see how you stack up against current market demand.')}
                      </div>
                      <button onClick={() => router.push('/app/career-scan')} style={{ padding: '8px 18px', borderRadius: 9, background: `linear-gradient(135deg,${purple},#6d28d9)`, color: '#fff', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: `0 4px 16px ${purple}40` }}>
                        {t('Career Scan starten →', 'Start Career Scan →')}
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 16, fontSize: 11, color: txt3 }}>
                  ⓘ {t('Trenddaten aus Adzuna DACH & LinkedIn Stellenanzeigen · 2024–26', 'Trend data from Adzuna DACH & LinkedIn job postings · 2024–26')}
                </div>
              </div>
            </MobSection>
          </div>
        )}

        {/* Zero credits alert */}
        {!loadingP && totalCredits === 0 && (
          <div style={{ marginTop: 16, padding: '16px 22px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: red }}>⛔ {t('Keine Credits mehr', 'No credits remaining')}</div>
              <div style={{ fontSize: 12, color: 'rgba(239,68,68,.7)', marginTop: 2 }}>{t('Jetzt aufladen um KI-Features weiter zu nutzen', 'Top up to continue using AI features')}</div>
            </div>
            <button onClick={() => router.push('/app/account')} style={{ padding: '10px 22px', borderRadius: 10, background: red, color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: `0 4px 16px ${red}40` }}>
              {t('Jetzt aufladen', 'Top Up Now')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
