'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { theme } from '@/lib/theme'

const { colors: c, fonts: f } = theme
// alias for use inside JSX where `f` is shadowed by the `feat` variable
const fonts = f

interface Props {
  lang: 'DE' | 'EN'
  user: { name: string } | null
}

const features = [
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>,
    name: { DE: 'Career Scan', EN: 'Career Scan' },
    desc: { DE: 'ATS-Score & KI-Feedback', EN: 'ATS score & AI feedback' },
    grad: 'linear-gradient(175deg, #dceeff 0%, #c8e3ff 100%)',
    accent: '#378ADD',
    href: '/app/career-scan',
    hover: {
      DE: { tag: 'Career Scan', h1: 'Weißt du, warum dein Lebenslauf abgelehnt wird?', sub: 'Lade deinen Lebenslauf hoch — in 30 Sekunden erhältst du einen ATS-Score, eine Keyword-Analyse und konkrete Verbesserungsvorschläge.', cta: 'Career Scan starten →' },
      EN: { tag: 'Career Scan', h1: 'Do you know why your CV gets rejected?', sub: 'Upload your CV and get an ATS score, keyword gap analysis and concrete improvements in 30 seconds.', cta: 'Start Career Scan →' },
    },
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="13" height="11" rx="2"/><path d="M9 7V5a2 2 0 0 1 4 0v2"/><circle cx="18.5" cy="9.5" r="3"/><line x1="20.6" y1="11.6" x2="22.5" y2="13.5"/></svg>,
    name: { DE: 'Job-Suche', EN: 'Job Search' },
    desc: { DE: '186k+ DACH-Stellen', EN: '186k+ DACH roles' },
    grad: 'linear-gradient(175deg, #d1fae5 0%, #a7f3d0 100%)',
    accent: '#10b981',
    href: '/app/jobs',
    hover: {
      DE: { tag: 'Job-Suche', h1: '186k+ offene Stellen — nur die, die wirklich passen', sub: 'Kein Scrollen durch irrelevante Jobs. Die KI analysiert jede Stelle und zeigt dir nur Angebote, die zu deinem Profil passen.', cta: 'Jobs durchsuchen →' },
      EN: { tag: 'Job Search', h1: '186k+ open positions — only the ones that fit', sub: 'No scrolling through irrelevant listings. AI scores every role against your profile so you only see what matters.', cta: 'Browse jobs →' },
    },
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    name: { DE: 'CV Builder', EN: 'CV Builder' },
    desc: { DE: 'Auf jede Stelle zugeschnitten', EN: 'Tailored to every role' },
    grad: 'linear-gradient(175deg, #ede9fe 0%, #ddd6fe 100%)',
    accent: '#8b5cf6',
    href: '/app/cv-builder',
    hover: {
      DE: { tag: 'CV Builder', h1: 'Ein Lebenslauf, der zu jeder Stelle passt', sub: 'Füge eine Stellenanzeige ein — die KI passt deinen Lebenslauf automatisch an die Keywords und Anforderungen an. In unter einer Minute.', cta: 'CV anpassen →' },
      EN: { tag: 'CV Builder', h1: 'One CV tailored to every job you apply for', sub: 'Paste a job description — the AI rewrites your CV to match the exact keywords and requirements automatically. Under a minute.', cta: 'Tailor my CV →' },
    },
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    name: { DE: 'Anschreiben', EN: 'Cover Letter' },
    desc: { DE: 'Überzeugend & persönlich', EN: 'Personal & persuasive' },
    grad: 'linear-gradient(175deg, #fef3c7 0%, #fde68a 100%)',
    accent: '#f59e0b',
    href: '/app/cv-builder',
    hover: {
      DE: { tag: 'Anschreiben', h1: 'Überzeugend, persönlich und in 60 Sekunden fertig', sub: 'Kein Boilerplate. Kein Copy-Paste. Jedes Anschreiben wird individuell auf die Stelle und dein Profil zugeschnitten.', cta: 'Anschreiben erstellen →' },
      EN: { tag: 'Cover Letter', h1: 'Compelling, personal and done in 60 seconds', sub: 'No boilerplate. No copy-paste. Every cover letter is written fresh for the specific role and your exact profile.', cta: 'Create cover letter →' },
    },
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    name: { DE: 'Auto Apply', EN: 'Auto Apply' },
    desc: { DE: 'Automatisch bewerben', EN: 'Apply on autopilot' },
    grad: 'linear-gradient(175deg, #e0e7ff 0%, #c7d2fe 100%)',
    accent: '#6366f1',
    href: '/app/auto-apply',
    hover: {
      DE: { tag: 'Auto Apply', h1: 'Bewirb dich automatisch — während du schläfst', sub: 'Der Browser-Bot füllt Bewerbungsformulare für dich aus. Du wählst die Stellen, er erledigt den Rest. Sicher, schnell und nachvollziehbar.', cta: 'Auto Apply starten →' },
      EN: { tag: 'Auto Apply', h1: 'Apply automatically — while you sleep', sub: "The browser bot fills out application forms on your behalf. You pick the roles, it handles the rest. Safe, fast and transparent.", cta: 'Start Auto Apply →' },
    },
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><circle cx="17" cy="8" r="2"/><path d="M17 10v3"/></svg>,
    name: { DE: 'Job Case', EN: 'Job Case' },
    desc: { DE: 'Video-Bewerbung & Beweis', EN: 'Video pitch & proof' },
    grad: 'linear-gradient(175deg, #dcfce7 0%, #bbf7d0 100%)',
    accent: '#22c55e',
    href: '/app/job-case',
    hover: {
      DE: { tag: 'Job Case', h1: 'Ein lebendes Karriereprofil — kein statisches Dokument.', sub: 'Skills, Erfahrungstiefe und ein kurzes Pitch-Video — auf einen Blick, auf jedem Gerät. Recruiter verbringen 6 Sekunden mit einem Lebenslauf. Job Case macht diese 6 Sekunden bedeutsam.', cta: 'Job Case erstellen →' },
      EN: { tag: 'Job Case', h1: 'A living career profile — not a static document.', sub: 'Skills, impact and a short pitch video visible at a glance on any device. Recruiters spend 6 seconds on a CV. Job Case makes those 6 seconds count.', cta: 'Create Job Case →' },
    },
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
    name: { DE: 'Kira AI', EN: 'Kira AI' },
    desc: { DE: 'Dein Karriere-Coach', EN: 'Your career coach' },
    grad: 'linear-gradient(175deg, #fce7f3 0%, #fbcfe8 100%)',
    accent: '#ec4899',
    href: '/app/ai',
    hover: {
      DE: { tag: 'Kira AI', h1: 'Dein persönlicher KI-Karrierecoach — jederzeit', sub: 'Kira beantwortet Fragen zu deiner Bewerbung, hilft bei der Interview-Vorbereitung und gibt dir ehrliches, sofortiges Feedback.', cta: 'Kira fragen →' },
      EN: { tag: 'Kira AI', h1: 'Your personal AI career coach — always on', sub: 'Kira answers questions about your application, helps you prep for interviews and gives honest, instant feedback.', cta: 'Ask Kira →' },
    },
  },
]

