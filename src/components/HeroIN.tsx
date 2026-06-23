'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { theme } from '@/lib/theme'

const { fonts: f } = theme

interface Slide {
  color: string
  bg: string
  tag:      string
  h1:       string
  h1Accent: string
  sub:      string
  cta:      string
  href:     string
  comingSoon?: boolean
}

const SLIDES: Slide[] = [
  {
    color: '#FF9933', bg: 'rgba(255,153,51,0.07)',
    tag:      'Built for India · AI-Powered',
    h1:       'Applying for jobs',
    h1Accent: 'redefined.',
    sub:      'Land your next role with less clicks and less stress. ATS scanner, AI job assistant, auto-filled applications — all in one place, built for the Indian market.',
    cta:      'Get started free',
    href:     '/in/career-scan',
  },
  {
    color: '#3DD68C', bg: 'rgba(61,214,140,0.07)',
    tag:      'ATS Score · 30 Seconds',
    h1:       'Getting rejected by bots',
    h1Accent: 'before a human sees you?',
    sub:      'Most CVs never reach a recruiter — ATS filters them out silently. Paste your CV and the job description. Find out exactly what\'s missing, keyword by keyword.',
    cta:      'Scan my CV now',
    href:     '/in/career-scan',
  },
  {
    color: '#8B5CF6', bg: 'rgba(139,92,246,0.07)',
    tag:      'Kira AI · Your Job Assistant',
    h1:       'What if finding jobs was',
    h1Accent: 'as easy as a conversation?',
    sub:      'Meet Kira — your AI job assistant. Tell her what you\'re looking for, she finds the roles, reads your CV, gives real salary data. No filters. No forms. Just talk.',
    cta:      'Meet Kira',
    href:     '/in#kira-demo',
  },
  {
    color: '#5B8FF9', bg: 'rgba(91,143,249,0.07)',
    tag:      'Auto Apply · Beta',
    h1:       'You relax.',
    h1Accent: 'Let Kira apply for you.',
    sub:      'Share your CV and the job form URL. Kira opens it, reads every field, fills in your CTC, notice period, skills — everything. You watch, review, and confirm.',
    cta:      'Try Auto Apply',
    href:     '/in/auto-apply',
  },
  {
    color: '#F59E0B', bg: 'rgba(245,158,11,0.07)',
    tag:      'New · Job Case',
    h1:       'The way traditional CVs work',
    h1Accent: 'is about to change.',
    sub:      'Ever heard of doing a first-level interview just from a job posting? Meet Job Case — a new way of presenting yourself for a role. Not a CV. Not a cover letter. Something better.',
    cta:      'Create Job Case',
    href:     '/in/job-case/new',
  },
]

const INTERVAL = 5500
const FADE_MS  = 280

// ── helpers ──────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1300, delay = 400) {
  const [v, setV] = useState(0)
  useEffect(() => {
    setV(0)
    const t = setTimeout(() => {
      const from  = Math.max(0, target - 22)
      const start = Date.now()
      const tick  = () => {
        const p = Math.min((Date.now() - start) / duration, 1)
        setV(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, delay)
    return () => clearTimeout(t)
  }, [target, duration, delay])
  return v
}

function useReveal(count: number, gap = 500, delay = 600) {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    const ts = Array.from({ length: count }, (_, i) =>
      setTimeout(() => setN(i + 1), delay + i * gap)
    )
    return () => ts.forEach(clearTimeout)
  }, [count, gap, delay])
  return n
}

