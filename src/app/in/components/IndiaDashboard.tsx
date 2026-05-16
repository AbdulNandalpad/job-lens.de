'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MarketSnapshot } from '@/app/api/india/market-snapshot/route'
import type { NewsArticle } from '@/app/api/india/news-insights/route'
import type { WorldIndicator } from '@/app/api/india/world-indicators/route'

const saffron = '#FF9933'
const green   = '#138808'
const navy    = '#042C53'
const white   = '#FFFFFF'
const purple  = '#7c3aed'

type DashTab = 'pulse' | 'ai' | 'news'
type NewsTab = 'all' | 'ai' | 'hiring' | 'market'

interface UserProfile {
  full_name: string
  credits: number
  usage: { action: string; credits_used: number; created_at: string }[]
}

const CATEGORY_SEARCH: Record<string, string> = {
  'IT & Software':    'software developer',
  'Engineering':      'engineer',
  'Finance':          'finance accountant',
  'Sales & Marketing':'sales marketing',
  'Healthcare':       'healthcare medical',
  'HR & Recruitment': 'human resources recruiter',
}
const CATEGORY_EMOJI: Record<string, string> = {
  'IT & Software':    '💻',
  'Engineering':      '⚙️',
  'Finance':          '💰',
  'Sales & Marketing':'📣',
  'Healthcare':       '🏥',
  'HR & Recruitment': '👥',
}

// AI Impact data — curated from WEF / McKinsey / Goldman Sachs research
const AI_SECTOR_IMPACT = [
  { sector: 'IT & Software',     emoji: '💻', impact: 'creating',   score: 88, headline: 'AI engineering roles up 240% YoY',      color: '#22c55e' },
  { sector: 'Data & Analytics',  emoji: '📊', impact: 'creating',   score: 82, headline: 'Data scientists & MLOps in huge demand', color: '#22c55e' },
  { sector: 'Healthcare',        emoji: '🏥', impact: 'creating',   score: 70, headline: 'Health-tech and AI diagnostics booming',  color: '#22c55e' },
  { sector: 'Finance & Fintech', emoji: '💰', impact: 'mixed',      score: 55, headline: 'Analysts valued, clerks being automated', color: '#f59e0b' },
  { sector: 'Sales & Marketing', emoji: '📣', impact: 'mixed',      score: 48, headline: 'AI copilots changing the role entirely',  color: '#f59e0b' },
  { sector: 'BPO / Support',     emoji: '🎧', impact: 'disrupting', score: 76, headline: 'Routine tasks heavily automated by LLMs', color: '#ef4444' },
  { sector: 'Manufacturing',     emoji: '🏭', impact: 'disrupting', score: 62, headline: 'Robotics replacing assembly line workers', color: '#ef4444' },
  { sector: 'Content / Media',   emoji: '✍️', impact: 'mixed',      score: 50, headline: 'GenAI creating and killing roles simultaneously', color: '#f59e0b' },
]

const RISING_SKILLS = [
  { skill: 'Generative AI',      growth: '+312%', hot: true  },
  { skill: 'LLM / RAG Systems',  growth: '+280%', hot: true  },
  { skill: 'MLOps',              growth: '+195%', hot: true  },
  { skill: 'Prompt Engineering', growth: '+170%', hot: false },
  { skill: 'Cloud (AWS/GCP)',    growth: '+90%',  hot: false },
  { skill: 'Data Engineering',   growth: '+85%',  hot: false },
  { skill: 'Kubernetes',         growth: '+72%',  hot: false },
  { skill: 'Python',             growth: '+65%',  hot: false },
]

const DECLINING_SKILLS = [
  { skill: 'Manual Testing',   drop: '-48%' },
  { skill: 'Data Entry',       drop: '-61%' },
  { skill: 'Basic Excel Ops',  drop: '-39%' },
  { skill: 'Legacy COBOL',     drop: '-55%' },
  { skill: 'Cold Calling',     drop: '-33%' },
  { skill: 'Manual SEO',       drop: '-44%' },
]

