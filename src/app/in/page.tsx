import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import IndiaDashboard from './components/IndiaDashboard'

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

      {/* Sticky navbar */}
      <div style={{ background: '#042C53', padding: '0 20px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Logo */}
        <Link href="/in" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="24" height="24" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke="#FF9933" strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="8" fill="none" stroke="#ffbb66" strokeWidth="1.2"/>
            <circle cx="20" cy="20" r="3" fill="#FF9933"/>
            <line x1="7" y1="20" x2="33" y2="20" stroke="#FF9933" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5"/>
            <line x1="28" y1="28" x2="36" y2="36" stroke="#FF9933" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: '#E6F1FB' }}>
            Job-Lens <span style={{ color: saffron }}>&nbsp;India</span>
          </span>
        </Link>

        {/* Market pills + Sign In */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Link href="/" style={{ fontSize: 11, fontWeight: 600, textDecoration: 'none', padding: '5px 12px', borderRadius: 10, border: '1px solid rgba(55,138,221,0.2)', background: 'rgba(55,138,221,0.07)', color: '#85B7EB', fontFamily: "'DM Sans', sans-serif" }}>
              🇩🇪 DACH
            </Link>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 10, border: '1px solid rgba(255,153,51,0.4)', background: 'rgba(255,153,51,0.12)', color: saffron, fontFamily: "'DM Sans', sans-serif" }}>
              🇮🇳 India
            </span>
          </div>
          <Link href="/login" style={{ fontSize: 12, padding: '6px 18px', borderRadius: 20, background: `linear-gradient(135deg, ${saffron} 0%, #e67300 100%)`, color: '#fff', textDecoration: 'none', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
            Sign In
          </Link>
        </div>
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
                <Link href="/in/career-scan" style={{
                  display: 'inline-block', padding: '14px 30px', borderRadius: 10,
                  background: `linear-gradient(135deg, ${saffron} 0%, #e67300 100%)`,
                  color: white, fontWeight: 700, fontSize: 15, textDecoration: 'none',
                  boxShadow: '0 6px 24px rgba(255,153,51,0.45)',
                }}>
                  Check My ATS Score — Free
                </Link>
                <a href="#what-is-ats" style={{
                  display: 'inline-block', padding: '14px 28px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)',
                  color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: 15, textDecoration: 'none',
                }}>
                  What is ATS?
                </a>
              </div>
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
            <Link href="/in/career-scan" style={{
              display: 'inline-block', padding: '15px 36px', borderRadius: 10,
              background: `linear-gradient(135deg, ${saffron} 0%, #e67300 100%)`,
              color: white, fontWeight: 700, fontSize: 16, textDecoration: 'none',
              boxShadow: '0 6px 24px rgba(255,153,51,0.4)',
            }}>
              Scan Your CV Now — Free
            </Link>
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
                cta: 'Get Started Free', ctaHref: '/login?next=/in/career-scan', raised: false,
              },
              {
                name: 'Starter', price: '149', credits: '20 credits', color: saffron,
                features: ['20 credits (~6 full applications)', 'ATS Scan — 2 credits', 'CV Tailoring — 1 credit', 'Cover Letter — 1 credit', 'Credits never expire'],
                cta: 'Get Starter', ctaHref: '/in/account', raised: false,
              },
              {
                name: 'Job Hunt', price: '399', credits: '60 credits', color: saffron,
                features: ['60 credits (~20 full applications)', 'ATS Scan — 2 credits', 'CV Tailoring — 1 credit', 'Cover Letter — 1 credit', 'Best value for active job seekers'],
                cta: 'Get Job Hunt', ctaHref: '/in/account', raised: true, badge: 'Most Popular',
              },
              {
                name: 'Full Sprint', price: '799', credits: '150 credits', color: indiaGreen,
                features: ['150 credits (~50 full applications)', 'Everything in Job Hunt', 'Multi-month job search', 'Ideal for career changers', 'Credits never expire'],
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
            <Link href="/datenschutz" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Privacy</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
