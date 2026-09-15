'use client'

import { useState, useEffect, useRef } from 'react'
import { useCredits } from '@/lib/useCredits'
import CrossMarketModal from '@/components/CrossMarketModal'
import FlowError from '@/components/FlowError'
import SvgIcon from '@/components/SvgIcon'
import { CREDIT_COST, LOW_CREDIT_WARN, MARKET, SS, API } from '@/lib/constants'
import type { BundleState } from '@/lib/pricingCore'
import { useCurrentCv } from '@/lib/useCurrentCv'
import { readJob, type JobRef } from '@/lib/job'
import { cvTextFromTailored } from '@/lib/cv'
import { readJsonOrError } from '@/lib/apiError'
import { downloadLetterPdf } from '@/lib/letterPdf'

type Tone = 'confident' | 'formal' | 'warm'
type Length = 'short' | 'medium' | 'long'
type Lang = 'EN' | 'DE'

const TONES: { id: Tone; label: string; desc: string }[] = [
  { id: 'confident', label: 'Confident', desc: 'Direct, assertive' },
  { id: 'formal',    label: 'Formal',    desc: 'Professional style' },
  { id: 'warm',      label: 'Warm',      desc: 'Personal, genuine' },
]
const LENGTHS: { id: Length; label: string; desc: string }[] = [
  { id: 'short',  label: 'Short',  desc: '~150 words' },
  { id: 'medium', label: 'Medium', desc: '~300 words' },
  { id: 'long',   label: 'Long',   desc: '~450 words' },
]

const accent = '#FF9933'

// Same wording as t.pricing.* (EN) in translations.ts — India pages are inline English
const PRICING_COPY = {
  applyIncluded:       (n: number)    => `Apply changes — included (${n} left)`,
  applyCosts:          (cost: number) => `Apply changes — ${cost} credit${cost === 1 ? '' : 's'}`,
  letterIncluded:      'Generate cover letter — included in your package',
  letterRegenIncluded: 'Regenerate — included',
  letterCosts:         (cost: number) => `Generate cover letter (${cost} credit${cost === 1 ? '' : 's'})`,
  letterRegenCosts:    (cost: number) => `Regenerate (${cost} credit${cost === 1 ? '' : 's'})`,
  letterIncludedNote:  'Your CV package for this job includes the cover letter',
}

const MIN_CV_CHARS = 50

type LetterResponse = {
  coverLetter?: string
  letter?: string
  creditsRemaining?: number
  pricing?: { bundle?: BundleState; admin?: boolean }
}

