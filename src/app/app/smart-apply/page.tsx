'use client'

import { useState, useRef } from 'react'
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
const EXPERIENCE_OPTIONS = [
  'Any level',
  'Junior (0–3 yrs)',
  'Mid (3–8 yrs)',
  'Senior (8–15 yrs)',
  'Director / VP (15+ yrs)',
]

export default function SmartJobSearchPage() {
  const linkedinRef = useRef<HTMLInputElement>(null)
  const cvRef = useRef<HTMLInputElement>(null)

  const [linkedinFileName, setLinkedinFileName] = useState('')
  const [linkedinText, setLinkedinText] = useState('')
  const [cvFileName, setCvFileName] = useState('')
  const [cvText, setCvText] = useState('')

  const [targetRole, setTargetRole] = useState('')
  const [jobTypes, setJobTypes] = useState<JobTypeOption[]>(['Full-time'])
  const [experience, setExperience] = useState('Senior (8–15 yrs)')
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

  function handleLinkedinFile(file: File) {
    setLinkedinFileName(file.name)
    const r = new FileReader()
    r.onload = e => setLinkedinText((e.target?.result as string) ?? '')
    r.readAsText(file)
  }

  function handleCvFile(file: File) {
    setCvFileName(file.name)
    const r = new FileReader()
    r.onload = e => setCvText((e.target?.result as string) ?? '')
    r.readAsText(file)
  }

  function toggleJobType(t: JobTypeOption) {
    setJobTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  function toggleLogged(jobId: string) {
    setLoggedJobs(prev => {
      const next = new Set(prev)
      next.has(jobId) ? next.delete(jobId) : next.add(jobId)
      return next
    })
  }

  function generateMatchChips(job: Job, extractedProfile: Profile | null): { label: string; positive: boolean }[] {
    const chips: { label: string; positive: boolean }[] = []
    const desc = (job.job_description || '').toLowerCase()
    const title = (job.job_title || '').toLowerCase()

    if (extractedProfile) {
      // Match against AI-extracted skills
      const matchedSkills = extractedProfile.skills.filter(skill =>
        desc.includes(skill.toLowerCase()) || title.includes(skill.toLowerCase())
      )
      matchedSkills.slice(0, 3).forEach(skill => {
        chips.push({ label: `${skill} match`, positive: true })
      })

      // Seniority match
      if (extractedProfile.seniority && title.includes(extractedProfile.seniority.toLowerCase())) {
        chips.push({ label: `${extractedProfile.seniority} level`, positive: true })
      }

      // Industry match
      extractedProfile.industries.forEach(ind => {
        if (desc.includes(ind.toLowerCase())) {
          chips.push({ label: ind, positive: true })
        }
      })
    } else {
      // Fallback — basic keyword match from target role
      const roleWords = targetRole.toLowerCase().split(/\s+/)
      if (roleWords.some(w => w.length > 2 && (title.includes(w) || desc.includes(w)))) {
        chips.push({ label: `${targetRole} match`, positive: true })
      }
    }

    // Location match
    const cityLower = location.split(',')[0].toLowerCase()
    if (cityLower && (job.job_city?.toLowerCase().includes(cityLower))) {
      chips.push({ label: 'Location match', positive: true })
    }

    // Salary fit
    if (job.job_min_salary && salaryMin) {
      const min = parseInt(salaryMin.replace(/\D/g, '')) * 1000
      if (!isNaN(min) && job.job_min_salary >= min) {
        chips.push({ label: 'Salary range fits', positive: true })
      }
    }

    // Employment type
    if (job.job_employment_type) {
      const matched = jobTypes.some(t =>
        job.job_employment_type.toLowerCase().includes(t.toLowerCase().replace('-', ''))
      )
      if (matched) chips.push({ label: job.job_employment_type, positive: true })
    }

    return chips
  }

  async function handleFindJobs() {
    if (!targetRole.trim() && !hasProfile) return

    setAnalysing(false)
    setLoading(false)
    setError('')
    setJobs([])
    setSelectedJob(null)
    setTailoredCv('')
    setCoverLetter('')
    setProfile(null)

    let extractedProfile: Profile | null = null
    let searchQuery = targetRole

    // Step 1 — If profile present, analyse it with AI
    if (hasProfile) {
      setAnalysing(true)
      try {
        const res = await fetch('/api/analyse-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            linkedinText,
            cvText,
            targetRole,
            experience,
            jobTypes,
            salaryMin,
            salaryMax,
          }),
        })
        extractedProfile = await res.json()
        setProfile(extractedProfile)
        // Use AI-suggested query, fall back to target role
        searchQuery = extractedProfile?.suggestedQuery || targetRole
      } catch {
        // Non-fatal — fall back to target role
        searchQuery = targetRole
      }
      setAnalysing(false)
    }

    // Step 2 — Search Adzuna with enriched query
    setLoading(true)
    setUsedQuery(searchQuery)

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        location,
        country,
      })
      const res = await fetch(`/api/jobs?${params}`)
      const data = await res.json()

      if (data.error) { setError(data.error); setLoading(false); return }

      // Step 3 — Attach match chips using extracted profile
      const enriched: Job[] = (data.jobs || []).map((job: Job) => ({
        ...job,
        matchChips: generateMatchChips(job, extractedProfile),
      }))

      setJobs(enriched)
    } catch {
      setError('Failed to fetch jobs. Please try again.')
    }
    setLoading(false)
  }

  async function generateCv(job?: Job) {
    const target = job || selectedJob
    if (!target || !cvText) return
    if (job) selectJob(job)
    setCvLoading(true)
    setActiveRight('cv')
    try {
      const res = await fetch('/api/tailor-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, job: target }),
      })
      const data = await res.json()
      setTailoredCv(data.cv || '')
    } catch {
      setTailoredCv('Failed to generate CV. Please try again.')
    }
    setCvLoading(false)
  }

  async function generateCoverLetter(job?: Job) {
    const target = job || selectedJob
    if (!target || !cvText) return
    if (job) selectJob(job)
    setClLoading(true)
    setActiveRight('cl')
    try {
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, job: target }),
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
    setActiveRight('description')
  }

  function downloadText(content: string, filename: string) {
    const b = new Blob([content], { type: 'text/plain' })
    const u = URL.createObjectURL(b)
    const a = document.createElement('a')
    a.href = u; a.download = filename; a.click()
    URL.revokeObjectURL(u)
  }

  function formatPostedDate(dateStr: string) {
    if (!dateStr) return ''
    const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return `${Math.floor(diffDays / 30)}mo ago`
  }

  function formatSalary(job: Job) {
    if (!job.job_min_salary) return null
    return `${job.job_salary_currency || '€'} ${job.job_min_salary.toLocaleString()}${job.job_max_salary ? `–${job.job_max_salary.toLocaleString()}` : ''}`
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 11px', borderRadius: 8,
    border: '1px solid #dce4ef', fontSize: 13,
    fontFamily: "'DM Sans', sans-serif", color: '#1a2332',
    background: '#fff', outline: 'none', boxSizing: 'border-box',
  }

  const secLabel = (text: string) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#8fa3b8', letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 6 }}>
      {text}
    </div>
  )

  function UploadBox({ label, sublabel, fileName, inputRef, onFile, accept }: {
    label: string; sublabel: string; fileName: string
    inputRef: React.RefObject<HTMLInputElement>
    onFile: (f: File) => void; accept: string
  }) {
    return (
      <div>
        {secLabel(label)}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `1.5px ${fileName ? 'solid #1D9E75' : 'dashed #c8d6e5'}`,
            borderRadius: 10, padding: '11px 14px',
            cursor: 'pointer', background: fileName ? '#f0fbf6' : '#fafbfd',
            transition: 'all 0.15s',
          }}
        >
          <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
          <div style={{ fontSize: 12, fontWeight: 600, color: fileName ? '#0F6E56' : '#1a2332', marginBottom: 1 }}>
            {fileName || sublabel}
          </div>
          <div style={{ fontSize: 11, color: fileName ? '#0F6E56' : '#8fa3b8' }}>
            {fileName ? 'Ready ✓' : 'Click to upload · PDF or DOCX'}
          </div>
        </div>
      </div>
    )
  }

  // ─── Profile summary card (shown after AI analysis) ──────────────────
  function ProfileCard() {
    if (!profile || (!profile.skills.length && !profile.summary)) return null
    return (
      <div style={{ background: '#f0fbf6', border: '1px solid #b6ecd8', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#0F6E56', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>
          ✓ Profile Analysed
        </div>
        {profile.summary && (
          <div style={{ fontSize: 12, color: '#1a2332', marginBottom: 8, lineHeight: 1.5 }}>
            {profile.summary}
          </div>
        )}
        {profile.skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {profile.skills.map((s, i) => (
              <span key={i} style={{ fontSize: 11, background: '#fff', border: '1px solid #b6ecd8', color: '#0F6E56', padding: '2px 8px', borderRadius: 6 }}>
                {s}
              </span>
            ))}
          </div>
        )}
        {profile.suggestedQuery && profile.suggestedQuery !== targetRole && (
          <div style={{ fontSize: 11, color: '#6b7c93', marginTop: 8 }}>
            Searched for: <strong style={{ color: '#042C53' }}>"{profile.suggestedQuery}"</strong>
          </div>
        )}
      </div>
    )
  }

  // ─── Sidebar ─────────────────────────────────────────────────────────
  const Sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <UploadBox
        label="LinkedIn PDF"
        sublabel="Export from LinkedIn → Save to PDF"
        fileName={linkedinFileName}
        inputRef={linkedinRef}
        onFile={handleLinkedinFile}
        accept=".pdf,.txt"
      />

      <UploadBox
        label="CV / Resume"
        sublabel="Your CV — tailored per job automatically"
        fileName={cvFileName}
        inputRef={cvRef}
        onFile={handleCvFile}
        accept=".pdf,.txt,.doc,.docx"
      />

      <div style={{ height: 1, background: '#edf1f6' }} />

      <div>
        {secLabel('Target Role')}
        <input
          value={targetRole}
          onChange={e => setTargetRole(e.target.value)}
          placeholder={hasProfile ? 'Optional — AI will suggest from profile' : 'e.g. Product Owner, SAP CX'}
          onKeyDown={e => e.key === 'Enter' && handleFindJobs()}
          style={inp}
        />
        {hasProfile && !targetRole && (
          <div style={{ fontSize: 11, color: '#0F6E56', marginTop: 4 }}>
            ✓ AI will extract best role from your profile
          </div>
        )}
      </div>

      <div>
        {secLabel('Job Type')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {JOB_TYPE_OPTIONS.map(t => (
            <button key={t} onClick={() => toggleJobType(t)} style={{
              fontSize: 12, padding: '5px 12px', borderRadius: 20, border: 'none',
              background: jobTypes.includes(t) ? '#042C53' : '#f0f4f8',
              color: jobTypes.includes(t) ? '#E6F1FB' : '#6b7c93',
              cursor: 'pointer', fontFamily: 'inherit',
              fontWeight: jobTypes.includes(t) ? 600 : 400,
              transition: 'all 0.15s',
            }}>
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
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country or leave blank for all" style={inp} />
      </div>

      <div>
        {secLabel('Country')}
        <select value={country} onChange={e => setCountry(e.target.value)} style={inp}>
          <option value="de">🇩🇪 Germany</option>
          <option value="ch">🇨🇭 Switzerland</option>
          <option value="at">🇦🇹 Austria</option>
          <option value="gb">🇬🇧 United Kingdom</option>
          <option value="us">🇺🇸 United States</option>
        </select>
      </div>

      <div>
        {secLabel('Salary (Gross/Yr)')}
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="120k" style={{ ...inp, width: '50%' }} />
          <input value={salaryMax} onChange={e => setSalaryMax(e.target.value)} placeholder="160k €" style={{ ...inp, width: '50%' }} />
        </div>
      </div>

      <div style={{ height: 1, background: '#edf1f6' }} />

      <button
        disabled={(!targetRole.trim() && !hasProfile) || analysing || loading}
        onClick={handleFindJobs}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
          background: (targetRole.trim() || hasProfile) && !analysing && !loading ? '#042C53' : '#dce4ef',
          color: (targetRole.trim() || hasProfile) && !analysing && !loading ? '#E6F1FB' : '#8fa3b8',
          fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700,
          cursor: (targetRole.trim() || hasProfile) && !analysing && !loading ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'background 0.15s',
        }}
      >
        {analysing ? (
          <><span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Analysing Profile...</>
        ) : loading ? (
          <><span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Searching Jobs...</>
        ) : hasProfile ? 'Analyze & Find Jobs ↗' : 'Find Matching Jobs ↗'}
      </button>

      {jobs.length > 0 && !loading && (
        <div style={{ fontSize: 12, color: '#6b7c93', textAlign: 'center' }}>
          <span style={{ fontWeight: 600, color: '#042C53' }}>{jobs.length}</span> jobs found · sorted by match %
        </div>
      )}
    </div>
  )

  // ─── Match chips ──────────────────────────────────────────────────────
  function MatchChips({ chips }: { chips: { label: string; positive: boolean }[] }) {
    if (!chips || chips.length === 0) return null
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {chips.map((chip, i) => (
          <span key={i} style={{
            fontSize: 11, padding: '3px 9px', borderRadius: 6, fontWeight: 500,
            background: chip.positive ? '#f0fbf6' : '#FFF8EC',
            color: chip.positive ? '#0F6E56' : '#BA7517',
            border: `1px solid ${chip.positive ? '#b6ecd8' : '#fcd98a'}`,
          }}>
            {chip.positive ? '✓ ' : '~ '}{chip.label}
          </span>
        ))}
      </div>
    )
  }

  // ─── Job card ─────────────────────────────────────────────────────────
  function JobCard({ job }: { job: Job }) {
    const isSelected = selectedJob?.job_id === job.job_id
    const isLogged = loggedJobs.has(job.job_id)
    const salary = formatSalary(job)

    return (
      <div style={{
        background: '#fff',
        border: `1.5px solid ${isSelected ? '#378ADD' : '#edf1f6'}`,
        borderRadius: 12, overflow: 'hidden',
        boxShadow: isSelected ? '0 0 0 3px rgba(55,138,221,0.10)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>
        <div onClick={() => selectJob(job)} style={{ padding: '14px 16px', cursor: 'pointer' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#042C53', marginBottom: 3 }}>
            {job.job_title}
          </div>
          <div style={{ fontSize: 12, color: '#6b7c93', marginBottom: 8, lineHeight: 1.5 }}>
            {[
              job.employer_name,
              [job.job_city, job.job_country].filter(Boolean).join(', '),
              job.job_employment_type,
              salary,
              job.job_posted_at_datetime_utc ? `Posted ${formatPostedDate(job.job_posted_at_datetime_utc)}` : null,
            ].filter(Boolean).join(' · ')}
          </div>
          {job.matchChips && <MatchChips chips={job.matchChips} />}
        </div>

        <div style={{ display: 'flex', gap: 6, padding: '9px 16px', borderTop: '1px solid #f3f6fa', background: '#fafbfd', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => generateCv(job)} disabled={!cvText} style={{
            fontSize: 11, padding: '5px 12px', borderRadius: 7, border: 'none',
            background: cvText ? '#042C53' : '#e8ecf1',
            color: cvText ? '#E6F1FB' : '#8fa3b8',
            cursor: cvText ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', fontWeight: 600,
          }}>
            Build CV →
          </button>
          <button onClick={() => generateCoverLetter(job)} disabled={!cvText} style={{
            fontSize: 11, padding: '5px 12px', borderRadius: 7,
            border: '1px solid #dce4ef', background: '#fff',
            color: cvText ? '#185FA5' : '#8fa3b8',
            cursor: cvText ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', fontWeight: 500,
          }}>
            Cover Letter →
          </button>
          <button onClick={() => toggleLogged(job.job_id)} style={{
            fontSize: 11, padding: '5px 12px', borderRadius: 7,
            border: `1px solid ${isLogged ? '#b6ecd8' : '#dce4ef'}`,
            background: isLogged ? '#f0fbf6' : '#fff',
            color: isLogged ? '#0F6E56' : '#6b7c93',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
          }}>
            {isLogged ? '✓ Applied' : '✓ Log applied'}
          </button>
          <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 11, padding: '5px 12px', borderRadius: 7,
            border: '1px solid #dce4ef', background: '#fff',
            color: '#6b7c93', textDecoration: 'none',
            fontFamily: 'inherit', fontWeight: 500, marginLeft: 'auto',
          }}>
            View job
          </a>
        </div>
      </div>
    )
  }

  // ─── Right detail panel ───────────────────────────────────────────────
  function RightPanel() {
    if (!selectedJob) {
      return (
        <div style={{ background: '#fff', border: '1.5px solid #edf1f6', borderRadius: 14, padding: '60px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.2 }}>👆</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2332', marginBottom: 6 }}>Select a job</div>
          <div style={{ fontSize: 13, color: '#8fa3b8', lineHeight: 1.6 }}>
            Click any job card to view details,<br />build your CV, or write a cover letter.
          </div>
        </div>
      )
    }

    const salary = formatSalary(selectedJob)
    const tabs = [
      { key: 'description' as RightTab, label: 'Job Details' },
      { key: 'cv' as RightTab, label: tailoredCv || cvLoading ? '✓ Tailored CV' : 'Build CV' },
      { key: 'cl' as RightTab, label: coverLetter || clLoading ? '✓ Cover Letter' : 'Cover Letter' },
    ]

    return (
      <div style={{ background: '#fff', border: '1.5px solid #edf1f6', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #edf1f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#042C53', marginBottom: 3 }}>{selectedJob.job_title}</div>
              <div style={{ fontSize: 13, color: '#6b7c93' }}>
                {[selectedJob.employer_name, [selectedJob.job_city, selectedJob.job_country].filter(Boolean).join(', '), salary].filter(Boolean).join(' · ')}
              </div>
            </div>
            <a href={selectedJob.job_apply_link} target="_blank" rel="noopener noreferrer" style={{
              fontSize: 12, padding: '8px 16px', borderRadius: 8,
              background: '#042C53', color: '#E6F1FB', textDecoration: 'none',
              fontWeight: 700, flexShrink: 0, fontFamily: "'Outfit', sans-serif",
            }}>
              Apply Now →
            </a>
          </div>
          {selectedJob.matchChips && (
            <div style={{ marginTop: 10 }}><MatchChips chips={selectedJob.matchChips} /></div>
          )}
          {!cvText && (
            <div style={{ fontSize: 11, color: '#BA7517', marginTop: 10, padding: '5px 8px', background: '#FFF8EC', borderRadius: 6, display: 'inline-block' }}>
              ⚠ Upload your CV in the sidebar to enable AI tailoring
            </div>
          )}
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #edf1f6', background: '#fafbfd' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveRight(tab.key)} style={{
              fontSize: 12, padding: '10px 18px', border: 'none', background: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
              color: activeRight === tab.key ? '#042C53' : '#6b7c93',
              borderBottom: activeRight === tab.key ? '2px solid #378ADD' : '2px solid transparent',
              fontWeight: activeRight === tab.key ? 700 : 400,
              transition: 'color 0.15s',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 20, maxHeight: 500, overflowY: 'auto' }}>

          {activeRight === 'description' && (
            <div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {selectedJob.job_employment_type && (
                  <span style={{ fontSize: 12, background: '#E6F1FB', color: '#185FA5', padding: '4px 10px', borderRadius: 8, fontWeight: 500 }}>{selectedJob.job_employment_type}</span>
                )}
                {salary && (
                  <span style={{ fontSize: 12, background: '#f0fbf6', color: '#0F6E56', padding: '4px 10px', borderRadius: 8, fontWeight: 500 }}>{salary}</span>
                )}
                {selectedJob.job_posted_at_datetime_utc && (
                  <span style={{ fontSize: 12, background: '#f0f4f8', color: '#6b7c93', padding: '4px 10px', borderRadius: 8 }}>
                    Posted {formatPostedDate(selectedJob.job_posted_at_datetime_utc)}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#042C53', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Description</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                {selectedJob.job_description?.slice(0, 1400)}
                {(selectedJob.job_description?.length ?? 0) > 1400 && <span style={{ color: '#8fa3b8' }}>…</span>}
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a href={selectedJob.job_apply_link} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, padding: '9px 20px', borderRadius: 8, background: '#042C53', color: '#E6F1FB', textDecoration: 'none', fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
                  View Full Posting & Apply →
                </a>
                <button onClick={() => toggleLogged(selectedJob.job_id)} style={{
                  fontSize: 13, padding: '9px 16px', borderRadius: 8,
                  border: `1px solid ${loggedJobs.has(selectedJob.job_id) ? '#b6ecd8' : '#dce4ef'}`,
                  background: loggedJobs.has(selectedJob.job_id) ? '#f0fbf6' : '#fff',
                  color: loggedJobs.has(selectedJob.job_id) ? '#0F6E56' : '#6b7c93',
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
                }}>
                  {loggedJobs.has(selectedJob.job_id) ? '✓ Applied' : '✓ Log applied'}
                </button>
              </div>
            </div>
          )}

          {activeRight === 'cv' && (
            cvLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #edf1f6', borderTopColor: '#378ADD', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
                <div style={{ fontSize: 13, color: '#6b7c93' }}>Tailoring your CV for this role...</div>
              </div>
            ) : tailoredCv ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0F6E56' }}>✓ CV tailored for {selectedJob.employer_name}</div>
                  <button onClick={() => downloadText(tailoredCv, `CV_${selectedJob.employer_name}.txt`)}
                    style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: '#042C53', color: '#E6F1FB', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                    ↓ Download
                  </button>
                </div>
                <pre style={{ fontSize: 12, color: '#1a2332', lineHeight: 1.75, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif", background: '#fafbfd', borderRadius: 8, padding: 16, margin: 0, border: '1px solid #edf1f6' }}>
                  {tailoredCv}
                </pre>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.3 }}>⚡</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2332', marginBottom: 6 }}>
                  {cvText ? 'Ready to tailor your CV' : 'No CV uploaded yet'}
                </div>
                <div style={{ fontSize: 13, color: '#8fa3b8', lineHeight: 1.6, marginBottom: 16 }}>
                  {cvText ? 'Click below to generate a role-specific CV' : 'Upload your CV in the left sidebar first'}
                </div>
                {cvText && (
                  <button onClick={() => generateCv()}
                    style={{ fontSize: 13, padding: '9px 20px', borderRadius: 8, background: '#042C53', color: '#E6F1FB', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
                    ⚡ Build Tailored CV
                  </button>
                )}
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
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0F6E56' }}>✓ Cover letter for {selectedJob.employer_name}</div>
                  <button onClick={() => downloadText(coverLetter, `CoverLetter_${selectedJob.employer_name}.txt`)}
                    style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: '#042C53', color: '#E6F1FB', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                    ↓ Download
                  </button>
                </div>
                <pre style={{ fontSize: 12, color: '#1a2332', lineHeight: 1.75, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif", background: '#fafbfd', borderRadius: 8, padding: 16, margin: 0, border: '1px solid #edf1f6' }}>
                  {coverLetter}
                </pre>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.3 }}>✉</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2332', marginBottom: 6 }}>
                  {cvText ? 'Ready to write your cover letter' : 'No CV uploaded yet'}
                </div>
                <div style={{ fontSize: 13, color: '#8fa3b8', lineHeight: 1.6, marginBottom: 16 }}>
                  {cvText ? 'Click below to generate a personalised cover letter' : 'Upload your CV in the left sidebar first'}
                </div>
                {cvText && (
                  <button onClick={() => generateCoverLetter()}
                    style={{ fontSize: 13, padding: '9px 20px', borderRadius: 8, background: '#042C53', color: '#E6F1FB', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
                    ✉ Write Cover Letter
                  </button>
                )}
              </div>
            )
          )}
        </div>
      </div>
    )
  }

  // ─── Page render ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        .jl-dsb { display: flex !important; }
        .jl-mbtn { display: none !important; }
        .jl-main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
        @media (max-width: 1100px) { .jl-main-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 768px) {
          .jl-dsb { display: none !important; }
          .jl-mbtn { display: block !important; }
          .jl-main-grid { grid-template-columns: 1fr !important; }
        }
        input:focus, select:focus { border-color: #378ADD !important; box-shadow: 0 0 0 3px rgba(55,138,221,0.08); }
      `}</style>

      <Navbar />

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 52px)' }}>

        <div className="jl-dsb" style={{
          width: 260, flexShrink: 0, background: '#fff',
          borderRight: '1px solid #edf1f6', padding: '20px 16px',
          flexDirection: 'column', overflowY: 'auto',
        }}>
          {Sidebar}
        </div>

        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>

          <div className="jl-mbtn" style={{ padding: '10px 16px', background: '#fff', borderBottom: '1px solid #edf1f6', display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => setMobOpen(o => !o)} style={{ background: '#042C53', color: '#E6F1FB', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {mobOpen ? '✕ Close' : '⚙ Search Settings'}
            </button>
            {jobs.length > 0 && <span style={{ fontSize: 12, color: '#6b7c93' }}>{jobs.length} jobs found</span>}
          </div>
          {mobOpen && (
            <div style={{ background: '#fff', borderBottom: '1px solid #edf1f6', padding: 16 }}>
              {Sidebar}
            </div>
          )}

          <div style={{ padding: 20 }}>

            {jobs.length > 0 && !loading && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#042C53', fontFamily: "'Outfit', sans-serif" }}>
                  Matching Jobs — {usedQuery}
                </div>
                <div style={{ fontSize: 12, color: '#8fa3b8', marginTop: 2 }}>
                  {jobs.length} jobs found · sorted by match %
                </div>
                <ProfileCard />
              </div>
            )}

            {!loading && !analysing && jobs.length === 0 && !error && (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.12 }}>🔍</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2332', fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>
                  Find your next role
                </div>
                <div style={{ fontSize: 13, color: '#8fa3b8', lineHeight: 1.8, maxWidth: 360, margin: '0 auto' }}>
                  Upload your LinkedIn PDF or CV — AI will extract your profile and find the best matching jobs automatically.
                  Or just type a target role and click search.
                </div>
                {!hasProfile && (
                  <div style={{ marginTop: 20, fontSize: 12, color: '#BA7517', background: '#FFF8EC', borderRadius: 8, padding: '10px 16px', display: 'inline-block' }}>
                    💡 Upload LinkedIn PDF or CV for AI-powered job matching
                  </div>
                )}
              </div>
            )}

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#991B1B', marginBottom: 16 }}>
                ❌ {error}
              </div>
            )}

            {analysing && (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #edf1f6', borderTopColor: '#1D9E75', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <div style={{ fontSize: 14, color: '#0F6E56', fontWeight: 500 }}>Analysing your profile with AI...</div>
                <div style={{ fontSize: 12, color: '#8fa3b8', marginTop: 6 }}>Extracting skills, titles and experience</div>
              </div>
            )}

            {loading && !analysing && (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #edf1f6', borderTopColor: '#378ADD', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <div style={{ fontSize: 14, color: '#6b7c93' }}>Searching live jobs...</div>
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
