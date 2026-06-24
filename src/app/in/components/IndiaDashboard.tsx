'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MarketSnapshot } from '@/app/api/india/market-snapshot/route'
import type { NewsArticle } from '@/app/api/india/news-insights/route'
import type { WorldIndicator } from '@/app/api/india/world-indicators/route'
import CareerIntelPanel from '@/components/CareerIntelPanel'
import SvgIcon, { getIcon, type IconName } from '@/components/SvgIcon'
import { createClient } from '@/lib/supabase'
import { useDashWidgets } from '@/lib/useDashWidgets'
import { MARKET } from '@/lib/constants'

// Maps API emoji strings → SVG icon keys for world indicator cards
const INDICATOR_ICON_MAP: Record<string, IconName> = {
  '📈': 'trending-up', '📉': 'trending-down', '🎓': 'graduate',
  '👷': 'worker', '💶': 'euro', '🏠': 'home', '🌐': 'globe',
}

// ── Design tokens ───────────────────────────────────────
const saffron = '#FF9933'
const cyan    = '#06b6d4'
const purple  = '#8b5cf6'
const emerald = '#10b981'
const red     = '#ef4444'
const orange  = '#f59e0b'

const bg      = '#f8fafc'
const card    = '#ffffff'
const cardHov = '#f1f5f9'
const border  = '#e2e8f0'
const borderH = '#cbd5e1'
const txt1    = '#0f172a'
const txt2    = '#475569'
const txt3    = '#64748b'

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
const AI_SECTOR_IMPACT: { sector:string; icon:IconName; impact:string; score:number; headline:string; color:string }[] = [
  { sector:'IT & Software',    icon:'laptop',     impact:'creating',   score:88, headline:'AI engineering roles up 240% YoY',       color:emerald },
  { sector:'Data & Analytics', icon:'chart-bar',  impact:'creating',   score:82, headline:'Data scientists & MLOps in huge demand',  color:emerald },
  { sector:'Healthcare',       icon:'hospital',   impact:'creating',   score:70, headline:'Health-tech and AI diagnostics booming',  color:emerald },
  { sector:'Finance & Fintech',icon:'coin',       impact:'mixed',      score:55, headline:'Analysts valued, clerks being automated', color:orange  },
  { sector:'Sales & Marketing',icon:'megaphone',  impact:'mixed',      score:48, headline:'AI copilots reshaping the role entirely', color:orange  },
  { sector:'BPO / Support',    icon:'headphone',  impact:'disrupting', score:76, headline:'Routine tasks heavily automated by LLMs', color:red     },
  { sector:'Manufacturing',    icon:'factory',    impact:'disrupting', score:62, headline:'Robotics replacing assembly line workers', color:red     },
  { sector:'Content / Media',  icon:'pencil',     impact:'mixed',      score:50, headline:'GenAI creating and killing roles simultaneously', color:orange },
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
const NEWS_CAT_LABEL: Record<string,string>  = { ai:'AI', hiring:'Hiring', market:'Market' }
const NEWS_TABS: { id:NewsTab; label:string }[] = [
  { id:'all',     label:'All News'       },
  { id:'ai',      label:'AI Impact'      },
  { id:'hiring',  label:'Hiring & Firing' },
  { id:'market',  label:'Market News'    },
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
function SourceTag({sources}:{sources:{label:string;url?:string}[]}) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginTop:16,paddingTop:12,borderTop:'rgba(255,255,255,0.07) 1px solid'}}>
      <span style={{fontSize:10,color:'rgba(255,255,255,0.25)',letterSpacing:0.4,flexShrink:0}}>Sources:</span>
      {sources.map((s,i)=>(
        <span key={i} style={{display:'flex',alignItems:'center',gap:3}}>
          {s.url
            ? <a href={s.url} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:'rgba(255,153,51,0.6)',textDecoration:'none',borderBottom:'1px dotted rgba(255,153,51,0.3)'}}>{s.label}</a>
            : <span style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>{s.label}</span>
          }
          {i<sources.length-1 && <span style={{fontSize:10,color:'rgba(255,255,255,0.15)'}}>·</span>}
        </span>
      ))}
    </div>
  )
}

function SectionHeader({icon,title,sub}:{icon:string;title:string;sub:string}) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
      <GlowDot color={saffron}/>
      <div>
        <div style={{display:'flex',alignItems:'center',gap:7,fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,color:'#fff'}}>
          {getIcon(icon,14,'#fff')}
          {title}
        </div>
        <div style={{fontSize:11,color:txt3,marginTop:1}}>{sub}</div>
      </div>
    </div>
  )
}