export default function IndiaCoverLetterPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cv = useCurrentCv()
  // The CV Builder's tailored output (plain text) wins over the CV on file for this session
  const [tailored, setTailored] = useState('')
  const cvText = tailored || cv.cvText
  const cvSourceLabel = tailored
    ? 'Tailored CV from the CV Builder'
    : cv.source === 'saved' ? 'Using your saved CV'
    : cv.fileName ? `CV on file: ${cv.fileName}` : 'CV on file'
  const [fileLoading, setFileLoading] = useState(false)
  const [saveToAccount, setSaveToAccount] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [saveNote, setSaveNote] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [job, setJob] = useState<JobRef | null>(null)
  const [tone, setTone]         = useState<Tone>('confident')
  const [length, setLength]     = useState<Length>('medium')
  const [lang, setLang]         = useState<Lang>('EN')
  const [letter, setLetter]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [feedback, setFeedback] = useState('')
  const [applyingFeedback, setApplyingFeedback] = useState(false)
  const [generateError, setGenerateError] = useState<{ message: string; status: number } | null>(null)
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ contact: false, style: false, format: false })
  const [mobOpen, setMobOpen] = useState(false)
  const [contactName,  setContactName]  = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const { credits, setCredits, needsCrossMarket, crossMarketAmount } = useCredits()
  const CL_COST = CREDIT_COST.coverLetter
  const [pricing, setPricing] = useState<{ bundle: BundleState; admin: boolean } | null>(null)
  const [crossWarnPending, setCrossWarnPending] = useState<(() => void) | null>(null)

  const jobLabel = job ? `${job.employer_name} - ${job.job_title}` : ''
  const jobTitle = job?.job_title
  const jobEmployer = job?.employer_name

  // Server decides the price from the ledger; this is only so the UI shows the right
  // copy before the click. Failures fall back to the "charged" wording.
  const isAdmin = !!pricing?.admin
  const bundleActive = !!pricing?.bundle.active
  const revisionsLeft = pricing?.bundle.revisionsLeft ?? 0
  const changeIncluded = bundleActive && revisionsLeft > 0
  const letterIncluded = bundleActive && !pricing!.bundle.coverLetterUsed
  const letterCharged = !letterIncluded && !isAdmin
  const changeCharged = !changeIncluded && !isAdmin
  const notEnoughCredits = credits !== null && credits < CL_COST
  const genBlocked = loading || !cvText.trim() || (letterCharged && notEnoughCredits)
  const feedbackBlocked = !feedback.trim() || applyingFeedback || (changeCharged && notEnoughCredits)

  function absorbPricing(data: { pricing?: { bundle?: BundleState; admin?: boolean } }) {
    if (data?.pricing?.bundle) setPricing({ bundle: data.pricing.bundle, admin: !!data.pricing.admin })
  }

  useEffect(() => {
    let stale = false
    fetch(API.pricingBundle, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job: { job_title: jobTitle, employer_name: jobEmployer } }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!stale && d?.bundle) setPricing({ bundle: d.bundle, admin: !!d.admin }) })
      .catch(() => { /* keep the "charged" copy */ })
    return () => { stale = true }
  }, [jobTitle, jobEmployer])

  useEffect(() => {
    try {
      setTailored(cvTextFromTailored(sessionStorage.getItem(SS.cvbTailored) || ''))
      const saved = sessionStorage.getItem(SS.clLetter)
      if (saved) setLetter(saved)
    } catch {
      // storage unavailable — page still works without a prior letter
    }
    setJob(readJob())
  }, [])

  useEffect(() => { setSaveToAccount(cv.rememberedConsent) }, [cv.rememberedConsent])

  // Pre-fill contact details from whichever CV is in use (it may arrive after mount
  // when the saved CV loads) — never overwrite what the user has already typed.
  useEffect(() => {
    if (!cvText) return
    const emailM = cvText.match(/[\w.+\-]+@[\w\-]+(?:\.[\w\-]+)+/i)
    if (emailM) setContactEmail(p => p || emailM[0].toLowerCase())
    const phoneM = cvText.match(/(?:\+\d{1,3}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,5}[\s\-.]?\d{3,5}(?:[\s\-.]?\d{1,4})?/)
    if (phoneM) setContactPhone(p => p || phoneM[0].trim())
    for (const line of cvText.split('\n')) {
      const t = line.trim()
      if (t.length > 2 && t.length < 55 && !t.includes('@') && !/\d/.test(t) && /[A-Za-z]/.test(t)) {
        const words = t.split(/\s+/)
        if (words.length >= 2 && words.length <= 5) { setContactName(p => p || t); break }
      }
    }
  }, [cvText])

  function toggle(id: string) { setOpenSections(p => ({ ...p, [id]: !p[id] })) }

  async function handleCvFile(file: File) {
    setFileLoading(true); setUploadError(''); setSaveNote('')
    try {
      const out = await cv.extractFile(file)
      if ('error' in out) { setUploadError(out.error); return }
      if (out.text.trim().length < MIN_CV_CHARS) { setUploadError('That file has too little text to be a CV — try another file or paste the text.'); return }
      const result = await cv.setCv(out.text, file.name, { saveToAccount })
      // A freshly uploaded CV replaces the tailored one for this page only
      setTailored('')
      if (saveToAccount) setSaveNote(result.saved ? 'Saved to your account' : `Could not save: ${result.error || 'unknown error'}`)
    } finally {
      setFileLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Only drops the tailored CV for this page — the shared CV on file is never cleared here
  function removeTailored() {
    setTailored('')
    setSaveNote('')
  }

  async function generate() {
    if (!cvText.trim()) return
    if (letterCharged && notEnoughCredits) { setGenerateError({ message: `You need ${CL_COST} credit. Please top up on the Account page.`, status: 402 }); return }
    setLoading(true); setGenerateError(null)
    try {
      const contactHeader = [
        contactName  ? `Full Name: ${contactName}`  : '',
        contactEmail ? `Email: ${contactEmail}`      : '',
        contactPhone ? `Phone: ${contactPhone}`      : '',
      ].filter(Boolean).join('\n')
      const cvWithContact = contactHeader ? `${contactHeader}\n\n${cvText}` : cvText
      const res = await fetch(API.coverLetter, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText: cvWithContact, job, tone, length, lang, market: MARKET.in }),
      })
      const out = await readJsonOrError<LetterResponse>(res)
      if (!out.ok) {
        // Server already refunded on failure — keep the previous letter on screen
        absorbPricing((out.data ?? {}) as LetterResponse)
        if (out.status === 402 && typeof out.credits === 'number') setCredits(out.credits)
        setGenerateError({ message: out.message, status: out.status })
        return
      }
      absorbPricing(out.data)
      if (typeof out.data.creditsRemaining === 'number') setCredits(out.data.creditsRemaining)
      const cl = out.data.coverLetter || out.data.letter || ''
      if (!cl) { setGenerateError({ message: 'The letter came back empty — please try again.', status: out.status }); return }
      setLetter(cl); sessionStorage.setItem(SS.clLetter, cl)
    } catch { setGenerateError({ message: 'Network error. Please try again.', status: 0 }) }
    finally { setLoading(false) }
  }

  function handleGenerate() {
    if (!letterCharged) { generate(); return }
    if (needsCrossMarket(CL_COST, MARKET.in)) {
      setCrossWarnPending(() => generate)
    } else {
      generate()
    }
  }

  async function applyFeedback() {
    if (!feedback.trim() || !letter) return
    if (changeCharged && notEnoughCredits) { setGenerateError({ message: `You need ${CL_COST} credit. Please top up on the Account page.`, status: 402 }); return }
    setApplyingFeedback(true); setGenerateError(null)
    try {
      const res = await fetch(API.coverLetter, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, job, tone, length, lang, feedback, currentLetter: letter, market: MARKET.in }),
      })
      const out = await readJsonOrError<LetterResponse>(res)
      if (!out.ok) {
        absorbPricing((out.data ?? {}) as LetterResponse)
        if (out.status === 402 && typeof out.credits === 'number') setCredits(out.credits)
        setGenerateError({ message: out.message, status: out.status })
        return
      }
      absorbPricing(out.data)
      if (typeof out.data.creditsRemaining === 'number') setCredits(out.data.creditsRemaining)
      const cl = out.data.coverLetter || out.data.letter || ''
      if (!cl) { setGenerateError({ message: 'The letter came back empty — please try again.', status: out.status }); return }
      setLetter(cl); sessionStorage.setItem(SS.clLetter, cl); setFeedback('')
    } catch { setGenerateError({ message: 'Network error. Please try again.', status: 0 }) }
    finally { setApplyingFeedback(false) }
  }

  function handleApplyFeedback() {
    if (!changeCharged) { applyFeedback(); return }
    if (needsCrossMarket(CL_COST, MARKET.in)) {
      setCrossWarnPending(() => applyFeedback)
    } else {
      applyFeedback()
    }
  }

  async function downloadPDF() {
    if (!letter) return; setDownloading('pdf'); setDownloadError('')
    try {
      await downloadLetterPdf({
        letter,
        name: contactName,
        contact: [contactEmail, contactPhone].filter(Boolean).join('  ·  '),
        jobTitle: job?.job_title,
        employer: job?.employer_name,
      })
    } catch { setDownloadError('PDF generation failed. Please try again.') }
    setDownloading(null)
  }

  async function downloadDOCX() {
    if (!letter) return; setDownloading('docx'); setDownloadError('')
    try {
      const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import('docx')
      const children: InstanceType<typeof Paragraph>[] = [
        new Paragraph({ children: [new TextRun({ text: 'Cover Letter', bold: true, size: 36, color: '042C53', font: 'Calibri' })], spacing: { after: 80 } }),
        ...(job ? [new Paragraph({ children: [new TextRun({ text: `${job.employer_name} - ${job.job_title}`, size: 20, color: '6b7c93', font: 'Calibri', italics: true })], spacing: { after: 200 } })] : []),
        ...letter.split('\n').map((para, i) => {
          if (!para.trim()) return new Paragraph({ children: [], spacing: { after: 120 } })
          const isEdge = i === 0 || i === letter.split('\n').filter(p => p.trim()).length - 1
          return new Paragraph({ children: [new TextRun({ text: para, size: 22, color: '1a2332', font: 'Calibri', bold: isEdge })], spacing: { after: 160 }, alignment: AlignmentType.JUSTIFIED })
        }),
        new Paragraph({ children: [new TextRun({ text: 'Generated by Job-Lens India', size: 14, color: 'aaaaaa', font: 'Calibri', italics: true })], spacing: { before: 400 } }),
      ]
      const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } } }, children }] })
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob); const a = document.createElement('a')
      a.href = url; a.download = `CoverLetter_${(job?.employer_name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')}.docx`; a.click()
      URL.revokeObjectURL(url)
    } catch { setDownloadError('Word generation failed. Please try again.') }
    setDownloading(null)
  }

  const linkBtn = { background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: 10, fontWeight: 600, padding: 0, fontFamily: 'inherit', flexShrink: 0 } as const
  const consentBox = (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.55)', cursor: 'pointer' }}>
      <input type="checkbox" checked={saveToAccount} onChange={e => setSaveToAccount(e.target.checked)} style={{ accentColor: accent }} />
      <span>Save to my account for next time</span>
    </label>
  )
  const cvPanel = (
    <div style={{ marginTop: 12 }}>
      {fileLoading || (cv.loading && !cvText) ? (
        <div style={{ padding: '12px', fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: accent, animation: 'spin 0.7s linear infinite' }} /> Reading your CV…
        </div>
      ) : !cvText ? (
        <>
          <div onClick={() => fileInputRef.current?.click()} onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.[0]) handleCvFile(e.dataTransfer.files[0]) }}
            style={{ padding: '16px 12px', border: '1.5px dashed rgba(255,255,255,0.18)', borderRadius: 9, cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}><SvgIcon name="document" size={20} color="rgba(255,255,255,0.6)" /></div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Upload your CV</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>PDF · DOCX · TXT</div>
          </div>
          {consentBox}
        </>
      ) : (
        <>
          <div style={{ padding: '7px 10px', background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{cvSourceLabel}</span>
            <span style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button type="button" onClick={() => fileInputRef.current?.click()} style={linkBtn}>Replace</button>
              {tailored && <button type="button" onClick={removeTailored} style={{ ...linkBtn, color: 'rgba(255,255,255,0.45)' }}>Remove</button>}
            </span>
          </div>
          {consentBox}
        </>
      )}
      {saveNote && <div style={{ marginTop: 6, fontSize: 10, color: saveNote.startsWith('Could not') ? '#f87171' : '#4ade80' }}>{saveNote}</div>}
      {uploadError && <div style={{ marginTop: 8 }}><FlowError compact message={uploadError} /></div>}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0F1923', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .cl-gen:hover:not(:disabled) { transform: translateY(-1px); }
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

      {crossWarnPending && (
        <CrossMarketModal
          cost={CL_COST}
          market={MARKET.in}
          crossAmount={crossMarketAmount(CL_COST, MARKET.in)}
          onConfirm={() => { const fn = crossWarnPending; setCrossWarnPending(null); fn() }}
          onCancel={() => setCrossWarnPending(null)}
        />
      )}

      <div style={{ display: 'flex', height: 'calc(100vh - 52px)' }}>

        {/* LEFT SIDEBAR */}
        <div className="jl-dsb" style={{ width: 288, flexShrink: 0, background: 'linear-gradient(180deg, #152233 0%, #0e1a28 100%)', borderRight: '1px solid rgba(255,255,255,0.08)', flexDirection: 'column' }}>
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>Cover Letter</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              AI-powered, India-tuned
              <span style={{ fontSize: 10, fontWeight: 700, color: '#FF9933', background: 'rgba(255,153,51,0.15)', padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' as const }}>
                {CREDIT_COST.coverLetter} credit
              </span>
            </div>
            {jobLabel && (
              <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.08)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, color: accent, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>For</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{jobLabel}</div>
                {job?.job_apply_link && (
                  <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 6, fontSize: 10, color: accent, textDecoration: 'none', opacity: 0.85 }}>
                    ↗ Open full job posting
                  </a>
                )}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleCvFile(e.target.files[0])} />
            {cvPanel}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* Contact Details */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggle('contact')} style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.contact ? accent + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.contact ? accent + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.contact ? accent : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>✎</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.contact ? '#fff' : 'rgba(255,255,255,0.55)' }}>Contact Details</span>
                  {(contactName || contactEmail) && <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>✓ set</span>}
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', transform: openSections.contact ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.contact && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                    Correct your contact details — used in the PDF/DOCX header and passed to the letter generator.
                  </div>
                  {[
                    { label: 'Full Name', val: contactName, set: setContactName, ph: 'Priya Sharma' },
                    { label: 'Email',     val: contactEmail, set: setContactEmail, ph: 'priya@example.com' },
                    { label: 'Phone',     val: contactPhone, set: setContactPhone, ph: '+91 98765 43210' },
                  ].map(({ label, val, set, ph }) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>{label}</div>
                      <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tone */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggle('style')} style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.style ? accent + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.style ? accent + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.style ? accent : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>01</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.style ? '#fff' : 'rgba(255,255,255,0.55)' }}>Tone</span>
                  <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{TONES.find(t => t.id === tone)?.label}</span>
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', transform: openSections.style ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.style && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {TONES.map(t => (
                    <div key={t.id} onClick={() => setTone(t.id)}
                      style={{ padding: '10px 12px', borderRadius: 9, border: `1px solid ${tone === t.id ? accent : 'rgba(255,255,255,0.09)'}`, background: tone === t.id ? accent + '14' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: tone === t.id ? '#fff' : 'rgba(255,255,255,0.65)' }}>{t.label}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{t.desc}</div>
                      </div>
                      <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${tone === t.id ? accent : 'rgba(255,255,255,0.2)'}`, background: tone === t.id ? accent : 'transparent', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Format */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggle('format')} style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.format ? accent + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.format ? accent + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.format ? accent : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>02</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.format ? '#fff' : 'rgba(255,255,255,0.55)' }}>Format</span>
                  <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{length}</span>
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', transform: openSections.format ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.format && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Length</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {LENGTHS.map(l => (
                        <div key={l.id} onClick={() => setLength(l.id)}
                          style={{ padding: '9px 11px', borderRadius: 8, border: `1px solid ${length === l.id ? accent : 'rgba(255,255,255,0.08)'}`, background: length === l.id ? accent + '14' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: length === l.id ? '#fff' : 'rgba(255,255,255,0.6)' }}>{l.label}</span>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{l.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Language</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['EN', 'DE'] as Lang[]).map(l => (
                        <div key={l} onClick={() => setLang(l)}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${lang === l ? accent : 'rgba(255,255,255,0.08)'}`, background: lang === l ? accent + '14' : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: lang === l ? '#fff' : 'rgba(255,255,255,0.45)' }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generate */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            {credits !== null && credits <= LOW_CREDIT_WARN && (
              <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, padding: '7px 10px', fontSize: 11, color: '#fcd34d', marginBottom: 8, lineHeight: 1.5 }}>
                {credits === 0 ? 'No credits left. Top up on Account page.' : `${credits} credit${credits === 1 ? '' : 's'} remaining.`}
              </div>
            )}
            {letterIncluded && (
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: '#4ade80', marginBottom: 8, lineHeight: 1.5 }}>
                {PRICING_COPY.letterIncludedNote}
              </div>
            )}
            {generateError && (
              <div style={{ marginBottom: 8 }}>
                <FlowError compact message={generateError.message}
                  secondary={generateError.status === 402 ? { label: 'Top up credits', href: '/in/account' } : undefined} />
              </div>
            )}
            <button className="cl-gen" onClick={handleGenerate} disabled={genBlocked}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: genBlocked ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${accent}, #e67300)`, color: genBlocked ? 'rgba(255,255,255,0.25)' : '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: genBlocked ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading
                ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.7)', animation: 'spin 0.7s linear infinite' }} /> Writing...</>
                : letterIncluded
                ? (letter ? PRICING_COPY.letterRegenIncluded : PRICING_COPY.letterIncluded)
                : letterCharged && notEnoughCredits
                ? `Need ${CL_COST} credit — you have ${credits}`
                : letter ? PRICING_COPY.letterRegenCosts(CL_COST) : PRICING_COPY.letterCosts(CL_COST)}
            </button>
          </div>
        </div>

        {/* RIGHT PREVIEW */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#141E2B', overflow: 'hidden' }}>
          <div className="jl-mbtn" style={{ padding: '10px 16px', background: '#152233', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <button onClick={() => setMobOpen(o => !o)} style={{ background: '#1a2d45', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {mobOpen ? 'Close Settings' : 'Letter Settings'}
            </button>
          </div>
          {mobOpen && (
            <div className="jl-mob" style={{ background: 'linear-gradient(180deg, #152233 0%, #0e1a28 100%)', borderBottom: '1px solid rgba(255,255,255,0.1)', flexDirection: 'column', overflowY: 'auto', maxHeight: '70vh', padding: '16px', gap: 14 }}>
              {cvPanel}
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 8 }}>Tone</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {TONES.map(t => <button key={t.id} onClick={() => setTone(t.id)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${tone === t.id ? accent : 'rgba(255,255,255,0.1)'}`, background: tone === t.id ? accent + '20' : 'rgba(255,255,255,0.04)', color: tone === t.id ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>{t.label}</button>)}
                </div>
              </div>
              <button className="cl-gen" onClick={() => { handleGenerate(); setMobOpen(false) }} disabled={genBlocked}
                style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: genBlocked ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${accent}, #e67300)`, color: genBlocked ? 'rgba(255,255,255,0.25)' : '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {loading ? 'Writing...' : letterIncluded ? (letter ? PRICING_COPY.letterRegenIncluded : PRICING_COPY.letterIncluded) : letter ? PRICING_COPY.letterRegenCosts(CL_COST) : PRICING_COPY.letterCosts(CL_COST)}
              </button>
            </div>
          )}

          {/* Action bar */}
          <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#152233', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: letter ? '#1D9E75' : 'rgba(255,255,255,0.25)' }}>{letter ? 'Letter Ready' : 'Preview'}</span>
            {letter && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={downloadPDF} disabled={downloading === 'pdf'} style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: downloading === 'pdf' ? accent : 'rgba(255,255,255,0.55)', fontSize: 11, cursor: downloading === 'pdf' ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                  {downloading === 'pdf' ? 'Building...' : 'PDF'}
                </button>
                <button onClick={downloadDOCX} disabled={downloading === 'docx'} style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: downloading === 'docx' ? accent : 'rgba(255,255,255,0.55)', fontSize: 11, cursor: downloading === 'docx' ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                  {downloading === 'docx' ? 'Building...' : 'Word'}
                </button>
              </div>
            )}
          </div>

          {generateError && (
            <div style={{ margin: '12px 24px 0', flexShrink: 0 }}>
              <FlowError message={generateError.message}
                onRetry={letter && feedback.trim() ? handleApplyFeedback : handleGenerate}
                secondary={generateError.status === 402 ? { label: 'Top up credits', href: '/in/account' } : undefined} />
            </div>
          )}
          {downloadError && (
            <div style={{ margin: '12px 24px 0', flexShrink: 0 }}>
              <FlowError compact message={downloadError} />
            </div>
          )}

          {/* Preview */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', display: 'flex', justifyContent: 'center' }}>
            {loading && (
              <div style={{ width: '100%', maxWidth: 680 }}>
                <div style={{ background: '#1C2A3A', borderRadius: 14, padding: '40px 44px' }}>
                  {[95, 88, 100, 72, 90, 85, 100, 78, 92, 65, 88].map((w, i) => <div key={i} className="shimmer" style={{ height: 8, width: `${w}%`, marginBottom: 10 }} />)}
                </div>
                <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${accent}40`, borderTopColor: accent, animation: 'spin 0.7s linear infinite' }} /> Writing your cover letter...
                </div>
              </div>
            )}
            {!loading && !letter && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontFamily: "'Outfit', sans-serif" }}>{cvText ? 'Ready to write' : 'Upload your CV to start'}</div>
                {cvText && <button onClick={handleGenerate} className="cl-gen" style={{ padding: '11px 28px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${accent}, #e67300)`, color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{letterIncluded ? PRICING_COPY.letterIncluded : PRICING_COPY.letterCosts(CL_COST)}</button>}
              </div>
            )}
            {!loading && letter && (
              <div className="cl-preview" style={{ width: '100%', maxWidth: 700 }}>
                <div style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', background: '#FAFAF8' }}>
                  <div style={{ height: 5, background: `linear-gradient(90deg, #042C53, ${accent}, #138808)` }} />
                  <div style={{ padding: '32px 44px 20px', borderBottom: '1px solid #edf1f6' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Cover Letter</div>
                    {job && <div style={{ fontSize: 13, color: '#6b7c93', fontStyle: 'italic' }}>{job.employer_name} - {job.job_title}</div>}
                  </div>
                  <div style={{ padding: '32px 44px 40px' }}>
                    <div style={{ fontSize: 14, color: '#1a2332', lineHeight: 1.95, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif" }}>{letter}</div>
                  </div>
                </div>
                <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, marginBottom: 8 }}>Request changes</div>
                  <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="e.g. Make it shorter, more formal, mention my Python skills..."
                    rows={2} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '8px 10px', resize: 'vertical' as const, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' as const }} />
                  <button onClick={handleApplyFeedback} disabled={feedbackBlocked}
                    style={{ marginTop: 8, padding: '7px 18px', borderRadius: 7, border: 'none', background: !feedbackBlocked ? accent : 'rgba(255,255,255,0.08)', color: !feedbackBlocked ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 700, cursor: !feedbackBlocked ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif" }}>
                    {applyingFeedback ? 'Applying...' : changeIncluded ? PRICING_COPY.applyIncluded(revisionsLeft) : PRICING_COPY.applyCosts(CL_COST)}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center', paddingBottom: 32, flexWrap: 'wrap' }}>
                  <button onClick={downloadPDF} disabled={downloading === 'pdf'} style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>{downloading === 'pdf' ? 'Building PDF...' : 'Download PDF'}</button>
                  <button onClick={downloadDOCX} disabled={downloading === 'docx'} style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>{downloading === 'docx' ? 'Building Word...' : 'Download Word'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
