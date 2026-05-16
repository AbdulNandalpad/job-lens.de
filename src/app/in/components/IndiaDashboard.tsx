'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MarketSnapshot } from '@/app/api/india/market-snapshot/route'

const saffron = '#FF9933'
const green   = '#138808'
const navy    = '#042C53'
const white   = '#FFFFFF'

interface UserProfile {
  full_name: string
  credits: number
  usage: { action: string; credits_used: number; created_at: string }[]
}

const ACTION_LABELS: Record<string, string> = {
  career_scan:    'Career Scan',
  tailor_cv:      'CV Tailored',
  cover_letter:   'Cover Letter',
  india_ats_scan: 'ATS Scan',
  auto_apply:     'Auto Apply',
}
const ACTION_ICONS: Record<string, string> = {
  career_scan:    '📊',
  tailor_cv:      '📄',
  cover_letter:   '✉️',
  india_ats_scan: '🎯',
  auto_apply:     '🚀',
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

export default function IndiaDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [market,  setMarket]  = useState<MarketSnapshot | null>(null)
  const [loadingP, setLoadingP] = useState(true)
  const [loadingM, setLoadingM] = useState(true)
  const [hoveredCat,  setHoveredCat]  = useState<string | null>(null)
  const [hoveredRole, setHoveredRole] = useState<string | null>(null)
  const [hoveredCity, setHoveredCity] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/user/profile').then(r => r.json()).then(setProfile).finally(() => setLoadingP(false))
    fetch('/api/india/market-snapshot').then(r => r.json()).then(setMarket).finally(() => setLoadingM(false))
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
        .dash-bottom   { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-top:16px; }
        .role-row      { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; cursor:pointer; transition:all .15s; }
        .city-row      { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; cursor:pointer; transition:all .15s; justify-content:space-between; }
        @media(max-width:900px){
          .dash-hero    { padding:28px 18px 36px!important; }
          .dash-actions { grid-template-columns:repeat(2,1fr)!important; }
          .kpi-grid     { grid-template-columns:repeat(2,1fr)!important; }
          .cat-grid     { grid-template-columns:repeat(2,1fr)!important; }
          .cat-card     { padding:14px!important; }
          .dash-bottom  { grid-template-columns:1fr!important; }
        }
        @media(max-width:480px){
          .dash-hero    { padding:20px 16px 28px!important; }
          .dash-actions { grid-template-columns:repeat(2,1fr)!important; gap:8px!important; }
          .act-card     { padding:14px 10px!important; }
          .kpi-grid     { grid-template-columns:repeat(2,1fr)!important; gap:10px!important; }
          .cat-grid     { grid-template-columns:1fr 1fr!important; gap:8px!important; }
          .cat-card     { padding:12px!important; border-radius:12px!important; }
          .dash-bottom  { grid-template-columns:1fr!important; gap:12px!important; }
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
              { icon:'📊', label:'ATS Scan',     sub:'Coming soon',               href:'#',                accent:'#94a3b8', dim:true  },
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
        </div>

        {/* Bottom row */}
        <div className="dash-bottom">

          {/* Trending roles */}
          <div style={{ background:white, border:'1.5px solid #e4eaf4', borderRadius:18, padding:'20px 22px', boxShadow:'0 2px 10px rgba(4,44,83,.05)', animation:'fadeUp .4s .2s ease both' }}>
            <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:700, color:navy, marginBottom:4 }}>🔥 Trending Roles</div>
            <div style={{ fontSize:11, color:'#94a3b8', marginBottom:16 }}>Click to search jobs instantly</div>
            {loadingM ? (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{[1,2,3,4,5,6].map(i => <Shimmer key={i} h={38} r={10} />)}</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {(market?.trendingRoles ?? []).map((role, i) => {
                  const isHov = hoveredRole === role.title
                  return (
                    <div
                      key={role.title}
                      className="role-row"
                      style={{ background: isHov ? `${saffron}0e` : i % 2 === 0 ? '#f8fafc' : white, border:`1px solid ${isHov ? `${saffron}30` : 'transparent'}` }}
                      onMouseEnter={() => setHoveredRole(role.title)}
                      onMouseLeave={() => setHoveredRole(null)}
                      onClick={() => searchJobs(role.title)}
                    >
                      <div style={{ width:24, height:24, borderRadius:7, background: i < 3 ? `${saffron}18` : '#edf1f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color: i < 3 ? saffron : '#94a3b8', flexShrink:0 }}>
                        {i + 1}
                      </div>
                      <span style={{ fontSize:13, color:navy, fontWeight: i < 2 ? 600 : 400, flex:1 }}>{role.title}</span>
                      {i === 0 && <span style={{ fontSize:10, fontWeight:700, color:saffron, background:`${saffron}15`, padding:'2px 7px', borderRadius:6, flexShrink:0 }}>HOT</span>}
                      {isHov && i !== 0 && <span style={{ fontSize:11, color:saffron, flexShrink:0 }}>→</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Top cities */}
          <div style={{ background:white, border:'1.5px solid #e4eaf4', borderRadius:18, padding:'20px 22px', boxShadow:'0 2px 10px rgba(4,44,83,.05)', animation:'fadeUp .4s .25s ease both' }}>
            <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:700, color:navy, marginBottom:4 }}>📍 Top Hiring Cities</div>
            <div style={{ fontSize:11, color:'#94a3b8', marginBottom:16 }}>Click to search jobs in that city</div>
            {loadingM ? (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{[1,2,3,4,5].map(i => <Shimmer key={i} h={44} r={10} />)}</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {(market?.topCities ?? []).map((city, i) => {
                  const isHov = hoveredCity === city.city
                  const max   = market?.topCities[0]?.count ?? 1
                  const pct   = Math.max(8, Math.round((city.count / max) * 100))
                  return (
                    <div
                      key={city.city}
                      className="city-row"
                      style={{ background: isHov ? `${green}0d` : i % 2 === 0 ? '#f8fafc' : white, border:`1px solid ${isHov ? `${green}30` : 'transparent'}` }}
                      onMouseEnter={() => setHoveredCity(city.city)}
                      onMouseLeave={() => setHoveredCity(null)}
                      onClick={() => searchJobs('jobs', city.city === 'Delhi NCR' ? 'delhi' : city.city.toLowerCase())}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                        <div style={{ width:24, height:24, borderRadius:7, background: i === 0 ? `${green}18` : '#edf1f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color: i === 0 ? green : '#94a3b8', flexShrink:0 }}>
                          {i + 1}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, color:navy, fontWeight: i === 0 ? 600 : 400 }}>{city.city}</div>
                          <div style={{ height:3, borderRadius:3, background:'#edf1f6', marginTop:4, overflow:'hidden' }}>
                            <div style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg,${green},${green}66)`, borderRadius:3 }} />
                          </div>
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                        <span style={{ fontSize:12, fontWeight:700, color: i === 0 ? green : '#94a3b8' }}>{fmt(city.count)}</span>
                        {isHov && <span style={{ fontSize:11, color:green }}>→</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div style={{ background:white, border:'1.5px solid #e4eaf4', borderRadius:18, padding:'20px 22px', boxShadow:'0 2px 10px rgba(4,44,83,.05)', animation:'fadeUp .4s .3s ease both' }}>
            <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:700, color:navy, marginBottom:4 }}>🕐 Recent Activity</div>
            <div style={{ fontSize:11, color:'#94a3b8', marginBottom:16 }}>Your last AI actions</div>
            {loadingP ? (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{[1,2,3,4].map(i => <Shimmer key={i} h={50} r={10} />)}</div>
            ) : profile?.usage?.length ? (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {profile.usage.slice(0,5).map((e, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:'#f8fafc' }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:`${saffron}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>
                      {ACTION_ICONS[e.action] ?? '⚡'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:navy, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {ACTION_LABELS[e.action] ?? e.action}
                      </div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{timeAgo(e.created_at)}</div>
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color:saffron, background:`${saffron}10`, padding:'3px 8px', borderRadius:7, flexShrink:0 }}>-{e.credits_used}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'24px 0' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🚀</div>
                <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.6, marginBottom:14 }}>No activity yet.<br/>Start by finding a job!</div>
                <button onClick={() => router.push('/in/jobs')} style={{ padding:'9px 20px', borderRadius:10, background:`linear-gradient(135deg,${saffron},#e67300)`, color:white, fontSize:13, fontWeight:700, border:'none', cursor:'pointer', boxShadow:`0 4px 14px ${saffron}40` }}>
                  Find Jobs →
                </button>
              </div>
            )}
          </div>
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
