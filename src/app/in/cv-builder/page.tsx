'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCredits } from '@/lib/useCredits'
import CrossMarketModal from '@/components/CrossMarketModal'
import { CREDIT_COST, LOW_CREDIT_WARN, MARKET, SS, API } from '@/lib/constants'

const accent = '#FF9933'

type Template = 'clean' | 'saffron' | 'classic'
type Tone = 'professional' | 'concise' | 'detailed'
type Pages = '1' | '2'
type Lang = 'EN'

interface CVData {
  name: string
  title: string
  tagline: string
  email: string
  phone: string
  location: string
  linkedin: string
  summary: string
  stats: { label: string; value: string }[]
  skills: { name: string; level: number }[]
  experience: { role: string; company: string; period: string; location: string; type: string; bullets: string[] }[]
  education: { degree: string; school: string; year: string }[]
  certifications: string[]
  languages: { name: string; level: number }[]
  tools: string[]
  highlights: string[]
}

function IndiaCV({ cv, accent: ac }: { cv: CVData; accent: string }) {
  const navy = '#0d2137'
  const secHeader = (title: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 18 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: navy, letterSpacing: 1.5, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: '#d1dae6' }} />
    </div>
  )
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', padding: '40px 48px', minHeight: 900 }}>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: navy, letterSpacing: -0.3, lineHeight: 1.2 }}>{cv.name}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: ac, letterSpacing: 0.5, marginTop: 3, marginBottom: 5 }}>{cv.title}</div>
        <div style={{ fontSize: 11, color: '#6b7c93' }}>{[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join('  |  ')}</div>
      </div>
      <div style={{ height: 1, background: '#ccd5e0', marginBottom: 4 }} />
      {cv.summary && (
        <div>
          {secHeader('Summary')}
          <div style={{ fontSize: 11.5, color: '#374151', lineHeight: 1.8 }}>{cv.summary}</div>
        </div>
      )}
      {cv.skills.length > 0 && (
        <div>
          {secHeader('Skills')}
          <div style={{ fontSize: 11.5, color: '#374151', lineHeight: 1.7 }}>{cv.skills.map(s => s.name).join('  ·  ')}</div>
        </div>
      )}
      {cv.tools.length > 0 && (
        <div>
          {secHeader('Tech Stack')}
          <div style={{ fontSize: 11.5, color: ac, lineHeight: 1.7 }}>{cv.tools.join('  ·  ')}</div>
        </div>
      )}
      {cv.experience.length > 0 && (
        <div>
          {secHeader('Experience')}
          {cv.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: navy }}>{exp.role}</div>
                <div style={{ fontSize: 10, color: ac, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{exp.period}</div>
              </div>
              <div style={{ fontSize: 11, color: '#6b7c93', fontStyle: 'italic', marginBottom: 5 }}>{[exp.company, exp.location, exp.type].filter(Boolean).join('  ·  ')}</div>
              {exp.bullets.map((b, j) => (
                <div key={j} style={{ display: 'flex', gap: 7, marginBottom: 3, alignItems: 'flex-start' }}>
                  <span style={{ color: ac, fontSize: 11, flexShrink: 0, marginTop: 1 }}>•</span>
                  <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.65 }}>{b}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {cv.education.length > 0 && (
        <div>
          {secHeader('Education')}
          {cv.education.map((e, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: navy }}>{e.degree}</div>
                <div style={{ fontSize: 11, color: '#6b7c93' }}>{e.school}</div>
              </div>
              <div style={{ fontSize: 11, color: '#8fa3b8', flexShrink: 0, marginLeft: 8 }}>{e.year}</div>
            </div>
          ))}
        </div>
      )}
      {cv.certifications.length > 0 && (
        <div>
          {secHeader('Certifications')}
          {cv.certifications.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 4, alignItems: 'flex-start' }}>
              <span style={{ color: ac, fontSize: 11, flexShrink: 0 }}>•</span>
              <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.6 }}>{c}</span>
            </div>
          ))}
        </div>
      )}
      {cv.languages.length > 0 && (
        <div>
          {secHeader('Languages')}
          <div style={{ fontSize: 11.5, color: '#374151' }}>
            {cv.languages.map((l, i) => {
              const lv = l.level >= 90 ? 'Native' : l.level >= 75 ? 'Fluent' : l.level >= 55 ? 'Proficient' : 'Basic'
              return <span key={i}>{l.name} <span style={{ color: '#8fa3b8' }}>({lv})</span>{i < cv.languages.length - 1 ? '  ·  ' : ''}</span>
            })}
          </div>
        </div>
      )}
    </div>
  )
}
export default function IndiaCVBuilderPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const [cvText, setCvText] = useState('')
  const [cvFileName, setCvFileName] = useState('')
  const [fileLoading, setFileLoading] = useState(false)
  const [job, setJob] = useState<{ job_title: string; employer_name: string; job_description?: string } | null>(null)
  const [jobLabel, setJobLabel] = useState('')
  const [template, setTemplate] = useState<Template>('clean')
  const [tone, setTone] = useState<Tone>('professional')
  const [pages, setPages] = useState<Pages>('1')
  const lang: Lang = 'EN'
  const [cvData, setCvData] = useState<CVData | null>(null)
  const [rawCv, setRawCv] = useState('')
  const [loading, setLoading] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ template: false, style: false })
  const [feedback, setFeedback] = useState('')
  const [applyingFeedback, setApplyingFeedback] = useState(false)
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null)
  const [mobOpen, setMobOpen] = useState(false)
  const [atsFromScan, setAtsFromScan] = useState(false)
  const [atsSuggestions, setAtsSuggestions] = useState<{ missing_keywords: string[]; quick_fixes: string[]; format_issues?: string[]; section_gaps?: string[] } | null>(null)
  const [editingContact, setEditingContact] = useState(false)
  const [contactDraft, setContactDraft] = useState({ name: '', email: '', phone: '', location: '', linkedin: '' })
  const { credits, setCredits, needsCrossMarket, crossMarketAmount } = useCredits()
  const CV_COST = CREDIT_COST.tailorCv
  const [crossWarnPending, setCrossWarnPending] = useState<(() => void) | null>(null)

  async function handleCvFile(file: File) {
    setCvFileName(file.name); setCvText(''); setFileLoading(true)
    if (file.name.endsWith('.txt') || file.type === 'text/plain') {
      const r = new FileReader()
      r.onload = e => { const text = (e.target?.result as string) ?? ''; setCvText(text); sessionStorage.setItem(SS.cvText, text); setFileLoading(false) }
      r.readAsText(file)
    } else {
      const form = new FormData(); form.append('file', file)
      try {
        const res = await fetch(API.extractPdf, { method: 'POST', body: form })
        const data = await res.json()
        if (data.text) { setCvText(data.text); sessionStorage.setItem(SS.cvText, data.text) }
        else { alert(data.error || 'Could not read file.'); setCvFileName('') }
      } catch { alert('Failed to read file.'); setCvFileName('') }
      setFileLoading(false)
    }
  }

  function toggleSection(id: string) { setOpenSections(prev => ({ ...prev, [id]: !prev[id] })) }

  useEffect(() => {
    const sjs = sessionStorage.getItem(SS.sjsCvText) || ''
    const cvt = sessionStorage.getItem(SS.cvText) || ''
    const lnt = sessionStorage.getItem(SS.linkedinText) || ''
    const cv = sjs || cvt || lnt
    if (lnt && !sjs && !cvt) setCvFileName('LinkedIn Profile')
    const jobRaw = sessionStorage.getItem(SS.inSelectedJob) || sessionStorage.getItem(SS.cvbJob)
    const savedRole = sessionStorage.getItem(SS.sjsTargetRole) || ''
    setCvText(cv)
    if (jobRaw) { try { const p = JSON.parse(jobRaw); setJob(p); setJobLabel(`${p.employer_name} - ${p.job_title}`) } catch { } }
    else if (savedRole) setJobLabel(savedRole)
    const saved = sessionStorage.getItem(SS.cvbTailored)
    const savedData = sessionStorage.getItem(SS.cvbData)
    if (saved) setRawCv(saved)
    if (savedData) { try { setCvData(JSON.parse(savedData)) } catch { } }
    const atsRaw = sessionStorage.getItem(SS.atsSuggestions)
    if (atsRaw) {
      try {
        const s = JSON.parse(atsRaw)
        setAtsSuggestions(s)
        setTemplate('clean')
        setAtsFromScan(true)
      } catch {}
    }
  }, [])

  async function generate() {
    if (!cvText.trim()) return
    if (credits !== null && credits < CV_COST) { alert(`You need ${CV_COST} credit to build a CV.`); return }
    setLoading(true); setCvData(null); setRawCv('')
    const systemPrompt = `You are an elite CV designer. Extract and structure CV information into JSON for visual rendering.
Return ONLY valid JSON - no markdown, no backticks, no preamble.
Schema: {"name":"","title":"","tagline":"","email":"","phone":"","location":"","linkedin":"","summary":"","stats":[{"value":"","label":""}],"skills":[{"name":"","level":90}],"experience":[{"role":"","company":"","period":"","location":"","type":"","bullets":[""]}],"education":[{"degree":"","school":"","year":""}],"certifications":[""],"languages":[{"name":"","level":90}],"tools":[""],"highlights":[""]}
Rules:
- CONTACT FIELDS (email, phone, location, linkedin): copy EXACTLY from CV text. NEVER invent. Empty string if not found.
- skills: up to 12, level 60-99
- experience: include EVERY role, do not skip any
- bullets: 2-4 achievement-focused per role, action verbs
- tools: 10-20 specific technologies
- tone: ${tone}, language: ${lang}, pages: ${pages}
${job ? `- Tailor for: ${job.job_title} at ${job.employer_name}` : ''}
${job?.job_description ? `- Job context: ${job.job_description.slice(0, 800)}` : ''}
${atsSuggestions?.missing_keywords?.length ? `- ATS PRIORITY: Naturally incorporate these missing keywords into skills, bullets, and summary: ${atsSuggestions.missing_keywords.join(', ')}` : ''}
${atsSuggestions?.quick_fixes?.length ? `- ATS QUICK FIXES to apply:\n${atsSuggestions.quick_fixes.map((f: string) => `  * ${f}`).join('\n')}` : ''}
${atsSuggestions?.format_issues?.length ? `- ATS FORMAT ISSUES to fix: ${atsSuggestions.format_issues.join('; ')}` : ''}
${atsSuggestions?.section_gaps?.length ? `- ATS SECTION GAPS to address: ${atsSuggestions.section_gaps.join('; ')}` : ''}`
    try {
      const res = await fetch(API.tailorCv, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cvText, job, template, tone, pages, lang, systemPrompt, returnJson: true, market: MARKET.in }) })
      if (res.status === 402) { const d = await res.json(); if (typeof d.credits === 'number') setCredits(d.credits); setLoading(false); alert('Not enough credits.'); return }
      const data = await res.json()
      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining)
      const raw = data.cv || data.enhanced || data.result || ''
      setRawCv(raw); sessionStorage.setItem(SS.cvbTailored, raw)
      try { const parsed: CVData = JSON.parse(raw.replace(/```json|```/g, '').trim()); setCvData(parsed); sessionStorage.setItem(SS.cvbData, JSON.stringify(parsed)) } catch { setCvData(null) }
    } catch { setRawCv('Failed to generate.') }
    setLoading(false)
  }

  function handleGenerate() {
    if (needsCrossMarket(CV_COST, MARKET.in)) {
      setCrossWarnPending(() => generate)
    } else {
      generate()
    }
  }

  async function applyFeedback() {
    if (!feedback.trim() || !rawCv) return
    setApplyingFeedback(true)
    try {
      const atsContext = atsSuggestions?.missing_keywords?.length
        ? ` Also ensure these ATS keywords are present: ${atsSuggestions.missing_keywords.join(', ')}.`
        : ''
      const res = await fetch(API.tailorCv, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cvText, job, template, tone, pages, lang, systemPrompt: `Apply the feedback and return updated JSON matching the same schema. Return ONLY valid JSON.${atsContext}`, returnJson: true, feedback, currentCv: rawCv, market: MARKET.in }) })
      if (res.status === 402) { alert('Not enough credits.'); setApplyingFeedback(false); return }
      const data = await res.json()
      const raw = data.cv || ''
      setRawCv(raw); sessionStorage.setItem(SS.cvbTailored, raw)
      try { const parsed: CVData = JSON.parse(raw.replace(/```json|```/g, '').trim()); setCvData(parsed); sessionStorage.setItem(SS.cvbData, JSON.stringify(parsed)) } catch { }
      setFeedback('')
    } catch { }
    setApplyingFeedback(false)
  }

  async function downloadPDF() {
    if (!cvData || !previewRef.current) return
    setDownloading('pdf')
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const canvas = await html2canvas(previewRef.current, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
      })
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()
      const imgW = canvas.width
      const imgH = canvas.height
      const pageHeightPx = Math.floor(imgW * (pdfH / pdfW))
      let yOffset = 0; let firstPage = true
      while (yOffset < imgH) {
        const sliceH = Math.min(pageHeightPx, imgH - yOffset)
        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = imgW; pageCanvas.height = sliceH
        const ctx = pageCanvas.getContext('2d')!
        ctx.drawImage(canvas, 0, -yOffset)
        const imgData = pageCanvas.toDataURL('image/jpeg', 0.97)
        if (!firstPage) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, sliceH * (pdfW / imgW))
        yOffset += sliceH; firstPage = false
      }
      pdf.save(`CV_${(cvData.name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
    } catch (err) { console.error('PDF error:', err); alert('PDF generation failed.') }
    setDownloading(null)
  }

  async function downloadDOCX() {
    if (!cvData) return
    setDownloading('docx')
    try {
      const { Document, Packer, Paragraph, TextRun, BorderStyle } = await import('docx')
      const teal = '00A58A', navy = '0d2137', grey = '6b7c93'
      const sectionTitle = (text: string) => new Paragraph({ children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 18, color: navy, font: 'Calibri' })], spacing: { before: 240, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'dde4ee' } } })
      const bullet = (text: string) => new Paragraph({ children: [new TextRun({ text: '+ ', color: teal, bold: true, size: 18, font: 'Calibri' }), new TextRun({ text, size: 18, color: '374151', font: 'Calibri' })], spacing: { before: 40, after: 40 }, indent: { left: 200 } })
      const children: any[] = []
      children.push(new Paragraph({ children: [new TextRun({ text: cvData.name, bold: true, size: 48, color: navy, font: 'Calibri' })], spacing: { after: 60 } }))
      children.push(new Paragraph({ children: [new TextRun({ text: cvData.title, bold: true, size: 22, color: teal, font: 'Calibri' })], spacing: { after: 60 } }))
      const contact = [cvData.email, cvData.phone, cvData.location, cvData.linkedin].filter(Boolean)
      if (contact.length) children.push(new Paragraph({ children: [new TextRun({ text: contact.join('  |  '), size: 18, color: grey, font: 'Calibri' })], spacing: { after: 120 } }))
      if (cvData.stats?.length) children.push(new Paragraph({ children: cvData.stats.flatMap((s: { value: string; label: string }, i: number) => [new TextRun({ text: s.value, bold: true, size: 28, color: navy, font: 'Calibri' }), new TextRun({ text: ` ${s.label}`, size: 16, color: grey, font: 'Calibri' }), ...(i < cvData.stats.length - 1 ? [new TextRun({ text: '   |   ', size: 16, color: 'cccccc', font: 'Calibri' })] : [])]), spacing: { after: 160 } }))
      if (cvData.summary) { children.push(sectionTitle('Professional Summary')); children.push(new Paragraph({ children: [new TextRun({ text: cvData.summary, size: 18, color: '374151', font: 'Calibri' })], spacing: { after: 120 } })) }
      if (cvData.skills?.length) { children.push(sectionTitle('Core Skills')); children.push(new Paragraph({ children: [new TextRun({ text: cvData.skills.map((s: { name: string; level: number }) => `${s.name} (${s.level}%)`).join('  .  '), size: 18, color: '374151', font: 'Calibri' })], spacing: { after: 120 } })) }
      if (cvData.tools?.length) { children.push(sectionTitle('Tech Stack')); children.push(new Paragraph({ children: [new TextRun({ text: cvData.tools.join('  .  '), size: 18, color: '185FA5', font: 'Calibri' })], spacing: { after: 120 } })) }
      if (cvData.experience?.length) {
        children.push(sectionTitle('Professional Experience'))
        cvData.experience.forEach((exp: { role: string; company: string; period: string; location: string; type: string; bullets: string[] }) => {
          children.push(new Paragraph({ children: [new TextRun({ text: exp.role, bold: true, size: 22, color: navy, font: 'Calibri' }), new TextRun({ text: `  -  ${exp.period}`, size: 18, color: teal, font: 'Calibri' })], spacing: { before: 160, after: 40 } }))
          children.push(new Paragraph({ children: [new TextRun({ text: [exp.company, exp.location, exp.type].filter(Boolean).join('  .  '), size: 18, color: grey, italics: true, font: 'Calibri' })], spacing: { after: 60 } }))
          exp.bullets?.forEach((b: string) => children.push(bullet(b)))
          children.push(new Paragraph({ children: [], spacing: { after: 80 } }))
        })
      }
      if (cvData.education?.length) { children.push(sectionTitle('Education')); cvData.education.forEach((e: { degree: string; school: string; year: string }) => children.push(new Paragraph({ children: [new TextRun({ text: e.degree, bold: true, size: 20, color: navy, font: 'Calibri' }), new TextRun({ text: `  -  ${e.school}  (${e.year})`, size: 18, color: grey, font: 'Calibri' })], spacing: { after: 80 } }))) }
      if (cvData.certifications?.length) { children.push(sectionTitle('Certifications')); cvData.certifications.forEach((c: string) => children.push(new Paragraph({ children: [new TextRun({ text: '* ', color: teal, bold: true, size: 18, font: 'Calibri' }), new TextRun({ text: c, size: 18, color: '374151', font: 'Calibri' })], spacing: { after: 60 } }))) }
      if (cvData.languages?.length) { children.push(sectionTitle('Languages')); children.push(new Paragraph({ children: cvData.languages.flatMap((l: { name: string; level: number }, i: number) => { const level = l.level >= 90 ? 'Native' : l.level >= 75 ? 'Fluent' : l.level >= 55 ? 'Proficient' : 'Basic'; return [new TextRun({ text: l.name, bold: true, size: 18, color: navy, font: 'Calibri' }), new TextRun({ text: ` (${level})`, size: 18, color: grey, font: 'Calibri' }), ...(i < cvData.languages.length - 1 ? [new TextRun({ text: '   .   ', size: 18, color: 'cccccc', font: 'Calibri' })] : [])] }), spacing: { after: 80 } })) }
      const docx = new Document({ sections: [{ properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } }, children }] })
      const blob = await Packer.toBlob(docx)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `CV_${(job?.employer_name || cvData.name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')}.docx`; a.click(); URL.revokeObjectURL(url)
    } catch (err) { console.error('DOCX error:', err); alert('DOCX generation failed.') }
    setDownloading(null)
  }

  function goToCoverLetter() {
    sessionStorage.setItem(SS.cvbTailored, rawCv)
    if (job) sessionStorage.setItem(SS.cvbJob, JSON.stringify(job))
    router.push('/in/cover-letter')
  }
  function goToAtsCheck() {
    if (cvData) {
      const lines: string[] = []
      lines.push(cvData.name, cvData.title)
      const contact = [cvData.email, cvData.phone, cvData.location, cvData.linkedin].filter(Boolean)
      if (contact.length) lines.push(contact.join(' | '))
      if (cvData.summary) lines.push('\nSUMMARY', cvData.summary)
      if (cvData.skills?.length) lines.push('\nSKILLS', cvData.skills.map((s: { name: string }) => s.name).join(', '))
      if (cvData.tools?.length) lines.push('\nTECH STACK', cvData.tools.join(', '))
      if (cvData.experience?.length) {
        lines.push('\nEXPERIENCE')
        cvData.experience.forEach((exp: { role: string; company: string; period: string; bullets: string[] }) => {
          lines.push(`${exp.role} at ${exp.company} (${exp.period})`)
          exp.bullets?.forEach((b: string) => lines.push(`• ${b}`))
        })
      }
      if (cvData.education?.length) { lines.push('\nEDUCATION'); cvData.education.forEach((e: { degree: string; school: string; year: string }) => lines.push(`${e.degree} - ${e.school} (${e.year})`)) }
      if (cvData.certifications?.length) { lines.push('\nCERTIFICATIONS'); cvData.certifications.forEach((c: string) => lines.push(`• ${c}`)) }
      if (cvData.languages?.length) { lines.push('\nLANGUAGES'); lines.push(cvData.languages.map((l: { name: string }) => l.name).join(', ')) }
      sessionStorage.setItem(SS.cvText, lines.join('\n'))
    }
    sessionStorage.removeItem(SS.atsSuggestions)
    router.push('/in/career-scan')
  }

  const templates: { id: Template; label: string; accent: string; desc: string; ats: string; atsHigh: boolean }[] = [
    { id: 'clean',   label: 'Clean',   accent: '#1a5fa0', desc: 'Single column · Blue accents',    ats: 'ATS: High ✓', atsHigh: true },
    { id: 'saffron', label: 'Saffron', accent: '#FF9933', desc: 'Single column · Saffron accents', ats: 'ATS: High ✓', atsHigh: true },
    { id: 'classic', label: 'Classic', accent: '#1a1a1a', desc: 'Single column · Black & white',   ats: 'ATS: High ✓', atsHigh: true },
  ]
  const tones: { id: Tone; label: string; desc: string }[] = [
    { id: 'professional', label: 'Professional', desc: 'Polished & credible' },
    { id: 'concise', label: 'Concise', desc: 'Sharp & efficient' },
    { id: 'detailed', label: 'Detailed', desc: 'Thorough & expansive' },
  ]
  function renderCV() {
    if (!cvData) return null
    const acc = templates.find(t => t.id === template)?.accent || '#1a5fa0'
    return <IndiaCV cv={cvData} accent={acc} />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F1923', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@300;400;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .cvb-gen:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(0,0,0,0.4) !important; }
        .cvb-action:hover { background: rgba(255,255,255,0.1) !important; }
        .shimmer { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%); background-size:200% 100%; animation: shimmer 1.5s infinite; border-radius:4px; }
        .cv-preview { animation: fadeUp 0.35s ease; }
        .jl-dsb { display: flex !important; }
        .jl-mob { display: none !important; }
        .jl-mbtn { display: none !important; }
        @media (max-width: 768px) {
          .jl-dsb { display: none !important; }
          .jl-mob { display: flex !important; }
          .jl-mbtn { display: block !important; }
        }
      `}</style>

      {crossWarnPending && (
        <CrossMarketModal
          cost={CV_COST}
          market={MARKET.in}
          crossAmount={crossMarketAmount(CV_COST, MARKET.in)}
          onConfirm={() => { const fn = crossWarnPending; setCrossWarnPending(null); fn() }}
          onCancel={() => setCrossWarnPending(null)}
        />
      )}

      <div style={{ display: 'flex', height: 'calc(100vh - 52px)' }}>

        {/* LEFT PANEL */}
        <div className="jl-dsb" style={{ width: 288, flexShrink: 0, background: 'linear-gradient(180deg, #152233 0%, #0e1a28 100%)', borderRight: '1px solid rgba(255,255,255,0.08)', flexDirection: 'column' }}>
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <button onClick={() => router.push('/in/career-scan')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>{'<'}- Back to ATS Score</button>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>CV Studio</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Design your perfect CV</div>
            {jobLabel && <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}><div style={{ fontSize: 9, color: accent, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>Tailoring for</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{jobLabel}</div></div>}
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleCvFile(e.target.files[0])} />
            {!cvText ? (
              <div onClick={() => fileInputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); e.dataTransfer.files?.[0] && handleCvFile(e.dataTransfer.files[0]) }}
                style={{ marginTop: 12, padding: '16px 12px', border: '1.5px dashed rgba(255,255,255,0.18)', borderRadius: 9, cursor: 'pointer', textAlign: 'center' }}>
                {fileLoading ? <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: accent, animation: 'spin 0.7s linear infinite' }} />Reading...</div>
                  : <><div style={{ fontSize: 20, marginBottom: 6 }}>📄</div><div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Upload your CV</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>PDF · DOCX · TXT</div></>}
              </div>
            ) : (
              <div style={{ marginTop: 12, padding: '7px 10px', background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>✓ {cvFileName || 'CV loaded'}</span>
                <button onClick={() => { setCvText(''); setCvFileName(''); if (fileInputRef.current) fileInputRef.current.value = '' }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 16, padding: 0, flexShrink: 0 }}>×</button>
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggleSection('template')} style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.template ? accent + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.template ? accent + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.template ? accent : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>01</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.template ? '#fff' : 'rgba(255,255,255,0.55)' }}>Template</span>
                  <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{templates.find(t => t.id === template)?.label}</span>
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', transform: openSections.template ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.template && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {atsFromScan && (
                    <div style={{ padding: '7px 10px', background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, fontSize: 11, color: '#1D9E75', lineHeight: 1.4, marginBottom: 4 }}>
                      Template selected for best ATS compatibility
                    </div>
                  )}
                  {atsSuggestions && (
                    <div style={{ padding: '10px 12px', background: 'rgba(255,153,51,0.08)', border: '1px solid rgba(255,153,51,0.25)', borderRadius: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>ATS Inputs Active</div>
                      {atsSuggestions.missing_keywords?.length > 0 && (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>KEYWORDS TO ADD</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {atsSuggestions.missing_keywords.slice(0, 8).map((kw: string, i: number) => (
                              <span key={i} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,153,51,0.15)', color: accent, border: '1px solid rgba(255,153,51,0.3)', fontWeight: 600 }}>{kw}</span>
                            ))}
                            {atsSuggestions.missing_keywords.length > 8 && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>+{atsSuggestions.missing_keywords.length - 8} more</span>}
                          </div>
                        </div>
                      )}
                      {atsSuggestions.quick_fixes?.length > 0 && (
                        <div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>FIXES APPLIED</div>
                          {atsSuggestions.quick_fixes.slice(0, 3).map((fix: string, i: number) => (
                            <div key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginBottom: 2, lineHeight: 1.4 }}>• {fix}</div>
                          ))}
                          {atsSuggestions.quick_fixes.length > 3 && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>+{atsSuggestions.quick_fixes.length - 3} more fixes</div>}
                        </div>
                      )}
                    </div>
                  )}
                  {templates.map(t => (
                    <div key={t.id} onClick={() => setTemplate(t.id)} style={{ padding: '10px 12px', borderRadius: 9, border: `1px solid ${template === t.id ? t.accent : 'rgba(255,255,255,0.09)'}`, background: template === t.id ? t.accent + '14' : 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 48, borderRadius: 4, background: '#1a2535', flexShrink: 0, overflow: 'hidden', border: `1px solid ${template === t.id ? t.accent + '60' : 'rgba(255,255,255,0.07)'}` }}>
                        <div style={{ padding: '5px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ height: 5, background: 'rgba(255,255,255,0.6)', borderRadius: 1, width: '70%' }} />
                          <div style={{ height: 2, background: t.accent + '80', borderRadius: 1, width: '40%', marginBottom: 2 }} />
                          <div style={{ height: 0.5, background: 'rgba(255,255,255,0.2)', marginBottom: 2 }} />
                          {[90,70,85,60,95,75,80,65].map((w, i) => (
                            <div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.12)', borderRadius: 1, width: `${w}%` }} />
                          ))}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: template === t.id ? '#fff' : 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{t.label}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.3 }}>{t.desc}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: t.atsHigh ? '#1D9E75' : '#E05C97', marginTop: 3, letterSpacing: 0.3 }}>{t.ats}</div>
                      </div>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${template === t.id ? t.accent : 'rgba(255,255,255,0.15)'}`, background: template === t.id ? t.accent : 'transparent', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggleSection('style')} style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.style ? accent + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.style ? accent + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.style ? accent : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>02</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.style ? '#fff' : 'rgba(255,255,255,0.55)' }}>Style & Format</span>
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', transform: openSections.style ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.style && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Tone</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {tones.map(t => (
                        <div key={t.id} onClick={() => setTone(t.id)} style={{ padding: '9px 11px', borderRadius: 8, border: `1px solid ${tone === t.id ? accent : 'rgba(255,255,255,0.08)'}`, background: tone === t.id ? accent + '14' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div><div style={{ fontSize: 12, fontWeight: 600, color: tone === t.id ? '#fff' : 'rgba(255,255,255,0.6)' }}>{t.label}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{t.desc}</div></div>
                          <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${tone === t.id ? accent : 'rgba(255,255,255,0.2)'}`, background: tone === t.id ? accent : 'transparent', flexShrink: 0 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Length</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['1', '2'] as Pages[]).map(p => <button key={p} onClick={() => setPages(p)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${pages === p ? accent : 'rgba(255,255,255,0.1)'}`, background: pages === p ? accent + '20' : 'rgba(255,255,255,0.04)', color: pages === p ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: pages === p ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{p === '1' ? '1 Page' : '2 Pages'}</button>)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            {credits !== null && credits <= LOW_CREDIT_WARN && <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, padding: '7px 10px', fontSize: 11, color: '#fcd34d', marginBottom: 8, lineHeight: 1.5 }}>{credits === 0 ? 'No credits left. Top up on Account page.' : `${credits} credit${credits === 1 ? '' : 's'} remaining.`}</div>}
            <button className="cvb-gen" onClick={handleGenerate} disabled={loading || !cvText.trim() || (credits !== null && credits < CV_COST)}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: loading || !cvText.trim() || (credits !== null && credits < CV_COST) ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${accent}, #e67300)`, color: loading || !cvText.trim() || (credits !== null && credits < CV_COST) ? 'rgba(255,255,255,0.25)' : '#042C53', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: loading || !cvText.trim() || (credits !== null && credits < CV_COST) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.6)', animation: 'spin 0.7s linear infinite' }} />Generating...</> : credits !== null && credits < CV_COST ? `Need ${CV_COST} credit — you have ${credits}` : cvData ? `Regenerate CV (${CV_COST} credit)` : `Generate CV (${CV_COST} credit)`}
            </button>
          </div>
        </div>

        {/* RIGHT PREVIEW */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#141E2B', overflow: 'hidden' }}>
          <div className="jl-mbtn" style={{ padding: '10px 16px', background: '#152233', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <button onClick={() => setMobOpen(o => !o)} style={{ background: '#1a2d45', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{mobOpen ? 'Close Settings' : 'CV Settings'}</button>
          </div>
          {mobOpen && (
            <div className="jl-mob" style={{ background: 'linear-gradient(180deg, #152233 0%, #0e1a28 100%)', borderBottom: '1px solid rgba(255,255,255,0.1)', flexDirection: 'column', overflowY: 'auto', maxHeight: '70vh', padding: '16px', gap: 14 }}>
              {!cvText && <div onClick={() => fileInputRef.current?.click()} style={{ padding: '14px 12px', border: '1.5px dashed rgba(255,255,255,0.18)', borderRadius: 9, cursor: 'pointer', textAlign: 'center' }}><div style={{ fontSize: 18, marginBottom: 4 }}>📄</div><div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{fileLoading ? 'Reading...' : 'Upload your CV'}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>PDF · DOCX · TXT</div></div>}
              {cvText && cvFileName && <div style={{ padding: '7px 10px', background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>✓ {cvFileName}</div>}
              <div><div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Template</div><div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{templates.map(t => <button key={t.id} onClick={() => setTemplate(t.id)} style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${template === t.id ? t.accent : 'rgba(255,255,255,0.1)'}`, background: template === t.id ? t.accent + '20' : 'rgba(255,255,255,0.04)', color: template === t.id ? '#fff' : 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: template === t.id ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>{t.label} <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>{t.desc}</span></button>)}</div></div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Pages</div>
                <div style={{ display: 'flex', gap: 6 }}>{(['1', '2'] as Pages[]).map(p => <button key={p} onClick={() => setPages(p)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${pages === p ? accent : 'rgba(255,255,255,0.1)'}`, background: pages === p ? accent + '20' : 'rgba(255,255,255,0.04)', color: pages === p ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: pages === p ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>{p}p</button>)}</div>
              </div>
              <button className="cvb-gen" onClick={() => { handleGenerate(); setMobOpen(false) }} disabled={loading || !cvText.trim() || (credits !== null && credits < CV_COST)}
                style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: loading || !cvText.trim() || (credits !== null && credits < CV_COST) ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${accent}, #e67300)`, color: loading || !cvText.trim() || (credits !== null && credits < CV_COST) ? 'rgba(255,255,255,0.25)' : '#042C53', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: loading || !cvText.trim() || (credits !== null && credits < CV_COST) ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Generating...' : credits !== null && credits < CV_COST ? `Need ${CV_COST} credit` : cvData ? `Regenerate CV (${CV_COST} credit)` : `Generate CV (${CV_COST} credit)`}
              </button>
            </div>
          )}

          <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#152233', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: cvData ? accent : 'rgba(255,255,255,0.25)' }}>{cvData ? 'CV Ready' : 'Preview'}</span>
              {cvData && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>{templates.find(t => t.id === template)?.label} | {lang} | {pages}p</span>}
            </div>
            {cvData && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="cvb-action" onClick={downloadPDF} disabled={downloading === 'pdf'} style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: downloading === 'pdf' ? accent : 'rgba(255,255,255,0.55)', fontSize: 11, cursor: downloading === 'pdf' ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{downloading === 'pdf' ? 'Building...' : 'PDF'}</button>
                <button className="cvb-action" onClick={downloadDOCX} disabled={downloading === 'docx'} style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: downloading === 'docx' ? accent : 'rgba(255,255,255,0.55)', fontSize: 11, cursor: downloading === 'docx' ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{downloading === 'docx' ? 'Building...' : 'Word'}</button>
                <button className="cvb-action" onClick={goToAtsCheck} style={{ padding: '7px 14px', borderRadius: 7, border: `1px solid ${accent}60`, background: accent + '14', color: accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>ATS Check</button>
                <button onClick={goToCoverLetter} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: accent, color: '#042C53', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Cover Letter {'->'}</button>
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', display: 'flex', justifyContent: 'center' }}>
            {loading && (
              <div style={{ width: '100%', maxWidth: 740 }}>
                <div style={{ background: '#1C2A3A', borderRadius: 14, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
                  <div style={{ display: 'flex', minHeight: 700 }}>
                    <div style={{ width: 200, background: 'rgba(0,0,0,0.3)', padding: '28px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="shimmer" style={{ width: 60, height: 60, borderRadius: '50%', alignSelf: 'center', marginBottom: 8 }} />
                      {[80,60,90,70,55,80,65].map((w,i) => <div key={i} className="shimmer" style={{ height: i % 3 === 0 ? 8 : 5, width: `${w}%` }} />)}
                    </div>
                    <div style={{ flex: 1, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div className="shimmer" style={{ height: 20, width: '55%', marginBottom: 4 }} />
                      <div className="shimmer" style={{ height: 10, width: '35%', marginBottom: 16 }} />
                      {[100,85,95,70,100,80,90,65,100,75,85,60,95].map((w,i) => <div key={i} className="shimmer" style={{ height: i % 5 === 0 ? 12 : 7, width: `${w}%`, animationDelay: `${i * 0.07}s` }} />)}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${accent}40`, borderTopColor: accent, animation: 'spin 0.7s linear infinite' }} />
                  Designing your CV...
                </div>
              </div>
            )}

            {!loading && !cvData && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 20 }}>
                <div style={{ width: 300, opacity: 0.5, position: 'relative' }}>
                  <div style={{ background: '#1C2A3A', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
                    <div style={{ display: 'flex', height: 320 }}>
                      <div style={{ width: 90, background: `${accent}15`, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: accent + '30', margin: '0 auto 8px' }} />
                        {[80,65,75,55,80,65,70,55].map((w,i) => <div key={i} style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, width: `${w}%` }} />)}
                      </div>
                      <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ height: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 3, width: '60%' }} />
                        <div style={{ height: 6, background: accent + '40', borderRadius: 2, width: '40%', marginBottom: 8 }} />
                        {[100,80,90,65,100,75,85,60,95,70].map((w,i) => <div key={i} style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 2, width: `${w}%` }} />)}
                      </div>
                    </div>
                  </div>
                  <div style={{ position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)', width: 160, height: 30, background: accent, borderRadius: '50%', filter: 'blur(24px)', opacity: 0.2 }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>{cvText ? 'Ready to design' : 'No CV uploaded'}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', lineHeight: 1.7 }}>{cvText ? 'Choose your template and click Generate CV' : 'Upload your CV using the panel on the left'}</div>
                  {cvText && <button onClick={handleGenerate} className="cvb-gen" disabled={credits !== null && credits < CV_COST} style={{ marginTop: 20, padding: '11px 28px', borderRadius: 10, border: 'none', background: credits !== null && credits < CV_COST ? 'rgba(255,255,255,0.1)' : accent, color: credits !== null && credits < CV_COST ? 'rgba(255,255,255,0.3)' : '#0a1520', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: credits !== null && credits < CV_COST ? 'not-allowed' : 'pointer' }}>{credits !== null && credits < CV_COST ? `Need ${CV_COST} credit` : 'Generate CV'}</button>}
                </div>
              </div>
            )}

            {!loading && cvData && (
              <div className="cv-preview" style={{ width: '100%', maxWidth: 740 }}>
                <div ref={previewRef} style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)' }}>
                  {renderCV()}
                </div>
                {/* Free contact info editor */}
                <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingContact ? 12 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' as const }}>Contact Info</div>
                    <button onClick={() => {
                      if (!editingContact) setContactDraft({ name: cvData?.name || '', email: cvData?.email || '', phone: cvData?.phone || '', location: cvData?.location || '', linkedin: cvData?.linkedin || '' })
                      setEditingContact(e => !e)
                    }} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${accent}50`, background: 'transparent', color: accent, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {editingContact ? 'Cancel' : 'Edit — free'}
                    </button>
                  </div>
                  {editingContact && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(['name', 'email', 'phone', 'location', 'linkedin'] as const).map(field => (
                        <div key={field}>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{field}</div>
                          <input value={contactDraft[field]} onChange={e => setContactDraft(d => ({ ...d, [field]: e.target.value }))}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#E6F1FB', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
                        </div>
                      ))}
                      <button onClick={() => {
                        if (!cvData) return
                        const updated = { ...cvData, ...contactDraft }
                        setCvData(updated)
                        sessionStorage.setItem(SS.cvbData, JSON.stringify(updated))
                        setEditingContact(false)
                      }} style={{ padding: '8px 0', borderRadius: 7, border: 'none', background: accent, color: '#042C53', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                        Save contact info
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 8 }}>Request changes</div>
                  <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="e.g. Make the summary shorter, highlight technical skills more…" rows={2}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '8px 10px', resize: 'vertical' as const, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' as const }} />
                  <button onClick={applyFeedback} disabled={!feedback.trim() || applyingFeedback}
                    style={{ marginTop: 8, padding: '7px 18px', borderRadius: 7, border: 'none', background: feedback.trim() && !applyingFeedback ? accent : 'rgba(255,255,255,0.08)', color: feedback.trim() && !applyingFeedback ? '#042C53' : 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 700, cursor: feedback.trim() && !applyingFeedback ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif" }}>
                    {applyingFeedback ? 'Applying…' : 'Apply changes — 1 credit'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap', paddingBottom: 32 }}>
                  <button onClick={downloadPDF} disabled={downloading === 'pdf'} style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: downloading === 'pdf' ? accent : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: downloading === 'pdf' ? 'wait' : 'pointer', fontFamily: "'Outfit', sans-serif" }}>{downloading === 'pdf' ? 'Building PDF...' : 'Download PDF'}</button>
                  <button onClick={downloadDOCX} disabled={downloading === 'docx'} style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: downloading === 'docx' ? accent : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: downloading === 'docx' ? 'wait' : 'pointer', fontFamily: "'Outfit', sans-serif" }}>{downloading === 'docx' ? 'Building Word...' : 'Download Word'}</button>
                  <button onClick={goToAtsCheck} style={{ padding: '10px 22px', borderRadius: 9, border: `1px solid ${accent}50`, background: accent + '15', color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Check ATS Score</button>
                  <button onClick={goToCoverLetter} style={{ padding: '10px 26px', borderRadius: 9, border: 'none', background: accent, color: '#042C53', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: `0 6px 20px ${accent}40` }}>Write Cover Letter {'->'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
