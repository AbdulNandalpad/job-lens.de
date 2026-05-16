'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { useLanguage } from '@/lib/i18n'

const blue  = '#378ADD'
const navy  = '#042C53'
const green = '#1D9E75'
const amber = '#f59e0b'

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
}

const COUNTRIES = [
  { code: 'de', label: '🇩🇪 Germany' },
  { code: 'ch', label: '🇨🇭 Switzerland' },
  { code: 'at', label: '🇦🇹 Austria' },
  { code: 'gb', label: '🇬🇧 United Kingdom' },
]
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

function formatSalary(job: Job) {
  if (!job.job_min_salary) return null
  const currency = job.job_salary_currency || (job.job_country === 'ch' ? 'CHF' : 'EUR')
  const fmt = (n: number) => n.toLocaleString('de-DE')
  return `${currency} ${fmt(job.job_min_salary)}${job.job_max_salary ? `–${fmt(job.job_max_salary)}` : ''}`
}

export default function DACHJobsPage() {
  const router = useRouter()
  const { t } = useLanguage()

  const [query,        setQuery]        = useState('')
  const [location,     setLocation]     = useState('')
  const [country,      setCountry]      = useState('de')
  const [jobType,      setJobType]      = useState('')
  const [postedWithin, setPostedWithin] = useState('')
  const [jobs,         setJobs]         = useState<Job[]>([])
  const [loading,      setLoading]      = useState(false)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [searched,     setSearched]     = useState(false)
  const [selectedJob,  setSelectedJob]  = useState<Job | null>(null)
  const [page,         setPage]         = useState(1)
  const [hasMore,      setHasMore]      = useState(false)
  const [mobFilter,    setMobFilter]    = useState(false)
  const autoSearched = useRef(false)

  // Auto-search from URL params (e.g. from Career Scan role suggestions)
  useEffect(() => {
    if (autoSearched.current || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) {
      autoSearched.current = true
      setQuery(q)
      doSearch(q, '', 'de', '', '', 1)
    }
  }, [])

  async function doSearch(q: string, loc: string, ctry: string, jt: string, pw: string, pg: number) {
    if (!q.trim()) return
    setLoading(true); setSearched(true); setSelectedJob(null); setPage(pg)
    try {
      const p = new URLSearchParams({ q: q.trim(), country: ctry, page: String(pg) })
      if (loc.trim()) p.set('location', loc.trim())
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

  function search() { doSearch(query, location, country, jobType, postedWithin, 1) }

  async function loadMore() {
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const p = new URLSearchParams({ q: query, country, page: String(nextPage) })
      if (location.trim()) p.set('location', location.trim())
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
    setSelectedJob(prev => prev?.job_id === job.job_id ? null : job)
    sessionStorage.setItem('jl_cvb_job', JSON.stringify(job))
  }

  const FilterPanel = () => (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      {/* Job title */}
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:.6, textTransform:'uppercase', marginBottom:7 }}>Job Title / Skill</div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="e.g. Full Stack Developer"
          style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.18)', background:'rgba(255,255,255,0.07)', fontSize:13, color:'#fff', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' }}
        />
      </div>

      {/* Location */}
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:.6, textTransform:'uppercase', marginBottom:7 }}>Location</div>
        <input
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="City or region (optional)"
          style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.18)', background:'rgba(255,255,255,0.07)', fontSize:13, color:'#fff', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' }}
        />
      </div>

      {/* Country */}
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:.6, textTransform:'uppercase', marginBottom:7 }}>Country</div>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {COUNTRIES.map(c => (
            <div key={c.code}
              onClick={() => setCountry(c.code)}
              style={{ padding:'7px 11px', borderRadius:7, border:`1px solid ${country===c.code?blue:'rgba(255,255,255,0.15)'}`, background:country===c.code?`${blue}20`:'rgba(255,255,255,0.04)', color:country===c.code?'#fff':'rgba(255,255,255,0.6)', fontSize:12, cursor:'pointer', transition:'all .15s' }}>
              {c.label}
            </div>
          ))}
        </div>
      </div>

      {/* Job type */}
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:.6, textTransform:'uppercase', marginBottom:7 }}>Job Type</div>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <div onClick={() => setJobType('')}
            style={{ padding:'7px 11px', borderRadius:7, border:`1px solid ${jobType===''?blue:'rgba(255,255,255,0.15)'}`, background:jobType===''?`${blue}20`:'rgba(255,255,255,0.04)', color:jobType===''?'#fff':'rgba(255,255,255,0.6)', fontSize:12, cursor:'pointer', transition:'all .15s' }}>
            Any type
          </div>
          {JOB_TYPES.map(jt => (
            <div key={jt} onClick={() => setJobType(prev => prev===jt?'':jt)}
              style={{ padding:'7px 11px', borderRadius:7, border:`1px solid ${jobType===jt?blue:'rgba(255,255,255,0.15)'}`, background:jobType===jt?`${blue}20`:'rgba(255,255,255,0.04)', color:jobType===jt?'#fff':'rgba(255,255,255,0.6)', fontSize:12, cursor:'pointer', transition:'all .15s' }}>
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
            <div key={opt.value} onClick={() => setPostedWithin(opt.value)}
              style={{ padding:'7px 11px', borderRadius:7, border:`1px solid ${postedWithin===opt.value?blue:'rgba(255,255,255,0.15)'}`, background:postedWithin===opt.value?`${blue}20`:'rgba(255,255,255,0.04)', color:postedWithin===opt.value?'#fff':'rgba(255,255,255,0.6)', fontSize:12, cursor:'pointer', transition:'all .15s' }}>
              {opt.label}
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => { search(); setMobFilter(false) }} disabled={loading || !query.trim()}
        style={{ padding:'11px 0', borderRadius:9, border:'none', background:loading||!query.trim()?'rgba(255,255,255,0.1)':`linear-gradient(135deg,${blue},#1a6abf)`, color:loading||!query.trim()?'rgba(255,255,255,0.3)':'#fff', fontWeight:700, fontSize:13, cursor:loading||!query.trim()?'not-allowed':'pointer', fontFamily:"'Outfit',sans-serif", transition:'all .15s' }}>
        {loading ? 'Searching…' : '🔍 Search Jobs'}
      </button>

      <div style={{ paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.1)', fontSize:11, color:'rgba(255,255,255,0.35)', lineHeight:1.6 }}>
        Want AI-powered matching?<br/>
        <span onClick={() => router.push('/app/smart-apply')} style={{ color:'#85B7EB', cursor:'pointer', textDecoration:'underline' }}>
          Try Smart Apply →
        </span>
      </div>
    </div>
  )

  return (
    <>
      <Navbar />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .dach-job-card { cursor:pointer; transition:box-shadow .15s,border-color .15s; }
        .dach-job-card:hover { box-shadow:0 4px 16px rgba(4,44,83,0.1) !important; }
        .dach-action-btn { transition:opacity .15s,transform .15s; }
        .dach-action-btn:hover { opacity:.85; transform:translateY(-1px); }
        .dach-jobs-layout { display:grid; grid-template-columns:260px 1fr; gap:0; min-height:calc(100vh - 52px); }
        .dach-jobs-sidebar { background:linear-gradient(180deg,#152233 0%,#0e1a28 100%); padding:24px 18px; border-right:1px solid rgba(255,255,255,0.1); position:sticky; top:52px; height:calc(100vh - 52px); overflow-y:auto; }
        .dach-jobs-main { background:#f0f4f8; padding:28px 24px; overflow-y:auto; }
        .dach-mob-filter { display:none; }
        @media(max-width:768px){
          .dach-jobs-layout { grid-template-columns:1fr; }
          .dach-jobs-sidebar { display:none; }
          .dach-jobs-main { padding:16px 14px; }
          .dach-mob-filter { display:flex !important; }
        }
        .dach-mob-drawer { display:none; background:linear-gradient(180deg,#152233 0%,#0e1a28 100%); padding:20px 16px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); margin-bottom:16px; }
        @media(max-width:768px){ .dach-mob-drawer.open { display:block; } }
      `}</style>

      <div className="dach-jobs-layout">

        {/* ── LEFT SIDEBAR ── */}
        <div className="dach-jobs-sidebar">
          <div style={{ paddingBottom:16, marginBottom:16, borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:700, color:'#fff' }}>Search Filters</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:3 }}>Live listings · Adzuna DACH</div>
          </div>
          <FilterPanel />
        </div>

        {/* ── MAIN ── */}
        <div className="dach-jobs-main">
          <div style={{ marginBottom:20, paddingLeft:14, borderLeft:`3px solid ${blue}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <div>
              <h1 style={{ fontFamily:"'Outfit',sans-serif", fontSize:20, fontWeight:700, color:navy, margin:0 }}>Job Search</h1>
              <p style={{ fontSize:13, color:'#6b7c93', margin:'3px 0 0' }}>Live listings from DACH employers via Adzuna</p>
            </div>
            <button className="dach-mob-filter" onClick={() => setMobFilter(p => !p)}
              style={{ padding:'9px 16px', borderRadius:9, background:navy, color:'#fff', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              ⚙️ {mobFilter ? 'Hide' : 'Filters'}
            </button>
          </div>

          <div className={`dach-mob-drawer${mobFilter?' open':''}`}>
            <FilterPanel />
          </div>

          {loading && <div style={{ textAlign:'center', padding:48, color:'#9aafbc' }}>Searching jobs…</div>}

          {!loading && searched && jobs.length === 0 && (
            <div style={{ textAlign:'center', padding:48, color:'#9aafbc' }}>
              <div style={{ fontSize:32, marginBottom:12, opacity:.3 }}>0</div>
              No jobs found. Try a different term or location.
            </div>
          )}

          {!loading && !searched && (
            <div style={{ textAlign:'center', padding:'64px 24px', color:'#9aafbc' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
              <p style={{ fontSize:15, fontWeight:600, color:navy, marginBottom:6 }}>Search jobs across DACH</p>
              <p style={{ fontSize:13, lineHeight:1.7 }}>Enter a job title in the filters and hit Search.<br/>Tap any result to build a tailored CV or write a cover letter.</p>
            </div>
          )}

          {!loading && jobs.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ fontSize:13, color:'#9aafbc', marginBottom:4 }}>{jobs.length} jobs found — tap a card to see actions</div>

              {jobs.map(job => {
                const isSel = selectedJob?.job_id === job.job_id
                const salary = formatSalary(job)
                return (
                  <div key={job.job_id} className="dach-job-card"
                    onClick={() => selectJob(job)}
                    style={{ background:'#fff', borderRadius:12, padding:'18px 20px', border:`1.5px solid ${isSel?blue:'#edf1f6'}`, boxShadow:isSel?`0 4px 20px rgba(55,138,221,0.15)`:'0 2px 8px rgba(4,44,83,0.05)', transition:'all .2s' }}>

                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:700, color:navy }}>{job.job_title}</div>
                          {isSel && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:10, background:blue+'20', color:blue, fontWeight:700, flexShrink:0 }}>Selected</span>}
                        </div>
                        <div style={{ fontSize:13, color:'#6b7c93', marginBottom:8 }}>
                          {job.employer_name}{job.job_city?` · ${job.job_city}`:''}{job.job_employment_type?` · ${job.job_employment_type}`:''}
                        </div>
                        <p style={{ fontSize:12, color:'#8fa3b8', lineHeight:1.6, margin:'0 0 10px', display:'-webkit-box', WebkitLineClamp:isSel?undefined:2, WebkitBoxOrient:'vertical', overflow:isSel?'visible':'hidden' }}>
                          {job.job_description}
                        </p>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                          {salary && (
                            <span style={{ fontSize:11, padding:'3px 10px', borderRadius:12, background:'rgba(29,158,117,0.1)', color:green, fontWeight:600 }}>{salary}</span>
                          )}
                          {job.job_posted_at_datetime_utc && (
                            <span style={{ fontSize:11, color:'#9aafbc' }}>{timeAgo(job.job_posted_at_datetime_utc)}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize:16, color:isSel?blue:'#c0cfe0', flexShrink:0, transition:'transform .2s', transform:isSel?'rotate(180deg)':'rotate(0deg)', marginTop:2 }}>v</div>
                    </div>

                    {isSel && (
                      <div onClick={e => e.stopPropagation()} style={{ marginTop:18, paddingTop:16, borderTop:`1px solid ${blue}20` }}>
                        <div style={{ fontSize:11, fontWeight:700, color:blue, letterSpacing:.5, textTransform:'uppercase', marginBottom:10 }}>What do you want to do?</div>
                        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                          <button className="dach-action-btn" onClick={() => router.push('/app/cv-builder')}
                            style={{ padding:'10px 18px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${blue},#1a6abf)`, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
                            Build CV for this job
                          </button>
                          <button className="dach-action-btn" onClick={() => router.push('/app/cover-letter')}
                            style={{ padding:'10px 18px', borderRadius:9, border:`1px solid ${green}40`, background:green+'10', color:green, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
                            Write Cover Letter
                          </button>
                          <button className="dach-action-btn" onClick={() => router.push('/app/smart-apply')}
                            style={{ padding:'10px 18px', borderRadius:9, border:`1px solid ${amber}40`, background:amber+'10', color:amber, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
                            AI Job Match
                          </button>
                          <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer" className="dach-action-btn"
                            style={{ padding:'10px 18px', borderRadius:9, border:'1px solid #dce4ef', background:'#f8fafc', color:'#6b7c93', fontSize:12, fontWeight:600, textDecoration:'none', cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
                            Open listing →
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {hasMore && (
                <div style={{ textAlign:'center', marginTop:8 }}>
                  <button onClick={loadMore} disabled={loadingMore}
                    style={{ padding:'10px 32px', borderRadius:8, background:loadingMore?'#ccc':`linear-gradient(135deg,${blue},#1a6abf)`, color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:loadingMore?'not-allowed':'pointer' }}>
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
