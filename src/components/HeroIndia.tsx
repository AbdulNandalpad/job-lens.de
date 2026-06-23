'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { theme } from '@/lib/theme'

const { fonts: f } = theme
const saffron = '#FF9933'

interface Props {
  user: { name: string } | null
}

const features = [
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>,
    name: 'ATS Score',
    desc: 'Beat the AI filter',
    grad: 'linear-gradient(175deg, #2a1a06 0%, #180f03 100%)',
    accent: saffron,
    href: '/in/career-scan',
    h1: 'Find out why your CV never gets a callback',
    sub: 'Upload your CV and get an ATS score, keyword gap analysis and instant improvements — in 30 seconds.',
    cta: 'Check my ATS score →',
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="13" height="11" rx="2"/><path d="M9 7V5a2 2 0 0 1 4 0v2"/><circle cx="18.5" cy="9.5" r="3"/><line x1="20.6" y1="11.6" x2="22.5" y2="13.5"/></svg>,
    name: 'Job Search',
    desc: 'India + DACH roles',
    grad: 'linear-gradient(175deg, #0b2b1e 0%, #061812 100%)',
    accent: '#10b981',
    href: '/in/jobs',
    h1: 'Jobs that actually match your profile',
    sub: 'Browse curated roles in India and Germany. AI scores every listing against your profile before you even click.',
    cta: 'Find matching jobs →',
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    name: 'CV Builder',
    desc: 'Tailored in minutes',
    grad: 'linear-gradient(175deg, #231640 0%, #130c26 100%)',
    accent: '#8b5cf6',
    href: '/in/cv-builder',
    h1: 'A CV that\'s built for the exact job you want',
    sub: 'Paste any job description — the AI rewrites your CV to match the keywords and requirements automatically. Under a minute.',
    cta: 'Tailor my CV →',
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    name: 'Cover Letter',
    desc: 'Personal & sharp',
    grad: 'linear-gradient(175deg, #2c1e07 0%, #1a1205 100%)',
    accent: '#f59e0b',
    href: '/in/cover-letter',
    h1: 'A cover letter that actually gets read',
    sub: 'No templates. No copy-paste. Every letter is written fresh for the specific role, your background and the company.',
    cta: 'Write my cover letter →',
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    name: 'Auto Apply',
    desc: 'Apply on autopilot',
    grad: 'linear-gradient(175deg, #141840 0%, #0b0e28 100%)',
    accent: '#6366f1',
    href: '/in/auto-apply',
    h1: 'Apply to 10 jobs while you have your morning chai',
    sub: 'The browser bot fills out application forms on your behalf. You pick the roles, it handles the rest — fast and accurate.',
    cta: 'Start Auto Apply →',
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
    name: 'Kira AI',
    desc: 'Your career coach',
    grad: 'linear-gradient(175deg, #30102a 0%, #1c0919 100%)',
    accent: '#ec4899',
    href: '/in/ai',
    h1: 'An AI coach who gives you honest career advice',
    sub: 'Kira helps with interview prep, answers questions about your application and gives instant, brutally honest feedback.',
    cta: 'Talk to Kira →',
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><circle cx="17" cy="8" r="2"/><path d="M17 10v3"/></svg>,
    name: 'Job Case',
    desc: 'Video pitch & proof',
    grad: 'linear-gradient(175deg, #0f2318 0%, #081410 100%)',
    accent: '#22c55e',
    href: '/in/job-case',
    h1: 'Replace the cover letter with a 5-minute proof',
    sub: 'Record yourself, answer two role-specific scenarios on video and send recruiters a personal link — no account needed on their side.',
    cta: 'Create Job Case →',
  },
]

