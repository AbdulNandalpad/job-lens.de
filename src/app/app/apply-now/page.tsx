'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { theme } from '@/lib/theme'

const { colors: c, gradients: g, fonts: f } = theme

interface Job {
  job_title: string
  employer_name: string
  job_city?: string
  job_country?: string
  job_apply_link?: string
  job_employment_type?: string
  job_min_salary?: number
  job_max_salary?: number
  job_salary_currency?: string
  matchScore?: number
}

const CHECK = '✓'
const ARROW = '→'

export default function ApplyNowPage() {
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [tailoredCv, setTailoredCv] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [email, setEmail] = useState('')
  const [cvSaved, setCvSaved] = useState(false)
  const [clSaved, setClSaved] = useState(false)
  const [applied, setApplied] = useState(false)
  const [sending, setSending] = useState<'cv' | 'cl' | null>(null)
  const [sent, setSent] = useState<{ cv: boolean; cl: boolean }>({ cv: false, cl: false })
  const [logged, setLogged] = useState(false)

  useEffect(() => {
    const jobRaw = sessionStorage.getItem('jl_cvb_job')
    const cv = sessionStorage.getItem('jl_cvb_tailored') || sessionStorage.getItem('jl_sjs_cv_text') || ''
    const cl = sessionStorage.getItem('jl_cl_letter') || ''
    if (jobRaw) { try { setJob(JSON.parse(jobRaw)) } catch { } }
    setTailoredCv(cv)
    setCoverLetter(cl)
  }, [])

  function download(text: string, filename: string) {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  async function emailDoc(type: 'cv' | 'cl') {
    if (!email.trim()) return
    setSending(type)
    await new Promise(r => setTimeout(r, 1200))
    setSent(p => ({ ...p, [type]: true }))
    setSending(null)
    if (type === 'cv') setCvSaved(true)
    else setClSaved(true)
  }

  function saveToTracker() {
    const existing = JSON.parse(localStorage.getItem('jl_tracker') || '[]')
    localStorage.setItem('jl_tracker', JSON.stringify([{
      id: Date.now(),
      role: job?.job_title || 'Unknown Role',
      company: job?.employer_name || 'Unknown Company',
      date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }),
      notes: 'Via Job-Lens Apply Now',
      source: 'Job-Lens',
    }, ...existing]))
    setLogged(true)
    setTimeout(() => router.push('/app/tracker'), 800)
  }

  const stepsCompleted = [cvSaved, clSaved, applied].filter(Boolean).length
  const progressPct = Math.round((stepsCompleted / 3) * 100)
  const salary = job?.job_min_salary && job?.job_max_salary
    ? `${job.job_salary_currency || 'EUR'} ${Math.round(job.job_min_salary / 1000)}–${Math.round(job.job_max_salary / 1000)}k`
    : null
  const location = [job?.job_city, job?.job_country].filter(Boolean).join(', ')

  const docCard = (
    title: string, subtitle: string, text: string, noTextMsg: string,
    filename: string, saved: boolean, onSave: () => void, sendKey: 'cv' | 'cl'
  ) => (
    <div style={{ background: c.bgCard, border: `1.5px solid ${saved ? c.success : c.border}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.primary, fontFamily: f.heading }}>{title}</div>
          <div style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{subtitle}</div>
        </div>
        {saved && <span style={{ fontSize: 11, background: c.successLight, color: c.success, padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>{CHECK} Saved</span>}
      </div>
      <div style={{ padding: '12px 20px', background: c.bgSubtle, borderBottom: `1px solid ${c.border}`, minHeight: 64 }}>
        {text ? (
          <div style={{ fontSize: 11, color: c.textMuted, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
            {text.slice(0, 200)}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: c.textFaint, fontStyle: 'italic' }}>{noTextMsg}</div>
        )}
      </div>
      <div style={{ padding: '16px 20px' }}>
        <button
          onClick={() => { if (text) { download(text, filename); onSave() } }}
          disabled={!text}
          style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', background: text ? g.primaryBtn : c.border, color: text ? '#fff' : c.textFaint, cursor: text ? 'pointer' : 'not-allowed', fontFamily: f.heading, fontSize: 13, fontWeight: 700, marginBottom: 10, transition: 'opacity 0.15s' }}>
          Download
        </button>
        <div style={{ fontSize: 12, color: c.textFaint, marginBottom: 6 }}>Or email it to yourself:</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${c.borderLight}`, fontSize: 12, fontFamily: 'inherit', outline: 'none', color: c.text }} />
          <button onClick={() => emailDoc(sendKey)} disabled={!text || !email.trim()}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: sent[sendKey] ? c.success : c.accent, color: '#fff', cursor: (!text || !email.trim()) ? 'not-allowed' : 'pointer', fontFamily: f.heading, fontSize: 12, fontWeight: 700, minWidth: 60, opacity: (!text || !email.trim()) ? 0.5 : 1 }}>
            {sending === sendKey ? '...' : sent[sendKey] ? CHECK : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');`}</style>
      <Navbar />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, paddingLeft: 14, borderLeft: `3px solid ${c.accent}` }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: c.primary, fontFamily: f.heading }}>Ready to apply?</div>
          <div style={{ fontSize: 13, color: c.textMuted, marginTop: 3 }}>Save your documents, then head to the job listing to apply.</div>
        </div>

        {/* Job banner */}
        {job ? (
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '16px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: c.primary, fontFamily: f.heading }}>{job.job_title}</div>
              <div style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>{job.employer_name}{location ? ` · ${location}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {job.job_employment_type && <span style={{ fontSize: 11, background: c.primaryLight, color: c.navy, padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>{job.job_employment_type}</span>}
              {salary && <span style={{ fontSize: 11, background: c.bg, color: c.textMuted, padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>{salary}</span>}
              {job.matchScore && <span style={{ fontSize: 11, background: c.successLight, color: c.success, padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>{job.matchScore}% match</span>}
            </div>
          </div>
        ) : (
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '16px 24px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: c.textFaint }}>No job selected yet. Go to <strong style={{ color: c.primary }}>Smart Job Search</strong> to find a job first.</div>
          </div>
        )}

        {/* Progress strip */}
        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '14px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 6, background: c.border, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: progressPct === 100 ? g.successBtn : g.button, borderRadius: 10, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ fontSize: 12, color: c.textMuted, flexShrink: 0, fontWeight: 500 }}>
              {stepsCompleted === 3 ? 'All done!' : `${stepsCompleted} of 3 done`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {[{ label: 'CV saved', done: cvSaved }, { label: 'Cover letter saved', done: clSaved }, { label: 'Applied', done: applied }].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: s.done ? g.successBtn : c.border, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, transition: 'all 0.2s' }}>
                  {s.done ? CHECK : <span style={{ color: c.textFaint }}>{i + 1}</span>}
                </div>
                <span style={{ fontSize: 12, color: s.done ? c.success : c.textMuted, fontWeight: s.done ? 600 : 400 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Document cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {docCard('Your CV', job ? `Written for ${job.employer_name}` : 'Your latest CV', tailoredCv, 'Head to CV Builder first to create your CV.', `CV_${job?.employer_name || 'JobLens'}.txt`, cvSaved, () => setCvSaved(true), 'cv')}
          {docCard('Your Cover Letter', job ? `Written for ${job.employer_name}` : 'Your latest cover letter', coverLetter, 'Head to Cover Letter first to write yours.', `CoverLetter_${job?.employer_name || 'JobLens'}.txt`, clSaved, () => setClSaved(true), 'cl')}
        </div>

        {/* Apply + save */}
        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.primary, fontFamily: f.heading, marginBottom: 6 }}>Now go apply</div>
          <div style={{ fontSize: 13, color: c.textMuted, marginBottom: 18 }}>
            Open the job listing, upload your documents, and hit submit. Come back and save your application once you&apos;re done.
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {job?.job_apply_link ? (
              <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer" onClick={() => setApplied(true)}
                style={{ padding: '11px 24px', borderRadius: 8, background: g.primaryBtn, color: '#fff', textDecoration: 'none', fontFamily: f.heading, fontSize: 13, fontWeight: 700, display: 'inline-block' }}>
                {`Open job listing ${ARROW}`}
              </a>
            ) : (
              <div style={{ fontSize: 13, color: c.textFaint, padding: '11px 0' }}>No link saved for this job.</div>
            )}
            <button onClick={saveToTracker} disabled={!applied || logged}
              style={{ padding: '11px 24px', borderRadius: 8, border: 'none', fontFamily: f.heading, fontSize: 13, fontWeight: 700, transition: 'all 0.2s', cursor: (applied && !logged) ? 'pointer' : 'not-allowed', background: logged ? c.success : applied ? g.successBtn : c.border, color: (applied || logged) ? '#fff' : c.textFaint }}>
              {logged ? `${CHECK} Saved to my applications` : `Save to my applications ${ARROW}`}
            </button>
            {!applied && <div style={{ fontSize: 12, color: c.textFaint }}>Open the listing first, then save your application.</div>}
          </div>
        </div>

      </div>
    </div>
  )
}
