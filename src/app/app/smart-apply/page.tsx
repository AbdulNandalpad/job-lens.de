'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
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
  matchChips?: { label: string; positive: boolean }[]
  matchScore?: number
}

interface Profile {
  suggestedQuery: string
  queryFallbacks?: string[]
  skills: string[]
  titles: string[]
  seniority: string
  industries: string[]
  languages: string[]
  summary: string
}

type JobTypeOption = 'Full-time' | 'Contract' | 'Hybrid' | 'Remote'
type RightTab = 'description' | 'cv' | 'cl'

const JOB_TYPE_OPTIONS: JobTypeOption[] = ['Full-time', 'Contract', 'Hybrid', 'Remote']
const EXPERIENCE_OPTIONS = ['Any level', 'Junior (0-3 yrs)', 'Mid (3-8 yrs)', 'Senior (8-15 yrs)', 'Director / VP (15+ yrs)']

function SmartJobSearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const linkedinRef = useRef<HTMLInputElement>(null)
  const cvRef = useRef<HTMLInputElement>(null)

  const [linkedinFileName, setLinkedinFileName] = useState('')
  const [linkedinText, setLinkedinText] = useState('')
  const [cvFileName, setCvFileName] = useState('')
  const [cvText, setCvText] = useState('')
  const [carriedOver, setCarriedOver] = useState(false)

  const [targetRole, setTargetRole] = useState('')
  const [jobTypes, setJobTypes] = useState<JobTypeOption[]>(['Full-time'])
  const [experience, setExperience] = useState('Senior (8-15 yrs)')
  const [location, setLocation] = useState('Stuttgart, Germany')
  const [country, setCountry] = useState('de')
  const [daysOld, setDaysOld] = useState('')

  const [profile, setProfile] = useState<Profile | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [usedQuery, setUsedQuery] = useState('')

  const [activeRight, setActiveRight] = useState<RightTab>('description')
  const [loggedJobs, setLoggedJobs] = useState<Set<string>>(new Set())
  const [mobOpen, setMobOpen] = useState(false)

  const hasProfile = !!(linkedinText || cvText)
  const autoSearchDone = useRef(false)

  useEffect(() => {
    const fromCareerScan = searchParams.get('from') === 'career-scan'
    if (fromCareerScan) {
      const savedCv = sessionStorage.getItem('jl_cv_text')
      const savedRole = sessionStorage.getItem('jl_target_role')
      if (savedCv) { setCvText(savedCv); setCvFileName('From Career Scan'); setCarriedOver(true) }
      if (savedRole) setTargetRole(savedRole)
    } else {
      const savedJobs = sessionStorage.getItem('jl_jobs')
      const savedQuery = sessionStorage.getItem('jl_used_query')
      const savedCv = sessionStorage.getItem('jl_sjs_cv_text')
      const savedCvName = sessionStorage.getItem('jl_sjs_cv_name')
      const savedRole = sessionStorage.getItem('jl_sjs_target_role')
      if (savedJobs) {
        try {
          setJobs(JSON.parse(savedJobs))
          if (savedQuery) setUsedQuery(savedQuery)
          if (savedCv) { setCvText(savedCv); setCvFileName(savedCvName || 'Restored') }
          if (savedRole) setTargetRole(savedRole)
        } catch { }
      }
    }
  }, [searchParams])

  useEffect(() => {
    if (jobs.length > 0) {
      sessionStorage.setItem('jl_jobs', JSON.stringify(jobs))
      sessionStorage.setItem('jl_used_query', usedQuery)
    }
  }, [jobs, usedQuery])

  useEffect(() => {
    if (cvText) { sessionStorage.setItem('jl_sjs_cv_text', cvText); sessionStorage.setItem('jl_sjs_cv_name', cvFileName) }
  }, [cvText, cvFileName])

  // Auto-trigger job search when CV is carried over from Career Scan
  useEffect(() => {
    if (carriedOver && cvText && !autoSearchDone.current) {
      autoSearchDone.current = true
      handleFindJobs()
    }
  }, [carriedOver, cvText])

  useEffect(() => {
    if (targetRole) sessionStorage.setItem('jl_sjs_target_role', targetRole)
  }, [targetRole])

  function clearLinkedinFile() { setLinkedinFileName(''); setLinkedinText(''); if (linkedinRef.current) linkedinRef.current.value = '' }
  function clearCvFile() { setCvFileName(''); setCvText(''); setCarriedOver(false); if (cvRef.current) cvRef.current.value = '' }

  async function handleLinkedinFile(file: File) {
    setLinkedinFileName(file.name)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/extract-pdf', { method: 'POST', body: form })
      const data = await res.json()
      if (data.text) setLinkedinText(data.text)
    } catch { }
  }

  async function handleCvFile(file: File) {
    setCvFileName(file.name); setCvText(''); setCarriedOver(false)
    if (file.name.endsWith('.txt') || file.type === 'text/plain') {
      const r = new FileReader()
      r.onload = e => setCvText((e.target?.result as string) ?? '')
      r.readAsText(file)
    } else {
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch('/api/extract-pdf', { method: 'POST', body: form })
        const data = await res.json()
        if (data.text) { setCvText(data.text) } else { alert(data.error || 'Could not read PDF.'); setCvFileName('') }
      } catch { alert('Failed to read PDF.'); setCvFileName('') }
    }
  }

  function toggleJobType(t: JobTypeOption) {
    setJobTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  function toggleLogged(jobId: string) {
    setLoggedJobs(prev => { const next = new Set(prev); next.has(jobId) ? next.delete(jobId) : next.add(jobId); return next })
  }

  function resetAll() {
    setLinkedinFileName(''); setLinkedinText(''); setCvFileName(''); setCvText(''); setCarriedOver(false)
    setTargetRole(''); setJobTypes(['Full-time']); setExperience('Senior (8-15 yrs)')
    setLocation('Stuttgart, Germany'); setCountry('de'); setDaysOld('')
    setJobs([]); setSelectedJob(null); setProfile(null); setError(''); setUsedQuery('')
    setLoggedJobs(new Set())
    if (linkedinRef.current) linkedinRef.current.value = ''
    if (cvRef.current) cvRef.current.value = ''
    sessionStorage.removeItem('jl_jobs'); sessionStorage.removeItem('jl_used_query')
    sessionStorage.removeItem('jl_sjs_cv_text'); sessionStorage.removeItem('jl_sjs_cv_name')
    sessionStorage.removeItem('jl_sjs_target_role'); sessionStorage.removeItem('jl_cv_text')
    sessionStorage.removeItem('jl_target_role')
    sessionStorage.removeItem('jl_cvb_job')
  }

  function generateMatchChips(job: Job, extractedProfile: Profile | null): { label: string; positive: boolean }[] {
    const chips: { label: string; positive: boolean }[] = []
    const desc = (job.job_description || '').toLowerCase()
    const title = (job.job_title || '').toLowerCase()
    if (extractedProfile) {
      extractedProfile.skills.filter(s => desc.includes(s.toLowerCase()) || title.includes(s.toLowerCase())).slice(0, 3).forEach(s => chips.push({ label: `${s} match`, positive: true }))
    } else {
      const roleWords = targetRole.toLowerCase().split(/\s+/)
      if (roleWords.some(w => w.length > 2 && (title.includes(w) || desc.includes(w)))) chips.push({ label: `${targetRole} match`, positive: true })
    }
    const cityLower = location.split(',')[0].toLowerCase()
    if (cityLower && job.job_city?.toLowerCase().includes(cityLower)) chips.push({ label: 'Location match', positive: true })
    if (job.job_employment_type && jobTypes.some(t => job.job_employment_type.toLowerCase().includes(t.toLowerCase().replace('-', '')))) {
      chips.push({ label: job.job_employment_type, positive: true })
    }
    return chips
  }

  // Real skill-overlap score — only shown when we have an extracted profile with skills.
  // Percentage = matched skills / total profile skills. No invented numbers.
  function computeMatchScore(job: Job, extractedProfile: Profile | null): number | undefined {
    if (!extractedProfile || !extractedProfile.skills.length) return undefined
    const desc = (job.job_description || '').toLowerCase()
    const title = (job.job_title || '').toLowerCase()
    const matched = extractedProfile.skills.filter(s =>
      desc.includes(s.toLowerCase()) || title.includes(s.toLowerCase())
    ).length
    return Math.round((matched / extractedProfile.skills.length) * 100)
  }

  async function handleFindJobs() {
    if (!targetRole.trim() && !hasProfile) return
    setAnalysing(false); setLoading(false); setError(''); setJobs([]); setSelectedJob(null); setProfile(null)
    let extractedProfile: Profile | null = null
    let searchQuery = targetRole
    if (hasProfile) {
      setAnalysing(true)
      try {
        const res = await fetch('/api/analyse-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ linkedinText, cvText, targetRole, experience, jobTypes }) })
        extractedProfile = await res.json()
        setProfile(extractedProfile)
        // Use targetRole as search query when provided — user knows what they want.
        // Fall back to AI-suggested query only if no role was typed.
        searchQuery = targetRole.trim() || extractedProfile?.suggestedQuery || ''
      } catch { searchQuery = targetRole }
      setAnalysing(false)
    }
    setLoading(true); setUsedQuery(searchQuery)
    try {
      // Build a fallback query chain: primary → targetRole → AI fallbacks → first skill
      const queryChain = [searchQuery]
      if (targetRole.trim() && targetRole !== searchQuery) queryChain.push(targetRole.trim())
      if (extractedProfile?.queryFallbacks) queryChain.push(...(extractedProfile.queryFallbacks || []))
      if (extractedProfile?.titles?.[0] && !queryChain.includes(extractedProfile.titles[0])) queryChain.push(extractedProfile.titles[0])

      let jobs: Job[] = []
      let usedQ = searchQuery

      for (const q of queryChain) {
        if (!q.trim()) continue
        const params = new URLSearchParams({ q: q.trim(), location, country })
        if (daysOld) params.set('max_days_old', daysOld)
        const res = await fetch(`/api/jobs?${params}`)
        const data = await res.json()
        if (!data.error && (data.jobs || []).length > 0) {
          jobs = data.jobs
          usedQ = q.trim()
          break
        }
      }

      setUsedQuery(usedQ)
      if (jobs.length === 0) { setError('No jobs found. Try a different role or location.'); setLoading(false); return }

      setJobs(jobs.map((job: Job) => ({ ...job, matchChips: generateMatchChips(job, extractedProfile), matchScore: computeMatchScore(job, extractedProfile) })))
    } catch { setError('Failed to fetch jobs. Please try again.') }
    setLoading(false)
  }

  // Save job to sessionStorage and navigate to CV Builder
  function openCvBuilder(job: Job) {
    sessionStorage.setItem('jl_cvb_job', JSON.stringify(job))
    // Clear any previously tailored CV so builder starts fresh for this job
    sessionStorage.removeItem('jl_cvb_tailored')
    router.push('/app/cv-builder')
  }

  // Save job to sessionStorage and navigate to Cover Letter Builder
  function openCoverLetter(job: Job) {
    sessionStorage.setItem('jl_cvb_job', JSON.stringify(job))
    router.push('/app/cover-letter')
  }

  function selectJob(job: Job) { setSelectedJob(job); setActiveRight('description') }

  function formatPostedDate(dateStr: string) {
    if (!dateStr) return ''; const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
    if (diffDays === 0) return 'Today'; if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`; if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return `${Math.floor(diffDays / 30)}mo ago`
  }

  function formatSalary(job: Job) {
    if (!job.job_min_salary) return null
    return `${job.job_salary_currency || 'EUR'} ${job.job_min_salary.toLocaleString()}${job.job_max_salary ? `-${job.job_max_salary.toLocaleString()}` : ''}`
  }

  function getMatchBorderColor(chips: { label: string; positive: boolean }[] | undefined) {
    if (!chips || chips.length === 0) return '#edf1f6'
    const positiveCount = chips.filter(c => c.positive).length
    if (positiveCount >= 3) return '#1D9E75'
    if (positiveCount >= 1) return '#F59E0B'
    return '#edf1f6'
  }

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: '#fff', background: 'rgba(255,255,255,0.1)', outline: 'none', boxSizing: 'border-box' }
  const secLabel = (text: string) => <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 6 }}>{text}</div>

  function UploadBox({ label, sublabel, fileName, inputRef, onFile, onClear, accept }: {
    label: string; sublabel: string; fileName: string
    inputRef: React.RefObject<HTMLInputElement | null>
    onFile: (f: File) => void; onClear: () => void; accept: string
  }) {
    return (
      <div>
        {secLabel(label)}
        <div style={{ position: 'relative' }}>
          <div onClick={() => !fileName && inputRef.current?.click()} style={{ border: `1.5px ${fileName ? 'solid #4ade80' : 'dashed rgba(255,255,255,0.25)'}`, borderRadius: 10, padding: '11px 14px', cursor: fileName ? 'default' : 'pointer', background: fileName ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 10 }}>
            <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
            <div style={{ width: 20, height: 20, borderRadius: 4, background: fileName ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: fileName ? '#4ade80' : '#fff', marginBottom: 1 }}>{fileName || sublabel}</div>
              <div style={{ fontSize: 11, color: fileName ? '#4ade80' : 'rgba(255,255,255,0.5)' }}>{fileName ? 'Ready - click x to remove' : 'Click to upload'}</div>
            </div>
          </div>
          {fileName && (
            <button onClick={onClear} style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: '#E24B4A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
          )}
        </div>
      </div>
    )
  }

  function MatchChips({ chips }: { chips: { label: string; positive: boolean }[] }) {
    if (!chips || chips.length === 0) return null
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {chips.map((chip, i) => (
          <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, fontWeight: 600, background: chip.positive ? 'rgba(29,158,117,0.12)' : 'rgba(245,158,11,0.12)', color: chip.positive ? '#1D9E75' : '#92400e', border: `1px solid ${chip.positive ? 'rgba(29,158,117,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
            {chip.positive ? '\u2713 ' : '~ '}{chip.label}
          </span>
        ))}
      </div>
    )
  }

  function JobCard({ job }: { job: Job }) {
    const isSelected = selectedJob?.job_id === job.job_id
    const isLogged = loggedJobs.has(job.job_id)
    const salary = formatSalary(job)
    const borderColor = getMatchBorderColor(job.matchChips)
    const matchCount = job.matchChips?.filter(c => c.positive).length || 0

    return (
      <div style={{ background: '#fff', border: `1.5px solid ${isSelected ? '#378ADD' : '#edf1f6'}`, borderLeft: `4px solid ${isSelected ? '#378ADD' : borderColor}`, borderRadius: 12, overflow: 'hidden', boxShadow: isSelected ? '0 4px 20px rgba(55,138,221,0.15)' : '0 1px 4px rgba(0,0,0,0.04)', transition: 'all 0.15s' }}>
        <div onClick={() => selectJob(job)} style={{ padding: '14px 16px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#042C53', flex: 1, marginRight: 8 }}>{job.job_title}</div>
            {job.matchScore !== undefined && (
              <div style={{ fontSize: 11, padding: '3px 9px', borderRadius: 10, fontWeight: 700, flexShrink: 0, background: job.matchScore >= 60 ? '#f0fbf6' : job.matchScore >= 30 ? '#fffbeb' : '#f5f7fa', color: job.matchScore >= 60 ? '#1D9E75' : job.matchScore >= 30 ? '#92400e' : '#6b7c93', border: `1px solid ${job.matchScore >= 60 ? '#b6ecd8' : job.matchScore >= 30 ? '#fcd98a' : '#edf1f6'}` }}>
                {job.matchScore}% match
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#6b7c93', marginBottom: 8 }}>
            {[job.employer_name, [job.job_city, job.job_country].filter(Boolean).join(', '), salary, job.job_posted_at_datetime_utc ? formatPostedDate(job.job_posted_at_datetime_utc) : null].filter(Boolean).join(' · ')}
          </div>
          {job.matchChips && <MatchChips chips={job.matchChips} />}
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '9px 16px', borderTop: '1px solid #f3f6fa', background: '#fafbfd', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Build CV -- saves job + navigates to CV Builder */}
          <button
            onClick={() => openCvBuilder(job)}
            disabled={!cvText}
            style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, border: 'none', background: cvText ? 'linear-gradient(135deg, #042C53, #185FA5)' : '#e8ecf1', color: cvText ? '#fff' : '#8fa3b8', cursor: cvText ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: 600 }}
          >
            Build CV
          </button>
          {/* Cover Letter -- saves job + navigates to Cover Letter Builder */}
          <button
            onClick={() => openCoverLetter(job)}
            disabled={!cvText}
            style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, border: '1px solid #dce4ef', background: '#fff', color: cvText ? '#185FA5' : '#8fa3b8', cursor: cvText ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: 500 }}
          >
            Cover Letter
          </button>
          <button onClick={() => toggleLogged(job.job_id)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, border: `1px solid ${isLogged ? '#b6ecd8' : '#dce4ef'}`, background: isLogged ? '#f0fbf6' : '#fff', color: isLogged ? '#1D9E75' : '#6b7c93', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
            {isLogged ? '\u2713 Applied' : 'Log applied'}
          </button>
          <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, border: '1px solid #dce4ef', background: '#fff', color: '#6b7c93', textDecoration: 'none', fontFamily: 'inherit', fontWeight: 500, marginLeft: 'auto' }}>
            View job
          </a>
        </div>
      </div>
    )
  }

  function RightPanel() {
    if (!selectedJob) {
      const tips = [
        { color: '#1D9E75', borderLabel: 'Green border', chipLabel: 'Strong match', desc: 'High skill overlap with your profile. Apply first.' },
        { color: '#F59E0B', borderLabel: 'Amber border', chipLabel: 'Partial match', desc: 'Some overlap — worth reviewing.' },
        { color: '#edf1f6', borderLabel: 'No border', chipLabel: 'Keyword match', desc: 'Matched your role query — may still be a fit.' },
      ]
      const actions = [
        { icon: '📄', label: 'Build CV', desc: 'AI-tailors your CV for the exact job posting', cost: '1 credit', enabled: !!cvText },
        { icon: '✉️', label: 'Cover Letter', desc: 'Writes a personalised letter in your tone', cost: '1 credit', enabled: !!cvText },
        { icon: '⚡', label: 'Auto Apply', desc: 'AI fills the whole application form for you', cost: '3 credits', enabled: false },
      ]
      return (
        <div style={{ background: '#fff', border: '1.5px solid #edf1f6', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(4,44,83,0.06)' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #152233 0%, #0e1a28 100%)', padding: '24px 24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(55,138,221,0.2)', border: '1px solid rgba(55,138,221,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                ◎
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>
                  {jobs.length > 0 ? 'Select a job to get started' : 'Your workspace'}
                </div>
                <div style={{ fontSize: 12, color: '#85B7EB', marginTop: 2 }}>
                  {jobs.length > 0 ? `${jobs.length} matched positions ready` : 'Run a search to see matching jobs'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Border guide */}
            {jobs.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#8fa3b8', letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 10 }}>Reading match quality</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {tips.map(t => (
                    <div key={t.borderLabel} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 4, height: 32, borderRadius: 2, background: t.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1a2332' }}>{t.chipLabel}</div>
                        <div style={{ fontSize: 11, color: '#8fa3b8', lineHeight: 1.4 }}>{t.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What you can do per job */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#8fa3b8', letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 10 }}>What you can do per job</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {actions.map(a => (
                  <div key={a.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, background: a.enabled ? '#fafbfd' : '#fafbfd', border: `1px solid ${a.enabled ? '#edf1f6' : '#edf1f6'}`, opacity: a.enabled || a.label === 'Auto Apply' ? 1 : 0.6 }}>
                    <div style={{ fontSize: 18, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>{a.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2332', fontFamily: "'Outfit', sans-serif" }}>{a.label}</span>
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: '#E6F1FB', color: '#185FA5', fontWeight: 600, flexShrink: 0 }}>{a.cost}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#8fa3b8', lineHeight: 1.4 }}>{a.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CV hint if not uploaded */}
            {!cvText && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fcd98a', fontSize: 12, color: '#92400e', lineHeight: 1.55 }}>
                <strong>Tip:</strong> Upload your CV in the sidebar to enable AI-tailored CV & cover letter generation, and to see skill-match scores on job cards.
              </div>
            )}
          </div>
        </div>
      )
    }

    const salary = formatSalary(selectedJob)
    const tabs = [
      { key: 'description' as RightTab, label: 'Job Details' },
      { key: 'cv' as RightTab, label: 'Build CV' },
      { key: 'cl' as RightTab, label: 'Cover Letter' },
    ]

    return (
      <div style={{ background: '#fff', border: '1.5px solid #edf1f6', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(4,44,83,0.08)' }}>
        {/* Gradient header */}
        <div style={{ background: 'linear-gradient(135deg, #152233 0%, #0e1a28 100%)', padding: '20px 20px 16px' }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>{selectedJob.job_title}</div>
              {selectedJob.matchScore !== undefined && (
                <div style={{ fontSize: 12, padding: '4px 10px', borderRadius: 10, fontWeight: 700, flexShrink: 0, background: selectedJob.matchScore >= 60 ? 'rgba(29,158,117,0.25)' : selectedJob.matchScore >= 30 ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.12)', color: selectedJob.matchScore >= 60 ? '#4ade80' : selectedJob.matchScore >= 30 ? '#fcd34d' : 'rgba(255,255,255,0.6)', border: `1px solid ${selectedJob.matchScore >= 60 ? 'rgba(74,222,128,0.4)' : selectedJob.matchScore >= 30 ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.2)'}` }}>
                  {selectedJob.matchScore}% skill match
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#85B7EB' }}>
              {[selectedJob.employer_name, [selectedJob.job_city, selectedJob.job_country].filter(Boolean).join(', '), salary].filter(Boolean).join(' · ')}
            </div>
          </div>
          {selectedJob.matchChips && selectedJob.matchChips.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {selectedJob.matchChips.map((chip, i) => (
                <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, fontWeight: 600, background: chip.positive ? 'rgba(74,222,128,0.2)' : 'rgba(245,158,11,0.2)', color: chip.positive ? '#4ade80' : '#fcd34d', border: `1px solid ${chip.positive ? 'rgba(74,222,128,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                  {chip.positive ? '\u2713 ' : '~ '}{chip.label}
                </span>
              ))}
            </div>
          )}
          {!cvText && (
            <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 10, padding: '5px 10px', background: 'rgba(251,191,36,0.15)', borderRadius: 6, display: 'inline-block', border: '1px solid rgba(251,191,36,0.3)' }}>
              &#9888; Upload CV to enable AI tailoring
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #edf1f6', background: '#fafbfd' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveRight(tab.key)} style={{ fontSize: 12, padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', color: activeRight === tab.key ? '#042C53' : '#6b7c93', borderBottom: activeRight === tab.key ? '2px solid #378ADD' : '2px solid transparent', fontWeight: activeRight === tab.key ? 700 : 400, transition: 'color 0.15s' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: 20, maxHeight: 520, overflowY: 'auto' }}>

          {/* Job Details tab */}
          {activeRight === 'description' && (
            <div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {selectedJob.job_employment_type && <span style={{ fontSize: 12, background: '#E6F1FB', color: '#185FA5', padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}>{selectedJob.job_employment_type}</span>}
                {salary && <span style={{ fontSize: 12, background: '#f0fbf6', color: '#1D9E75', padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}>{salary}</span>}
                {selectedJob.job_posted_at_datetime_utc && <span style={{ fontSize: 12, background: '#f0f4f8', color: '#6b7c93', padding: '4px 10px', borderRadius: 8 }}>{formatPostedDate(selectedJob.job_posted_at_datetime_utc)}</span>}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#042C53', marginBottom: 10, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Description</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                {selectedJob.job_description?.slice(0, 1400)}
                {(selectedJob.job_description?.length ?? 0) > 1400 && <span style={{ color: '#8fa3b8' }}>...</span>}
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a href={selectedJob.job_apply_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, padding: '9px 20px', borderRadius: 8, background: 'linear-gradient(135deg, #042C53, #185FA5)', color: '#E6F1FB', textDecoration: 'none', fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
                  View Full Posting &amp; Apply &rarr;
                </a>
                <button onClick={() => toggleLogged(selectedJob.job_id)} style={{ fontSize: 13, padding: '9px 16px', borderRadius: 8, border: `1px solid ${loggedJobs.has(selectedJob.job_id) ? '#b6ecd8' : '#dce4ef'}`, background: loggedJobs.has(selectedJob.job_id) ? '#f0fbf6' : '#fff', color: loggedJobs.has(selectedJob.job_id) ? '#1D9E75' : '#6b7c93', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                  {loggedJobs.has(selectedJob.job_id) ? '\u2713 Applied' : 'Log applied'}
                </button>
              </div>
            </div>
          )}

          {/* Build CV tab -- navigate to CV Builder */}
          {activeRight === 'cv' && (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #E6F1FB, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 16px' }}>&#128196;</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2332', fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>
                {cvText ? `Tailor your CV for ${selectedJob.employer_name}` : 'No CV uploaded yet'}
              </div>
              <div style={{ fontSize: 13, color: '#8fa3b8', lineHeight: 1.7, marginBottom: 24, maxWidth: 280, margin: '0 auto 24px' }}>
                {cvText
                  ? 'Open the CV Builder to choose a template, tone, language and generate a tailored CV with full download options.'
                  : 'Upload your CV in the left sidebar first, then come back to build a tailored version.'}
              </div>
              {cvText && (
                <button
                  onClick={() => openCvBuilder(selectedJob)}
                  style={{ padding: '11px 28px', borderRadius: 10, background: 'linear-gradient(135deg, #042C53, #185FA5)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700 }}
                >
                  Open CV Builder &rarr;
                </button>
              )}
            </div>
          )}

          {/* Cover Letter tab -- navigate to Cover Letter Builder */}
          {activeRight === 'cl' && (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #FFF8EC, #fef3c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 16px' }}>&#9997;</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2332', fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>
                {cvText ? `Write a cover letter for ${selectedJob.employer_name}` : 'No CV uploaded yet'}
              </div>
              <div style={{ fontSize: 13, color: '#8fa3b8', lineHeight: 1.7, marginBottom: 24, maxWidth: 280, margin: '0 auto 24px' }}>
                {cvText
                  ? 'Open the Cover Letter Builder to set your tone, language and length, then generate and download a personalised letter.'
                  : 'Upload your CV in the left sidebar first, then come back to write your cover letter.'}
              </div>
              {cvText && (
                <button
                  onClick={() => openCoverLetter(selectedJob)}
                  style={{ padding: '11px 28px', borderRadius: 10, background: 'linear-gradient(135deg, #042C53, #185FA5)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700 }}
                >
                  Open Cover Letter Builder &rarr;
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    )
  }

  const Sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>Smart Job Search</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>AI-powered job matching</div>
      </div>

      {carriedOver && (
        <div style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#4ade80', fontWeight: 500 }}>
          &#10003; CV carried over from Career Scan
        </div>
      )}

      <UploadBox label="LinkedIn PDF" sublabel="Export from LinkedIn, Save to PDF" fileName={linkedinFileName} inputRef={linkedinRef} onFile={handleLinkedinFile} onClear={clearLinkedinFile} accept=".pdf" />
      <UploadBox label="CV / Resume" sublabel="PDF, DOCX or TXT" fileName={cvFileName} inputRef={cvRef} onFile={handleCvFile} onClear={clearCvFile} accept=".pdf,.txt,.doc,.docx" />

      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />

      <div>
        {secLabel('Target Role')}
        <input value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder={hasProfile ? 'Optional - AI suggests from profile' : 'e.g. Product Owner, SAP CX'} onKeyDown={e => e.key === 'Enter' && handleFindJobs()} style={inp} />
        {hasProfile && !targetRole && <div style={{ fontSize: 11, color: '#4ade80', marginTop: 4 }}>AI will extract best role from your profile</div>}
      </div>

      <div>
        {secLabel('Job Type')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {JOB_TYPE_OPTIONS.map(t => (
            <button key={t} onClick={() => toggleJobType(t)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: `1px solid ${jobTypes.includes(t) ? 'rgba(55,138,221,0.5)' : 'rgba(255,255,255,0.2)'}`, background: jobTypes.includes(t) ? 'rgba(55,138,221,0.3)' : 'rgba(255,255,255,0.05)', color: jobTypes.includes(t) ? '#fff' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: jobTypes.includes(t) ? 700 : 400, transition: 'all 0.15s' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        {secLabel('Experience')}
        <select value={experience} onChange={e => setExperience(e.target.value)} style={inp}>
          {EXPERIENCE_OPTIONS.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>

      <div>
        {secLabel('Location')}
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City or leave blank for all" style={inp} />
      </div>

      <div>
        {secLabel('Country')}
        <select value={country} onChange={e => setCountry(e.target.value)} style={inp}>
          <option value="de">Germany</option>
          <option value="ch">Switzerland</option>
          <option value="at">Austria</option>
          <option value="gb">United Kingdom</option>
          <option value="us">United States</option>
        </select>
      </div>

      <div>
        {secLabel('Posted Within')}
        <select value={daysOld} onChange={e => setDaysOld(e.target.value)} style={inp}>
          <option value="">Any time</option>
          <option value="1">Today</option>
          <option value="7">This week</option>
          <option value="14">Last 2 weeks</option>
          <option value="30">Last month</option>
        </select>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />

      {(cvText || linkedinText || jobs.length > 0) && (
        <button onClick={resetAll} style={{ width: '100%', padding: 9, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Reset Everything
        </button>
      )}

      <button
        disabled={(!targetRole.trim() && !hasProfile) || analysing || loading}
        onClick={handleFindJobs}
        style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: (targetRole.trim() || hasProfile) && !analysing && !loading ? 'linear-gradient(135deg, #378ADD, #1D9E75)' : 'rgba(255,255,255,0.1)', color: (targetRole.trim() || hasProfile) && !analysing && !loading ? '#fff' : 'rgba(255,255,255,0.4)', fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700, cursor: (targetRole.trim() || hasProfile) && !analysing && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: (targetRole.trim() || hasProfile) ? '0 4px 16px rgba(55,138,221,0.3)' : 'none', transition: 'all 0.2s' }}
      >
        {analysing ? 'Analysing Profile...' : loading ? 'Searching Jobs...' : hasProfile ? 'Analyze & Find Jobs' : 'Find Matching Jobs'}
      </button>

      {jobs.length > 0 && !loading && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
          <span style={{ fontWeight: 700, color: '#4ade80' }}>{jobs.length}</span> jobs found
        </div>
      )}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        .jl-dsb { display: flex !important; }
        .jl-mbtn { display: none !important; }
        .jl-main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
        @media (max-width: 1100px) { .jl-main-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 768px) { .jl-dsb { display: none !important; } .jl-mbtn { display: block !important; } .jl-main-grid { grid-template-columns: 1fr !important; } }
        input:focus, select:focus { border-color: rgba(55,138,221,0.6) !important; }
        textarea::placeholder { color: rgba(255,255,255,0.35); }
        input::placeholder { color: rgba(255,255,255,0.35); }
        select option { background: #042C53; color: #fff; }
      `}</style>

      <Navbar />

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 52px)' }}>
        <div className="jl-dsb" style={{ width: 270, flexShrink: 0, background: 'linear-gradient(180deg, #152233 0%, #0e1a28 100%)', padding: '20px 16px', flexDirection: 'column', overflowY: 'auto' }}>
          {Sidebar}
        </div>

        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          <div className="jl-mbtn" style={{ padding: '10px 16px', background: '#fff', borderBottom: '1px solid #edf1f6', display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => setMobOpen(o => !o)} style={{ background: '#152233', color: '#E6F1FB', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {mobOpen ? 'Close' : 'Search Settings'}
            </button>
            {jobs.length > 0 && <span style={{ fontSize: 12, color: '#6b7c93' }}>{jobs.length} jobs found</span>}
          </div>
          {mobOpen && <div style={{ background: 'linear-gradient(180deg, #152233 0%, #0e1a28 100%)', borderBottom: '1px solid #edf1f6', padding: 16 }}>{Sidebar}</div>}

          <div style={{ padding: 20 }}>
            {jobs.length > 0 && !loading && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#042C53', fontFamily: "'Outfit', sans-serif" }}>Matching Jobs &mdash; {usedQuery}</div>
                <div style={{ fontSize: 12, color: '#8fa3b8', marginTop: 2 }}>{jobs.length} live positions found</div>
              </div>
            )}

            {/* Keywords banner — shows extracted profile after analyse-profile runs */}
            {profile && (
              <div style={{ background: '#EEF6FF', border: '1px solid #C3DDF7', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#185FA5', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
                  Profile detected — searching for: <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13 }}>{profile.suggestedQuery}</span>
                </div>
                {profile.skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                    {profile.skills.map(skill => (
                      <span key={skill} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 10, background: '#C3DDF7', color: '#042C53', fontWeight: 600 }}>{skill}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!loading && !analysing && jobs.length === 0 && !error && (
              <div style={{ maxWidth: 560, margin: '48px auto 0', padding: '0 20px' }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: '#042C53', marginBottom: 6 }}>How Smart Job Search works</div>
                <div style={{ fontSize: 13, color: '#8fa3b8', marginBottom: 28, lineHeight: 1.6 }}>Upload your CV and target role — AI does the rest.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { step: '01', icon: '📄', title: hasProfile ? 'CV loaded' : 'Upload your CV', desc: hasProfile ? 'Profile ready to analyse.' : 'Drop your PDF, DOCX or paste CV text in the sidebar.', done: hasProfile },
                    { step: '02', icon: '🎯', title: targetRole ? `Searching for: ${targetRole}` : 'Enter a target role', desc: targetRole ? 'AI will use this as the primary search anchor.' : 'Type the job title you want in the sidebar. Optional with a CV.', done: !!targetRole },
                    { step: '03', icon: '◎', title: 'AI analyses your profile', desc: 'Extracts skills, seniority, industries and builds the best search query.', done: false },
                    { step: '04', icon: '✅', title: 'Live DACH jobs ranked by match', desc: 'Green border = strong match. Amber = partial. Click any job for details.', done: false },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 18px', borderRadius: 12, background: s.done ? '#f0fbf6' : '#fff', border: `1px solid ${s.done ? '#b6ecd8' : '#edf1f6'}`, alignItems: 'flex-start' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: s.done ? '#1D9E75' : '#f0f4f8', border: `2px solid ${s.done ? '#1D9E75' : '#edf1f6'}` }}>
                        {s.done ? '✓' : s.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: s.done ? '#0F6E56' : '#042C53', fontFamily: "'Outfit', sans-serif", marginBottom: 2 }}>{s.title}</div>
                        <div style={{ fontSize: 12, color: s.done ? '#1D9E75' : '#8fa3b8', lineHeight: 1.5 }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#991B1B', marginBottom: 16 }}>
                &#10007; {error}
              </div>
            )}

            {analysing && (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid rgba(29,158,117,0.2)', borderTopColor: '#1D9E75', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <div style={{ fontSize: 15, color: '#1D9E75', fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>Analysing your profile with AI...</div>
                <div style={{ fontSize: 12, color: '#8fa3b8', marginTop: 6 }}>Extracting skills, titles and experience</div>
              </div>
            )}

            {loading && !analysing && (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid rgba(55,138,221,0.2)', borderTopColor: '#378ADD', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <div style={{ fontSize: 15, color: '#378ADD', fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>Searching live jobs...</div>
              </div>
            )}

            {!loading && !analysing && jobs.length > 0 && (
              <div className="jl-main-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {jobs.map(job => <JobCard key={job.job_id} job={job} />)}
                </div>
                <div style={{ position: 'sticky', top: 20 }}>
                  <RightPanel />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SmartJobSearchWrapper() {
  return (
    <Suspense>
      <SmartJobSearchPage />
    </Suspense>
  )
}