// ── shared style helpers ──────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#0b1825',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 18, padding: '24px 20px',
  boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
}
const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.22)',
  letterSpacing: 1.6, textTransform: 'uppercase',
}
const tagStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 5, padding: '3px 9px',
}
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '11px 14px', background: '#0c1b2c',
  border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
}
const avatarStyle: React.CSSProperties = {
  width: 33, height: 33, borderRadius: 8, flexShrink: 0,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontFamily: f.heading,
}
const placeholderStyle: React.CSSProperties = {
  height: 51, background: 'rgba(255,255,255,0.02)',
  borderRadius: 10, border: '1px dashed rgba(255,255,255,0.04)',
}
function badgeStyle(color: string): React.CSSProperties {
  return { padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}30` }
}
function MockFooter() {
  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.18)', fontFamily: f.heading }}>Job-Lens India</span>
      <div style={{ display: 'flex', gap: 5 }}>
        {['Naukri','LinkedIn','Direct'].map(c => <span key={c} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.22)', padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>{c}</span>)}
      </div>
    </div>
  )
}

// ── mock 0 — overview: jobs + match ──────────────────────────────────────────

const INDIA_JOBS = [
  { title: 'Senior Product Manager', company: 'Flipkart',   location: 'Bengaluru', match: 89 },
  { title: 'Data Engineer',          company: 'Infosys',    location: 'Hyderabad', match: 84 },
  { title: 'UX Designer',            company: 'Swiggy',     location: 'Bengaluru', match: 81 },
]

function MockOverview() {
  const score   = useCountUp(89)
  const visible = useReveal(3, 500, 900)
  return (
    <div style={cardStyle}>
      <div style={{ background: '#0d2035', border: '1px solid rgba(255,153,51,0.14)', borderRadius: 13, padding: '20px 20px 18px', marginBottom: 18, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -20, width: 140, height: 120, background: 'radial-gradient(ellipse, rgba(255,153,51,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={labelStyle}>ATS + Career Score</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, margin: '14px 0 16px' }}>
          <span style={{ fontFamily: f.heading, fontSize: 54, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: -2, fontVariantNumeric: 'tabular-nums' as const }}>{score}</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginBottom: 7 }}>/100</span>
          <div style={{ marginLeft: 'auto', marginBottom: 5, ...badgeStyle('#3DD68C') }}>↑ Strong</div>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${score}%`, background: 'linear-gradient(90deg,#FF9933,#FEBC2E)', borderRadius: 2, transition: 'width 0.08s linear' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' as const }}>
          {['Product Strategy','Stakeholder Mgmt','Agile'].map(t => <span key={t} style={tagStyle}>{t}</span>)}
        </div>
      </div>
      <div style={labelStyle}>Matched Roles</div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 7, marginTop: 10 }}>
        {INDIA_JOBS.map((job, i) => visible > i ? (
          <div key={i} style={{ ...rowStyle, animation: 'hin-in 0.3s ease both' }}>
            <div style={avatarStyle}>{job.company[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 2, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.25)' }}>{job.company} · {job.location}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#3DD68C', flexShrink: 0 }}>{job.match}%</div>
          </div>
        ) : <div key={i} style={placeholderStyle} />)}
      </div>
      <MockFooter />
    </div>
  )
}

// ── mock 1 — ATS score ────────────────────────────────────────────────────────

const ATS_KEYWORDS = [
  { word: 'Product Roadmap',     found: true  },
  { word: 'Stakeholder Mgmt',    found: true  },
  { word: 'OKR / KPI',           found: true  },
  { word: 'A/B Testing',         found: false },
  { word: 'GTM Strategy',        found: false },
]

