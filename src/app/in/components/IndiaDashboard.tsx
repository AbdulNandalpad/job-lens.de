'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MarketSnapshot } from '@/app/api/india/market-snapshot/route'
import type { NewsArticle } from '@/app/api/india/news-insights/route'
import type { WorldIndicator } from '@/app/api/india/world-indicators/route'
import CareerIntelPanel from '@/components/CareerIntelPanel'

// ── Design tokens ───────────────────────────────────────
const saffron = '#FF9933'
const cyan    = '#06b6d4'
const purple  = '#8b5cf6'
const emerald = '#10b981'
const red     = '#ef4444'
const orange  = '#f59e0b'

const bg      = '#07111f'
const card    = 'rgba(255,255,255,0.07)'
const cardHov = 'rgba(255,255,255,0.11)'
const border  = 'rgba(255,255,255,0.10)'
const borderH = 'rgba(255,255,255,0.20)'
const txt1    = '#f1f5f9'
const txt2    = '#94a3b8'
const txt3    = '#7a8fa8'

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
  { sector:'Finance & Fintech',emoji:'💰', impact:'mixed',      score:55, headline:'Analysts valued, clerks being automated', color:orange  },
  { sector:'Sales & Marketing',emoji:'📣', impact:'mixed',      score:48, headline:'AI copilots reshaping the role entirely', color:orange  },
  { sector:'BPO / Support',    emoji:'🎧', impact:'disrupting', score:76, headline:'Routine tasks heavily automated by LLMs', color:red     },
  { sector:'Manufacturing',    emoji:'🏭', impact:'disrupting', score:62, headline:'Robotics replacing assembly line workers', color:red     },
  { sector:'Content / Media',  emoji:'✍️', impact:'mixed',      score:50, headline:'GenAI creating and killing roles simultaneously', color:orange },
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
function SectionHeader({icon,title,sub}:{icon:string;title:string;sub:string}) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
      <GlowDot color={saffron}/>
      <div>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,color:'#fff'}}>{icon} {title}</div>
        <div style={{fontSize:11,color:txt3,marginTop:1}}>{sub}</div>
      </div>
    </div>
  )
}

