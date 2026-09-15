'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCredits } from '@/lib/useCredits'
import { useCurrentCv } from '@/lib/useCurrentCv'
import CrossMarketModal from '@/components/CrossMarketModal'
import SkillGapModal from '@/components/SkillGapModal'
import FlowError from '@/components/FlowError'
import { CREDIT_COST, LOW_CREDIT_WARN, MARKET, SS, API, BUNDLE } from '@/lib/constants'
import type { BundleState } from '@/lib/pricingCore'
import { type CVData, parseCvJson } from '@/lib/cv'
import { type JobRef, normalizeJob, readJob, writeJob } from '@/lib/job'
import { readJsonOrError } from '@/lib/apiError'
import SvgIcon from '@/components/SvgIcon'
import { c } from '@/lib/theme'

const accent = '#FF9933'

// Ids are the names src/lib/CVPdf.tsx understands: clean/classic = single column, saffron/modern = header band, executive = sidebar
type Template = 'clean' | 'saffron' | 'classic' | 'modern' | 'executive'
type Tone = 'professional' | 'concise' | 'detailed'
type Lang = 'EN'

// ── PDF preview ──────────────────────────────────────────────────────────────
// The preview IS the download: both come from POST /api/cv/pdf (src/lib/CVPdf.tsx),
// so what the user sees can never drift from the file they send to an employer.

const PREVIEW_DEBOUNCE_MS = 600

interface RenderedPdf { url: string; blob: Blob; body: string }

async function fetchCvPdf(body: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(API.cvPdf, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal })
  if (!res.ok) {
    const out = await readJsonOrError(res)
    throw new Error(out.ok ? `Request failed (${res.status})` : out.message)
  }
  return res.blob()
}

function pdfErrorMessage(err: unknown): string {
  if (err instanceof TypeError) return 'Network error. Please check your connection and try again.'
  return err instanceof Error && err.message ? err.message : 'The preview could not be rendered.'
}

