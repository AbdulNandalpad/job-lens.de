'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'

type Tone = 'confident' | 'formal' | 'warm'
type Length = 'short' | 'medium' | 'long'
type Lang = 'EN' | 'DE'

const TONES: { id: Tone; label: string; desc: string }[] = [
  { id: 'confident', label: 'Confident', desc: 'Direct, assertive' },
  { id: 'formal', label: 'Formal', desc: 'DE business style' },
  { id: 'warm', label: 'Warm', desc: 'Personal, genuine' },
]

export default function CoverLetterPage() {
  const router = useRouter()
  const [cvText, setCvText] = useState('')
  const [job, setJob] = useState<{ job_title: string; employer_name: string; job_city?: string; job_description?: string } | null>(null)
  const [tone, setTone] = useState<Tone>('confident')
  const [length, setLength] = useState<Length>('medium')
  const [lang, setLang] = useState<Lang>('EN')
  const [letter, setLetter] = useState('')
  const [loading, setLoading] = useState(false)
  const [personalization, setPersonalization] = useState('')
  const [optional, setOptional] = useState('')

  useEffect(() => {
    const cv = sessionStorage.getItem('jl_cvb_tailored') || sessionStorage.getItem('jl_sjs_cv_text') || sessionStorage.getItem('jl_cv_text') || ''
    const jobRaw = sessionStorage.getItem('jl_cvb_job')
    setCvText(cv)
    if (jobRaw) { try { setJob(JSON.parse(jobRaw)) } catch { } }
  }, [])

  async function generate() {
    if (!cvText.trim()) return
    setLoading(true); setLetter('')
    try {
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, job, tone, length, lang }),
      })
      const data = await res.json()
      const cl = data.coverLetter || data.letter || data.result || ''
      setLetter(cl)
      sessionStorage.setItem('jl_cl_letter', cl)
      setPersonalization(data.personalization || (job ? `${job.employer_name} name · ${job.job_city || 'location'} · role context · DE/EN bilingual` : 'Company context applied'))
      setOptional(data.optional || 'Mention specific product line. Add referral name if available. Include LinkedIn profile URL.')
    } catch { setLetter('Failed to generate. Please try again.') }
    finally { setLoading(false) }
  }

  function downloadText(text: string, filename: string) {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function copyText() { navigator.clipboard.writeText(letter) }

  function goApply() {
    sessionStorage.setItem('jl_cl_letter', letter)
    router.push('/app/apply-now')
  }

  const jobLabel = job ? `${job.employer_name} - ${job.job_title}` : ''

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

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#042C53', fontFamily: "'Outfit', sans-serif" }}>Cover Letter Builder</div>
            {jobLabel && <div style={{ fontSize: 13, color: '#6b7c93', marginTop: 3 }}>Tailored for: {jobLabel}</div>}
          </div>
          <button onClick={() => router.push('/app/cv-builder')} style={{ fontSize: 13, color: '#378ADD', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            â Back to CV
          </button>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7c93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Language</span>
            <ToggleBtn value="EN" current={lang} onClick={() => setLang('EN')}>EN</ToggleBtn>
            <ToggleBtn value="DE" current={lang} onClick={() => setLang('DE')}>DE</ToggleBtn>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7c93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Tone</span>
            {TONES.map(t => (
              <button key={t.id} onClick={() => setTone(t.id)} style={{ padding: '7px 16px', borderRadius: 8, border: `1.5px solid ${tone === t.id ? '#042C53' : '#dde4ee'}`, background: '#fff', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textAlign: 'left', transition: 'all 0.15s' }}>
                <div style={{ fontSize: 13, fontWeight: tone === t.id ? 700 : 500, color: tone === t.id ? '#042C53' : '#1a2332' }}>{t.label}</div>
                <div style={{ fontSize: 11, color: '#6b7c93' }}>{t.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7c93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Length</span>
            <ToggleBtn value="short" current={length} onClick={() => setLength('short')}>Short</ToggleBtn>
            <ToggleBtn value="medium" current={length} onClick={() => setLength('medium')}>Medium</ToggleBtn>
            <ToggleBtn value="long" current={length} onClick={() => setLength('long')}>Long</ToggleBtn>
          </div>
          <button onClick={generate} disabled={loading || !cvText.trim()} style={{ padding: '8px 22px', borderRadius: 8, background: loading || !cvText.trim() ? '#dde4ee' : '#042C53', color: loading || !cvText.trim() ? '#9ab' : '#fff', border: 'none', cursor: loading || !cvText.trim() ? 'not-allowed' : 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700 }}>
            {loading ? 'Generating...' : letter ? 'Regenerate â' : 'Generate â'}
          </button>
        </div>

        {/* Letter preview */}
        <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 14, padding: 32, marginBottom: 16, minHeight: 280 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #edf1f6', borderTopColor: '#378ADD', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <div style={{ fontSize: 14, color: '#6b7c93' }}>Writing your cover letter...</div>
            </div>
          ) : letter ? (
            <div style={{ fontSize: 14, color: '#1a2332', lineHeight: 1.9, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif" }}>{letter}</div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#042C53', marginBottom: 8 }}>
                {cvText ? 'Choose your tone and click Generate' : 'No CV found - go back and upload your CV first'}
              </div>
              <div style={{ fontSize: 13, color: '#6b7c93' }}>Your cover letter will appear here</div>
            </div>
          )}
        </div>

        {/* Action bar */}
        {letter && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <button onClick={() => downloadText(letter, `CoverLetter_${job?.employer_name || 'JobLens'}.pdf`)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, background: '#042C53', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700 }}>
              â¬ Download PDF
            </button>
            <button onClick={() => downloadText(letter, `CoverLetter_${job?.employer_name || 'JobLens'}.docx`)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, background: '#fff', color: '#042C53', border: '1.5px solid #042C53', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700 }}>
              â¬ Download DOCX
            </button>
            <button onClick={copyText} style={{ padding: '10px 20px', borderRadius: 8, background: '#fff', color: '#6b7c93', border: '1px solid #dde4ee', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
              Copy text
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={goApply} style={{ padding: '10px 24px', borderRadius: 8, background: 'linear-gradient(135deg, #1D9E75, #059669)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700 }}>
              v Applied - log it →</button>
          </div>
        )}

        {/* Bottom cards */}
        {letter && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75' }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: '#042C53' }}>Personalization used</div>
              </div>
              <div style={{ fontSize: 12, color: '#6b7c93', lineHeight: 1.6 }}>{personalization}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: '#042C53' }}>Optional additions</div>
              </div>
              <div style={{ fontSize: 12, color: '#6b7c93', lineHeight: 1.6 }}>{optional}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}