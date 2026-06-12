import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import IndiaDashboard from './components/IndiaDashboard'
import KiraDemoWidget from '@/components/KiraDemoWidget'
import SvgIcon, { type IconName } from '@/components/SvgIcon'

const saffron = '#FF9933'
const indiaGreen = '#138808'
const navy = '#042C53'
const blue = '#000080'
const white = '#FFFFFF'

function IndiaFlag({ size = 48 }: { size?: number }) {
  const w = size * 1.5
  const h = size
  const bandH = h / 3
  const cx = w / 2
  const cy = h / 2
  const r = bandH * 0.38
  const spokes = 24
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.25)', flexShrink: 0 }}>
      <rect x={0} y={0} width={w} height={bandH} fill={saffron} />
      <rect x={0} y={bandH} width={w} height={bandH} fill={white} />
      <rect x={0} y={bandH * 2} width={w} height={bandH} fill={indiaGreen} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={blue} strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={1.8} fill={blue} />
      {Array.from({ length: spokes }).map((_, i) => {
        const angle = (i * 360) / spokes * Math.PI / 180
        return (
          <line key={i}
            x1={cx + Math.cos(angle) * 2} y1={cy + Math.sin(angle) * 2}
            x2={cx + Math.cos(angle) * r} y2={cy + Math.sin(angle) * r}
            stroke={blue} strokeWidth={0.7} />
        )
      })}
    </svg>
  )
}

function ScoreRing({ score, size = 120, label, color }: { score: number; size?: number; label: string; color: string }) {
  const r = (size / 2) - 10
  const circ = 2 * Math.PI * r
  const fill = circ * (1 - score / 100)
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={8}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"/>
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
          fill={white} fontSize={size * 0.22} fontWeight="700"
          style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%', fontFamily: "'Outfit',sans-serif" }}>
          {score}
        </text>
      </svg>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontFamily: "'DM Sans',sans-serif" }}>{label}</div>
    </div>
  )
}

