'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MarketSnapshot } from '@/app/api/india/market-snapshot/route'
import type { NewsArticle } from '@/app/api/india/news-insights/route'
import type { WorldIndicator } from '@/app/api/india/world-indicators/route'

// ── Design tokens ───────────────────────────────────────
const saffron = '#FF9933'
const cyan    = '#06b6d4'
const purple  = '#8b5cf6'
const emerald = '#10b981'
const red     = '#ef4444'
const navy    = '#042C53'

const bg      = '#07111f'          // page background
const card    = 'rgba(255,255,255,0.04)'
const cardHov = 'rgba(255,255,255,0.07)'
const border  = 'rgba(255,255,255,0.08)'
const borderH = 'rgba(255,255,255,0.18)'
const txt1    = '#f1f5f9'
const txt2    = '#94a3b8'
const txt3    = '#475569'

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

const AI_SECTOR_IMPACT = [
  { sector:'IT & Software',    emoji:'💻', impact:'creating',   score:88, headline:'AI engineering roles up 240% YoY',       color:emerald },
  { sector:'Data & Analytics', emoji:'📊', impact:'creating',   score:82, headline:'Data scientists & MLOps in huge demand',  color:emerald },
  { sector:'Healthcare',       emoji:'🏥', impact:'creating',   score:70, headline:'Health-tech and AI diagnostics booming',  color:emerald },
  { sector:'Finance & Fintech',emoji:'💰', impact:'mixed',      score:55, headline:'Analysts valued, clerks being automated', color:saffron },
  { sector:'Sales & Marketing',emoji:'📣', impact:'mixed',      score:48, headline:'AI copilots reshaping the role entirely', color:saffron },
  { sector:'BPO / Support',    emoji:'🎧', impact:'disrupting', score:76, headline:'Routine tasks heavily automated by LLMs', color:red     },
  { sector:'Manufacturing',    emoji:'🏭', impact:'disrupting', score:62, headline:'Robotics replacing assembly line workers', color:red     },
  { sector:'Content / Media',  emoji:'✍️', impact:'mixed',      score:50, headline:'GenAI creating and killing roles simultaneously', color:saffron },
]

const RISING_SKILLS  = [
  { skill:'Generative AI',      growth:'+312%', hot:true  },
  { skill:'LLM / RAG Systems',  growth:'+280%', hot:true  },
  { skill:'MLOps',              growth:'+195%', hot:true  },
  { skill:'Prompt Engineering', growth:'+170%', hot:false },
  { skill:'Cloud (AWS/GCP)',    growth:'+90%',  hot:false },
  { skill:'Data Engineering',   growth:'+85%',  hot:false },
  { skill:'Kubernetes',         growth:'+72%',  hot:false },
  { skill:'Python',             growth:'+65%',  hot:false },
]
const DECLINING_SKILLS = [
  { skill:'Manual Testing',  drop:'-48%' },
  { skill:'Data Entry',      drop:'-61%' },
  { skill:'Basic Excel Ops', drop:'-39%' },
  { skill:'Legacy COBOL',    drop:'-55%' },
  { skill:'Cold Calling',    drop:'-33%' },
  { skill:'Manual SEO',      drop:'-44%' },
]
const SALARY_DATA = [
  { role:'ML / AI Engineer',   min:12, max:45, avg:24 },
  { role:'Cloud Architect',    min:15, max:50, avg:28 },
  { role:'Product Manager',    min:12, max:40, avg:22 },
  { role:'Data Scientist',     min:8,  max:35, avg:18 },
  { role:'Backend Engineer',   min:7,  max:30, avg:16 },
  { role:'DevOps Engineer',    min:8,  max:28, avg:15 },
  { role:'Frontend Developer', min:5,  max:22, avg:11 },
  { role:'Business Analyst',   min:6,  max:20, avg:11 },
]

const NEWS_CAT_COLOR: Record<string,string> = { ai:purple, hiring:red, market:cyan }
const NEWS_CAT_LABEL: Record<string,string>  = { ai:'🤖 AI', hiring:'📉 Hiring', market:'🏢 Market' }
const NEWS_TABS: { id:NewsTab; label:string }[] = [
  { id:'all',     label:'📰 All'            },
  { id:'ai',      label:'🤖 AI Impact'      },
  { id:'hiring',  label:'📉 Hiring & Firing' },
  { id:'market',  label:'🏢 Market News'    },
]

