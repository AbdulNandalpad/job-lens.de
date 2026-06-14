'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { theme } from '@/lib/theme'

const { fonts: f } = theme

interface Slide {
  color: string
  bg: string
  tag:      { de: string; en: string }
  h1:       { de: string; en: string }
  h1Accent: { de: string; en: string }
  sub:      { de: string; en: string }
  cta:      { de: string; en: string }
  href: string
  comingSoon?: boolean
}

const SLIDES: Slide[] = [
  {
    color: '#378ADD', bg: 'rgba(55,138,221,0.07)',
    tag:      { de: 'Deutschland · Schweiz · Österreich', en: 'Germany · Switzerland · Austria' },
    h1:       { de: 'Bewerbungen im DACH-Markt', en: 'Applying for jobs in DACH' },
    h1Accent: { de: 'neu gedacht.', en: 'redefined.' },
    sub:      { de: 'Weniger Klicks, weniger Stress — mehr Rückmeldungen. Career Scan, KI-Jobsuche, Lebenslauf, Anschreiben, Auto Apply — alles an einem Ort.', en: 'Less clicking, less stress, more callbacks. Career Scan, AI job search, CV, cover letter, Auto Apply — all in one place.' },
    cta:      { de: 'Kostenlos starten', en: 'Get started free' },
    href: '/app/career-scan',
  },
  {
    color: '#8B5CF6', bg: 'rgba(139,92,246,0.07)',
    tag:      { de: 'Kira AI · KI-Karriereassistentin', en: 'Kira AI · Your Job Assistant' },
    h1:       { de: 'Was, wenn Jobsuche so einfach wäre', en: 'What if finding a job was' },
    h1Accent: { de: 'wie ein Gespräch?', en: 'as easy as a conversation?' },
    sub:      { de: 'Lern Kira kennen — deine KI-Karriereassistentin. Sag ihr, was du suchst. Sie findet passende Stellen, liest deinen Lebenslauf und liefert echte Gehaltsdaten. Kein Formular. Einfach reden.', en: "Meet Kira — your AI job assistant. Tell her what you\'re looking for, she finds the roles, reads your CV, gives real salary data. No filters. No forms. Just talk." },
    cta:      { de: 'Kira kennenlernen', en: 'Meet Kira' },
    href: '/app/ai',
  },
  {
    color: '#10B981', bg: 'rgba(16,185,129,0.07)',
    tag:      { de: 'Auto Apply · Beta', en: 'Auto Apply · Beta' },
    h1:       { de: 'Du lehnst dich zurück —', en: 'You relax.' },
    h1Accent: { de: 'Kira bewirbt sich für dich.', en: 'Let Kira apply for you.' },
    sub:      { de: 'Gib deinen Lebenslauf und die Formular-URL ein. Kira öffnet das Formular, liest jedes Feld und füllt alles aus. Du schaust zu, prüfst — und bestätigst.', en: 'Share your CV and the job form URL. Kira opens it, reads every field, fills in your details — everything. You watch, review, and confirm.' },
    cta:      { de: 'Auto Apply testen', en: 'Try Auto Apply' },
    href: '/app/auto-apply',
  },
  {
    color: '#F59E0B', bg: 'rgba(245,158,11,0.07)',
    tag:      { de: 'Demnächst · Job Case', en: 'Coming Soon · Job Case' },
    h1:       { de: 'Der klassische Lebenslauf —', en: 'The way traditional CVs work' },
    h1Accent: { de: 'wird sich verändern.', en: 'is about to change.' },
    sub:      { de: 'Stell dir vor: ein erstes Vorstellungsgespräch, ausgelöst durch eine Stellenanzeige. Kein Lebenslauf. Kein Anschreiben. Lern Job Case kennen — eine neue Art, sich zu bewerben.', en: 'Ever heard of doing a first-level interview just from a job posting? Meet Job Case — a new way of presenting yourself for a role. Not a CV. Not a cover letter. Something better.' },
    cta:      { de: 'Coming Soon', en: 'Coming Soon' },
    href: '#',
    comingSoon: true,
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
      const from  = Math.max(0, target - 26)
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

// ── mock: slide 0 — career score + jobs ──────────────────────────────────────

const JOBS = [
  { title: 'Senior Product Manager', company: 'SAP SE',     location: 'Berlin',  match: 91 },
  { title: 'Engineering Lead',       company: 'Siemens AG', location: 'München', match: 87 },
  { title: 'UX Designer',            company: 'Zalando',    location: 'Hamburg', match: 83 },
]

function MockOverview({ de }: { de: boolean }) {
  const score   = useCountUp(84)
  const visible = useReveal(3, 500, 900)
  return (
    <div style={card}>
      <div style={{ background: '#0d2035', border: '1px solid rgba(55,138,221,0.14)', borderRadius: 13, padding: '20px 20px 18px', marginBottom: 18, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -20, width: 140, height: 120, background: 'radial-gradient(ellipse, rgba(55,138,221,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={label}>Career Score</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 16 }}>
          <span style={{ fontFamily: f.heading, fontSize: 54, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: -2, fontVariantNumeric: 'tabular-nums' as const }}>{score}</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginBottom: 7 }}>/100</span>
          <div style={{ marginLeft: 'auto', marginBottom: 5, ...badge('#3DD68C') }}>{de ? '↑ Stark' : '↑ Strong'}</div>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${score}%`, background: 'linear-gradient(90deg,#2563EB,#378ADD 60%,#3DD68C)', borderRadius: 2, transition: 'width 0.08s linear' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' as const }}>
          {(de ? ['Produktstrategie','Stakeholder','Datenanalyse'] : ['Product Strategy','Stakeholder Mgmt','Data Analysis']).map(t => (
            <span key={t} style={tag}>{t}</span>
          ))}
        </div>
      </div>
      <div style={label}>{de ? 'Passende Stellen' : 'Matched roles'}</div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 7, marginTop: 10 }}>
        {JOBS.map((job, i) => visible > i ? (
          <div key={i} style={{ ...row, animation: 'heu-in 0.3s ease both' }}>
            <div style={avatar}>{job.company[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={rowTitle}>{job.title}</div>
              <div style={rowSub}>{job.company} · {job.location}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#3DD68C', flexShrink: 0 }}>{job.match}%</div>
          </div>
        ) : <div key={i} style={placeholder} />)}
      </div>
      {footer('Job-Lens AI')}
    </div>
  )
}

// ── mock: slide 1 — Kira chat ────────────────────────────────────────────────

const CHAT_DE = [
  { from: 'user', text: 'Ich suche eine PM-Stelle in Berlin.' },
  { from: 'kira', text: 'Ich habe 12 passende Stellen gefunden. Dein CV-Score liegt bei 84 — sehr gut für Senior-PM-Rollen. Soll ich die Top-3 zeigen?' },
  { from: 'user', text: 'Ja bitte!' },
]
const CHAT_EN = [
  { from: 'user', text: 'Looking for a PM role in Berlin.' },
  { from: 'kira', text: "Found 12 matching roles. Your CV scores 84 — strong for Senior PM positions. Want me to show the top 3?" },
  { from: 'user', text: 'Yes please!' },
]

function MockKira({ de }: { de: boolean }) {
  const msgs    = de ? CHAT_DE : CHAT_EN
  const visible = useReveal(msgs.length, 900, 400)
  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: f.heading }}>Kira</div>
          <div style={{ fontSize: 10.5, color: '#8B5CF6' }}>● {de ? 'Online' : 'Online'}</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, minHeight: 180 }}>
        {msgs.map((m, i) => visible > i ? (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start', animation: 'heu-in 0.3s ease both' }}>
            <div style={{
              maxWidth: '82%', padding: '9px 13px', borderRadius: m.from === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: m.from === 'user' ? 'rgba(139,92,246,0.25)' : '#0d2035',
              border: `1px solid ${m.from === 'user' ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.07)'}`,
              fontSize: 12.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55,
            }}>
              {m.text}
            </div>
          </div>
        ) : null)}
        {visible < msgs.length && (
          <div style={{ display: 'flex', gap: 4, padding: '8px 12px' }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(139,92,246,0.5)', animation: `heu-dot-pulse 1.2s ease ${i*0.2}s infinite` }} />)}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, background: '#0d2035', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '9px 12px' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', flex: 1 }}>{de ? 'Nachricht eingeben…' : 'Type a message…'}</span>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
      </div>
      <style>{`@keyframes heu-dot-pulse { 0%,80%,100%{opacity:0.2;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  )
}

// ── mock: slide 2 — auto apply form ──────────────────────────────────────────

const FIELDS_DE = [
  { label: 'Vollständiger Name',   value: 'Amir Hassan',               done: true  },
  { label: 'E-Mail',              value: 'amir@example.com',           done: true  },
  { label: 'Aktuelle Stelle',     value: 'Product Manager @ Delivery Hero', done: true },
  { label: 'Gehaltsvorstellung',  value: '€ 95.000 / Jahr',            done: false },
  { label: 'Anschreiben',         value: '',                           done: false },
]
const FIELDS_EN = [
  { label: 'Full name',           value: 'Amir Hassan',               done: true  },
  { label: 'Email',               value: 'amir@example.com',           done: true  },
  { label: 'Current role',        value: 'Product Manager @ Delivery Hero', done: true },
  { label: 'Salary expectation',  value: '€ 95,000 / year',           done: false },
  { label: 'Cover letter',        value: '',                           done: false },
]

function MockAutoApply({ de }: { de: boolean }) {
  const fields  = de ? FIELDS_DE : FIELDS_EN
  const visible = useReveal(fields.length, 480, 300)
  return (
    <div style={card}>
      {/* Browser bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, background: '#0d2035', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '4px 10px', fontSize: 10.5, color: 'rgba(255,255,255,0.25)' }}>
          greenhouse.io/jobs/apply
        </div>
      </div>

      <div style={label}>{de ? 'Kira füllt das Formular aus…' : 'Kira is filling the form…'}</div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginTop: 10 }}>
        {fields.map((field, i) => visible > i ? (
          <div key={i} style={{ animation: 'heu-in 0.28s ease both' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 3, fontWeight: 600 }}>{field.label}</div>
            <div style={{
              padding: '8px 11px', borderRadius: 7,
              background: field.done ? 'rgba(16,185,129,0.08)' : '#0d2035',
              border: `1px solid ${field.done ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
              fontSize: 12, color: field.done ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {field.done && <span style={{ color: '#10B981', fontSize: 11, flexShrink: 0 }}>✓</span>}
              <span style={{ flex: 1 }}>{field.value || (de ? 'Wird generiert…' : 'Generating…')}</span>
              {!field.done && i === visible - 1 && <span style={{ width: 8, height: 16, background: '#10B981', borderRadius: 1, animation: 'heu-cursor 0.8s step-end infinite' }} />}
            </div>
          </div>
        ) : null)}
      </div>
      <style>{`@keyframes heu-cursor { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      {footer(de ? 'Kira · Auto Apply' : 'Kira · Auto Apply')}
    </div>
  )
}

// ── mock: slide 3 — job case card ─────────────────────────────────────────────

const REQS_DE = [
  { label: 'Produktstrategie',      match: true  },
  { label: 'Stakeholder-Management',match: true  },
  { label: 'Datengetrieben',        match: true  },
  { label: 'SCRUM / Agile',         match: false },
]
const REQS_EN = [
  { label: 'Product Strategy',      match: true  },
  { label: 'Stakeholder Mgmt',      match: true  },
  { label: 'Data-driven mindset',   match: true  },
  { label: 'SCRUM / Agile',         match: false },
]

function MockJobCase({ de }: { de: boolean }) {
  const reqs    = de ? REQS_DE : REQS_EN
  const visible = useReveal(reqs.length, 450, 400)
  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: f.heading }}>Senior Product Manager</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Acme GmbH · Berlin</div>
        </div>
        <div style={badge('#F59E0B')}>92%</div>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />
      <div style={label}>{de ? 'Anforderungen' : 'Requirements'}</div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 7, marginTop: 10 }}>
        {reqs.map((req, i) => visible > i ? (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'heu-in 0.28s ease both' }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, background: req.match ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${req.match ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`, color: req.match ? '#10B981' : 'rgba(255,255,255,0.3)' }}>
              {req.match ? '✓' : '○'}
            </span>
            <span style={{ fontSize: 12, color: req.match ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)' }}>{req.label}</span>
          </div>
        ) : null)}
      </div>

      {/* Video bar */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 9, padding: '9px 12px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
        <span style={{ fontSize: 11.5, color: '#F59E0B', fontWeight: 600 }}>{de ? '90-Sek-Video · bereit' : '90s intro video · ready'}</span>
      </div>

      {/* Send link */}
      <div style={{ marginTop: 10, background: 'linear-gradient(135deg,#D97706,#F59E0B)', borderRadius: 9, padding: '9px 0', textAlign: 'center' as const, fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: f.heading }}>
        {de ? 'Link an Recruiter senden →' : 'Send link to recruiter →'}
      </div>
    </div>
  )
}

