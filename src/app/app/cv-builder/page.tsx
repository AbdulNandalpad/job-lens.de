'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { useCredits } from '@/lib/useCredits'
import { useCurrentCv } from '@/lib/useCurrentCv'
import { useLanguage } from '@/lib/i18n'
import CrossMarketModal from '@/components/CrossMarketModal'
import SkillGapModal from '@/components/SkillGapModal'
import FlowError from '@/components/FlowError'
import { CREDIT_COST, LOW_CREDIT_WARN, MARKET, SS, API, BUNDLE } from '@/lib/constants'
import type { BundleState } from '@/lib/pricingCore'
import { type CVData, parseCvJson } from '@/lib/cv'
import { type JobRef, readJob, writeJob, normalizeJob } from '@/lib/job'
import { readJsonOrError } from '@/lib/apiError'
import { c } from '@/lib/theme'
import SvgIcon from '@/components/SvgIcon'

type Template = 'executive' | 'modern' | 'minimal' | 'technical'
type Tone = 'professional' | 'concise' | 'detailed'
type Lang = 'EN' | 'DE'

interface TailorCvResponse {
  cv?: string
  enhanced?: string
  result?: string
  creditsRemaining?: number
  pricing?: { bundle?: BundleState; admin?: boolean }
}

// -- PDF PREVIEW ---------------------------------------------------------------
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

function pdfErrorMessage(err: unknown, networkError: string, fallback: string): string {
  if (err instanceof TypeError) return networkError
  return err instanceof Error && err.message ? err.message : fallback
}

function PdfPreview({ url, pending, error, onRetry, labels }: {
  url: string | null
  pending: boolean
  error: string | null
  onRetry: () => void
  labels: { frameTitle: string; rendering: string; openInNewTab: string; retry: string }
}) {
  const showOverlay = pending || (!url && !error)
  return (
    <div>
      {error && (
        <div style={{ marginBottom: 12 }}>
          <FlowError compact message={error} onRetry={onRetry} retryLabel={labels.retry} />
        </div>
      )}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '210 / 297', background: c.bgCard, border: `1px solid ${c.borderLight}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
        {url && (
          <iframe key={url} src={`${url}#toolbar=0&navpanes=0&view=FitH`} title={labels.frameTitle}
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
              {labels.rendering}
            </div>
          </div>
        )}
      </div>
      {url && (
        <div style={{ marginTop: 8, textAlign: 'right' as const }}>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 600, color: c.accentLight, textDecoration: 'none' }}>
            {labels.openInNewTab} ↗
          </a>
        </div>
      )}
    </div>
  )
}
// Package expiry as HH:MM in the UI locale, prefixed with "tomorrow"/"morgen" when it is not today
function formatUntil(iso: string | null | undefined, uiLang: 'DE' | 'EN'): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const time = d.toLocaleTimeString(uiLang === 'DE' ? 'de-DE' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
  const now = new Date()
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  return sameDay ? time : `${uiLang === 'DE' ? 'morgen' : 'tomorrow'} ${time}`
}

// -- MAIN PAGE ----------------------------------------------------------------

