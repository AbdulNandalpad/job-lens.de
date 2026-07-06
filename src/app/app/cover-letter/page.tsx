'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { useCredits } from '@/lib/useCredits'
import { useLanguage } from '@/lib/i18n'
import CrossMarketModal from '@/components/CrossMarketModal'
import { CREDIT_COST, LOW_CREDIT_WARN, MARKET, SS, API } from '@/lib/constants'
import SvgIcon from '@/components/SvgIcon'

type Tone = 'confident' | 'formal' | 'warm'
type Length = 'short' | 'medium' | 'long'
type Lang = 'EN' | 'DE'

const TONE_IDS: Tone[] = ['confident', 'formal', 'warm']
const LENGTH_IDS: Length[] = ['short', 'medium', 'long']

export default function CoverLetterPage() {
  const router = useRouter()
  const { t } = useLanguage()

  const TONES: { id: Tone; label: string; desc: string }[] = TONE_IDS.map(id => ({
    id,
    label: t.coverLetter.sidebar.tones[id].label,
    desc: t.coverLetter.sidebar.tones[id].desc,
  }))

  const LENGTHS: { id: Length; label: string; desc: string }[] = LENGTH_IDS.map(id => ({
    id,
    label: t.coverLetter.sidebar.lengths[id].label,
    desc: t.coverLetter.sidebar.lengths[id].desc,
  }))

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cvText, setCvText] = useState('')
  const [cvFileName, setCvFileName] = useState('')
  const [fileLoading, setFileLoading] = useState(false)
  const [job, setJob] = useState<{ job_title: string; employer_name: string; job_city?: string; job_description?: string } | null>(null)
  const [tone, setTone] = useState<Tone>('confident')
  const [length, setLength] = useState<Length>('medium')
  const [letterLang, setLetterLang] = useState<Lang>('EN')
  const [letter, setLetter] = useState('')
  const [loading, setLoading] = useState(false)
  const [personalization, setPersonalization] = useState('')
  const [optional, setOptional] = useState('')
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null)
  const [feedback, setFeedback] = useState('')
  const [applyingFeedback, setApplyingFeedback] = useState(false)
  const { credits, setCredits, needsCrossMarket, crossMarketAmount } = useCredits()
  const CL_COST = CREDIT_COST.coverLetter
  const [crossWarnPending, setCrossWarnPending] = useState<(() => void) | null>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ contact: false, style: false, format: false, summary: false })
  const [contactName,  setContactName]  = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [mobOpen, setMobOpen] = useState(false)

  const jobLabel = job ? `${job.employer_name} - ${job.job_title}` : ''

  useEffect(() => {
    const cv = sessionStorage.getItem(SS.cvbTailored) || sessionStorage.getItem(SS.sjsCvText) || sessionStorage.getItem(SS.cvText) || ''
    const jobRaw = sessionStorage.getItem(SS.cvbJob)
    const saved = sessionStorage.getItem(SS.clLetter)
    setCvText(cv)
    if (jobRaw) { try { setJob(JSON.parse(jobRaw)) } catch { } }
    if (saved) setLetter(saved)

    // Auto-extract contact details from CV
    if (cv) {
      const emailM = cv.match(/[\w.+\-]+@[\w\-]+(?:\.[\w\-]+)+/i)
      if (emailM) setContactEmail(emailM[0].toLowerCase())
      const phoneM = cv.match(/(?:\+\d{1,3}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,5}[\s\-.]?\d{3,5}(?:[\s\-.]?\d{1,4})?/)
      if (phoneM) setContactPhone(phoneM[0].trim())
      for (const line of cv.split('\n')) {
        const t = line.trim()
        if (t.length > 2 && t.length < 55 && !t.includes('@') && !/\d/.test(t) && /[A-Za-z]/.test(t)) {
          const words = t.split(/\s+/)
          if (words.length >= 2 && words.length <= 5) { setContactName(t); break }
        }
      }
    }
  }, [])

  function toggleSection(id: string) {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleCvFile(file: File) {
    setCvFileName(file.name)
    setCvText('')
    setFileLoading(true)
    if (file.name.endsWith('.txt') || file.type === 'text/plain') {
      const r = new FileReader()
      r.onload = e => {
        const text = (e.target?.result as string) ?? ''
        setCvText(text)
        sessionStorage.setItem(SS.cvText, text)
        setFileLoading(false)
      }
      r.readAsText(file)
    } else {
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch(API.extractPdf, { method: 'POST', body: form })
        const data = await res.json()
        if (data.text) {
          setCvText(data.text)
          sessionStorage.setItem(SS.cvText, data.text)
        } else {
          alert(data.error || 'Could not read file. Try a different format.')
          setCvFileName('')
        }
      } catch { alert('Failed to read file. Please try again.'); setCvFileName('') }
      setFileLoading(false)
    }
  }

  async function generate() {
    if (!cvText.trim()) return
    if (credits !== null && credits < CL_COST) { alert(`You need ${CL_COST} credit to generate a cover letter. Please top up on the Account page.`); return }
    setLoading(true); setLetter('')
    try {
      const contactHeader = [
        contactName  ? `Full Name: ${contactName}`  : '',
        contactEmail ? `Email: ${contactEmail}`      : '',
        contactPhone ? `Phone: ${contactPhone}`      : '',
      ].filter(Boolean).join('\n')
      const cvWithContact = contactHeader ? `${contactHeader}\n\n${cvText}` : cvText
      const res = await fetch(API.coverLetter, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText: cvWithContact, job, tone, length, lang: letterLang, market: MARKET.eu }),
      })
      if (res.status === 402) { const d = await res.json(); if (typeof d.credits === 'number') setCredits(d.credits); setLoading(false); alert('Not enough credits. Please top up on the Account page.'); return }
      const data = await res.json()
      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining)
      const cl = data.coverLetter || data.letter || data.result || ''
      setLetter(cl)
      sessionStorage.setItem(SS.clLetter, cl)
      setPersonalization(data.personalization || (job ? `${job.employer_name} . ${job.job_city || 'location'} . role context . DE/EN bilingual` : 'Company context applied'))
      setOptional(data.optional || 'Mention specific product line. Add referral name if available. Include LinkedIn profile URL.')
      setOpenSections(prev => ({ ...prev, summary: true }))
    } catch { setLetter('Failed to generate. Please try again.') }
    finally { setLoading(false) }
  }

  function handleGenerate() {
    if (needsCrossMarket(CL_COST, MARKET.eu)) {
      setCrossWarnPending(() => generate)
    } else {
      generate()
    }
  }

  async function applyFeedback() {
    if (!feedback.trim() || !letter) return
    setApplyingFeedback(true)
    try {
      const res = await fetch(API.coverLetter, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, job, tone, length, lang: letterLang, feedback, currentLetter: letter }),
      })
      if (res.status === 402) { alert('Not enough credits to apply changes.'); setApplyingFeedback(false); return }
      const data = await res.json()
      const cl = data.coverLetter || data.letter || ''
      setLetter(cl)
      sessionStorage.setItem(SS.clLetter, cl)
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
      doc.text(contactName || 'Cover Letter', margin, y)
      y += 6

      const contactParts = [contactEmail, contactPhone].filter(Boolean).join('  ·  ')
      if (contactParts) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(107, 124, 147)
        doc.text(contactParts, margin, y)
        y += 5
      }

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

      y += 6

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
          new TextRun({ text: `Tone: ${tone}  |  Language: ${letterLang === 'EN' ? 'English' : 'Deutsch'}  |  Length: ${length}`, size: 16, color: blue, font: 'Calibri' }),
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
    sessionStorage.setItem(SS.clLetter, letter)
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
        .jl-dsb { display: flex !important; }
        .jl-mob { display: none !important; }
        .jl-mbtn { display: none !important; }
        @media (max-width: 768px) {
          .jl-dsb { display: none !important; }
          .jl-mob { display: flex !important; }
          .jl-mbtn { display: block !important; }
        }
      `}</style>

      <Navbar />

      {crossWarnPending && (
        <CrossMarketModal
          cost={CL_COST}
          market="eu"
          crossAmount={crossMarketAmount(CL_COST, MARKET.eu)}
          onConfirm={() => { const fn = crossWarnPending; setCrossWarnPending(null); fn() }}
          onCancel={() => setCrossWarnPending(null)}
        />
      )}


      <div style={{ display: 'flex', height: 'calc(100vh - 52px)' }}>

        {/* LEFT SIDEBAR */}
        <div className="jl-dsb" style={{ width: 288, flexShrink: 0, background: 'linear-gradient(180deg, #152233 0%, #0e1a28 100%)', borderRight: '1px solid rgba(255,255,255,0.08)', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <button onClick={() => router.push('/app/cv-builder')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 14 }}>
              {t.coverLetter.sidebar.backToCv}
            </button>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>{t.coverLetter.sidebar.title}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              {t.coverLetter.sidebar.subtitle}
              <span style={{ fontSize: 10, fontWeight: 700, color: '#378ADD', background: 'rgba(55,138,221,0.18)', padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' as const }}>
                {CREDIT_COST.coverLetter} credit
              </span>
            </div>
            {jobLabel && (
              <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, color: accentColor, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>{t.coverLetter.sidebar.tailoringFor}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{jobLabel}</div>
                {(job as any)?.job_apply_link && (
                  <a href={(job as any).job_apply_link} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 6, fontSize: 10, color: accentColor, textDecoration: 'none', opacity: 0.85 }}>
                    ↗ {letterLang === 'DE' ? 'Vollständige Stellenanzeige öffnen' : 'Open full job posting'}
                  </a>
                )}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleCvFile(e.target.files[0])} />
            {!cvText ? (
              <div onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); e.dataTransfer.files?.[0] && handleCvFile(e.dataTransfer.files[0]) }}
                style={{ marginTop: 12, padding: '16px 12px', border: '1.5px dashed rgba(255,255,255,0.18)', borderRadius: 9, cursor: 'pointer', textAlign: 'center' }}>
                {fileLoading ? (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: accentColor, animation: 'spin 0.7s linear infinite' }} />
                    {t.coverLetter.sidebar.reading}
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}><SvgIcon name="document" size={20} color="rgba(255,255,255,0.5)" /></div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{t.coverLetter.sidebar.uploadCv}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{t.coverLetter.sidebar.uploadFormats}</div>
                  </>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 12, padding: '7px 10px', background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                  {cvFileName ? `✓ ${cvFileName}` : t.coverLetter.sidebar.cvLoaded}
                </span>
                <button onClick={() => { setCvText(''); setCvFileName(''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 16, padding: 0, flexShrink: 0, lineHeight: 1 }}>×</button>
              </div>
            )}
          </div>

          {/* Accordions */}
          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* SECTION: Contact Details */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggleSection('contact')}
                style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.contact ? accentColor + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.contact ? accentColor + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.contact ? accentColor : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>✎</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.contact ? '#fff' : 'rgba(255,255,255,0.55)' }}>
                    {letterLang === 'DE' ? 'Kontaktdaten' : 'Contact Details'}
                  </span>
                  {(contactName || contactEmail) && (
                    <span style={{ fontSize: 10, color: accentColor, fontWeight: 600 }}>✓ set</span>
                  )}
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', transform: openSections.contact ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.contact && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                    {letterLang === 'DE'
                      ? 'Korrigiere deine Kontaktdaten — diese werden oben im PDF/DOCX und im Anschreiben verwendet.'
                      : 'Correct your contact details — used in the PDF/DOCX header and passed to the letter generator.'}
                  </div>
                  {[
                    { label: letterLang === 'DE' ? 'Name' : 'Full Name', val: contactName, set: setContactName, ph: 'Jane Smith' },
                    { label: 'Email', val: contactEmail, set: setContactEmail, ph: 'jane@example.com' },
                    { label: letterLang === 'DE' ? 'Telefon' : 'Phone', val: contactPhone, set: setContactPhone, ph: '+49 123 456789' },
                  ].map(({ label, val, set, ph }) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>{label}</div>
                      <input
                        value={val}
                        onChange={e => set(e.target.value)}
                        placeholder={ph}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION: Style */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggleSection('style')}
                style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.style ? accentColor + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.style ? accentColor + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.style ? accentColor : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>01</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.style ? '#fff' : 'rgba(255,255,255,0.55)' }}>{t.coverLetter.sidebar.toneLabel}</span>
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
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.format ? '#fff' : 'rgba(255,255,255,0.55)' }}>{t.coverLetter.sidebar.formatLabel}</span>
                  <span style={{ fontSize: 10, color: accentColor, fontWeight: 600 }}>{letterLang} . {length}</span>
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', transform: openSections.format ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.format && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Language */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{t.coverLetter.sidebar.languageLabel}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['EN', 'DE'] as Lang[]).map(l => (
                        <button key={l} onClick={() => setLetterLang(l)}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${letterLang === l ? accentColor : 'rgba(255,255,255,0.1)'}`, background: letterLang === l ? accentColor + '20' : 'rgba(255,255,255,0.04)', color: letterLang === l ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: letterLang === l ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                          {l === 'EN' ? t.coverLetter.preview.english : t.coverLetter.preview.deutsch}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Length */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{t.coverLetter.sidebar.lengthLabel}</div>
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

          </div>

          {/* Generate button */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            {credits !== null && credits <= LOW_CREDIT_WARN && (
              <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, padding: '7px 10px', fontSize: 11, color: '#fcd34d', marginBottom: 8, lineHeight: 1.5 }}>
                {credits === 0 ? t.coverLetter.sidebar.noCredits : t.coverLetter.sidebar.lowCredits(credits!)}
              </div>
            )}
            <button className="cl-gen" onClick={handleGenerate} disabled={loading || !cvText.trim() || (credits !== null && credits < CL_COST)}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: loading || !cvText.trim() || (credits !== null && credits < CL_COST) ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${accentColor}, #1D9E75)`, color: loading || !cvText.trim() || (credits !== null && credits < CL_COST) ? 'rgba(255,255,255,0.25)' : '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: loading || !cvText.trim() || (credits !== null && credits < CL_COST) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading
                ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.7)', animation: 'spin 0.7s linear infinite' }} /> {t.coverLetter.sidebar.writing}</>
                : credits !== null && credits < CL_COST
                ? t.coverLetter.sidebar.needCredits(CL_COST, credits)
                : letter ? t.coverLetter.sidebar.regenerateBtn(CL_COST) : t.coverLetter.sidebar.generateBtn(CL_COST)}
            </button>
          </div>
        </div>

        {/* RIGHT PREVIEW */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#141E2B', overflow: 'hidden' }}>

          {/* Mobile sidebar toggle */}
          <div className="jl-mbtn" style={{ padding: '10px 16px', background: '#152233', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <button onClick={() => setMobOpen(o => !o)} style={{ background: '#1a2d45', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {mobOpen ? t.coverLetter.sidebar.closeSettings : t.coverLetter.sidebar.settings}
            </button>
          </div>
          {mobOpen && (
            <div className="jl-mob" style={{ background: 'linear-gradient(180deg, #152233 0%, #0e1a28 100%)', borderBottom: '1px solid rgba(255,255,255,0.1)', flexDirection: 'column', overflowY: 'auto', maxHeight: '70vh', padding: '16px', gap: 14 }}>
              {/* CV upload (mobile) */}
              {!cvText && (
                <div onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '14px 12px', border: '1.5px dashed rgba(255,255,255,0.18)', borderRadius: 9, cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'center' }}><SvgIcon name="document" size={18} color="rgba(255,255,255,0.5)" /></div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{fileLoading ? t.coverLetter.sidebar.reading : t.coverLetter.sidebar.uploadCv}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{t.coverLetter.sidebar.uploadFormats}</div>
                </div>
              )}
              {cvText && cvFileName && (
                <div style={{ padding: '7px 10px', background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
                  ✓ {cvFileName}
                </div>
              )}
              {/* Tone */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{t.coverLetter.sidebar.toneLabel}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {TONES.map(t => (
                    <button key={t.id} onClick={() => setTone(t.id)}
                      style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${tone === t.id ? accentColor : 'rgba(255,255,255,0.1)'}`, background: tone === t.id ? accentColor + '20' : 'rgba(255,255,255,0.04)', color: tone === t.id ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Language */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{t.coverLetter.sidebar.languageLabel}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['EN', 'DE'] as Lang[]).map(l => (
                    <button key={l} onClick={() => setLetterLang(l)}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${letterLang === l ? accentColor : 'rgba(255,255,255,0.1)'}`, background: letterLang === l ? accentColor + '20' : 'rgba(255,255,255,0.04)', color: letterLang === l ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: letterLang === l ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {l === 'EN' ? t.coverLetter.preview.english : t.coverLetter.preview.deutsch}
                    </button>
                  ))}
                </div>
              </div>
              {/* Length */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{t.coverLetter.sidebar.lengthLabel}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {LENGTHS.map(l => (
                    <button key={l.id} onClick={() => setLength(l.id)}
                      style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${length === l.id ? accentColor : 'rgba(255,255,255,0.1)'}`, background: length === l.id ? accentColor + '20' : 'rgba(255,255,255,0.04)', color: length === l.id ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Generate */}
              {credits !== null && credits <= LOW_CREDIT_WARN && (
                <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, padding: '7px 10px', fontSize: 11, color: '#fcd34d', lineHeight: 1.5 }}>
                  {credits === 0 ? t.coverLetter.sidebar.noCredits : t.coverLetter.sidebar.lowCredits(credits!)}
                </div>
              )}
              <button className="cl-gen" onClick={() => { handleGenerate(); setMobOpen(false) }} disabled={loading || !cvText.trim() || (credits !== null && credits < CL_COST)}
                style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: loading || !cvText.trim() || (credits !== null && credits < CL_COST) ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${accentColor}, #1D9E75)`, color: loading || !cvText.trim() || (credits !== null && credits < CL_COST) ? 'rgba(255,255,255,0.25)' : '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: loading || !cvText.trim() || (credits !== null && credits < CL_COST) ? 'not-allowed' : 'pointer' }}>
                {loading ? t.coverLetter.sidebar.writing : credits !== null && credits < CL_COST ? t.coverLetter.sidebar.needCredits(CL_COST, credits) : letter ? t.coverLetter.sidebar.regenerateBtn(CL_COST) : t.coverLetter.sidebar.generateBtn(CL_COST)}
              </button>
            </div>
          )}

          {/* Action bar */}
          <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#152233', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: letter ? '#1D9E75' : 'rgba(255,255,255,0.25)' }}>
                {letter ? t.coverLetter.preview.letterReady : t.coverLetter.preview.preview}
              </span>
              {letter && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
                  {TONES.find(t => t.id === tone)?.label} | {letterLang} | {length}
                </span>
              )}
            </div>
            {letter && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="cl-action" onClick={downloadPDF} disabled={downloading === 'pdf'}
                  style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: downloading === 'pdf' ? accentColor : 'rgba(255,255,255,0.55)', fontSize: 11, cursor: downloading === 'pdf' ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {downloading === 'pdf' ? t.coverLetter.preview.buildingPdf : t.coverLetter.preview.pdf}
                </button>
                <button className="cl-action" onClick={downloadDOCX} disabled={downloading === 'docx'}
                  style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: downloading === 'docx' ? accentColor : 'rgba(255,255,255,0.55)', fontSize: 11, cursor: downloading === 'docx' ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {downloading === 'docx' ? t.coverLetter.preview.buildingWord : t.coverLetter.preview.word}
                </button>
                <button onClick={goApply}
                  style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg, #1D9E75, #059669)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s' }}>
                  {t.coverLetter.preview.applyNow}
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
                  {t.coverLetter.preview.generating}
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
                    {cvText ? t.coverLetter.preview.readyToWrite : t.coverLetter.preview.noCvUploaded}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', lineHeight: 1.7 }}>
                    {cvText ? t.coverLetter.preview.chooseAndGenerate : t.coverLetter.preview.uploadFirst}
                  </div>
                  {cvText && (
                    <button onClick={handleGenerate} className="cl-gen"
                      disabled={credits !== null && credits < CL_COST}
                      style={{ marginTop: 20, padding: '11px 28px', borderRadius: 10, border: 'none', background: credits !== null && credits < CL_COST ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${accentColor}, #1D9E75)`, color: credits !== null && credits < CL_COST ? 'rgba(255,255,255,0.3)' : '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: credits !== null && credits < CL_COST ? 'not-allowed' : 'pointer' }}>
                      {credits !== null && credits < CL_COST ? `Need ${CL_COST} credit` : 'Generate Letter'}
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
                    <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>{t.coverLetter.preview.coverLetterLabel}</div>
                    {job && (
                      <div style={{ fontSize: 13, color: '#6b7c93', fontStyle: 'italic' }}>
                        {job.employer_name} - {job.job_title}
                      </div>
                    )}
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
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 8 }}>{t.coverLetter.preview.requestChanges}</div>
                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder={t.coverLetter.preview.feedbackPlaceholder}
                    rows={2}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '8px 10px', resize: 'vertical' as const, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' as const }}
                  />
                  <button
                    onClick={applyFeedback}
                    disabled={!feedback.trim() || applyingFeedback}
                    style={{ marginTop: 8, padding: '7px 18px', borderRadius: 7, border: 'none', background: feedback.trim() && !applyingFeedback ? accentColor : 'rgba(255,255,255,0.08)', color: feedback.trim() && !applyingFeedback ? '#042C53' : 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 700, cursor: feedback.trim() && !applyingFeedback ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif" }}>
                    {applyingFeedback ? t.coverLetter.preview.applying : t.coverLetter.preview.applyChanges}
                  </button>
                </div>

                {/* Footer actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap', paddingBottom: 32 }}>
                  <button onClick={downloadPDF} disabled={downloading === 'pdf'}
                    style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: downloading === 'pdf' ? accentColor : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: downloading === 'pdf' ? 'wait' : 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                    {downloading === 'pdf' ? t.coverLetter.preview.buildingPdf : t.coverLetter.preview.downloadPdf}
                  </button>
                  <button onClick={downloadDOCX} disabled={downloading === 'docx'}
                    style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: downloading === 'docx' ? accentColor : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: downloading === 'docx' ? 'wait' : 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                    {downloading === 'docx' ? t.coverLetter.preview.buildingWord : t.coverLetter.preview.downloadWord}
                  </button>
                  <button onClick={goApply}
                    style={{ padding: '10px 26px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #1D9E75, #059669)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: '0 6px 20px rgba(29,158,117,0.3)' }}>
                    {t.coverLetter.preview.applyNow}
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