function timeAgo(iso:string) {
  const s = Math.floor((Date.now()-new Date(iso).getTime())/1000)
  if (s<60)    return 'just now'
  if (s<3600)  return `${Math.floor(s/60)}m ago`
  if (s<86400) return `${Math.floor(s/3600)}h ago`
  return new Date(iso).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})
}
function fmt(n:number) {
  if (n>=100000) return `${(n/100000).toFixed(1)}L`
  if (n>=1000)   return `${(n/1000).toFixed(1)}k`
  return n>0?n.toString():'—'
}
function Shimmer({h=20,r=8,w='100%'}:{h?:number;r?:number;w?:string}) {
  return <div style={{height:h,borderRadius:r,width:w,background:'linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite'}}/>
}
function GlowDot({color}:{color:string}) {
  return <span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:color,boxShadow:`0 0 6px ${color}`,animation:'pulse 2s infinite',flexShrink:0}}/>
}

export default function IndiaDashboard() {
  const router = useRouter()
  const [profile,    setProfile]    = useState<UserProfile|null>(null)
  const [market,     setMarket]     = useState<MarketSnapshot|null>(null)
  const [news,       setNews]       = useState<NewsArticle[]>([])
  const [indicators, setIndicators] = useState<WorldIndicator[]>([])
  const [loadingP,   setLoadingP]   = useState(true)
  const [loadingM,   setLoadingM]   = useState(true)
  const [loadingN,   setLoadingN]   = useState(true)
  const [loadingI,   setLoadingI]   = useState(true)
  const [dashTab,    setDashTab]    = useState<DashTab>('pulse')
  const [newsTab,    setNewsTab]    = useState<NewsTab>('all')
  const [hoveredCat, setHoveredCat] = useState<string|null>(null)
  // Mobile collapse — all sections closed by default
  const [mobSec, setMobSec] = useState<Record<string,boolean>>({})
  function toggleMob(id:string){setMobSec(p=>({...p,[id]:!p[id]}))}
  // Wrap a section so it collapses on mobile and is always visible on desktop
  function MobSection({id,title,icon,children}:{id:string;title:string;icon:string;children:React.ReactNode}){
    const open=!!mobSec[id]
    return (
      <div>
        <button className="mob-sec-hdr" onClick={()=>toggleMob(id)}
          style={{width:'100%',display:'none',alignItems:'center',justifyContent:'space-between',
            padding:'13px 18px',background:'rgba(255,255,255,.04)',border:`1px solid ${border}`,
            borderRadius:open?'16px 16px 0 0':16,color:txt1,fontFamily:"'DM Sans',sans-serif",
            fontSize:13,fontWeight:600,cursor:'pointer',marginBottom:open?0:8,transition:'border-radius .2s'}}>
          <span style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:18}}>{icon}</span>{title}</span>
          <span style={{fontSize:14,color:txt3,transition:'transform .2s',transform:open?'rotate(180deg)':'none'}}>▾</span>
        </button>
        <div className={open?'mob-sec-body mob-sec-open':'mob-sec-body'}>{children}</div>
      </div>
    )
  }

  useEffect(()=>{
    fetch('/api/user/profile').then(r=>r.json()).then(setProfile).finally(()=>setLoadingP(false))
    fetch('/api/india/market-snapshot').then(r=>r.json()).then(setMarket).finally(()=>setLoadingM(false))
    fetch('/api/india/news-insights').then(r=>r.json()).then(d=>setNews(d.articles??[])).finally(()=>setLoadingN(false))
    fetch('/api/india/world-indicators').then(r=>r.json()).then(setIndicators).finally(()=>setLoadingI(false))
  },[])

  const hour      = new Date().getHours()
  const greeting  = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening'
  const firstName = profile?.full_name?.split(' ')[0]??''

  function searchJobs(q:string,location?:string) {
    router.push(`/in/jobs?q=${encodeURIComponent(q)}${location?`&location=${encodeURIComponent(location)}`:''}`)
  }

  const totalJobs = market?.categories.reduce((s,c)=>s+c.count,0)??0
  const topCat    = market?.categories[0]
  const topCity   = market?.topCities[0]
  const topRole   = market?.trendingRoles[0]
  const maxCat    = topCat?.count??1

  const DASH_TABS:{id:DashTab;label:string;icon:string;color:string}[] = [
    {id:'pulse', label:'Market Pulse',   icon:'📊', color:cyan   },
    {id:'ai',    label:'AI Impact',      icon:'🤖', color:purple },
    {id:'news',  label:'News & Signals', icon:'📰', color:saffron},
  ]

  return (
    <div style={{minHeight:'100vh',background:bg,fontFamily:"'DM Sans',sans-serif",color:txt1}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700;800&display=swap');
        @keyframes shimmer  {0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeUp   {from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes pulse    {0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes glow     {0%,100%{box-shadow:0 0 20px rgba(255,153,51,.15)}50%{box-shadow:0 0 40px rgba(255,153,51,.35)}}
        @keyframes spin     {to{transform:rotate(360deg)}}

        *{box-sizing:border-box}

        /* Grid texture on page */
        .dash-page {
          background-color:${bg};
          background-image:
            linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),
            linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);
          background-size:48px 48px;
        }

        /* Hero */
        .dash-hero {
          background:linear-gradient(135deg,#0a1628 0%,#0d1f14 60%,#0a0d1a 100%);
          padding:40px 28px 50px;
          position:relative;
          overflow:hidden;
          border-bottom:1px solid ${border};
        }

        /* Action cards */
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
          border-color:rgba(255,153,51,.4);
          transform:translateY(-3px);
          box-shadow:0 12px 40px rgba(255,153,51,.12);
        }

        /* KPI */
        .kpi-grid   {display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
        .kpi-card   {
          background:${card};
          border:1px solid ${border};
          border-radius:16px;padding:20px;
          transition:all .2s;animation:fadeUp .4s ease both;
        }
        .kpi-card:hover{background:${cardHov};border-color:${borderH}}

        /* Tab nav */
        .tab-nav  {display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:22px;background:rgba(255,255,255,.03);border:1px solid ${border};border-radius:16px;padding:6px}
        .tab-btn  {
          padding:13px 16px;border-radius:12px;border:none;cursor:pointer;
          font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;
          transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;
          background:transparent;color:${txt2};
        }
        .tab-btn.active {font-weight:700;color:#fff}

        /* Macro */
        .macro-grid {display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
        .macro-card {
          background:${card};border:1px solid ${border};border-radius:14px;padding:16px 18px;
          transition:all .2s;
        }
        .macro-card:hover{background:${cardHov};border-color:${borderH}}

        /* Sector grid */
        .cat-grid {display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .cat-card {
          background:${card};border:1px solid ${border};border-radius:16px;
          padding:20px;cursor:pointer;transition:all .22s;position:relative;overflow:hidden;
        }

        /* Salary */
        .salary-row {display:grid;grid-template-columns:160px 1fr 72px;gap:14px;align-items:center;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.05)}

        /* AI grid */
        .ai-sector-grid {display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
        .ai-card {
          background:${card};border:1px solid ${border};border-radius:14px;
          padding:18px;transition:all .2s;
        }
        .ai-card:hover{background:${cardHov}}

        /* Skill grid */
        .skill-grid {display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}

        /* News */
        .news-grid {display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px}
        .news-card {
          background:${card};border:1px solid ${border};border-radius:16px;
          padding:18px;display:flex;flex-direction:column;gap:11px;
          transition:all .2s;cursor:pointer;text-decoration:none;color:inherit;
        }
        .news-card:hover{background:${cardHov};border-color:${borderH};transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.4)}

        /* Dash actions grid */
        .dash-actions {display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:28px}

        @media(max-width:900px){
          .dash-hero  {padding:28px 18px 38px!important}
          .dash-actions{grid-template-columns:repeat(2,1fr)!important}
          .kpi-grid   {grid-template-columns:repeat(2,1fr)!important}
          .macro-grid {grid-template-columns:repeat(2,1fr)!important}
          .cat-grid   {grid-template-columns:repeat(2,1fr)!important}
          .cat-card   {padding:14px!important}
          .ai-sector-grid{grid-template-columns:1fr!important}
          .skill-grid {grid-template-columns:1fr!important}
          .news-grid  {grid-template-columns:repeat(2,1fr)!important}
          .salary-row {grid-template-columns:120px 1fr 60px!important}
        }
        @media(max-width:600px){
          .tab-btn    {font-size:11px!important;padding:10px 8px!important;gap:5px!important}
          .kpi-grid   {grid-template-columns:repeat(2,1fr)!important;gap:10px!important}
          .macro-grid {grid-template-columns:repeat(2,1fr)!important}
          .cat-grid   {grid-template-columns:1fr 1fr!important;gap:8px!important}
          .cat-card   {padding:12px!important;border-radius:12px!important}
          .news-grid  {grid-template-columns:1fr!important}
          .salary-row {grid-template-columns:1fr!important;gap:6px!important}
          .dash-actions{gap:8px!important}
          .act-card   {padding:14px 10px!important}

          /* Mobile collapse */
          .mob-sec-hdr { display:flex!important }
          .mob-sec-body { display:none; border:1px solid rgba(255,255,255,.08); border-top:none; border-radius:0 0 16px 16px; margin-bottom:10px; overflow:hidden }
          .mob-sec-body.mob-sec-open { display:block }
          /* Remove the card's own outer border/radius on mobile — the collapse wrapper handles it */
          .mob-sec-body > div:first-child { border-radius:0!important; border:none!important; margin-bottom:0!important }
          /* KPI grid needs padding inside collapse body */
          .mob-sec-body > .kpi-grid { padding:14px!important; margin-bottom:0!important }
        }
        @media(max-width:360px){
          .cat-grid{grid-template-columns:1fr!important}
          .kpi-grid{grid-template-columns:1fr 1fr!important}
        }
      `}</style>

      {/* ── HERO ── */}
      <div className="dash-hero">
        {/* Ambient glows */}
        <div style={{position:'absolute',top:-120,right:-80,width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(255,153,51,.12) 0%,transparent 65%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-140,left:-100,width:440,height:440,borderRadius:'50%',background:'radial-gradient(circle,rgba(16,185,129,.08) 0%,transparent 65%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:'30%',left:'40%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,.07) 0%,transparent 65%)',pointerEvents:'none'}}/>

        <div style={{maxWidth:1100,margin:'0 auto',position:'relative'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <GlowDot color={emerald}/>
                <span style={{fontSize:11,color:txt3,letterSpacing:.8,textTransform:'uppercase'}}>
                  {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
                </span>
              </div>
              <h1 style={{margin:0,fontFamily:"'Outfit',sans-serif",fontSize:'clamp(22px,5vw,30px)',fontWeight:800,color:'#fff',letterSpacing:-.5}}>
                {greeting}{firstName?`, ${firstName}`:''} 👋
              </h1>
              <p style={{margin:'6px 0 0',fontSize:13,color:txt2}}>
                Your India career intelligence platform
              </p>
            </div>
            {!loadingP && profile && (
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <div onClick={()=>router.push('/in/account')} style={{display:'flex',alignItems:'center',gap:10,background:'rgba(255,153,51,.1)',border:'1px solid rgba(255,153,51,.25)',borderRadius:14,padding:'10px 18px',cursor:'pointer',transition:'all .2s',animation:'glow 3s infinite'}}>
                  <span style={{fontSize:20}}>⚡</span>
                  <div>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:800,color:saffron,lineHeight:1}}>{profile.credits}</div>
                    <div style={{fontSize:10,color:'rgba(255,153,51,.5)',letterSpacing:.4}}>CREDITS</div>
                  </div>
                </div>
                {profile.credits<=3&&(
                  <button onClick={()=>router.push('/in/account')} style={{padding:'10px 20px',borderRadius:12,background:`linear-gradient(135deg,${saffron},#e67300)`,color:'#fff',fontSize:12,fontWeight:700,border:'none',cursor:'pointer',boxShadow:'0 4px 20px rgba(255,153,51,.4)'}}>
                    Top Up ₹149+
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="dash-actions">
            {([
              {icon:'🔍',label:'Find Jobs',    sub:'Browse live openings',      href:'/in/jobs',         accent:saffron},
              {icon:'📄',label:'Build CV',     sub:'AI-tailored for any role',  href:'/in/cv-builder',   accent:cyan   },
              {icon:'✉️',label:'Cover Letter', sub:'In your voice, in minutes', href:'/in/cover-letter', accent:emerald},
              {icon:'📊',label:'ATS Scan',     sub:'Score your CV instantly',   href:'/in/career-scan',  accent:purple },
            ] as const).map(a=>(
              <div key={a.label} className="act-card" onClick={()=>router.push(a.href)}>
                <div style={{width:48,height:48,borderRadius:14,background:`${a.accent}20`,border:`1px solid ${a.accent}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{a.icon}</div>
                <div>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,color:'#fff'}}>{a.label}</div>
                  <div style={{fontSize:11,color:txt3,marginTop:2}}>{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="dash-page" style={{maxWidth:1100,margin:'0 auto',padding:'28px 20px 80px'}}>

        {/* KPI row */}
        <MobSection id="kpi" title="Market Snapshot" icon="📊">
        <div className="kpi-grid" style={{marginBottom:0}}>
          {[
            {label:'Open Roles',     value:loadingM?null:fmt(totalJobs),                           sub:'across all sectors',      color:saffron, icon:'📋'},
            {label:'Hottest Sector', value:loadingM?null:(topCat?.label??'—'),                     sub:`${fmt(topCat?.count??0)} listings`, color:cyan,    icon:'🔥'},
            {label:'Top City',       value:loadingM?null:(topCity?.city??'—'),                     sub:`${fmt(topCity?.count??0)} openings`,color:emerald, icon:'📍'},
            {label:'Most In-Demand', value:loadingM?null:(topRole?.title?.split(' ')[0]??'—'),     sub:'trending role right now', color:purple,  icon:'⭐'},
          ].map(k=>(
            <div key={k.label} className="kpi-card">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <span style={{fontSize:10,fontWeight:600,color:txt3,letterSpacing:.6,textTransform:'uppercase'}}>{k.label}</span>
                <div style={{width:32,height:32,borderRadius:9,background:`${k.color}15`,border:`1px solid ${k.color}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>{k.icon}</div>
              </div>
              {k.value===null
                ?<Shimmer h={28} r={6} w="70%"/>
                :<div style={{fontFamily:"'Outfit',sans-serif",fontSize:24,fontWeight:800,color:k.color,lineHeight:1,letterSpacing:-.5}}>{k.value}</div>
              }
              <div style={{fontSize:11,color:txt3,marginTop:6}}>{k.sub}</div>
            </div>
          ))}
        </div>
        </MobSection>

        {/* ── TAB NAV ── */}
        <div className="tab-nav">
          {DASH_TABS.map(t=>{
            const active=dashTab===t.id
            return (
              <button key={t.id} className={`tab-btn${active?' active':''}`} onClick={()=>setDashTab(t.id)}
                style={{
                  background:active?`linear-gradient(135deg,${t.color}20,${t.color}08)`:undefined,
                  color:active?'#fff':txt2,
                  fontWeight:active?700:400,
                  boxShadow:active?`inset 0 0 0 1px ${t.color}50,0 4px 20px ${t.color}10`:undefined,
                }}>
                <span style={{fontSize:17}}>{t.icon}</span>
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ══ TAB 1: MARKET PULSE ══ */}
        {dashTab==='pulse'&&(
          <div style={{animation:'fadeUp .3s ease both'}}>

            {/* World Bank macro */}
            <MobSection id="macro" title="India Macro Indicators" icon="🌐">
            <div style={{background:card,border:`1px solid ${border}`,borderRadius:20,padding:'22px 26px',marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
                <GlowDot color={cyan}/>
                <div>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,color:'#fff'}}>India Macro Indicators</div>
                  <div style={{fontSize:11,color:txt3,marginTop:2}}>World Bank · updated annually</div>
                </div>
              </div>
              <div className="macro-grid">
                {loadingI?[1,2,3,4].map(i=><Shimmer key={i} h={80} r={12}/>):
                  indicators.map(ind=>{
                    const good=(ind.label==='Unemployment Rate'||ind.label==='Youth Unemployment')?ind.trend==='down':ind.trend==='up'
                    const tc=ind.trend==='flat'?txt3:good?emerald:red
                    const arr=ind.trend==='up'?'↑':ind.trend==='down'?'↓':'→'
                    return (
                      <div key={ind.label} className="macro-card">
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                          <span style={{fontSize:20}}>{ind.icon}</span>
                          <span style={{fontSize:13,fontWeight:700,color:tc,background:`${tc}18`,padding:'3px 8px',borderRadius:20}}>{arr}</span>
                        </div>
                        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:26,fontWeight:800,color:ind.value!==null?tc:txt3,lineHeight:1}}>
                          {ind.value!==null?`${ind.value}${ind.unit}`:'—'}
                        </div>
                        <div style={{fontSize:11,color:txt2,marginTop:5}}>{ind.label}</div>
                        {ind.year&&<div style={{fontSize:10,color:txt3,marginTop:2}}>{ind.year} data</div>}
                      </div>
                    )
                  })
                }
              </div>
            </div>
            </MobSection>

            {/* Sector heatmap */}
            <MobSection id="sectors" title="Live Job Market by Sector" icon="🇮🇳">
            <div style={{background:card,border:`1px solid ${border}`,borderRadius:20,padding:'22px 26px',marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
                <GlowDot color={saffron}/>
                <div>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,color:'#fff'}}>🇮🇳 Live Job Market by Sector</div>
                  <div style={{fontSize:11,color:txt3,marginTop:2}}>Adzuna India · refreshed every 4h · click to search</div>
                </div>
              </div>
              {loadingM?(
                <div className="cat-grid">{[1,2,3,4,5,6].map(i=><Shimmer key={i} h={130} r={14}/>)}</div>
              ):(
                <div className="cat-grid">
                  {(market?.categories??[]).map((cat,i)=>{
                    const pct=Math.round((cat.count/maxCat)*100)
                    const isHov=hoveredCat===cat.label
                    const isHot=i<2
                    return (
                      <div key={cat.label} className="cat-card"
                        style={{
                          borderColor:isHov?cat.color:border,
                          boxShadow:isHov?`0 0 30px ${cat.color}20,inset 0 0 30px ${cat.color}06`:'none',
                          background:isHov?`${cat.color}06`:card,
                          animation:`fadeUp .4s ${i*.06}s ease both`
                        }}
                        onMouseEnter={()=>setHoveredCat(cat.label)}
                        onMouseLeave={()=>setHoveredCat(null)}
                        onClick={()=>searchJobs(CATEGORY_SEARCH[cat.label]??cat.label)}>
                        {/* Top glow bar */}
                        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${cat.color},${cat.color}33)`,borderRadius:'16px 16px 0 0',opacity:isHov?1:.4}}/>
                        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
                          <div style={{width:42,height:42,borderRadius:12,background:`${cat.color}18`,border:`1px solid ${cat.color}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>
                            {CATEGORY_EMOJI[cat.label]??'💼'}
                          </div>
                          {isHot&&<span style={{fontSize:10,fontWeight:700,color:red,background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.2)',padding:'3px 8px',borderRadius:20}}>🔥 HOT</span>}
                          {isHov&&!isHot&&<span style={{fontSize:11,fontWeight:700,color:cat.color}}>Search →</span>}
                        </div>
                        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:28,fontWeight:800,color:cat.count>0?cat.color:txt3,lineHeight:1,marginBottom:4}}>{fmt(cat.count)}</div>
                        <div style={{fontSize:13,fontWeight:600,color:txt1,marginBottom:12}}>{cat.label}</div>
                        <div style={{height:3,borderRadius:4,background:'rgba(255,255,255,.06)',overflow:'hidden'}}>
                          <div style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${cat.color}88,${cat.color})`,borderRadius:4,boxShadow:`0 0 8px ${cat.color}60`,transition:'width .8s ease'}}/>
                        </div>
                        <div style={{fontSize:10,color:txt3,marginTop:5}}>{pct}% of top sector</div>
                      </div>
                    )
                  })}
                </div>
              )}
              <div style={{marginTop:14,fontSize:11,color:txt3}}>
                ⓘ Data from <a href="https://www.adzuna.in" target="_blank" rel="noopener noreferrer" style={{color:txt2}}>Adzuna India</a> · publicly listed postings only · informational purposes
              </div>
            </div>
            </MobSection>

            {/* Salary guide */}
            <MobSection id="salary" title="India Salary Guide 2026" icon="💸">
            <div style={{background:card,border:`1px solid ${border}`,borderRadius:20,padding:'22px 26px'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
                <GlowDot color={emerald}/>
                <div>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,color:'#fff'}}>💸 India Salary Guide 2026</div>
                  <div style={{fontSize:11,color:txt3,marginTop:2}}>Annual CTC in ₹ LPA · industry benchmarks</div>
                </div>
              </div>
              {SALARY_DATA.map((row,i)=>{
                const maxVal=50
                const minPct=(row.min/maxVal)*100
                const rangePct=((row.max-row.min)/maxVal)*100
                const avgPct=(row.avg/maxVal)*100
                return (
                  <div key={row.role} className="salary-row" style={{borderBottomColor:i===SALARY_DATA.length-1?'transparent':'rgba(255,255,255,.05)'}}>
                    <div style={{fontSize:13,fontWeight:500,color:txt1}}>{row.role}</div>
                    <div style={{position:'relative',height:8,background:'rgba(255,255,255,.06)',borderRadius:6,overflow:'hidden'}}>
                      <div style={{position:'absolute',left:`${minPct}%`,width:`${rangePct}%`,height:'100%',background:`linear-gradient(90deg,${saffron}50,${saffron})`,borderRadius:6,boxShadow:`0 0 10px ${saffron}40`}}/>
                      <div style={{position:'absolute',left:`${avgPct}%`,top:0,width:2,height:'100%',background:'#fff',borderRadius:2,transform:'translateX(-50%)',boxShadow:'0 0 6px rgba(255,255,255,.8)'}}/>
                    </div>
                    <div style={{textAlign:'right' as const}}>
                      <span style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,color:saffron}}>₹{row.avg}L</span>
                      <span style={{fontSize:10,color:txt3,display:'block'}}>₹{row.min}–{row.max}L</span>
                    </div>
                  </div>
                )
              })}
              <div style={{marginTop:14,fontSize:11,color:txt3}}>
                ⓘ Bar = range · white marker = median · 2025–26 India tech market
              </div>
            </div>
            </MobSection>
          </div>
        )}

        {/* ══ TAB 2: AI IMPACT ══ */}
        {dashTab==='ai'&&(
          <div style={{animation:'fadeUp .3s ease both'}}>

            {/* Big 3 stats */}
            <MobSection id="aistats" title="AI Jobs Impact 2026" icon="🚀">
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:16}}>
              {[
                {icon:'🚀',label:'New AI roles created in India (2025)',value:'4.2M+',color:emerald},
                {icon:'⚠️',label:'Jobs at risk from automation by 2030', value:'11.5M', color:red   },
                {icon:'📈',label:'AI skill demand growth YoY',           value:'+312%', color:purple },
              ].map(s=>(
                <div key={s.label} style={{background:card,border:`1px solid ${s.color}20`,borderRadius:18,padding:'24px',textAlign:'center' as const,boxShadow:`0 0 30px ${s.color}08`}}>
                  <div style={{fontSize:30,marginBottom:10}}>{s.icon}</div>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:30,fontWeight:800,color:s.color,lineHeight:1,marginBottom:8,textShadow:`0 0 20px ${s.color}60`}}>{s.value}</div>
                  <div style={{fontSize:12,color:txt2,lineHeight:1.5}}>{s.label}</div>
                </div>
              ))}
            </div>
            </MobSection>

            {/* Sector disruption */}
            <MobSection id="disruption" title="AI Disruption by Sector" icon="🔬">
            <div style={{background:card,border:`1px solid ${border}`,borderRadius:20,padding:'22px 26px',marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
                <GlowDot color={purple}/>
                <div>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,color:'#fff'}}>🔬 AI Disruption by Sector</div>
                  <div style={{fontSize:11,color:txt3,marginTop:2}}>WEF, McKinsey & Goldman Sachs research · India projections</div>
                </div>
              </div>
              <div className="ai-sector-grid">
                {AI_SECTOR_IMPACT.map((s,i)=>{
                  const impactBadge=s.impact==='creating'?'✅ Creating Jobs':s.impact==='disrupting'?'⚠️ Disrupting':'⚡ Mixed'
                  return (
                    <div key={s.sector} className="ai-card" style={{borderColor:`${s.color}20`,animation:`fadeUp .3s ${i*.05}s ease both`}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:20}}>{s.emoji}</span>
                          <span style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,color:txt1}}>{s.sector}</span>
                        </div>
                        <span style={{fontSize:10,fontWeight:700,color:s.color,background:`${s.color}15`,padding:'3px 9px',borderRadius:20,flexShrink:0}}>{impactBadge}</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                        <div style={{flex:1,height:6,background:'rgba(255,255,255,.06)',borderRadius:4,overflow:'hidden'}}>
                          <div style={{width:`${s.score}%`,height:'100%',background:`linear-gradient(90deg,${s.color}60,${s.color})`,borderRadius:4,boxShadow:`0 0 10px ${s.color}50`,transition:'width 1s ease'}}/>
                        </div>
                        <span style={{fontSize:13,fontWeight:700,color:s.color,minWidth:32}}>{s.score}%</span>
                      </div>
                      <div style={{fontSize:12,color:txt2,lineHeight:1.45}}>{s.headline}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            </MobSection>

            {/* Skills */}
            <MobSection id="skills" title="Skill Demand Signals" icon="📡">
            <div style={{background:card,border:`1px solid ${border}`,borderRadius:20,padding:'22px 26px'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                <GlowDot color={cyan}/>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,color:'#fff'}}>📡 Skill Demand Signals</div>
              </div>
              <div style={{fontSize:11,color:txt3,marginBottom:4}}>Which skills to learn · which to move away from</div>
              <div className="skill-grid">
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,padding:'9px 13px',background:`${emerald}10`,border:`1px solid ${emerald}20`,borderRadius:10}}>
                    <span style={{fontSize:15}}>🚀</span>
                    <span style={{fontSize:13,fontWeight:700,color:emerald}}>Rising Skills</span>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {RISING_SKILLS.map((s,i)=>(
                      <div key={s.skill} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 12px',borderRadius:10,background:i%2===0?'rgba(255,255,255,.03)':'transparent',border:`1px solid ${border}`}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          {s.hot&&<span style={{fontSize:11,animation:'pulse 2s infinite'}}>🔥</span>}
                          <span style={{fontSize:13,color:s.hot?txt1:txt2,fontWeight:s.hot?600:400}}>{s.skill}</span>
                        </div>
                        <span style={{fontSize:12,fontWeight:700,color:emerald,background:`${emerald}15`,padding:'2px 8px',borderRadius:8,flexShrink:0}}>{s.growth}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,padding:'9px 13px',background:`${red}10`,border:`1px solid ${red}20`,borderRadius:10}}>
                    <span style={{fontSize:15}}>⚠️</span>
                    <span style={{fontSize:13,fontWeight:700,color:red}}>Declining Demand</span>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {DECLINING_SKILLS.map((s,i)=>(
                      <div key={s.skill} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 12px',borderRadius:10,background:i%2===0?'rgba(255,255,255,.03)':'transparent',border:`1px solid ${border}`}}>
                        <span style={{fontSize:13,color:txt2}}>{s.skill}</span>
                        <span style={{fontSize:12,fontWeight:700,color:red,background:`${red}15`,padding:'2px 8px',borderRadius:8,flexShrink:0}}>{s.drop}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:14,padding:'14px 16px',background:`${purple}10`,border:`1px solid ${purple}25`,borderRadius:12}}>
                    <div style={{fontSize:12,fontWeight:700,color:purple,marginBottom:5}}>💡 See your skill gap</div>
                    <div style={{fontSize:12,color:txt2,lineHeight:1.5,marginBottom:10}}>
                      Upload your CV for an ATS Scan to see how you stack up against current market demand.
                    </div>
                    <button onClick={()=>router.push('/in/career-scan')} style={{padding:'8px 18px',borderRadius:9,background:`linear-gradient(135deg,${purple},#6d28d9)`,color:'#fff',fontSize:12,fontWeight:700,border:'none',cursor:'pointer',boxShadow:`0 4px 16px ${purple}40`}}>
                      Scan My CV →
                    </button>
                  </div>
                </div>
              </div>
              <div style={{marginTop:16,fontSize:11,color:txt3}}>
                ⓘ Trend data from Adzuna, Naukri & LinkedIn India job postings · 2024–26
              </div>
            </div>
            </MobSection>
          </div>
        )}

        {/* ══ TAB 3: NEWS & SIGNALS ══ */}
        {dashTab==='news'&&(
          <div style={{animation:'fadeUp .3s ease both'}}>
            <MobSection id="news" title="India Job Market News" icon="📰">
            <div style={{background:card,border:`1px solid ${border}`,borderRadius:20,padding:'22px 26px'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                <GlowDot color={saffron}/>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,color:'#fff'}}>India Job Market News</div>
              </div>
              <div style={{fontSize:11,color:txt3,marginBottom:20}}>Real-time signals · refreshed every 6h</div>

              {/* Category tabs */}
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
                {NEWS_TABS.map(t=>{
                  const active=newsTab===t.id
                  const color=t.id==='all'?saffron:NEWS_CAT_COLOR[t.id]??saffron
                  return (
                    <button key={t.id} onClick={()=>setNewsTab(t.id)}
                      style={{padding:'7px 16px',borderRadius:20,border:`1px solid ${active?color:border}`,background:active?`${color}15`:'transparent',color:active?color:txt3,fontSize:12,fontWeight:active?700:400,cursor:'pointer',transition:'all .15s',fontFamily:"'DM Sans',sans-serif",boxShadow:active?`0 0 16px ${color}20`:undefined}}>
                      {t.label}
                    </button>
                  )
                })}
              </div>

              {loadingN?(
                <div className="news-grid">{[1,2,3,4,5,6].map(i=><Shimmer key={i} h={190} r={14}/>)}</div>
              ):news.filter(a=>newsTab==='all'||a.category===newsTab).length===0?(
                <div style={{textAlign:'center',padding:'56px 0',color:txt3,fontSize:13}}>
                  <div style={{fontSize:36,marginBottom:12,opacity:.4}}>📭</div>
                  No articles right now. Check back soon.
                </div>
              ):(
                <div className="news-grid">
                  {news.filter(a=>newsTab==='all'||a.category===newsTab).slice(0,9).map((article,i)=>{
                    const catColor=NEWS_CAT_COLOR[article.category]??saffron
                    return (
                      <a key={i} href={article.url} target="_blank" rel="noopener noreferrer"
                        className="news-card" style={{animation:`fadeUp .3s ${i*.05}s ease both`,borderLeft:`3px solid ${catColor}40`}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                          <span style={{fontSize:10,fontWeight:700,color:catColor,background:`${catColor}15`,padding:'3px 9px',borderRadius:20,flexShrink:0}}>
                            {NEWS_CAT_LABEL[article.category]}
                          </span>
                          <span style={{fontSize:10,color:txt3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{article.source}</span>
                        </div>
                        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,color:txt1,lineHeight:1.45,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical' as const,overflow:'hidden'}}>
                          {article.title}
                        </div>
                        {article.description&&(
                          <div style={{fontSize:12,color:txt2,lineHeight:1.5,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as const,overflow:'hidden'}}>
                            {article.description}
                          </div>
                        )}
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'auto',paddingTop:6}}>
                          <span style={{fontSize:11,color:txt3}}>{timeAgo(article.publishedAt)}</span>
                          <span style={{fontSize:11,fontWeight:700,color:catColor}}>Read →</span>
                        </div>
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
            </MobSection>
          </div>
        )}

        {/* Zero credits alert */}
        {!loadingP&&profile?.credits===0&&(
          <div style={{marginTop:16,padding:'16px 22px',background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:red}}>⛔ No credits remaining</div>
              <div style={{fontSize:12,color:'rgba(239,68,68,.7)',marginTop:2}}>Top up to continue using AI features</div>
            </div>
            <button onClick={()=>router.push('/in/account')} style={{padding:'10px 22px',borderRadius:10,background:red,color:'#fff',fontSize:13,fontWeight:700,border:'none',cursor:'pointer',boxShadow:`0 4px 16px ${red}40`}}>
              Top Up Now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