export default function HeroDACH({ lang, user }: Props) {
  const isDE = lang === 'DE'
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
  const hc = feat ? feat.hover[lang] : null

  return (
    <>
      <style>{`
        .hero-panel {
          transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.28s ease;
        }
        .hero-panel:hover { transform: skewX(-6deg) translateY(-14px) !important; z-index: 10 !important; }
        .hero-panel:hover .panel-bar { opacity: 1 !important; }

        /* Desktop: show panels, hide ticker */
        .hero-mobile-ticker { display: none; }

        @media(max-width:768px){
          /* Hide panels entirely on mobile */
          .hero-dach-panels { display: none !important; }
          /* Show ticker */
          .hero-mobile-ticker { display: block; }
          /* Single-column layout */
          .hero-dach-layout { grid-template-columns: 1fr !important; padding: 44px 20px 0 !important; gap: 0 !important; }
        }

        @media(min-width:769px) and (max-width:960px){
          .hero-dach-layout{ grid-template-columns:1fr!important; padding:32px 24px 48px!important; min-height:auto!important; gap:28px!important; }
          .hero-dach-panels{ order:-1; justify-content:center!important; overflow:visible!important; padding:8px 0 0!important; margin:0!important; }
          .hero-panels-inner{ height:160px!important; }
          .hero-panel{ width:58px!important; padding:0 2px!important; margin-left:-10px!important; z-index:0!important; transform:skewX(0deg)!important; border-radius:12px!important; }
          .hero-panel-first{ margin-left:0!important; }
          .hero-panel:hover{ transform:skewX(0deg) translateY(-8px)!important; z-index:10!important; }
          .panel-content{ transform:skewX(0deg)!important; gap:10px!important; }
          .panel-desc{ display:none!important; }
          .panel-icon{ width:36px!important; height:36px!important; border-radius:10px!important; }
          .panel-icon svg{ width:18px!important; height:18px!important; }
          .panel-name{ font-size:9px!important; margin-bottom:0!important; letter-spacing:-0.2px!important; }
        }

        /* Auto-scroll ticker animations */
        @keyframes ticker-left  { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes ticker-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }

        .ticker-track-a { display: flex; width: max-content; animation: ticker-left 28s linear infinite; }
        .ticker-track-b { display: flex; width: max-content; animation: ticker-right 22s linear infinite; }
        .ticker-track-a:hover, .ticker-track-b:hover { animation-play-state: paused; }
      `}</style>

      <div style={{ background:'linear-gradient(145deg,#f8faff 0%,#eef4ff 50%,#f0f6ff 100%)', minHeight:'88vh', display:'flex', flexDirection:'column', alignItems:'stretch', overflow:'hidden', position:'relative' }}>
        {/* inner wrapper provides vertical centering for the grid — ticker sits below */}
        <div style={{ flex:1, display:'flex', alignItems:'center' }}>
        {/* ambient glow — shifts color when hovering */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          transition:'background-image 0.6s ease',
          backgroundImage:[
            feat
              ? `radial-gradient(ellipse 55% 60% at 72% 50%, ${feat.accent}0d 0%, transparent 65%)`
              : 'radial-gradient(ellipse 55% 60% at 72% 50%, rgba(55,138,221,0.055) 0%, transparent 70%)',
            'radial-gradient(ellipse 35% 45% at 18% 35%, rgba(139,92,246,0.04) 0%, transparent 60%)',
          ].join(','),
        }} />

        <div
          className="hero-dach-layout"
          style={{ maxWidth:1180, margin:'0 auto', padding:'64px 32px', width:'100%', display:'grid', gridTemplateColumns:'44% 56%', gap:40, alignItems:'center', position:'relative', zIndex:1 }}
        >
          {/* ── Left: copy — animates on panel hover ── */}
          <div
            style={{
              opacity: fading ? 0 : 1,
              transform: fading ? 'translateY(10px)' : 'translateY(0)',
              transition: 'opacity 0.14s ease, transform 0.14s ease',
            }}
          >
            {hc ? (
              /* Feature hover state */
              <>
                <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:`${feat!.accent}18`, border:`1px solid ${feat!.accent}30`, borderRadius:20, padding:'6px 16px', marginBottom:24 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:feat!.accent, display:'inline-block', boxShadow:`0 0 6px ${feat!.accent}` }} />
                  <span style={{ fontSize:11, fontWeight:700, color:feat!.accent, letterSpacing:1.2, textTransform:'uppercase' as const }}>{hc.tag}</span>
                </div>
                <h1 style={{ fontFamily:f.heading, fontSize:'clamp(26px,3.5vw,46px)', fontWeight:800, color:'#1a2332', lineHeight:1.1, letterSpacing:-1.2, margin:'0 0 20px' }}>
                  {hc.h1.split(' ').slice(0, Math.ceil(hc.h1.split(' ').length / 2)).join(' ')}<br />
                  <span style={{ color:feat!.accent }}>{hc.h1.split(' ').slice(Math.ceil(hc.h1.split(' ').length / 2)).join(' ')}</span>
                </h1>
                <p style={{ fontSize:15, color:'#4a5568', lineHeight:1.8, margin:'0 0 34px', maxWidth:400 }}>{hc.sub}</p>
                <Link href={go(feat!.href)} style={{ display:'inline-block', background:feat!.accent, color:'#fff', padding:'14px 30px', borderRadius:10, fontFamily:f.heading, fontWeight:700, fontSize:15, textDecoration:'none', boxShadow:`0 4px 20px ${feat!.accent}40`, letterSpacing:-0.2 }}>
                  {hc.cta}
                </Link>
              </>
            ) : (
              /* Default hero state */
              <>
                {user ? (
                  <div style={{ fontSize:14, color:'#378ADD', fontWeight:600, marginBottom:26 }}>
                    {isDE ? `Willkommen zurück, ${user.name} 👋` : `Welcome back, ${user.name} 👋`}
                  </div>
                ) : (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(55,138,221,0.08)', border:'1px solid rgba(55,138,221,0.20)', borderRadius:20, padding:'6px 16px', marginBottom:28 }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', display:'inline-block', boxShadow:'0 0 6px #10b981' }} />
                    <span style={{ fontSize:11, fontWeight:700, color:c.accent, letterSpacing:1.2, textTransform:'uppercase' as const }}>
                      {isDE ? 'KI-Plattform für DACH' : 'AI Job Platform · DACH'}
                    </span>
                  </div>
                )}
                <h1 style={{ fontFamily:f.heading, fontSize:'clamp(30px,4vw,54px)', fontWeight:800, color:'#1a2332', lineHeight:1.08, letterSpacing:-1.5, margin:'0 0 22px' }}>
                  {isDE ? <><span style={{ color:'#1a2332' }}>Der klügste Weg</span><br /><span style={{ color:c.accent }}>zu deinem Job.</span></> : <><span style={{ color:'#1a2332' }}>The smartest way</span><br /><span style={{ color:c.accent }}>to your next job.</span></>}
                </h1>
                <p style={{ fontSize:16, color:'#4a5568', lineHeight:1.8, margin:'0 0 38px', maxWidth:390 }}>
                  {isDE
                    ? 'KI-Lebenslaufanalyse, DACH-Jobsuche, maßgeschneidertes Anschreiben und Auto-Bewerbung — alles in einer Plattform.'
                    : 'AI CV scan, DACH job search, tailored cover letter and Auto Apply — one platform, end to end.'}
                </p>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' as const }}>
                  <Link href={go('/app/career-scan')} style={{ display:'inline-block', background:c.accent, color:'#fff', padding:'15px 32px', borderRadius:10, fontFamily:f.heading, fontWeight:700, fontSize:15, textDecoration:'none', boxShadow:'0 4px 24px rgba(55,138,221,0.38)', letterSpacing:-0.2 }}>
                    {isDE ? 'Kostenlos starten →' : 'Get started free →'}
                  </Link>
                  <Link href="#how-it-works" style={{ display:'inline-block', background:'rgba(55,138,221,0.06)', color:'#4a5568', padding:'15px 28px', borderRadius:10, fontFamily:f.heading, fontWeight:600, fontSize:15, textDecoration:'none', border:'1px solid rgba(55,138,221,0.18)' }}>
                    {isDE ? 'So funktioniert es' : 'How it works'}
                  </Link>
                </div>
                <p style={{ fontSize:12, color:'#6b7c93', marginTop:24, lineHeight:1.8 }}>
                  {isDE ? '✓ 5 kostenlose Credits  ·  ✓ Keine Kreditkarte  ·  ✓ Start in 30 Sekunden' : '✓ 5 free credits  ·  ✓ No card needed  ·  ✓ Up in 30 seconds'}
                </p>
              </>
            )}
          </div>

          {/* ── Right: slanted vertical panels (desktop only) ── */}
          <div className="hero-dach-panels" style={{ display:'flex', justifyContent:'flex-end' }}>
            <div className="hero-panels-inner" style={{ display:'flex', height:460, alignItems:'stretch' }}>
              {features.map((feat, i) => (
                <Link
                  key={i}
                  href={go(feat.href)}
                  className={`hero-panel${i === 0 ? ' hero-panel-first' : ''}`}
                  onMouseEnter={() => handleEnter(i)}
                  onMouseLeave={handleLeave}
                  style={{ flex:'0 0 auto', width:112, marginLeft:i===0?0:-24, background:feat.grad, borderRadius:18, border:`1px solid ${feat.accent}40`, transform:'skewX(-6deg)', display:'flex', flexDirection:'column' as const, alignItems:'center', justifyContent:'center', padding:'0 12px', textDecoration:'none', boxShadow:`0 8px 32px rgba(55,138,221,0.12), inset 0 1px 0 rgba(255,255,255,0.6)`, position:'relative', overflow:'hidden', zIndex:features.length-i }}
                >
                  <div className="panel-bar" style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,transparent,${feat.accent},transparent)`, opacity:0.45, transition:'opacity 0.25s' }} />
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:80, background:'linear-gradient(0deg,rgba(0,0,0,0.06) 0%,transparent 100%)', pointerEvents:'none' }} />
                  <div className="panel-content" style={{ transform:'skewX(6deg)', display:'flex', flexDirection:'column' as const, alignItems:'center', gap:14, textAlign:'center' as const }}>
                    <div className="panel-icon" style={{ width:50, height:50, borderRadius:14, background:`${feat.accent}16`, border:`1px solid ${feat.accent}30`, color:feat.accent, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 18px ${feat.accent}18` }}>
                      {feat.icon}
                    </div>
                    <div>
                      <div className="panel-name" style={{ fontFamily:f.heading, fontSize:12, fontWeight:700, color:'#1a2332', marginBottom:6, lineHeight:1.3 }}>{feat.name[lang]}</div>
                      <div className="panel-desc" style={{ fontSize:10, color:'#4a5568', lineHeight:1.55, maxWidth:80 }}>{feat.desc[lang]}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
        </div>{/* end inner centering wrapper */}

        {/* ── Mobile ticker — visible only on ≤768px ── */}
        <div className="hero-mobile-ticker" style={{ marginTop: 36, overflow: 'hidden', position: 'relative' }}>
          {/* Diagonal stripe overlay — same aesthetic as the desktop panels */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
            backgroundImage: `repeating-linear-gradient(
              -55deg,
              transparent,
              transparent 18px,
              rgba(255,255,255,0.028) 18px,
              rgba(255,255,255,0.028) 20px
            )`,
          }} />
          {/* Left/right fade masks */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 48, zIndex: 3, background: 'linear-gradient(90deg, #f0f6ff 0%, transparent 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, zIndex: 3, background: 'linear-gradient(270deg, #f0f6ff 0%, transparent 100%)', pointerEvents: 'none' }} />

          {/* Row A — scrolls left */}
          <div style={{ overflow: 'hidden', padding: '14px 0 8px' }}>
            <div className="ticker-track-a">
              {[...features, ...features].map((f, i) => (
                <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 18px', marginRight: 10, borderRadius: 10, background: `${f.accent}12`, border: `1px solid ${f.accent}28`, flexShrink: 0 }}>
                  <div style={{ color: f.accent, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <div style={{ fontFamily: fonts.heading, fontSize: 12, fontWeight: 700, color: '#1a2332', whiteSpace: 'nowrap' as const }}>{f.name[lang]}</div>
                    <div style={{ fontSize: 10, color: '#4a5568', whiteSpace: 'nowrap' as const }}>{f.desc[lang]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row B — scrolls right (reverse) */}
          <div style={{ overflow: 'hidden', padding: '8px 0 20px' }}>
            <div className="ticker-track-b">
              {[...features, ...features].reverse().map((f, i) => (
                <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 18px', marginRight: 10, borderRadius: 10, background: `${f.accent}0c`, border: `1px solid ${f.accent}20`, flexShrink: 0 }}>
                  <div style={{ color: f.accent, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <div style={{ fontFamily: fonts.heading, fontSize: 12, fontWeight: 700, color: '#1a2332', whiteSpace: 'nowrap' as const }}>{f.name[lang]}</div>
                    <div style={{ fontSize: 10, color: '#6b7c93', whiteSpace: 'nowrap' as const }}>{f.desc[lang]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