// ── SVG Horizontal Bar Chart ──────────────────────────────────
function BarChart({data}:{data:{label:string;count:number;color:string;onClick?:()=>void}[]}) {
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
              {d.label}
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
  const [hoveredCat,    setHoveredCat]    = useState<string|null>(null)
  const [showCustomize, setShowCustomize] = useState(false)

  const { isVisible, widgets, toggle, resetDefaults } = useDashWidgets(MARKET.in)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/in')
    router.refresh()
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
          background-image:linear-gradient(rgba(0,0,0,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.04) 1px,transparent 1px);
          background-size:48px 48px;
        }
        .dash-hero {
          background:linear-gradient(135deg,#fff8f0 0%,#fef3e8 60%,#f8fafc 100%);
          padding:32px 28px 36px;
          position:relative;overflow:hidden;
          border-bottom:1px solid ${border};
        }
        .kpi-grid {display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin-bottom:24px}
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
        .goto-app-btn{display:flex;align-items:center;gap:7px;padding:10px 20px;border-radius:12px;border:1px solid rgba(255,153,51,.6);background:linear-gradient(135deg,rgba(255,153,51,.2),rgba(255,153,51,.1));color:${saffron};font-size:13px;font-weight:700;cursor:pointer;font-family:"Outfit",sans-serif;transition:all .2s;animation:glow 3s infinite}
        .goto-app-btn:hover{background:linear-gradient(135deg,rgba(255,153,51,.35),rgba(255,153,51,.2));border-color:${saffron};transform:translateY(-1px);box-shadow:0 4px 20px rgba(255,153,51,.35)}

        @media(max-width:1100px){
          .kpi-grid    {grid-template-columns:repeat(3,1fr)!important}
        }
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
        .start-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .more-tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
        @media(max-width:768px){.start-cards{grid-template-columns:1fr!important}}
        @media(max-width:500px){.more-tools{grid-template-columns:repeat(2,1fr)!important}}
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
                {greeting}{firstName?`, ${firstName}`:''}
              </h1>
              <p style={{margin:'5px 0 0',fontSize:13,color:txt2}}>Your India career intelligence dashboard</p>
            </div>

            {/* Right controls */}
            <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
              {/* Credits */}
              {!loadingP && profile && (
                <div onClick={()=>router.push('/in/account')}
                  style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,153,51,.1)',border:'1px solid rgba(255,153,51,.28)',borderRadius:12,padding:'8px 16px',cursor:'pointer',animation:'glow 3s infinite'}}>
                  <SvgIcon name="lightning" size={18} color={saffron} />
                  <div>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,color:saffron,lineHeight:1}}>{profile.credits}</div>
                    <div style={{fontSize:10,color:'rgba(255,153,51,.55)',letterSpacing:.5}}>CREDITS</div>
                  </div>
                </div>
              )}
              {/* Customize */}
              <button
                onClick={() => setShowCustomize(p => !p)}
                style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderRadius:12,border:`1px solid ${showCustomize ? saffron+'80' : 'rgba(255,255,255,.12)'}`,background:showCustomize ? saffron+'18' : 'rgba(255,255,255,.04)',color:showCustomize ? saffron : txt3,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",transition:'all .2s'}}>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10" cy="10" r="3"/><path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.5 3.5l1.4 1.4M15.1 15.1l1.4 1.4M3.5 16.5l1.4-1.4M15.1 4.9l1.4-1.4"/></svg>
                Customize
              </button>

              {/* Go to App */}
              <button className="goto-app-btn" onClick={()=>router.push('/in/career-scan')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                Go to App
              </button>

              {/* Sign Out */}
              <button onClick={signOut}
                style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderRadius:12,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.04)',color:txt3,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",transition:'all .2s'}}>
                ↩ Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── CUSTOMIZE PANEL ── */}
      {showCustomize && (
        <div style={{background:`rgba(255,153,51,.06)`,borderBottom:`1px solid rgba(255,153,51,.15)`,padding:'18px 28px'}}>
          <div style={{maxWidth:1100,margin:'0 auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:700,color:'#fff'}}>Choose your widgets</span>
              <button onClick={resetDefaults} style={{fontSize:11,color:txt3,background:'none',border:'1px solid rgba(255,255,255,.12)',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>Clear all</button>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {widgets.map(w => {
                const on = isVisible(w.id)
                return (
                  <button key={w.id} onClick={() => toggle(w.id)}
                    style={{display:'flex',alignItems:'center',gap:7,padding:'8px 14px',borderRadius:20,border:`1px solid ${on ? saffron+'60' : 'rgba(255,255,255,.12)'}`,background:on ? saffron+'18' : 'rgba(255,255,255,.04)',color:on ? saffron : txt3,fontSize:12,fontWeight:on ? 700 : 400,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",transition:'all .15s'}}>
                    <SvgIcon name={w.icon as Parameters<typeof SvgIcon>[0]['name']} size={13} color="currentColor" />
                    {w.label}
                    {on && <span style={{fontSize:10,opacity:.7}}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYTICS BODY ── */}
      <div className="dash-page" style={{maxWidth:1100,margin:'0 auto',padding:'28px 20px 80px'}}>

        {/* ── Start Here — 3 prominent action cards ── */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,color:txt3,letterSpacing:1,textTransform:'uppercase' as const,marginBottom:14,fontWeight:600}}>
            Where would you like to start?
          </div>
          <div className="start-cards">
            {([
              {
                step:'STEP 1', color:saffron, href:'/in/career-scan', icon:'target' as IconName,
                title:'ATS Score',
                desc:'Paste your CV and any job description. Get an instant ATS score, keyword gaps and fix suggestions.',
                cta:'Get my ATS score →',
              },
              {
                step:'STEP 2', color:emerald, href:'/in/jobs', icon:'search' as IconName,
                title:'Find Jobs',
                desc:'AI job search across Bangalore, Hyderabad, Mumbai and more — matched to your profile.',
                cta:'Browse jobs →',
              },
              {
                step:'STEP 3', color:purple, href:'/in/cv-builder', icon:'document' as IconName,
                title:'Tailor & Apply',
                desc:'Rewrite your CV and cover letter for any job description — ATS-optimised in one click.',
                cta:'Open CV Builder →',
              },
            ]).map(card=>(
              <button key={card.href} onClick={()=>router.push(card.href)}
                style={{background:`linear-gradient(135deg,${card.color}18,${card.color}08)`,border:`1.5px solid ${card.color}40`,borderRadius:18,padding:'24px 20px',cursor:'pointer',textAlign:'left' as const,fontFamily:"'DM Sans',sans-serif",transition:'all .2s',width:'100%'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=card.color;e.currentTarget.style.background=`linear-gradient(135deg,${card.color}28,${card.color}12)`}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=`${card.color}40`;e.currentTarget.style.background=`linear-gradient(135deg,${card.color}18,${card.color}08)`}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                  <div style={{width:44,height:44,borderRadius:12,background:`${card.color}20`,border:`1px solid ${card.color}30`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <SvgIcon name={card.icon} size={22} color={card.color}/>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,color:card.color,background:`${card.color}15`,padding:'3px 10px',borderRadius:20,letterSpacing:0.5}}>{card.step}</span>
                </div>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:700,color:txt1,marginBottom:6}}>{card.title}</div>
                <div style={{fontSize:13,color:txt2,lineHeight:1.55}}>{card.desc}</div>
                <div style={{marginTop:16,fontSize:12,color:card.color,fontWeight:600}}>{card.cta}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── More Tools ── */}
        <div style={{...cardStyle,marginBottom:20}}>
          <div style={{fontSize:11,color:txt3,letterSpacing:1,textTransform:'uppercase' as const,marginBottom:12,fontWeight:600}}>
            More Tools
          </div>
          <div className="more-tools">
            {([
              {label:'Cover Letter',    icon:'email'    as IconName, href:'/in/cover-letter'},
              {label:'Auto Apply',      icon:'bot'      as IconName, href:'/in/auto-apply'},
              {label:'Interview Prep',  icon:'mic'      as IconName, href:'/in/interview'},
              {label:'Salary Sim.',     icon:'coin'     as IconName, href:'/in/salary-sim'},
              {label:'Tracker',         icon:'clipboard' as IconName,href:'/in/tracker'},
              {label:'Work Visa DE',    icon:'passport'  as IconName, href:'/in/visa'},
            ] as {label:string;icon:IconName;href:string}[]).map(a=>(
              <button key={a.href} onClick={()=>router.push(a.href)}
                style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:10,border:`1px solid ${border}`,background:'rgba(255,255,255,.04)',color:txt2,fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",transition:'all .15s',textAlign:'left' as const}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=saffron+'60';e.currentTarget.style.color='#fff'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=border;e.currentTarget.style.color=txt2}}>
                <SvgIcon name={a.icon} size={15} color="currentColor"/>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Career Intelligence Panel ── */}
        {isVisible('career_intel') && <CareerIntelPanel accentColor={saffron} market="in" />}

        {/* ── KPI snapshot ── */}
        {isVisible('kpi') && <div className="kpi-grid">
          {([
            {label:'Open Roles',        value:loadingM?null:fmt(totalJobs),                       sub:'across all sectors',       color:saffron, icon:'clipboard'   as IconName},
            {label:'Hottest Sector',    value:loadingM?null:(topCat?.label??'—'),                 sub:`${fmt(topCat?.count??0)} listings`,  color:cyan,    icon:'flame'       as IconName},
            {label:'Top City',          value:loadingM?null:(topCity?.city??'—'),                 sub:`${fmt(topCity?.count??0)} openings`, color:emerald, icon:'pin'         as IconName},
            {label:'Most In-Demand',    value:loadingM?null:(topRole?.title?.split(' ')[0]??'—'), sub:'trending role right now',  color:purple,  icon:'star'        as IconName},
            {label:'Top Skill',         value:'Gen AI',                                           sub:'+312% YoY demand',         color:orange,  icon:'rocket'      as IconName},
            {label:'Salary Growth',     value:'9.4%',                                             sub:'avg CTC increase 2025–26', color:red,     icon:'trending-up' as IconName},
          ] as {label:string;value:string|null;sub:string;color:string;icon:IconName}[]).map(k=>(
            <div key={k.label} className="kpi-card">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <span style={{fontSize:10,fontWeight:600,color:txt3,letterSpacing:.6,textTransform:'uppercase'}}>{k.label}</span>
                <div style={{width:32,height:32,borderRadius:9,background:`${k.color}15`,border:`1px solid ${k.color}25`,display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name={k.icon} size={15} color={k.color} /></div>
              </div>
              {k.value===null
                ?<Shimmer h={28} r={6} w="70%"/>
                :<div style={{fontFamily:"'Outfit',sans-serif",fontSize:24,fontWeight:800,color:k.color,lineHeight:1,letterSpacing:-.5}}>{k.value}</div>
              }
              <div style={{fontSize:11,color:txt3,marginTop:6}}>{k.sub}</div>
            </div>
          ))}
        </div>}

        {/* ── 1. Rising + Declining Skills ── */}
        {isVisible('skills') && <div style={{marginBottom:20}}>
          <div className="skills-cols">
            <div style={cardStyle}>
              <SectionHeader icon="rocket" title="Rising Skills" sub="YoY demand growth · India market"/>
              {RISING_SKILLS.map(s=>(
                <div key={s.skill} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:`1px solid rgba(255,255,255,.05)`}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    {s.hot&&<span style={{fontSize:9,fontWeight:700,color:orange,background:`${orange}20`,padding:'1px 6px',borderRadius:8,letterSpacing:.3}}>HOT</span>}
                    <span style={{fontSize:13,color:txt2}}>{s.skill}</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:emerald}}>{s.growth}</span>
                </div>
              ))}
              <SourceTag sources={[
                {label:'LinkedIn Talent Insights 2025',url:'https://business.linkedin.com/talent-solutions/talent-insights'},
                {label:'NASSCOM Tech Talent Report 2025',url:'https://nasscom.in/'},
              ]}/>
            </div>
            <div style={cardStyle}>
              <SectionHeader icon="trending-down" title="Declining Demand" sub="Drop in job demand · India market"/>
              {DECLINING_SKILLS.map(s=>(
                <div key={s.skill} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:`1px solid rgba(255,255,255,.05)`}}>
                  <span style={{fontSize:13,color:txt2}}>{s.skill}</span>
                  <span style={{fontSize:13,fontWeight:700,color:red}}>{s.drop}</span>
                </div>
              ))}
              <SourceTag sources={[
                {label:'LinkedIn Talent Insights 2025',url:'https://business.linkedin.com/talent-solutions/talent-insights'},
                {label:'WEF Future of Jobs 2025',url:'https://www.weforum.org/reports/the-future-of-jobs-report-2025'},
              ]}/>
            </div>
          </div>
        </div>}

        {/* ── 2. Jobs by Sector + Salary Ranges ── */}
        {isVisible('sectors_salary') && <div style={{marginBottom:20}}>
          <div className="two-col">
            {/* Sector bar chart */}
            <div style={cardStyle}>
              <SectionHeader icon="clipboard" title="Jobs by Sector" sub="Adzuna India · refreshed every 4h · click to search"/>
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
              <SectionHeader icon="cash" title="India Salary Guide 2026" sub="Annual CTC in ₹ LPA · industry benchmarks"/>
              {visibleSalaries.map(s=>(
                <SalaryBar key={s.role} role={s.role} min={s.min} max={s.max} avg={s.avg} scaleMax={50}/>
              ))}
              {SALARY_DATA.length > 5 && (
                <button className="expand-btn" onClick={()=>setSalaryExpanded(p=>!p)}>
                  {salaryExpanded ? 'Show less ▲' : `Show all ${SALARY_DATA.length} ▼`}
                </button>
              )}
              <SourceTag sources={[
                {label:'AmbitionBox Salary Report 2025',url:'https://www.ambitionbox.com/salaries'},
                {label:'Glassdoor India Salaries',url:'https://www.glassdoor.co.in/Salaries/index.htm'},
              ]}/>
            </div>
          </div>
        </div>}

        {/* ── 3. India Macro Indicators ── */}
        {isVisible('macro') && <div style={{...cardStyle, marginBottom:20}}>
          <SectionHeader icon="globe" title="India Macro Indicators" sub="World Bank · updated annually"/>
          <div className="macro-grid">
            {loadingI?[1,2,3,4].map(i=><Shimmer key={i} h={80} r={12}/>):
              indicators.map(ind=>{
                const good=(ind.label==='Unemployment Rate'||ind.label==='Youth Unemployment')?ind.trend==='down':ind.trend==='up'
                const tc=ind.trend==='flat'?txt3:good?emerald:red
                const arr=ind.trend==='up'?'↑':ind.trend==='down'?'↓':'→'
                return (
                  <div key={ind.label} style={{background:cardHov,border:`1px solid ${border}`,borderRadius:14,padding:'16px 18px',borderTop:`2px solid ${tc}`}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                      <SvgIcon name={INDICATOR_ICON_MAP[ind.icon] ?? 'trending-up'} size={22} color={tc} />
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
        </div>}

        {/* ── 4. AI Impact Heat Map ── */}
        {isVisible('ai_impact') && <div style={{...cardStyle, marginBottom:20}}>
          {/* Collapsible header */}
          <div onClick={()=>setAiExpanded(p=>!p)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',userSelect:'none'}}>
            <SectionHeader icon="bot" title="AI Impact by Sector" sub="India 2026 · Green = creating jobs · Red = disrupting roles"/>
            <span style={{fontSize:18,color:txt2,marginTop:-12,flexShrink:0}}>{aiExpanded?'▲':'▼'}</span>
          </div>
          {aiExpanded && (
            <div>
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
                        <SvgIcon name={x.icon} size={16} color={x.color} />
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
                        <SvgIcon name={x.icon} size={16} color={x.color} />
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
                        <SvgIcon name={x.icon} size={16} color={x.color} />
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
            <SourceTag sources={[
              {label:'McKinsey Global Institute 2025',url:'https://www.mckinsey.com/mgi/our-research'},
              {label:'WEF Future of Jobs 2025',url:'https://www.weforum.org/reports/the-future-of-jobs-report-2025'},
              {label:'NASSCOM AI Adoption Report 2025',url:'https://nasscom.in/'},
            ]}/>
            </div>
          )}
        </div>}

        {/* ── 5. News & Signals ── */}
        {isVisible('news') && <div style={cardStyle}>
          <SectionHeader icon="news" title="India Job Market News" sub="Real-time signals · refreshed every 6h"/>
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
              <div style={{marginBottom:12,opacity:.4,display:'flex',justifyContent:'center'}}><SvgIcon name="news" size={36} color={txt3} /></div>
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
        </div>}

        {/* Zero credits alert */}
        {!loadingP&&profile?.credits===0&&(
          <div style={{marginTop:16,padding:'16px 22px',background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:red,display:'flex',alignItems:'center',gap:6}}><SvgIcon name="warning" size={14} color={red} /> No credits remaining</div>
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
