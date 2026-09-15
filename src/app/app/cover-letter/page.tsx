'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { useCredits } from '@/lib/useCredits'
import { useCurrentCv } from '@/lib/useCurrentCv'
import { useLanguage } from '@/lib/i18n'
import CrossMarketModal from '@/components/CrossMarketModal'
import FlowError from '@/components/FlowError'
import { CREDIT_COST, LOW_CREDIT_WARN, MARKET, SS, API } from '@/lib/constants'
import type { BundleState } from '@/lib/pricingCore'
import { cvTextFromTailored } from '@/lib/cv'
import { readJob, writeJob, normalizeJob, type JobRef } from '@/lib/job'
import { readJsonOrError } from '@/lib/apiError'
import { downloadLetterPdf } from '@/lib/letterPdf'
import { c } from '@/lib/theme'
import SvgIcon from '@/components/SvgIcon'

type Tone = 'confident' | 'formal' | 'warm'
type Length = 'short' | 'medium' | 'long'
type Lang = 'EN' | 'DE'

const TONE_IDS: Tone[] = ['confident', 'formal', 'warm']
const LENGTH_IDS: Length[] = ['short', 'medium', 'long']

interface LetterResponse {
  coverLetter?: string
  letter?: string
  result?: string
  creditsRemaining?: number
  pricing?: { bundle?: BundleState; admin?: boolean }
}

