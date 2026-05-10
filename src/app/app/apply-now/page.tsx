'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'

export default function ApplyNowPage() {
  const router = useRouter()
  const [job, setJob] = useState<{ job_title: string; employer_name: string; job_city?: string; job_country?: string; job_apply_link?: string; job_employment_type?: string; job_min_salary?: number; job_max_salary?: number; job_salary_currency?: string; matchScore?: number } | null>(null)
  const [tailoredCv, setTailoredCv] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [email, setEmail] = useState('sap.rashid@gmail.com')
  const [checks, setChecks] = useState({ cvDone: false, clDone: false, applied: false })
  const [sending, setSending] = useState<'cv' | 'cl' | null>(null)
  const [sent, setSent] = useState<{ cv: boolean; cl: boolean }>({ cv: false, cl: false })

  useEffect(() => {
    const jobRaw = sessionStorage.getItem('jl_cvb_job')
    const cv = sessionStorage.getItem('jl_cvb_tailored') || sessionStorage.getItem('jl_sjs_cv_text') || ''
    const cl = sessionStorage.getItem('jl_cl_letter') || ''
    if (jobRaw) { try { setJob(JSON.parse(jobRaw)) } catch { } }
    setTailoredCv(cv)
    setCoverLetter(cl)
  }, [])

  function downloadText(text: string, filename: string) {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  async function sendEmail(type: 'cv' | 'cl') {
    setSending(type)
    await new Promise(r => setTimeout(r, 1200))
    setSent(p => ({ ...p, [type]: true }))
    setSending(null)
  }

  function toggleCheck(key: keyof typeof checks) {
    setChecks(p => ({ ...p, [key]: !p[key] }))
  }

  function logToTracker() {
    const existing = JSON.parse(localStorage.getItem('jl_tracker') || '[]')
    const entry = {
      id: Date.now(),
      role: job?.job_title || 'Unknown Role',
      company: job?.employer_name || 'Unknown Company',
      date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }),
      notes: 'Via Job-Lens',
      source: 'Job-Lens',
    }
    localStorage.setItem('jl_tracker', JSON.stringify([entry, ...existing]))
    router.push('/app/tracker')
  }

  const progress = [checks.cvDone, checks.clDone, checks.applied].filter(Boolean).length
  const progressPct = Math.round((progress / 3) * 100)

  const salary = job?.job_min_salary && job?.job_max_salary
    ? `${job.job_salary_currency || 'EUR'} ${Math.round(job.job_min_salary / 1000)}-${Math.round(job.job_max_salary / 1000)}k`
    : null

  const STEPS = [
    { num: 1, label: 'Get CV', sub: 'Download or email' },
    { num: 2, label: 'Get Cover Letter', sub: 'Download or email' },
    { num: 3, label: 'Apply', sub: 'Opens job in new tab' },
    { num: 4, label: 'Log it', sub: 'Track your application' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');`}</style>
      <Navbar />

      {/* Job header bar */}
      {job && (
        <div style={{ background: '#042C53', padding: '10px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#E6F1FB', fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>
              {job.employer_name} · {[job.job_city, job.job_country].filter(Boolean).join(', ')}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {job.job_employment_type && <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.15)', color: '#E6F1FB', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>{job.job_employment_type}</span>}
              {salary && <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.15)', color: '#E6F1FB', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>{salary}</span>}
              {job.matchScore && <span style={{ fontSize: 11, background: 'rgba(29,158,117,0.3)', color: '#4ade80', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>{job.matchScore}% match score</span>}
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>

        {/* Progress bar */}
        <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#042C53', flexShrink: 0 }}>Application progress</div>
          <div style={{ flex: 1, height: 6, background: '#edf1f6', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(135deg, #378ADD, #1D9E75)', borderRadius: 10, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ fontSize: 12, color: '#6b7c93', flexShrink: 0 }}>{progressPct}% Complete all steps</div>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginBottom: 24, background: '#edf1f6', borderRadius: 12, overflow: 'hidden', border: '1px solid #edf1f6' }}>
          {STEPS.map((s, i) => (
            <div key={s.num} style={{ background: i === 0 ? '#E6F1FB' : '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#042C53' : '#edf1f6', color: i === 0 ? '#fff' : '#6b7c93', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{s.num}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#042C53' }}>{s.label}</div>
                <div style={{ fontSize: 11, color: '#6b7c93' }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CV + Cover Letter panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

          {/* CV Panel */}
          <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #edf1f6', fontSize: 13, fontWeight: 600, color: '#042C53' }}>
              CV - {job?.employer_name || 'Your CV'}
            </div>
            {/* Mini preview */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #edf1f6', background: '#fafbfd', minHeight: 80 }}>
              {tailoredCv ? (
                <div style={{ fontSize: 11, color: '#6b7c93', lineHeight: 1.5, maxHeight: 80, overflow: 'hidden' }}>
                  {tailoredCv.slice(0, 200)}...
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#8fa3b8' }}>No CV generated yet</div>
              )}
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: '#6b7c93', marginBottom: 10 }}>
                Step 1 - Get your tailored CV<br />
                <span style={{ color: '#8fa3b8' }}>Modern template · {job?.job_title || 'Your role'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <button onClick={() => tailoredCv && downloadText(tailoredCv, `CV_${job?.employer_name || 'JobLens'}.pdf`)} style={{ padding: '9px 0', borderRadius: 8, background: tailoredCv ? '#042C53' : '#edf1f6', color: tailoredCv ? '#fff' : '#9ab', border: 'none', cursor: tailoredCv ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700 }}>
                  Download PDF
                </button>
                <button onClick={() => tailoredCv && downloadText(tailoredCv, `CV_${job?.employer_name || 'JobLens'}.docx`)} style={{ padding: '9px 0', borderRadius: 8, background: '#fff', color: tailoredCv ? '#042C53' : '#9ab', border: `1.5px solid ${tailoredCv ? '#042C53' : '#edf1f6'}`, cursor: tailoredCv ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700 }}>
                  Download DOCX
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={email} onChange={e => setEmail(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #dde4ee', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#1a2332' }} />
                <button onClick={() => sendEmail('cv')} style={{ padding: '8px 16px', borderRadius: 8, background: '#378ADD', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', minWidth: 60 }}>
                  {sending === 'cv' ? '...' : sent.cv ? 'v' : 'Send'}
                </button>
              </div>
            </div>
          </div>

          {/* Cover Letter Panel */}
          <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #edf1f6', fontSize: 13, fontWeight: 600, color: '#042C53' }}>
              Cover Letter - {job?.employer_name || 'Company'}
            </div>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #edf1f6', background: '#fafbfd', minHeight: 80 }}>
              {coverLetter ? (
                <div style={{ fontSize: 11, color: '#6b7c93', lineHeight: 1.5, maxHeight: 80, overflow: 'hidden' }}>
                  {coverLetter.slice(0, 200)}...
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#8fa3b8' }}>No cover letter generated yet</div>
              )}
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: '#6b7c93', marginBottom: 10 }}>
                Step 2 - Get your cover letter<br />
                <span style={{ color: '#8fa3b8' }}>Confident tone · Personalised for {job?.employer_name || 'company'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <button onClick={() => coverLetter && downloadText(coverLetter, `CoverLetter_${job?.employer_name || 'JobLens'}.pdf`)} style={{ padding: '9px 0', borderRadius: 8, background: coverLetter ? '#042C53' : '#edf1f6', color: coverLetter ? '#fff' : '#9ab', border: 'none', cursor: coverLetter ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700 }}>
                  Download PDF
                </button>
                <button onClick={() => coverLetter && downloadText(coverLetter, `CoverLetter_${job?.employer_name || 'JobLens'}.docx`)} style={{ padding: '9px 0', borderRadius: 8, background: '#fff', color: coverLetter ? '#042C53' : '#9ab', border: `1.5px solid ${coverLetter ? '#042C53' : '#edf1f6'}`, cursor: coverLetter ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700 }}>
                  Download DOCX
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={email} onChange={e => setEmail(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #dde4ee', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#1a2332' }} />
                <button onClick={() => sendEmail('cl')} style={{ padding: '8px 16px', borderRadius: 8, background: '#378ADD', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', minWidth: 60 }}>
                  {sending === 'cl' ? '...' : sent.cl ? 'v' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 14, padding: 20, marginBottom: 20 }}>
          {[
            { key: 'cvDone' as const, label: 'CV downloaded or emailed to myself' },
            { key: 'clDone' as const, label: 'Cover letter downloaded or emailed to myself' },
            { key: 'applied' as const, label: 'Opened job posting to apply' },
          ].map(item => (
            <div key={item.key} onClick={() => toggleCheck(item.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f5f7fa', cursor: 'pointer' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${checks[item.key] ? '#1D9E75' : '#dde4ee'}`, background: checks[item.key] ? '#1D9E75' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                {checks[item.key] && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
              </div>
              <div style={{ fontSize: 13, color: checks[item.key] ? '#1D9E75' : '#6b7c93' }}>{item.label}</div>
            </div>
          ))}

          {/* Apply button */}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {job?.job_apply_link ? (
              <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer"
                onClick={() => toggleCheck('applied')}
                style={{ padding: '10px 24px', borderRadius: 8, background: 'linear-gradient(135deg, #042C53, #185FA5)', color: '#fff', textDecoration: 'none', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700 }}>
                Apply on company site →</a>
            ) : (
              <div style={{ fontSize: 13, color: '#8fa3b8' }}>No job link available</div>
            )}
            <button onClick={logToTracker}
              style={{ padding: '10px 24px', borderRadius: 8, background: checks.applied ? 'linear-gradient(135deg, #1D9E75, #059669)' : '#edf1f6', color: checks.applied ? '#fff' : '#9ab', border: 'none', cursor: checks.applied ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, transition: 'all 0.2s' }}>
              v Log this application →</button>
          </div>
        </div>
      </div>
    </div>
  )
}