export default async function IndiaHomePage() {
  // Check auth — show dashboard for logged-in users
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return <IndiaDashboard />
  } catch {
    // Not logged in or cookie error — fall through to landing page
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .in-hero-grid { display: grid; grid-template-columns: 1fr auto; gap: 48px; align-items: center; }
        .in-steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; position: relative; }
        .in-pricing-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; align-items: start; }
        .in-feat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        @media (max-width: 1000px) { .in-feat-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px)  { .in-feat-grid { grid-template-columns: 1fr; } }
        .in-feat-card { background: #fff; border: 1.5px solid #edf1f6; border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 9px; text-decoration: none; transition: border-color .2s, box-shadow .2s, transform .2s; cursor: pointer; }
        .in-feat-card:hover { border-color: ${saffron}; box-shadow: 0 8px 28px rgba(255,153,51,0.14); transform: translateY(-2px); }
        @media (max-width: 768px) {
          .in-hero-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
          .in-hero-score { display: none !important; }
          .in-steps-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
          .in-steps-track { display: none !important; }
          .in-pricing-grid { grid-template-columns: 1fr !important; }
          .in-pricing-grid > * { margin-top: 0 !important; }
          .in-flow-wrap { flex-direction: column !important; align-items: center !important; gap: 8px !important; }
          .in-flow-arrow { display: none !important; }
          .in-flow-decision { flex-direction: row !important; gap: 10px !important; }
          h1 { font-size: 28px !important; }
          h2 { font-size: 24px !important; }
        }
      `}</style>

      {/* Top bar */}
      <div style={{ background: 'rgba(10,21,32,0.95)', borderBottom: '1px solid rgba(255,153,51,0.15)', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke={saffron} strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="8"  fill="none" stroke="rgba(255,153,51,0.5)" strokeWidth="1.2"/>
            <circle cx="20" cy="20" r="3"  fill={saffron}/>
            <line x1="7" y1="20" x2="33" y2="20" stroke={saffron} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5"/>
            <line x1="28" y1="28" x2="36" y2="36" stroke={saffron} strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
            Job-Lens <span style={{ color: saffron }}>India</span>
          </span>
        </div>
        <Link href="/in/login" style={{ padding: '7px 20px', borderRadius: 8, background: 'rgba(255,153,51,0.12)', border: '1px solid rgba(255,153,51,0.35)', color: saffron, fontWeight: 700, fontSize: 13, textDecoration: 'none', fontFamily: "'Outfit', sans-serif", transition: 'all .15s' }}>
          Sign In
        </Link>
      </div>

      {/* Hero */}
      <section style={{
        background: `radial-gradient(ellipse at 15% 60%, rgba(255,153,51,0.18) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(19,136,8,0.1) 0%, transparent 50%), linear-gradient(160deg, #0a1520 0%, #0f2035 60%, #0a1c2e 100%)`,
        padding: '64px 24px 72px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Flag + badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <IndiaFlag size={36} />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,153,51,0.12)', border: '1px solid rgba(255,153,51,0.3)', borderRadius: 20, padding: '5px 14px' }}>
              <span style={{ fontSize: 13, color: saffron, fontWeight: 600 }}>Built in Germany. Made for India.</span>
            </div>
          </div>

          <div className="in-hero-grid">
            <div>
              <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 46, fontWeight: 800, color: white, lineHeight: 1.12, marginBottom: 22 }}>
                Your CV is being
                <span style={{ color: saffron }}> rejected by a bot</span>
                <br />before any human
                <span style={{ color: indiaGreen }}> ever sees it.</span>
              </h1>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, marginBottom: 36, maxWidth: 500 }}>
                In India, lakhs of candidates apply for every job. Companies use software called ATS to automatically filter out 90% of CVs — before a recruiter even opens them. Job-Lens scans, scores and fixes your CV so the bot says yes.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/in/login" style={{
                  display: 'inline-block', padding: '14px 30px', borderRadius: 10,
                  background: `linear-gradient(135deg, ${saffron} 0%, #e67300 100%)`,
                  color: white, fontWeight: 700, fontSize: 15, textDecoration: 'none',
                  boxShadow: '0 6px 24px rgba(255,153,51,0.45)',
                }}>
                  Get Started Free
                </Link>
                <a href="#what-is-ats" style={{
                  display: 'inline-block', padding: '14px 28px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)',
                  color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: 15, textDecoration: 'none',
                }}>
                  What is ATS?
                </a>
              </div>

              {/* Kira hero teaser */}
              <a href="#kira-demo" style={{
                display: 'inline-flex', alignItems: 'center', gap: 14, marginTop: 32,
                background: 'linear-gradient(135deg,rgba(255,153,51,0.14),rgba(109,40,217,0.12))',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 20, padding: '14px 18px 14px 14px', textDecoration: 'none',
                maxWidth: 440, backdropFilter: 'blur(12px)',
              }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg,${saffron},#6D28D9)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                  </div>
                  <span style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid #0a1520' }} />
                </div>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 4, fontFamily: "'Outfit',sans-serif" }}>Kira AI · Online now</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: white, lineHeight: 1.4, fontFamily: "'Outfit',sans-serif" }}>
                    Your next job is a conversation away.
                  </div>
                </div>
                <div style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 10, background: `linear-gradient(135deg,${saffron},#e67300)`, color: white, fontSize: 12, fontWeight: 700, fontFamily: "'Outfit',sans-serif", whiteSpace: 'nowrap' as const, boxShadow: `0 4px 12px rgba(255,153,51,0.4)` }}>
                  Meet Kira ↓
                </div>
              </a>
            </div>

            {/* Score card */}
            <div className="in-hero-score" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '28px 32px', textAlign: 'center', minWidth: 260 }}>
              <div style={{ fontSize: 10, color: saffron, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>Sample ATS Score</div>
              <ScoreRing score={48} size={130} label="Overall" color={saffron} />
              <div style={{ display: 'flex', gap: 16, marginTop: 18, justifyContent: 'center' }}>
                <ScoreRing score={38} size={68} label="Keywords" color="#E24B4A" />
                <ScoreRing score={70} size={68} label="Format" color={indiaGreen} />
                <ScoreRing score={42} size={68} label="Impact" color={saffron} />
              </div>
              <div style={{ marginTop: 16, padding: '9px 14px', background: 'rgba(226,75,74,0.15)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#f87171', fontWeight: 700 }}>High Risk — Bot will reject</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>12 keywords missing from job description</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE PROBLEM — stark numbers */}
      <section style={{ background: '#fff', padding: '60px 24px', borderTop: `4px solid ${saffron}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: saffron, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>The Reality</div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 32, fontWeight: 800, color: navy, marginBottom: 40, lineHeight: 1.2 }}>
            Most Indian job seekers have no idea<br />this is happening to them.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32 }}>
            {[
              { stat: '90%', color: '#E24B4A', label: 'CVs rejected by ATS before a human reads them' },
              { stat: 'Lakhs', color: saffron, label: 'of applicants compete for every tech role in India' },
              { stat: '6 sec', color: navy, label: 'is all a recruiter spends on each CV that does get through' },
              { stat: '0', color: indiaGreen, label: 'Indian platforms do full ATS optimization end-to-end' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '24px 16px', borderRadius: 14, background: '#f8fafc', border: '1px solid #edf1f6' }}>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 36, fontWeight: 800, color: item.color, marginBottom: 10 }}>{item.stat}</div>
                <div style={{ fontSize: 13, color: '#6b7c93', lineHeight: 1.6 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT IS ATS — education section */}
      <section id="what-is-ats" style={{ background: '#f8fafc', padding: '72px 24px' }}>
        <div style={{ maxWidth: 940, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: indiaGreen, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>ATS Explained Simply</div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 32, fontWeight: 800, color: navy, marginBottom: 16 }}>
              What is ATS and why should you care?
            </h2>
            <p style={{ fontSize: 15, color: '#6b7c93', maxWidth: 580, margin: '0 auto', lineHeight: 1.7 }}>
              ATS stands for <strong style={{ color: navy }}>Applicant Tracking System</strong>. It is software that companies use to automatically screen job applications before any human sees them.
            </p>
          </div>

          {/* Visual flow diagram */}
          <div style={{ background: white, borderRadius: 20, padding: '36px 32px', border: '1px solid #edf1f6', boxShadow: '0 4px 24px rgba(4,44,83,0.07)', marginBottom: 48 }}>
            <div className="in-flow-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>

              {/* You apply */}
              <div style={{ textAlign: 'center', padding: '20px 24px' }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(55,138,221,0.1)', border: '2px solid rgba(55,138,221,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 28 }}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <rect x="4" y="4" width="24" height="28" rx="3" fill="#E6F1FB" stroke="#378ADD" strokeWidth="1.5"/>
                    <line x1="9" y1="11" x2="23" y2="11" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="9" y1="16" x2="23" y2="16" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="9" y1="21" x2="18" y2="21" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: navy }}>You Apply</div>
                <div style={{ fontSize: 12, color: '#9aafbc', marginTop: 4 }}>Submit CV online</div>
              </div>

              {/* Arrow */}
              <div className="in-flow-arrow" style={{ fontSize: 24, color: '#dce4ef', padding: '0 8px' }}>-&gt;</div>

              {/* ATS Bot */}
              <div style={{ textAlign: 'center', padding: '20px 24px', background: 'rgba(4,44,83,0.04)', borderRadius: 16, border: '2px solid rgba(4,44,83,0.1)' }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: navy, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                    <rect x="5" y="8" width="20" height="16" rx="3" fill="none" stroke={white} strokeWidth="1.5"/>
                    <rect x="11" y="4" width="8" height="4" rx="1" fill={white}/>
                    <line x1="11" y1="14" x2="19" y2="14" stroke={saffron} strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="11" y1="18" x2="16" y2="18" stroke={saffron} strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="9" cy="14" r="1.5" fill={saffron}/>
                    <circle cx="9" cy="18" r="1.5" fill="#E24B4A"/>
                  </svg>
                </div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: navy }}>ATS Bot Reads</div>
                <div style={{ fontSize: 12, color: '#6b7c93', marginTop: 4, maxWidth: 120 }}>Scans for keywords from the job description</div>
              </div>

              {/* Arrow */}
              <div className="in-flow-arrow" style={{ fontSize: 24, color: '#dce4ef', padding: '0 8px' }}>-&gt;</div>

              {/* Decision */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ textAlign: 'center', padding: '14px 20px', background: 'rgba(29,158,117,0.08)', borderRadius: 12, border: '2px solid rgba(29,158,117,0.3)' }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>+</div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, color: indiaGreen }}>Keywords match</div>
                  <div style={{ fontSize: 11, color: '#6b7c93', marginTop: 2 }}>Moves to recruiter</div>
                </div>
                <div style={{ textAlign: 'center', padding: '14px 20px', background: 'rgba(226,75,74,0.08)', borderRadius: 12, border: '2px solid rgba(226,75,74,0.3)' }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>x</div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, color: '#E24B4A' }}>Keywords missing</div>
                  <div style={{ fontSize: 11, color: '#6b7c93', marginTop: 2 }}>Auto rejected</div>
                </div>
              </div>
            </div>
          </div>

          {/* Plain English explanation */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              {
                border: saffron,
                icon: '?',
                iconBg: `rgba(255,153,51,0.12)`,
                iconColor: saffron,
                title: 'What does ATS actually do?',
                body: 'When you apply for a job on Naukri, LinkedIn, or a company portal, your CV first goes into ATS software — not to a recruiter. The bot reads your CV like a machine, looking for specific words from the job description. No keywords match = instant rejection.',
              },
              {
                border: '#E24B4A',
                icon: '!',
                iconBg: `rgba(226,75,74,0.1)`,
                iconColor: '#E24B4A',
                title: 'Why does your CV fail ATS?',
                body: 'Three main reasons: (1) Missing keywords the JD requires, (2) CV format uses tables or graphics that the bot cannot read, (3) No clear sections like Skills or Summary. The bot does not read meaning — only exact matches.',
              },
              {
                border: indiaGreen,
                icon: '+',
                iconBg: `rgba(19,136,8,0.1)`,
                iconColor: indiaGreen,
                title: 'How do you fix it?',
                body: 'Match keywords from the job description in your CV. Use a clean single-column format — no tables, no sidebars, no graphics. Quantify your achievements. Job-Lens does all of this analysis for you in seconds.',
              },
            ].map((card, i) => (
              <div key={i} style={{ background: white, borderRadius: 14, padding: '24px 22px', border: '1px solid #edf1f6', borderTop: `3px solid ${card.border}`, boxShadow: '0 2px 12px rgba(4,44,83,0.05)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: card.iconColor, marginBottom: 14, fontFamily: "'Outfit',sans-serif" }}>
                  {card.icon}
                </div>
                <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: navy, marginBottom: 10 }}>{card.title}</h3>
                <p style={{ fontSize: 13, color: '#6b7c93', lineHeight: 1.7, margin: 0 }}>{card.body}</p>
              </div>
            ))}
          </div>

          {/* Companies that use ATS */}
          <div style={{ marginTop: 36, padding: '20px 28px', background: white, borderRadius: 14, border: '1px solid #edf1f6', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#9aafbc', marginBottom: 14, fontWeight: 600, letterSpacing: 0.5 }}>Companies in India using ATS to screen CVs</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {['TCS', 'Infosys', 'Wipro', 'HCL', 'Cognizant', 'Accenture', 'Flipkart', 'Swiggy', 'Zomato', 'Razorpay', 'CRED', 'PhonePe', 'Zepto', 'Meesho', 'Ola', 'Paytm'].map(co => (
                <span key={co} style={{ padding: '5px 14px', borderRadius: 20, background: '#f0f4f8', fontSize: 12, color: '#374151', fontWeight: 500 }}>{co}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* THE SOLUTION */}
      <section style={{ background: navy, padding: '64px 24px', borderTop: `4px solid ${indiaGreen}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 20 }}>
            <IndiaFlag size={32} />
            <div style={{ fontSize: 12, fontWeight: 700, color: indiaGreen, letterSpacing: 2, textTransform: 'uppercase' }}>The Solution</div>
          </div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 32, fontWeight: 800, color: white, marginBottom: 16 }}>
            Job-Lens India — built for this exact problem
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Paste your CV and any job description. Job-Lens reads both, scores your CV against ATS criteria, and tells you exactly what to fix — keyword by keyword.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, maxWidth: 800, margin: '0 auto' }}>
            {[
              { color: saffron, label: 'ATS Score out of 100', desc: 'Know exactly where you stand' },
              { color: indiaGreen, label: 'Missing keywords listed', desc: 'Add them and your score jumps' },
              { color: '#378ADD', label: 'Format issues flagged', desc: 'Fix what the bot cannot read' },
              { color: white, label: 'Bullet rewrites', desc: 'Action verbs + measurable impact' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '20px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, marginBottom: 12 }} />
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: white, marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40 }}>
            <Link href="/in/login" style={{
              display: 'inline-block', padding: '15px 36px', borderRadius: 10,
              background: `linear-gradient(135deg, ${saffron} 0%, #e67300 100%)`,
              color: white, fontWeight: 700, fontSize: 16, textDecoration: 'none',
              boxShadow: '0 6px 24px rgba(255,153,51,0.4)',
            }}>
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section style={{ background: '#f8fafc', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: saffron, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Full Toolkit</div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 28, fontWeight: 800, color: navy, marginBottom: 10, lineHeight: 1.2 }}>
              Everything you need to land your next role
            </h2>
            <p style={{ fontSize: 14, color: '#6b7c93', maxWidth: 420, margin: '0 auto' }}>
              Built for Naukri, LinkedIn, and every company portal in India
            </p>
          </div>

          <div className="in-feat-grid">
            {([
              { title: 'Profile Analysis',    desc: 'ATS score, keyword gaps and a fix plan — in 30 seconds.',      icon: 0, color: navy,       bg: '#E6F1FB', href: '/in/profile-analysis' },
              { title: 'Smart Job Search',    desc: 'Best-matched jobs across Bangalore, Hyderabad, Mumbai.',       icon: 1, color: indiaGreen,  bg: '#E1F5EE', href: '/in/jobs' },
              { title: 'CV & Cover Letter',   desc: 'ATS-optimised, tailored to every job description.',            icon: 2, color: '#D97706',   bg: '#FFF8EC', href: '/in/cv-builder' },
              { title: 'Interview Prep',      desc: 'Role-specific questions with instant AI feedback.',            icon: 3, color: '#378ADD',   bg: '#E6F1FB', href: '/in/interview' },
              { title: 'Salary Simulator',    desc: 'Practice negotiating in LPA with an AI HR manager.',          icon: 4, color: indiaGreen,  bg: '#E1F5EE', href: '/in/salary-sim' },
              { title: 'Career Card',         desc: 'Share your ATS score as a card on LinkedIn.',                 icon: 5, color: '#6D28D9',   bg: '#F0EEFF', href: '/in/profile-analysis' },
              { title: 'Application Tracker', desc: 'Track every application from Saved to Offer.',                icon: 6, color: '#D97706',   bg: '#FFF8EC', href: '/in/tracker' },
              { title: 'Auto Apply',          desc: 'AI fills the entire application form automatically.',         icon: 7, color: '#6D28D9',   bg: '#F0EEFF', href: '/in/jobs', badge: 'Beta' },
            ] as { title: string; desc: string; icon: number; color: string; bg: string; href: string; badge?: string }[]).map((feat) => (
              <Link key={feat.title} href={feat.href} className="in-feat-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: feat.bg, color: feat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {feat.icon === 0 && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>}
                    {feat.icon === 1 && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="13" height="11" rx="2"/><path d="M9 7V5a2 2 0 0 1 4 0v2"/><circle cx="18.5" cy="9.5" r="3"/><line x1="20.6" y1="11.6" x2="22.5" y2="13.5"/></svg>}
                    {feat.icon === 2 && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>}
                    {feat.icon === 3 && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="9" y1="21" x2="15" y2="21"/></svg>}
                    {feat.icon === 4 && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="6" x2="12" y2="18"/><path d="M15 9H10.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H9"/></svg>}
                    {feat.icon === 5 && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="15" rx="2"/><circle cx="8.5" cy="12" r="2.5"/><line x1="13" y1="10.5" x2="19.5" y2="10.5"/><line x1="13" y1="14" x2="17" y2="14"/></svg>}
                    {feat.icon === 6 && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><rect x="4.5" y="6.5" width="3" height="2.5" rx="0.5" fill="currentColor" stroke="none" fillOpacity="0.5"/><rect x="10.5" y="8.5" width="3" height="2.5" rx="0.5" fill="currentColor" stroke="none" fillOpacity="0.5"/><rect x="16.5" y="6.5" width="3" height="2.5" rx="0.5" fill="currentColor" stroke="none" fillOpacity="0.5"/></svg>}
                    {feat.icon === 7 && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" fillOpacity="0.15"/></svg>}
                  </div>
                  {feat.badge && (
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' as const, background: feat.bg, color: feat.color, padding: '3px 9px', borderRadius: 20 }}>
                      {feat.badge}
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: navy }}>{feat.title}</div>
                <div style={{ fontSize: 12, color: '#6b7c93', lineHeight: 1.55 }}>{feat.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* KIRA SECTION */}
      <section id="kira-demo" style={{ background: white, padding: '72px 24px 80px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(160deg,#0c1c30 0%,#08121f 100%)',
            borderRadius: 24, padding: '64px 32px 52px',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Background glows */}
            <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 600, height: 320, background: `radial-gradient(ellipse, rgba(255,153,51,0.16) 0%, rgba(109,40,217,0.1) 45%, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -40, left: '15%', width: 280, height: 180, background: 'radial-gradient(ellipse, rgba(0,200,200,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -40, right: '12%', width: 260, height: 160, background: 'radial-gradient(ellipse, rgba(255,20,160,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: 48 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${saffron},#6D28D9)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: 1.5, textTransform: 'uppercase' as const, fontFamily: "'Outfit',sans-serif" }}>
                  Meet Kira — AI Career Assistant
                </span>
              </div>

              <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 'clamp(28px,4.5vw,50px)', fontWeight: 800, color: white, margin: '0 0 20px', lineHeight: 1.12, letterSpacing: -0.8 }}>
                Your next job is a{' '}
                <span style={{ background: `linear-gradient(90deg,#00e8d0,${saffron},#a855f7)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  conversation away.
                </span>
              </h2>

              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.8, fontWeight: 400, fontFamily: "'DM Sans',sans-serif" }}>
                Kira knows the Indian job market — Bangalore, Hyderabad, Mumbai and beyond. Ask about live jobs, ATS scores, salary in LPA — all in a natural voice conversation. No forms. No filters. Just results.
              </p>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {([
                  { icon: 'mic' as IconName, label: 'Voice-first', desc: 'Just speak — Kira listens' },
                  { icon: 'search' as IconName, label: 'Live job search', desc: 'Real roles across India' },
                  { icon: 'document' as IconName, label: 'ATS insight', desc: 'Score, gaps & fixes' },
                ]).map(feat => (
                  <div key={feat.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <SvgIcon name={feat.icon} size={20} color="rgba(255,255,255,0.8)" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: white, fontFamily: "'Outfit',sans-serif" }}>{feat.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 1, fontFamily: "'DM Sans',sans-serif" }}>{feat.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <KiraDemoWidget market="in" lang="EN" />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: white, padding: '72px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: saffron, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Simple Process</div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 30, fontWeight: 800, color: navy, marginBottom: 48 }}>Three steps. One minute.</h2>
          <div className="in-steps-grid">
            <div className="in-steps-track" style={{ position: 'absolute', top: 28, left: '20%', right: '20%', height: 2, background: 'linear-gradient(90deg, rgba(255,153,51,0.3), rgba(19,136,8,0.3))', zIndex: 0 }} />
            {[
              { n: '1', color: saffron, title: 'Upload Your CV', desc: 'Paste the text or upload a PDF. We extract everything.' },
              { n: '2', color: '#378ADD', title: 'Paste the Job Description', desc: 'Copy any JD from Naukri, LinkedIn, or a company portal.' },
              { n: '3', color: indiaGreen, title: 'Get Your ATS Score', desc: 'Instant score, keyword gaps, format fixes and rewritten bullets.' },
            ].map((s, i) => (
              <div key={i} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: white, fontFamily: "'Outfit',sans-serif", boxShadow: `0 4px 16px ${s.color}55` }}>
                  {s.n}
                </div>
                <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: navy }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: '#6b7c93', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: '72px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: indiaGreen, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Pricing</div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 30, fontWeight: 800, color: navy, marginBottom: 8 }}>Simple pricing in INR</h2>
          <p style={{ color: '#9aafbc', fontSize: 13, marginBottom: 48 }}>No dollar conversions. Credits never expire. No card required to start.</p>
          <div className="in-pricing-grid">
            {[
              {
                name: 'Free', price: '0', credits: '5 credits', color: '#378ADD',
                features: ['5 credits on signup', 'ATS Scan — 2 credits', 'CV Tailoring — 1 credit', 'Cover Letter — 1 credit', 'Unlimited job browsing'],
                cta: 'Get Started Free', ctaHref: '/in/login', raised: false,
              },
              {
                name: 'Starter', price: '149', credits: '10 credits', color: saffron,
                features: ['10 credits (~2–3 full applications)', 'ATS Scan — 2 credits', 'CV Tailoring — 1 credit', 'Cover Letter — 1 credit', 'Credits never expire'],
                cta: 'Get Starter', ctaHref: '/in/account', raised: false,
              },
              {
                name: 'Job Hunt', price: '499', credits: '35 credits', color: saffron,
                features: ['35 credits (~8 full applications)', 'ATS Scan — 2 credits', 'CV Tailoring — 1 credit', 'Cover Letter — 1 credit', 'Best value for active job seekers'],
                cta: 'Get Job Hunt', ctaHref: '/in/account', raised: true, badge: 'Most Popular',
              },
              {
                name: 'Full Sprint', price: '999', credits: '70 credits', color: indiaGreen,
                features: ['70 credits (~17 full applications)', 'Everything in Job Hunt', 'Multi-month job search', 'Ideal for career changers', 'Credits never expire'],
                cta: 'Get Full Sprint', ctaHref: '/in/account', raised: false,
              },
            ].map((plan) => (
              <div key={plan.name} style={{
                background: white, borderRadius: 18, padding: '28px 22px',
                border: plan.raised ? `2px solid ${saffron}` : '1px solid #edf1f6',
                boxShadow: plan.raised ? '0 20px 56px rgba(255,153,51,0.18)' : '0 2px 12px rgba(4,44,83,0.05)',
                marginTop: plan.raised ? -14 : 0,
                position: 'relative',
              }}>
                {plan.badge && (
                  <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: saffron, color: white, fontSize: 10, fontWeight: 700, padding: '3px 14px', borderRadius: '0 0 10px 10px', whiteSpace: 'nowrap' }}>
                    {plan.badge}
                  </div>
                )}
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: plan.color, marginBottom: 12 }} />
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 700, color: navy, marginBottom: 4 }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 4 }}>
                  {plan.price !== '0' && <span style={{ fontSize: 13, color: '#9aafbc' }}>₹</span>}
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 34, fontWeight: 800, color: plan.raised ? saffron : navy }}>
                    {plan.price === '0' ? 'Free' : plan.price}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#9aafbc', marginBottom: 20 }}>{plan.credits}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {plan.features.map((feat, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#374151', textAlign: 'left' }}>
                      <span style={{ color: plan.color, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span> {feat}
                    </div>
                  ))}
                </div>
                <Link href={plan.ctaHref} style={{
                  display: 'block', padding: '11px', borderRadius: 9, textAlign: 'center',
                  background: plan.raised
                    ? `linear-gradient(135deg, ${saffron}, #e67300)`
                    : plan.color === indiaGreen
                    ? `linear-gradient(135deg, ${indiaGreen}, #0a6b04)`
                    : `linear-gradient(135deg, ${navy}, #185FA5)`,
                  color: white, fontWeight: 700, fontSize: 14, textDecoration: 'none',
                }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#9aafbc', marginTop: 24 }}>New accounts get <strong style={{ color: indiaGreen }}>5 free credits</strong> — no card needed. Credits never expire.</p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: navy, padding: '36px 24px 28px' }}>
        {/* Tricolor stripe */}
        <div style={{ display: 'flex', height: 3, maxWidth: 200, margin: '0 auto 28px', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ flex: 1, background: saffron }} />
          <div style={{ flex: 1, background: white }} />
          <div style={{ flex: 1, background: indiaGreen }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
            <IndiaFlag size={24} />
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
              Job-Lens <span style={{ color: saffron }}>India</span>
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>Built in Germany. Made for India.</p>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Job-Lens DACH</Link>
            <Link href="/impressum" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Impressum</Link>
            <Link href="/privacy" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Privacy Policy</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
