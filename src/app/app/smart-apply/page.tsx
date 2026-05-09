'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
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
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')

  const [profile, setProfile] = useState<Profile | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [usedQuery, setUsedQuery] = useState('')

  const [activeRight, setActiveRight] = useState<RightTab>('description')
  const [cvLoading, setCvLoading] = useState(false)
  const [clLoading, setClLoading] = useState(false)
  const [tailoredCv, setTailoredCv] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [loggedJobs, setLoggedJobs] = useState<Set<string>>(new Set())
  const [mobOpen, setMobOpen] = useState(false)

  const hasProfile = !!(linkedinText || cvText)

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
    setLocation('Stuttgart, Germany'); setCountry('de'); setSalaryMin(''); setSalaryMax('')
    setJobs([]); setSelectedJob(null); setProfile(null); setError(''); setUsedQuery('')
    setTailoredCv(''); setCoverLetter(''); setLoggedJobs(new Set())
    if (linkedinRef.current) linkedinRef.current.value = ''
    if (cvRef.current) cvRef.current.value = ''
    sessionStorage.removeItem('jl_jobs'); sessionStorage.removeItem('jl_used_query')
    sessionStorage.removeItem('jl_sjs_cv_text'); sessionStorage.removeItem('jl_sjs_cv_name')
    sessionStorage.removeItem('jl_sjs_target_role'); sessionStorage.removeItem('jl_cv_text')
    sessionStorage.removeItem('jl_target_role')
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
    if (job.job_min_salary && salaryMin) {
      const min = parseInt(salaryMin.replace(/\D/g, '')) * 1000
      if (!isNaN(min) && job.job_min_salary >= min) chips.push({ label: 'Salary fits', positive: true })
    }
    if (job.job_employment_type && jobTypes.some(t => job.job_employment_type.toLowerCase().includes(t.toLowerCase().replace('-', '')))) {
      chips.push({ label: job.job_employment_type, positive: true })
    }
    return chips
  }

  async function handleFindJobs() {
    if (!targetRole.trim() && !hasProfile) return
    setAnalysing(false); setLoading(false); setError(''); setJobs([]); setSelectedJob(null); setTailoredCv(''); setCoverLetter(''); setProfile(null)
    let extractedProfile: Profile | null = null
    let searchQuery = targetRole
    if (hasProfile) {
      setAnalysing(true)
      try {
        const res = await fetch('/api/analyse-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ linkedinText, cvText, targetRole, experience, jobTypes, salaryMin, salaryMax }) })
        extractedProfile = await res.json()
        setProfile(extractedProfile)
        searchQuery = extractedProfile?.suggestedQuery || targetRole
      } catch { searchQuery = targetRole }
      setAnalysing(false)
    }
    setLoading(true); setUsedQuery(searchQuery)
    try {
      const params = new URLSearchParams({ q: searchQuery, location, country })
      const res = await fetch(`/api/jobs?${params}`)
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setJobs((data.jobs || []).map((job: Job) => ({ ...job, matchChips: generateMatchChips(job, extractedProfile) })))
    } catch { setError('Failed to fetch jobs. Please try again.') }
    setLoading(false)
  }

  async function generateCv(job?: Job) {
    const target = job || selectedJob; if (!target || !cvText) return
    if (job) selectJob(job); setCvLoading(true); setActiveRight('cv')
    try {
      const res = await fetch('/api/tailor-cv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cvText, job: target }) })
      const data = await res.json(); setTailoredCv(data.cv || '')
    } catch { setTailoredCv('Failed to generate CV.') }
    setCvLoading(false)
  }

  async function generateCoverLetter(job?: Job) {
    const target = job || selectedJob; if (!target || !cvText) return
    if (job) selectJob(job); setClLoading(true); setActiveRight('cl')
    try {
      const res = await fetch('/api/cover-letter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cvText, job: target }) })
      const data = await res.json(); setCoverLetter(data.coverLetter || '')
    } catch { setCoverLetter('Failed to generate cover letter.') }
    setClLoading(false)
  }

  function selectJob(job: Job) { setSelectedJob(job); setTailoredCv(''); setCoverLetter(''); setActiveRight('description') }

  function downloadText(content: string, filename: string) {
    const b = new Blob([content], { type: 'text/plain' }); const u = URL.createObjectURL(b)
    const a = document.createElement('a'); a.href = u; a.download = filename; a.click(); URL.revokeObjectURL(u)
  }

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

  function UploadBox({ label, sublabel, fileName, inputRef, onFile, onClear, accept, icon }: {
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
            {chip.positive ? 'âœ“ ' : '~ '}{chip.label}
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
            {matchCount > 0 && (
              <div style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: matchCount >= 3 ? '#f0fbf6' : '#fffbeb', color: matchCount >= 3 ? '#1D9E75' : '#92400e', fontWeight: 700, flexShrink: 0, border: `1px solid ${matchCount >= 3 ? '#b6ecd8' : '#fcd98a'}` }}>
                {matchCount >= 3 ? 'Strong match' : 'Partial match'}
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#6b7c93', marginBottom: 8 }}>
            {[job.employer_name, [job.job_city, job.job_country].filter(Boolean).join(', '), salary, job.job_posted_at_datetime_utc ? formatPostedDate(job.job_posted_at_datetime_utc) : null].filter(Boolean).join(' Â· ')}
          </div>
          {job.matchChips && <MatchChips chips={job.matchChips} />}
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '9px 16px', borderTop: '1px solid #f3f6fa', background: '#fafbfd', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => generateCv(job)} disabled={!cvText} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, border: 'none', background: cvText ? 'linear-gradient(135deg, #042C53, #185FA5)' : '#e8ecf1', color: cvText ? '#fff' : '#8fa3b8', cursor: cvText ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: 600 }}>
            Build CV
          </button>
          <button onClick={() => generateCoverLetter(job)} disabled={!cvText} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, border: '1px solid #dce4ef', background: '#fff', color: cvText ? '#185FA5' : '#8fa3b8', cursor: cvText ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: 500 }}>
            Cover Letter
          </button>
          <button onClick={() => toggleLogged(job.job_id)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, border: `1px solid ${isLogged ? '#b6ecd8' : '#dce4ef'}`, background: isLogged ? '#f0fbf6' : '#fff', color: isLogged ? '#1D9E75' : '#6b7c93', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
            {isLogged ? 'âœ“ Applied' : 'Log applied'}
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
      return (
        <div style={{ background: '#fff', border: '1.5px solid #edf1f6', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #042C53, #073d6e)', padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>ðŸŽ¯</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", marginBottom: 6 }}>Select a job</div>
            <div style={{ fontSize: 13, color: '#85B7EB', lineHeight: 1.6 }}>Click any job card to view details, build your CV, or write a cover letter.</div>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: '#8fa3b8', textAlign: 'center', lineHeight: 1.7 }}>
              Jobs with a <span style={{ color: '#1D9E75', fontWeight: 600 }}>green border</span> are strong matches.
              <br /><span style={{ color: '#F59E0B', fontWeight: 600 }}>Amber border</span> means partial match.
            </div>
          </div>
        </div>
      )
    }

    const salary = formatSalary(selectedJob)
    const tabs = [
      { key: 'description' as RightTab, label: 'Job Details' },
      { key: 'cv' as RightTab, label: tailoredCv || cvLoading ? 'âœ“ Tailored CV' : 'Build CV' },
      { key: 'cl' as RightTab, label: coverLetter || clLoading ? 'âœ“ Cover Letter' : 'Cover Letter' },
    ]

    return (
      <div style={{ background: '#fff', border: '1.5px solid #edf1f6', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(4,44,83,0.08)' }}>
        {/* Gradient header */}
        <div style={{ background: 'linear-gradient(135deg, #042C53 0%, #073d6e 100%)', padding: '20px 20px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4, fontFamily: "'Outfit', sans-serif" }}>{selectedJob.job_title}</div>
              <div style={{ fontSize: 12, color: '#85B7EB' }}>
                {[selectedJob.employer_name, [selectedJob.job_city, selectedJob.job_country].filter(Boolean).join(', '), salary].filter(Boolean).join(' Â· ')}
              </div>
            </div>
            <a href={selectedJob.job_apply_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, padding: '8px 16px', borderRadius: 8, background: '#378ADD', color: '#fff', textDecoration: 'none', fontWeight: 700, flexShrink: 0, fontFamily: "'Outfit', sans-serif" }}>
              Apply Now â†’
            </a>
          </div>
          {selectedJob.matchChips && selectedJob.matchChips.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {selectedJob.matchChips.map((chip, i) => (
                <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, fontWeight: 600, background: chip.positive ? 'rgba(74,222,128,0.2)' : 'rgba(245,158,11,0.2)', color: chip.positive ? '#4ade80' : '#fcd34d', border: `1px solid ${chip.positive ? 'rgba(74,222,128,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                  {chip.positive ? 'âœ“ ' : '~ '}{chip.label}
                </span>
              ))}
            </div>
          )}
          {!cvText && (
            <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 10, padding: '5px 10px', background: 'rgba(251,191,36,0.15)', borderRadius: 6, display: 'inline-block', border: '1px solid rgba(251,191,36,0.3)' }}>
              âš  Upload CV to enable AI tailoring
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
                  View Full Posting & Apply â†’
                </a>
                <button onClick={() => toggleLogged(selectedJob.job_id)} style={{ fontSize: 13, padding: '9px 16px', borderRadius: 8, border: `1px solid ${loggedJobs.has(selectedJob.job_id) ? '#b6ecd8' : '#dce4ef'}`, background: loggedJobs.has(selectedJob.job_id) ? '#f0fbf6' : '#fff', color: loggedJobs.has(selectedJob.job_id) ? '#1D9E75' : '#6b7c93', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                  {loggedJobs.has(selectedJob.job_id) ? 'âœ“ Applied' : 'Log applied'}
                </button>
              </div>
            </div>
          )}

          {activeRight === 'cv' && (
            cvLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #edf1f6', borderTopColor: '#378ADD', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
                <div style={{ fontSize: 13, color: '#6b7c93' }}>Tailoring your CV...</div>
              </div>
            ) : tailoredCv ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1D9E75' }}>âœ“ CV tailored for {selectedJob.employer_name}</div>
                  <button onClick={() => downloadText(tailoredCv, `CV_${selectedJob.employer_name}.txt`)} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: 'linear-gradient(135deg, #042C53, #185FA5)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                    â†“ Download
                  </button>
                </div>
                <pre style={{ fontSize: 12, color: '#1a2332', lineHeight: 1.75, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif", background: '#fafbfd', borderRadius: 10, padding: 16, margin: 0, border: '1px solid #edf1f6' }}>{tailoredCv}</pre>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #E6F1FB, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 14px' }}>âš¡</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2332', marginBottom: 6 }}>{cvText ? 'Ready to tailor your CV' : 'No CV uploaded yet'}</div>
                <div style={{ fontSize: 13, color: '#8fa3b8', lineHeight: 1.6, marginBottom: 16 }}>{cvText ? 'Click below to generate a role-specific CV' : 'Upload your CV in the left sidebar first'}</div>
                {cvText && <button onClick={() => generateCv()} style={{ fontSize: 13, padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg, #042C53, #185FA5)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>Build Tailored CV</button>}
              </div>
            )
          )}

          {activeRight === 'cl' && (
            clLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #edf1f6', borderTopColor: '#378ADD', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
                <div style={{ fontSize: 13, color: '#6b7c93' }}>Writing your cover letter...</div>
              </div>
            ) : coverLetter ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1D9E75' }}>âœ“ Cover letter for {selectedJob.employer_name}</div>
                  <button onClick={() => downloadText(coverLetter, `CoverLetter_${selectedJob.employer_name}.txt`)} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: 'linear-gradient(135deg, #042C53, #185FA5)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                    â†“ Download
                  </button>
                </div>
                <pre style={{ fontSize: 12, color: '#1a2332', lineHeight: 1.75, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif", background: '#fafbfd', borderRadius: 10, padding: 16, margin: 0, border: '1px solid #edf1f6' }}>{coverLetter}</pre>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #FFF8EC, #fef3c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 14px' }}>âœ‰</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2332', marginBottom: 6 }}>{cvText ? 'Ready to write your cover letter' : 'No CV uploaded yet'}</div>
                <div style={{ fontSize: 13, color: '#8fa3b8', lineHeight: 1.6, marginBottom: 16 }}>{cvText ? 'Click below to generate a personalised cover letter' : 'Upload your CV in the left sidebar first'}</div>
                {cvText && <button onClick={() => generateCoverLetter()} style={{ fontSize: 13, padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg, #042C53, #185FA5)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>Write Cover Letter</button>}
              </div>
            )
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
          âœ“ CV carried over from Career Scan
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
        {secLabel('Salary (Gross/Yr)')}
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="120k" style={{ ...inp, width: '50%' }} />
          <input value={salaryMax} onChange={e => setSalaryMax(e.target.value)} placeholder="160k" style={{ ...inp, width: '50%' }} />
        </div>
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
        <div className="jl-dsb" style={{ width: 270, flexShrink: 0, background: 'linear-gradient(180deg, #042C53 0%, #073d6e 100%)', padding: '20px 16px', flexDirection: 'column', overflowY: 'auto' }}>
          {Sidebar}
        </div>

        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          <div className="jl-mbtn" style={{ padding: '10px 16px', background: '#fff', borderBottom: '1px solid #edf1f6', display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => setMobOpen(o => !o)} style={{ background: '#042C53', color: '#E6F1FB', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {mobOpen ? 'Close' : 'Search Settings'}
            </button>
            {jobs.length > 0 && <span style={{ fontSize: 12, color: '#6b7c93' }}>{jobs.length} jobs found</span>}
          </div>
          {mobOpen && <div style={{ background: 'linear-gradient(180deg, #042C53 0%, #073d6e 100%)', borderBottom: '1px solid #edf1f6', padding: 16 }}>{Sidebar}</div>}

          <div style={{ padding: 20 }}>
            {jobs.length > 0 && !loading && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#042C53', fontFamily: "'Outfit', sans-serif" }}>Matching Jobs â€” {usedQuery}</div>
                <div style={{ fontSize: 12, color: '#8fa3b8', marginTop: 2 }}>{jobs.length} live positions found</div>
              </div>
            )}

            {!loading && !analysing && jobs.length === 0 && !error && (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #E6F1FB, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>ðŸ”</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1a2332', fontFamily: "'Outfit', sans-serif", marginBottom: 10 }}>Find your next role</div>
                <div style={{ fontSize: 14, color: '#8fa3b8', lineHeight: 1.8, maxWidth: 380, margin: '0 auto' }}>
                  Upload your LinkedIn PDF or CV â€” AI will extract your profile and find the best matching jobs automatically.
                </div>
                {carriedOver && (
                  <div style={{ marginTop: 16, fontSize: 13, color: '#1D9E75', background: '#f0fbf6', borderRadius: 10, padding: '10px 20px', display: 'inline-block', border: '1px solid #b6ecd8' }}>
                    âœ“ CV from Career Scan is loaded â€” click Find Matching Jobs
                  </div>
                )}
              </div>
            )}

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#991B1B', marginBottom: 16 }}>
                âŒ {error}
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