// ── SVG Horizontal Bar Chart ──────────────────────────────────
function BarChart({data}:{data:{label:string;count:number;color:string;emoji?:string;onClick?:()=>void}[]}) {
  const max = Math.max(...data.map(d=>d.count))
  const ROW=38, LEFT=118, BAR=170
  const h = data.length*ROW+16
  return (
    <svg viewBox={`0 0 ${LEFT+BAR+56} ${h}`} style={{width:'100%',display:'block',overflow:'visible'}}>
      {data.map((d,i)=>{
        const bw=Math.round((d.count/max)*BAR)
        const y=i*ROW+8
        return (
          <g key={d.label} onClick={d.onClick} style={d.onClick?{cursor:'pointer'}:undefined}>
            <text x={LEFT-8} y={y+14} fontSize="11.5" fill={txt2} textAnchor="end" dominantBaseline="middle">
              {d.emoji ? `${d.emoji} ` : ''}{d.label}
            </text>
            <rect x={LEFT} y={y+6} width={BAR} height={16} rx={8} fill="rgba(255,255,255,0.04)"/>
            <rect x={LEFT} y={y+6} width={0} height={16} rx={8} fill={d.color} opacity={0.75}>
              <animate attributeName="width" from="0" to={bw} dur="0.7s" begin={`${i*0.08}s`} fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1"/>
            </rect>
            <text x={LEFT+bw+8} y={y+14} fontSize="11" fill={d.color} dominantBaseline="middle" fontWeight="700">
              {fmt(d.count)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Salary Bar ────────────────────────────────────────────────
function SalaryBar({role,min,max,avg,scaleMax}:{role:string;min:number;max:number;avg:number;scaleMax:number}) {
  const minPct=(min/scaleMax)*100
  const maxPct=(max/scaleMax)*100
  const avgPct=(avg/scaleMax)*100
  return (
    <div style={{marginBottom:18}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <span style={{fontSize:12,color:txt2,fontWeight:500}}>{role}</span>
        <span style={{fontSize:12,color:saffron,fontWeight:700}}>₹{avg}L avg</span>
      </div>
      <div style={{position:'relative',height:8,background:'rgba(255,255,255,0.06)',borderRadius:4}}>
        <div style={{position:'absolute',left:`${minPct}%`,width:`${maxPct-minPct}%`,height:'100%',background:`linear-gradient(90deg,${saffron}35,${saffron}70)`,borderRadius:4}}/>
        <div style={{position:'absolute',left:`${avgPct}%`,top:'50%',transform:'translate(-50%,-50%)',width:14,height:14,borderRadius:'50%',background:saffron,border:`2.5px solid ${bg}`,boxShadow:`0 0 8px ${saffron}90`}}/>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
        <span style={{fontSize:10,color:txt3}}>₹{min}L min</span>
        <span style={{fontSize:10,color:txt3}}>₹{max}L max</span>
      </div>
    </div>
  )
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
  const [newsTab,    setNewsTab]    = useState<NewsTab>('all')
  const [sectorsExpanded, setSectorsExpanded] = useState(false)
  const [salaryExpanded,  setSalaryExpanded]  = useState(false)
  const [aiExpanded,      setAiExpanded]      = useState(false)
  const [hoveredCat, setHoveredCat] = useState<string|null>(null)

  useEffect(()=>{
    fetch('/api/user/profile').then(r=>r.json()).then(setProfile).finally(()=>setLoadingP(false))
    fetch('/api/india/market-snapshot').then(r=>r.json()).then(setMarket).finally(()=>setLoadingM(false))
    fetch('/api/india/news-insights').then(r=>r.json()).then(d=>setNews(d.articles??[])).finally(()=>setLoadingN(false))
    fetch('/api/india/world-indicators').then(r=>r.json()).then(setIndicators).finally(()=>setLoadingI(false))
  },[])

  const hour      = new Date().getHours()
  const greeting  = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening'
  const firstName = profile?.full_name?.split(' ')[0]??''

  function searchJobs(q:string) {
    router.push(`/in/jobs?q=${encodeURIComponent(q)}`)
  }

  const totalJobs = market?.categories.reduce((s,c)=>s+c.count,0)??0
  const topCat    = market?.categories[0]
  const topCity   = market?.topCities[0]
  const topRole   = market?.trendingRoles[0]
  const maxCat    = topCat?.count??1

  const allSectors    = market?.categories ?? []
  const visibleSectors  = sectorsExpanded ? allSectors : allSectors.slice(0,5)
  const visibleSalaries = salaryExpanded  ? SALARY_DATA : SALARY_DATA.slice(0,5)

  const creating   = AI_SECTOR_IMPACT.filter(x=>x.impact==='creating')
  const mixed      = AI_SECTOR_IMPACT.filter(x=>x.impact==='mixed')
  const disrupting = AI_SECTOR_IMPACT.filter(x=>x.impact==='disrupting')

  const cardStyle: React.CSSProperties = {background:card,border:`1px solid ${border}`,borderRadius:20,padding:'22px 24px'}

  return (
    <div style={{minHeight:'100vh',background:bg,fontFamily:"'DM Sans',sans-serif",color:txt1}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700;800&display=swap');
        @keyframes shimmer {0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeUp  {from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes pulse   {0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes glow    {0%,100%{box-shadow:0 0 20px rgba(255,153,51,.15)}50%{box-shadow:0 0 40px rgba(255,153,51,.35)}}
        *{box-sizing:border-box}

        .dash-page {
          background-color:${bg};
          background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);
          background-size:48px 48px;
        }
        .dash-hero {
          background:linear-gradient(135deg,#0a1628 0%,#0d1f14 60%,#0a0d1a 100%);
          padding:32px 28px 36px;
          position:relative;overflow:hidden;
          border-bottom:1px solid ${border};
        }
        .kpi-grid {display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
        .kpi-card {background:${card};border:1px solid ${border};border-radius:16px;padding:20px;transition:all .2s;animation:fadeUp .4s ease both}
        .kpi-card:hover{background:${cardHov};border-color:${borderH}}
        .two-col   {display:grid;grid-template-columns:1fr 1fr;gap:18px}
        .skills-cols {display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .macro-grid {display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .ai-heat {display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .news-grid {display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px}
        .news-card {
          background:${card};border:1px solid ${border};border-radius:16px;
          padding:18px;display:flex;flex-direction:column;gap:11px;
          transition:all .2s;cursor:pointer;text-decoration:none;color:inherit;
        }
        .news-card:hover{background:${cardHov};border-color:${borderH};transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.4)}
        .expand-btn{background:none;border:1px solid rgba(255,255,255,.1);color:${txt2};border-radius:8px;padding:6px 18px;font-size:12px;cursor:pointer;margin-top:14px;width:100%;font-family:inherit;transition:all .15s}
        .expand-btn:hover{border-color:rgba(255,153,51,.4);color:${saffron}}
        .goto-app-btn{display:flex;align-items:center;gap:7px;padding:10px 20px;border-radius:12px;border:1px solid rgba(255,153,51,.35);background:rgba(255,153,51,.1);color:${saffron};font-size:13px;font-weight:700;cursor:pointer;font-family:"Outfit",sans-serif;transition:all .2s}
        .goto-app-btn:hover{background:rgba(255,153,51,.18);border-color:rgba(255,153,51,.6);transform:translateY(-1px)}

        @media(max-width:900px){
          .kpi-grid    {grid-template-columns:repeat(2,1fr)!important}
          .two-col     {grid-template-columns:1fr!important}
          .skills-cols {grid-template-columns:1fr!important}
          .ai-heat     {grid-template-columns:1fr!important}
          .macro-grid  {grid-template-columns:repeat(2,1fr)!important}
          .news-grid   {grid-template-columns:repeat(2,1fr)!important}
        }
        @media(max-width:600px){
          .dash-hero  {padding:20px 16px 28px!important}
          .kpi-grid   {grid-template-columns:1fr 1fr!important;gap:10px!important}
          .macro-grid {grid-template-columns:1fr 1fr!important}
          .news-grid  {grid-template-columns:1fr!important}
          .hero-top   {flex-direction:column!important;align-items:flex-start!important}
        }
        @media(max-width:380px){
          .kpi-grid{grid-template-columns:1fr!important}
        }
      `}</style>

      {/* ── HERO ── */}
      <div className="dash-hero">
        <div style={{position:'absolute',top:-120,right:-80,width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(255,153,51,.12) 0%,transparent 65%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-140,left:-100,width:440,height:440,borderRadius:'50%',background:'radial-gradient(circle,rgba(16,185,129,.08) 0%,transparent 65%)',pointerEvents:'none'}}/>

        <div style={{maxWidth:1100,margin:'0 auto',position:'relative'}}>
          <div className="hero-top" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>

            {/* Brand + greeting */}
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <GlowDot color={emerald}/>
                <span style={{fontSize:11,color:txt3,letterSpacing:.8,textTransform:'uppercase'}}>
                  {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
                </span>
              </div>
              <h1 style={{margin:0,fontFamily:"'Outfit',sans-serif",fontSize:'clamp(20px,4.5vw,30px)',fontWeight:800,color:'#fff',letterSpacing:-.5}}>
                {greeting}{firstName?`, ${firstName}`:''} 👋
              </h1>
              <p style={{margin:'5px 0 0',fontSize:13,color:txt2}}>Your India career intelligence dashboard</p>
            </div>

            {/* Right controls */}
            <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
              {/* Credits */}
              {!loadingP && profile && (
                <div onClick={()=>router.push('/in/account')}
                  style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,153,51,.1)',border:'1px solid rgba(255,153,51,.28)',borderRadius:12,padding:'8px 16px',cursor:'pointer',animation:'glow 3s infinite'}}>
                  <span style={{fontSize:18}}>⚡</span>
                  <div>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,color:saffron,lineHeight:1}}>{profile.credits}</div>
                    <div style={{fontSize:10,color:'rgba(255,153,51,.55)',letterSpacing:.5}}>CREDITS</div>
                  </div>
                </div>
              )}
              {/* Go to App */}
              <button className="goto-app-btn" onClick={()=>router.push('/in/career-scan')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                Go to App
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── ANALYTICS BODY ── */}
      <div className="dash-page" style={{maxWidth:1100,margin:'0 auto',padding:'28px 20px 80px'}}>

        {/* ── Career Intelligence Panel ── */}
        <CareerIntelPanel accentColor={saffron} market="in" />

        {/* ── KPI snapshot ── */}
        <div className="kpi-grid">
          {[
            {label:'Open Roles',     value:loadingM?null:fmt(totalJobs),                       sub:'across all sectors',      color:saffron, icon:'📋'},
            {label:'Hottest Sector', value:loadingM?null:(topCat?.label??'—'),                 sub:`${fmt(topCat?.count??0)} listings`, color:cyan,    icon:'🔥'},
            {label:'Top City',       value:loadingM?null:(topCity?.city??'—'),                 sub:`${fmt(topCity?.count??0)} openings`,color:emerald, icon:'📍'},
            {label:'Most In-Demand', value:loadingM?null:(topRole?.title?.split(' ')[0]??'—'), sub:'trending role right now', color:purple,  icon:'⭐'},
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

        {/* ── 1. Rising + Declining Skills ── */}
        <div style={{marginBottom:20}}>
          <div className="skills-cols">
            <div style={cardStyle}>
              <SectionHeader icon="🚀" title="Rising Skills" sub="YoY demand growth · India market"/>
              {RISING_SKILLS.map(s=>(
                <div key={s.skill} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:`1px solid rgba(255,255,255,.05)`}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    {s.hot&&<span style={{fontSize:9,fontWeight:700,color:orange,background:`${orange}20`,padding:'1px 6px',borderRadius:8,letterSpacing:.3}}>HOT</span>}
                    <span style={{fontSize:13,color:txt2}}>{s.skill}</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:emerald}}>{s.growth}</span>
                </div>
              ))}
            </div>
            <div style={cardStyle}>
              <SectionHeader icon="📉" title="Declining Demand" sub="Drop in job demand · India market"/>
              {DECLINING_SKILLS.map(s=>(
                <div key={s.skill} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:`1px solid rgba(255,255,255,.05)`}}>
                  <span style={{fontSize:13,color:txt2}}>{s.skill}</span>
                  <span style={{fontSize:13,fontWeight:700,color:red}}>{s.drop}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 2. Jobs by Sector + Salary Ranges ── */}
        <div style={{marginBottom:20}}>
          <div className="two-col">
            {/* Sector bar chart */}
            <div style={cardStyle}>
              <SectionHeader icon="🇮🇳" title="Jobs by Sector" sub="Adzuna India · refreshed every 4h · click to search"/>
              {loadingM ? (
                <div style={{display:'flex',flexDirection:'column',gap:10}}>{[1,2,3,4,5].map(i=><Shimmer key={i} h={22} r={6}/>)}</div>
              ) : (
                <>
                  <BarChart data={visibleSectors.map(c=>({...c,onClick:()=>searchJobs(CATEGORY_SEARCH[c.label]??c.label)}))}/>
                  {allSectors.length > 5 && (
                    <button className="expand-btn" onClick={()=>setSectorsExpanded(p=>!p)}>
                      {sectorsExpanded ? 'Show less ▲' : `Show all ${allSectors.length} ▼`}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Salary guide */}
            <div style={cardStyle}>
              <SectionHeader icon="💸" title="India Salary Guide 2026" sub="Annual CTC in ₹ LPA · industry benchmarks"/>
              {visibleSalaries.map(s=>(
                <SalaryBar key={s.role} role={s.role} min={s.min} max={s.max} avg={s.avg} scaleMax={50}/>
              ))}
              {SALARY_DATA.length > 5 && (
                <button className="expand-btn" onClick={()=>setSalaryExpanded(p=>!p)}>
                  {salaryExpanded ? 'Show less ▲' : `Show all ${SALARY_DATA.length} ▼`}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. India Macro Indicators ── */}
        <div style={{...cardStyle, marginBottom:20}}>
          <SectionHeader icon="🌐" title="India Macro Indicators" sub="World Bank · updated annually"/>
          <div className="macro-grid">
            {loadingI?[1,2,3,4].map(i=><Shimmer key={i} h={80} r={12}/>):
              indicators.map(ind=>{
                const good=(ind.label==='Unemployment Rate'||ind.label==='Youth Unemployment')?ind.trend==='down':ind.trend==='up'
                const tc=ind.trend==='flat'?txt3:good?emerald:red
                const arr=ind.trend==='up'?'↑':ind.trend==='down'?'↓':'→'
                return (
                  <div key={ind.label} style={{background:cardHov,border:`1px solid ${border}`,borderRadius:14,padding:'16px 18px',borderTop:`2px solid ${tc}`}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                      <span style={{fontSize:22}}>{ind.icon}</span>
                      <span style={{fontSize:12,fontWeight:700,color:tc,background:`${tc}18`,padding:'2px 8px',borderRadius:20}}>{arr}</span>
                    </div>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:28,fontWeight:800,color:ind.value!==null?tc:txt3,lineHeight:1}}>
                      {ind.value!==null?`${ind.value}${ind.unit}`:'—'}
                    </div>
                    <div style={{fontSize:12,color:txt2,marginTop:6}}>{ind.label}</div>
                    {ind.year&&<div style={{fontSize:10,color:txt3,marginTop:2}}>{ind.year} data</div>}
                  </div>
                )
              })
            }
          </div>
        </div>

        {/* ── 4. AI Impact Heat Map ── */}
        <div style={{...cardStyle, marginBottom:20}}>
          {/* Collapsible header */}
          <div onClick={()=>setAiExpanded(p=>!p)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',userSelect:'none'}}>
            <SectionHeader icon="🤖" title="AI Impact by Sector" sub="India 2026 · Green = creating jobs · Red = disrupting roles"/>
            <span style={{fontSize:18,color:txt2,marginTop:-12,flexShrink:0}}>{aiExpanded?'▲':'▼'}</span>
          </div>
          {aiExpanded && (
            <div className="ai-heat" style={{marginTop:8}}>
              {/* Creating */}
              <div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
                  <span style={{width:9,height:9,borderRadius:'50%',background:emerald,display:'inline-block',boxShadow:`0 0 7px ${emerald}`}}/>
                  <span style={{fontSize:12,fontWeight:700,color:emerald}}>Creating Jobs</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {creating.map(x=>(
                    <div key={x.sector} style={{background:`${emerald}08`,border:`1px solid ${emerald}28`,borderRadius:12,padding:'11px 13px'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:14}}>{x.emoji}</span>
                        <div style={{display:'flex',gap:3}}>
                          {Array.from({length:5}).map((_,i)=>(
                            <div key={i} style={{width:6,height:6,borderRadius:1,background:i<Math.round(x.score/20)?emerald:'rgba(255,255,255,.1)'}}/>
                          ))}
                        </div>
                      </div>
                      <div style={{fontSize:12,fontWeight:600,color:txt1}}>{x.sector}</div>
                      <div style={{fontSize:11,color:txt3,marginTop:2}}>{x.headline}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Mixed */}
              <div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
                  <span style={{width:9,height:9,borderRadius:'50%',background:orange,display:'inline-block',boxShadow:`0 0 7px ${orange}`}}/>
                  <span style={{fontSize:12,fontWeight:700,color:orange}}>Mixed Impact</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {mixed.map(x=>(
                    <div key={x.sector} style={{background:`${orange}08`,border:`1px solid ${orange}28`,borderRadius:12,padding:'11px 13px'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:14}}>{x.emoji}</span>
                        <div style={{display:'flex',gap:3}}>
                          {Array.from({length:5}).map((_,i)=>(
                            <div key={i} style={{width:6,height:6,borderRadius:1,background:i<Math.round(x.score/20)?orange:'rgba(255,255,255,.1)'}}/>
                          ))}
                        </div>
                      </div>
                      <div style={{fontSize:12,fontWeight:600,color:txt1}}>{x.sector}</div>
                      <div style={{fontSize:11,color:txt3,marginTop:2}}>{x.headline}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Disrupting */}
              <div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
                  <span style={{width:9,height:9,borderRadius:'50%',background:red,display:'inline-block',boxShadow:`0 0 7px ${red}`}}/>
                  <span style={{fontSize:12,fontWeight:700,color:red}}>Disrupting Jobs</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {disrupting.map(x=>(
                    <div key={x.sector} style={{background:`${red}08`,border:`1px solid ${red}28`,borderRadius:12,padding:'11px 13px'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:14}}>{x.emoji}</span>
                        <div style={{display:'flex',gap:3}}>
                          {Array.from({length:5}).map((_,i)=>(
                            <div key={i} style={{width:6,height:6,borderRadius:1,background:i<Math.round(x.score/20)?red:'rgba(255,255,255,.1)'}}/>
                          ))}
                        </div>
                      </div>
                      <div style={{fontSize:12,fontWeight:600,color:txt1}}>{x.sector}</div>
                      <div style={{fontSize:11,color:txt3,marginTop:2}}>{x.headline}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 5. News & Signals ── */}
        <div style={cardStyle}>
          <SectionHeader icon="📰" title="India Job Market News" sub="Real-time signals · refreshed every 6h"/>
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
