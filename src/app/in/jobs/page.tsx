'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const orange = '#ff9933'
const navy = '#042C53'
const blue = '#378ADD'
const green = '#1D9E75'

interface Job {
  job_id: string
  job_title: string
  employer_name: string
  job_city: string
  job_employment_type: string
  job_description: string
  job_apply_link: string
  job_posted_at_datetime_utc: string
  job_min_salary: number | null
  job_max_salary: number | null
}

const CITIES = ['', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Noida', 'Gurgaon']

function timeAgo(dateStr: string) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function IndiaJobsPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    setSelectedJobId(null)
    setPage(1)
    try {
      const params = new URLSearchParams({ q: query, country: 'in', page: '1' })
      if (city) params.set('location', city)
      const res = await fetch(`/api/jobs?${params}`)
      const data = await res.json()
      const results = data.jobs || []
      setJobs(results)
      setHasMore(results.length === 20)
    } catch { setJobs([]); setHasMore(false) }
    setLoading(false)
  }

  async function loadMore() {
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const params = new URLSearchParams({ q: query, country: 'in', page: String(nextPage) })
      if (city) params.set('location', city)
      const res = await fetch(`/api/jobs?${params}`)
      const data = await res.json()
      const more = data.jobs || []
      setJobs(prev => [...prev, ...more])
      setPage(nextPage)
      setHasMore(more.length === 20)
    } catch {}
    setLoadingMore(false)
  }

  function selectJob(job: Job) {
    setSelectedJobId(prev => prev === job.job_id ? null : job.job_id)
    sessionStorage.setItem('jl_in_selected_job', JSON.stringify({
      job_title: job.job_title,
      employer_name: job.employer_name,
      job_description: job.job_description,
      job_city: job.job_city,
      job_apply_link: job.job_apply_link,
    }))
    if (job.job_description) sessionStorage.setItem('jl_ats_jd', job.job_description)
  }

  function goTo(path: string) {
    if (path === '/in/cv-builder') sessionStorage.removeItem('jl_ats_suggestions')
    router.push(path)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .jl-job-card { cursor: pointer; transition: box-shadow 0.15s, border-color 0.15s; }
        .jl-job-card:hover { box-shadow: 0 4px 16px rgba(4,44,83,0.1) !important; }
        .jl-action-btn { transition: opacity 0.15s, transform 0.15s; }
        .jl-action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
      `}</style>

      <div style={{ background: '#f0f4f8', minHeight: 'calc(100vh - 52px)', padding: '28px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          <div style={{ marginBottom: 24, paddingLeft: 14, borderLeft: `3px solid ${orange}` }}>
            <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 700, color: navy, margin: 0 }}>Job Search India</h1>
            <p style={{ fontSize: 13, color: '#6b7c93', margin: '4px 0 0' }}>Live job listings from Indian employers via Adzuna</p>
          </div>

          {/* Search bar */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(4,44,83,0.06)', border: '1px solid #edf1f6', marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="Job title or skill (e.g. React Developer)"
                style={{ flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 8, border: '1px solid #dce4ef', fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#1a2332' }}
              />
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #dce4ef', fontSize: 13, color: '#374151', fontFamily: "'DM Sans',sans-serif", outline: 'none', cursor: 'pointer' }}
              >
                {CITIES.map(c => <option key={c} value={c}>{c || 'All Cities'}</option>)}
              </select>
              <button onClick={search} disabled={loading}
                style={{ padding: '10px 24px', borderRadius: 8, background: loading ? '#ccc' : `linear-gradient(135deg, ${orange}, #e67300)`, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Results */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 48, color: '#9aafbc' }}>Searching jobs in India...</div>
          )}

          {!loading && searched && jobs.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: '#9aafbc' }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>0</div>
              No jobs found. Try a different search term or city.
            </div>
          )}

          {!loading && jobs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, color: '#9aafbc', marginBottom: 4 }}>{jobs.length} jobs found — tap a card to see actions</div>

              {jobs.map(job => {
                const isSelected = selectedJobId === job.job_id
                return (
                  <div key={job.job_id} className="jl-job-card"
                    onClick={() => selectJob(job)}
                    style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: `1.5px solid ${isSelected ? orange : '#edf1f6'}`, boxShadow: isSelected ? `0 4px 20px rgba(255,153,51,0.12)` : '0 2px 8px rgba(4,44,83,0.05)', transition: 'all 0.2s' }}>

                    {/* Card header — always visible */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: navy }}>{job.job_title}</div>
                          {isSelected && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: orange + '20', color: orange, fontWeight: 700, flexShrink: 0 }}>Selected</span>}
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7c93', marginBottom: 8 }}>
                          {job.employer_name}{job.job_city ? ` · ${job.job_city}` : ''}{job.job_employment_type ? ` · ${job.job_employment_type}` : ''}
                        </div>
                        <p style={{ fontSize: 12, color: '#8fa3b8', lineHeight: 1.6, margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: isSelected ? undefined : 2, WebkitBoxOrient: 'vertical', overflow: isSelected ? 'visible' : 'hidden' }}>
                          {job.job_description}
                        </p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          {job.job_min_salary && job.job_max_salary && (
                            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: 'rgba(29,158,117,0.1)', color: green, fontWeight: 600 }}>
                              Rs. {Math.round(job.job_min_salary / 100000)}L – {Math.round(job.job_max_salary / 100000)}L
                            </span>
                          )}
                          {job.job_posted_at_datetime_utc && (
                            <span style={{ fontSize: 11, color: '#9aafbc' }}>{timeAgo(job.job_posted_at_datetime_utc)}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 16, color: isSelected ? orange : '#c0cfe0', flexShrink: 0, transition: 'transform 0.2s', transform: isSelected ? 'rotate(180deg)' : 'rotate(0deg)', marginTop: 2 }}>v</div>
                    </div>

                    {/* Expanded actions */}
                    {isSelected && (
                      <div onClick={e => e.stopPropagation()} style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${orange}20` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: orange, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>What do you want to do?</div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <button className="jl-action-btn" onClick={() => goTo('/in/cv-builder')}
                            style={{ padding: '10px 18px', borderRadius: 9, border: 'none', background: `linear-gradient(135deg, ${orange}, #e67300)`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                            Build CV for this job
                          </button>
                          <button className="jl-action-btn" onClick={() => goTo('/in/cover-letter')}
                            style={{ padding: '10px 18px', borderRadius: 9, border: `1px solid ${blue}40`, background: blue + '10', color: blue, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                            Write Cover Letter
                          </button>
                          <button className="jl-action-btn" onClick={() => goTo('/in/career-scan')}
                            style={{ padding: '10px 18px', borderRadius: 9, border: `1px solid ${green}40`, background: green + '10', color: green, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                            ATS Check
                          </button>
                          <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer" className="jl-action-btn"
                            style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid #dce4ef', background: '#f8fafc', color: '#6b7c93', fontSize: 12, fontWeight: 600, textDecoration: 'none', cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                            Open job listing →
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Load more */}
          {!loading && hasMore && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button onClick={loadMore} disabled={loadingMore}
                style={{ padding: '10px 32px', borderRadius: 8, background: loadingMore ? '#ccc' : `linear-gradient(135deg, ${orange}, #e67300)`, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: loadingMore ? 'not-allowed' : 'pointer' }}>
                {loadingMore ? 'Loading...' : 'Load more jobs'}
              </button>
            </div>
          )}

          {!searched && (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9aafbc' }}>
              <p style={{ fontSize: 14, marginBottom: 8 }}>Search for jobs across India</p>
              <p style={{ fontSize: 12 }}>Tap any result to build a tailored CV, write a cover letter, or run an ATS check.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