export default function CVBuilderPage() {
  const router = useRouter()
  const { t, lang: uiLang } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoUrl, setPhotoUrl] = useState('')

  const { cvText, fileName: cvFileName, source: cvSource, rememberedConsent, setCv, clearCv, extractFile } = useCurrentCv()
  const [saveConsent, setSaveConsent] = useState(false)
  const [cvNotice, setCvNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [job, setJob] = useState<JobRef | null>(null)
  const [jobLabel, setJobLabel] = useState('')
  const [jobDesc, setJobDesc] = useState('')        // editable full job description
  const [jobDescOpen, setJobDescOpen] = useState(false)
  const [fetchingJd, setFetchingJd] = useState(false)
  const [jdFetchError, setJdFetchError] = useState<string | null>(null)
  // Manual job entry — for users who arrive directly with a JD in hand
  // (from a friend, a message, an email) instead of via Job Search
  const [manualTitle,   setManualTitle]   = useState('')
  const [manualCompany, setManualCompany] = useState('')
  const [manualJd,      setManualJd]      = useState('')
  const [langMismatch, setLangMismatch] = useState(false)
  const [template, setTemplate] = useState<Template>('executive')
  const [tone, setTone] = useState<Tone>('professional')
  const [pages, setPages] = useState<'1' | '2'>('1')
  const [lang, setLang] = useState<Lang>('EN')
  const [cvData, setCvData] = useState<CVData | null>(null)
  const [rawCv, setRawCv] = useState('')
  const [loading, setLoading] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ template: false, style: false, output: false })
  const [feedback, setFeedback] = useState('')
  const [applyingFeedback, setApplyingFeedback] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [feedbackErrorStatus, setFeedbackErrorStatus] = useState(0)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)
  const [generateError, setGenerateError] = useState<{ message: string; status: number } | null>(null)
  const [showClearCvConfirm, setShowClearCvConfirm] = useState(false)
  const [previewTab, setPreviewTab] = useState<'original' | 'generated'>('generated')
  const [originalFileUrl, setOriginalFileUrl] = useState<string | null>(null)
  const [originalFileIsPdf, setOriginalFileIsPdf] = useState(true)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  // The account CV is stored as text only — no original file bytes exist to preview
  const usingSavedCv = cvSource === 'saved'
  const cvChipBtn: React.CSSProperties = {
    flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }
  const { credits, setCredits, needsCrossMarket, crossMarketAmount } = useCredits()
  const CV_COST = CREDIT_COST.tailorCv
  // Server-decided package state for the current job (src/lib/pricing.ts) — display only; the route re-derives it on every call
  const [pricing, setPricing] = useState<{ bundle: BundleState; admin: boolean } | null>(null)
  const bundleActive = !!pricing?.bundle.active
  const revisionsLeft = pricing?.bundle.revisionsLeft ?? 0
  const changeIncluded = bundleActive && revisionsLeft > 0
  const isAdmin = !!pricing?.admin
  const until = formatUntil(pricing?.bundle.expiresAt, uiLang)
  const cannotAffordCv = !isAdmin && credits !== null && credits < CV_COST
  const changeBlocked = !changeIncluded && cannotAffordCv
  function absorbPricing(data: { pricing?: { bundle?: BundleState; admin?: boolean } } | null | undefined) {
    if (data?.pricing?.bundle) setPricing({ bundle: data.pricing.bundle, admin: !!data.pricing.admin })
  }
  const [crossWarnPending, setCrossWarnPending] = useState<(() => void) | null>(null)
  const [skillGapOpen, setSkillGapOpen] = useState(false)
  const [skillGapData, setSkillGapData] = useState<{ matching: string[]; missing: string[] } | null>(null)
  const [skillGapLoading, setSkillGapLoading] = useState(false)
  const [editingContact, setEditingContact] = useState(false)
  const [contactDraft, setContactDraft] = useState({ name: '', email: '', phone: '', location: '', linkedin: '' })

  function handlePhotoFile(file: File) {
    const r = new FileReader()
    r.onload = e => { const url = (e.target?.result as string) ?? ''; if (url) setPhotoUrl(url) }
    r.readAsDataURL(file)
  }

  // Clears this page's own results only (tailored CV + preview); the shared CV is a separate, explicit action.
  function clearPreviewResults() {
    setCvData(null)
    setRawCv('')
    setFeedback('')
    setFeedbackError(null)
    setFeedbackSuccess(false)
    setPreviewTab('generated')
    sessionStorage.removeItem(SS.cvbTailored)
    sessionStorage.removeItem(SS.cvbData)
  }

  // Session upload → clearCv() falls back to the account CV (if any). For the account CV itself,
  // clearCv() would re-adopt it at once, so "Remove" detaches it for this session via an empty session CV.
  function removeCurrentCv() {
    if (cvSource === 'saved') void setCv('', '')
    else clearCv()
    setCvNotice(null)
    setOriginalFileUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function clearCvAndPreview() {
    clearPreviewResults()
    removeCurrentCv()
    setShowClearCvConfirm(false)
  }

  function showSaveOutcome(out: { saved: boolean; error?: string }) {
    setCvNotice(out.saved ? { kind: 'ok', text: t.cv.saved } : { kind: 'error', text: t.cv.saveFailed(out.error || '') })
  }

  async function handleCvFile(file: File) {
    setCvNotice(null)
    setFileLoading(true)
    const extracted = await extractFile(file)
    if ('error' in extracted) {
      setCvNotice({ kind: 'error', text: extracted.error })
    } else if (extracted.text.trim().length < 50) {
      setCvNotice({ kind: 'error', text: t.cv.tooShort })
    } else {
      // Keep the original file as an object URL for the before/after view
      setOriginalFileUrl(URL.createObjectURL(file))
      setOriginalFileIsPdf(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
      const out = await setCv(extracted.text, file.name, { saveToAccount: saveConsent })
      if (saveConsent) showSaveOutcome(out)
    }
    setFileLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Ticking the box after an upload saves the CV that is already here — the tick is the consent.
  async function onConsentChange(checked: boolean) {
    setSaveConsent(checked)
    if (!checked || cvSource !== 'session' || !cvText.trim()) return
    showSaveOutcome(await setCv(cvText, cvFileName, { saveToAccount: true }))
  }

  function toggleSection(id: string) {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  useEffect(() => { setSaveConsent(rememberedConsent) }, [rememberedConsent])

  // Revoke objectURL when a new file is uploaded or component unmounts — prevents memory leak
  useEffect(() => {
    return () => { if (originalFileUrl) URL.revokeObjectURL(originalFileUrl) }
  }, [originalFileUrl])

  // The account CV has no file bytes; a text blob keeps the original/generated toggle working like an upload does
  useEffect(() => {
    if (cvSource !== 'saved' || !cvText) return
    setOriginalFileUrl(URL.createObjectURL(new Blob([cvText], { type: 'text/plain' })))
    setOriginalFileIsPdf(false)
  }, [cvSource, cvText])

  useEffect(() => {
    const savedJob = readJob()
    const savedRole = sessionStorage.getItem(SS.sjsTargetRole) || ''
    if (savedJob) {
      setJob(savedJob)
      setJobLabel(`${savedJob.employer_name} - ${savedJob.job_title}`)
      setJobDesc(savedJob.job_description || '')
    } else if (savedRole) {
      setJobLabel(savedRole)
    }
    // restore this page's last result
    const saved = sessionStorage.getItem(SS.cvbTailored)
    const savedData = parseCvJson(sessionStorage.getItem(SS.cvbData))
    if (saved) setRawCv(saved)
    if (savedData) setCvData(savedData)
  }, [])

  // Sync enriched jobDesc back to the shared job so cover letter always gets the full JD
  useEffect(() => {
    if (!job || !jobDesc) return
    writeJob({ ...job, job_description: jobDesc })
  }, [jobDesc, job])

  // Ask the server what this job costs right now (mount + whenever the job identity changes); on failure the copy falls back to "charged"
  const jobTitleKey = job?.job_title ?? ''
  const jobEmployerKey = job?.employer_name ?? ''
  useEffect(() => {
    let cancelled = false
    fetch(API.pricingBundle, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job: { job_title: jobTitleKey, employer_name: jobEmployerKey } }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d?.bundle) setPricing({ bundle: d.bundle, admin: !!d.admin }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [jobTitleKey, jobEmployerKey])

  // Detect language mismatch: German JD + English CV output setting
  useEffect(() => {
    if (!jobDesc && !job?.job_description) return
    const text = (jobDesc || job?.job_description || '').slice(0, 600).toLowerCase()
    const germanHits = ['aufgaben', 'anforderungen', 'wir bieten', 'kenntnisse', 'erfahrung', ' und ', ' für ', ' die ', ' der ', 'bewerbung', 'stellenanzeige']
    const isGerman = germanHits.filter(w => text.includes(w)).length >= 3
    setLangMismatch(isGerman && lang === 'EN')
  }, [jobDesc, job?.job_description, lang])

  async function fetchFullJd() {
    const url = job?.job_apply_link
    if (!url) return
    setFetchingJd(true)
    try {
      const res = await fetch('/api/fetch-jd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
      const data = await res.json()
      if (data.text) {
        setJobDesc(data.text)
        setJobDescOpen(true)
        setJdFetchError(null)
      } else {
        setJobDescOpen(true)
        setJdFetchError(lang === 'DE'
          ? 'Seite blockiert automatisches Laden. Öffne die Stellenanzeige, kopiere den Text und füge ihn unten ein:'
          : 'Site blocked the fetch. Open the job posting, copy the full description and paste it below:')
      }
    } catch {
      setJobDescOpen(true)
      setJdFetchError(lang === 'DE'
        ? 'Verbindungsfehler. Öffne die Stellenanzeige und füge den Text manuell ein:'
        : 'Connection error. Open the job posting and paste the description manually below:')
    }
    setFetchingJd(false)
  }

  async function generate(confirmedSkills: string[] = []) {
    if (!cvText.trim()) return
    if (cannotAffordCv) { setGenerateError({ message: t.coverLetter.sidebar.needCredits(CV_COST, credits ?? 0), status: 402 }); return }
    setLoading(true); setGenerateError(null)

    try {
      // Use the edited full job description if the user provided one
      const effJob = job ? { ...job, job_description: jobDesc || job.job_description } : job
      const res = await fetch(API.tailorCv, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, job: effJob, template, tone, pages, lang, confirmedSkills, returnJson: true }),
      })
      const out = await readJsonOrError<TailorCvResponse>(res)
      absorbPricing(out.data as TailorCvResponse | null)
      if (!out.ok) {
        // Server already refunded on failure — keep the previous tailored CV on screen
        if (out.status === 402 && typeof out.credits === 'number') setCredits(out.credits)
        setGenerateError({ message: out.message, status: out.status })
        return
      }
      const data = out.data
      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining)
      const raw = data.cv || data.enhanced || data.result || ''
      const parsed = parseCvJson(raw)
      if (!raw || !parsed) { setGenerateError({ message: t.common.requestFailed(out.status), status: out.status }); return }
      setRawCv(raw)
      setCvData(parsed)
      setPreviewTab('generated')
      sessionStorage.setItem(SS.cvbTailored, raw)
      sessionStorage.setItem(SS.cvbData, JSON.stringify(parsed))
    } catch {
      setGenerateError({ message: t.common.networkError, status: 0 })
    } finally {
      setLoading(false)
    }
  }

  async function runSkillGapThenGenerate() {
    const fullJd = jobDesc || job?.job_description
    if (fullJd && cvText) {
      setSkillGapLoading(true)
      try {
        const res = await fetch('/api/cv/skill-gap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cvText, jobDescription: fullJd }),
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
    if (!isAdmin && needsCrossMarket(CV_COST, MARKET.eu)) {
      setCrossWarnPending(() => runSkillGapThenGenerate)
    } else {
      runSkillGapThenGenerate()
    }
  }

  // A change request is only confirmed/pre-checked when the package will not cover it
  function handleApplyFeedback() {
    if (!changeIncluded && !isAdmin && needsCrossMarket(CV_COST, MARKET.eu)) {
      setCrossWarnPending(() => applyFeedback)
    } else {
      applyFeedback()
    }
  }

  async function applyFeedback() {
    if (!feedback.trim() || !rawCv) return
    if (changeBlocked) { setFeedbackError(t.coverLetter.sidebar.needCredits(CV_COST, credits ?? 0)); setFeedbackErrorStatus(402); return }
    setApplyingFeedback(true)
    setFeedbackError(null)
    setFeedbackErrorStatus(0)
    setFeedbackSuccess(false)

    try {
      const effJob = job ? { ...job, job_description: jobDesc || job.job_description } : job
      const res = await fetch(API.tailorCv, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvText, job: effJob, template, tone, pages, lang, returnJson: true,
          feedback, currentCv: rawCv,
          market: MARKET.eu,
        }),
      })
      const out = await readJsonOrError<TailorCvResponse>(res)
      absorbPricing(out.data as TailorCvResponse | null)

      if (!out.ok) {
        if (out.status === 402 && typeof out.credits === 'number') setCredits(out.credits)
        setFeedbackError(out.message)
        setFeedbackErrorStatus(out.status)
        setApplyingFeedback(false)
        return
      }

      const data = out.data
      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining)
      const raw: string = data.cv || ''

      if (!raw) {
        setFeedbackError(lang === 'DE'
          ? 'Die KI hat keine Antwort zurückgegeben. Bitte versuche es erneut.'
          : 'AI returned no response. Please try again.')
        setApplyingFeedback(false)
        return
      }

      const parsed = parseCvJson(raw)

      if (parsed) {
        setCvData(parsed)
        sessionStorage.setItem(SS.cvbData, JSON.stringify(parsed))
        setRawCv(raw)
        sessionStorage.setItem(SS.cvbTailored, raw)
        setFeedback('')
        setFeedbackSuccess(true)
        setTimeout(() => setFeedbackSuccess(false), 4000)
      } else {
        // AI processed the request but response wasn't valid JSON — tell user exactly why
        setFeedbackError(
          lang === 'DE'
            ? 'Änderungen wurden verarbeitet, konnten aber nicht dargestellt werden. Versuche es mit einer anderen Formulierung oder generiere den CV neu.'
            : "Changes processed but couldn't be rendered. Try rephrasing your request or regenerate the CV."
        )
      }

    } catch (networkErr) {
      console.error('[applyFeedback] Network error:', networkErr)
      setFeedbackError(t.common.networkError)
    }

    setApplyingFeedback(false)
  }

  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null)

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
        setDownloadError(pdfErrorMessage(err, t.common.networkError, t.cvBuilder.preview.failed))
        setDownloading(null)
        return
      }
      setDownloading(null)
    }
    const name = (job?.employer_name || cvData.name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CV_${name}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Complete DOCX export — no "Download Word" button currently calls this (only PDF is wired up).
  // Kept intentionally rather than deleted; wire up a button or remove if not wanted.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function downloadDOCX() {
    if (!cvData) return
    setDownloading('docx')
    try {
      const { Document, Packer, Paragraph, TextRun, BorderStyle } = await import('docx')

      const teal = '00A58A'
      const navy = '0d2137'
      const grey = '6b7c93'

      const sectionTitle = (text: string) => new Paragraph({
        children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 18, color: navy, font: 'Calibri' })],
        spacing: { before: 240, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'dde4ee' } },
      })

      const bullet = (text: string) => new Paragraph({
        children: [
          new TextRun({ text: '+ ', color: teal, bold: true, size: 18, font: 'Calibri' }),
          new TextRun({ text, size: 18, color: '374151', font: 'Calibri' }),
        ],
        spacing: { before: 40, after: 40 },
        indent: { left: 200 },
      })

      const children: InstanceType<typeof Paragraph>[] = []

      // Name
      children.push(new Paragraph({
        children: [new TextRun({ text: cvData.name, bold: true, size: 48, color: navy, font: 'Calibri' })],
        spacing: { after: 60 },
      }))

      // Title
      children.push(new Paragraph({
        children: [new TextRun({ text: cvData.title, bold: true, size: 22, color: teal, font: 'Calibri' })],
        spacing: { after: 60 },
      }))

      // Contact
      const contact = [cvData.email, cvData.phone, cvData.location, cvData.linkedin].filter(Boolean)
      if (contact.length) {
        children.push(new Paragraph({
          children: [new TextRun({ text: contact.join('  |  '), size: 18, color: grey, font: 'Calibri' })],
          spacing: { after: 120 },
        }))
      }

      // Stats
      if (cvData.stats?.length) {
        children.push(new Paragraph({
          children: cvData.stats.flatMap((s: { value: string; label: string }, i: number) => [
            new TextRun({ text: s.value, bold: true, size: 28, color: navy, font: 'Calibri' }),
            new TextRun({ text: ` ${s.label}`, size: 16, color: grey, font: 'Calibri' }),
            ...(i < cvData.stats.length - 1 ? [new TextRun({ text: '   |   ', size: 16, color: 'cccccc', font: 'Calibri' })] : []),
          ]),
          spacing: { after: 160 },
        }))
      }

      // Summary
      if (cvData.summary) {
        children.push(sectionTitle('Professional Summary'))
        children.push(new Paragraph({
          children: [new TextRun({ text: cvData.summary, size: 18, color: '374151', font: 'Calibri' })],
          spacing: { after: 120 },
        }))
      }

      // Skills
      if (cvData.skills?.length) {
        children.push(sectionTitle('Core Skills'))
        const skillText = cvData.skills.map((s: { name: string; level: number }) => `${s.name} (${s.level}%)`).join('  .  ')
        children.push(new Paragraph({
          children: [new TextRun({ text: skillText, size: 18, color: '374151', font: 'Calibri' })],
          spacing: { after: 120 },
        }))
      }

      // Tools
      if (cvData.tools?.length) {
        children.push(sectionTitle('Tech Stack'))
        children.push(new Paragraph({
          children: [new TextRun({ text: cvData.tools.join('  .  '), size: 18, color: '185FA5', font: 'Calibri' })],
          spacing: { after: 120 },
        }))
      }

      // Experience
      if (cvData.experience?.length) {
        children.push(sectionTitle('Professional Experience'))
        cvData.experience.forEach((exp: { role: string; company: string; period: string; location: string; type: string; bullets: string[] }) => {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: exp.role, bold: true, size: 22, color: navy, font: 'Calibri' }),
              new TextRun({ text: `  -  ${exp.period}`, size: 18, color: teal, font: 'Calibri' }),
            ],
            spacing: { before: 160, after: 40 },
          }))
          const meta = [exp.company, exp.location, exp.type].filter(Boolean).join('  .  ')
          children.push(new Paragraph({
            children: [new TextRun({ text: meta, size: 18, color: grey, italics: true, font: 'Calibri' })],
            spacing: { after: 60 },
          }))
          exp.bullets?.forEach((b: string) => children.push(bullet(b)))
          children.push(new Paragraph({ children: [], spacing: { after: 80 } }))
        })
      }

      // Education
      if (cvData.education?.length) {
        children.push(sectionTitle('Education'))
        cvData.education.forEach((e: { degree: string; school: string; year: string }) => {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: e.degree, bold: true, size: 20, color: navy, font: 'Calibri' }),
              new TextRun({ text: `  -  ${e.school}  (${e.year})`, size: 18, color: grey, font: 'Calibri' }),
            ],
            spacing: { after: 80 },
          }))
        })
      }

      // Certifications
      if (cvData.certifications?.length) {
        children.push(sectionTitle('Certifications'))
        cvData.certifications.forEach((c: string) => {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: '* ', color: teal, bold: true, size: 18, font: 'Calibri' }),
              new TextRun({ text: c, size: 18, color: '374151', font: 'Calibri' }),
            ],
            spacing: { after: 60 },
          }))
        })
      }

      // Languages
      if (cvData.languages?.length) {
        children.push(sectionTitle('Languages'))
        children.push(new Paragraph({
          children: cvData.languages.flatMap((l: { name: string; level: number }, i: number) => {
            const level = l.level >= 90 ? 'Native' : l.level >= 75 ? 'Fluent' : l.level >= 55 ? 'Proficient' : 'Basic'
            return [
              new TextRun({ text: l.name, bold: true, size: 18, color: navy, font: 'Calibri' }),
              new TextRun({ text: ` (${level})`, size: 18, color: grey, font: 'Calibri' }),
              ...(i < cvData.languages.length - 1 ? [new TextRun({ text: '   .   ', size: 18, color: 'cccccc', font: 'Calibri' })] : []),
            ]
          }),
          spacing: { after: 80 },
        }))
      }

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: { top: 900, right: 900, bottom: 900, left: 900 },
            },
          },
          children,
        }],
      })

      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CV_${(job?.employer_name || cvData.name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('DOCX error:', err)
      setDownloadError(lang === 'DE' ? 'DOCX konnte nicht erstellt werden. Bitte erneut versuchen.' : 'DOCX generation failed. Please try again.')
    }
    setDownloading(null)
  }

  function goToCoverLetter() {
    if (rawCv) sessionStorage.setItem(SS.cvbTailored, rawCv)
    router.push('/app/cover-letter')
  }

  // Ids are the names src/lib/CVPdf.tsx understands: executive/technical = sidebar, modern = header band, minimal = single column
  const templates: { id: Template; label: string; accent: string; desc: string }[] = [
    { id: 'executive', label: 'Executive', accent: '#00C9A7', desc: 'Navy sidebar . teal accents' },
    { id: 'modern', label: 'Modern', accent: '#378ADD', desc: 'Navy header band . blue accents' },
    { id: 'minimal', label: 'Minimal', accent: '#1a2332', desc: 'Single column . pure typography' },
    { id: 'technical', label: 'Technical', accent: '#E05C97', desc: 'Navy sidebar . pink accents' },
  ]

  const tones: { id: Tone; label: string; desc: string }[] = [
    { id: 'professional', label: 'Professional', desc: 'Polished & credible' },
    { id: 'concise', label: 'Concise', desc: 'Sharp & efficient' },
    { id: 'detailed', label: 'Detailed', desc: 'Thorough & expansive' },
  ]

  const currentAccent = templates.find(t => t.id === template)?.accent || '#00C9A7'

  // Same body the download sends — any edit that changes it (revision, template, photo, contact) re-renders the preview
  const pdfBody = cvData ? JSON.stringify({ cv: cvData, ac: currentAccent, template, photo: photoUrl || undefined }) : ''
  const [pdf, setPdf] = useState<RenderedPdf | null>(null)
  const [pdfPending, setPdfPending] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pdfAttempt, setPdfAttempt] = useState(0)
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
          setPdfError(pdfErrorMessage(err, t.common.networkError, t.cvBuilder.preview.failed))
        })
        .finally(() => { if (!ctrl.signal.aborted) setPdfPending(false) })
    }, PREVIEW_DEBOUNCE_MS)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [pdfBody, cachedBody, pdfAttempt, t])

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
        .cvb-layout { display: flex; height: calc(100vh - 52px); }
        .cvb-sidebar { width: 300px; flex-shrink: 0; background: linear-gradient(180deg,#152233 0%,#0e1a28 100%); border-right: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; overflow-y: auto; }
        .cvb-preview-area { flex: 1; overflow-y: auto; min-width: 0; }
        .cvb-mob-settings { display: none; }
        @media (max-width: 768px) {
          .cvb-layout { flex-direction: column; height: auto; min-height: calc(100vh - 52px); }
          .cvb-sidebar { width: 100%; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.08); overflow-y: visible; flex-shrink: 0; }
          .cvb-preview-area { overflow-y: visible; }
          .cvb-mob-settings { display: block; }
          .cvb-mob-hide { display: none; }
        }
      `}</style>

      <Navbar />

      {crossWarnPending && (
        <CrossMarketModal
          cost={CV_COST}
          market="eu"
          crossAmount={crossMarketAmount(CV_COST, MARKET.eu)}
          onConfirm={() => { const fn = crossWarnPending; setCrossWarnPending(null); fn() }}
          onCancel={() => setCrossWarnPending(null)}
        />
      )}

      {/* Confirm removing uploaded CV when a generated preview exists */}
      {showClearCvConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0e1a28', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 380, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚠</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#E6F1FB', marginBottom: 6, fontFamily: "'Outfit', sans-serif" }}>
                  {lang === 'DE' ? 'Lebenslauf entfernen?' : 'Remove CV?'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                  {lang === 'DE'
                    ? 'Der generierte Lebenslauf wird ebenfalls entfernt. Diese Aktion kann nicht rückgängig gemacht werden.'
                    : 'Your generated CV preview will also be removed. This cannot be undone.'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowClearCvConfirm(false)}
                style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                {lang === 'DE' ? 'Abbrechen' : 'Cancel'}
              </button>
              <button
                onClick={clearCvAndPreview}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.85)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                {lang === 'DE' ? 'Ja, entfernen' : 'Yes, remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="cvb-layout">

        {/* -- LEFT STUDIO PANEL -- */}
        <div className="cvb-sidebar">

          {/* Header */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <button onClick={() => router.push('/app/smart-apply')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
              {'<'}- Back to Jobs
            </button>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>{t.cvBuilder.sidebar.title}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              {t.cvBuilder.sidebar.subtitle}
              <span style={{ fontSize: 10, fontWeight: 700, color: '#378ADD', background: 'rgba(55,138,221,0.18)', padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' as const }}>
                {CREDIT_COST.tailorCv} credit
              </span>
            </div>
            {jobLabel && (
              <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, color: currentAccent, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>{t.cvBuilder.sidebar.targetJobLabel}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{jobLabel}</div>
              </div>
            )}

            {/* Editable full job description — better JD = better tailoring */}
            {jobLabel && (
              <div style={{ marginTop: 8 }}>
                {/* JD quality indicator */}
                {(() => {
                  const jdLen = (jobDesc || job?.job_description || '').length
                  const hasUrl = !!job?.job_apply_link
                  const quality = jdLen < 300 ? 'short' : jdLen < 800 ? 'partial' : 'full'
                  const dot = quality === 'full' ? '#4ade80' : quality === 'partial' ? '#fbbf24' : '#f87171'
                  const label = quality === 'full'
                    ? (lang === 'DE' ? `Vollständig · ${jdLen} Zeichen` : `Full JD · ${jdLen} chars`)
                    : quality === 'partial'
                    ? (lang === 'DE' ? `Möglicherweise unvollständig · ${jdLen} Zeichen` : `May be incomplete · ${jdLen} chars`)
                    : (lang === 'DE' ? `Zu kurz · ${jdLen} Zeichen — für bessere Ergebnisse vollständige Beschreibung einfügen` : `Too short · ${jdLen} chars — paste the full JD for better tailoring`)
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }}/>
                        {label}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {quality !== 'full' && hasUrl && (
                          <button onClick={fetchFullJd} disabled={fetchingJd}
                            style={{ fontSize: 10, fontWeight: 700, color: currentAccent, background: 'none', border: 'none', cursor: fetchingJd ? 'wait' : 'pointer', padding: 0, opacity: fetchingJd ? .6 : 1, whiteSpace: 'nowrap' }}>
                            {fetchingJd ? (lang === 'DE' ? 'Lädt…' : 'Fetching…') : (lang === 'DE' ? '↓ Volltext laden' : '↓ Fetch full JD')}
                          </button>
                        )}
                        {hasUrl && (
                          <a href={job?.job_apply_link} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', whiteSpace: 'nowrap' }}
                            title={lang === 'DE' ? 'Stellenanzeige öffnen' : 'Open job posting'}>
                            ↗ {lang === 'DE' ? 'Anzeige' : 'Posting'}
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
                        style={{ color: currentAccent, fontWeight: 700, textDecoration: 'underline' }}>
                        {lang === 'DE' ? 'Stellenanzeige öffnen →' : 'Open job posting →'}
                      </a>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setJobDescOpen(o => !o)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600 }}>
                  <span>{lang === 'DE' ? 'Vollständige Stellenbeschreibung' : 'Full job description'}</span>
                  <span style={{ transform: jobDescOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
                </button>
                {jobDescOpen && (
                  <>
                    <textarea
                      value={jobDesc}
                      onChange={e => setJobDesc(e.target.value)}
                      placeholder={lang === 'DE'
                        ? 'Füge die komplette Stellenanzeige ein — je vollständiger, desto besser passt der Lebenslauf.'
                        : 'Paste the complete job posting here — the fuller it is, the better the CV is tailored.'}
                      rows={6}
                      style={{ width: '100%', marginTop: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '8px 10px', resize: 'vertical', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
                    />
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4, lineHeight: 1.4 }}>
                      {lang === 'DE'
                        ? 'Tipp: Stellenbörsen kürzen oft die Beschreibung. Füge den vollständigen Text von der Original-Anzeige ein.'
                        : 'Tip: job boards often shorten descriptions. Paste the full text from the original posting for best results.'}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* No job attached — let the user paste one directly (JD from a friend, an email, a message) */}
            {!jobLabel && (
              <div style={{ marginTop: 12, padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.20)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, color: currentAccent, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>
                  {lang === 'DE' ? 'Stelle anhängen' : 'Attach a job'}
                </div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: 8 }}>
                  {lang === 'DE'
                    ? 'Anzeige per E-Mail oder WhatsApp bekommen? Füge sie hier ein — der Lebenslauf wird exakt darauf zugeschnitten.'
                    : 'Got a job posting from a friend or a message? Add it here and the CV gets tailored exactly to it.'}
                </div>
                <input value={manualTitle} onChange={e => setManualTitle(e.target.value)}
                  placeholder={lang === 'DE' ? 'Jobtitel *' : 'Job title *'}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '7px 10px', outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
                <input value={manualCompany} onChange={e => setManualCompany(e.target.value)}
                  placeholder={lang === 'DE' ? 'Unternehmen (optional)' : 'Company (optional)'}
                  style={{ width: '100%', boxSizing: 'border-box', marginTop: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '7px 10px', outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
                <textarea value={manualJd} onChange={e => setManualJd(e.target.value)} rows={5}
                  placeholder={lang === 'DE' ? 'Stellenbeschreibung hier einfügen…' : 'Paste the job description here…'}
                  style={{ width: '100%', boxSizing: 'border-box', marginTop: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '8px 10px', resize: 'vertical', outline: 'none', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }} />
                <button disabled={!manualTitle.trim()}
                  onClick={() => {
                    const title = manualTitle.trim()
                    if (!title) return
                    const j = normalizeJob({ job_title: title, employer_name: manualCompany.trim(), job_description: manualJd.trim(), job_source: 'manual' })
                    if (!j) return
                    setJob(j)
                    setJobLabel(j.employer_name ? `${j.job_title} — ${j.employer_name}` : j.job_title)
                    setJobDesc(j.job_description)
                    writeJob(j)
                  }}
                  style={{ width: '100%', marginTop: 8, padding: '8px 0', borderRadius: 7, border: 'none', background: manualTitle.trim() ? currentAccent : 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: manualTitle.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                  {lang === 'DE' ? 'Stelle anhängen' : 'Attach job'}
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleCvFile(e.target.files[0])} />
            {cvSource === 'saved' && cvText ? (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(29,158,117,0.12)', border: `1px solid ${c.success}`, borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SvgIcon name="document" size={16} color={c.success} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: c.success, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {cvFileName ? t.cv.onFile(cvFileName) : t.cv.usingSaved}
                    </div>
                    {cvFileName && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{t.cv.usingSaved}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={fileLoading} style={cvChipBtn}>
                    {fileLoading ? t.cv.reading : t.cv.replace}
                  </button>
                  <button type="button" onClick={() => { if (cvData) setShowClearCvConfirm(true); else removeCurrentCv() }} style={cvChipBtn}>
                    {t.cv.remove}
                  </button>
                </div>
              </div>
            ) : !cvText ? (
              <div onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.[0]) handleCvFile(e.dataTransfer.files[0]) }}
                style={{ marginTop: 12, padding: '16px 12px', border: '1.5px dashed rgba(255,255,255,0.18)', borderRadius: 9, cursor: 'pointer', textAlign: 'center' }}>
                {fileLoading ? (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: currentAccent, animation: 'spin 0.7s linear infinite' }} />
                    {t.coverLetter.sidebar.reading}
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}><SvgIcon name="document" size={20} color="rgba(255,255,255,0.5)" /></div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{t.cvBuilder.sidebar.cvLabel}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>PDF · DOCX · TXT</div>
                  </>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 12, padding: '7px 10px', background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                  {cvFileName ? `✓ ${cvFileName}` : t.coverLetter.sidebar.cvLoaded}
                </span>
                <button
                  onClick={() => {
                    if (cvData) {
                      setShowClearCvConfirm(true)
                    } else {
                      removeCurrentCv()
                    }
                  }}
                  aria-label={t.cv.remove}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 16, padding: 0, flexShrink: 0, lineHeight: 1 }}>×</button>
              </div>
            )}
            {cvSource !== 'saved' && (
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8, fontSize: 10.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, cursor: 'pointer' }}>
                <input type="checkbox" checked={saveConsent} onChange={e => onConsentChange(e.target.checked)} style={{ marginTop: 1, accentColor: c.accent, flexShrink: 0 }} />
                <span>{t.cv.saveToAccount}</span>
              </label>
            )}
            {cvNotice && (
              <div style={{ marginTop: 8 }}>
                {cvNotice.kind === 'ok'
                  ? <div style={{ fontSize: 11, color: c.success, display: 'flex', alignItems: 'center', gap: 6 }}><SvgIcon name="check-circle" size={13} color={c.success} />{cvNotice.text}</div>
                  : <FlowError compact message={cvNotice.text} />}
              </div>
            )}
          </div>

          {/* Photo upload — every PDF template renders it */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 8 }}>
                Profile Photo
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {photoUrl ? (
                  <img src={photoUrl} alt="Profile" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${currentAccent}55`, flexShrink: 0 }} />
                ) : (
                  <div onClick={() => photoInputRef.current?.click()} style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1.5px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', fontSize: 18 }}>+</div>
                )}
                <div style={{ flex: 1 }}>
                  <button onClick={() => photoInputRef.current?.click()} style={{ fontSize: 12, fontWeight: 600, color: photoUrl ? currentAccent : 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', display: 'block' }}>
                    {photoUrl ? 'Change photo' : 'Upload photo'}
                  </button>
                  {photoUrl && (
                    <button onClick={() => setPhotoUrl('')} style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 3, fontFamily: 'inherit' }}>Remove</button>
                  )}
                </div>
              </div>
              <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handlePhotoFile(e.target.files[0])} />
            </div>

          {/* Accordion sections - scrollable. minHeight guards against this flex
              item's automatic min-size resolving to 0 and getting crushed by the
              fixed-height siblings above/below inside the height-capped sidebar. */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 260 }}>

            {/* SECTION: Template */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggleSection('template')}
                style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.template ? currentAccent + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.template ? currentAccent + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.template ? currentAccent : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>01</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.template ? '#fff' : 'rgba(255,255,255,0.55)' }}>{t.cvBuilder.sidebar.templateLabel}</span>
                  {template && <span style={{ fontSize: 10, color: currentAccent, fontWeight: 600 }}>{templates.find(t => t.id === template)?.label}</span>}
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', transform: openSections.template ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.template && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {templates.map(t => (
                    <div key={t.id}
                      onClick={() => setTemplate(t.id)}
                      style={{ padding: '10px 12px', borderRadius: 9, border: `1px solid ${template === t.id ? t.accent : 'rgba(255,255,255,0.09)'}`, background: template === t.id ? t.accent + '14' : 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Mini preview thumbnail */}
                      <div style={{ width: 38, height: 48, borderRadius: 4, background: '#1a2535', flexShrink: 0, overflow: 'hidden', border: `1px solid ${template === t.id ? t.accent + '60' : 'rgba(255,255,255,0.07)'}` }}>
                        {(t.id === 'executive' || t.id === 'technical') && (
                          <div style={{ display: 'flex', height: '100%' }}>
                            <div style={{ width: 12, background: t.accent + '25', padding: '3px 2px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent + '70', margin: '0 auto' }} />
                              {[1,2,3,4].map(i => <div key={i} style={{ height: 2, background: t.accent + '40', borderRadius: 1 }} />)}
                            </div>
                            <div style={{ flex: 1, padding: '3px 2px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <div style={{ height: 3, background: 'rgba(255,255,255,0.45)', borderRadius: 1 }} />
                              {[80,60,90,70,85].map((w, i) => <div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.12)', borderRadius: 1, width: `${w}%` }} />)}
                            </div>
                          </div>
                        )}
                        {t.id === 'modern' && (
                          <>
                            <div style={{ height: 12, background: 'linear-gradient(90deg, #042C53, #185FA5)' }} />
                            <div style={{ display: 'flex', height: 'calc(100% - 12px)' }}>
                              <div style={{ width: 11, background: '#f0f4f8', padding: '2px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {[1,2,3,4].map(i => <div key={i} style={{ height: 1.5, background: '#c0cfe0', borderRadius: 1 }} />)}
                              </div>
                              <div style={{ flex: 1, padding: '3px 2px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {[90,70,85,60,80].map((w, i) => <div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.12)', borderRadius: 1, width: `${w}%` }} />)}
                              </div>
                            </div>
                          </>
                        )}
                        {t.id === 'minimal' && (
                          <div style={{ padding: '5px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ height: 4, background: 'rgba(255,255,255,0.55)', borderRadius: 1, width: '65%' }} />
                            <div style={{ height: 1, background: 'rgba(255,255,255,0.2)' }} />
                            {[80,60,90,55,75,65].map((w, i) => <div key={i} style={{ height: 1.5, background: 'rgba(255,255,255,0.1)', borderRadius: 1, width: `${w}%` }} />)}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: template === t.id ? '#fff' : 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{t.label}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.3 }}>{t.desc}</div>
                      </div>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${template === t.id ? t.accent : 'rgba(255,255,255,0.15)'}`, background: template === t.id ? t.accent : 'transparent', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION: Style & Format */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => toggleSection('style')}
                style={{ width: '100%', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: openSections.style ? currentAccent + '25' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${openSections.style ? currentAccent + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: openSections.style ? currentAccent : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>02</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: openSections.style ? '#fff' : 'rgba(255,255,255,0.55)' }}>{t.cvBuilder.sidebar.toneLabel} & {t.cvBuilder.sidebar.languageLabel}</span>
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', transform: openSections.style ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
              </button>
              {openSections.style && (
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Language */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{t.cvBuilder.sidebar.languageLabel}</div>
                    {langMismatch && (
                      <div style={{ fontSize: 11, color: '#fbbf24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)', borderRadius: 8, padding: '8px 10px', marginBottom: 8, lineHeight: 1.5 }}>
                        {lang === 'DE' ? 'Die Stelle ist auf Deutsch — CV auf Deutsch erstellen?' : 'This job posting is in German — write the CV in German?'}
                        {' '}
                        <button onClick={() => setLang('DE')} style={{ color: '#fbbf24', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: 11 }}>
                          {lang === 'DE' ? 'Ja, Deutsch' : 'Switch to German'}
                        </button>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['EN', 'DE'] as Lang[]).map(l => (
                        <button key={l} onClick={() => setLang(l)}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${lang === l ? currentAccent : 'rgba(255,255,255,0.1)'}`, background: lang === l ? currentAccent + '20' : 'rgba(255,255,255,0.04)', color: lang === l ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: lang === l ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                          {l === 'EN' ? t.coverLetter.preview.english : t.coverLetter.preview.deutsch}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{t.cvBuilder.sidebar.toneLabel}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {tones.map(t => (
                        <div key={t.id} onClick={() => setTone(t.id)}
                          style={{ padding: '9px 11px', borderRadius: 8, border: `1px solid ${tone === t.id ? currentAccent : 'rgba(255,255,255,0.08)'}`, background: tone === t.id ? currentAccent + '14' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: tone === t.id ? '#fff' : 'rgba(255,255,255,0.6)' }}>{t.label}</div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{t.desc}</div>
                          </div>
                          <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${tone === t.id ? currentAccent : 'rgba(255,255,255,0.2)'}`, background: tone === t.id ? currentAccent : 'transparent', flexShrink: 0 }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Length */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{lang === 'DE' ? 'Länge' : 'Length'}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['1', '2'] as const).map(p => (
                        <button key={p} onClick={() => setPages(p)}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${pages === p ? currentAccent : 'rgba(255,255,255,0.1)'}`, background: pages === p ? currentAccent + '20' : 'rgba(255,255,255,0.04)', color: pages === p ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: pages === p ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                          {p === '1' ? (lang === 'DE' ? '1 Seite' : '1 page') : (lang === 'DE' ? '2 Seiten' : '2 pages')}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Job Match — gap analysis, shown once a job-tailored CV has been generated */}
            {cvData && cvData.matchGaps.length > 0 && (
              <div style={{ margin: '4px 16px 16px', padding: '14px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <span style={{ fontSize: 13 }}>⚠</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>
                    {lang === 'DE' ? `${cvData.matchGaps.length} Lücke${cvData.matchGaps.length > 1 ? 'n' : ''} zur Stellenanzeige` : `${cvData.matchGaps.length} gap${cvData.matchGaps.length > 1 ? 's' : ''} vs. this job`}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {cvData.matchGaps.map((gap, i) => (
                    <div key={i} style={{ paddingBottom: i < cvData.matchGaps.length - 1 ? 10 : 0, borderBottom: i < cvData.matchGaps.length - 1 ? '1px solid rgba(245,158,11,0.15)' : 'none' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#fcd34d', marginBottom: 4 }}>*** {gap.requirement}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, marginBottom: 3 }}>
                        <span style={{ color: 'rgba(255,255,255,0.35)' }}>{lang === 'DE' ? 'Fehlt: ' : 'Missing: '}</span>{gap.missing}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, marginBottom: 3 }}>
                        <span style={{ color: 'rgba(255,255,255,0.35)' }}>{lang === 'DE' ? 'Lösung im CV: ' : 'What we did: '}</span>{gap.workaround}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>
                        <span style={{ color: 'rgba(255,255,255,0.35)' }}>{lang === 'DE' ? 'Ideal wäre: ' : 'Ideally: '}</span>{gap.idealAddition}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Generate button - pinned bottom */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            {credits !== null && credits <= LOW_CREDIT_WARN && (
              <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, padding: '7px 10px', fontSize: 11, color: '#fcd34d', marginBottom: 8, lineHeight: 1.5 }}>
                {credits === 0 ? t.cvBuilder.sidebar.noCredits : t.cvBuilder.sidebar.lowCredits(credits!)}
              </div>
            )}
            {generateError && (
              <div style={{ marginBottom: 8 }}>
                <FlowError compact message={generateError.message}
                  secondary={generateError.status === 402 ? { label: t.common.topUp, href: '/app/account' } : undefined} />
              </div>
            )}
            <button className="cvb-gen" onClick={handleGenerate} disabled={loading || !cvText.trim() || cannotAffordCv}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: loading || !cvText.trim() || cannotAffordCv ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${currentAccent}, ${currentAccent}BB)`, color: loading || !cvText.trim() || cannotAffordCv ? 'rgba(255,255,255,0.25)' : '#042C53', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: loading || !cvText.trim() || cannotAffordCv ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading
                ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.6)', animation: 'spin 0.7s linear infinite' }} /> {t.coverLetter.sidebar.writing}</>
                : cannotAffordCv
                ? t.coverLetter.sidebar.needCredits(CV_COST, credits ?? 0)
                : cvData ? t.cvBuilder.sidebar.regenerateBtn(CV_COST) : t.cvBuilder.sidebar.generateBtn(CV_COST)}
            </button>
            <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'center' as const, lineHeight: 1.4 }}>
              {t.pricing.packageIncludes(BUNDLE.freeRevisions)}
            </div>
          </div>
        </div>

        {/* -- RIGHT PREVIEW -- */}
        <div className="cvb-preview-area" style={{ display: 'flex', flexDirection: 'column', background: '#141E2B' }}>

          {/* Action bar */}
          <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#152233', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: cvData ? currentAccent : 'rgba(255,255,255,0.25)' }}>
                {skillGapLoading ? (lang === 'DE' ? 'Analysiere Stelle...' : 'Checking job match…') : cvData ? (lang === 'DE' ? 'Lebenslauf bereit' : 'CV Ready') : (lang === 'DE' ? 'Vorschau' : 'Preview')}
              </span>
              {cvData && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
                  {templates.find(t => t.id === template)?.label} | {lang}
                </span>
              )}
            </div>
            {cvData && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="cvb-action" onClick={downloadPDF} disabled={downloading === 'pdf'}
                  style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: downloading === 'pdf' ? currentAccent : 'rgba(255,255,255,0.55)', fontSize: 11, cursor: downloading === 'pdf' ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {downloading === 'pdf' ? (lang === 'DE' ? 'Wird erstellt...' : 'Building PDF…') : 'PDF'}
                </button>
                <button onClick={goToCoverLetter}
                  style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: currentAccent, color: '#042C53', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s' }}>
                  {t.navbar.coverLetter} →
                </button>
              </div>
            )}
          </div>

          {downloadError && (
            <div style={{ margin: '12px 24px 0', flexShrink: 0 }}>
              <FlowError compact message={downloadError} onRetry={downloadPDF} retryLabel={t.common.tryAgain} />
            </div>
          )}

          {generateError && (
            <div style={{ margin: '12px 24px 0', flexShrink: 0 }}>
              <FlowError message={generateError.message} onRetry={handleGenerate} retryLabel={t.common.tryAgain}
                secondary={generateError.status === 402 ? { label: t.common.topUp, href: '/app/account' } : undefined} />
            </div>
          )}

          {/* Preview canvas */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px', display: 'flex', justifyContent: 'center' }}>

            {/* Loading skeleton */}
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
                      {[100,85,95,70,100,80,90,65,100,75,85,60,95].map((w,i) => (
                        <div key={i} className="shimmer" style={{ height: i % 5 === 0 ? 12 : 7, width: `${w}%`, animationDelay: `${i * 0.07}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${currentAccent}40`, borderTopColor: currentAccent, animation: 'spin 0.7s linear infinite' }} />
                  {lang === 'DE' ? 'Lebenslauf wird erstellt...' : 'Generating your CV...'}
                </div>
              </div>
            )}

            {/* Empty state */}
            {/* Empty state — no file uploaded, no generated CV */}
            {!loading && !cvData && !originalFileUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 20 }}>
                <div style={{ width: 300, opacity: 0.5, position: 'relative' }}>
                  <div style={{ background: '#1C2A3A', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
                    <div style={{ display: 'flex', height: 320 }}>
                      <div style={{ width: 90, background: `${currentAccent}15`, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: currentAccent + '30', margin: '0 auto 8px' }} />
                        {[80,65,75,55,80,65,70,55].map((w,i) => <div key={i} style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, width: `${w}%` }} />)}
                      </div>
                      <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ height: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 3, width: '60%' }} />
                        <div style={{ height: 6, background: currentAccent + '40', borderRadius: 2, width: '40%', marginBottom: 8 }} />
                        {[100,80,90,65,100,75,85,60,95,70].map((w,i) => <div key={i} style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 2, width: `${w}%` }} />)}
                      </div>
                    </div>
                  </div>
                  <div style={{ position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)', width: 160, height: 30, background: currentAccent, borderRadius: '50%', filter: 'blur(24px)', opacity: 0.2 }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>
                    {cvText ? (lang === 'DE' ? 'Bereit zum Erstellen' : 'Ready to generate') : (lang === 'DE' ? 'Kein Lebenslauf hochgeladen' : 'No CV uploaded')}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', lineHeight: 1.7 }}>
                    {cvText ? (lang === 'DE' ? 'Einstellungen wählen und Lebenslauf erstellen klicken' : 'Choose settings and click Generate CV') : (lang === 'DE' ? 'Lade zuerst deinen Lebenslauf hoch' : 'Upload your CV first to get started')}
                  </div>
                  {cvText && (
                    <>
                      <button onClick={handleGenerate} className="cvb-gen"
                        disabled={cannotAffordCv}
                        style={{ marginTop: 20, padding: '11px 28px', borderRadius: 10, border: 'none', background: cannotAffordCv ? 'rgba(255,255,255,0.1)' : currentAccent, color: cannotAffordCv ? 'rgba(255,255,255,0.3)' : '#0a1520', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, cursor: cannotAffordCv ? 'not-allowed' : 'pointer' }}>
                        {cannotAffordCv ? t.coverLetter.sidebar.needCredits(CV_COST, credits ?? 0) : t.cvBuilder.sidebar.generateBtn(CV_COST)}
                      </button>
                      <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>
                        {t.pricing.packageIncludes(BUNDLE.freeRevisions)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Original file preview — uploaded but not yet generated */}
            {!loading && !cvData && originalFileUrl && (
              <div className="cv-preview" style={{ width: '100%', maxWidth: 740 }}>
                <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <div style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SvgIcon name="document" size={14} color="#6c757d" />
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6c757d', fontFamily: "'Outfit', sans-serif" }}>
                      {cvFileName || (lang === 'DE' ? 'Hochgeladener Lebenslauf' : 'Uploaded CV')}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#adb5bd', fontFamily: "'Outfit', sans-serif" }}>
                      {lang === 'DE' ? 'Dein Original' : 'Your original'}
                    </span>
                  </div>
                  {originalFileIsPdf ? (
                    <iframe src={originalFileUrl} title={lang === 'DE' ? 'Original-Lebenslauf' : 'Original CV'} style={{ width: '100%', height: 680, border: 'none', display: 'block' }} />
                  ) : (
                    <div style={{ padding: '48px 32px', textAlign: 'center' as const }}>
                      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><SvgIcon name="pencil" size={36} color="#adb5bd" /></div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>
                        {usingSavedCv
                          ? (lang === 'DE' ? 'Gespeicherter Lebenslauf ausgewählt' : 'Saved CV selected')
                          : (lang === 'DE' ? 'DOCX hochgeladen' : 'DOCX uploaded')}
                      </div>
                      <div style={{ fontSize: 12, color: '#868e96' }}>
                        {usingSavedCv
                          ? (lang === 'DE' ? 'Keine Vorschau des Originaldokuments verfügbar. Vorlage wählen und Lebenslauf erstellen.' : 'No preview of the original document available. Select a template and generate your new CV.')
                          : (lang === 'DE' ? 'Browser kann DOCX nicht anzeigen. Vorlage wählen und Lebenslauf erstellen.' : 'Browser cannot preview DOCX files. Select a template and generate your new CV.')}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 12, padding: '10px 14px', background: `${currentAccent}15`, border: `1px solid ${currentAccent}30`, borderRadius: 10, fontSize: 12, color: `${currentAccent}cc`, textAlign: 'center' as const, fontFamily: "'Outfit', sans-serif" }}>
                  {lang === 'DE' ? '✓ Lebenslauf hochgeladen — Vorlage wählen und Lebenslauf erstellen klicken' : '✓ CV uploaded — select a template on the left and click Generate CV'}
                </div>
              </div>
            )}

            {/* Rendered CV */}
            {!loading && cvData && (
              <div className="cv-preview" style={{ width: '100%', maxWidth: 740 }}>

                {/* Before / After tab toggle — only when original file is in memory */}
                {originalFileUrl && (
                  <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 4 }}>
                    <button
                      onClick={() => setPreviewTab('original')}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', background: previewTab === 'original' ? 'rgba(255,255,255,0.1)' : 'transparent', color: previewTab === 'original' ? '#E6F1FB' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: previewTab === 'original' ? 700 : 500, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <SvgIcon name="document" size={13} color="currentColor" />
                      {lang === 'DE' ? 'Dein Original' : 'Your Original'}
                    </button>
                    <button
                      onClick={() => setPreviewTab('generated')}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', background: previewTab === 'generated' ? currentAccent : 'transparent', color: previewTab === 'generated' ? '#042C53' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: previewTab === 'generated' ? 700 : 500, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <SvgIcon name="sparkle" size={13} color="currentColor" />
                      {lang === 'DE' ? 'Generierter Lebenslauf' : 'Generated CV'}
                    </button>
                  </div>
                )}

                {/* Original CV file view — only rendered when file is in memory */}
                {previewTab === 'original' && originalFileUrl && (
                  <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)', overflow: 'hidden', minHeight: 300 }}>
                    <div style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <SvgIcon name="document" size={14} color="#6c757d" />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#6c757d', fontFamily: "'Outfit', sans-serif" }}>
                        {cvFileName || (lang === 'DE' ? 'Hochgeladener Lebenslauf' : 'Uploaded CV')}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: '#adb5bd', fontFamily: "'Outfit', sans-serif" }}>
                        {lang === 'DE' ? 'Original-Datei' : 'Original file'}
                      </span>
                    </div>
                    {originalFileIsPdf ? (
                      <iframe
                        src={originalFileUrl}
                        title={lang === 'DE' ? 'Original-Lebenslauf' : 'Original CV'}
                        style={{ width: '100%', height: 720, border: 'none', display: 'block' }}
                      />
                    ) : (
                      <div style={{ padding: '48px 32px', textAlign: 'center' as const }}>
                        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><SvgIcon name="pencil" size={36} color="#adb5bd" /></div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>
                          {lang === 'DE' ? 'Vorschau nicht verfügbar' : 'Preview not available'}
                        </div>
                        <div style={{ fontSize: 12, color: '#868e96', marginBottom: 20 }}>
                          {usingSavedCv
                            ? (lang === 'DE' ? 'Für den gespeicherten Lebenslauf liegt nur der Text vor, keine Originaldatei.' : 'Only the extracted text is stored for your saved CV — the original file isn’t available.')
                            : (lang === 'DE' ? 'DOCX-Dateien können nicht direkt im Browser angezeigt werden.' : 'DOCX files cannot be previewed directly in the browser.')}
                        </div>
                        {!usingSavedCv && (
                          <a href={originalFileUrl} download={cvFileName}
                            style={{ padding: '8px 20px', borderRadius: 8, background: '#378ADD', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: "'Outfit', sans-serif" }}>
                            {lang === 'DE' ? 'Original herunterladen' : 'Download original'}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Generated CV — the rendered PDF itself */}
                {(previewTab === 'generated' || !originalFileUrl) && (
                  <PdfPreview url={pdf?.url ?? null} pending={pdfPending} error={pdfError}
                    onRetry={() => setPdfAttempt(n => n + 1)}
                    labels={{ frameTitle: t.cvBuilder.preview.frameTitle, rendering: t.cvBuilder.preview.rendering, openInNewTab: t.cvBuilder.preview.openInNewTab, retry: t.common.tryAgain }} />
                )}

                {previewTab === 'original' && originalFileUrl && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' as const }}>
                    {lang === 'DE'
                      ? '← Wechsle zu „Generierter Lebenslauf" um Änderungen anzufordern oder herunterzuladen'
                      : '← Switch to "Generated CV" to request changes or download'}
                  </div>
                )}

                {/* Contact editor, feedback widget and download actions — only on generated tab */}
                {(previewTab === 'generated' || !originalFileUrl) && <div>

                {/* Free contact info editor */}
                <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingContact ? 12 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' as const }}>{lang === 'DE' ? 'Kontaktdaten' : 'Contact Info'}</div>
                    <button onClick={() => {
                      if (!editingContact) setContactDraft({ name: cvData?.name || '', email: cvData?.email || '', phone: cvData?.phone || '', location: cvData?.location || '', linkedin: cvData?.linkedin || '' })
                      setEditingContact(e => !e)
                    }} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${currentAccent}50`, background: 'transparent', color: currentAccent, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {editingContact ? (lang === 'DE' ? 'Abbrechen' : 'Cancel') : (lang === 'DE' ? 'Bearbeiten — kostenlos' : 'Edit — free')}
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
                      }} style={{ padding: '8px 0', borderRadius: 7, border: 'none', background: currentAccent, color: '#042C53', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                        {lang === 'DE' ? 'Kontaktdaten speichern' : 'Save contact info'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Feedback input */}
                <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' as const }}>{lang === 'DE' ? 'Änderungen anfordern' : 'Request changes'}</div>
                    {/* Package status pill — server-derived; nothing shown when no package is open for this job */}
                    {changeIncluded
                      ? <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '2px 8px' }}>
                          {t.pricing.changesLeft(revisionsLeft, until)}
                        </div>
                      : bundleActive
                        ? <div style={{ fontSize: 10, fontWeight: 600, color: currentAccent, background: `${currentAccent}18`, borderRadius: 20, padding: '2px 8px' }}>
                            {t.pricing.packageUsedUp(CV_COST)}
                          </div>
                        : null}
                  </div>
                  <textarea
                    value={feedback}
                    onChange={e => { setFeedback(e.target.value); setFeedbackError(null) }}
                    placeholder={lang === 'DE' ? 'z.B. Mehr Führungskompetenzen hervorheben...' : 'e.g. Emphasise leadership skills, highlight promotions, add more detail to 2022 role...'}
                    rows={3}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${feedbackError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 7, color: '#E6F1FB', fontSize: 12, padding: '8px 10px', resize: 'vertical' as const, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' as const }}
                  />
                  {/* Error message */}
                  {feedbackError && (
                    <div style={{ marginTop: 6 }}>
                      <FlowError compact message={feedbackError}
                        secondary={feedbackErrorStatus === 402 ? { label: t.common.topUp, href: '/app/account' } : undefined} />
                    </div>
                  )}
                  {/* Success message */}
                  {feedbackSuccess && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 6, padding: '7px 10px' }}>
                      ✓ {lang === 'DE' ? 'Änderungen wurden erfolgreich übernommen!' : 'Changes applied successfully!'}
                    </div>
                  )}
                  <button
                    onClick={handleApplyFeedback}
                    disabled={!feedback.trim() || applyingFeedback || changeBlocked}
                    style={{ marginTop: 8, padding: '7px 18px', borderRadius: 7, border: 'none', background: feedback.trim() && !applyingFeedback && !changeBlocked ? currentAccent : 'rgba(255,255,255,0.08)', color: feedback.trim() && !applyingFeedback && !changeBlocked ? '#042C53' : 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 700, cursor: feedback.trim() && !applyingFeedback && !changeBlocked ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif" }}>
                    {applyingFeedback
                      ? (lang === 'DE' ? 'Wird angewendet...' : 'Applying changes…')
                      : changeBlocked
                        ? t.coverLetter.sidebar.needCredits(CV_COST, credits ?? 0)
                        : changeIncluded
                          ? t.pricing.applyIncluded(revisionsLeft)
                          : t.pricing.applyCosts(CV_COST)}
                  </button>
                </div>

                {/* Footer actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' as const, paddingBottom: 40 }}>
                  <button onClick={downloadPDF} disabled={downloading === 'pdf'}
                    style={{ padding: '11px 28px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: downloading === 'pdf' ? currentAccent : 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 600, cursor: downloading === 'pdf' ? 'wait' : 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                    {downloading === 'pdf' ? (lang === 'DE' ? 'Wird erstellt...' : 'Building PDF…') : (lang === 'DE' ? 'PDF herunterladen' : 'Download PDF')}
                  </button>
                  <button onClick={goToCoverLetter}
                    style={{ padding: '11px 28px', borderRadius: 9, border: 'none', background: currentAccent, color: '#042C53', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: `0 6px 20px ${currentAccent}40` }}>
                    {t.navbar.coverLetter} →
                  </button>
                </div>

                </div>}{/* end previewTab === 'generated' wrapper */}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skill Gap Modal */}
      {skillGapOpen && skillGapData && (
        <SkillGapModal
          matching={skillGapData.matching}
          missing={skillGapData.missing}
          accent={currentAccent}
          onConfirm={(confirmed) => { setSkillGapOpen(false); setSkillGapData(null); generate(confirmed) }}
          onSkip={() => { setSkillGapOpen(false); setSkillGapData(null); generate([]) }}
          onCareerScan={() => { setSkillGapOpen(false); setSkillGapData(null); router.push('/app/career-scan') }}
        />
      )}
    </div>
  )
}