export default function HeroIndia({ user }: Props) {
  const go = (path: string) => user ? path : `/login?next=${encodeURIComponent(path)}`

  const [displayIdx, setDisplayIdx] = useState<number | null>(null)
  const [fading, setFading] = useState(false)

  const handleEnter = useCallback((idx: number) => {
    setFading(true)
    setTimeout(() => { setDisplayIdx(idx); setFading(false) }, 140)
  }, [])

  const handleLeave = useCallback(() => {
    setFading(true)
    setTimeout(() => { setDisplayIdx(null); setFading(false) }, 140)
  }, [])

  const feat = displayIdx !== null ? features[displayIdx] : null

  return (
    <>
      <style>{`
        .hero-in-panel {
          transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.28s ease;
        }
        .hero-in-panel:hover { transform: skewX(-6deg) translateY(-14px) !important; z-index: 10 !important; }
        .hero-in-panel:hover .in-panel-bar { opacity: 1 !important; }
        @media(max-width:960px){
          .hero-in-layout{ grid-template-columns:1fr!important; padding:32px 24px 48px!important; min-height:auto!important; gap:28px!important; }
          .hero-in-panels{ order:-1; justify-content:center!important; overflow:visible!important; padding:8px 0 0!important; margin:0!important; }
          .hero-in-panels-inner{ height:160px!important; }
          .hero-in-panel{ width:58px!important; padding:0 2px!important; margin-left:-10px!important; z-index:0!important; transform:skewX(0deg)!important; border-radius:12px!important; }
          .hero-in-panel-first{ margin-left:0!important; }
          .hero-in-panel:hover{ transform:skewX(0deg) translateY(-8px)!important; z-index:10!important; }
          .panel-content{ transform:skewX(0deg)!important; gap:10px!important; }
          .panel-desc{ display:none!important; }
          .panel-icon{ width:36px!important; height:36px!important; border-radius:10px!important; }
          .panel-icon svg{ width:18px!important; height:18px!important; }
          .panel-name{ font-size:9px!important; margin-bottom:0!important; letter-spacing:-0.2px!important; }
        }
      `}</style>

      <div style={{ background:'linear-gradient(145deg,#0d0800 0%,#110c02 50%,#150e03 100%)', minHeight:'88vh', display:'flex', alignItems:'center', overflow:'hidden', position:'relative' }}>
        {/* ambient glow */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage:[
            feat
              ? `radial-gradient(ellipse 55% 60% at 72% 50%, ${feat.accent}0e 0%, transparent 65%)`
              : `radial-gradient(ellipse 55% 60% at 72% 50%, ${saffron}08 0%, transparent 70%)`,
            'radial-gradient(ellipse 35% 45% at 18% 35%, rgba(255,153,51,0.04) 0%, transparent 60%)',
          ].join(','),
        }} />

        <div
          className="hero-in-layout"
          style={{ maxWidth:1180, margin:'0 auto', padding:'64px 32px', width:'100%', display:'grid', gridTemplateColumns:'44% 56%', gap:40, alignItems:'center', position:'relative', zIndex:1 }}
        >
          {/* ── Left: copy ── */}
          <div
            style={{
              opacity: fading ? 0 : 1,
              transform: fading ? 'translateY(10px)' : 'translateY(0)',
              transition: 'opacity 0.14s ease, transform 0.14s ease',
            }}
          >
            {feat ? (
              /* Feature hover state */
              <>
                <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:`${feat.accent}18`, border:`1px solid ${feat.accent}30`, borderRadius:20, padding:'6px 16px', marginBottom:24 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:feat.accent, display:'inline-block', boxShadow:`0 0 6px ${feat.accent}` }} />
                  <span style={{ fontSize:11, fontWeight:700, color:feat.accent, letterSpacing:1.2, textTransform:'uppercase' as const }}>{feat.name}</span>
                </div>
                <h1 style={{ fontFamily:f.heading, fontSize:'clamp(26px,3.5vw,46px)', fontWeight:800, color:'#fff', lineHeight:1.1, letterSpacing:-1.2, margin:'0 0 20px' }}>
                  {feat.h1.split(' ').slice(0, Math.ceil(feat.h1.split(' ').length / 2)).join(' ')}<br />
                  <span style={{ color:feat.accent }}>{feat.h1.split(' ').slice(Math.ceil(feat.h1.split(' ').length / 2)).join(' ')}</span>
                </h1>
                <p style={{ fontSize:15, color:'rgba(255,255,255,0.5)', lineHeight:1.8, margin:'0 0 34px', maxWidth:400 }}>{feat.sub}</p>
                <Link href={go(feat.href)} style={{ display:'inline-block', background:feat.accent, color: feat.accent === saffron ? '#000' : '#fff', padding:'14px 30px', borderRadius:10, fontFamily:f.heading, fontWeight:700, fontSize:15, textDecoration:'none', boxShadow:`0 4px 20px ${feat.accent}40`, letterSpacing:-0.2 }}>
                  {feat.cta}
                </Link>
              </>
            ) : (
              /* Default hero state */
              <>
                {user ? (
                  <div style={{ fontSize:14, color:saffron, fontWeight:600, marginBottom:26 }}>
                    Welcome back, {user.name} 👋
                  </div>
                ) : (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:`${saffron}12`, border:`1px solid ${saffron}28`, borderRadius:20, padding:'6px 16px', marginBottom:28 }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', display:'inline-block', boxShadow:'0 0 6px #10b981' }} />
                    <span style={{ fontSize:11, fontWeight:700, color:saffron, letterSpacing:1.2, textTransform:'uppercase' as const }}>AI Job Platform · India</span>
                  </div>
                )}
                <h1 style={{ fontFamily:f.heading, fontSize:'clamp(30px,4vw,54px)', fontWeight:800, color:'#fff', lineHeight:1.08, letterSpacing:-1.5, margin:'0 0 22px' }}>
                  <span style={{ color:'rgba(255,255,255,0.92)' }}>Get hired faster</span><br />
                  <span style={{ color:saffron }}>with AI on your side.</span>
                </h1>
                <p style={{ fontSize:16, color:'rgba(255,255,255,0.45)', lineHeight:1.8, margin:'0 0 38px', maxWidth:390 }}>
                  AI CV scan, curated job search, tailored cover letter and Auto Apply — one platform built for Indian professionals.
                </p>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' as const }}>
                  <Link href={go('/in/jobs')} style={{ display:'inline-block', background:saffron, color:'#000', padding:'15px 32px', borderRadius:10, fontFamily:f.heading, fontWeight:700, fontSize:15, textDecoration:'none', boxShadow:`0 4px 24px ${saffron}40`, letterSpacing:-0.2 }}>
                    Get started free →
                  </Link>
                  <Link href="#how-it-works" style={{ display:'inline-block', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.65)', padding:'15px 28px', borderRadius:10, fontFamily:f.heading, fontWeight:600, fontSize:15, textDecoration:'none', border:'1px solid rgba(255,255,255,0.09)' }}>
                    How it works
                  </Link>
                </div>
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.20)', marginTop:24, lineHeight:1.8 }}>
                  ✓ 5 free credits  ·  ✓ No card needed  ·  ✓ Up in 30 seconds
                </p>
              </>
            )}
          </div>

          {/* ── Right: slanted vertical panels ── */}
          <div className="hero-in-panels" style={{ display:'flex', justifyContent:'flex-end' }}>
            <div className="hero-in-panels-inner" style={{ display:'flex', height:460, alignItems:'stretch' }}>
              {features.map((feat, i) => (
                <Link
                  key={i}
                  href={go(feat.href)}
                  className={`hero-in-panel${i === 0 ? ' hero-in-panel-first' : ''}`}
                  onMouseEnter={() => handleEnter(i)}
                  onMouseLeave={handleLeave}
                  style={{ flex:'0 0 auto', width:112, marginLeft:i===0?0:-24, background:feat.grad, borderRadius:18, border:`1px solid ${feat.accent}1a`, transform:'skewX(-6deg)', display:'flex', flexDirection:'column' as const, alignItems:'center', justifyContent:'center', padding:'0 12px', textDecoration:'none', boxShadow:`0 16px 48px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.04)`, position:'relative', overflow:'hidden', zIndex:features.length-i }}
                >
                  <div className="in-panel-bar" style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,transparent,${feat.accent},transparent)`, opacity:0.45, transition:'opacity 0.25s' }} />
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:80, background:'linear-gradient(0deg,rgba(0,0,0,0.35) 0%,transparent 100%)', pointerEvents:'none' }} />
                  <div className="panel-content" style={{ transform:'skewX(6deg)', display:'flex', flexDirection:'column' as const, alignItems:'center', gap:14, textAlign:'center' as const }}>
                    <div className="panel-icon" style={{ width:50, height:50, borderRadius:14, background:`${feat.accent}16`, border:`1px solid ${feat.accent}30`, color:feat.accent, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 18px ${feat.accent}18` }}>
                      {feat.icon}
                    </div>
                    <div>
                      <div className="panel-name" style={{ fontFamily:f.heading, fontSize:12, fontWeight:700, color:'#fff', marginBottom:6, lineHeight:1.3 }}>{feat.name}</div>
                      <div className="panel-desc" style={{ fontSize:10, color:'rgba(255,255,255,0.35)', lineHeight:1.55, maxWidth:80 }}>{feat.desc}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