function PdfPreview({ url, pending, error, onRetry }: { url: string | null; pending: boolean; error: string | null; onRetry: () => void }) {
  const showOverlay = pending || (!url && !error)
  return (
    <div>
      {error && (
        <div style={{ marginBottom: 12 }}>
          <FlowError compact message={error} onRetry={onRetry} />
        </div>
      )}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '210 / 297', background: c.bgCard, border: `1px solid ${c.borderLight}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
        {url && (
          <iframe key={url} src={`${url}#toolbar=0&navpanes=0&view=FitH`} title="CV preview (PDF)"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', display: 'block' }} />
        )}
        {showOverlay && (
          <div role="status" aria-live="polite" style={{ position: 'absolute', inset: 0, background: url ? 'rgba(255,255,255,0.78)' : c.bgCard, display: 'flex', flexDirection: 'column', padding: '9% 8%', gap: 10 }}>
            <div style={{ height: 22, width: '52%', background: c.border, borderRadius: 4 }} />
            <div style={{ height: 10, width: '34%', background: c.border, borderRadius: 4, marginBottom: 18 }} />
            {[100, 88, 95, 72, 100, 84, 91, 66, 100, 78].map((w, i) => (
              <div key={i} style={{ height: i % 4 === 0 ? 12 : 8, width: `${w}%`, background: c.border, borderRadius: 4 }} />
            ))}
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: c.textFaint }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${c.borderLight}`, borderTopColor: c.textFaint, animation: 'spin 0.7s linear infinite' }} />
              Rendering preview…
            </div>
          </div>
        )}
      </div>
      {url && (
        <div style={{ marginTop: 8, textAlign: 'right' as const }}>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 600, color: c.accentIn, textDecoration: 'none' }}>
            Open in new tab ↗
          </a>
        </div>
      )}
    </div>
  )
}
// Inline English copy for the server-enforced application package (mirrors t.pricing.* on DACH)
const PRICING_COPY = {
  packageIncludes: (n: number) => `Includes the cover letter + ${n} changes for this job (${BUNDLE.windowHours} h)`,
  changesLeft:     (n: number, until: string) => `${n} change${n === 1 ? '' : 's'} left · included until ${until}`,
  packageUsedUp:   (cost: number) => `Package used up — the next change costs ${cost} credit${cost === 1 ? '' : 's'}`,
  applyIncluded:   (n: number) => `Apply changes — included (${n} left)`,
  applyCosts:      (cost: number) => `Apply changes — ${cost} credit${cost === 1 ? '' : 's'}`,
}

function formatUntil(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const now = new Date()
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  return sameDay ? time : `tomorrow ${time}`
}

interface TailorResponse {
  cv?: string
  enhanced?: string
  result?: string
  creditsRemaining?: number
  pricing?: { bundle?: BundleState; admin?: boolean }
}

export default function IndiaCVBuilderPage() {
  const router = useRouter()
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const { cvText, fileName: cvFileName, source: cvSource, rememberedConsent, setCv, clearCv, extractFile } = useCurrentCv()
  const [fileLoading,   setFileLoading]   = useState(false)
  const [saveConsent,   setSaveConsent]   = useState(false)
  const [cvNotice,      setCvNotice]      = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [job,           setJob]           = useState<JobRef | null>(null)
  const [jobLabel,      setJobLabel]      = useState('')
  const [template,      setTemplate]      = useState<Template>('clean')
  const [tone,          setTone]          = useState<Tone>('professional')
  const lang: Lang = 'EN'
  const [cvData,        setCvData]        = useState<CVData | null>(null)
  const [rawCv,         setRawCv]         = useState('')
  const [generateError, setGenerateError] = useState<{ message: string; status: number } | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [openSections,  setOpenSections]  = useState<Record<string, boolean>>({ template: false, style: false })
  const [feedback,      setFeedback]      = useState('')
  const [applyingFeedback, setApplyingFeedback] = useState(false)
  const [downloading,   setDownloading]   = useState<'pdf' | 'docx' | null>(null)
  const [mobOpen,       setMobOpen]       = useState(false)
  const [atsFromScan,   setAtsFromScan]   = useState(false)
  const [atsSuggestions, setAtsSuggestions] = useState<{ missing_keywords: string[]; quick_fixes: string[]; format_issues?: string[]; section_gaps?: string[] } | null>(null)
  const [editingContact, setEditingContact] = useState(false)
  const [contactDraft,  setContactDraft]  = useState({ name: '', email: '', phone: '', location: '', linkedin: '' })
  const [photoUrl,      setPhotoUrl]      = useState('')
  const [skillGapOpen,  setSkillGapOpen]  = useState(false)
  const [skillGapData,  setSkillGapData]  = useState<{ matching: string[]; missing: string[] } | null>(null)
  const [skillGapLoading, setSkillGapLoading] = useState(false)
  const [previewTab,      setPreviewTab]      = useState<'original' | 'generated'>('generated')
  const [originalFileUrl, setOriginalFileUrl] = useState<string | null>(null)
  const [originalFileIsPdf, setOriginalFileIsPdf] = useState(true)
  const [jobDesc,         setJobDesc]         = useState('')
  const [jobDescOpen,     setJobDescOpen]     = useState(false)
  const [fetchingJd,      setFetchingJd]      = useState(false)
  const [jdFetchError,    setJdFetchError]    = useState<string | null>(null)
  // Manual job entry — for users who arrive directly with a JD in hand
  // (from a friend, a message, an email) instead of via the jobs page
  const [manualTitle,   setManualTitle]   = useState('')
  const [manualCompany, setManualCompany] = useState('')
  const [manualJd,      setManualJd]      = useState('')
  const [pricing,       setPricing]       = useState<{ bundle: BundleState; admin: boolean } | null>(null)
  const [feedbackError, setFeedbackError] = useState<{ message: string; status: number } | null>(null)
  const [pdf,           setPdf]           = useState<RenderedPdf | null>(null)
  const [pdfPending,    setPdfPending]    = useState(false)
  const [pdfError,      setPdfError]      = useState<string | null>(null)
  const [pdfAttempt,    setPdfAttempt]    = useState(0)

  const { credits, setCredits, needsCrossMarket, crossMarketAmount } = useCredits()

  // Textarea buffer: setCv() trims, which would eat a trailing newline mid-edit — the hook's cvText stays the truth.
  const [cvDraft, setCvDraft] = useState('')
  useEffect(() => { setCvDraft(d => (d.trim() === cvText.trim() ? d : cvText)) }, [cvText])
  useEffect(() => { setSaveConsent(rememberedConsent) }, [rememberedConsent])

  // Sync enriched jobDesc back to the shared job so cover letter always gets the full JD
  useEffect(() => {
    if (!job || !jobDesc) return
    writeJob({ ...job, job_description: jobDesc })
  }, [jobDesc, job])
  const CV_COST = CREDIT_COST.tailorCv
  const [crossWarnPending, setCrossWarnPending] = useState<(() => void) | null>(null)

  const isAdmin        = !!pricing?.admin
  const bundleActive   = !!pricing?.bundle.active
  const revisionsLeft  = pricing?.bundle.revisionsLeft ?? 0
  const changeIncluded = bundleActive && revisionsLeft > 0
  const until          = formatUntil(pricing?.bundle.expiresAt)
  // Admins bypass deduction server-side, so credits never gate them client-side either
  const canAfford      = isAdmin || credits === null || credits >= CV_COST
  const canApplyChange = !!feedback.trim() && !applyingFeedback && (changeIncluded || canAfford)

  // Ask the ledger what this job costs right now so the buttons can say "included" before
  // the click. Failures fall back to the charged copy — the server decides the price anyway.
  const jobTitle    = job?.job_title ?? ''
  const jobEmployer = job?.employer_name ?? ''
  useEffect(() => {
    let cancelled = false
    setPricing(null)
    fetch(API.pricingBundle, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job: { job_title: jobTitle, employer_name: jobEmployer } }) })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d?.bundle) setPricing({ bundle: d.bundle, admin: !!d.admin }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [jobTitle, jobEmployer])

  function applyPricing(data: TailorResponse | null | undefined) {
    if (data?.pricing?.bundle) setPricing({ bundle: data.pricing.bundle, admin: !!data.pricing.admin })
  }

  useEffect(() => {
    return () => { if (originalFileUrl) URL.revokeObjectURL(originalFileUrl) }
  }, [originalFileUrl])

  // ── Restore session ──
  useEffect(() => {
    const savedRole = sessionStorage.getItem(SS.sjsTargetRole) || ''
    const p = readJob()
    if (p) { setJob(p); setJobLabel(`${p.employer_name} - ${p.job_title}`); if (p.job_description) setJobDesc(p.job_description) }
    else if (savedRole) setJobLabel(savedRole)
    const saved     = sessionStorage.getItem(SS.cvbTailored)
    const savedData = sessionStorage.getItem(SS.cvbData)
    if (saved) setRawCv(saved)
    const restored = parseCvJson(savedData)
    if (restored) setCvData(restored)
    const atsRaw = sessionStorage.getItem(SS.atsSuggestions)
    if (atsRaw) {
      try { const s = JSON.parse(atsRaw); setAtsSuggestions(s); setTemplate('clean'); setAtsFromScan(true) } catch { }
    }
  }, [])

  async function fetchFullJd() {
    const url = job?.job_apply_link
    if (!url) return
    setFetchingJd(true)
    try {
      const res = await fetch(API.fetchJd, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
      const data = await res.json()
      if (data.text) {
        setJobDesc(data.text)
        setJobDescOpen(true)
        setJdFetchError(null)
      } else {
        setJobDescOpen(true)
        setJdFetchError('Site blocked the fetch. Open the job posting, copy the full description and paste it below:')
      }
    } catch {
      setJobDescOpen(true)
      setJdFetchError('Connection error. Open the job posting and paste the description manually below:')
    }
    setFetchingJd(false)
  }

  function showSaveOutcome(out: { saved: boolean; error?: string }) {
    setCvNotice(out.saved ? { kind: 'ok', text: 'Saved to your account' } : { kind: 'error', text: `Could not save: ${out.error || ''}` })
  }

  async function handleCvFile(file: File) {
    setCvNotice(null); setFileLoading(true)
    const extracted = await extractFile(file)
    if ('error' in extracted) {
      setCvNotice({ kind: 'error', text: extracted.error })
    } else if (extracted.text.trim().length < 50) {
      setCvNotice({ kind: 'error', text: 'That file has too little text to be a CV — try another file or paste the text.' })
    } else {
      if (originalFileUrl) URL.revokeObjectURL(originalFileUrl)
      setOriginalFileUrl(URL.createObjectURL(file))
      setOriginalFileIsPdf(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
      const out = await setCv(extracted.text, file.name, { saveToAccount: saveConsent })
      if (saveConsent) showSaveOutcome(out)
    }
    setFileLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function onCvTextChange(value: string) {
    setCvDraft(value)
    setCvNotice(null)
    void setCv(value, value.trim() ? cvFileName : '')
  }

  // Ticking the box after an upload saves the CV that is already here — the tick is the consent.
  async function onConsentChange(checked: boolean) {
    setSaveConsent(checked)
    if (!checked || cvSource !== 'session' || !cvText.trim()) return
    showSaveOutcome(await setCv(cvText, cvFileName, { saveToAccount: true }))
  }

  // Removing the CV also drops the CV built from it — those are this page's own results.
  function clearOwnResults() {
    if (originalFileUrl) URL.revokeObjectURL(originalFileUrl)
    setOriginalFileUrl(null); setCvData(null); setRawCv(''); setPreviewTab('generated'); setCvNotice(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    sessionStorage.removeItem(SS.cvbTailored); sessionStorage.removeItem(SS.cvbData)
  }
  // clearCv() on the account CV would re-adopt it at once, so "Remove" detaches it for this session via an empty session CV.
  function removeSavedCv() { void setCv('', ''); clearOwnResults() }
  function clearSessionCv() { clearCv(); setCvDraft(''); clearOwnResults() }

  function handlePhotoFile(file: File) {
    const r = new FileReader()
    r.onload = e => { const url = (e.target?.result as string) ?? ''; if (url) setPhotoUrl(url) }
    r.readAsDataURL(file)
  }

  function toggleSection(id: string) { setOpenSections(prev => ({ ...prev, [id]: !prev[id] })) }

  async function generate(confirmedSkills: string[] = []) {
    if (!cvText.trim()) return
    if (!isAdmin && credits !== null && credits < CV_COST) { setGenerateError({ message: `You need ${CV_COST} credit to build a CV.`, status: 402 }); return }
    setLoading(true); setGenerateError(null); setMobOpen(false)

    const systemPrompt = `You are an elite CV designer. Extract and structure CV information into JSON for visual rendering.
Return ONLY valid JSON - no markdown, no backticks, no preamble.
Schema: {"name":"","title":"","tagline":"","email":"","phone":"","location":"","linkedin":"","summary":"","stats":[{"value":"","label":""}],"skills":[{"name":"","level":90}],"experience":[{"role":"","company":"","period":"","location":"","type":"","bullets":[""]}],"education":[{"degree":"","school":"","year":""}],"certifications":[""],"languages":[{"name":"","level":90}],"tools":[""],"highlights":[""]}
Rules:
- CONTACT FIELDS (email, phone, location, linkedin): copy EXACTLY from CV text. NEVER invent. Empty string if not found.
- skills: up to 12, level 60-99
- experience: include EVERY role, do not skip any
- bullets: 2-4 achievement-focused per role, action verbs
- tools: 10-20 specific technologies
- tone: ${tone}, language: ${lang}
${job ? `- Tailor for: ${job.job_title} at ${job.employer_name}` : ''}
${(jobDesc || job?.job_description) ? `- Job context: ${jobDesc || job?.job_description}` : ''}
${confirmedSkills.length > 0 ? `- User confirmed they also have these skills (include them): ${confirmedSkills.join(', ')}` : ''}
${atsSuggestions?.missing_keywords?.length ? `- ATS PRIORITY: Naturally incorporate these missing keywords: ${atsSuggestions.missing_keywords.join(', ')}` : ''}
${atsSuggestions?.quick_fixes?.length ? `- ATS QUICK FIXES:\n${atsSuggestions.quick_fixes.map((f: string) => `  * ${f}`).join('\n')}` : ''}
${atsSuggestions?.format_issues?.length ? `- ATS FORMAT ISSUES to fix: ${atsSuggestions.format_issues.join('; ')}` : ''}
${atsSuggestions?.section_gaps?.length ? `- ATS SECTION GAPS to address: ${atsSuggestions.section_gaps.join('; ')}` : ''}`

    try {
      const res  = await fetch(API.tailorCv, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cvText, job, template, tone, lang, systemPrompt, returnJson: true, market: MARKET.in }) })
      const out = await readJsonOrError<TailorResponse>(res)
      applyPricing(out.data as TailorResponse | null)
      if (!out.ok) {
        // Server already refunded on failure — keep the previous tailored CV on screen
        if (typeof out.credits === 'number') setCredits(out.credits)
        setGenerateError({ message: out.message, status: out.status })
        return
      }
      const data = out.data
      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining)
      const raw = data.cv || data.enhanced || data.result || ''
      const parsed = parseCvJson(raw)
      if (!raw || !parsed) { setGenerateError({ message: 'The CV came back incomplete. Please try again.', status: out.status }); return }
      setRawCv(raw); setCvData(parsed); setPreviewTab('generated')
      sessionStorage.setItem(SS.cvbTailored, raw)
      sessionStorage.setItem(SS.cvbData, JSON.stringify(parsed))
    } catch { setGenerateError({ message: 'Network error. Please check your connection and try again.', status: 0 }) }
    finally { setLoading(false) }
  }

  async function runSkillGapThenGenerate() {
    if (job?.job_description && cvText) {
      setSkillGapLoading(true)
      try {
        const res = await fetch(API.cvSkillGap, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cvText, jobDescription: job.job_description }),
        })
        const data = await res.json()
        setSkillGapLoading(false)
        if (data.missing?.length > 0) {
          setSkillGapData(data)
          setSkillGapOpen(true)
          return
        }
      } catch { setSkillGapLoading(false) }
    }
    generate([])
  }

  function handleGenerate() {
    if (!isAdmin && needsCrossMarket(CV_COST, MARKET.in)) { setCrossWarnPending(() => runSkillGapThenGenerate) } else { runSkillGapThenGenerate() }
  }

  // A change request is only a charged call once the package is used up or absent
  function handleApplyFeedback() {
    if (!changeIncluded && !isAdmin && needsCrossMarket(CV_COST, MARKET.in)) { setCrossWarnPending(() => applyFeedback) } else { applyFeedback() }
  }

  async function applyFeedback() {
    if (!feedback.trim() || !rawCv) return
    setApplyingFeedback(true); setFeedbackError(null)
    try {
      const atsCtx = atsSuggestions?.missing_keywords?.length ? ` Ensure these ATS keywords are present: ${atsSuggestions.missing_keywords.join(', ')}.` : ''
      const res = await fetch(API.tailorCv, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cvText, job, template, tone, lang, systemPrompt: `Apply the feedback and return updated JSON matching the same schema. Return ONLY valid JSON.${atsCtx}`, returnJson: true, feedback, currentCv: rawCv, market: MARKET.in }) })
      const out = await readJsonOrError<TailorResponse>(res)
      applyPricing(out.data as TailorResponse | null)
      if (!out.ok) {
        if (typeof out.credits === 'number') setCredits(out.credits)
        setFeedbackError({ message: out.message, status: out.status })
        return
      }
      const data = out.data
      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining)
      const raw = data.cv || ''
      const parsed = parseCvJson(raw)
      if (!raw || !parsed) { setFeedbackError({ message: 'The updated CV came back incomplete. Please try again.', status: out.status }); return }
      setRawCv(raw); setCvData(parsed); setPreviewTab('generated')
      sessionStorage.setItem(SS.cvbTailored, raw)
      sessionStorage.setItem(SS.cvbData, JSON.stringify(parsed))
      setFeedback('')
    } catch { setFeedbackError({ message: 'Network error. Please check your connection and try again.', status: 0 }) }
    finally { setApplyingFeedback(false) }
  }

  // Downloads the exact bytes on screen; only renders again if the CV changed inside the debounce window
  async function downloadPDF() {
    if (!cvData || !pdfBody) return
    setDownloadError(null)
    let blob = pdf?.body === pdfBody ? pdf.blob : null
    if (!blob) {
      setDownloading('pdf')
      try {
        blob = await fetchCvPdf(pdfBody)
        cachePdf(blob, pdfBody)
      } catch (err) {
        console.error('PDF error:', err)
        setDownloadError(`${pdfErrorMessage(err)} You can also download as Word.`)
        setDownloading(null)
        return
      }
      setDownloading(null)
    }
    const name = (cvData.name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CV_${name}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function downloadDOCX() {
    if (!cvData) return
    setDownloading('docx'); setDownloadError(null)
    try {
      const { Document, Packer, Paragraph, TextRun, BorderStyle } = await import('docx')
      const teal = '00A58A', navyH = '0d2137', greyH = '6b7c93'
      const sectionTitle = (text: string) => new Paragraph({ children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 18, color: navyH, font: 'Calibri' })], spacing: { before: 240, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'dde4ee' } } })
      const bullet = (text: string) => new Paragraph({ children: [new TextRun({ text: '+ ', color: teal, bold: true, size: 18, font: 'Calibri' }), new TextRun({ text, size: 18, color: '374151', font: 'Calibri' })], spacing: { before: 40, after: 40 }, indent: { left: 200 } })
      const children: InstanceType<typeof Paragraph>[] = []
      children.push(new Paragraph({ children: [new TextRun({ text: cvData.name, bold: true, size: 48, color: navyH, font: 'Calibri' })], spacing: { after: 60 } }))
      children.push(new Paragraph({ children: [new TextRun({ text: cvData.title, bold: true, size: 22, color: teal, font: 'Calibri' })], spacing: { after: 60 } }))
      const contact = [cvData.email, cvData.phone, cvData.location, cvData.linkedin].filter(Boolean)
      if (contact.length) children.push(new Paragraph({ children: [new TextRun({ text: contact.join('  |  '), size: 18, color: greyH, font: 'Calibri' })], spacing: { after: 120 } }))
      if (cvData.summary) { children.push(sectionTitle('Professional Summary')); children.push(new Paragraph({ children: [new TextRun({ text: cvData.summary, size: 18, color: '374151', font: 'Calibri' })], spacing: { after: 120 } })) }
      if (cvData.skills?.length) { children.push(sectionTitle('Core Skills')); children.push(new Paragraph({ children: [new TextRun({ text: cvData.skills.map((s: { name: string }) => s.name).join('  .  '), size: 18, color: '374151', font: 'Calibri' })], spacing: { after: 120 } })) }
      if (cvData.tools?.length) { children.push(sectionTitle('Tech Stack')); children.push(new Paragraph({ children: [new TextRun({ text: cvData.tools.join('  .  '), size: 18, color: '185FA5', font: 'Calibri' })], spacing: { after: 120 } })) }
      if (cvData.experience?.length) {
        children.push(sectionTitle('Professional Experience'))
        cvData.experience.forEach((exp: { role: string; company: string; period: string; location: string; type: string; bullets: string[] }) => {
          children.push(new Paragraph({ children: [new TextRun({ text: exp.role, bold: true, size: 22, color: navyH, font: 'Calibri' }), new TextRun({ text: `  -  ${exp.period}`, size: 18, color: teal, font: 'Calibri' })], spacing: { before: 160, after: 40 } }))
          children.push(new Paragraph({ children: [new TextRun({ text: [exp.company, exp.location, exp.type].filter(Boolean).join('  .  '), size: 18, color: greyH, italics: true, font: 'Calibri' })], spacing: { after: 60 } }))
          exp.bullets?.forEach((b: string) => children.push(bullet(b)))
          children.push(new Paragraph({ children: [], spacing: { after: 80 } }))
        })
      }
      if (cvData.education?.length) { children.push(sectionTitle('Education')); cvData.education.forEach((e: { degree: string; school: string; year: string }) => children.push(new Paragraph({ children: [new TextRun({ text: e.degree, bold: true, size: 20, color: navyH, font: 'Calibri' }), new TextRun({ text: `  -  ${e.school}  (${e.year})`, size: 18, color: greyH, font: 'Calibri' })], spacing: { after: 80 } }))) }
      if (cvData.certifications?.length) { children.push(sectionTitle('Certifications')); cvData.certifications.forEach((c: string) => children.push(new Paragraph({ children: [new TextRun({ text: '* ', color: teal, bold: true, size: 18, font: 'Calibri' }), new TextRun({ text: c, size: 18, color: '374151', font: 'Calibri' })], spacing: { after: 60 } }))) }
      if (cvData.languages?.length) { children.push(sectionTitle('Languages')); children.push(new Paragraph({ children: cvData.languages.flatMap((l: { name: string; level: number }, i: number) => { const level = l.level >= 90 ? 'Native' : l.level >= 75 ? 'Fluent' : l.level >= 55 ? 'Proficient' : 'Basic'; return [new TextRun({ text: l.name, bold: true, size: 18, color: navyH, font: 'Calibri' }), new TextRun({ text: ` (${level})`, size: 18, color: greyH, font: 'Calibri' }), ...(i < cvData.languages.length - 1 ? [new TextRun({ text: '   .   ', size: 18, color: 'cccccc', font: 'Calibri' })] : [])] }), spacing: { after: 80 } })) }
      const docx = new Document({ sections: [{ properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } }, children }] })
      const blob = await Packer.toBlob(docx)
      const url  = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `CV_${(job?.employer_name || cvData.name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')}.docx`; a.click(); URL.revokeObjectURL(url)
    } catch (err) { console.error('DOCX error:', err); setDownloadError('Word generation failed. Please try again or download as PDF.') }
    setDownloading(null)
  }

  function goToCoverLetter() {
    if (rawCv) sessionStorage.setItem(SS.cvbTailored, rawCv)
    if (job) writeJob(job)
    router.push('/in/cover-letter')
  }
  // The ATS page scans the tailored CV only for this visit (?cv=tailored) — the user's own CV stays the source for the next job.
  function goToAtsCheck() {
    if (rawCv) sessionStorage.setItem(SS.cvbTailored, rawCv)
    sessionStorage.removeItem(SS.atsSuggestions)
    router.push('/in/career-scan?cv=tailored')
  }

  // ── Template definitions ──
  const templates: { id: Template; label: string; ac: string; desc: string; ats: string; atsColor: string; preview: React.ReactNode }[] = [
    {
      id: 'clean', label: 'Clean', ac: '#1a5fa0', desc: 'Single column · Blue', ats: 'ATS: High ✓', atsColor: '#1D9E75',
      preview: (
        <div style={{ padding: '5px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.6)', borderRadius: 1, width: '70%' }} />
          <div style={{ height: 2, background: '#1a5fa080', borderRadius: 1, width: '40%', marginBottom: 2 }} />
          <div style={{ height: 0.5, background: 'rgba(255,255,255,0.2)', marginBottom: 2 }} />
          {[90,70,85,60,95,75,80,65].map((w, i) => (<div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.12)', borderRadius: 1, width: `${w}%` }} />))}
        </div>
      ),
    },
    {
      id: 'saffron', label: 'Saffron', ac: '#FF9933', desc: 'Header band · Orange', ats: 'ATS: Medium ◐', atsColor: '#f59e0b',
      preview: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ height: 14, background: '#0d2137', borderBottom: '1.5px solid #FF9933', padding: '2px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.8)', borderRadius: 1, width: '60%' }} />
            <div style={{ height: 1.5, background: '#FF993380', borderRadius: 1, width: '40%' }} />
          </div>
          <div style={{ padding: '3px 4px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[85,65,90,70,95,75,80].map((w, i) => (<div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.12)', borderRadius: 1, width: `${w}%` }} />))}
          </div>
        </div>
      ),
    },
    {
      id: 'classic', label: 'Classic', ac: '#1a1a1a', desc: 'Single column · B&W', ats: 'ATS: High ✓', atsColor: '#1D9E75',
      preview: (
        <div style={{ padding: '5px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.6)', borderRadius: 1, width: '70%' }} />
          <div style={{ height: 2, background: 'rgba(255,255,255,0.3)', borderRadius: 1, width: '40%', marginBottom: 2 }} />
          <div style={{ height: 0.5, background: 'rgba(255,255,255,0.2)', marginBottom: 2 }} />
          {[90,70,85,60,95,75,80,65].map((w, i) => (<div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.12)', borderRadius: 1, width: `${w}%` }} />))}
        </div>
      ),
    },
    {
      id: 'modern', label: 'Modern', ac: '#0050b3', desc: 'Header band · Blue', ats: 'ATS: Medium ◐', atsColor: '#f59e0b',
      preview: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ height: 14, background: '#0d2137', borderBottom: '1.5px solid #0050b3', padding: '2px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.8)', borderRadius: 1, width: '60%' }} />
            <div style={{ height: 1.5, background: 'rgba(255,255,255,0.4)', borderRadius: 1, width: '40%' }} />
          </div>
          <div style={{ padding: '3px 4px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[85,65,90,70,95,75,80].map((w, i) => (<div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.12)', borderRadius: 1, width: `${w}%` }} />))}
          </div>
        </div>
      ),
    },
    {
      id: 'executive', label: 'Executive', ac: '#FF9933', desc: 'Navy sidebar · Premium', ats: 'ATS: Low ⚠', atsColor: '#ef4444',
      preview: (
        <div style={{ display: 'flex', height: '100%', gap: 0 }}>
          <div style={{ width: 14, background: 'rgba(13,33,55,0.9)', padding: '4px 2px', display: 'flex', flexDirection: 'column', gap: 1.5, borderRadius: '3px 0 0 3px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF993360', margin: '0 auto 2px' }} />
            {[80,65,75,55,80,65].map((w, i) => (<div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.15)', borderRadius: 1, width: `${w}%` }} />))}
          </div>
          <div style={{ flex: 1, padding: '4px 3px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.5)', borderRadius: 1, width: '70%', marginBottom: 2 }} />
            {[100,80,90,65,100,75,85,60].map((w, i) => (<div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.1)', borderRadius: 1, width: `${w}%` }} />))}
          </div>
        </div>
      ),
    },
  ]

  const tones: { id: Tone; label: string; desc: string }[] = [
    { id: 'professional', label: 'Professional', desc: 'Polished & credible' },
    { id: 'concise',      label: 'Concise',      desc: 'Sharp & efficient'  },
    { id: 'detailed',     label: 'Detailed',      desc: 'Thorough & expansive' },
  ]

  function renderCvInput(mobile: boolean) {
    const green = '#1D9E75'
    const smallBtn: React.CSSProperties = { padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
    const notice = cvNotice && (
      <div style={{ marginTop: 8 }}>
        {cvNotice.kind === 'ok'
          ? <div style={{ fontSize: 11, color: green, display: 'flex', alignItems: 'center', gap: 6 }}><SvgIcon name="check-circle" size={13} color={green} />{cvNotice.text}</div>
          : <FlowError compact message={cvNotice.text} />}
      </div>
    )

    if (cvSource === 'saved') {
      return (
        <>
          <div style={{ padding: '9px 10px', background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SvgIcon name="document" size={16} color={green} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cvFileName ? `CV on file: ${cvFileName}` : 'Using your saved CV'}
                </div>
                {cvFileName && <div style={{ fontSize: 10, color: green, marginTop: 2 }}>Using your saved CV</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={fileLoading} style={{ ...smallBtn, flex: 1, cursor: fileLoading ? 'wait' : 'pointer' }}>
                {fileLoading ? 'Reading your CV…' : 'Replace'}
              </button>
              <button type="button" onClick={removeSavedCv} style={{ ...smallBtn, flex: 1 }}>Remove</button>
            </div>
          </div>
          {notice}
        </>
      )
    }

    return (
      <>
        {cvFileName && cvText ? (
          <div style={{ padding: '7px 10px', background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SvgIcon name="document" size={14} color={green} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{`CV on file: ${cvFileName}`}</span>
            <button type="button" onClick={clearSessionCv} style={{ ...smallBtn, padding: '2px 8px', flexShrink: 0 }}>Remove</button>
          </div>
        ) : (
          <div onClick={() => !fileLoading && fileInputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.[0]) handleCvFile(e.dataTransfer.files[0]) }}
            style={{ padding: mobile ? '14px 12px' : '16px 12px', border: '1.5px dashed rgba(255,255,255,0.18)', borderRadius: 9, cursor: fileLoading ? 'wait' : 'pointer', textAlign: 'center' }}>
            {fileLoading
              ? <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: accent, animation: 'spin 0.7s linear infinite' }} />Reading your CV…</div>
              : <><div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}><SvgIcon name="document" size={mobile ? 18 : 20} color="rgba(255,255,255,0.5)" /></div><div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Upload your CV</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>PDF, DOCX or TXT</div></>}
          </div>
        )}
        <textarea value={cvDraft} onChange={e => onCvTextChange(e.target.value)} rows={cvText ? 3 : 4}
          placeholder="…or paste your CV text here"
          style={{ width: '100%', boxSizing: 'border-box', marginTop: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: '#E6F1FB', fontSize: 11, padding: '7px 10px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
        <label style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 10.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, cursor: 'pointer', marginTop: 6 }}>
          <input type="checkbox" checked={saveConsent} onChange={e => onConsentChange(e.target.checked)} style={{ marginTop: 1, accentColor: accent, flexShrink: 0 }} />
          <span>Save to my account for next time</span>
        </label>
        {notice}
      </>
    )
  }

  const canGenerate = !loading && !!cvText.trim() && canAfford
  const curTpl = templates.find(t => t.id === template)!

  // Same body the download sends — any edit that changes it (revision, template, photo, contact) re-renders the preview
  const pdfBody = cvData ? JSON.stringify({ cv: cvData, ac: curTpl.ac, template, photo: photoUrl || undefined }) : ''
  const cachedBody = pdf?.body ?? ''

  function cachePdf(blob: Blob, body: string) {
    setPdf({ url: URL.createObjectURL(blob), blob, body })
    setPdfError(null)
  }

  useEffect(() => () => { if (pdf) URL.revokeObjectURL(pdf.url) }, [pdf])

  useEffect(() => {
    if (!pdfBody) {
      setPdf(null); setPdfPending(false); setPdfError(null)
      return
    }
    if (cachedBody === pdfBody) { setPdfPending(false); return }
    const ctrl = new AbortController()
    setPdfPending(true)
    const timer = setTimeout(() => {
      fetchCvPdf(pdfBody, ctrl.signal)
        .then(blob => {
          if (ctrl.signal.aborted) return
          setPdf({ url: URL.createObjectURL(blob), blob, body: pdfBody })
          setPdfError(null)
        })
        .catch(err => {
          if (ctrl.signal.aborted) return
          console.error('PDF preview error:', err)
          setPdfError(pdfErrorMessage(err))
        })
        .finally(() => { if (!ctrl.signal.aborted) setPdfPending(false) })
    }, PREVIEW_DEBOUNCE_MS)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [pdfBody, cachedBody, pdfAttempt])

  return (
    <div style={{ minHeight: '100vh', background: '#0F1923', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@300;400;600;700&display=swap');
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .cvb-gen:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(0,0,0,.4) !important; }
        .cvb-action:hover { background: rgba(255,255,255,0.1) !important; }
        .shimmer { background: linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.09) 50%, rgba(255,255,255,.04) 75%); background-size:200% 100%; animation: shimmer 1.5s infinite; border-radius:4px; }
        .cv-preview { animation: fadeUp 0.35s ease; }
        .jl-dsb  { display: flex !important; }
        .jl-mob  { display: none !important; }
        .jl-mbtn { display: none !important; }
        @media (max-width: 768px) {
          .jl-dsb  { display: none !important; }
          .jl-mob  { display: flex !important; }
          .jl-mbtn { display: block !important; }
        }
      `}</style>

      {crossWarnPending && (
        <CrossMarketModal cost={CV_COST} market={MARKET.in} crossAmount={crossMarketAmount(CV_COST, MARKET.in)}
          onConfirm={() => { const fn = crossWarnPending; setCrossWarnPending(null); fn() }}
          onCancel={() => setCrossWarnPending(null)} />
      )}

      <div style={{ display: 'flex', height: 'calc(100vh - 52px)' }}>

        {/* ── LEFT PANEL ── */}
        <div className="jl-dsb" style={{ width: 288, flexShrink: 0, background: 'linear-gradient(180deg, #152233 0%, #0e1a28 100%)', borderRight: '1px solid rgba(255,255,255,0.08)', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <button onClick={() => router.push('/in/career-scan')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>{'<'}- Back to ATS Score</button>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>CV Studio</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              Design your perfect CV
              <span style={{ fontSize: 10, fontWeight: 700, color: '#FF9933', background: 'rgba(255,153,51,0.15)', padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' as const }}>
                {CREDIT_COST.tailorCv} credit
              </span>
            </div>
            {jobLabel && <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}><div style={{ fontSize: 9, color: accent, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>Tailoring for</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{jobLabel}</div></div>}

            {/* JD quality indicator + editable field */}
            {jobLabel && (
              <div style={{ marginTop: 8 }}>
                {(() => {
                  const jdLen = (jobDesc || job?.job_description || '').length
                  const hasUrl = !!job?.job_apply_link
                  const quality = jdLen < 300 ? 'short' : jdLen < 800 ? 'partial' : 'full'
                  const dot = quality === 'full' ? '#4ade80' : quality === 'partial' ? '#fbbf24' : '#f87171'
                  const label = quality === 'full'
                    ? `Full JD · ${jdLen} chars`
                    : quality === 'partial'
                    ? `May be incomplete · ${jdLen} chars`
                    : `Too short · ${jdLen} chars — paste full JD for better tailoring`
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }}/>
                        {label}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {quality !== 'full' && hasUrl && (
                          <button onClick={fetchFullJd} disabled={fetchingJd}
                            style={{ fontSize: 10, fontWeight: 700, color: accent, background: 'none', border: 'none', cursor: fetchingJd ? 'wait' : 'pointer', padding: 0, opacity: fetchingJd ? .6 : 1, whiteSpace: 'nowrap' }}>
                            {fetchingJd ? 'Fetching…' : '↓ Fetch full JD'}
                          </button>
                        )}
                        {hasUrl && (
                          <a href={job?.job_apply_link} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', whiteSpace: 'nowrap' }}
                            title="Open job posting">
                            ↗ Posting
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })()}
                {jdFetchError && (
                  <div style={{ fontSize: 11, color: '#fca5a5', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)', borderRadius: 8, padding: '8px 10px', marginBottom: 6, lineHeight: 1.5 }}>
                    {jdFetchError}{' '}
                    {job?.job_apply_link && (
                      <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer"
                        style={{ color: accent, fontWeight: 700, textDecoration: 'underline' }}>
                        Open job posting →
                      </a>
                    )}
                  </div>
                )}
                <button onClick={() => setJobDescOpen(o => !o)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600 }}>
                  <span>Full job description</span>
                  <span style={{ transform: jobDescOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
                </button>
                {jobDescOpen && (
                  <>
                    <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)}
                      placeholder="Paste the complete job posting here — the fuller it is, the better the CV is tailored."
                      rows={6}
                      style={{ width: '100%', marginTop: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '8px 10px', resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
                    />
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4, lineHeight: 1.4 }}>
                      Tip: job boards often shorten descriptions. Paste the full text from the original posting for best results.
                    </div>
                  </>
                )}
              </div>
            )}

            {/* No job attached — let the user paste one directly (JD from a friend, an email, a message) */}
            {!jobLabel && (
              <div style={{ marginTop: 12, padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.20)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, color: accent, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>
                  Attach a job
                </div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: 8 }}>
                  Got a job posting from a friend or a message? Add it here and the CV gets tailored exactly to it.
                </div>
                <input value={manualTitle} onChange={e => setManualTitle(e.target.value)}
                  placeholder="Job title *"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '7px 10px', outline: 'none', fontFamily: 'inherit' }} />
                <input value={manualCompany} onChange={e => setManualCompany(e.target.value)}
                  placeholder="Company (optional)"
                  style={{ width: '100%', boxSizing: 'border-box', marginTop: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '7px 10px', outline: 'none', fontFamily: 'inherit' }} />
                <textarea value={manualJd} onChange={e => setManualJd(e.target.value)} rows={5}
                  placeholder="Paste the job description here…"
                  style={{ width: '100%', boxSizing: 'border-box', marginTop: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '8px 10px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
                <button disabled={!manualTitle.trim()}
                  onClick={() => {
                    if (!manualTitle.trim()) return
                    const j = normalizeJob({ job_title: manualTitle, employer_name: manualCompany, job_description: manualJd, job_source: 'manual' })
                    if (!j) return
                    setJob(j)
                    setJobLabel(j.employer_name ? `${j.job_title} — ${j.employer_name}` : j.job_title)
                    setJobDesc(j.job_description)
                    writeJob(j)
                  }}
                  style={{ width: '100%', marginTop: 8, padding: '8px 0', borderRadius: 7, border: 'none', background: manualTitle.trim() ? accent : 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: manualTitle.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                  Attach job
                </button>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleCvFile(e.target.files[0])} />
            <div style={{ marginTop: 12 }}>{renderCvInput(false)}</div>
          </div>

          {/* ── Photo upload (every PDF template renders it) ── */}
          <div style={{ padding: '12px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 10 }}>
              Profile Photo <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.18)' }}>· optional</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${accent}55`, flexShrink: 0 }} />
              ) : (
                <div onClick={() => photoInputRef.current?.click()} style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1.5px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', fontSize: 18 }}>+</div>
              )}
              <div style={{ flex: 1 }}>
                <button onClick={() => photoInputRef.current?.click()} style={{ fontSize: 12, fontWeight: 600, color: photoUrl ? accent : 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', display: 'block' }}>
                  {photoUrl ? 'Change photo' : 'Upload photo'}
                </button>
                {photoUrl && (
                  <button onClick={() => setPhotoUrl('')} style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 3, fontFamily: 'inherit' }}>Remove</button>
                )}
              </div>
            </div>
            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handlePhotoFile(e.target.files[0])} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {/* Template accordion */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggleSection('template')} style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.template ? accent + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.template ? accent + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.template ? accent : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>01</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.template ? '#fff' : 'rgba(255,255,255,0.55)' }}>Template</span>
                  <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{curTpl.label}</span>
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', transform: openSections.template ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.template && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {atsFromScan && (<div style={{ padding: '7px 10px', background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, fontSize: 11, color: '#1D9E75', lineHeight: 1.4, marginBottom: 4 }}>Template selected for best ATS compatibility</div>)}
                  {atsSuggestions && (
                    <div style={{ padding: '10px 12px', background: 'rgba(255,153,51,0.08)', border: '1px solid rgba(255,153,51,0.25)', borderRadius: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>ATS Inputs Active</div>
                      {atsSuggestions.missing_keywords?.length > 0 && (<div style={{ marginBottom: 6 }}><div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>KEYWORDS TO ADD</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{atsSuggestions.missing_keywords.slice(0, 8).map((kw: string, i: number) => (<span key={i} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,153,51,0.15)', color: accent, border: '1px solid rgba(255,153,51,0.3)', fontWeight: 600 }}>{kw}</span>))}{atsSuggestions.missing_keywords.length > 8 && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>+{atsSuggestions.missing_keywords.length - 8} more</span>}</div></div>)}
                    </div>
                  )}
                  {templates.map(t => (
                    <div key={t.id} onClick={() => setTemplate(t.id)} style={{ padding: '10px 12px', borderRadius: 9, border: `1px solid ${template === t.id ? t.ac : 'rgba(255,255,255,0.09)'}`, background: template === t.id ? t.ac + '14' : 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Template thumbnail */}
                      <div style={{ width: 38, height: 48, borderRadius: 4, background: '#1a2535', flexShrink: 0, overflow: 'hidden', border: `1px solid ${template === t.id ? t.ac + '60' : 'rgba(255,255,255,0.07)'}` }}>
                        {t.preview}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: template === t.id ? '#fff' : 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{t.label}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.3 }}>{t.desc}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: t.atsColor, marginTop: 3, letterSpacing: 0.3 }}>{t.ats}</div>
                      </div>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${template === t.id ? t.ac : 'rgba(255,255,255,0.15)'}`, background: template === t.id ? t.ac : 'transparent', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Style accordion */}
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
                </div>
              )}
            </div>
          </div>

          {/* Generate button */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            {credits !== null && credits <= LOW_CREDIT_WARN && <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, padding: '7px 10px', fontSize: 11, color: '#fcd34d', marginBottom: 8, lineHeight: 1.5 }}>{credits === 0 ? 'No credits left. Top up on Account page.' : `${credits} credit${credits === 1 ? '' : 's'} remaining.`}</div>}
            {generateError && (
              <div style={{ marginBottom: 8 }}>
                <FlowError compact message={generateError.message}
                  secondary={generateError.status === 402 ? { label: 'Top up credits', href: '/in/account' } : undefined} />
              </div>
            )}
            <button className="cvb-gen" onClick={handleGenerate} disabled={!canGenerate}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: canGenerate ? `linear-gradient(135deg, ${accent}, #e67300)` : 'rgba(255,255,255,0.08)', color: canGenerate ? '#042C53' : 'rgba(255,255,255,0.25)', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: canGenerate ? 'pointer' : 'not-allowed', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.6)', animation: 'spin 0.7s linear infinite' }} />Generating...</>
                : !isAdmin && credits !== null && credits < CV_COST ? `Need ${CV_COST} credit — you have ${credits}`
                : cvData ? `Regenerate CV (${CV_COST} credit)` : `Generate CV (${CV_COST} credit)`}
            </button>
            <div style={{ marginTop: 7, fontSize: 10.5, color: 'rgba(255,255,255,0.35)', textAlign: 'center' as const, lineHeight: 1.4 }}>
              {PRICING_COPY.packageIncludes(BUNDLE.freeRevisions)}
            </div>
          </div>
        </div>

        {/* ── RIGHT PREVIEW PANEL ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#141E2B', minWidth: 0 }}>

          {/* Mobile toggle button */}
          <div className="jl-mbtn" style={{ padding: '10px 16px', background: '#152233', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
            <button onClick={() => setMobOpen(o => !o)} style={{ background: '#1a2d45', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{mobOpen ? '✕ Close Settings' : '⚙ CV Settings'}</button>
          </div>

          {/* Mobile settings panel */}
          {mobOpen && (
            <div className="jl-mob" style={{ background: 'linear-gradient(180deg, #152233 0%, #0e1a28 100%)', borderBottom: '1px solid rgba(255,255,255,0.1)', flexDirection: 'column', overflowY: 'auto', maxHeight: '65vh', padding: '16px', gap: 14, flexShrink: 0 }}>
              <div>{renderCvInput(true)}</div>
              {/* Mobile photo upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                {photoUrl ? (
                  <img src={photoUrl} alt="Profile" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${accent}55`, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1.5px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>+</div>
                )}
                <div style={{ flex: 1 }}>
                  <button onClick={() => photoInputRef.current?.click()} style={{ fontSize: 11, fontWeight: 600, color: photoUrl ? accent : 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                    {photoUrl ? 'Change photo' : 'Add photo (optional)'}
                  </button>
                  {photoUrl && <button onClick={() => setPhotoUrl('')} style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 10, fontFamily: 'inherit' }}>Remove</button>}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Template</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {templates.map(t => (
                    <button key={t.id} onClick={() => setTemplate(t.id)} style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${template === t.id ? t.ac : 'rgba(255,255,255,0.1)'}`, background: template === t.id ? t.ac + '20' : 'rgba(255,255,255,0.04)', color: template === t.id ? '#fff' : 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: template === t.id ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{t.label} <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>{t.desc}</span></span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: t.atsColor }}>{t.ats}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button className="cvb-gen" onClick={() => { handleGenerate() }} disabled={!canGenerate}
                style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: canGenerate ? `linear-gradient(135deg, ${accent}, #e67300)` : 'rgba(255,255,255,0.08)', color: canGenerate ? '#042C53' : 'rgba(255,255,255,0.25)', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: canGenerate ? 'pointer' : 'not-allowed' }}>
                {loading ? 'Generating...' : !isAdmin && credits !== null && credits < CV_COST ? `Need ${CV_COST} credit` : cvData ? `Regenerate (${CV_COST} credit)` : `Generate CV (${CV_COST} credit)`}
              </button>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', textAlign: 'center' as const, lineHeight: 1.4 }}>
                {PRICING_COPY.packageIncludes(BUNDLE.freeRevisions)}
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#152233', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: cvData ? accent : 'rgba(255,255,255,0.25)' }}>{skillGapLoading ? 'Checking job match…' : cvData ? 'CV Ready' : 'Preview'}</span>
              {cvData && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>{curTpl.label} | {lang}</span>}
            </div>
            {cvData && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="cvb-action" onClick={downloadPDF} disabled={downloading === 'pdf'} style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: downloading === 'pdf' ? accent : 'rgba(255,255,255,0.55)', fontSize: 11, cursor: downloading === 'pdf' ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{downloading === 'pdf' ? 'Building...' : 'PDF'}</button>
                <button className="cvb-action" onClick={downloadDOCX} disabled={downloading === 'docx'} style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: downloading === 'docx' ? accent : 'rgba(255,255,255,0.55)', fontSize: 11, cursor: downloading === 'docx' ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{downloading === 'docx' ? 'Building...' : 'Word'}</button>
                <button className="cvb-action" onClick={goToAtsCheck} style={{ padding: '7px 14px', borderRadius: 7, border: `1px solid ${accent}60`, background: accent + '14', color: accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>ATS Check</button>
                <button onClick={goToCoverLetter} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: accent, color: '#042C53', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Cover Letter →</button>
              </div>
            )}
          </div>

          {generateError && (
            <div style={{ margin: '12px 20px 0', flexShrink: 0 }}>
              <FlowError message={generateError.message}
                onRetry={generateError.status === 402 || !cvText.trim() ? undefined : handleGenerate}
                secondary={generateError.status === 402 ? { label: 'Top up credits', href: '/in/account' } : undefined} />
            </div>
          )}
          {downloadError && (
            <div style={{ margin: '12px 20px 0', flexShrink: 0 }}>
              <FlowError compact message={downloadError} />
            </div>
          )}

          {/* Preview area */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', padding: '28px 20px', display: 'flex', justifyContent: 'center' }}>

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

            {/* Empty state — no file uploaded, no generated CV */}
            {!loading && !cvData && !originalFileUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 20 }}>
                <div style={{ width: 260, opacity: 0.5 }}>
                  <div style={{ background: '#1C2A3A', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
                    <div style={{ display: 'flex', height: 300 }}>
                      <div style={{ width: 80, background: `${accent}15`, padding: '18px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: accent + '30', margin: '0 auto 6px' }} />
                        {[80,65,75,55,80,65,70].map((w,i) => <div key={i} style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, width: `${w}%` }} />)}
                      </div>
                      <div style={{ flex: 1, padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                        <div style={{ height: 11, background: 'rgba(255,255,255,0.12)', borderRadius: 3, width: '60%' }} />
                        <div style={{ height: 5, background: accent + '40', borderRadius: 2, width: '40%', marginBottom: 7 }} />
                        {[100,80,90,65,100,75,85,60,95].map((w,i) => <div key={i} style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, width: `${w}%` }} />)}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>{cvText ? 'Ready to design' : 'No CV uploaded'}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', lineHeight: 1.7 }}>{cvText ? `Choose a template and click Generate CV\n${curTpl.label}: ${curTpl.ats}` : 'Upload your CV using the panel on the left'}</div>
                  {cvText && <button onClick={handleGenerate} className="cvb-gen" disabled={!canGenerate} style={{ marginTop: 20, padding: '11px 28px', borderRadius: 10, border: 'none', background: canGenerate ? accent : 'rgba(255,255,255,0.1)', color: canGenerate ? '#0a1520' : 'rgba(255,255,255,0.3)', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: canGenerate ? 'pointer' : 'not-allowed' }}>Generate CV</button>}
                </div>
              </div>
            )}

            {/* Original file preview — uploaded but not yet generated */}
            {!loading && !cvData && originalFileUrl && (
              <div className="cv-preview" style={{ width: '100%', maxWidth: 740 }}>
                <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <div style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SvgIcon name="document" size={14} color="#6c757d" />
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6c757d', fontFamily: "'Outfit', sans-serif" }}>{cvFileName || 'Uploaded CV'}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#adb5bd', fontFamily: "'Outfit', sans-serif" }}>Your original</span>
                  </div>
                  {originalFileIsPdf ? (
                    <iframe src={originalFileUrl} title="Original CV" style={{ width: '100%', height: 680, border: 'none', display: 'block' }} />
                  ) : (
                    <div style={{ padding: '48px 32px', textAlign: 'center' as const }}>
                      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><SvgIcon name="pencil" size={36} color="#adb5bd" /></div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>DOCX uploaded</div>
                      <div style={{ fontSize: 12, color: '#868e96', marginBottom: 20 }}>Browser cannot preview DOCX files. Select a template and generate your new CV.</div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,153,51,0.08)', border: '1px solid rgba(255,153,51,0.2)', borderRadius: 10, fontSize: 12, color: 'rgba(255,153,51,0.8)', textAlign: 'center' as const, fontFamily: "'Outfit', sans-serif" }}>
                  ✓ CV uploaded — select a template on the left and click Generate CV
                </div>
              </div>
            )}

            {!loading && cvData && (
              <div className="cv-preview" style={{ width: '100%', maxWidth: 740 }}>

                {/* Before / After tab toggle — only when original file is in memory */}
                {originalFileUrl && (
                  <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 4 }}>
                    <button onClick={() => setPreviewTab('original')}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', background: previewTab === 'original' ? 'rgba(255,255,255,0.1)' : 'transparent', color: previewTab === 'original' ? '#E6F1FB' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: previewTab === 'original' ? 700 : 500, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <SvgIcon name="document" size={13} color="currentColor" />
                      Your Original
                    </button>
                    <button onClick={() => setPreviewTab('generated')}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', background: previewTab === 'generated' ? '#FF9933' : 'transparent', color: previewTab === 'generated' ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: previewTab === 'generated' ? 700 : 500, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <SvgIcon name="sparkle" size={13} color="currentColor" />
                      Generated CV
                    </button>
                  </div>
                )}

                {/* Original file view — only rendered when originalFileUrl is in memory */}
                {previewTab === 'original' && originalFileUrl && (
                  <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)', overflow: 'hidden', minHeight: 300 }}>
                    <div style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <SvgIcon name="document" size={14} color="#6c757d" />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#6c757d', fontFamily: "'Outfit', sans-serif" }}>{cvFileName || 'Uploaded CV'}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: '#adb5bd', fontFamily: "'Outfit', sans-serif" }}>Original file</span>
                    </div>
                    {originalFileIsPdf ? (
                      <iframe src={originalFileUrl} title="Original CV" style={{ width: '100%', height: 720, border: 'none', display: 'block' }} />
                    ) : (
                      <div style={{ padding: '48px 32px', textAlign: 'center' as const }}>
                        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><SvgIcon name="pencil" size={36} color="#adb5bd" /></div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>Preview not available</div>
                        <div style={{ fontSize: 12, color: '#868e96', marginBottom: 20 }}>DOCX files cannot be previewed directly in the browser.</div>
                        <a href={originalFileUrl} download={cvFileName} style={{ padding: '8px 20px', borderRadius: 8, background: '#FF9933', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: "'Outfit', sans-serif" }}>Download original</a>
                      </div>
                    )}
                  </div>
                )}

                {/* Generated CV — the rendered PDF itself */}
                {(previewTab === 'generated' || !originalFileUrl) && (
                  <PdfPreview url={pdf?.url ?? null} pending={pdfPending} error={pdfError} onRetry={() => setPdfAttempt(n => n + 1)} />
                )}

                {previewTab === 'original' && originalFileUrl && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' as const }}>
                    ← Switch to &quot;Generated CV&quot; to request changes or download
                  </div>
                )}

                {(previewTab === 'generated' || !originalFileUrl) && <div>
                {/* Contact editor */}
                <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingContact ? 12 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' as const }}>Contact Info</div>
                    <button onClick={() => { if (!editingContact) setContactDraft({ name: cvData?.name || '', email: cvData?.email || '', phone: cvData?.phone || '', location: cvData?.location || '', linkedin: cvData?.linkedin || '' }); setEditingContact(e => !e) }}
                      style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${accent}50`, background: 'transparent', color: accent, cursor: 'pointer', fontFamily: 'inherit' }}>
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
                      <button onClick={() => { if (!cvData) return; const updated = { ...cvData, ...contactDraft }; setCvData(updated); sessionStorage.setItem(SS.cvbData, JSON.stringify(updated)); setEditingContact(false) }}
                        style={{ padding: '8px 0', borderRadius: 7, border: 'none', background: accent, color: '#042C53', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                        Save contact info
                      </button>
                    </div>
                  )}
                </div>

                {/* Feedback */}
                <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' as const, marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' as const }}>Request changes</div>
                    {changeIncluded ? (
                      <span style={{ fontSize: 10, fontWeight: 600, color: accent, background: 'rgba(255,153,51,0.12)', border: '1px solid rgba(255,153,51,0.25)', padding: '2px 8px', borderRadius: 20 }}>{PRICING_COPY.changesLeft(revisionsLeft, until)}</span>
                    ) : bundleActive ? (
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#fcd34d', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', padding: '2px 8px', borderRadius: 20 }}>{PRICING_COPY.packageUsedUp(CV_COST)}</span>
                    ) : null}
                  </div>
                  <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="e.g. Make the summary shorter, highlight technical skills more…" rows={2}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '8px 10px', resize: 'vertical' as const, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' as const }} />
                  {feedbackError && (
                    <div style={{ marginTop: 8 }}>
                      <FlowError compact message={feedbackError.message}
                        secondary={feedbackError.status === 402 ? { label: 'Top up credits', href: '/in/account' } : undefined} />
                    </div>
                  )}
                  <button onClick={handleApplyFeedback} disabled={!canApplyChange}
                    style={{ marginTop: 8, padding: '7px 18px', borderRadius: 7, border: 'none', background: canApplyChange ? accent : 'rgba(255,255,255,0.08)', color: canApplyChange ? '#042C53' : 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 700, cursor: canApplyChange ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif" }}>
                    {applyingFeedback ? 'Applying…' : changeIncluded ? PRICING_COPY.applyIncluded(revisionsLeft) : PRICING_COPY.applyCosts(CV_COST)}
                  </button>
                </div>

                {/* Bottom actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap', paddingBottom: 40 }}>
                  <button onClick={downloadPDF} disabled={downloading === 'pdf'} style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: downloading === 'pdf' ? accent : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: downloading === 'pdf' ? 'wait' : 'pointer', fontFamily: "'Outfit', sans-serif" }}>{downloading === 'pdf' ? 'Building PDF...' : 'Download PDF'}</button>
                  <button onClick={downloadDOCX} disabled={downloading === 'docx'} style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: downloading === 'docx' ? accent : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: downloading === 'docx' ? 'wait' : 'pointer', fontFamily: "'Outfit', sans-serif" }}>{downloading === 'docx' ? 'Building Word...' : 'Download Word'}</button>
                  <button onClick={goToAtsCheck} style={{ padding: '10px 22px', borderRadius: 9, border: `1px solid ${accent}50`, background: accent + '15', color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Check ATS Score</button>
                  <button onClick={goToCoverLetter} style={{ padding: '10px 26px', borderRadius: 9, border: 'none', background: accent, color: '#042C53', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: `0 6px 20px ${accent}40` }}>Write Cover Letter →</button>
                </div>
                </div>}{/* end previewTab === 'generated' wrapper */}
              </div>
            )}
          </div>
        </div>
      </div>

      {skillGapOpen && skillGapData && (
        <SkillGapModal
          matching={skillGapData.matching}
          missing={skillGapData.missing}
          accent={accent}
          onConfirm={(confirmed) => { setSkillGapOpen(false); setSkillGapData(null); generate(confirmed) }}
          onSkip={() => { setSkillGapOpen(false); setSkillGapData(null); generate([]) }}
          onCareerScan={() => { setSkillGapOpen(false); setSkillGapData(null); router.push('/in/career-scan') }}
        />
      )}
    </div>
  )
}