// ── shared style helpers ──────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#0b1825',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 18, padding: '24px 20px',
  boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
}
const label: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.22)',
  letterSpacing: 1.6, textTransform: 'uppercase',
}
const tag: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 5, padding: '3px 9px',
}
const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '11px 14px', background: '#0c1b2c',
  border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
}
const rowTitle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
  marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
}
const rowSub: React.CSSProperties = { fontSize: 10.5, color: 'rgba(255,255,255,0.25)' }
const avatar: React.CSSProperties = {
  width: 33, height: 33, borderRadius: 8, flexShrink: 0,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontFamily: f.heading,
}
const placeholder: React.CSSProperties = {
  height: 51, background: 'rgba(255,255,255,0.02)',
  borderRadius: 10, border: '1px dashed rgba(255,255,255,0.04)',
}
function badge(color: string): React.CSSProperties {
  return {
    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    color, background: `${color}18`, border: `1px solid ${color}30`,
  }
}
function footer(label: string) {
  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.18)', fontFamily: f.heading }}>{label}</span>
      <div style={{ display: 'flex', gap: 5 }}>
        {['DE','CH','AT'].map(c => <span key={c} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.22)', padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>{c}</span>)}
      </div>
    </div>
  )
}

// ── progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ duration, color }: { duration: number; color: string }) {
  const id = `heu-pb-${color.replace('#','')}`
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.04)' }}>
      <style>{`@keyframes ${id}{from{width:0}to{width:100%}}`}</style>
      <div style={{ height: '100%', background: color, animation: `${id} ${duration}ms linear forwards`, opacity: 0.7 }} />
    </div>
  )
}

