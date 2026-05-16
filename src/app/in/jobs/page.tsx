'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const orange = '#ff9933'
const navy   = '#042C53'
const blue   = '#378ADD'
const green  = '#1D9E75'

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
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Remote']
const POSTED_OPTIONS = [
  { label: 'Any time', value: '' },
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
]

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
  const [query,         setQuery]         = useState('')
  const [city,          setCity]          = useState('')
  const [jobType,       setJobType]       = useState('')
  const [postedWithin,  setPostedWithin]  = useState('')
  const [jobs,          setJobs]          = useState<Job[]>([])
  const [loading,       setLoading]       = useState(false)
  const [loadingMore,   setLoadingMore]   = useState(false)
  const [searched,      setSearched]      = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [page,          setPage]          = useState(1)
  const [hasMore,       setHasMore]       = useState(false)
  const [mobFilter,     setMobFilter]     = useState(false)
  const autoSearched = useRef(false)

  useEffect(() => {
    if (autoSearched.current || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    const loc = params.get('location')
    if (q) {
      autoSearched.current = true
      setQuery(q)
      if (loc) setCity(loc)
      doSearch(q, loc || '', '', '', 1)
    }
  }, [])

  async function doSearch(q: string, c: string, jt: string, pw: string, pg: number) {
    if (!q.trim()) return
    setLoading(true); setSearched(true); setSelectedJobId(null); setPage(pg)
    try {
      const p = new URLSearchParams({ q, country: 'in', page: String(pg) })
      if (c) p.set('location', c)
      if (jt) p.set('employment_type', jt)
      if (pw) p.set('max_days_old', pw)
      const res = await fetch(`/api/jobs?${p}`)
      const data = await res.json()
      const results = data.jobs || []
      setJobs(results)
      setHasMore(results.length === 20)
    } catch { setJobs([]); setHasMore(false) }
    setLoading(false)
  }

  function search() { doSearch(query, city, jobType, postedWithin, 1) }

  async function loadMore() {
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const p = new URLSearchParams({ q: query, country: 'in', page: String(nextPage) })
      if (city) p.set('location', city)
      if (jobType) p.set('employment_type', jobType)
      if (postedWithin) p.set('max_days_old', postedWithin)
      const res = await fetch(`/api/jobs?${p}`)
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
  }

  function goTo(path: string) {
    if (path === '/in/cv-builder') sessionStorage.removeItem('jl_ats_suggestions')
    router.push(path)
  }

  const FilterPanel = () => (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      {/* Search */}
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:.6, textTransform:'uppercase', marginBottom:7 }}>Job Title / Skill</div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="e.g. React Developer"
          style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.18)', background:'rgba(255,255,255,0.07)', fontSize:13, color:'#fff', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' }}
        />
      </div>

      {/* City */}
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:.6, textTransform:'uppercase', marginBottom:7 }}>City</div>
        <select
          value={city}
          onChange={e => setCity(e.target.value)}
          style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.18)', background:'rgba(255,255,255,0.07)', color:'#fff', fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:'none', cursor:'pointer', boxSizing:'border-box' }}
        >
          {CITIES.map(c => <option key={c} value={c} style={{ background:'#1a2d45' }}>{c || 'All Cities'}</option>)}
        </select>
      </div>

      {/* Job type */}
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:.6, textTransform:'uppercase', marginBottom:7 }}>Job Type</div>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <div
            onClick={() => setJobType('')}
            style={{ padding:'7px 11px', borderRadius:7, border:`1px solid ${jobType===''?orange:'rgba(255,255,255,0.15)'}`, background:jobType===''?`${orange}15`:'rgba(255,255,255,0.04)', color:jobType===''?orange:'rgba(255,255,255,0.6)', fontSize:12, cursor:'pointer', transition:'all .15s' }}>
            Any type
          </div>
          {JOB_TYPES.map(jt => (
            <div key={jt}
              onClick={() => setJobType(prev => prev === jt ? '' : jt)}
              style={{ padding:'7px 11px', borderRadius:7, border:`1px solid ${jobType===jt?orange:'rgba(255,255,255,0.15)'}`, background:jobType===jt?`${orange}15`:'rgba(255,255,255,0.04)', color:jobType===jt?orange:'rgba(255,255,255,0.6)', fontSize:12, cursor:'pointer', transition:'all .15s' }}>
              {jt}
            </div>
          ))}
        </div>
      </div>

      {/* Posted within */}
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:.6, textTransform:'uppercase', marginBottom:7 }}>Posted Within</div>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {POSTED_OPTIONS.map(opt => (
            <div key={opt.value}
              onClick={() => setPostedWithin(opt.value)}
              style={{ padding:'7px 11px', borderRadius:7, border:`1px solid ${postedWithin===opt.value?orange:'rgba(255,255,255,0.15)'}`, background:postedWithin===opt.value?`${orange}15`:'rgba(255,255,255,0.04)', color:postedWithin===opt.value?orange:'rgba(255,255,255,0.6)', fontSize:12, cursor:'pointer', transition:'all .15s' }}>
              {opt.label}
            </div>
          ))}
        </div>
      </div>

      {/* Search button */}
      <button onClick={() => { search(); setMobFilter(false) }} disabled={loading || !query.trim()}
        style={{ padding:'11px 0', borderRadius:9, border:'none', background:loading||!query.trim()?'rgba(255,255,255,0.1)':`linear-gradient(135deg,${orange},#e67300)`, color:loading||!query.trim()?'rgba(255,255,255,0.3)':'#042C53', fontWeight:700, fontSize:13, cursor:loading||!query.trim()?'not-allowed':'pointer', fontFamily:"'Outfit',sans-serif", transition:'all .15s' }}>
        {loading ? 'Searching…' : '🔍 Search Jobs'}
      </button>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .jl-job-card { cursor:pointer; transition:box-shadow .15s,border-color .15s; }
        .jl-job-card:hover { box-shadow:0 4px 16px rgba(4,44,83,0.1) !important; }
        .jl-action-btn { transition:opacity .15s,transform .15s; }
        .jl-action-btn:hover { opacity:.85; transform:translateY(-1px); }
        .in-jobs-layout { display:grid; grid-template-columns:260px 1fr; gap:0; min-height:calc(100vh - 52px); }
        .in-jobs-sidebar { background:linear-gradient(180deg,#152233 0%,#0e1a28 100%); padding:24px 18px; border-right:1px solid rgba(255,255,255,0.1); position:sticky; top:52px; height:calc(100vh - 52px); overflow-y:auto; }
        .in-jobs-main { background:#f0f4f8; padding:28px 24px; overflow-y:auto; }
        .mob-filter-btn { display:none; }
        @media(max-width:768px){
          .in-jobs-layout { grid-template-columns:1fr; }
          .in-jobs-sidebar { display:none; }
          .in-jobs-main { padding:16px 14px; }
          .mob-filter-btn { display:flex !important; }
        }
        .mob-filter-drawer { display:none; background:linear-gradient(180deg,#152233 0%,#0e1a28 100%); padding:20px 16px; border-bottom:1px solid rgba(255,255,255,0.1); }
        @media(max-width:768px){ .mob-filter-drawer.open { display:block; } }
      `}</style>

      <div className="in-jobs-layout">

        {/* ── LEFT SIDEBAR ── */}
        <div className="in-jobs-sidebar">
          <div style={{ paddingBottom:16, marginBottom:16, borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:700, color:'#fff' }}>Search Filters</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:3 }}>Live listings · Adzuna India</div>
          </div>
          <FilterPanel />
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="in-jobs-main">

          {/* Page header */}
          <div style={{ marginBottom:20, paddingLeft:14, borderLeft:`3px solid ${orange}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <div>
              <h1 style={{ fontFamily:"'Outfit',sans-serif", fontSize:20, fontWeight:700, color:navy, margin:0 }}>Job Search India</h1>
              <p style={{ fontSize:13, color:'#6b7c93', margin:'3px 0 0' }}>Live job listings from Indian employers via Adzuna</p>
            </div>
            {/* Mobile filter toggle */}
            <button className="mob-filter-btn" onClick={() => setMobFilter(p => !p)}
              style={{ padding:'9px 16px', borderRadius:9, background:navy, color:'#fff', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:"'DM Sans',sans-serif" }}>
              ⚙️ {mobFilter ? 'Hide' : 'Filters'}
            </button>
          </div>

          {/* Mobile filter drawer */}
          <div className={`mob-filter-drawer${mobFilter?' open':''}`} style={{ marginBottom:16, borderRadius:12, border:'1px solid rgba(255,255,255,0.1)' }}>
            <FilterPanel />
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign:'center', padding:48, color:'#9aafbc' }}>Searching jobs in India…</div>
          )}

          {/* Empty */}
          {!loading && searched && jobs.length === 0 && (
            <div style={{ textAlign:'center', padding:48, color:'#9aafbc' }}>
              <div style={{ fontSize:32, marginBottom:12, opacity:.3 }}>0</div>
              No jobs found. Try a different search term or city.
            </div>
          )}

          {/* Pre-search prompt */}
          {!loading && !searched && (
            <div style={{ textAlign:'center', padding:'64px 24px', color:'#9aafbc' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🇮🇳</div>
              <p style={{ fontSize:15, fontWeight:600, color:navy, marginBottom:6 }}>Search jobs across India</p>
              <p style={{ fontSize:13, lineHeight:1.7 }}>Enter a job title or skill in the filters, then hit Search.<br/>Tap any result to build a tailored CV, cover letter, or run an ATS check.</p>
            </div>
          )}

          {/* Results */}
          {!loading && jobs.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ fontSize:13, color:'#9aafbc', marginBottom:4 }}>{jobs.length} jobs found — tap a card to see actions</div>

              {jobs.map(job => {
                const isSelected = selectedJobId === job.job_id
                return (
                  <div key={job.job_id} className="jl-job-card"
                    onClick={() => selectJob(job)}
                    style={{ background:'#fff', borderRadius:12, padding:'18px 20px', border:`1.5px solid ${isSelected?orange:'#edf1f6'}`, boxShadow:isSelected?`0 4px 20px rgba(255,153,51,0.12)`:'0 2px 8px rgba(4,44,83,0.05)', transition:'all .2s' }}>

                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:700, color:navy }}>{job.job_title}</div>
                          {isSelected && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:10, background:orange+'20', color:orange, fontWeight:700, flexShrink:0 }}>Selected</span>}
                        </div>
                        <div style={{ fontSize:13, color:'#6b7c93', marginBottom:8 }}>
                          {job.employer_name}{job.job_city?` · ${job.job_city}`:''}{job.job_employment_type?` · ${job.job_employment_type}`:''}
                        </div>
                        <p style={{ fontSize:12, color:'#8fa3b8', lineHeight:1.6, margin:'0 0 10px', display:'-webkit-box', WebkitLineClamp:isSelected?undefined:2, WebkitBoxOrient:'vertical', overflow:isSelected?'visible':'hidden' }}>
                          {job.job_description}
                        </p>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                          {job.job_min_salary && job.job_max_salary && (
                            <span style={{ fontSize:11, padding:'3px 10px', borderRadius:12, background:'rgba(29,158,117,0.1)', color:green, fontWeight:600 }}>
                              ₹{Math.round(job.job_min_salary/100000)}L – {Math.round(job.job_max_salary/100000)}L
                            </span>
                          )}
                          {job.job_posted_at_datetime_utc && (
                            <span style={{ fontSize:11, color:'#9aafbc' }}>{timeAgo(job.job_posted_at_datetime_utc)}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize:16, color:isSelected?orange:'#c0cfe0', flexShrink:0, transition:'transform .2s', transform:isSelected?'rotate(180deg)':'rotate(0deg)', marginTop:2 }}>v</div>
                    </div>

                    {/* Expanded actions */}
                    {isSelected && (
                      <div onClick={e => e.stopPropagation()} style={{ marginTop:18, paddingTop:16, borderTop:`1px solid ${orange}20` }}>
                        <div style={{ fontSize:11, fontWeight:700, color:orange, letterSpacing:.5, textTransform:'uppercase', marginBottom:10 }}>What do you want to do?</div>
                        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                          <button className="jl-action-btn" onClick={() => goTo('/in/cv-builder')}
                            style={{ padding:'10px 18px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${orange},#e67300)`, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
                            Build CV for this job
                          </button>
                          <button className="jl-action-btn" onClick={() => goTo('/in/cover-letter')}
                            style={{ padding:'10px 18px', borderRadius:9, border:`1px solid ${blue}40`, background:blue+'10', color:blue, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
                            Write Cover Letter
                          </button>
                          <button className="jl-action-btn" onClick={() => goTo('/in/career-scan')}
                            style={{ padding:'10px 18px', borderRadius:9, border:`1px solid ${green}40`, background:green+'10', color:green, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
                            ATS Check
                          </button>
                          <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer" className="jl-action-btn"
                            style={{ padding:'10px 18px', borderRadius:9, border:'1px solid #dce4ef', background:'#f8fafc', color:'#6b7c93', fontSize:12, fontWeight:600, textDecoration:'none', cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
                            Open listing →
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Load more */}
              {hasMore && (
                <div style={{ textAlign:'center', marginTop:8 }}>
                  <button onClick={loadMore} disabled={loadingMore}
                    style={{ padding:'10px 32px', borderRadius:8, background:loadingMore?'#ccc':`linear-gradient(135deg,${orange},#e67300)`, color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:loadingMore?'not-allowed':'pointer' }}>
                    {loadingMore ? 'Loading…' : 'Load more jobs'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
