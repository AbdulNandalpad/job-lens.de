'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Navbar from '../components/Navbar'

interface Job {
  job_id: string
  job_title: string
  employer_name: string
  job_city: string
  job_country: string
  job_employment_type: string
  job_description: string
  job_apply_link: string
  job_posted_at_datetime_utc: string
  job_min_salary: number | null
  job_max_salary: number | null
  job_salary_currency: string | null
  matchScore?: number
}

export default function SmartApplyPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cvText, setCvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [keywords, setKeywords] = useState('')
  const [location, setLocation] = useState('Stuttgart, Germany')
  const [jobType, setJobType] = useState('fulltime')
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(false)
  const [cvLoading, setCvLoading] = useState(false)
  const [clLoading, setClLoading] = useState(false)
  const [tailoredCv, setTailoredCv] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [activeRight, setActiveRight] = useState<'cv' | 'cl'>('cv')
  const [mobOpen, setMobOpen] = useState(false)
  const [mobRight, setMobRight] = useState(false)
  const [error, setError] = useState('')

  function handleFile(file: File) {
    setFileName(file.name)
    const r = new FileReader()
    r.onload = e => setCvText((e.target?.result as string) ?? '')
    r.readAsText(file)
  }

  async function findJobs() {
    if (!keywords.trim()) return
    setLoading(true)
    setError('')
    setJobs([])
    setSelectedJob(null)
    setTailoredCv('')
    setCoverLetter('')
    try {
      const res = await fetch(`/api/jobs?q=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&type=${jobType}`)
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setJobs(data.jobs || [])
    } catch {
      setError('Failed to fetch jobs. Check your RapidAPI key.')
    }
    setLoading(false)
  }

  async function generateCv() {
    if (!selectedJob || !cvText) return
    setCvLoading(true)
    setActiveRight('cv')
    try {
      const res = await fetch('/api/tailor-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, job: selectedJob }),
      })
      const data = await res.json()
      setTailoredCv(data.cv || '')
    } catch {
      setTailoredCv('Failed to generate CV. Please try again.')
    }
    setCvLoading(false)
  }

  async function generateCoverLetter() {
    if (!selectedJob || !cvText) return
    setClLoading(true)
    setActiveRight('cl')
    try {
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, job: selectedJob }),
      })
      const data = await res.json()
      setCoverLetter(data.coverLetter || '')
    } catch {
      setCoverLetter('Failed to generate cover letter. Please try again.')
    }
    setClLoading(false)
  }

  function selectJob(job: Job) {
    setSelectedJob(job)
    setTailoredCv('')
    setCoverLetter('')
    setActiveRight('cv')
    setMobRight(true)
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '0.5px solid #dce4ef', fontSize: 13,
    fontFamily: "'DM Sans', sans-serif", color: '#1a2332',
    background: '#f7f9fc', outline: 'none', boxSizing: 'border-box',
  }

  const lbl = (t: string) => (
    <div style={{ fontSize: 11, fontWeight: 500, color: '#6b7c93', letterSpacing: 0.3, textTransform: 'uppercase' as const, marginBottom: 5 }}>{t}</div>
  )

  const Sidebar = (
    <>
      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600, color: '#042C53', textTransform: 'uppercase' as const, letterSpacing: 0.3 }}>
        Your CV
      </div>
      <div
        onDragOver={e => { e.preventDefault() }}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `1.5px ${fileName ? 'solid #1D9E75' : 'dashed #dce4ef'}`,
          borderRadius: 10, padding: 14, textAlign: 'center',
          cursor: 'pointer', background: fileName ? '#E1F5EE' : '#f7f9fc',
        }}
      >
        <input ref={fileInputRef} type="file" accept=".pdf,.txt,.doc,.docx"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <div style={{ fontSize: 11, color: '#6b7c93', lineHeight: 1.5 }}>
          <strong style={{ display: 'block', fontSize: 12, color: '#1a2332', fontWeight: 500, marginBottom: 2 }}>
            {fileName || 'Upload CV'}
          </strong>
          {fileName
            ? <span style={{ color: '#0F6E56', fontWeight: 500 }}>Ready for AI tailoring</span>
            : 'Upload to enable AI CV + Cover Letter'}
        </div>
      </div>

      <div style={{ height: '0.5px', background: '#dce4ef' }} />

      <div>{lbl('Job Keywords')}
        <input value={keywords} onChange={e => setKeywords(e.target.value)}
          placeholder="e.g. SAP CX, Product Owner"
          onKeyDown={e => e.key === 'Enter' && findJobs()}
          style={inp} />
      </div>

      <div>{lbl('Location')}
        <input value={location} onChange={e => setLocation(e.target.value)}
          placeholder="City or country"
          style={inp} />
      </div>

      <div>{lbl('Job Type')}
        <select value={jobType} onChange={e => setJobType(e.target.value)} style={inp}>
          <option value="fulltime">Full-time</option>
          <option value="parttime">Part-time</option>
          <option value="contractor">Contract</option>
          <option value="intern">Internship</option>
        </select>
      </div>

      <button
        disabled={!keywords.trim() || loading}
        onClick={findJobs}
        style={{
          width: '100%', padding: 11, borderRadius: 10, border: 'none',
          background: keywords.trim() ? '#042C53' : '#dce4ef',
          color: keywords.trim() ? '#E6F1FB' : '#6b7c93',
          fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600,
          cursor: keywords.trim() ? 'pointer' : 'not-allowed',
        }}
      >
        {loading ? 'Searching...' : 'Find Jobs'}
      </button>
    </>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        .jl-dsb { display: flex !important; }
        .jl-mbtn { display: none !important; }
        .jl-split { display: grid !important; grid-template-columns: 1fr 1fr; }
        @media (max-width: 1024px) {
          .jl-split { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .jl-dsb { display: none !important; }
          .jl-mbtn { display: block !important; }
          .jl-split { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Navbar />

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 52px)' }}>

        {/* Desktop sidebar */}
        <div className="jl-dsb" style={{
          width: 280, flexShrink: 0, background: '#fff',
          borderRight: '0.5px solid #dce4ef', padding: '20px 16px',
          flexDirection: 'column', gap: 14, overflowY: 'auto',
        }}>
          {Sidebar}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>

          {/* Mobile sidebar toggle */}
          <div className="jl-mbtn" style={{ padding: '10px 16px', background: '#fff', borderBottom: '0.5px solid #dce4ef' }}>
            <button onClick={() => setMobOpen(o => !o)} style={{
              background: '#042C53', color: '#E6F1FB', border: 'none',
              borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer',
            }}>
              {mobOpen ? 'Close' : 'Search Settings'}
            </button>
          </div>

          {mobOpen && (
            <div style={{ background: '#fff', borderBottom: '0.5px solid #dce4ef', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Sidebar}
            </div>
          )}

          <div style={{ padding: 20 }}>

            {/* Empty state */}
            {!loading && jobs.length === 0 && !error && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7c93' }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }}>&#128188;</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#1a2332', marginBottom: 8 }}>Find your next role</div>
                <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                  Enter job keywords and location in the sidebar,<br />then click Find Jobs to see live postings.
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 10, padding: 16, fontSize: 13, color: '#A32D2D', marginBottom: 16 }}>
                {error}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #dce4ef', borderTopColor: '#378ADD', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <div style={{ fontSize: 14, color: '#6b7c93' }}>Searching live jobs...</div>
              </div>
            )}

            {/* Jobs + Right panel split */}
            {!loading && jobs.length > 0 && (
              <div className="jl-split" style={{ gap: 16, alignItems: 'start' }}>

                {/* Jobs list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 13, color: '#6b7c93', marginBottom: 4 }}>
                    {jobs.length} jobs found
                  </div>
                  {jobs.map(job => (
                    <div
                      key={job.job_id}
                      onClick={() => selectJob(job)}
                      style={{
                        background: '#fff',
                        border: `${selectedJob?.job_id === job.job_id ? '1.5px solid #378ADD' : '0.5px solid #dce4ef'}`,
                        borderRadius: 12, padding: 16, cursor: 'pointer',
                        transition: 'border-color 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#042C53', flex: 1, marginRight: 8 }}>{job.job_title}</div>
                        <span style={{
                          fontSize: 11, padding: '3px 8px', borderRadius: 10, fontWeight: 500, flexShrink: 0,
                          background: '#E1F5EE', color: '#0F6E56',
                        }}>Live</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7c93', marginBottom: 8 }}>
                        {job.employer_name} · {job.job_city || ''}{job.job_city && job.job_country ? ', ' : ''}{job.job_country || ''}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {job.job_employment_type && (
                          <span style={{ fontSize: 11, background: '#E6F1FB', color: '#185FA5', padding: '3px 8px', borderRadius: 8 }}>
                            {job.job_employment_type}
                          </span>
                        )}
                        {job.job_min_salary && (
                          <span style={{ fontSize: 11, background: '#E6F1FB', color: '#185FA5', padding: '3px 8px', borderRadius: 8 }}>
                            {job.job_salary_currency || ''} {job.job_min_salary.toLocaleString()}–{(job.job_max_salary || job.job_min_salary).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right panel */}
                <div>
                  {!selectedJob ? (
                    <div style={{ background: '#fff', border: '0.5px solid #dce4ef', borderRadius: 12, padding: 32, textAlign: 'center', color: '#6b7c93' }}>
                      <div style={{ fontSize: 13 }}>Click a job to see details and generate your tailored CV</div>
                    </div>
                  ) : (
                    <div style={{ background: '#fff', border: '0.5px solid #dce4ef', borderRadius: 12, overflow: 'hidden' }}>

                      {/* Job header */}
                      <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #dce4ef' }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#042C53', marginBottom: 4 }}>{selectedJob.job_title}</div>
                        <div style={{ fontSize: 13, color: '#6b7c93', marginBottom: 12 }}>{selectedJob.employer_name} · {selectedJob.job_city}</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <a href={selectedJob.job_apply_link} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: '#042C53', color: '#E6F1FB', textDecoration: 'none', fontWeight: 600 }}>
                            Apply Now
                          </a>
                          <button onClick={generateCv} disabled={!cvText || cvLoading}
                            style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: cvText ? '#E6F1FB' : '#f0f4f8', color: cvText ? '#185FA5' : '#6b7c93', border: '0.5px solid #dce4ef', cursor: cvText ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                            {cvLoading ? 'Generating...' : 'Tailor My CV'}
                          </button>
                          <button onClick={generateCoverLetter} disabled={!cvText || clLoading}
                            style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: cvText ? '#E6F1FB' : '#f0f4f8', color: cvText ? '#185FA5' : '#6b7c93', border: '0.5px solid #dce4ef', cursor: cvText ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                            {clLoading ? 'Generating...' : 'Cover Letter'}
                          </button>
                        </div>
                        {!cvText && (
                          <div style={{ fontSize: 11, color: '#BA7517', marginTop: 8 }}>
                            Upload your CV in the sidebar to enable AI tailoring
                          </div>
                        )}
                      </div>

                      {/* Tabs */}
                      {(tailoredCv || coverLetter || cvLoading || clLoading) && (
                        <div style={{ display: 'flex', borderBottom: '0.5px solid #dce4ef' }}>
                          {tailoredCv || cvLoading ? (
                            <div onClick={() => setActiveRight('cv')} style={{
                              fontSize: 12, padding: '8px 16px', cursor: 'pointer',
                              color: activeRight === 'cv' ? '#042C53' : '#6b7c93',
                              borderBottom: activeRight === 'cv' ? '2px solid #378ADD' : '2px solid transparent',
                              fontWeight: activeRight === 'cv' ? 500 : 400,
                            }}>Tailored CV</div>
                          ) : null}
                          {coverLetter || clLoading ? (
                            <div onClick={() => setActiveRight('cl')} style={{
                              fontSize: 12, padding: '8px 16px', cursor: 'pointer',
                              color: activeRight === 'cl' ? '#042C53' : '#6b7c93',
                              borderBottom: activeRight === 'cl' ? '2px solid #378ADD' : '2px solid transparent',
                              fontWeight: activeRight === 'cl' ? 500 : 400,
                            }}>Cover Letter</div>
                          ) : null}
                        </div>
                      )}

                      {/* CV / Cover letter content */}
                      <div style={{ padding: 20 }}>
                        {activeRight === 'cv' && (cvLoading ? (
                          <div style={{ textAlign: 'center', padding: '30px 0' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #dce4ef', borderTopColor: '#378ADD', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                            <div style={{ fontSize: 13, color: '#6b7c93' }}>Tailoring your CV for this role...</div>
                          </div>
                        ) : tailoredCv ? (
                          <div>
                            <pre style={{ fontSize: 12, color: '#1a2332', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif" }}>{tailoredCv}</pre>
                            <button
                              onClick={() => { const b = new Blob([tailoredCv], { type: 'text/plain' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `CV_${selectedJob.employer_name}.txt`; a.click() }}
                              style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, background: '#042C53', color: '#E6F1FB', border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                              Download CV
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, color: '#6b7c93', textAlign: 'center', padding: '20px 0' }}>
                            {cvText ? 'Click "Tailor My CV" to generate a role-specific CV' : 'Upload your CV in the sidebar first'}
                          </div>
                        ))}

                        {activeRight === 'cl' && (clLoading ? (
                          <div style={{ textAlign: 'center', padding: '30px 0' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #dce4ef', borderTopColor: '#378ADD', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                            <div style={{ fontSize: 13, color: '#6b7c93' }}>Writing your cover letter...</div>
                          </div>
                        ) : coverLetter ? (
                          <div>
                            <pre style={{ fontSize: 12, color: '#1a2332', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif" }}>{coverLetter}</pre>
                            <button
                              onClick={() => { const b = new Blob([coverLetter], { type: 'text/plain' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `CoverLetter_${selectedJob.employer_name}.txt`; a.click() }}
                              style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, background: '#042C53', color: '#E6F1FB', border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                              Download Cover Letter
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, color: '#6b7c93', textAlign: 'center', padding: '20px 0' }}>
                            Click "Cover Letter" to generate one for this role
                          </div>
                        ))}

                        {/* Job description */}
                        {!tailoredCv && !cvLoading && !coverLetter && !clLoading && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#042C53', marginBottom: 8 }}>Job Description</div>
                            <div style={{ fontSize: 12, color: '#6b7c93', lineHeight: 1.7, maxHeight: 300, overflowY: 'auto' }}>
                              {selectedJob.job_description?.slice(0, 800)}...
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}