// ── main ─────────────────────────────────────────────────────────────────────

interface Props {
  lang: 'DE' | 'EN'
  user?: { name: string } | null
}

const PILL_LABELS = ['Overview', 'Kira AI', 'Auto Apply', 'Job Case']
const MOCKS = [MockOverview, MockKira, MockAutoApply, MockJobCase]

export default function HeroEU({ lang, user }: Props) {
  const [active, setActive] = useState(0)
  const [fading, setFading] = useState(false)
  const activeRef           = useRef(0)
  const timerRef            = useRef<ReturnType<typeof setInterval> | null>(null)
  const pausedRef           = useRef(false)
  const animRef             = useRef(false)

  const advance = useCallback((next: number) => {
    if (animRef.current) return
    animRef.current = true
    setFading(true)
    setTimeout(() => {
      setActive(next)
      activeRef.current = next
      setFading(false)
      animRef.current = false
    }, FADE_MS)
  }, [])

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) advance((activeRef.current + 1) % SLIDES.length)
    }, INTERVAL)
  }, [advance])

  useEffect(() => { startTimer(); return () => { if (timerRef.current) clearInterval(timerRef.current) } }, [startTimer])

  const manualGo = (i: number) => { advance(i); startTimer() }

  const slide   = SLIDES[active]
  const de      = lang === 'DE'
  const go      = (path: string) => path === '#' ? '#' : user ? path : `/login?next=${encodeURIComponent(path)}`
  const Mock    = MOCKS[active]

  return (
    <section
      style={{ background: '#060d16', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      <style>{`
        @keyframes heu-in  { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes heu-rup { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .heu-slide { transition: opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease; }
        .heu-slide.out { opacity:0; transform:translateY(8px); }
        .heu-slide.in  { opacity:1; transform:translateY(0); }
        .heu-right { animation: heu-rup 0.55s ease 0.15s both; }
        .heu-dot { height:6px; border-radius:3px; border:none; cursor:pointer; padding:0; transition:width 0.3s,background 0.3s; }
        .heu-pill { font-size:11px; font-weight:500; border-radius:7px; padding:5px 12px; border:none; cursor:pointer; font-family:${f.heading}; transition:background 0.25s,color 0.25s,outline 0.25s; }
        .heu-ghost { background:transparent; color:rgba(255,255,255,0.55); padding:12px 24px; border-radius:9px; border:1px solid rgba(255,255,255,0.12); font-weight:600; font-size:14px; font-family:${f.heading}; text-decoration:none; display:inline-block; transition:border-color 0.16s,color 0.16s,transform 0.16s; }
        .heu-ghost:hover { border-color:rgba(255,255,255,0.3); color:#fff; transform:translateY(-1px); }
        @media(max-width:960px){ .heu-right{display:none!important} }
        @media(max-width:600px){ .heu-grid{padding:52px 16px 44px!important} }
      `}</style>

      {/* Ambient glow follows slide colour */}
      <div style={{ position: 'absolute', top: -140, right: '14%', width: 620, height: 500, background: `radial-gradient(ellipse,${slide.bg} 0%,transparent 65%)`, pointerEvents: 'none', transition: 'background 0.6s ease' }} />

      <div className="heu-grid" style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 24px 60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center', position: 'relative', zIndex: 1 }}>

        {/* LEFT */}
        <div>
          <div className={`heu-slide ${fading ? 'out' : 'in'}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: slide.color, flexShrink: 0 }} />
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.32)', letterSpacing: 1.8, textTransform: 'uppercase' as const, fontFamily: f.heading }}>
                {de ? slide.tag.de : slide.tag.en}
              </span>
            </div>

            <h1 style={{ fontFamily: f.heading, fontWeight: 800, lineHeight: 1.08, fontSize: 'clamp(28px,3.6vw,48px)', color: '#fff', margin: '0 0 16px', letterSpacing: -1.4 }}>
              {de ? slide.h1.de : slide.h1.en}<br />
              <span style={{ color: slide.color }}>{de ? slide.h1Accent.de : slide.h1Accent.en}</span>
            </h1>

            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.78, margin: '0 0 32px', maxWidth: 400 }}>
              {de ? slide.sub.de : slide.sub.en}
            </p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginBottom: 36, alignItems: 'center' }}>
              {slide.comingSoon ? (
                <span style={{ display: 'inline-block', padding: '12px 26px', borderRadius: 9, background: `${slide.color}18`, border: `1.5px solid ${slide.color}44`, color: slide.color, fontWeight: 700, fontSize: 14, fontFamily: f.heading }}>
                  {de ? slide.cta.de : slide.cta.en}
                </span>
              ) : (
                <>
                  <Link href={go(slide.href)} style={{ background: slide.color, color: '#fff', padding: '12px 26px', borderRadius: 9, fontWeight: 700, fontSize: 14, fontFamily: f.heading, textDecoration: 'none', display: 'inline-block', boxShadow: `0 6px 24px ${slide.color}35`, transition: 'opacity 0.16s,transform 0.16s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity='0.88';(e.currentTarget as HTMLElement).style.transform='translateY(-1px)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity='1';(e.currentTarget as HTMLElement).style.transform='translateY(0)' }}>
                    {de ? slide.cta.de : slide.cta.en} →
                  </Link>
                  <Link href={go('/app/jobs')} className="heu-ghost">{de ? 'Jobs entdecken' : 'Browse jobs'}</Link>
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.28 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3DD68C' }} />
              <span style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>
                {de ? '5 kostenlose Credits · Keine Karte nötig' : '5 free credits on signup · No card needed'}
              </span>
            </div>
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 36, flexWrap: 'wrap' as const }}>
            {SLIDES.map((s, i) => (
              <button key={i} className="heu-dot" onClick={() => manualGo(i)}
                style={{ width: i === active ? 28 : 8, background: i === active ? s.color : 'rgba(255,255,255,0.15)' }}
                aria-label={PILL_LABELS[i]} />
            ))}
            <div style={{ display: 'flex', gap: 6, marginLeft: 10, flexWrap: 'wrap' as const }}>
              {SLIDES.map((s, i) => (
                <button key={i} className="heu-pill" onClick={() => manualGo(i)} style={{
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

        {/* RIGHT — unique mock per slide, remounts to replay animations */}
        <div className="heu-right">
          <Mock key={active} de={de} />
        </div>
      </div>

      <ProgressBar key={active} duration={INTERVAL} color={slide.color} />
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
    </section>
  )
}
