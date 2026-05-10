'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'

type Template = 'modern' | 'executive' | 'minimal' | 'technical'
type Tone = 'professional' | 'concise' | 'detailed'
type Pages = '1' | '2'
type Lang = 'EN' | 'DE'

const TEMPLATES: { id: Template; label: string }[] = [
  { id: 'modern', label: 'Modern' },
  { id: 'executive', label: 'Executive' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'technical', label: 'Technical' },
]

const TemplateThumb = ({ id, selected, onClick }: { id: Template; selected: boolean; onClick: () => void }) => {
  const thumbs: Record<Template, React.ReactElement> = {
    modern: (
      <div style={{ padding: 10, height: 90, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ height: 10, background: '#042C53', borderRadius: 2 }} />
        <div style={{ height: 6, background: '#dde4ee', borderRadius: 2, width: '70%' }} />
        <div style={{ height: 6, background: '#dde4ee', borderRadius: 2, width: '50%' }} />
        <div style={{ height: 6, background: '#edf1f6', borderRadius: 2, marginTop: 4 }} />
        <div style={{ height: 6, background: '#edf1f6', borderRadius: 2, width: '80%' }} />
      </div>
    ),
    executive: (
      <div style={{ height: 90, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#042C53', padding: '10px', flex: '0 0 40px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ height: 7, background: 'rgba(255,255,255,0.8)', borderRadius: 2, width: '80%' }} />
          <div style={{ height: 5, background: 'rgba(255,255,255,0.4)', borderRadius: 2, width: '60%' }} />
        </div>
        <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ height: 5, background: '#dde4ee', borderRadius: 2 }} />
          <div style={{ height: 5, background: '#dde4ee', borderRadius: 2, width: '70%' }} />
        </div>
      </div>
    ),
    minimal: (
      <div style={{ padding: 10, height: 90, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ height: 7, background: '#1a2332', borderRadius: 2, width: '60%' }} />
        <div style={{ height: 1, background: '#dde4ee' }} />
        <div style={{ height: 5, background: '#edf1f6', borderRadius: 2 }} />
        <div style={{ height: 5, background: '#edf1f6', borderRadius: 2, width: '80%' }} />
        <div style={{ height: 5, background: '#edf1f6', borderRadius: 2, width: '60%' }} />
      </div>
    ),
    technical: (
      <div style={{ padding: 10, height: 90, display: 'flex', gap: 6 }}>
        <div style={{ width: 28, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#378ADD' }} />
          <div style={{ height: 4, background: '#dde4ee', borderRadius: 2 }} />
          <div style={{ height: 4, background: '#dde4ee', borderRadius: 2 }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ height: 7, background: '#1a2332', borderRadius: 2, width: '80%' }} />
          <div style={{ height: 5, background: '#dde4ee', borderRadius: 2 }} />
          <div style={{ height: 5, background: '#dde4ee', borderRadius: 2, width: '70%' }} />
        </div>
      </div>
    ),
  }
  return (
    <div onClick={onClick} style={{ border: `2px solid ${selected ? '#042C53' : '#dde4ee'}`, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: '#fff', transition: 'all 0.15s', flex: '0 0 180px' }}>
      {thumbs[id]}
      <div style={{ textAlign: 'center', fontSize: 11, color: selected ? '#042C53' : '#6b7c93', padding: '6px 0', fontWeight: selected ? 700 : 400, borderTop: '1px solid #edf1f6' }}>
        {TEMPLATES.find(t => t.id === id)?.label}
      </div>
    </div>
  )
}

export default function CVBuilderPage() {
  const router = useRouter()
  const [cvText, setCvText] = useState('')
  const [job, setJob] = useState<{ job_title: string; employer_name: string } | null>(null)
  const [jobLabel, setJobLabel] = useState('')
  const [template, setTemplate] = useState<Template>('modern')
  const [tone, setTone] = useState<Tone>('professional')
  const [pages, setPages] = useState<Pages>('1')
  const [lang, setLang] = useState<Lang>('EN')
  const [tailoredCv, setTailoredCv] = useState('')
  const [loading, setLoading] = useState(false)
  const [keywords, setKeywords] = useState('')
  const [achievements, setAchievements] = useState('')
  const [suggestions, setSuggestions] = useState('')

  useEffect(() => {
    const cv = sessionStorage.getItem('jl_sjs_cv_text') || sessionStorage.getItem('jl_cv_text') || ''
    const jobRaw = sessionStorage.getItem('jl_cvb_job')
    const existing = sessionStorage.getItem('jl_cvb_tailored')
    const savedRole = sessionStorage.getItem('jl_sjs_target_role') || ''
    setCvText(cv)
    if (jobRaw) {
      try {
        const parsed = JSON.parse(jobRaw)
        setJob(parsed)
        setJobLabel(`${parsed.employer_name} - ${parsed.job_title}`)
      } catch { }
    } else if (savedRole) {
      setJobLabel(savedRole)
    }
    if (existing) setTailoredCv(existing)
  }, [])

  async function generate() {
    if (!cvText.trim()) return
    setLoading(true); setTailoredCv(''); setKeywords(''); setAchievements(''); setSuggestions('')
    try {
      const res = await fetch('/api/tailor-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, job, template, tone, pages, lang }),
      })
      const data = await res.json()
      const cv = data.cv || data.enhanced || data.result || ''
      setTailoredCv(cv)
      sessionStorage.setItem('jl_cvb_tailored', cv)
      setKeywords(data.keywords || '')
      setAchievements(data.achievements || '')
      setSuggestions(data.suggestions || '')
    } catch { setTailoredCv('Failed to generate. Please try again.') }
    finally { setLoading(false) }
  }

  function downloadText(text: string, filename: string) {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function goToCoverLetter() {
    sessionStorage.setItem('jl_cvb_tailored', tailoredCv)
    router.push('/app/cover-letter')
  }

  const ToggleBtn = ({ value, current, onClick, children }: { value: string; current: string; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} style={{ padding: '7px 18px', borderRadius: 8, border: `1.5px solid ${current === value ? '#042C53' : '#dde4ee'}`, background: current === value ? '#042C53' : '#fff', color: current === value ? '#fff' : '#6b7c93', fontSize: 13, fontWeight: current === value ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' }}>
      {children}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
      <Navbar />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#042C53', fontFamily: "'Outfit', sans-serif" }}>CV Builder</div>
            {jobLabel && <div style={{ fontSize: 13, color: '#6b7c93', marginTop: 3 }}>Tailored for: {jobLabel}</div>}
          </div>
          <button onClick={() => router.push('/app/smart-apply')} style={{ fontSize: 13, color: '#378ADD', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            â Back to jobs
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
          {TEMPLATES.map(t => (
            <TemplateThumb key={t.id} id={t.id} selected={template === t.id} onClick={() => setTemplate(t.id)} />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7c93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Language</span>
            <ToggleBtn value="EN" current={lang} onClick={() => setLang('EN')}>EN</ToggleBtn>
            <ToggleBtn value="DE" current={lang} onClick={() => setLang('DE')}>DE</ToggleBtn>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7c93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Tone</span>
            <ToggleBtn value="professional" current={tone} onClick={() => setTone('professional')}>Professional</ToggleBtn>
            <ToggleBtn value="concise" current={tone} onClick={() => setTone('concise')}>Concise</ToggleBtn>
            <ToggleBtn value="detailed" current={tone} onClick={() => setTone('detailed')}>Detailed</ToggleBtn>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7c93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Pages</span>
            <ToggleBtn value="1" current={pages} onClick={() => setPages('1')}>1 page</ToggleBtn>
            <ToggleBtn value="2" current={pages} onClick={() => setPages('2')}>2 pages</ToggleBtn>
          </div>
          <button onClick={generate} disabled={loading || !cvText.trim()} style={{ padding: '8px 22px', borderRadius: 8, background: loading || !cvText.trim() ? '#dde4ee' : '#042C53', color: loading || !cvText.trim() ? '#9ab' : '#fff', border: 'none', cursor: loading || !cvText.trim() ? 'not-allowed' : 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700 }}>
            {loading ? 'Generating...' : tailoredCv ? 'Regenerate â' : 'Generate â'}
          </button>
        </div>

        <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 14, padding: 32, marginBottom: 16, minHeight: 300 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #edf1f6', borderTopColor: '#378ADD', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <div style={{ fontSize: 14, color: '#6b7c93' }}>Tailoring your CV...</div>
            </div>
          ) : tailoredCv ? (
            <pre style={{ fontSize: 13, color: '#1a2332', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>{tailoredCv}</pre>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7c93' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#042C53', marginBottom: 8 }}>
                {cvText ? 'Choose your options and click Generate' : 'No CV found - go back and upload your CV in Smart Job Search'}
              </div>
              <div style={{ fontSize: 13 }}>Your tailored CV will appear here</div>
            </div>
          )}
        </div>

        {tailoredCv && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <button onClick={() => downloadText(tailoredCv, `CV_${job?.employer_name || 'JobLens'}.pdf`)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, background: '#042C53', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700 }}>
              â¬ Download PDF
            </button>
            <button onClick={() => downloadText(tailoredCv, `CV_${job?.employer_name || 'JobLens'}.docx`)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, background: '#fff', color: '#042C53', border: '1.5px solid #042C53', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700 }}>
              â¬ Download DOCX
            </button>
            <button onClick={() => navigator.clipboard.writeText(tailoredCv)} style={{ padding: '10px 20px', borderRadius: 8, background: '#fff', color: '#6b7c93', border: '1px solid #dde4ee', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
              Copy text
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={goToCoverLetter} style={{ padding: '10px 24px', borderRadius: 8, background: 'linear-gradient(135deg, #1D9E75, #059669)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700 }}>
              Go to Cover Letter →</button>
          </div>
        )}

        {tailoredCv && (keywords || achievements || suggestions) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { label: 'Keywords injected', value: keywords, color: '#1D9E75' },
              { label: 'Achievements', value: achievements, color: '#1D9E75' },
              { label: 'Suggestions', value: suggestions, color: '#F59E0B' },
            ].filter(c => c.value).map(card => (
              <div key={card.label} style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: card.color }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#042C53' }}>{card.label}</div>
                </div>
                <div style={{ fontSize: 12, color: '#6b7c93', lineHeight: 1.6 }}>{card.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}