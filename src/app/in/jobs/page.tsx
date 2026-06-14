'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SS, API } from '@/lib/constants'
import SvgIcon from '@/components/SvgIcon'
import { createClient } from '@/lib/supabase'

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

function parseJobDate(s: string): number {
  const t = new Date(s).getTime()
  return Number.isFinite(t) ? t : 0
}

function timeAgo(dateStr: string) {
  if (!dateStr) return ''
  const t = parseJobDate(dateStr)
  if (!t) return ''
  const diff = Date.now() - t
  if (diff < 0) return 'Today'
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export default function IndiaJobsPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [sortBy,  setSortBy]  = useState<'date' | 'relevance'>('date')
  const [scores,  setScores]  = useState<Record<string, number>>({})
  const [scoring, setScoring] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [usedQuery, setUsedQuery] = useState('')
  const autoSearched = useRef(false)
  const [expandedDescs, setExpandedDescs] = useState<Set<string>>(new Set())
  function toggleDesc(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setExpandedDescs(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  async function scoreJobs(jobList: Job[], searchQuery: string) {
    setScoring(true)
    setScores({})
    try {
      const res = await fetch(API.jobsRank, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          jobs: jobList.map(j => ({ job_id: j.job_id, job_title: j.job_title, job_description: j.job_description })),
        }),
      })
      const data = await res.json()
      const map: Record<string, number> = {}
      for (const s of (data.scores ?? [])) map[s.job_id] = s.score
      setScores(map)
    } catch {}
    setScoring(false)
  }

  async function fetchWithFallback(q: string): Promise<{ jobs: Job[]; usedQuery: string }> {
    let current = q.trim()
    while (current.length > 0) {
      const params = new URLSearchParams({ q: current, country: 'in', page: '1' })
      const res  = await fetch(`/api/jobs?${params}`)
      const data = await res.json()
      const jobs = data.jobs || []
      if (jobs.length > 0) return { jobs, usedQuery: current }
      const words = current.split(' ')
      if (words.length === 1) break
      current = words.slice(0, -1).join(' ')
    }
    return { jobs: [], usedQuery: current }
  }


  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setIsAdmin(data.user?.email === 'sap.rashid@gmail.com')
    })
  }, [])

  useEffect(() => {
    if (autoSearched.current || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    const loc = params.get('location')
    if (q) {
      autoSearched.current = true
      setQuery(q)
      if (loc) setCity(loc)
      setLoading(true); setSearched(true); setPage(1)
      fetchWithFallback(q)
        .then(({ jobs, usedQuery: uq }) => { setJobs(jobs); setUsedQuery(uq); setHasMore(jobs.length === 20); if (jobs.length) scoreJobs(jobs, q) })
        .catch(() => { setJobs([]); setUsedQuery(q); setHasMore(false) })
        .finally(() => setLoading(false))
    }
  }, [])

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    setSelectedJobId(null)
    setPage(1)
    try {
      const { jobs: results, usedQuery: uq } = await fetchWithFallback(query)
      setJobs(results); setUsedQuery(uq); setHasMore(results.length === 20)
      if (results.length) scoreJobs(results, query)
    } catch { setJobs([]); setUsedQuery(query); setHasMore(false) }
    setLoading(false)
  }

  async function loadMore() {
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const params = new URLSearchParams({ q: usedQuery, country: 'in', page: String(nextPage) })
      if (city) params.set('location', city)
      const res = await fetch(`/api/jobs?${params}`)
      const data = await res.json()
      const more = data.jobs || []
      setJobs(prev => {
        const seen = new Set(prev.map(j => j.job_id))
        return [...prev, ...more.filter((j: Job) => !seen.has(j.job_id))]
      })
      setPage(nextPage)
      setHasMore(more.length === 20)
    } catch {}
    setLoadingMore(false)
  }

  function selectJob(job: Job) {
    setSelectedJobId(prev => prev === job.job_id ? null : job.job_id)
    sessionStorage.setItem(SS.inSelectedJob, JSON.stringify({
      job_title: job.job_title,
      employer_name: job.employer_name,
      job_description: job.job_description,
      job_city: job.job_city,
      job_apply_link: job.job_apply_link,
    }))
  }

  function goTo(path: string) {
    if (path === '/in/cv-builder') sessionStorage.removeItem('jl_ats_suggestions')
    router.push(path)
  }

  function goToJobCase(job: Job) {
    sessionStorage.setItem(SS.jcJob, JSON.stringify({
      job_title:       job.job_title,
      employer_name:   job.employer_name,
      job_description: job.job_description,
      job_apply_link:  job.job_apply_link,
    }))
    router.push('/app/job-case/new')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .jl-job-card { cursor: pointer; transition: box-shadow 0.15s, border-color 0.15s; }
        .jl-job-card:hover { box-shadow: 0 4px 16px rgba(4,44,83,0.1) !important; }
        .jl-action-btn { transition: opacity 0.15s, transform 0.15s; }
        .jl-action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        @media (max-width: 768px) {
          .jl-search-bar { flex-direction: column !important; }
          .jl-search-bar input { min-width: unset !important; }
          .jl-job-actions { flex-direction: column !important; gap: 8px !important; }
          .jl-job-actions > * { width: 100% !important; text-align: center !important; box-sizing: border-box !important; }
        }
      `}</style>

      <div style={{ background: '#f0f4f8', minHeight: 'calc(100vh - 52px)', padding: '28px 16px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          <div style={{ marginBottom: 24, paddingLeft: 14, borderLeft: `3px solid ${orange}` }}>
            <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 700, color: navy, margin: 0 }}>Job Search India</h1>
            <p style={{ fontSize: 13, color: '#6b7c93', margin: '4px 0 0' }}>Live job listings from Indian employers via Adzuna</p>
          </div>

          {/* Search bar */}
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(4,44,83,0.06)', border: '1px solid #edf1f6', marginBottom: 24, overflow: 'hidden' }}>
            <div className="jl-search-bar" style={{ display: 'flex', gap: 12, padding: 16, flexWrap: 'wrap' }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="Job title or skill (e.g. React Developer)"
                style={{ flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 8, border: '1px solid #dce4ef', fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#1a2332' }}
              />
              <button onClick={search} disabled={loading}
                style={{ padding: '10px 24px', borderRadius: 8, background: loading ? '#ccc' : `linear-gradient(135deg, ${orange}, #e67300)`, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
            {!searched && (
              <div style={{ padding: '0 16px 16px' }}>
                <select
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #dce4ef', fontSize: 13, color: '#374151', fontFamily: "'DM Sans',sans-serif", outline: 'none', cursor: 'pointer', width: '100%' }}
                >
                  {CITIES.map(c => <option key={c} value={c}>{c || 'All Cities'}</option>)}
                </select>
              </div>
            )}
            {searched && (
              <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                {city && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: `${orange}15`, color: orange, fontWeight: 600 }}>{city}</span>}
                <button onClick={() => setSearched(false)} style={{ fontSize: 11, color: '#9aafbc', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>change filters</button>
              </div>
            )}
          </div>

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
              {usedQuery && usedQuery.toLowerCase() !== query.trim().toLowerCase() && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: `${orange}0d`, border: `1px solid ${orange}35`, marginBottom: 4 }}>
                  <SvgIcon name="search" size={16} color="#6b7c93" />
                  <span style={{ fontSize: 13, color: '#6b7c93' }}>
                    No results for <span style={{ fontWeight: 700, color: '#374151' }}>"{query}"</span>
                    {' — '}showing results for <span style={{ fontWeight: 700, color: orange }}>"{usedQuery}"</span>
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#9aafbc' }}>{jobs.length} jobs found</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {scoring && <span style={{ fontSize: 11, color: '#9aafbc' }}>Scoring...</span>}
                  <span style={{ fontSize: 11, color: '#9aafbc' }}>Sort:</span>
                  {(['date', 'relevance'] as const).map(opt => (
                    <button key={opt} onClick={() => setSortBy(opt)}
                      disabled={opt === 'relevance' && Object.keys(scores).length === 0}
                      style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: `1px solid ${sortBy === opt ? orange : '#dce4ef'}`, background: sortBy === opt ? orange + '15' : '#fff', color: sortBy === opt ? orange : Object.keys(scores).length === 0 && opt === 'relevance' ? '#c0cfe0' : '#6b7c93', fontWeight: sortBy === opt ? 700 : 400, cursor: opt === 'relevance' && Object.keys(scores).length === 0 ? 'not-allowed' : 'pointer' }}>
                      {opt === 'date' ? 'Newest first' : 'Relevance'}
                    </button>
                  ))}
                </div>
              </div>

              {[...jobs].sort((a, b) =>
                sortBy === 'relevance'
                  ? (scores[b.job_id] ?? 0) - (scores[a.job_id] ?? 0)
                  : parseJobDate(b.job_posted_at_datetime_utc) - parseJobDate(a.job_posted_at_datetime_utc)
              ).map(job => {
                const isSelected = selectedJobId === job.job_id
                return (
                  <div key={job.job_id} className="jl-job-card"
                    onClick={() => selectJob(job)}
                    style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: `1.5px solid ${isSelected ? orange : '#edf1f6'}`, boxShadow: isSelected ? `0 4px 20px rgba(255,153,51,0.12)` : '0 2px 8px rgba(4,44,83,0.05)', transition: 'all 0.2s' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: navy }}>{job.job_title}</div>
                          {isSelected && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: orange + '20', color: orange, fontWeight: 700, flexShrink: 0 }}>Selected</span>}
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7c93', marginBottom: 8 }}>
                          {job.employer_name}{job.job_city ? ` · ${job.job_city}` : ''}{job.job_employment_type ? ` · ${job.job_employment_type}` : ''}
                        </div>
                        {(() => {
                          const expanded = expandedDescs.has(job.job_id)
                          const long = job.job_description.length > 220
                          return (
                            <>
                              <p style={{ fontSize: 12, color: '#8fa3b8', lineHeight: 1.6, margin: '0 0 4px', display: '-webkit-box', WebkitLineClamp: expanded ? undefined : 3, WebkitBoxOrient: 'vertical' as const, overflow: expanded ? 'visible' : 'hidden' }}>
                                {job.job_description}
                              </p>
                              {long && (
                                <button onClick={e => toggleDesc(job.job_id, e)} style={{ background: 'none', border: 'none', padding: '2px 0 8px', fontSize: 11, color: orange, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  {expanded ? 'Show less' : 'Show more'}
                                </button>
                              )}
                            </>
                          )
                        })()}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          {job.job_min_salary && job.job_max_salary && (
                            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: 'rgba(29,158,117,0.1)', color: green, fontWeight: 600 }}>
                              Rs. {Math.round(job.job_min_salary / 100000)}L – {Math.round(job.job_max_salary / 100000)}L
                            </span>
                          )}
                          {job.job_posted_at_datetime_utc && (
                            <span style={{ fontSize: 11, color: '#9aafbc' }}>{timeAgo(job.job_posted_at_datetime_utc)}</span>
                          )}
                          {scores[job.job_id] !== undefined && (() => {
                            const s = scores[job.job_id]
                            const col = s >= 70 ? green : s >= 45 ? '#F59E0B' : '#9aafbc'
                            return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: col + '18', color: col, fontWeight: 700 }}>{s}% match</span>
                          })()}
                        </div>
                      </div>
                      <div style={{ fontSize: 16, color: isSelected ? orange : '#c0cfe0', flexShrink: 0, transition: 'transform 0.2s', transform: isSelected ? 'rotate(180deg)' : 'rotate(0deg)', marginTop: 2 }}>v</div>
                    </div>

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
                          {isAdmin && (
                            <button className="jl-action-btn" onClick={() => goToJobCase(job)}
                              style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid rgba(4,44,83,0.2)', background: 'rgba(4,44,83,0.04)', color: '#042C53', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                              Job Case
                            </button>
                          )}
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
