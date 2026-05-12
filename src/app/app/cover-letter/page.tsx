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

const LENGTHS: { id: Length; label: string; desc: string }[] = [
  { id: 'short', label: 'Short', desc: '~150 words' },
  { id: 'medium', label: 'Medium', desc: '~300 words' },
  { id: 'long', label: 'Long', desc: '~450 words' },
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
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null)
  const [feedback, setFeedback] = useState('')
  const [applyingFeedback, setApplyingFeedback] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ style: true, format: true, summary: false })

  const jobLabel = job ? `${job.employer_name} - ${job.job_title}` : ''

  useEffect(() => {
    const cv = sessionStorage.getItem('jl_cvb_tailored') || sessionStorage.getItem('jl_sjs_cv_text') || sessionStorage.getItem('jl_cv_text') || ''
    const jobRaw = sessionStorage.getItem('jl_cvb_job')
    const saved = sessionStorage.getItem('jl_cl_letter')
    setCvText(cv)
    if (jobRaw) { try { setJob(JSON.parse(jobRaw)) } catch { } }
    if (saved) setLetter(saved)
  }, [])

  function toggleSection(id: string) {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

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
      setPersonalization(data.personalization || (job ? `${job.employer_name} . ${job.job_city || 'location'} . role context . DE/EN bilingual` : 'Company context applied'))
      setOptional(data.optional || 'Mention specific product line. Add referral name if available. Include LinkedIn profile URL.')
      setOpenSections(prev => ({ ...prev, summary: true }))
    } catch { setLetter('Failed to generate. Please try again.') }
    finally { setLoading(false) }
  }

  async function applyFeedback() {
    if (!feedback.trim() || !letter) return
    setApplyingFeedback(true)
    try {
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, job, tone, length, lang, feedback, currentLetter: letter }),
      })
      if (res.status === 402) { alert('Not enough credits to apply changes.'); setApplyingFeedback(false); return }
      const data = await res.json()
      const cl = data.coverLetter || data.letter || ''
      setLetter(cl)
      sessionStorage.setItem('jl_cl_letter', cl)
      setFeedback('')
    } catch { /* silent */ }
    setApplyingFeedback(false)
  }

  async function downloadPDF() {
    if (!letter) return
    setDownloading('pdf')
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = 210
      const margin = 22
      const contentW = W - margin * 2
      let y = 28

      // Top accent bar
      doc.setFillColor(4, 44, 83)
      doc.rect(0, 0, W, 12, 'F')
      doc.setFillColor(55, 138, 221)
      doc.rect(0, 10, W, 2, 'F')

      // Header area
      y = 24
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(4, 44, 83)
      doc.text('Cover Letter', margin, y)
      y += 6

      if (job) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(107, 124, 147)
        doc.text(`${job.employer_name} - ${job.job_title}`, margin, y)
        y += 5
      }

      // Divider
      doc.setDrawColor(220, 228, 238)
      doc.setLineWidth(0.4)
      doc.line(margin, y, W - margin, y)
      y += 10

      // Tone / Lang / Length chips
      const chips = [
        `Tone: ${tone.charAt(0).toUpperCase() + tone.slice(1)}`,
        `Language: ${lang === 'EN' ? 'English' : 'Deutsch'}`,
        `Length: ${length.charAt(0).toUpperCase() + length.slice(1)}`,
      ]
      let cx = margin
      chips.forEach(chip => {
        const tw = doc.getTextWidth(chip)
        doc.setFillColor(230, 241, 251)
        doc.roundedRect(cx, y - 3.5, tw + 10, 6, 1.5, 1.5, 'F')
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(24, 95, 165)
        doc.text(chip, cx + 5, y + 0.5)
        cx += tw + 16
      })
      y += 10

      // Letter body
      const paragraphs = letter.split('\n').filter(p => p.trim() !== '')
      paragraphs.forEach((para, i) => {
        const isFirst = i === 0
        const isLast = i === paragraphs.length - 1

        // Page break check
        if (y > 260) {
          doc.addPage()
          y = 20
        }

        doc.setFont('helvetica', isFirst || isLast ? 'bold' : 'normal')
        doc.setFontSize(10.5)
        doc.setTextColor(26, 35, 50)
        const lines = doc.splitTextToSize(para, contentW)
        doc.text(lines, margin, y)
        y += lines.length * 6 + 5
      })

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p)
        doc.setFillColor(248, 250, 252)
        doc.rect(0, 285, W, 12, 'F')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(143, 163, 184)
        doc.text('Generated by Job-Lens AI', margin, 292)
        doc.text(`Page ${p} of ${pageCount}`, W - margin, 292, { align: 'right' })
      }

      const filename = `CoverLetter_${(job?.employer_name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      doc.save(filename)
    } catch (err) {
      console.error('PDF error:', err)
      alert('PDF generation failed. Please try again.')
    }
    setDownloading(null)
  }

  async function downloadDOCX() {
    if (!letter) return
    setDownloading('docx')
    try {
      const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = await import('docx')

      const navy = '042C53'
      const blue = '185FA5'
      const grey = '6b7c93'
      const dark = '1a2332'

      const children: any[] = []

      // Title
      children.push(new Paragraph({
        children: [new TextRun({ text: 'Cover Letter', bold: true, size: 36, color: navy, font: 'Calibri' })],
        spacing: { after: 80 },
      }))

      // Job label
      if (job) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `${job.employer_name} - ${job.job_title}`, size: 20, color: grey, font: 'Calibri', italics: true })],
          spacing: { after: 60 },
        }))
      }

      // Config chips line
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `Tone: ${tone}  |  Language: ${lang === 'EN' ? 'English' : 'Deutsch'}  |  Length: ${length}`, size: 16, color: blue, font: 'Calibri' }),
        ],
        spacing: { after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'dde4ee' } },
      }))

      // Letter body - split by paragraph
      const paragraphs = letter.split('\n')
      paragraphs.forEach((para, i) => {
        if (!para.trim()) {
          children.push(new Paragraph({ children: [], spacing: { after: 120 } }))
          return
        }
        const isFirst = i === 0
        const isLast = i === paragraphs.filter(p => p.trim()).length - 1
        children.push(new Paragraph({
          children: [new TextRun({
            text: para,
            size: 22,
            color: dark,
            font: 'Calibri',
            bold: isFirst || isLast,
          })],
          spacing: { after: 160 },
          alignment: AlignmentType.JUSTIFIED,
        }))
      })

      // Footer note
      children.push(new Paragraph({
        children: [new TextRun({ text: 'Generated by Job-Lens AI', size: 14, color: 'aaaaaa', font: 'Calibri', italics: true })],
        spacing: { before: 400 },
      }))

      const doc = new Document({
        sections: [{
          properties: {
            page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } },
          },
          children,
        }],
      })

      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CoverLetter_${(job?.employer_name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('DOCX error:', err)
      alert('Word generation failed. Please try again.')
    }
    setDownloading(null)
  }

  function goApply() {
    sessionStorage.setItem('jl_cl_letter', letter)
    router.push('/app/apply-now')
  }

  const accentColor = '#378ADD'

  return (
    <div style={{ minHeight: '100vh', background: '#0F1923', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .cl-gen:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(0,0,0,0.4) !important; }
        .cl-action:hover { background: rgba(255,255,255,0.1) !important; }
        .cl-card:hover { border-color: rgba(255,255,255,0.2) !important; }
        .shimmer { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%); background-size:200% 100%; animation: shimmer 1.5s infinite; border-radius:4px; }
        .cl-preview { animation: fadeUp 0.35s ease; }
      `}</style>

      <Navbar />

      <div style={{ display: 'flex', height: 'calc(100vh - 52px)' }}>

        {/* LEFT SIDEBAR */}
        <div style={{ width: 288, flexShrink: 0, background: 'linear-gradient(180deg, #042C53 0%, #073d6e 100%)', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <button onClick={() => router.push('/app/cv-builder')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 14 }}>
              {'<'}- Back to CV Builder
            </button>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>Cover Letter</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>AI-powered letter builder</div>
            {jobLabel && (
              <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, color: accentColor, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>Tailoring for</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{jobLabel}</div>
              </div>
            )}
            {!cvText && (
              <div style={{ marginTop: 10, padding: '7px 10px', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 8, fontSize: 10, color: '#F5A623' }}>
                ! No CV found - go back and upload your CV first
              </div>
            )}
          </div>

          {/* Accordions */}
          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* SECTION: Style */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggleSection('style')}
                style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.style ? accentColor + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.style ? accentColor + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.style ? accentColor : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>01</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.style ? '#fff' : 'rgba(255,255,255,0.55)' }}>Tone</span>
                  <span style={{ fontSize: 10, color: accentColor, fontWeight: 600 }}>{TONES.find(t => t.id === tone)?.label}</span>
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', transform: openSections.style ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.style && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {TONES.map(t => (
                    <div key={t.id} className="cl-card" onClick={() => setTone(t.id)}
                      style={{ padding: '10px 12px', borderRadius: 9, border: `1px solid ${tone === t.id ? accentColor : 'rgba(255,255,255,0.09)'}`, background: tone === t.id ? accentColor + '14' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: tone === t.id ? '#fff' : 'rgba(255,255,255,0.65)' }}>{t.label}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{t.desc}</div>
                      </div>
                      <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${tone === t.id ? accentColor : 'rgba(255,255,255,0.2)'}`, background: tone === t.id ? accentColor : 'transparent', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION: Format */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggleSection('format')}
                style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.format ? accentColor + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.format ? accentColor + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.format ? accentColor : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>02</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.format ? '#fff' : 'rgba(255,255,255,0.55)' }}>Format</span>
                  <span style={{ fontSize: 10, color: accentColor, fontWeight: 600 }}>{lang} . {length}</span>
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', transform: openSections.format ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.format && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Language */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Language</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['EN', 'DE'] as Lang[]).map(l => (
                        <button key={l} onClick={() => setLang(l)}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${lang === l ? accentColor : 'rgba(255,255,255,0.1)'}`, background: lang === l ? accentColor + '20' : 'rgba(255,255,255,0.04)', color: lang === l ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: lang === l ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                          {l === 'EN' ? 'English' : 'Deutsch'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Length */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Length</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {LENGTHS.map(l => (
                        <div key={l.id} onClick={() => setLength(l.id)}
                          style={{ padding: '9px 11px', borderRadius: 8, border: `1px solid ${length === l.id ? accentColor : 'rgba(255,255,255,0.08)'}`, background: length === l.id ? accentColor + '14' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: length === l.id ? '#fff' : 'rgba(255,255,255,0.6)' }}>{l.label}</span>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{l.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION: Summary */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggleSection('summary')}
                style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.summary ? accentColor + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.summary ? accentColor + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.summary ? accentColor : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>03</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.summary ? '#fff' : 'rgba(255,255,255,0.55)' }}>Summary</span>
                  {letter && <span style={{ fontSize: 10, color: '#1D9E75', fontWeight: 600 }}>Ready</span>}
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', transform: openSections.summary ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.summary && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'Tone', value: TONES.find(t => t.id === tone)?.label || '-' },
                    { label: 'Language', value: lang === 'EN' ? 'English' : 'Deutsch' },
                    { label: 'Length', value: length.charAt(0).toUpperCase() + length.slice(1) },
                    { label: 'Status', value: letter ? 'Generated' : 'Not generated' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{row.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: row.label === 'Status' && letter ? '#1D9E75' : accentColor }}>{row.value}</span>
                    </div>
                  ))}
                  {personalization && (
                    <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: 8 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#1D9E75', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>Personalization</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{personalization}</div>
                    </div>
                  )}
                  {optional && (
                    <div style={{ padding: '10px 12px', background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 8 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#F5A623', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>Suggestions</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{optional}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Generate button */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <button className="cl-gen" onClick={generate} disabled={loading || !cvText.trim()}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: loading || !cvText.trim() ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${accentColor}, #1D9E75)`, color: loading || !cvText.trim() ? 'rgba(255,255,255,0.25)' : '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: loading || !cvText.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading
                ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.7)', animation: 'spin 0.7s linear infinite' }} /> Writing...</>
                : letter ? 'Regenerate Letter' : 'Generate Letter'}
            </button>
          </div>
        </div>

        {/* RIGHT PREVIEW */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#141E2B', overflow: 'hidden' }}>

          {/* Action bar */}
          <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#042C53', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: letter ? '#1D9E75' : 'rgba(255,255,255,0.25)' }}>
                {letter ? 'Letter Ready' : 'Preview'}
              </span>
              {letter && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
                  {TONES.find(t => t.id === tone)?.label} | {lang} | {length}
                </span>
              )}
            </div>
            {letter && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="cl-action" onClick={downloadPDF} disabled={downloading === 'pdf'}
                  style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: downloading === 'pdf' ? accentColor : 'rgba(255,255,255,0.55)', fontSize: 11, cursor: downloading === 'pdf' ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {downloading === 'pdf' ? 'Building...' : 'PDF'}
                </button>
                <button className="cl-action" onClick={downloadDOCX} disabled={downloading === 'docx'}
                  style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: downloading === 'docx' ? accentColor : 'rgba(255,255,255,0.55)', fontSize: 11, cursor: downloading === 'docx' ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {downloading === 'docx' ? 'Building...' : 'Word'}
                </button>
                <button onClick={goApply}
                  style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg, #1D9E75, #059669)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s' }}>
                  Apply Now &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Preview canvas */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', display: 'flex', justifyContent: 'center' }}>

            {/* Loading skeleton */}
            {loading && (
              <div style={{ width: '100%', maxWidth: 680 }}>
                <div style={{ background: '#1C2A3A', borderRadius: 14, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5)', padding: '40px 44px' }}>
                  <div className="shimmer" style={{ height: 14, width: '30%', marginBottom: 8 }} />
                  <div className="shimmer" style={{ height: 8, width: '45%', marginBottom: 32 }} />
                  {[95, 88, 100, 72, 90, 85, 100, 78, 92, 65, 88, 95, 100, 70, 83].map((w, i) => (
                    <div key={i} className="shimmer" style={{ height: 8, width: `${w}%`, marginBottom: 10, animationDelay: `${i * 0.06}s` }} />
                  ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${accentColor}40`, borderTopColor: accentColor, animation: 'spin 0.7s linear infinite' }} />
                  Writing your cover letter...
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loading && !letter && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 24 }}>
                <div style={{ width: 300, opacity: 0.5, position: 'relative' }}>
                  <div style={{ background: '#1C2A3A', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', padding: '32px 36px' }}>
                    <div style={{ height: 10, background: 'rgba(255,255,255,0.12)', borderRadius: 3, width: '40%', marginBottom: 8 }} />
                    <div style={{ height: 6, background: 'rgba(55,138,221,0.4)', borderRadius: 2, width: '55%', marginBottom: 28 }} />
                    {[95, 85, 100, 70, 90, 80, 95, 65, 88].map((w, i) => (
                      <div key={i} style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 2, width: `${w}%`, marginBottom: 10 }} />
                    ))}
                  </div>
                  <div style={{ position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)', width: 160, height: 30, background: accentColor, borderRadius: '50%', filter: 'blur(24px)', opacity: 0.2 }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>
                    {cvText ? 'Ready to write' : 'No CV uploaded'}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', lineHeight: 1.7 }}>
                    {cvText ? 'Choose your tone and length, then click Generate Letter' : 'Go back and upload your CV in Smart Job Search first'}
                  </div>
                  {cvText && (
                    <button onClick={generate} className="cl-gen"
                      style={{ marginTop: 20, padding: '11px 28px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${accentColor}, #1D9E75)`, color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      Generate Letter
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Letter preview - paper */}
            {!loading && letter && (
              <div className="cl-preview" style={{ width: '100%', maxWidth: 700 }}>
                {/* Paper */}
                <div style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)', background: '#FAFAF8' }}>
                  {/* Top accent */}
                  <div style={{ height: 5, background: `linear-gradient(90deg, #042C53, ${accentColor}, #1D9E75)` }} />

                  {/* Letter header */}
                  <div style={{ padding: '32px 44px 20px', borderBottom: '1px solid #edf1f6' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Cover Letter</div>
                    {job && (
                      <div style={{ fontSize: 13, color: '#6b7c93', fontStyle: 'italic' }}>
                        {job.employer_name} - {job.job_title}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {[
                        TONES.find(t => t.id === tone)?.label,
                        lang === 'EN' ? 'English' : 'Deutsch',
                        length.charAt(0).toUpperCase() + length.slice(1),
                      ].map((chip, i) => (
                        <span key={i} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: '#E6F1FB', color: '#185FA5', fontWeight: 600, border: '1px solid #c3ddf7' }}>
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Letter body */}
                  <div style={{ padding: '32px 44px 40px' }}>
                    <div style={{ fontSize: 14, color: '#1a2332', lineHeight: 1.95, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif" }}>
                      {letter}
                    </div>
                  </div>
                </div>

                {/* Feedback input */}
                <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 8 }}>Request changes</div>
                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="e.g. Make it shorter, add more enthusiasm, mention my Python skills, switch to German…"
                    rows={2}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '8px 10px', resize: 'vertical' as const, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' as const }}
                  />
                  <button
                    onClick={applyFeedback}
                    disabled={!feedback.trim() || applyingFeedback}
                    style={{ marginTop: 8, padding: '7px 18px', borderRadius: 7, border: 'none', background: feedback.trim() && !applyingFeedback ? accentColor : 'rgba(255,255,255,0.08)', color: feedback.trim() && !applyingFeedback ? '#042C53' : 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 700, cursor: feedback.trim() && !applyingFeedback ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif" }}>
                    {applyingFeedback ? 'Applying…' : 'Apply changes — 1 credit'}
                  </button>
                </div>

                {/* Footer actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap', paddingBottom: 32 }}>
                  <button onClick={downloadPDF} disabled={downloading === 'pdf'}
                    style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: downloading === 'pdf' ? accentColor : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: downloading === 'pdf' ? 'wait' : 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                    {downloading === 'pdf' ? 'Building PDF...' : 'Download PDF'}
                  </button>
                  <button onClick={downloadDOCX} disabled={downloading === 'docx'}
                    style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: downloading === 'docx' ? accentColor : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: downloading === 'docx' ? 'wait' : 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                    {downloading === 'docx' ? 'Building Word...' : 'Download Word'}
                  </button>
                  <button onClick={goApply}
                    style={{ padding: '10px 26px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #1D9E75, #059669)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: '0 6px 20px rgba(29,158,117,0.3)' }}>
                    Apply Now &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