const SALARY_DATA = [
  { role: 'ML / AI Engineer',    min: 12, max: 45, avg: 24 },
  { role: 'Cloud Architect',     min: 15, max: 50, avg: 28 },
  { role: 'Product Manager',     min: 12, max: 40, avg: 22 },
  { role: 'Data Scientist',      min: 8,  max: 35, avg: 18 },
  { role: 'Backend Engineer',    min: 7,  max: 30, avg: 16 },
  { role: 'DevOps Engineer',     min: 8,  max: 28, avg: 15 },
  { role: 'Frontend Developer',  min: 5,  max: 22, avg: 11 },
  { role: 'Business Analyst',    min: 6,  max: 20, avg: 11 },
]

const NEWS_CAT_COLOR: Record<string, string> = { ai: purple, hiring: '#ef4444', market: '#0ea5e9' }
const NEWS_CAT_LABEL: Record<string, string>  = { ai: '🤖 AI', hiring: '📉 Hiring', market: '🏢 Market' }
const NEWS_TAB_LABELS: Record<NewsTab, string> = { all: '📰 All', ai: '🤖 AI Impact', hiring: '📉 Hiring & Firing', market: '🏢 Market News' }

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)     return 'just now'
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}
function fmt(n: number) {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `${(n / 1000).toFixed(1)}k`
  return n > 0 ? n.toString() : '—'
}
function Shimmer({ h = 20, r = 8, w = '100%' }: { h?: number; r?: number; w?: string }) {
  return <div style={{ height: h, borderRadius: r, width: w, background: 'linear-gradient(90deg,#f0f4fa 25%,#e4eaf4 50%,#f0f4fa 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
}

export default function IndiaDashboard() {
  const router = useRouter()
  const [profile,    setProfile]    = useState<UserProfile | null>(null)
  const [market,     setMarket]     = useState<MarketSnapshot | null>(null)
  const [news,       setNews]       = useState<NewsArticle[]>([])
  const [indicators, setIndicators] = useState<WorldIndicator[]>([])
  const [loadingP,   setLoadingP]   = useState(true)
  const [loadingM,   setLoadingM]   = useState(true)
  const [loadingN,   setLoadingN]   = useState(true)
  const [loadingI,   setLoadingI]   = useState(true)
  const [dashTab,    setDashTab]    = useState<DashTab>('pulse')
  const [newsTab,    setNewsTab]    = useState<NewsTab>('all')
  const [hoveredCat, setHoveredCat] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/user/profile').then(r => r.json()).then(setProfile).finally(() => setLoadingP(false))
    fetch('/api/india/market-snapshot').then(r => r.json()).then(setMarket).finally(() => setLoadingM(false))
    fetch('/api/india/news-insights').then(r => r.json()).then(d => setNews(d.articles ?? [])).finally(() => setLoadingN(false))
    fetch('/api/india/world-indicators').then(r => r.json()).then(setIndicators).finally(() => setLoadingI(false))
  }, [])

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  function searchJobs(q: string, location?: string) {
    router.push(`/in/jobs?q=${encodeURIComponent(q)}${location ? `&location=${encodeURIComponent(location)}` : ''}`)
  }

  const totalJobs = market?.categories.reduce((s, c) => s + c.count, 0) ?? 0
  const topCat    = market?.categories[0]
  const topCity   = market?.topCities[0]
  const topRole   = market?.trendingRoles[0]
  const maxCat    = topCat?.count ?? 1
  const maxSalary = 50

  const DASH_TABS: { id: DashTab; label: string; icon: string }[] = [
    { id: 'pulse', label: 'Market Pulse',   icon: '📊' },
    { id: 'ai',    label: 'AI Impact',      icon: '🤖' },
    { id: 'news',  label: 'News & Signals', icon: '📰' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4fa', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700;800&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.5} }

        .dash-hero     { background:linear-gradient(135deg,${navy} 0%,#0e2d4a 55%,#0a3a28 100%); padding:36px 28px 44px; position:relative; overflow:hidden; }
        .dash-actions  { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-top:28px; }
        .act-card      { background:rgba(255,255,255,.07); border:1.5px solid rgba(255,255,255,.1); border-radius:16px; padding:20px 14px; display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center; cursor:pointer; transition:all .18s; }
        .act-card:hover{ background:rgba(255,153,51,.12); border-color:${saffron}; transform:translateY(-2px); box-shadow:0 8px 24px rgba(255,153,51,.2); }

        .kpi-grid      { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
        .macro-grid    { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
        .cat-grid      { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .cat-card      { background:#fff; border:1.5px solid #e4eaf4; border-radius:16px; padding:20px; cursor:pointer; transition:all .2s; position:relative; overflow:hidden; }
        .cat-card:hover{ transform:translateY(-3px); }

        .ai-grid       { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
        .skill-grid    { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:20px; }
        .salary-bar    { display:grid; grid-template-columns:160px 1fr 70px; gap:12px; align-items:center; padding:10px 0; border-bottom:1px solid #f1f5f9; }

        .news-grid     { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:16px; }
        .news-card     { background:#fff; border:1.5px solid #e4eaf4; border-radius:16px; padding:18px; display:flex; flex-direction:column; gap:10px; transition:all .18s; cursor:pointer; text-decoration:none; }
        .news-card:hover{ border-color:${saffron}; box-shadow:0 6px 24px rgba(255,153,51,.12); transform:translateY(-2px); }

        .tab-nav       { display:flex; gap:0; background:#fff; border:1.5px solid #e4eaf4; border-radius:14px; padding:5px; margin-bottom:20px; box-shadow:0 2px 10px rgba(4,44,83,.05); }
        .tab-btn       { flex:1; padding:11px 16px; border-radius:10px; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; transition:all .18s; display:flex; align-items:center; justify-content:center; gap:7px; }

        @media(max-width:900px){
          .dash-hero    { padding:28px 18px 36px!important; }
          .dash-actions { grid-template-columns:repeat(2,1fr)!important; }
          .kpi-grid     { grid-template-columns:repeat(2,1fr)!important; }
          .macro-grid   { grid-template-columns:repeat(2,1fr)!important; }
          .cat-grid     { grid-template-columns:repeat(2,1fr)!important; }
          .cat-card     { padding:14px!important; }
          .ai-grid      { grid-template-columns:1fr!important; }
          .skill-grid   { grid-template-columns:1fr!important; }
          .news-grid    { grid-template-columns:repeat(2,1fr)!important; }
          .salary-bar   { grid-template-columns:120px 1fr 60px!important; }
        }
        @media(max-width:600px){
          .tab-nav      { gap:4px!important; }
          .tab-btn      { padding:9px 8px!important; font-size:11px!important; }
          .kpi-grid     { grid-template-columns:repeat(2,1fr)!important; gap:10px!important; }
          .macro-grid   { grid-template-columns:repeat(2,1fr)!important; }
          .cat-grid     { grid-template-columns:1fr 1fr!important; gap:8px!important; }
          .cat-card     { padding:12px!important; border-radius:12px!important; }
          .news-grid    { grid-template-columns:1fr!important; }
          .salary-bar   { grid-template-columns:1fr!important; gap:6px!important; }
          .dash-actions { gap:8px!important; }
          .act-card     { padding:14px 10px!important; }
        }
        @media(max-width:360px){
          .cat-grid     { grid-template-columns:1fr!important; }
          .kpi-grid     { grid-template-columns:1fr 1fr!important; }
        }
      `}</style>

      {/* ── HERO ── */}
      <div className="dash-hero">
        <div style={{ position:'absolute', top:-80, right:-60, width:320, height:320, borderRadius:'50%', background:`radial-gradient(circle,${saffron}20 0%,transparent 70%)`, pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-100, left:-80, width:360, height:360, borderRadius:'50%', background:`radial-gradient(circle,${green}15 0%,transparent 70%)`, pointerEvents:'none' }} />

        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
            <div>
              <p style={{ margin:'0 0 4px', fontSize:12, color:'rgba(255,255,255,.45)', letterSpacing:.6 }}>
                {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
              </p>
              <h1 style={{ margin:0, fontFamily:"'Outfit',sans-serif", fontSize:'clamp(20px,5vw,28px)', fontWeight:800, color:white }}>
                {greeting}{firstName ? `, ${firstName}` : ''} 👋
              </h1>
              <p style={{ margin:'6px 0 0', fontSize:13, color:'rgba(255,255,255,.5)' }}>Your India career intelligence platform</p>
            </div>
            {!loadingP && profile && (
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <div onClick={() => router.push('/in/account')} style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,153,51,.15)', border:'1px solid rgba(255,153,51,.3)', borderRadius:12, padding:'10px 16px', cursor:'pointer' }}>
                  <span style={{ fontSize:18 }}>⚡</span>
                  <div>
                    <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:20, fontWeight:800, color:saffron, lineHeight:1 }}>{profile.credits}</div>
                    <div style={{ fontSize:10, color:'rgba(255,153,51,.6)' }}>credits</div>
                  </div>
                </div>
                {profile.credits <= 3 && (
                  <button onClick={() => router.push('/in/account')} style={{ padding:'10px 18px', borderRadius:10, background:`linear-gradient(135deg,${saffron},#e67300)`, color:white, fontSize:12, fontWeight:700, border:'none', cursor:'pointer', boxShadow:'0 4px 16px rgba(255,153,51,.4)' }}>
                    Top Up ₹149+
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="dash-actions">
            {([
              { icon:'🔍', label:'Find Jobs',    sub:'Browse live openings',      href:'/in/jobs',         accent:saffron },
              { icon:'📄', label:'Build CV',     sub:'AI-tailored for any role',  href:'/in/cv-builder',   accent:'#378ADD' },
              { icon:'✉️', label:'Cover Letter', sub:'In your voice, in minutes', href:'/in/cover-letter', accent:green },
              { icon:'📊', label:'ATS Scan',     sub:'Score your CV instantly',   href:'/in/career-scan',  accent:purple },
            ] as const).map(a => (
              <div key={a.label} className="act-card" onClick={() => router.push(a.href)}>
                <div style={{ width:46, height:46, borderRadius:14, background:`${a.accent}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{a.icon}</div>
                <div>
                  <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:14, fontWeight:700, color:white }}>{a.label}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:2 }}>{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 20px 60px' }}>

        {/* KPI row */}
        <div className="kpi-grid">
          {[
            { label:'Open Roles',      value: loadingM ? null : fmt(totalJobs),                          sub:'across all sectors',       color:saffron,   icon:'📋' },
            { label:'Hottest Sector',  value: loadingM ? null : (topCat?.label ?? '—'),                  sub:`${fmt(topCat?.count??0)} listings`,  color:'#378ADD', icon:'🔥' },
            { label:'Top City',        value: loadingM ? null : (topCity?.city ?? '—'),                  sub:`${fmt(topCity?.count??0)} openings`,  color:green,     icon:'📍' },
            { label:'Most In-Demand',  value: loadingM ? null : (topRole?.title?.split(' ')[0] ?? '—'),  sub:'trending role right now',  color:purple,    icon:'⭐' },
          ].map(k => (
            <div key={k.label} style={{ background:white, border:'1.5px solid #e4eaf4', borderRadius:16, padding:'18px 20px', boxShadow:'0 2px 10px rgba(4,44,83,.05)', animation:'fadeUp .4s ease both' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:11, fontWeight:600, color:'#94a3b8', letterSpacing:.4 }}>{k.label.toUpperCase()}</span>
                <span style={{ fontSize:18 }}>{k.icon}</span>
              </div>
              {k.value === null ? <Shimmer h={28} r={6} w="70%" /> : <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:22, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>}
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:6 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── TAB NAV ── */}
        <div className="tab-nav">
          {DASH_TABS.map(t => {
            const active = dashTab === t.id
            const accent = t.id === 'pulse' ? saffron : t.id === 'ai' ? purple : '#0ea5e9'
            return (
              <button key={t.id} className="tab-btn" onClick={() => setDashTab(t.id)}
                style={{ background: active ? `${accent}12` : 'transparent', color: active ? accent : '#64748b', fontWeight: active ? 700 : 400, boxShadow: active ? `inset 0 0 0 1.5px ${accent}40` : 'none' }}>
                <span style={{ fontSize:16 }}>{t.icon}</span>
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ══════════════ TAB 1: MARKET PULSE ══════════════ */}
        {dashTab === 'pulse' && (
          <div style={{ animation:'fadeUp .35s ease both' }}>

            {/* Macro indicators — World Bank */}
            <div style={{ background:white, border:'1.5px solid #e4eaf4', borderRadius:18, padding:'20px 24px', marginBottom:16, boxShadow:'0 2px 10px rgba(4,44,83,.05)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:8 }}>
                <div>
                  <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:700, color:navy }}>🌍 India Macro Indicators</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>Source: World Bank · updated annually</div>
                </div>
              </div>
              <div className="macro-grid">
                {loadingI ? [1,2,3,4].map(i => <Shimmer key={i} h={72} r={12} />) :
                  indicators.map(ind => {
                    const isGood = (ind.label === 'Unemployment Rate' || ind.label === 'Youth Unemployment') ? ind.trend === 'down' : ind.trend === 'up'
                    const trendColor = ind.trend === 'flat' ? '#94a3b8' : isGood ? green : '#ef4444'
                    const trendArrow = ind.trend === 'up' ? '↑' : ind.trend === 'down' ? '↓' : '→'
                    return (
                      <div key={ind.label} style={{ background:'#f8fafc', borderRadius:12, padding:'14px 16px', border:'1px solid #edf1f6' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                          <span style={{ fontSize:18 }}>{ind.icon}</span>
                          <span style={{ fontSize:13, fontWeight:700, color:trendColor }}>{trendArrow}</span>
                        </div>
                        <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:22, fontWeight:800, color:navy, lineHeight:1 }}>
                          {ind.value !== null ? `${ind.value}${ind.unit}` : '—'}
                        </div>
                        <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>{ind.label}</div>
                        {ind.year && <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{ind.year} data</div>}
                      </div>
                    )
                  })
                }
              </div>
            </div>

            {/* Sector heatmap */}
            <div style={{ background:white, border:'1.5px solid #e4eaf4', borderRadius:18, padding:'22px 24px', marginBottom:16, boxShadow:'0 2px 10px rgba(4,44,83,.05)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:8 }}>
                <div>
                  <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:700, color:navy }}>🇮🇳 Job Market by Sector</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>Click any sector to browse live jobs · data from Adzuna · refreshed every 4h</div>
                </div>
              </div>
              {loadingM ? (
                <div className="cat-grid">{[1,2,3,4,5,6].map(i => <Shimmer key={i} h={120} r={14} />)}</div>
              ) : (
                <div className="cat-grid">
                  {(market?.categories ?? []).map((cat, i) => {
                    const pct    = Math.round((cat.count / maxCat) * 100)
                    const isHov  = hoveredCat === cat.label
                    const isHot  = i < 2
                    return (
                      <div key={cat.label} className="cat-card"
                        style={{ borderColor: isHov ? cat.color : '#e4eaf4', boxShadow: isHov ? `0 8px 28px ${cat.color}25` : '0 2px 8px rgba(4,44,83,.04)', transform: isHov ? 'translateY(-3px)' : 'none', animation:`fadeUp .4s ${i*.06}s ease both` }}
                        onMouseEnter={() => setHoveredCat(cat.label)} onMouseLeave={() => setHoveredCat(null)}
                        onClick={() => searchJobs(CATEGORY_SEARCH[cat.label] ?? cat.label)}>
                        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${cat.color},${cat.color}55)`, borderRadius:'16px 16px 0 0' }} />
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                          <div style={{ width:40, height:40, borderRadius:12, background:`${cat.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                            {CATEGORY_EMOJI[cat.label] ?? '💼'}
                          </div>
                          {isHot && <span style={{ fontSize:10, fontWeight:700, color:'#ef4444', background:'#fee2e2', padding:'3px 8px', borderRadius:20 }}>🔥 HOT</span>}
                          {isHov && !isHot && <span style={{ fontSize:11, fontWeight:700, color:cat.color, background:`${cat.color}12`, padding:'4px 10px', borderRadius:8 }}>Search →</span>}
                        </div>
                        <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:26, fontWeight:800, color:cat.count>0 ? cat.color : '#cbd5e1', lineHeight:1, marginBottom:4 }}>{fmt(cat.count)}</div>
                        <div style={{ fontSize:13, fontWeight:600, color:navy, marginBottom:10 }}>{cat.label}</div>
                        <div style={{ height:4, borderRadius:4, background:'#edf1f6', overflow:'hidden' }}>
                          <div style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg,${cat.color},${cat.color}77)`, borderRadius:4, transition:'width .8s ease' }} />
                        </div>
                        <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>{pct}% of top sector</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Salary guide */}
            <div style={{ background:white, border:'1.5px solid #e4eaf4', borderRadius:18, padding:'22px 24px', boxShadow:'0 2px 10px rgba(4,44,83,.05)' }}>
              <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:700, color:navy, marginBottom:4 }}>💸 India Salary Guide 2026</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginBottom:20 }}>Annual CTC in ₹ LPA — based on industry benchmarks</div>
              {SALARY_DATA.map((row, i) => {
                const minPct = (row.min / maxSalary) * 100
                const maxPct = (row.max / maxSalary) * 100
                const avgPct = (row.avg / maxSalary) * 100
                return (
                  <div key={row.role} className="salary-bar" style={{ borderBottomColor: i === SALARY_DATA.length - 1 ? 'transparent' : '#f1f5f9' }}>
                    <div style={{ fontSize:13, fontWeight:500, color:navy, minWidth:0 }}>{row.role}</div>
                    <div style={{ position:'relative', height:10, background:'#f1f5f9', borderRadius:6, overflow:'hidden' }}>
                      {/* range bar */}
                      <div style={{ position:'absolute', left:`${minPct}%`, width:`${maxPct - minPct}%`, height:'100%', background:`linear-gradient(90deg,${saffron}55,${saffron})`, borderRadius:6 }} />
                      {/* avg marker */}
                      <div style={{ position:'absolute', left:`${avgPct}%`, top:0, width:3, height:'100%', background:navy, borderRadius:2, transform:'translateX(-50%)' }} />
                    </div>
                    <div style={{ fontSize:12, color:'#64748b', textAlign:'right' as const }}>
                      <span style={{ fontWeight:700, color:navy }}>₹{row.avg}L</span>
                      <span style={{ fontSize:10, color:'#94a3b8', display:'block' }}>₹{row.min}–{row.max}L</span>
                    </div>
                  </div>
                )
              })}
              <div style={{ marginTop:14, fontSize:11, color:'#94a3b8' }}>
                ⓘ Bar shows range · marker shows median · figures reflect 2025–26 India tech market benchmarks
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ TAB 2: AI IMPACT ══════════════ */}
        {dashTab === 'ai' && (
          <div style={{ animation:'fadeUp .35s ease both' }}>

            {/* Header stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:16 }}>
              {[
                { icon:'🚀', label:'New AI roles created in India (2025)', value:'4.2M+', color:green    },
                { icon:'⚠️', label:'Jobs at risk from automation by 2030',  value:'11.5M', color:'#ef4444' },
                { icon:'📈', label:'AI skill demand growth YoY',            value:'+312%', color:purple   },
              ].map(s => (
                <div key={s.label} style={{ background:white, border:'1.5px solid #e4eaf4', borderRadius:16, padding:'20px', boxShadow:'0 2px 10px rgba(4,44,83,.05)', textAlign:'center' as const }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>{s.icon}</div>
                  <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:26, fontWeight:800, color:s.color, lineHeight:1, marginBottom:6 }}>{s.value}</div>
                  <div style={{ fontSize:12, color:'#64748b', lineHeight:1.4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Sector disruption grid */}
            <div style={{ background:white, border:'1.5px solid #e4eaf4', borderRadius:18, padding:'22px 24px', marginBottom:16, boxShadow:'0 2px 10px rgba(4,44,83,.05)' }}>
              <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:700, color:navy, marginBottom:4 }}>🔬 AI Disruption by Sector</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginBottom:18 }}>Based on WEF, McKinsey & Goldman Sachs research · India-specific projections</div>
              <div className="ai-grid">
                {AI_SECTOR_IMPACT.map((s, i) => {
                  const impactLabel = s.impact === 'creating' ? '✅ Creating Jobs' : s.impact === 'disrupting' ? '⚠️ Disrupting' : '⚡ Mixed Impact'
                  return (
                    <div key={s.sector} style={{ border:`1.5px solid ${s.color}25`, borderRadius:14, padding:'16px 18px', background:`${s.color}05`, animation:`fadeUp .3s ${i*.05}s ease both` }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:20 }}>{s.emoji}</span>
                          <span style={{ fontFamily:"'Outfit',sans-serif", fontSize:14, fontWeight:700, color:navy }}>{s.sector}</span>
                        </div>
                        <span style={{ fontSize:10, fontWeight:700, color:s.color, background:`${s.color}15`, padding:'3px 9px', borderRadius:20 }}>{impactLabel}</span>
                      </div>
                      {/* Disruption score bar */}
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                        <div style={{ flex:1, height:8, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
                          <div style={{ width:`${s.score}%`, height:'100%', background:`linear-gradient(90deg,${s.color}77,${s.color})`, borderRadius:4, transition:'width 1s ease' }} />
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, color:s.color, minWidth:32 }}>{s.score}%</span>
                      </div>
                      <div style={{ fontSize:12, color:'#64748b', lineHeight:1.4 }}>{s.headline}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Skills rising vs dying */}
            <div style={{ background:white, border:'1.5px solid #e4eaf4', borderRadius:18, padding:'22px 24px', boxShadow:'0 2px 10px rgba(4,44,83,.05)' }}>
              <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:700, color:navy, marginBottom:4 }}>📡 Skill Demand Signals</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginBottom:4 }}>Which skills to learn · which to move away from</div>
              <div className="skill-grid">
                {/* Rising */}
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, padding:'8px 12px', background:`${green}0f`, borderRadius:10 }}>
                    <span style={{ fontSize:16 }}>🚀</span>
                    <span style={{ fontSize:13, fontWeight:700, color:green }}>Rising Skills</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {RISING_SKILLS.map((s, i) => (
                      <div key={s.skill} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', borderRadius:10, background: i % 2 === 0 ? '#f8fafc' : white, border:'1px solid #f1f5f9' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {s.hot && <span style={{ fontSize:10, animation:'pulse 2s infinite' }}>🔥</span>}
                          <span style={{ fontSize:13, color:navy, fontWeight: s.hot ? 600 : 400 }}>{s.skill}</span>
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, color:green, background:`${green}12`, padding:'2px 8px', borderRadius:8 }}>{s.growth}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Declining */}
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, padding:'8px 12px', background:'#fee2e2', borderRadius:10 }}>
                    <span style={{ fontSize:16 }}>⚠️</span>
                    <span style={{ fontSize:13, fontWeight:700, color:'#dc2626' }}>Declining Demand</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {DECLINING_SKILLS.map((s, i) => (
                      <div key={s.skill} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', borderRadius:10, background: i % 2 === 0 ? '#f8fafc' : white, border:'1px solid #f1f5f9' }}>
                        <span style={{ fontSize:13, color:'#64748b' }}>{s.skill}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:'#dc2626', background:'#fee2e2', padding:'2px 8px', borderRadius:8 }}>{s.drop}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:14, padding:'12px 14px', background:`${purple}0a`, border:`1px solid ${purple}20`, borderRadius:10 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:purple, marginBottom:4 }}>💡 Job-Lens Tip</div>
                    <div style={{ fontSize:11, color:'#64748b', lineHeight:1.5 }}>
                      Upload your CV for an ATS Scan to see how your skills stack up against current market demand in India.
                    </div>
                    <button onClick={() => router.push('/in/career-scan')} style={{ marginTop:10, padding:'7px 16px', borderRadius:8, background:purple, color:white, fontSize:12, fontWeight:700, border:'none', cursor:'pointer' }}>
                      Scan My CV →
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ marginTop:16, fontSize:11, color:'#94a3b8' }}>
                ⓘ Growth figures based on job posting analysis from Adzuna, Naukri & LinkedIn India · 2024–26 trend data
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ TAB 3: NEWS & SIGNALS ══════════════ */}
        {dashTab === 'news' && (
          <div style={{ animation:'fadeUp .35s ease both' }}>
            <div style={{ background:white, border:'1.5px solid #e4eaf4', borderRadius:18, padding:'22px 24px', boxShadow:'0 2px 10px rgba(4,44,83,.05)' }}>
              <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:700, color:navy, marginBottom:4 }}>📰 India Job Market News</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginBottom:18 }}>Real-time signals · AI impact · hiring & firing · refreshed every 6h</div>

              {/* Category tabs */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
                {(['all','ai','hiring','market'] as NewsTab[]).map(t => {
                  const active = newsTab === t
                  const color  = t === 'all' ? saffron : NEWS_CAT_COLOR[t] ?? saffron
                  return (
                    <button key={t} onClick={() => setNewsTab(t)}
                      style={{ padding:'7px 16px', borderRadius:20, border:`1.5px solid ${active ? color : '#e4eaf4'}`, background: active ? `${color}15` : 'transparent', color: active ? color : '#94a3b8', fontSize:12, fontWeight: active ? 700 : 400, cursor:'pointer', transition:'all .15s', fontFamily:"'DM Sans',sans-serif" }}>
                      {NEWS_TAB_LABELS[t]}
                    </button>
                  )
                })}
              </div>

              {loadingN ? (
                <div className="news-grid">{[1,2,3,4,5,6].map(i => <Shimmer key={i} h={180} r={14} />)}</div>
              ) : news.filter(a => newsTab === 'all' || a.category === newsTab).length === 0 ? (
                <div style={{ textAlign:'center', padding:'48px 0', color:'#94a3b8', fontSize:13 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>📭</div>
                  No articles right now. Check back soon.
                </div>
              ) : (
                <div className="news-grid">
                  {news.filter(a => newsTab === 'all' || a.category === newsTab).slice(0, 9).map((article, i) => {
                    const catColor = NEWS_CAT_COLOR[article.category] ?? saffron
                    return (
                      <a key={i} href={article.url} target="_blank" rel="noopener noreferrer"
                        className="news-card" style={{ animation:`fadeUp .3s ${i*.05}s ease both` }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                          <span style={{ fontSize:10, fontWeight:700, color:catColor, background:`${catColor}15`, padding:'3px 9px', borderRadius:20, flexShrink:0 }}>
                            {NEWS_CAT_LABEL[article.category]}
                          </span>
                          <span style={{ fontSize:10, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{article.source}</span>
                        </div>
                        <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:14, fontWeight:700, color:navy, lineHeight:1.45,
                          display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' as const, overflow:'hidden' }}>
                          {article.title}
                        </div>
                        {article.description && (
                          <div style={{ fontSize:12, color:'#64748b', lineHeight:1.5,
                            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const, overflow:'hidden' }}>
                            {article.description}
                          </div>
                        )}
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto', paddingTop:6 }}>
                          <span style={{ fontSize:11, color:'#94a3b8' }}>{timeAgo(article.publishedAt)}</span>
                          <span style={{ fontSize:11, fontWeight:600, color:saffron }}>Read →</span>
                        </div>
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Zero credits alert */}
        {!loadingP && profile?.credits === 0 && (
          <div style={{ marginTop:16, padding:'16px 22px', background:'linear-gradient(135deg,#fee2e2,#fef2f2)', border:'1px solid #fca5a5', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#dc2626' }}>⛔ No credits remaining</div>
              <div style={{ fontSize:12, color:'#ef4444', marginTop:2 }}>Top up to continue using AI features</div>
            </div>
            <button onClick={() => router.push('/in/account')} style={{ padding:'10px 22px', borderRadius:10, background:'#dc2626', color:white, fontSize:13, fontWeight:700, border:'none', cursor:'pointer' }}>
              Top Up Now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
