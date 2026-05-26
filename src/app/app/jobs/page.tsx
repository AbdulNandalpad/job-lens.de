'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { useLanguage } from '@/lib/i18n'
import { SS } from '@/lib/constants'

const blue  = '#378ADD'
const navy  = '#042C53'
const green = '#1D9E75'

type JobSource = 'adzuna' | 'ba'

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
  job_source?: JobSource
}

const COUNTRIES = [
  { code: 'de', label: '🇩🇪', name: 'Deutschland' },
  { code: 'ch', label: '🇨🇭', name: 'Schweiz' },
  { code: 'at', label: '🇦🇹', name: 'Österreich' },
]

const CITY_PILLS: Record<string, string[]> = {
  de: ['München', 'Berlin', 'Hamburg', 'Frankfurt', 'Köln', 'Stuttgart', 'Düsseldorf', 'Leipzig'],
  ch: ['Zürich', 'Bern', 'Basel', 'Genf', 'Lausanne'],
  at: ['Wien', 'Graz', 'Linz', 'Salzburg', 'Innsbruck'],
}

function timeAgo(dateStr: string) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function DACHJobsPage() {
  const router = useRouter()
  const { lang } = useLanguage()
  const [query,    setQuery]    = useState('')
  const [country,  setCountry]  = useState('de')
  const [city,     setCity]     = useState('')
  const [jobs,     setJobs]     = useState<Job[]>([])
  const [loading,  setLoading]  = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [page,      setPage]      = useState(1)
  const [hasMore,   setHasMore]   = useState(false)
  const [usedQuery, setUsedQuery] = useState('')
  const [source,    setSource]    = useState<JobSource>('adzuna')
  const autoSearched = useRef(false)
  const [expandedDescs, setExpandedDescs] = useState<Set<string>>(new Set())
  function toggleDesc(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setExpandedDescs(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  // ── Adzuna: fallback by trimming last word on 0 results ──────
  async function fetchWithFallback(q: string, countryCode: string, location = ''): Promise<{ jobs: Job[]; usedQuery: string }> {
    let current = q.trim()
    while (current.length > 0) {
      const params = new URLSearchParams({ q: current, country: countryCode, page: '1' })
      if (location) params.set('location', location)
      const res  = await fetch(`/api/jobs?${params}`)
      const data = await res.json()
      const jobs = (data.jobs || []).map((j: Job) => ({ ...j, job_source: 'adzuna' as JobSource }))
      if (jobs.length > 0) return { jobs, usedQuery: current }
      const words = current.split(' ')
      if (words.length === 1) break
      current = words.slice(0, -1).join(' ')
    }
    return { jobs: [], usedQuery: current }
  }

  // ── BA Jobbörse (Mittelstand): same fallback logic ───────────
  async function fetchBAWithFallback(q: string, location: string): Promise<{ jobs: Job[]; usedQuery: string }> {
    let current = q.trim()
    while (current.length > 0) {
      const params = new URLSearchParams({ q: current, page: '1' })
      if (location) params.set('location', location)
      const res  = await fetch(`/api/ba-jobs?${params}`)
      const data = await res.json()
      const jobs = (data.jobs || []).map((j: Job) => ({ ...j, job_source: 'ba' as JobSource }))
      if (jobs.length > 0) return { jobs, usedQuery: current }
      const words = current.split(' ')
      if (words.length === 1) break
      current = words.slice(0, -1).join(' ')
    }
    return { jobs: [], usedQuery: current }
  }

  const label = (de: string, en: string) => lang === 'DE' ? de : en


  useEffect(() => {
    if (autoSearched.current || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const q   = params.get('q')
    const loc = params.get('city') || params.get('location') || ''
    if (q) {
      autoSearched.current = true
      setQuery(q)
      if (loc) setCity(loc)
      setLoading(true); setSearched(true); setPage(1)
      fetchWithFallback(q, country, loc)
        .then(({ jobs, usedQuery: uq }) => { setJobs(jobs); setUsedQuery(uq); setHasMore(jobs.length === 20) })
        .catch(() => { setJobs([]); setUsedQuery(q); setHasMore(false) })
        .finally(() => setLoading(false))
    }
  }, [country])

  async function search() {
    if (!query.trim()) return
    setLoading(true); setSearched(true); setSelectedJobId(null); setPage(1)
    try {
      const { jobs: results, usedQuery: uq } = source === 'ba'
        ? await fetchBAWithFallback(query, city || (country === 'de' ? '' : country))
        : await fetchWithFallback(query, country, city)
      setJobs(results); setUsedQuery(uq); setHasMore(results.length === 20)
    } catch { setJobs([]); setUsedQuery(query); setHasMore(false) }
    setLoading(false)
  }

  async function loadMore() {
    const next = page + 1
    setLoadingMore(true)
    try {
      let more: Job[] = []
      if (source === 'ba') {
        const params = new URLSearchParams({ q: usedQuery, page: String(next) })
        const res  = await fetch(`/api/ba-jobs?${params}`)
        const data = await res.json()
        more = (data.jobs || []).map((j: Job) => ({ ...j, job_source: 'ba' as JobSource }))
      } else {
        const lmParams = new URLSearchParams({ q: usedQuery, country, page: String(next) })
        if (city) lmParams.set('location', city)
        const res  = await fetch(`/api/jobs?${lmParams}`)
        const data = await res.json()
        more = (data.jobs || []).map((j: Job) => ({ ...j, job_source: 'adzuna' as JobSource }))
      }
      setJobs(prev => {
        const seen = new Set(prev.map(j => j.job_id))
        return [...prev, ...more.filter((j: Job) => !seen.has(j.job_id))]
      })
      setPage(next); setHasMore(more.length === 20)
    } catch {}
    setLoadingMore(false)
  }

  // Re-search when source toggle changes (if already searched)
  function switchSource(s: JobSource) {
    setSource(s)
    if (searched && query.trim()) {
      setLoading(true); setSelectedJobId(null); setPage(1)
      const fetch$ = s === 'ba'
        ? fetchBAWithFallback(query, country === 'de' ? '' : country)
        : fetchWithFallback(query, country)
      fetch$
        .then(({ jobs, usedQuery: uq }) => { setJobs(jobs); setUsedQuery(uq); setHasMore(jobs.length === 20) })
        .catch(() => { setJobs([]); setUsedQuery(query); setHasMore(false) })
        .finally(() => setLoading(false))
    }
  }

  function selectJob(job: Job) {
    setSelectedJobId(prev => prev === job.job_id ? null : job.job_id)
    sessionStorage.setItem(SS.cvbJob, JSON.stringify({
      job_title: job.job_title,
      employer_name: job.employer_name,
      job_description: job.job_description,
      job_city: job.job_city,
      job_apply_link: job.job_apply_link,
    }))
  }

  function goTo(path: string) { router.push(path) }

  const countryInfo = COUNTRIES.find(c => c.code === country)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .dach-job-card { cursor: pointer; transition: box-shadow 0.15s, border-color 0.15s; }
        .dach-job-card:hover { box-shadow: 0 4px 16px rgba(4,44,83,0.1) !important; }
        .dach-action-btn { transition: opacity 0.15s, transform 0.15s; }
        .dach-action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .country-pill { transition: all .15s; cursor: pointer; }
        .country-pill:hover { border-color: rgba(55,138,221,0.5) !important; }
        @media (max-width: 768px) {
          .dach-search-bar { flex-direction: column !important; }
          .dach-search-bar input { min-width: unset !important; }
          .dach-city-wrap { width: 100% !important; }
          .dach-city-wrap input { width: 100% !important; box-sizing: border-box !important; }
          .dach-job-actions { flex-direction: column !important; gap: 8px !important; }
          .dach-job-actions > * { width: 100% !important; text-align: center !important; box-sizing: border-box !important; }
        }
      `}</style>

      <Navbar />

      <div style={{ background: '#f0f4f8', minHeight: 'calc(100vh - 52px)', padding: '28px 16px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          <div style={{ marginBottom: 24, paddingLeft: 14, borderLeft: `3px solid ${blue}` }}>
            <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 700, color: navy, margin: 0 }}>
              {label('Job-Suche DACH', 'DACH Job Search')}
            </h1>
            <p style={{ fontSize: 13, color: '#6b7c93', margin: '4px 0 0' }}>
              {source === 'ba'
                ? label('Mittelstand-Stellen direkt von der Bundesagentur für Arbeit', 'Mittelstand roles direct from Bundesagentur für Arbeit')
                : label('Live-Stellenanzeigen aus Deutschland, Österreich und der Schweiz', 'Live job listings from Germany, Austria and Switzerland — powered by Adzuna')}
            </p>
          </div>

          {/* Search card */}
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(4,44,83,0.06)', border: '1px solid #edf1f6', marginBottom: 24, overflow: 'hidden' }}>

            {/* Query + City + button */}
            <div className="dach-search-bar" style={{ display: 'flex', gap: 10, padding: 16, flexWrap: 'wrap' }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder={label('Jobtitel oder Fähigkeit (z. B. React Entwickler)', 'Job title or skill (e.g. React Developer)')}
                style={{ flex: 1, minWidth: 180, padding: '10px 14px', borderRadius: 8, border: '1px solid #dce4ef', fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#1a2332' }}
              />
              <div className="dach-city-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 10, color: '#9aafbc', fontSize: 13, pointerEvents: 'none' }}>📍</span>
                <input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search()}
                  placeholder={label('Stadt', 'City')}
                  style={{ width: 130, padding: '10px 12px 10px 30px', borderRadius: 8, border: '1px solid #dce4ef', fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#1a2332' }}
                />
                {city && (
                  <button onClick={() => setCity('')}
                    style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#9aafbc', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                )}
              </div>
              <button onClick={search} disabled={loading}
                style={{ padding: '10px 22px', borderRadius: 8, background: loading ? '#ccc' : `linear-gradient(135deg,${blue},#2563eb)`, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                {loading ? (lang === 'DE' ? 'Suche...' : 'Searching...') : (lang === 'DE' ? 'Suchen' : 'Search')}
              </button>
            </div>

            {/* City quick-pick pills */}
            <div style={{ padding: '0 16px 14px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(CITY_PILLS[country] || CITY_PILLS['de']).map(c => (
                <button key={c} onClick={() => { setCity(city === c ? '' : c) }}
                  style={{ padding: '5px 12px', borderRadius: 16, border: `1.5px solid ${city === c ? blue : '#dce4ef'}`, background: city === c ? blue + '12' : '#f8fafc', color: city === c ? blue : '#6b7c93', fontSize: 12, fontWeight: city === c ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .12s' }}>
                  {c}
                </button>
              ))}
            </div>

            {/* Source + Country filters — shown before first search */}
            {!searched && (
              <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Source toggle */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9aafbc', marginBottom: 8, letterSpacing: .5, textTransform: 'uppercase' }}>
                    {label('Quelle', 'Source')}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => setSource('adzuna')}
                      style={{ padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${source === 'adzuna' ? blue : '#dce4ef'}`, background: source === 'adzuna' ? blue + '12' : '#f8fafc', color: source === 'adzuna' ? blue : '#6b7c93', fontSize: 12, fontWeight: source === 'adzuna' ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                      🌐 {label('International (Adzuna)', 'International (Adzuna)')}
                    </button>
                    <button onClick={() => setSource('ba')}
                      style={{ padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${source === 'ba' ? '#1D9E75' : '#dce4ef'}`, background: source === 'ba' ? '#1D9E7512' : '#f8fafc', color: source === 'ba' ? '#1D9E75' : '#6b7c93', fontSize: 12, fontWeight: source === 'ba' ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                      🏢 {label('Mittelstand (Bundesagentur)', 'Mittelstand (Bundesagentur)')}
                    </button>
                  </div>
                  {source === 'ba' && (
                    <p style={{ fontSize: 11, color: '#9aafbc', margin: '8px 0 0' }}>
                      {label('Offizielle Jobbörse der Bundesagentur für Arbeit — viele Mittelstand-Stellen die nicht auf Adzuna erscheinen.', 'Official Bundesagentur für Arbeit job board — thousands of Mittelstand roles not listed on Adzuna.')}
                    </p>
                  )}
                </div>

                {/* Country pills — only for Adzuna (BA is Germany-only) */}
                {source === 'adzuna' && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#9aafbc', marginBottom: 8, letterSpacing: .5, textTransform: 'uppercase' }}>
                      {label('Land', 'Country')}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {COUNTRIES.map(c => (
                        <button key={c.code} className="country-pill" onClick={() => setCountry(c.code)}
                          style={{ padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${country === c.code ? blue : '#dce4ef'}`, background: country === c.code ? blue + '12' : '#f8fafc', color: country === c.code ? blue : '#6b7c93', fontSize: 12, fontWeight: country === c.code ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                          {c.label} {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Compact chips after search */}
            {searched && (
              <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: source === 'ba' ? '#1D9E7512' : blue + '12', color: source === 'ba' ? '#1D9E75' : blue, fontWeight: 600 }}>
                  {source === 'ba' ? '🏢 Mittelstand' : `🌐 ${countryInfo?.label} ${countryInfo?.name}`}
                </span>
                {city && (
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: '#f0f4f8', color: '#6b7c93', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    📍 {city}
                    <button onClick={() => setCity('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aafbc', fontSize: 13, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
                  </span>
                )}
                <button onClick={() => switchSource(source === 'ba' ? 'adzuna' : 'ba')}
                  style={{ fontSize: 11, color: '#9aafbc', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                  {source === 'ba' ? label('Zu Adzuna wechseln', 'Switch to Adzuna') : label('Zu Mittelstand wechseln', 'Switch to Mittelstand')}
                </button>
                <button onClick={() => setSearched(false)} style={{ fontSize: 11, color: '#9aafbc', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                  {label('Filter ändern', 'change filters')}
                </button>
              </div>
            )}
          </div>

          {/* Results */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 48, color: '#9aafbc' }}>
              {label('Jobs werden gesucht…', 'Searching DACH jobs...')}
            </div>
          )}

          {!loading && searched && jobs.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: '#9aafbc' }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>0</div>
              {label('Keine Ergebnisse. Bitte anderen Suchbegriff oder Land versuchen.', 'No jobs found. Try a different search term or country.')}
            </div>
          )}

          {!loading && jobs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {usedQuery && usedQuery.toLowerCase() !== query.trim().toLowerCase() && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(55,138,221,0.07)', border: '1px solid rgba(55,138,221,0.2)', marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>🔍</span>
                  <span style={{ fontSize: 13, color: '#6b7c93' }}>
                    {label('Keine Ergebnisse für', 'No results for')}{' '}
                    <span style={{ fontWeight: 700, color: '#374151' }}>"{query}"</span>
                    {' — '}{label('zeige Ergebnisse für', 'showing results for')}{' '}
                    <span style={{ fontWeight: 700, color: blue }}>"{usedQuery}"</span>
                  </span>
                </div>
              )}
              <div style={{ fontSize: 13, color: '#9aafbc', marginBottom: 4 }}>
                {jobs.length} {label('Stellen gefunden — Karte anklicken für Aktionen', 'jobs found — tap a card to see actions')}
              </div>

              {jobs.map(job => {
                const isSelected = selectedJobId === job.job_id
                return (
                  <div key={job.job_id} className="dach-job-card"
                    onClick={() => selectJob(job)}
                    style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: `1.5px solid ${isSelected ? blue : '#edf1f6'}`, boxShadow: isSelected ? `0 4px 20px rgba(55,138,221,0.12)` : '0 2px 8px rgba(4,44,83,0.05)', transition: 'all 0.2s' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: navy }}>{job.job_title}</div>
                          {isSelected && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: blue + '20', color: blue, fontWeight: 700, flexShrink: 0 }}>Selected</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, color: '#6b7c93' }}>
                            {job.employer_name}{job.job_city ? ` · ${job.job_city}` : ''}{job.job_employment_type ? ` · ${job.job_employment_type}` : ''}
                          </span>
                          {job.job_source === 'ba' && (
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: '#1D9E7515', color: '#1D9E75', fontWeight: 700, flexShrink: 0 }}>
                              🏢 Mittelstand
                            </span>
                          )}
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
                                <button onClick={e => toggleDesc(job.job_id, e)} style={{ background: 'none', border: 'none', padding: '2px 0 8px', fontSize: 11, color: blue, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  {expanded ? 'Show less' : 'Show more'}
                                </button>
                              )}
                            </>
                          )
                        })()}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          {job.job_min_salary && job.job_max_salary && (
                            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: 'rgba(29,158,117,0.1)', color: green, fontWeight: 600 }}>
                              {country === 'ch' ? 'CHF' : 'EUR'} {Math.round(job.job_min_salary / 1000)}k – {Math.round(job.job_max_salary / 1000)}k
                            </span>
                          )}
                          {job.job_posted_at_datetime_utc && (
                            <span style={{ fontSize: 11, color: '#9aafbc' }}>{timeAgo(job.job_posted_at_datetime_utc)}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 16, color: isSelected ? blue : '#c0cfe0', flexShrink: 0, transition: 'transform 0.2s', transform: isSelected ? 'rotate(180deg)' : 'rotate(0deg)', marginTop: 2 }}>v</div>
                    </div>

                    {isSelected && (
                      <div onClick={e => e.stopPropagation()} style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${blue}20` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: blue, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
                          {label('Was möchtest du tun?', 'What do you want to do?')}
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <button className="dach-action-btn" onClick={() => goTo('/app/cv-builder')}
                            style={{ padding: '10px 18px', borderRadius: 9, border: 'none', background: `linear-gradient(135deg,${blue},#2563eb)`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                            {label('CV für diese Stelle', 'Build CV for this job')}
                          </button>
                          <button className="dach-action-btn" onClick={() => goTo('/app/cover-letter')}
                            style={{ padding: '10px 18px', borderRadius: 9, border: `1px solid ${blue}40`, background: blue + '10', color: blue, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                            {label('Anschreiben', 'Cover Letter')}
                          </button>
                          <button className="dach-action-btn" onClick={() => goTo('/app/career-scan')}
                            style={{ padding: '10px 18px', borderRadius: 9, border: `1px solid ${green}40`, background: green + '10', color: green, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                            Career Scan
                          </button>
                          <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer" className="dach-action-btn"
                            style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid #dce4ef', background: '#f8fafc', color: '#6b7c93', fontSize: 12, fontWeight: 600, textDecoration: 'none', cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                            {label('Stellenanzeige öffnen →', 'Open job listing →')}
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
                style={{ padding: '10px 32px', borderRadius: 8, background: loadingMore ? '#ccc' : `linear-gradient(135deg,${blue},#2563eb)`, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: loadingMore ? 'not-allowed' : 'pointer' }}>
                {loadingMore ? (lang === 'DE' ? 'Laden...' : 'Loading...') : (lang === 'DE' ? 'Mehr laden' : 'Load more jobs')}
              </button>
            </div>
          )}

          {!searched && (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9aafbc' }}>
              <p style={{ fontSize: 14, marginBottom: 8 }}>
                {label('Jobs in Deutschland, Österreich und der Schweiz suchen', 'Search jobs across Germany, Austria and Switzerland')}
              </p>
              <p style={{ fontSize: 12 }}>
                {label('Karte antippen für CV-Erstellung, Anschreiben oder Career Scan.', 'Tap any result to build a tailored CV, write a cover letter, or run a Career Scan.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
