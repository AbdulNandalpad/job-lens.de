'use client'

import { useState } from 'react'
import Link from 'next/link'

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
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({ q: query, country: 'in' })
      if (city) params.set('location', city)
      const res = await fetch(`/api/jobs?${params}`)
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch { setJobs([]) }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
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
              <div style={{ fontSize: 13, color: '#9aafbc', marginBottom: 4 }}>{jobs.length} jobs found</div>
              {jobs.map(job => (
                <div key={job.job_id} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #edf1f6', boxShadow: '0 2px 8px rgba(4,44,83,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: navy, marginBottom: 4 }}>{job.job_title}</div>
                      <div style={{ fontSize: 13, color: '#6b7c93', marginBottom: 8 }}>
                        {job.employer_name}{job.job_city ? ` · ${job.job_city}` : ''}
                        {job.job_employment_type ? ` · ${job.job_employment_type}` : ''}
                      </div>
                      {job.job_description && (
                        <p style={{ fontSize: 12, color: '#8fa3b8', lineHeight: 1.6, margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {job.job_description}
                        </p>
                      )}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer"
                        style={{ padding: '8px 18px', borderRadius: 8, background: `linear-gradient(135deg, ${orange}, #e67300)`, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                        Apply
                      </a>
                      <Link href={`/in/career-scan`}
                        style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(55,138,221,0.08)', color: blue, fontSize: 12, fontWeight: 600, textDecoration: 'none', textAlign: 'center', border: `1px solid rgba(55,138,221,0.2)` }}>
                        ATS Check
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!searched && (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9aafbc' }}>
              <p style={{ fontSize: 14, marginBottom: 8 }}>Search for jobs across India</p>
              <p style={{ fontSize: 12 }}>Then use <strong>ATS Check</strong> on any listing to score your CV before applying.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