export default function CoverLetterPage() {
  const router = useRouter()
  const { t, lang } = useLanguage()

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
  const { cvText: baseCvText, fileName: cvFileName, source: cvSource, rememberedConsent, setCv, extractFile } = useCurrentCv()
  // The CV Builder's tailored output wins over the shared CV for this page (plain text, never raw JSON)
  const [tailoredCv, setTailoredCv] = useState('')
  const cvText = tailoredCv || baseCvText
  const [saveConsent, setSaveConsent] = useState(false)
  const [cvNotice, setCvNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [job, setJob] = useState<JobRef | null>(null)
  const [manualTitle, setManualTitle] = useState('')
  const [manualEmployer, setManualEmployer] = useState('')
  const [manualDesc, setManualDesc] = useState('')
  const [tone, setTone] = useState<Tone>('confident')
  const [length, setLength] = useState<Length>('medium')
  const [letterLang, setLetterLang] = useState<Lang>('EN')
  const [letter, setLetter] = useState('')
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null)
  const [feedback, setFeedback] = useState('')
  const [applyingFeedback, setApplyingFeedback] = useState(false)
  const [generateError, setGenerateError] = useState<{ message: string; status: number } | null>(null)
  const { credits, setCredits, needsCrossMarket, crossMarketAmount } = useCredits()
  const CL_COST = CREDIT_COST.coverLetter
  // Server-decided package state for this job (src/lib/pricing.ts). Null until the first
  // fetch resolves — the UI then falls back to the "charged" copy, never to "included".
  const [pricing, setPricing] = useState<{ bundle: BundleState; admin: boolean } | null>(null)
  const [crossWarnPending, setCrossWarnPending] = useState<(() => void) | null>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ contact: false, style: false, format: false })
  const [contactName,  setContactName]  = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [mobOpen, setMobOpen] = useState(false)

  const jobLabel = job ? `${job.employer_name} - ${job.job_title}` : ''

  useEffect(() => {
    try {
      setTailoredCv(cvTextFromTailored(sessionStorage.getItem(SS.cvbTailored) || ''))
      const saved = sessionStorage.getItem(SS.clLetter)
      if (saved) setLetter(saved)
    } catch {
      // storage unavailable — page still works with the account CV
    }
    setJob(readJob())
  }, [])

  useEffect(() => { setSaveConsent(rememberedConsent) }, [rememberedConsent])

  // Auto-extract contact details from the CV — only fills fields the user has not typed into
  useEffect(() => {
    if (!cvText) return
    const emailM = cvText.match(/[\w.+\-]+@[\w\-]+(?:\.[\w\-]+)+/i)
    if (emailM) setContactEmail(prev => prev || emailM[0].toLowerCase())
    const phoneM = cvText.match(/(?:\+\d{1,3}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,5}[\s\-.]?\d{3,5}(?:[\s\-.]?\d{1,4})?/)
    if (phoneM) setContactPhone(prev => prev || phoneM[0].trim())
    for (const line of cvText.split('\n')) {
      const s = line.trim()
      if (s.length > 2 && s.length < 55 && !s.includes('@') && !/\d/.test(s) && /[A-Za-z]/.test(s)) {
        const words = s.split(/\s+/)
        if (words.length >= 2 && words.length <= 5) { setContactName(prev => prev || s); break }
      }
    }
  }, [cvText])

  // Ask the server what this job costs right now, so the button shows the right price
  // before the click. Best-effort: on failure the page keeps the "charged" copy.
  const jobTitle = job?.job_title ?? ''
  const jobEmployer = job?.employer_name ?? ''
  useEffect(() => {
    let cancelled = false
    fetch(API.pricingBundle, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Empty title + employer hashes to the same 'nojob' key as job: null server-side
      body: JSON.stringify({ job: { job_title: jobTitle, employer_name: jobEmployer } }),
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data?.bundle) return
        setPricing({ bundle: data.bundle as BundleState, admin: !!data.admin })
      })
      .catch(() => { /* silent — pricing preview is best-effort */ })
    return () => { cancelled = true }
  }, [jobTitle, jobEmployer])

  function applyPricing(data: { pricing?: { bundle?: BundleState; admin?: boolean } }) {
    if (data?.pricing?.bundle) setPricing({ bundle: data.pricing.bundle, admin: !!data.pricing.admin })
  }

  const isAdmin = !!pricing?.admin
  const bundleActive = !!pricing?.bundle.active
  const revisionsLeft = pricing?.bundle.revisionsLeft ?? 0
  const changeIncluded = bundleActive && revisionsLeft > 0
  const letterIncluded = bundleActive && !pricing?.bundle.coverLetterUsed
  // Credit gates only apply when the call will actually be charged; admins bypass deduction server-side
  const genBlocked = !letterIncluded && !isAdmin && credits !== null && credits < CL_COST
  const changeBlocked = !changeIncluded && !isAdmin && credits !== null && credits < CL_COST
  const until = (() => {
    const iso = pricing?.bundle.expiresAt
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const now = new Date()
    const time = d.toLocaleTimeString(lang === 'DE' ? 'de-DE' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
    const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
    return sameDay ? time : `${lang === 'DE' ? 'morgen' : 'tomorrow'} ${time}`
  })()

  function toggleSection(id: string) {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleCvFile(file: File) {
    setFileLoading(true)
    setCvNotice(null)
    try {
      const out = await extractFile(file)
      if ('error' in out) { setCvNotice({ kind: 'error', text: out.error }); return }
      if (out.text.trim().length < 50) { setCvNotice({ kind: 'error', text: t.cv.tooShort }); return }
      // An uploaded CV is an explicit choice — it replaces the CV Builder's tailored text for this page
      setTailoredCv('')
      const res = await setCv(out.text, file.name, { saveToAccount: saveConsent })
      if (saveConsent) {
        setCvNotice(res.saved ? { kind: 'ok', text: t.cv.saved } : { kind: 'error', text: t.cv.saveFailed(res.error || '') })
      }
    } finally {
      setFileLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function saveManualJob() {
    const next = normalizeJob({
      job_title: manualTitle,
      employer_name: manualEmployer,
      job_description: manualDesc,
      job_source: 'manual',
    })
    if (!next) return
    writeJob(next)
    setJob(next)
  }

  function failWith(out: { status: number; message: string; credits?: number }) {
    if (out.status === 402 && typeof out.credits === 'number') setCredits(out.credits)
    setGenerateError({ message: out.message, status: out.status })
  }

  function storeLetter(cl: string) {
    setLetter(cl)
    try { sessionStorage.setItem(SS.clLetter, cl) } catch {}
  }

  async function generate() {
    if (!cvText.trim()) return
    if (genBlocked) { setGenerateError({ message: t.coverLetter.sidebar.needCredits(CL_COST, credits ?? 0), status: 402 }); return }
    setLoading(true); setGenerateError(null)
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
      const out = await readJsonOrError<LetterResponse>(res)
      if (out.data && typeof out.data === 'object') applyPricing(out.data as LetterResponse)
      // Server already refunded on failure — keep the previous letter on screen
      if (!out.ok) { failWith(out); return }
      if (typeof out.data.creditsRemaining === 'number') setCredits(out.data.creditsRemaining)
      const cl = (out.data.coverLetter || out.data.letter || out.data.result || '').trim()
      if (!cl) { setGenerateError({ message: t.common.requestFailed(res.status), status: res.status }); return }
      storeLetter(cl)
    } catch { setGenerateError({ message: t.common.networkError, status: 0 }) }
    finally { setLoading(false) }
  }

  function handleGenerate() {
    // Nothing is deducted when the letter is included (or for admins) — no cross-market confirmation needed
    if (letterIncluded || isAdmin) { generate(); return }
    if (needsCrossMarket(CL_COST, MARKET.eu)) {
      setCrossWarnPending(() => generate)
    } else {
      generate()
    }
  }

  async function applyFeedback() {
    if (!feedback.trim() || !letter) return
    if (changeBlocked) { setGenerateError({ message: t.coverLetter.sidebar.needCredits(CL_COST, credits ?? 0), status: 402 }); return }
    setApplyingFeedback(true); setGenerateError(null)
    try {
      const res = await fetch(API.coverLetter, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, job, tone, length, lang: letterLang, feedback, currentLetter: letter, market: MARKET.eu }),
      })
      const out = await readJsonOrError<LetterResponse>(res)
      if (out.data && typeof out.data === 'object') applyPricing(out.data as LetterResponse)
      if (!out.ok) { failWith(out); return }
      if (typeof out.data.creditsRemaining === 'number') setCredits(out.data.creditsRemaining)
      const cl = (out.data.coverLetter || out.data.letter || '').trim()
      if (!cl) { setGenerateError({ message: t.common.requestFailed(res.status), status: res.status }); return }
      storeLetter(cl)
      setFeedback('')
    } catch { setGenerateError({ message: t.common.networkError, status: 0 }) }
    finally { setApplyingFeedback(false) }
  }

  function handleApplyFeedback() {
    if (changeIncluded || isAdmin) { applyFeedback(); return }
    if (needsCrossMarket(CL_COST, MARKET.eu)) {
      setCrossWarnPending(() => applyFeedback)
    } else {
      applyFeedback()
    }
  }

  async function downloadPDF() {
    if (!letter) return
    setDownloading('pdf'); setDownloadError('')
    try {
      await downloadLetterPdf({
        letter,
        name: contactName,
        contact: [contactEmail, contactPhone].filter(Boolean).join('  ·  '),
        jobTitle: job?.job_title,
        employer: job?.employer_name,
      })
    } catch (err) {
      console.error('PDF error:', err)
      setDownloadError(lang === 'DE' ? 'PDF konnte nicht erstellt werden. Bitte erneut versuchen.' : 'PDF generation failed. Please try again.')
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

      const children: InstanceType<typeof Paragraph>[] = []

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
      setDownloadError(lang === 'DE' ? 'Word-Datei konnte nicht erstellt werden. Bitte erneut versuchen.' : 'Word generation failed. Please try again.')
    }
    setDownloading(null)
  }

  function goApply() {
    if (letter.trim()) {
      try { sessionStorage.setItem(SS.clLetter, letter) } catch {}
    }
    router.push('/app/apply-now')
  }

  const cvSourceLabel = tailoredCv
    ? (lang === 'DE' ? 'Optimierter Lebenslauf aus dem CV Builder' : 'Tailored CV from the CV Builder')
    : cvFileName
    ? t.cv.onFile(cvFileName)
    : cvSource === 'saved'
    ? t.cv.usingSaved
    : t.coverLetter.sidebar.cvLoaded

  const cvControls = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {!cvText ? (
        <div onClick={() => !fileLoading && fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.[0]) handleCvFile(e.dataTransfer.files[0]) }}
          style={{ padding: '16px 12px', border: '1.5px dashed rgba(255,255,255,0.18)', borderRadius: 9, cursor: 'pointer', textAlign: 'center' }}>
          {fileLoading ? (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: c.accent, animation: 'spin 0.7s linear infinite' }} />
              {t.cv.reading}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}><SvgIcon name="document" size={20} color="rgba(255,255,255,0.5)" /></div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{t.cv.upload}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{t.cv.uploadHint}</div>
            </>
          )}
        </div>
      ) : (
        <div style={{ padding: '7px 10px', background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, display: 'flex', alignItems: 'center', gap: 5 }}>
            <SvgIcon name="check-circle" size={11} color={c.success} />
            {cvSourceLabel}
          </span>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={fileLoading}
            style={{ background: 'none', border: 'none', color: c.accent, cursor: fileLoading ? 'wait' : 'pointer', fontSize: 10, fontWeight: 600, padding: 0, flexShrink: 0, fontFamily: 'inherit' }}>
            {fileLoading ? t.cv.reading : t.cv.replace}
          </button>
        </div>
      )}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 10, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, cursor: 'pointer' }}>
        <input type="checkbox" checked={saveConsent} onChange={e => setSaveConsent(e.target.checked)} style={{ marginTop: 1, accentColor: c.accent }} />
        {t.cv.saveToAccount}
      </label>
      {cvNotice && (
        cvNotice.kind === 'error'
          ? <FlowError compact message={cvNotice.text} />
          : <div style={{ fontSize: 10, color: c.success }}>{cvNotice.text}</div>
      )}
    </div>
  )

  const manualJobForm = !job && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 9, color: c.accent, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>
        {lang === 'DE' ? 'Stelle (optional)' : 'Job (optional)'}
      </div>
      {[
        { val: manualTitle, set: setManualTitle, ph: lang === 'DE' ? 'Jobtitel' : 'Job title' },
        { val: manualEmployer, set: setManualEmployer, ph: lang === 'DE' ? 'Unternehmen' : 'Company' },
      ].map(({ val, set, ph }) => (
        <input key={ph} value={val} onChange={e => set(e.target.value)} placeholder={ph}
          style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
      ))}
      <textarea value={manualDesc} onChange={e => setManualDesc(e.target.value)} rows={3}
        placeholder={lang === 'DE' ? 'Stellenbeschreibung einfügen' : 'Paste the job description'}
        style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
      <button type="button" onClick={saveManualJob} disabled={!manualTitle.trim() && !manualEmployer.trim()}
        style={{ padding: '7px 0', borderRadius: 7, border: `1px solid ${c.accent}`, background: 'transparent', color: c.accent, fontSize: 11, fontWeight: 700, cursor: manualTitle.trim() || manualEmployer.trim() ? 'pointer' : 'not-allowed', opacity: manualTitle.trim() || manualEmployer.trim() ? 1 : 0.5, fontFamily: 'inherit' }}>
        {lang === 'DE' ? 'Stelle übernehmen' : 'Use this job'}
      </button>
    </div>
  )

  const errorBox = generateError && (
    <FlowError compact message={generateError.message}
      secondary={generateError.status === 402 ? { label: t.common.topUp, href: '/app/account' } : undefined} />
  )

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
          market={MARKET.eu}
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
                {job?.job_apply_link && (
                  <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 6, fontSize: 10, color: accentColor, textDecoration: 'none', opacity: 0.85 }}>
                    ↗ {letterLang === 'DE' ? 'Vollständige Stellenanzeige öffnen' : 'Open full job posting'}
                  </a>
                )}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleCvFile(e.target.files[0])} />
            {manualJobForm && <div style={{ marginTop: 12 }}>{manualJobForm}</div>}
            <div style={{ marginTop: 12 }}>{cvControls}</div>
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
            {letterIncluded ? (
              <div style={{ background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.35)', borderRadius: 8, padding: '7px 10px', fontSize: 11, color: '#34d399', marginBottom: 8, lineHeight: 1.5 }}>
                {t.pricing.letterIncludedNote}
              </div>
            ) : credits !== null && credits <= LOW_CREDIT_WARN ? (
              <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, padding: '7px 10px', fontSize: 11, color: '#fcd34d', marginBottom: 8, lineHeight: 1.5 }}>
                {credits === 0 ? t.coverLetter.sidebar.noCredits : t.coverLetter.sidebar.lowCredits(credits!)}
              </div>
            ) : null}
            {errorBox && <div style={{ marginBottom: 8 }}>{errorBox}</div>}
            <button className="cl-gen" onClick={handleGenerate}
              disabled={loading || !cvText.trim() || genBlocked}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: loading || !cvText.trim() || genBlocked ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${accentColor}, #1D9E75)`, color: loading || !cvText.trim() || genBlocked ? 'rgba(255,255,255,0.25)' : '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: loading || !cvText.trim() || genBlocked ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading
                ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.7)', animation: 'spin 0.7s linear infinite' }} /> {t.coverLetter.sidebar.writing}</>
                : genBlocked
                ? t.coverLetter.sidebar.needCredits(CL_COST, credits ?? 0)
                : letterIncluded
                ? (letter ? t.pricing.letterRegenIncluded : t.pricing.letterIncluded)
                : letter ? t.pricing.letterRegenCosts(CL_COST) : t.pricing.letterCosts(CL_COST)}
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
              {manualJobForm}
              {cvControls}
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
              {letterIncluded ? (
                <div style={{ background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.35)', borderRadius: 8, padding: '7px 10px', fontSize: 11, color: '#34d399', lineHeight: 1.5 }}>
                  {t.pricing.letterIncludedNote}
                </div>
              ) : credits !== null && credits <= LOW_CREDIT_WARN ? (
                <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, padding: '7px 10px', fontSize: 11, color: '#fcd34d', lineHeight: 1.5 }}>
                  {credits === 0 ? t.coverLetter.sidebar.noCredits : t.coverLetter.sidebar.lowCredits(credits!)}
                </div>
              ) : null}
              <button className="cl-gen" onClick={() => { handleGenerate(); setMobOpen(false) }} disabled={loading || !cvText.trim() || genBlocked}
                style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: loading || !cvText.trim() || genBlocked ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${accentColor}, #1D9E75)`, color: loading || !cvText.trim() || genBlocked ? 'rgba(255,255,255,0.25)' : '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: loading || !cvText.trim() || genBlocked ? 'not-allowed' : 'pointer' }}>
                {loading
                  ? t.coverLetter.sidebar.writing
                  : genBlocked
                  ? t.coverLetter.sidebar.needCredits(CL_COST, credits ?? 0)
                  : letterIncluded
                  ? (letter ? t.pricing.letterRegenIncluded : t.pricing.letterIncluded)
                  : letter ? t.pricing.letterRegenCosts(CL_COST) : t.pricing.letterCosts(CL_COST)}
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

          {errorBox && <div style={{ margin: '12px 24px 0', flexShrink: 0 }}>{errorBox}</div>}
          {downloadError && (
            <div style={{ margin: '12px 24px 0', flexShrink: 0 }}>
              <FlowError compact message={downloadError} onRetry={() => setDownloadError('')} retryLabel={lang === 'DE' ? 'Schließen' : 'Dismiss'} />
            </div>
          )}

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
                      disabled={genBlocked}
                      style={{ marginTop: 20, padding: '11px 28px', borderRadius: 10, border: 'none', background: genBlocked ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${accentColor}, #1D9E75)`, color: genBlocked ? 'rgba(255,255,255,0.3)' : '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: genBlocked ? 'not-allowed' : 'pointer' }}>
                      {genBlocked ? t.coverLetter.sidebar.needCredits(CL_COST, credits ?? 0) : letterIncluded ? t.pricing.letterIncluded : t.pricing.letterCosts(CL_COST)}
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
                    onClick={handleApplyFeedback}
                    disabled={!feedback.trim() || applyingFeedback || changeBlocked}
                    style={{ marginTop: 8, padding: '7px 18px', borderRadius: 7, border: 'none', background: feedback.trim() && !applyingFeedback && !changeBlocked ? accentColor : 'rgba(255,255,255,0.08)', color: feedback.trim() && !applyingFeedback && !changeBlocked ? '#042C53' : 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 700, cursor: feedback.trim() && !applyingFeedback && !changeBlocked ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif" }}>
                    {applyingFeedback
                      ? t.coverLetter.preview.applying
                      : changeBlocked
                      ? t.coverLetter.sidebar.needCredits(CL_COST, credits ?? 0)
                      : changeIncluded
                      ? t.pricing.applyIncluded(revisionsLeft)
                      : t.pricing.applyCosts(CL_COST)}
                  </button>
                  {bundleActive && (
                    <div style={{ marginTop: 8, fontSize: 11, color: changeIncluded ? '#34d399' : 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                      {changeIncluded ? t.pricing.changesLeft(revisionsLeft, until) : t.pricing.packageUsedUp(CL_COST)}
                    </div>
                  )}
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