function MockATS() {
  const score   = useCountUp(72, 1200, 500)
  const visible = useReveal(ATS_KEYWORDS.length, 400, 700)
  return (
    <div style={cardStyle}>
      {/* ATS score ring */}
      <div style={{ background: '#0d2035', border: '1px solid rgba(61,214,140,0.14)', borderRadius: 13, padding: '18px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
          <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="36" cy="36" r="28" fill="none" stroke="#3DD68C" strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - score / 100)}`}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.08s linear' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: f.heading, fontSize: 18, fontWeight: 800, color: '#fff' }}>{score}</div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: f.heading, marginBottom: 4 }}>ATS Score</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>72/100 — Good match.<br />3 keywords missing.</div>
        </div>
      </div>

      <div style={labelStyle}>Keyword Analysis</div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 7, marginTop: 10 }}>
        {ATS_KEYWORDS.map((kw, i) => visible > i ? (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'hin-in 0.28s ease both' }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, background: kw.found ? 'rgba(61,214,140,0.12)' : 'rgba(255,80,80,0.1)', border: `1px solid ${kw.found ? 'rgba(61,214,140,0.3)' : 'rgba(255,80,80,0.25)'}`, color: kw.found ? '#3DD68C' : '#FF5050' }}>
              {kw.found ? '✓' : '✗'}
            </span>
            <span style={{ fontSize: 12, color: kw.found ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)' }}>{kw.word}</span>
            {!kw.found && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,80,80,0.7)', fontWeight: 600 }}>Missing</span>}
          </div>
        ) : null)}
      </div>
      <MockFooter />
    </div>
  )
}

// ── mock 2 — Kira chat ────────────────────────────────────────────────────────

const KIRA_CHAT = [
  { from: 'user', text: 'What salary should I expect as a Senior PM in Bengaluru?' },
  { from: 'kira', text: 'For a Senior PM in Bengaluru with 5–8 years experience: ₹28–42 LPA. Top companies like Flipkart or Swiggy can go up to ₹55 LPA. Your CV scores 89 — you\'re well-positioned.' },
  { from: 'user', text: 'Which skills should I add?' },
]

function MockKira() {
  const visible = useReveal(KIRA_CHAT.length, 950, 350)
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: f.heading }}>Kira</div>
          <div style={{ fontSize: 10.5, color: '#8B5CF6' }}>● Online · India Market</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, minHeight: 190 }}>
        {KIRA_CHAT.map((m, i) => visible > i ? (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start', animation: 'hin-in 0.3s ease both' }}>
            <div style={{ maxWidth: '84%', padding: '9px 13px', borderRadius: m.from === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.from === 'user' ? 'rgba(139,92,246,0.22)' : '#0d2035', border: `1px solid ${m.from === 'user' ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.07)'}`, fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55 }}>
              {m.text}
            </div>
          </div>
        ) : null)}
        {visible < KIRA_CHAT.length && (
          <div style={{ display: 'flex', gap: 4, padding: '8px 12px' }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(139,92,246,0.5)', animation: `hin-dot 1.2s ease ${i*0.2}s infinite` }} />)}
          </div>
        )}
      </div>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, background: '#0d2035', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '9px 12px' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', flex: 1 }}>Ask Kira anything…</span>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
      </div>
      <style>{`@keyframes hin-dot{0%,80%,100%{opacity:0.2;transform:scale(0.8)}40%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}

// ── mock 3 — auto apply ───────────────────────────────────────────────────────

const AA_FIELDS = [
  { label: 'Full name',         value: 'Priya Sharma',         done: true  },
  { label: 'Email',             value: 'priya@example.com',    done: true  },
  { label: 'Current CTC',       value: '₹ 18,00,000 / year',   done: true  },
  { label: 'Expected CTC',      value: '₹ 28,00,000 / year',   done: false },
  { label: 'Notice period',     value: '',                     done: false },
]

function MockAutoApply() {
  const visible = useReveal(AA_FIELDS.length, 480, 300)
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, background: '#0d2035', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '4px 10px', fontSize: 10.5, color: 'rgba(255,255,255,0.25)' }}>
          naukri.com/jobs/apply
        </div>
      </div>
      <div style={labelStyle}>Kira is filling the form…</div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginTop: 10 }}>
        {AA_FIELDS.map((field, i) => visible > i ? (
          <div key={i} style={{ animation: 'hin-in 0.28s ease both' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 3, fontWeight: 600 }}>{field.label}</div>
            <div style={{ padding: '8px 11px', borderRadius: 7, background: field.done ? 'rgba(91,143,249,0.08)' : '#0d2035', border: `1px solid ${field.done ? 'rgba(91,143,249,0.3)' : 'rgba(255,255,255,0.08)'}`, fontSize: 12, color: field.done ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {field.done && <span style={{ color: '#5B8FF9', fontSize: 11, flexShrink: 0 }}>✓</span>}
              <span style={{ flex: 1 }}>{field.value || 'Generating…'}</span>
              {!field.done && i === visible - 1 && <span style={{ width: 8, height: 16, background: '#5B8FF9', borderRadius: 1, animation: 'hin-cursor 0.8s step-end infinite' }} />}
            </div>
          </div>
        ) : null)}
      </div>
      <style>{`@keyframes hin-cursor{0%,100%{opacity:1}50%{opacity:0}}`}</style>
      <MockFooter />
    </div>
  )
}

// ── mock 4 — job case ─────────────────────────────────────────────────────────

const JC_REQS = [
  { label: 'Product Roadmap',    match: true  },
  { label: 'Stakeholder Mgmt',   match: true  },
  { label: 'Data-driven mindset',match: true  },
  { label: 'SCRUM / Agile',      match: false },
]

function MockJobCase() {
  const visible = useReveal(JC_REQS.length, 450, 400)
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: f.heading }}>Senior Product Manager</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Flipkart · Bengaluru</div>
        </div>
        <div style={{ ...badgeStyle('#F59E0B') }}>91%</div>
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />
      <div style={labelStyle}>Requirements</div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 7, marginTop: 10 }}>
        {JC_REQS.map((req, i) => visible > i ? (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'hin-in 0.28s ease both' }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, background: req.match ? 'rgba(61,214,140,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${req.match ? 'rgba(61,214,140,0.3)' : 'rgba(255,255,255,0.1)'}`, color: req.match ? '#3DD68C' : 'rgba(255,255,255,0.3)' }}>
              {req.match ? '✓' : '○'}
            </span>
            <span style={{ fontSize: 12, color: req.match ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)' }}>{req.label}</span>
          </div>
        ) : null)}
      </div>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 9, padding: '9px 12px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
        <span style={{ fontSize: 11.5, color: '#F59E0B', fontWeight: 600 }}>90s intro video · ready</span>
      </div>
      <div style={{ marginTop: 10, background: 'linear-gradient(135deg,#D97706,#F59E0B)', borderRadius: 9, padding: '9px 0', textAlign: 'center' as const, fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: f.heading }}>
        Send link to recruiter →
      </div>
    </div>
  )
}

