import Link from 'next/link'

const orange = '#ff9933'
const navy = '#042C53'
const blue = '#378ADD'
const green = '#1D9E75'

function ScoreRing({ score, size = 120, label }: { score: number; size?: number; label: string }) {
  const r = (size / 2) - 10
  const circ = 2 * Math.PI * r
  const fill = circ * (1 - score / 100)
  const color = score >= 75 ? green : score >= 50 ? orange : '#E24B4A'
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={8}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"/>
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
          fill="#fff" fontSize={size * 0.22} fontWeight="700"
          style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%', fontFamily: "'Outfit',sans-serif" }}>
          {score}
        </text>
      </svg>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontFamily: "'DM Sans',sans-serif" }}>{label}</div>
    </div>
  )
}

export default function IndiaHomePage() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Hero */}
      <section style={{
        background: `radial-gradient(ellipse at 20% 55%, rgba(255,153,51,0.12) 0%, transparent 55%), radial-gradient(ellipse at 75% 20%, rgba(29,158,117,0.08) 0%, transparent 50%), linear-gradient(160deg, #0a1520 0%, #0f2035 60%, #0a1c2e 100%)`,
        padding: '72px 24px 80px', minHeight: 540,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>

          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,153,51,0.12)', border: '1px solid rgba(255,153,51,0.3)', borderRadius: 20, padding: '5px 14px', marginBottom: 24 }}>
              <span style={{ fontSize: 13, color: orange, fontWeight: 600 }}>Built in Germany. Made for India.</span>
            </div>

            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 44, fontWeight: 700, color: '#fff', lineHeight: 1.15, marginBottom: 20 }}>
              Your CV is being<br/>
              <span style={{ color: orange }}>rejected by a bot</span><br/>
              before humans see it.
            </h1>

            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 32, maxWidth: 460 }}>
              90% of CVs never reach a recruiter. ATS systems at TCS, Infosys, Wipro and every funded startup filter you out silently. Job-Lens scans, scores and fixes your CV before you apply.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/in/career-scan" style={{
                display: 'inline-block', padding: '14px 28px', borderRadius: 10,
                background: 'linear-gradient(135deg, #ff9933 0%, #e67300 100%)',
                color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none',
                boxShadow: '0 6px 20px rgba(255,153,51,0.4)',
              }}>
                Scan Your CV Free
              </Link>
              <Link href="/in/jobs" style={{
                display: 'inline-block', padding: '14px 28px', borderRadius: 10,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#E6F1FB', fontWeight: 600, fontSize: 15, textDecoration: 'none',
              }}>
                Browse Jobs
              </Link>
            </div>
          </div>

          {/* ATS Score visual */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '32px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: orange, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>Your ATS Score</div>
              <ScoreRing score={72} size={140} label="Overall" />
              <div style={{ display: 'flex', gap: 20, marginTop: 20, justifyContent: 'center' }}>
                <ScoreRing score={65} size={72} label="Keywords" />
                <ScoreRing score={80} size={72} label="Format" />
                <ScoreRing score={60} size={72} label="Impact" />
              </div>
              <div style={{ marginTop: 20, padding: '10px 16px', background: 'rgba(226,75,74,0.15)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>High Risk — Needs Work</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>8 critical keywords missing from JD</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ background: navy, padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16 }}>
          {[
            { stat: '90%', label: 'CVs rejected by ATS before human review' },
            { stat: '3x', label: 'More interviews with ATS-optimized CV' },
            { stat: '8 sec', label: 'Time recruiter spends on each CV' },
            { stat: '500+', label: 'Companies using ATS in India' },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: orange, fontFamily: "'Outfit',sans-serif" }}>{item.stat}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', maxWidth: 120 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '72px 24px', background: '#f0f4f8' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 32, fontWeight: 700, color: navy, marginBottom: 12 }}>
              Everything you need to beat the bots
            </h2>
            <p style={{ fontSize: 15, color: '#6b7c93', maxWidth: 480, margin: '0 auto' }}>
              Built specifically for the Indian job market — Naukri, LinkedIn India, company career portals.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {[
              {
                icon: '87',
                iconBg: 'linear-gradient(135deg, #ff9933, #e67300)',
                title: 'ATS Score',
                desc: 'Upload your CV + paste any JD. Get a score out of 100 with exact keyword gaps, format issues and quick fixes.',
                href: '/in/career-scan',
                cta: 'Scan Now',
                badge: 'Hero Feature',
              },
              {
                icon: '#',
                iconBg: 'linear-gradient(135deg, #378ADD, #185FA5)',
                title: 'JD Keyword Analyzer',
                desc: 'Paste any Naukri or LinkedIn JD. See exactly which keywords your CV is missing — ranked by impact.',
                href: '/in/career-scan',
                cta: 'Analyze',
              },
              {
                icon: 'CV',
                iconBg: 'linear-gradient(135deg, #1D9E75, #059669)',
                title: 'CV Rewriter',
                desc: 'Bullet-by-bullet rewrites with action verbs and measurable results. Single-column ATS-safe output.',
                href: '/in/cv-builder',
                cta: 'Rewrite CV',
              },
              {
                icon: '~',
                iconBg: 'linear-gradient(135deg, #6D28D9, #4C1D95)',
                title: 'ATS Simulator',
                desc: 'See how Taleo, Workday and iCIMS actually parse your CV. Spot what the bot reads vs what you wrote.',
                href: '/in/career-scan',
                cta: 'Coming Soon',
                disabled: true,
              },
            ].map((f, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 16, padding: 24,
                border: i === 0 ? `2px solid ${orange}` : '1px solid #edf1f6',
                boxShadow: i === 0 ? `0 8px 32px rgba(255,153,51,0.15)` : '0 2px 12px rgba(4,44,83,0.06)',
                position: 'relative',
              }}>
                {f.badge && (
                  <div style={{ position: 'absolute', top: -1, right: 20, background: orange, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: '0 0 8px 8px', letterSpacing: 0.5 }}>
                    {f.badge}
                  </div>
                )}
                <div style={{ width: 44, height: 44, borderRadius: 12, background: f.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 16, fontFamily: "'Outfit',sans-serif" }}>
                  {f.icon}
                </div>
                <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 17, fontWeight: 700, color: navy, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: '#6b7c93', lineHeight: 1.6, marginBottom: 16 }}>{f.desc}</p>
                <Link href={f.href} style={{
                  display: 'inline-block', padding: '8px 16px', borderRadius: 8,
                  background: f.disabled ? '#f0f4f8' : (i === 0 ? orange : blue),
                  color: f.disabled ? '#9aafbc' : '#fff',
                  fontSize: 12, fontWeight: 600, textDecoration: 'none',
                  pointerEvents: f.disabled ? 'none' : 'auto',
                }}>
                  {f.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '72px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 30, fontWeight: 700, color: navy, marginBottom: 12 }}>How it works</h2>
          <p style={{ color: '#6b7c93', fontSize: 14, marginBottom: 48 }}>Three steps to a job-ready CV</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {[
              { n: '1', title: 'Upload Your CV', desc: 'Paste your CV text or upload a PDF. We read every section.' },
              { n: '2', title: 'Paste the JD', desc: 'Copy any job description from Naukri, LinkedIn or a company portal.' },
              { n: '3', title: 'Get Your Score', desc: 'Instant ATS score, keyword gaps, format fixes and rewritten bullets.' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg, ${orange}, #e67300)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: "'Outfit',sans-serif" }}>
                  {s.n}
                </div>
                <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: navy }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: '#6b7c93', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 48 }}>
            <Link href="/in/career-scan" style={{
              display: 'inline-block', padding: '14px 32px', borderRadius: 10,
              background: 'linear-gradient(135deg, #ff9933, #e67300)',
              color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none',
              boxShadow: '0 6px 20px rgba(255,153,51,0.35)',
            }}>
              Scan Your CV — Free
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '72px 24px', background: '#f0f4f8' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 30, fontWeight: 700, color: navy, marginBottom: 12 }}>Simple pricing in INR</h2>
          <p style={{ color: '#6b7c93', fontSize: 14, marginBottom: 48 }}>No dollar conversions. No hidden fees.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
            {[
              {
                name: 'Free', price: '0', period: '', features: ['5 credits on signup', '2 ATS scans', 'Basic score + gaps', 'Keyword report'],
                cta: 'Get Started', ctaHref: '/login?next=/in/career-scan', raised: false,
              },
              {
                name: 'Pro', price: '499', period: '/month', features: ['Unlimited ATS scans', 'CV Rewriter', 'JD Keyword Analyzer', 'Job Search', 'Cover Letter'],
                cta: 'Go Pro', ctaHref: '/app/account', raised: true, badge: 'Most Popular',
              },
              {
                name: 'Premium', price: '999', period: '/month', features: ['Everything in Pro', 'ATS Simulator', 'Application Tracker', 'Priority AI queue', 'Dedicated support'],
                cta: 'Go Premium', ctaHref: '/app/account', raised: false,
              },
            ].map((plan, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 16, padding: '28px 24px',
                border: plan.raised ? `2px solid ${orange}` : '1px solid #edf1f6',
                boxShadow: plan.raised ? '0 16px 48px rgba(255,153,51,0.2)' : '0 2px 12px rgba(4,44,83,0.06)',
                marginTop: plan.raised ? -12 : 0,
                position: 'relative',
              }}>
                {plan.badge && (
                  <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: orange, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: '0 0 8px 8px', whiteSpace: 'nowrap' }}>
                    {plan.badge}
                  </div>
                )}
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 700, color: navy, marginBottom: 4 }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 20 }}>
                  <span style={{ fontSize: 13, color: '#6b7c93' }}>Rs.</span>
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 32, fontWeight: 800, color: navy }}>{plan.price}</span>
                  {plan.period && <span style={{ fontSize: 13, color: '#6b7c93' }}>{plan.period}</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {plan.features.map((feat, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', textAlign: 'left' }}>
                      <span style={{ color: green, fontSize: 14, flexShrink: 0 }}>+</span> {feat}
                    </div>
                  ))}
                </div>
                <Link href={plan.ctaHref} style={{
                  display: 'block', padding: '11px', borderRadius: 8, textAlign: 'center',
                  background: plan.raised ? `linear-gradient(135deg, ${orange}, #e67300)` : `linear-gradient(135deg, ${navy}, #185FA5)`,
                  color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none',
                }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: navy, padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          <svg width="22" height="22" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke="#378ADD" strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="3" fill="#378ADD"/>
            <line x1="28" y1="28" x2="36" y2="36" stroke="#378ADD" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: '#E6F1FB' }}>
            Job-Lens <span style={{ color: orange }}>India</span>
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
          Built in Germany. Made for India.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Job-Lens DACH</Link>
          <Link href="/impressum" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Impressum</Link>
          <Link href="/datenschutz" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Privacy</Link>
        </div>
      </footer>

    </div>
  )
}
