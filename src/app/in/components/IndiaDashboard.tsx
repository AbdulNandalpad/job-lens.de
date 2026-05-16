'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MarketSnapshot } from '@/app/api/india/market-snapshot/route'
import type { NewsArticle } from '@/app/api/india/news-insights/route'

const saffron = '#FF9933'
const green   = '#138808'
const navy    = '#042C53'
const white   = '#FFFFFF'

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

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)     return 'just now'
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}
function fmt(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `${(n / 1000).toFixed(1)}k`
  return n > 0 ? n.toString() : '—'
}

function Shimmer({ h = 20, r = 8, w = '100%' }: { h?: number; r?: number; w?: string }) {
  return <div style={{ height: h, borderRadius: r, width: w, background: 'linear-gradient(90deg,#f0f4fa 25%,#e4eaf4 50%,#f0f4fa 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
}

type NewsTab = 'all' | 'ai' | 'hiring' | 'market'

const NEWS_TAB_LABELS: Record<NewsTab, string> = {
  all:     '📰 All',
  ai:      '🤖 AI Impact',
  hiring:  '📉 Hiring & Firing',
  market:  '🏢 Market News',
}
const NEWS_CAT_COLOR: Record<string, string> = {
  ai:      '#a855f7',
  hiring:  '#ef4444',
  market:  '#0ea5e9',
}
const NEWS_CAT_LABEL: Record<string, string> = {
  ai:      '🤖 AI Impact',
  hiring:  '📉 Hiring',
  market:  '🏢 Market',
}

export default function IndiaDashboard() {
  const router = useRouter()
  const [profile,  setProfile]  = useState<UserProfile | null>(null)
  const [market,   setMarket]   = useState<MarketSnapshot | null>(null)
  const [news,     setNews]     = useState<NewsArticle[]>([])
  const [loadingP, setLoadingP] = useState(true)
  const [loadingM, setLoadingM] = useState(true)
  const [loadingN, setLoadingN] = useState(true)
  const [newsTab,  setNewsTab]  = useState<NewsTab>('all')
  const [hoveredCat,  setHoveredCat]  = useState<string | null>(null)
  const [hoveredRole, setHoveredRole] = useState<string | null>(null)
  const [hoveredCity, setHoveredCity] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/user/profile').then(r => r.json()).then(setProfile).finally(() => setLoadingP(false))
    fetch('/api/india/market-snapshot').then(r => r.json()).then(setMarket).finally(() => setLoadingM(false))
    fetch('/api/india/news-insights').then(r => r.json()).then(d => setNews(d.articles ?? [])).finally(() => setLoadingN(false))
  }, [])

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  function searchJobs(q: string, location?: string) {
    const url = `/in/jobs?q=${encodeURIComponent(q)}${location ? `&location=${encodeURIComponent(location)}` : ''}`
    router.push(url)
  }

  const totalJobs  = market?.categories.reduce((s, c) => s + c.count, 0) ?? 0
  const topCat     = market?.categories[0]
  const topCity    = market?.topCities[0]
  const topRole    = market?.trendingRoles[0]
  const maxCat     = topCat?.count ?? 1

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4fa', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700;800&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        .dash-hero     { background: linear-gradient(135deg, ${navy} 0%, #0e2d4a 55%, #0a3a28 100%); padding:36px 28px 44px; position:relative; overflow:hidden; }
        .dash-actions  { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-top:28px; }
        .act-card      { background:rgba(255,255,255,0.07); border:1.5px solid rgba(255,255,255,0.1); border-radius:16px; padding:20px 14px; display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center; cursor:pointer; transition:all .18s; }
        .act-card:hover{ background:rgba(255,153,51,0.12); border-color:${saffron}; transform:translateY(-2px); box-shadow:0 8px 24px rgba(255,153,51,.2); }
        .act-card.dim  { opacity:.4; cursor:not-allowed; }
        .act-card.dim:hover{ background:rgba(255,255,255,0.07); border-color:rgba(255,255,255,0.1); transform:none; box-shadow:none; }
        .kpi-grid      { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:16px; animation:fadeUp .5s ease both; }
        .cat-grid      { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .cat-card      { background:#fff; border:1.5px solid #e4eaf4; border-radius:16px; padding:20px; cursor:pointer; transition:all .2s; position:relative; overflow:hidden; }
        .news-grid     { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:16px; }
        .news-card     { background:#fff; border:1.5px solid #e4eaf4; border-radius:16px; padding:18px; display:flex; flex-direction:column; gap:10px; transition:all .18s; cursor:pointer; }
        .news-card:hover { border-color:#FF9933; box-shadow:0 6px 24px rgba(255,153,51,.12); transform:translateY(-2px); }
        .news-tabs     { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:18px; }
        @media(max-width:900px){
          .dash-hero    { padding:28px 18px 36px!important; }
          .dash-actions { grid-template-columns:repeat(2,1fr)!important; }
          .kpi-grid     { grid-template-columns:repeat(2,1fr)!important; }
          .cat-grid     { grid-template-columns:repeat(2,1fr)!important; }
          .cat-card     { padding:14px!important; }
          .news-grid    { grid-template-columns:repeat(2,1fr)!important; }
        }
        @media(max-width:480px){
          .dash-hero    { padding:20px 16px 28px!important; }
          .dash-actions { grid-template-columns:repeat(2,1fr)!important; gap:8px!important; }
          .act-card     { padding:14px 10px!important; }
          .kpi-grid     { grid-template-columns:repeat(2,1fr)!important; gap:10px!important; }
          .cat-grid     { grid-template-columns:1fr 1fr!important; gap:8px!important; }
          .cat-card     { padding:12px!important; border-radius:12px!important; }
          .news-grid    { grid-template-columns:1fr!important; gap:10px!important; }
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
              <p style={{ margin:'6px 0 0', fontSize:13, color:'rgba(255,255,255,.5)' }}>Your India job market command centre</p>
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
              { icon:'🔍', label:'Find Jobs',    sub:'Browse live openings',      href:'/in/jobs',         accent:saffron,   dim:false },
              { icon:'📄', label:'Build CV',     sub:'AI-tailored for any role',  href:'/in/cv-builder',   accent:'#378ADD', dim:false },
              { icon:'✉️', label:'Cover Letter', sub:'In your voice, in minutes', href:'/in/cover-letter', accent:green,     dim:false },
              { icon:'📊', label:'ATS Scan',     sub:'Score your CV instantly',   href:'/in/career-scan',  accent:'#a855f7', dim:false },
            ] as const).map(a => (
              <div key={a.label} className={`act-card${a.dim?' dim':''}`} onClick={() => !a.dim && router.push(a.href)}>
                <div style={{ width:46, height:46, borderRadius:14, background:`${a.accent}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{a.icon}</div>
                <div>
                  <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:14, fontWeight:700, color:a.dim?'rgba(255,255,255,.3)':white }}>{a.label}</div>
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
            { label:'Total Open Roles',  value: loadingM ? null : fmt(totalJobs),             sub:'across all categories', color:saffron,   icon:'📋' },
            { label:'Hottest Sector',    value: loadingM ? null : (topCat?.label ?? '—'),      sub:`${fmt(topCat?.count??0)} open jobs`,      color:'#378ADD', icon:'🔥' },
            { label:'Top Hiring City',   value: loadingM ? null : (topCity?.city ?? '—'),      sub:`${fmt(topCity?.count??0)} listings`,       color:green,     icon:'📍' },
            { label:'Most In-Demand',    value: loadingM ? null : (topRole?.title?.split(' ')[0] ?? '—'), sub:'trending role right now', color:'#a855f7', icon:'⭐' },
          ].map(k => (
            <div key={k.label} style={{ background:white, border:'1.5px solid #e4eaf4', borderRadius:16, padding:'18px 20px', boxShadow:'0 2px 10px rgba(4,44,83,.05)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:11, fontWeight:600, color:'#94a3b8', letterSpacing:.4 }}>{k.label.toUpperCase()}</span>
                <span style={{ fontSize:18 }}>{k.icon}</span>
              </div>
              {k.value === null
                ? <Shimmer h={28} r={6} w="70%" />
                : <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:22, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
              }
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:6 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Category cards — clickable → job search */}
        <div style={{ background:white, border:'1.5px solid #e4eaf4', borderRadius:18, padding:'22px 24px', marginBottom:16, boxShadow:'0 2px 10px rgba(4,44,83,.05)', animation:'fadeUp .4s .1s ease both' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <div>
              <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:16, fontWeight:700, color:navy }}>🇮🇳 Job Market by Sector</div>
              <div style={{ fontSize:12, color:'#94a3b8', marginTop:3 }}>Click any sector to search live jobs · refreshed every 4h</div>
            </div>
          </div>

          {loadingM ? (
            <div className="cat-grid">{[1,2,3,4,5,6].map(i => <Shimmer key={i} h={110} r={14} />)}</div>
          ) : (
            <div className="cat-grid">
              {(market?.categories ?? []).map((cat, i) => {
                const pct = Math.round((cat.count / maxCat) * 100)
                const isHov = hoveredCat === cat.label
                const searchQ = CATEGORY_SEARCH[cat.label] ?? cat.label
                return (
                  <div
                    key={cat.label}
                    className="cat-card"
                    style={{ borderColor: isHov ? cat.color : '#e4eaf4', boxShadow: isHov ? `0 8px 28px ${cat.color}25` : '0 2px 8px rgba(4,44,83,.04)', transform: isHov ? 'translateY(-3px)' : 'none', animation:`fadeUp .4s ${i*.06}s ease both` }}
                    onMouseEnter={() => setHoveredCat(cat.label)}
                    onMouseLeave={() => setHoveredCat(null)}
                    onClick={() => searchJobs(searchQ)}
                  >
                    {/* Accent bar */}
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${cat.color},${cat.color}55)`, borderRadius:'16px 16px 0 0' }} />

                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:`${cat.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                        {CATEGORY_EMOJI[cat.label] ?? '💼'}
                      </div>
                      {isHov && (
                        <div style={{ fontSize:11, fontWeight:700, color:cat.color, background:`${cat.color}12`, padding:'4px 10px', borderRadius:8 }}>
                          Search →
                        </div>
                      )}
                    </div>

                    <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:24, fontWeight:800, color:cat.count>0 ? cat.color : '#cbd5e1', lineHeight:1, marginBottom:4 }}>
                      {fmt(cat.count)}
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:navy, marginBottom:10 }}>{cat.label}</div>

                    {/* Mini progress bar */}
                    <div style={{ height:4, borderRadius:4, background:'#edf1f6', overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg,${cat.color},${cat.color}77)`, borderRadius:4, transition:'width .8s ease' }} />
                    </div>
                    <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>{pct}% of top sector</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, color:'#94a3b8' }}>
              ⓘ Job counts are sourced from{' '}
              <a href="https://www.adzuna.in" target="_blank" rel="noopener noreferrer" style={{ color:'#94a3b8', textDecoration:'underline' }}>Adzuna India</a>
              {' '}and refreshed every 4 hours. Figures reflect publicly listed job postings and may not represent the full market. Data is provided for informational purposes only.
            </span>
          </div>
        </div>

        {/* News & Insights */}
        <div style={{ background:white, border:'1.5px solid #e4eaf4', borderRadius:18, padding:'22px 24px', marginTop:16, boxShadow:'0 2px 10px rgba(4,44,83,.05)', animation:'fadeUp .4s .2s ease both' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:18 }}>
            <div>
              <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:16, fontWeight:700, color:navy }}>📰 India Job Market Insights</div>
              <div style={{ fontSize:12, color:'#94a3b8', marginTop:3 }}>AI impact · hiring & firing · real-time news · refreshed every 6h</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="news-tabs">
            {(['all','ai','hiring','market'] as NewsTab[]).map(t => (
              <button key={t} onClick={() => setNewsTab(t)}
                style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${newsTab===t ? (t==='all'?saffron:NEWS_CAT_COLOR[t]??saffron) : '#e4eaf4'}`, background: newsTab===t ? (t==='all'?`${saffron}15`:NEWS_CAT_COLOR[t]?`${NEWS_CAT_COLOR[t]}15`:`${saffron}15`) : 'transparent', color: newsTab===t ? (t==='all'?saffron:NEWS_CAT_COLOR[t]??saffron) : '#94a3b8', fontSize:12, fontWeight: newsTab===t?700:400, cursor:'pointer', transition:'all .15s', fontFamily:"'DM Sans',sans-serif" }}>
                {NEWS_TAB_LABELS[t]}
              </button>
            ))}
          </div>

          {/* News cards */}
          {loadingN ? (
            <div className="news-grid">{[1,2,3,4,5,6].map(i => <Shimmer key={i} h={160} r={14} />)}</div>
          ) : news.filter(a => newsTab==='all' || a.category===newsTab).length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'#94a3b8', fontSize:13 }}>
              No articles available right now. Check back soon.
            </div>
          ) : (
            <div className="news-grid">
              {news.filter(a => newsTab==='all' || a.category===newsTab).slice(0,9).map((article, i) => {
                const catColor = NEWS_CAT_COLOR[article.category] ?? saffron
                return (
                  <a key={i} href={article.url} target="_blank" rel="noopener noreferrer"
                    className="news-card" style={{ textDecoration:'none', animation:`fadeUp .3s ${i*.05}s ease both` }}>
                    {/* Category + source row */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                      <span style={{ fontSize:10, fontWeight:700, color:catColor, background:`${catColor}15`, padding:'3px 9px', borderRadius:20, letterSpacing:.3, flexShrink:0 }}>
                        {NEWS_CAT_LABEL[article.category]}
                      </span>
                      <span style={{ fontSize:10, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{article.source}</span>
                    </div>

                    {/* Headline */}
                    <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:14, fontWeight:700, color:navy, lineHeight:1.4,
                      display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' as const, overflow:'hidden' }}>
                      {article.title}
                    </div>

                    {/* Description */}
                    {article.description && (
                      <div style={{ fontSize:12, color:'#64748b', lineHeight:1.5,
                        display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const, overflow:'hidden' }}>
                        {article.description}
                      </div>
                    )}

                    {/* Footer */}
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