const MOCKS = [MockOverview, MockATS, MockKira, MockAutoApply, MockJobCase]

// ── progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ duration, color }: { duration: number; color: string }) {
  const id = `hin-pb-${color.replace('#','')}`
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.04)' }}>
      <style>{`@keyframes ${id}{from{width:0}to{width:100%}}`}</style>
      <div style={{ height: '100%', background: color, animation: `${id} ${duration}ms linear forwards`, opacity: 0.7 }} />
    </div>
  )
}

// ── main ─────────────────────────────────────────────────────────────────────

interface Props {
  user?: boolean
}

const PILL_LABELS = ['Overview', 'ATS Score', 'Kira AI', 'Auto Apply', 'Job Case']

export default function HeroIN({ user }: Props) {
  const [active, setActive] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const activeRef = useRef(0)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const pausedRef = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 960px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) {
        const next = (activeRef.current + 1) % SLIDES.length
        activeRef.current = next
        setActive(next)
      }
    }, INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const manualGo = (i: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    activeRef.current = i
    setActive(i)
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) {
        const next = (activeRef.current + 1) % SLIDES.length
        activeRef.current = next
        setActive(next)
      }
    }, INTERVAL)
  }
  const slide = SLIDES[active]
  const Mock  = MOCKS[active]
  const href  = (path: string) => user ? path : `/in/login?next=${encodeURIComponent(path)}`

  return (
    <section
      style={{ background: '#060d16', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      <style>{`
        @keyframes hin-in  { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes hin-rup { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hin-slide-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .hin-slide { animation: hin-slide-in ${FADE_MS}ms ease both; }
        .hin-right { animation: hin-rup 0.55s ease 0.15s both; }
        .hin-dot { height:6px; border-radius:3px; border:none; cursor:pointer; padding:0; transition:width 0.3s,background 0.3s; }
        .hin-pill { font-size:11px; font-weight:500; border-radius:7px; padding:5px 12px; border:none; cursor:pointer; font-family:${f.heading}; transition:background 0.25s,color 0.25s; }
        .hin-ghost { background:transparent; color:rgba(255,255,255,0.55); padding:12px 24px; border-radius:9px; border:1px solid rgba(255,255,255,0.12); font-weight:600; font-size:14px; font-family:${f.heading}; text-decoration:none; display:inline-block; transition:border-color 0.16s,color 0.16s,transform 0.16s; }
        .hin-ghost:hover { border-color:rgba(255,255,255,0.3); color:#fff; transform:translateY(-1px); }
        @media(max-width:960px){ .hin-right{display:none!important} }
        @media(max-width:960px){ .hin-grid{grid-template-columns:1fr!important} }
        @media(max-width:600px){ .hin-grid{padding:48px 16px 40px!important} }
      `}</style>

      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: -140, right: '14%', width: 620, height: 500, background: `radial-gradient(ellipse,${slide.bg} 0%,transparent 65%)`, pointerEvents: 'none', transition: 'background 0.6s ease' }} />

      <div className="hin-grid" style={{ maxWidth: 1080, margin: '0 auto', padding: isMobile ? '52px 16px 44px' : '80px 24px 60px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 32 : 56, alignItems: 'center', position: 'relative', zIndex: 1 }}>

        {/* LEFT */}
        <div>
          <div key={active} className="hin-slide">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: slide.color, flexShrink: 0 }} />
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.32)', letterSpacing: 1.8, textTransform: 'uppercase' as const, fontFamily: f.heading }}>{slide.tag}</span>
            </div>

            <h1 style={{ fontFamily: f.heading, fontWeight: 800, lineHeight: 1.08, fontSize: 'clamp(28px,3.6vw,48px)', color: '#fff', margin: '0 0 16px', letterSpacing: -1.4 }}>
              {slide.h1}<br /><span style={{ color: slide.color }}>{slide.h1Accent}</span>
            </h1>

            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.78, margin: '0 0 32px', maxWidth: 400 }}>{slide.sub}</p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginBottom: 36, alignItems: 'center' }}>
              {slide.comingSoon ? (
                <span style={{ display: 'inline-block', padding: '12px 26px', borderRadius: 9, background: `${slide.color}18`, border: `1.5px solid ${slide.color}44`, color: slide.color, fontWeight: 700, fontSize: 14, fontFamily: f.heading }}>
                  {slide.cta}
                </span>
              ) : (
                <>
                  <Link href={href(slide.href)} style={{ background: slide.color, color: '#fff', padding: '12px 26px', borderRadius: 9, fontWeight: 700, fontSize: 14, fontFamily: f.heading, textDecoration: 'none', display: 'inline-block', boxShadow: `0 6px 24px ${slide.color}35`, transition: 'opacity 0.16s,transform 0.16s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity='0.88';(e.currentTarget as HTMLElement).style.transform='translateY(-1px)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity='1';(e.currentTarget as HTMLElement).style.transform='translateY(0)' }}>
                    {slide.cta} →
                  </Link>
                  <Link href={href('/in/jobs')} className="hin-ghost">Browse jobs</Link>
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.28 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3DD68C' }} />
              <span style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>5 free credits on signup · No card needed</span>
            </div>
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 36, flexWrap: 'wrap' as const }}>
            {SLIDES.map((s, i) => (
              <button key={i} className="hin-dot" onClick={() => manualGo(i)}
                style={{ width: i === active ? 28 : 8, background: i === active ? s.color : 'rgba(255,255,255,0.15)' }}
                aria-label={PILL_LABELS[i]} />
            ))}
            <div style={{ display: 'flex', gap: 6, marginLeft: 10, flexWrap: 'wrap' as const }}>
              {SLIDES.map((s, i) => (
                <button key={i} className="hin-pill" onClick={() => manualGo(i)} style={{
                  background: i === active ? `${s.color}18` : 'rgba(255,255,255,0.04)',
                  color: i === active ? s.color : 'rgba(255,255,255,0.3)',
                  outline: i === active ? `1px solid ${s.color}44` : '1px solid rgba(255,255,255,0.08)',
                }}>
                  {PILL_LABELS[i]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        {!isMobile && (
          <div className="hin-right">
            <Mock key={active} />
          </div>
        )}
      </div>

      <ProgressBar key={active} duration={INTERVAL} color={slide.color} />
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
    </section>
  )
}
