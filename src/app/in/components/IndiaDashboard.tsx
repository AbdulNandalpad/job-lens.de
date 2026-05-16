'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MarketSnapshot } from '@/app/api/india/market-snapshot/route'

const saffron  = '#FF9933'
const green    = '#138808'
const navy     = '#042C53'
const white    = '#FFFFFF'

interface UserProfile {
  full_name: string
  credits: number
  commonCredits: number
  inCredits: number
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
  if (n >= 1000)   return `${(n / 1000).toFixed(0)}k`
  return n > 0 ? n.toString() : '—'
}

function Skeleton({ h = 20, r = 8 }: { h?: number; r?: number }) {
  return <div style={{ height: h, borderRadius: r, background: 'rgba(255,255,255,0.08)', animation: 'shimmer 1.6s ease-in-out infinite' }} />
}

export default function IndiaDashboard() {
  const router = useRouter()
  const [profile, setProfile]       = useState<UserProfile | null>(null)
  const [market, setMarket]         = useState<MarketSnapshot | null>(null)
  const [loadingP, setLoadingP]     = useState(true)
  const [loadingM, setLoadingM]     = useState(true)

  useEffect(() => {
    fetch('/api/user/profile').then(r => r.json()).then(setProfile).finally(() => setLoadingP(false))
    fetch('/api/india/market-snapshot').then(r => r.json()).then(setMarket).finally(() => setLoadingM(false))
  }, [])

  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const maxCat    = market?.categories?.[0]?.count ?? 1

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4fa', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700;800&display=swap');
        @keyframes shimmer { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        .in-dash-grid   { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        .in-dash-bottom { display:grid; grid-template-columns:1.2fr 1fr 1fr;  gap:16px; }
        .in-card        { background:${white}; border-radius:18px; border:1px solid #e4eaf4; box-shadow:0 2px 12px rgba(4,44,83,0.06); }
        .in-action      { cursor:pointer; transition:all .18s; border:1.5px solid transparent; }
        .in-action:hover{ border-color:${saffron}; box-shadow:0 8px 28px rgba(255,153,51,.15); transform:translateY(-3px); }
        .in-action.dim  { opacity:.45; cursor:not-allowed; }
        .in-action.dim:hover { border-color:transparent; box-shadow:none; transform:none; }
        @media(max-width:900px){
          .in-dash-grid   { grid-template-columns:repeat(2,1fr)!important; }
          .in-dash-bottom { grid-template-columns:1fr!important; }
        }
        @media(max-width:480px){
          .in-dash-grid { grid-template-columns:repeat(2,1fr)!important; }
        }
      `}</style>

      {/* ── Hero greeting banner ── */}
      <div style={{
        background: `linear-gradient(135deg, ${navy} 0%, #0e2d4a 55%, #0a3a28 100%)`,
        padding: '40px 28px 48px',
        position: 'relative',
        overflow: 'hidden',
        animation: 'fadeUp .5s ease both',
      }}>
        {/* Decorative blobs */}
        <div style={{ position:'absolute', top:-60, right:-40, width:260, height:260, borderRadius:'50%', background:`radial-gradient(circle, ${saffron}22 0%, transparent 70%)`, pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-80, left:-60, width:300, height:300, borderRadius:'50%', background:`radial-gradient(circle, ${green}18 0%, transparent 70%)`, pointerEvents:'none' }} />

        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative' }}>
          {/* Greeting */}
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:16, marginBottom:32 }}>
            <div>
              <p style={{ margin:'0 0 6px', fontSize:13, color:'rgba(255,255,255,.5)', fontWeight:500, letterSpacing:.5 }}>
                {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}
              </p>
              <h1 style={{ margin:0, fontFamily:"'Outfit',sans-serif", fontSize:30, fontWeight:800, color:white }}>
                {greeting}{firstName ? `, ${firstName}` : ''} 👋
              </h1>
              <p style={{ margin:'8px 0 0', fontSize:14, color:'rgba(255,255,255,.55)' }}>
                India&apos;s job market is active — here&apos;s your dashboard
              </p>
            </div>

            {/* Credit pill */}
            {!loadingP && profile && (
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,153,51,.15)', border:'1px solid rgba(255,153,51,.35)', borderRadius:14, padding:'10px 18px' }}>
                  <span style={{ fontSize:20 }}>⚡</span>
                  <div>
                    <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:22, fontWeight:800, color:saffron, lineHeight:1 }}>{profile.credits}</div>
                    <div style={{ fontSize:11, color:'rgba(255,153,51,.65)', marginTop:2 }}>credits left</div>
                  </div>
                </div>
                {profile.credits <= 3 && (
                  <button onClick={() => router.push('/in/account')} style={{ padding:'10px 18px', borderRadius:12, background:`linear-gradient(135deg,${saffron},#e67300)`, color:white, fontSize:12, fontWeight:700, border:'none', cursor:'pointer', boxShadow:'0 4px 16px rgba(255,153,51,.4)' }}>
                    Top Up ₹149+
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Quick actions ── */}
          <div className="in-dash-grid">
            {([
              { icon:'🔍', label:'Find Jobs',    sub:'Browse live openings',       href:'/in/jobs',         accent:saffron,   dim:false },
              { icon:'📄', label:'Build CV',     sub:'AI-tailored for the role',   href:'/in/cv-builder',   accent:'#378ADD', dim:false },
              { icon:'✉️', label:'Cover Letter', sub:'In your voice, in minutes',  href:'/in/cover-letter', accent:green,     dim:false },
              { icon:'📊', label:'ATS Scan',     sub:'Coming soon',                href:'#',                accent:'#94a3b8', dim:true  },
            ] as const).map(a => (
              <div
                key={a.label}
                className={`in-card in-action${a.dim ? ' dim' : ''}`}
                onClick={() => !a.dim && router.push(a.href)}
                style={{ padding:'22px 18px', display:'flex', flexDirection:'column', alignItems:'center', gap:12, textAlign:'center', background:'rgba(255,255,255,0.07)', border:`1.5px solid rgba(255,255,255,0.1)`, borderRadius:18 }}
              >
                <div style={{ width:52, height:52, borderRadius:16, background:`${a.accent}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
                  {a.icon}
                </div>
                <div>
                  <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:14, fontWeight:700, color:a.dim ? 'rgba(255,255,255,.3)' : white }}>{a.label}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:3 }}>{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'28px 20px 60px' }}>

        {/* ── Market Pulse ── */}
        <div className="in-card" style={{ padding:'26px 28px', marginBottom:16, animation:'fadeUp .5s .1s ease both' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22 }}>
            <div>
              <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:17, fontWeight:700, color:navy }}>🇮🇳 India Job Market Pulse</div>
              <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>Live data from Adzuna · refreshed every 4 hours</div>
            </div>
            {market?.fetchedAt && (
              <span style={{ fontSize:11, color:'#94a3b8', background:'#f0f4fa', padding:'4px 10px', borderRadius:8 }}>
                {timeAgo(market.fetchedAt)}
              </span>
            )}
          </div>

          {loadingM ? (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[1,2,3,4].map(i => <Skeleton key={i} h={32} />)}
            </div>
          ) : market ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {market.categories.map((cat, i) => {
                const pct = Math.max(4, Math.round((cat.count / maxCat) * 100))
                return (
                  <div key={cat.label} style={{ display:'flex', alignItems:'center', gap:14, animation:`fadeUp .4s ${i * .07}s ease both` }}>
                    <div style={{ width:130, fontSize:13, fontWeight:500, color:'#374151', flexShrink:0 }}>{cat.label}</div>
                    <div style={{ flex:1, height:12, borderRadius:8, background:'#edf1f6', overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg,${cat.color},${cat.color}88)`, borderRadius:8, transition:'width 1s ease' }} />
                    </div>
                    <div style={{ width:52, fontSize:13, fontWeight:700, color:cat.color, textAlign:'right', flexShrink:0 }}>
                      {fmt(cat.count)}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ fontSize:13, color:'#94a3b8' }}>Could not load market data.</div>
          )}
        </div>

        {/* ── Bottom row ── */}
        <div className="in-dash-bottom" style={{ animation:'fadeUp .5s .2s ease both' }}>

          {/* Trending roles */}
          <div className="in-card" style={{ padding:'22px 24px' }}>
            <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:700, color:navy, marginBottom:16 }}>🔥 Trending Roles</div>
            {loadingM ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{[1,2,3,4,5].map(i => <Skeleton key={i} h={36} />)}</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {(market?.trendingRoles ?? []).map((role, i) => (
                  <div key={role.title} style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'9px 12px', borderRadius:10,
                    background: i === 0 ? `${saffron}10` : i === 1 ? `${saffron}07` : '#f8fafc',
                    border: i === 0 ? `1px solid ${saffron}30` : '1px solid transparent',
                  }}>
                    <div style={{ width:22, height:22, borderRadius:7, background: i < 3 ? `${saffron}20` : '#edf1f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color: i < 3 ? saffron : '#94a3b8', flexShrink:0 }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize:13, color:navy, fontWeight: i === 0 ? 600 : 400 }}>{role.title}</span>
                    {i === 0 && <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color:saffron, background:`${saffron}15`, padding:'2px 7px', borderRadius:8 }}>HOT</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top cities */}
          <div className="in-card" style={{ padding:'22px 24px' }}>
            <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:700, color:navy, marginBottom:16 }}>📍 Top Hiring Cities</div>
            {loadingM ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{[1,2,3,4,5].map(i => <Skeleton key={i} h={36} />)}</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {(market?.topCities ?? []).map((city, i) => (
                  <div key={city.city} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'9px 12px', borderRadius:10,
                    background: i === 0 ? `${green}10` : '#f8fafc',
                    border: i === 0 ? `1px solid ${green}30` : '1px solid transparent',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:22, height:22, borderRadius:7, background: i === 0 ? `${green}20` : '#edf1f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color: i === 0 ? green : '#94a3b8', flexShrink:0 }}>
                        {i + 1}
                      </div>
                      <span style={{ fontSize:13, color:navy, fontWeight: i === 0 ? 600 : 400 }}>{city.city}</span>
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color: i === 0 ? green : '#94a3b8' }}>
                      {fmt(city.count)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="in-card" style={{ padding:'22px 24px' }}>
            <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:700, color:navy, marginBottom:16 }}>🕐 Recent Activity</div>
            {loadingP ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{[1,2,3].map(i => <Skeleton key={i} h={44} />)}</div>
            ) : profile?.usage?.length ? (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {profile.usage.slice(0,5).map((e, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, background:'#f8fafc' }}>
                    <div style={{ width:34, height:34, borderRadius:10, background:`${saffron}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                      {ACTION_ICONS[e.action] ?? '⚡'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:navy, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ACTION_LABELS[e.action] ?? e.action}</div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{timeAgo(e.created_at)}</div>
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color:saffron, flexShrink:0 }}>-{e.credits_used}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'28px 0' }}>
                <div style={{ fontSize:36, marginBottom:12 }}>🚀</div>
                <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.6, marginBottom:16 }}>No activity yet.<br/>Start by finding jobs!</div>
                <button onClick={() => router.push('/in/jobs')} style={{ padding:'9px 20px', borderRadius:10, background:`linear-gradient(135deg,${saffron},#e67300)`, color:white, fontSize:13, fontWeight:700, border:'none', cursor:'pointer', boxShadow:'0 4px 14px rgba(255,153,51,.35)' }}>
                  Find Jobs →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Zero credits blocker ── */}
        {!loadingP && profile?.credits === 0 && (
          <div style={{ marginTop:16, padding:'18px 24px', background:'linear-gradient(135deg,#fee2e2,#fef2f2)', border:'1px solid #fca5a5', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, animation:'fadeUp .4s ease both' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#dc2626' }}>⛔ No credits remaining</div>
              <div style={{ fontSize:12, color:'#ef4444', marginTop:3 }}>Top up to continue using AI features</div>
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
