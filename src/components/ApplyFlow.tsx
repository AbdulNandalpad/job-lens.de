'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { API, BUNDLE, CREDIT_COST, MARKET, SS, type Market } from '@/lib/constants'
import { c, f } from '@/lib/theme'
import { translations } from '@/lib/i18n/translations'
import { useLanguage } from '@/lib/i18n'
import { useCredits } from '@/lib/useCredits'
import { useCurrentCv } from '@/lib/useCurrentCv'
import { readJob, writeJob, clearJob, normalizeJob, jobDraftKey, type JobRef, type JobSource } from '@/lib/job'
import { parseCvJson, cvTextFromTailored, type CVData } from '@/lib/cv'
import { readJsonOrError, toUserMessage } from '@/lib/apiError'
import { downloadLetterPdf } from '@/lib/letterPdf'
import type { BundleState } from '@/lib/pricingCore'
import FlowError from '@/components/FlowError'
import CrossMarketModal from '@/components/CrossMarketModal'
import SvgIcon from '@/components/SvgIcon'

type Step = 1 | 2 | 3 | 4 | 5
type PdfTemplate = 'minimal' | 'executive' | 'modern'
type OutLang = 'DE' | 'EN'
type JobTab = 'url' | 'paste' | 'search'
type CreatePhase = 'idle' | 'cv' | 'letter' | 'pdf' | 'change'

interface FitState { matching: string[]; missing: string[]; confirmed: string[]; skipped?: boolean }
interface AtsState { ats_score: number; readiness?: string; missing_keywords: string[]; domain_mismatch: boolean; mismatch_message: string }
interface PricingState { bundle: BundleState; admin: boolean }
interface Draft {
  v: 1
  market: Market
  step: Step
  jobKey: string
  jobTab?: JobTab
  fit?: FitState
  ats?: AtsState
  options: { template: PdfTemplate; pages: '1' | '2'; lang: OutLang }
  applied?: 'applied' | 'saved'
  updatedAt: string
}

interface SearchRow extends JobRef { score?: number }

const SHORT_JD = 400
const MIN_JD_FETCH = 600
const STEPS: Step[] = [1, 2, 3, 4, 5]
const POSTED_OPTIONS: { label: string; value: string }[] = [
  { label: '24h', value: '1' }, { label: '3d', value: '3' }, { label: '7d', value: '7' }, { label: '30d', value: '30' },
]

const pdfTemplateAccent: Record<PdfTemplate, string> = { minimal: '#1a2332', executive: '#0d2137', modern: '#185FA5' }

function readDraft(market: Market): Draft | null {
  try {
    const raw = sessionStorage.getItem(SS.applyDraft)
    if (!raw) return null
    const d = JSON.parse(raw) as Draft
    return d && d.v === 1 && d.market === market ? d : null
  } catch { return null }
}

function formatUntil(iso: string | null, lang: OutLang): string {
  if (!iso) return ''
  const d = new Date(iso)
  const time = d.toLocaleTimeString(lang === 'DE' ? 'de-DE' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
  const today = new Date().toDateString() === d.toDateString()
  return today ? time : `${lang === 'DE' ? 'morgen' : 'tomorrow'} ${time}`
}

export default function ApplyFlow({ market }: { market: Market }) {
  const { lang: uiLang } = useLanguage()
  const lang: OutLang = market === MARKET.in ? 'EN' : uiLang
  const tr = translations[lang]
  const t = tr.apply
  const tcv = tr.cv
  const tp = tr.pricing
  const accent = market === MARKET.in ? c.accentIn : c.accent
  const accentDark = market === MARKET.in ? c.accentInDark : c.primary
  const base = market === MARKET.in ? '/in' : '/app'

  const cv = useCurrentCv()
  const { credits, setCredits, needsCrossMarket, crossMarketAmount } = useCredits()

  const [hydrated, setHydrated] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const [job, setJob] = useState<JobRef | null>(null)
  const [jobTab, setJobTab] = useState<JobTab>('url')
  const [fit, setFit] = useState<FitState | null>(null)
  const [ats, setAts] = useState<AtsState | null>(null)
  const [template, setTemplate] = useState<PdfTemplate>('minimal')
  const [pages, setPages] = useState<'1' | '2'>('1')
  const [outLang, setOutLang] = useState<OutLang>(lang)
  const [applied, setApplied] = useState<'applied' | 'saved' | null>(null)

  const [cvJson, setCvJson] = useState<string>('')
  const [cvData, setCvData] = useState<CVData | null>(null)
  const [letter, setLetter] = useState<string>('')
  const [pricing, setPricing] = useState<PricingState | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const pdfBlobRef = useRef<Blob | null>(null)

  const [phase, setPhase] = useState<CreatePhase>('idle')
  const [error, setError] = useState<{ message: string; status?: number; retry?: () => void } | null>(null)
  const [letterError, setLetterError] = useState<string | null>(null)
  const [cross, setCross] = useState<{ cost: number; amount: number; onConfirm: () => void } | null>(null)
  const arrivedWithJobRef = useRef(false)
  const needsCvFirstRef = useRef(false)

  // ── hydrate from session ────────────────────────────────────────────────────
  useEffect(() => {
    const draft = readDraft(market)
    const existingJob = readJob()
    const key = jobDraftKey(existingJob)
    if (draft && existingJob && draft.jobKey === key) {
      setJob(existingJob)
      setJobTab(draft.jobTab ?? 'url')
      if (draft.fit) setFit(draft.fit)
      if (draft.ats) setAts(draft.ats)
      setTemplate(draft.options.template)
      setPages(draft.options.pages)
      setOutLang(draft.options.lang)
      if (draft.applied) setApplied(draft.applied)
      try {
        const raw = sessionStorage.getItem(SS.cvbTailored) || ''
        const parsed = parseCvJson(raw)
        if (parsed) { setCvJson(raw); setCvData(parsed) }
        const l = sessionStorage.getItem(SS.clLetter) || ''
        if (l) setLetter(l)
      } catch {}
      setStep(draft.step)
    } else if (existingJob) {
      // Arrived from a jobs page / Kira with a job but no draft (or a different job): fresh run for this job
      try {
        sessionStorage.removeItem(SS.cvbTailored)
        sessionStorage.removeItem(SS.cvbData)
        sessionStorage.removeItem(SS.clLetter)
      } catch {}
      arrivedWithJobRef.current = true
      needsCvFirstRef.current = true
      setJob(existingJob)
      setStep(2)
    } else {
      setStep(1)
    }
    setHydrated(true)
  }, [market])

  // Skip the CV step automatically when a CV is already available and the user is at step 1 with a job waiting
  useEffect(() => {
    if (!hydrated || cv.loading) return
    if (step === 1 && cv.cvText && job) setStep(2)
    else if (step === 2 && !cv.cvText && needsCvFirstRef.current) setStep(1)
    needsCvFirstRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, cv.loading])

  // ── persist draft ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return
    const draft: Draft = {
      v: 1, market, step, jobKey: jobDraftKey(job), jobTab,
      fit: fit ?? undefined, ats: ats ?? undefined,
      options: { template, pages, lang: outLang },
      applied: applied ?? undefined,
      updatedAt: new Date().toISOString(),
    }
    try { sessionStorage.setItem(SS.applyDraft, JSON.stringify(draft)) } catch {}
  }, [hydrated, market, step, job, jobTab, fit, ats, template, pages, outLang, applied])

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl) }, [pdfUrl])

  // ── pricing (read-only, so the price is right before the click) ────────────
  const refreshPricing = useCallback(async (j: JobRef | null) => {
    if (!j) return
    try {
      const res = await fetch(API.pricingBundle, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job: j }) })
      const out = await readJsonOrError<{ bundle: BundleState; admin: boolean }>(res)
      if (out.ok && out.data.bundle) setPricing({ bundle: out.data.bundle, admin: !!out.data.admin })
    } catch {}
  }, [])
  useEffect(() => { if (hydrated && job && step >= 4) refreshPricing(job) }, [hydrated, job, step, refreshPricing])

  const applyPricing = (data: unknown) => {
    const p = (data as { pricing?: { bundle?: BundleState; admin?: boolean }; creditsRemaining?: number } | null)
    if (p?.pricing?.bundle) setPricing({ bundle: p.pricing.bundle, admin: !!p.pricing.admin })
    if (typeof p?.creditsRemaining === 'number') setCredits(p.creditsRemaining)
  }

  const bundleActive = !!pricing?.bundle.active
  const revisionsLeft = pricing?.bundle.revisionsLeft ?? 0
  const changeIncluded = bundleActive && revisionsLeft > 0
  const isAdmin = !!pricing?.admin
  const until = formatUntil(pricing?.bundle.expiresAt ?? null, lang)

  /** Run `fn`, first confirming cross-market credit use when the call will be charged. */
  const withCreditCheck = (cost: number, fn: () => void) => {
    if (cost > 0 && !isAdmin && needsCrossMarket(cost, market)) {
      setCross({ cost, amount: crossMarketAmount(cost, market), onConfirm: () => { setCross(null); fn() } })
      return
    }
    fn()
  }
  const lacksCredits = (cost: number) => cost > 0 && !isAdmin && credits !== null && credits < cost

  // ── step 1: CV ──────────────────────────────────────────────────────────────
  const [consent, setConsent] = useState(false)
  const [cvBusy, setCvBusy] = useState(false)
  const [cvMsg, setCvMsg] = useState<string | null>(null)
  const [cvErr, setCvErr] = useState<string | null>(null)
  const [pasteText, setPasteText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => { setConsent(cv.rememberedConsent) }, [cv.rememberedConsent])

  const commitCv = async (text: string, name: string) => {
    setCvErr(null); setCvMsg(null)
    const r = await cv.setCv(text, name, { saveToAccount: consent })
    if (consent) setCvMsg(r.saved ? tcv.saved : tcv.saveFailed(r.error || ''))
  }
  const onFile = async (file: File) => {
    setCvBusy(true); setCvErr(null)
    const r = await cv.extractFile(file)
    if ('error' in r) setCvErr(r.error)
    else await commitCv(r.text, file.name)
    setCvBusy(false)
  }

  // ── step 2: job ─────────────────────────────────────────────────────────────
  const [url, setUrl] = useState('')
  const [jdTitle, setJdTitle] = useState('')
  const [jdCompany, setJdCompany] = useState('')
  const [jdText, setJdText] = useState('')
  const [jdUrl, setJdUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [fetchNote, setFetchNote] = useState<string | null>(null)
  const [jobErr, setJobErr] = useState<string | null>(null)
  const [shortWarn, setShortWarn] = useState(false)

  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState(market === MARKET.in ? 'in' : 'de')
  const [posted, setPosted] = useState('')
  const [source, setSource] = useState<'adzuna' | 'ba'>('adzuna')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchRow[] | null>(null)
  const [searchErr, setSearchErr] = useState<string | null>(null)

  const fetchJd = async (link: string): Promise<{ text: string } | { blocked: true } | { error: string }> => {
    try {
      const res = await fetch(API.fetchJd, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: link }) })
      const out = await readJsonOrError<{ text?: string; blocked?: boolean }>(res)
      if (!out.ok) return { error: out.message }
      if (out.data.blocked || !out.data.text || out.data.text.length < 200) return { blocked: true }
      return { text: out.data.text }
    } catch (e) { return { error: toUserMessage(e) } }
  }

  // Arrived with a picked job: prefill the paste fields and pull the full posting when the search snippet is short
  useEffect(() => {
    if (!hydrated || !arrivedWithJobRef.current || !job) return
    arrivedWithJobRef.current = false
    const initial = job
    setJdTitle(initial.job_title); setJdCompany(initial.employer_name); setJdText(initial.job_description); setJdUrl(initial.job_apply_link || '')
    if (initial.job_description.length >= MIN_JD_FETCH || !initial.job_apply_link) return
    setFetching(true)
    fetchJd(initial.job_apply_link).then(r => {
      setFetching(false)
      if (!('text' in r) || r.text.length <= initial.job_description.length) return
      const enriched = { ...initial, job_description: r.text }
      writeJob(enriched)
      setJdText(r.text)
      setJob(prev => (prev && jobDraftKey(prev) === jobDraftKey(initial) ? enriched : prev))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  const onFetchUrl = async () => {
    const link = url.trim()
    if (!link.startsWith('https://')) { setJobErr(t.job.urlPlaceholder); return }
    setFetching(true); setJobErr(null); setFetchNote(null)
    const r = await fetchJd(link)
    setFetching(false)
    if ('error' in r) { setJobErr(r.error); return }
    if ('blocked' in r) { setFetchNote(t.job.blocked); setJdUrl(link); setJobTab('paste'); return }
    setJdText(r.text)
    setJdUrl(link)
    if (!jdTitle) {
      const first = r.text.split('\n').map(s => s.trim()).find(s => s.length > 3 && s.length <= 90)
      if (first) setJdTitle(first)
    }
    setJobTab('paste')
  }

  const confirmJob = (j: JobRef, force = false) => {
    if (!j.job_title.trim()) { setJobErr(t.job.needTitle); return }
    if (!force && j.job_description.trim().length < SHORT_JD) { setShortWarn(true); setJob(j); return }
    setShortWarn(false); setJobErr(null)
    writeJob(j)
    try { sessionStorage.removeItem(SS.cvbTailored); sessionStorage.removeItem(SS.cvbData); sessionStorage.removeItem(SS.clLetter) } catch {}
    setJob(j); setFit(null); setAts(null); setCvJson(''); setCvData(null); setLetter(''); setPdfUrl(null); pdfBlobRef.current = null; setApplied(null)
    setStep(3)
  }

  const onUsePasted = () => {
    const j = normalizeJob({ job_title: jdTitle, employer_name: jdCompany, job_description: jdText, job_apply_link: jdUrl, job_source: jdUrl ? 'url' : 'paste' })
    if (!j) { setJobErr(t.job.needTitle); return }
    confirmJob(j)
  }

  const onSearch = async () => {
    if (!q.trim() && !city.trim()) return
    setSearching(true); setSearchErr(null); setResults(null)
    try {
      const params = new URLSearchParams({ q: q.trim(), country })
      if (city.trim()) params.set('location', city.trim())
      if (posted) params.set('max_days_old', posted)
      const endpoint = source === 'ba' ? API.baJobs : API.jobs
      const res = await fetch(`${endpoint}?${params}`)
      const out = await readJsonOrError<{ jobs?: Record<string, unknown>[] }>(res)
      if (!out.ok) { setSearchErr(out.message); setSearching(false); return }
      const rows = (out.data.jobs || []).map(r => normalizeJob({ ...r, job_source: source })).filter((x): x is JobRef => !!x).slice(0, 10) as SearchRow[]
      setResults(rows)
      setSearching(false)
      if (rows.length && cv.cvText) {
        try {
          const rres = await fetch(API.jobsRank, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q.trim(), cvText: cv.cvText, jobs: rows.map(r => ({ job_id: r.job_id, job_title: r.job_title, job_description: r.job_description })) }) })
          const rout = await readJsonOrError<{ scores?: { job_id: string; score: number }[] }>(rres)
          if (rout.ok && rout.data.scores) {
            const map = new Map(rout.data.scores.map(s => [s.job_id, s.score]))
            setResults(rows.map(r => ({ ...r, score: r.job_id ? map.get(r.job_id) : undefined })))
          }
        } catch {}
      }
    } catch (e) { setSearchErr(toUserMessage(e)); setSearching(false) }
  }

  const onPickResult = async (r: SearchRow) => {
    let j: JobRef = { ...r }
    delete (j as SearchRow).score
    if (j.job_description.length < MIN_JD_FETCH && j.job_apply_link) {
      setFetching(true)
      const f = await fetchJd(j.job_apply_link)
      setFetching(false)
      if ('text' in f) j = { ...j, job_description: f.text }
    }
    confirmJob(j)
  }

  // ── step 3: fit ─────────────────────────────────────────────────────────────
  const [fitBusy, setFitBusy] = useState(false)
  const [fitErr, setFitErr] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [atsBusy, setAtsBusy] = useState(false)
  const [atsErr, setAtsErr] = useState<string | null>(null)

  const runFit = useCallback(async () => {
    if (!job || !cv.cvText) return
    setFitBusy(true); setFitErr(null)
    try {
      const res = await fetch(API.cvSkillGap, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cvText: cv.cvText, jobDescription: job.job_description }) })
      const out = await readJsonOrError<{ matching?: string[]; missing?: string[] }>(res)
      if (!out.ok) { setFitErr(out.message); setFitBusy(false); return }
      setFit({ matching: out.data.matching || [], missing: out.data.missing || [], confirmed: [] })
    } catch (e) { setFitErr(toUserMessage(e)) }
    setFitBusy(false)
  }, [job, cv.cvText])
  useEffect(() => { if (hydrated && step === 3 && job && !fit && !fitBusy && cv.cvText) runFit() }, [hydrated, step, job, fit, fitBusy, cv.cvText, runFit])

  const runAts = () => withCreditCheck(CREDIT_COST.careerScan, async () => {
    if (!job || !cv.cvText) return
    setAtsBusy(true); setAtsErr(null)
    try {
      const res = await fetch(API.indiaCareerScan, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cvText: cv.cvText, jdText: job.job_description }) })
      const out = await readJsonOrError<AtsState & { quick_fixes?: string[] }>(res)
      if (!out.ok) { setAtsErr(out.message); setAtsBusy(false); return }
      applyPricing(out.data)
      const a: AtsState = { ats_score: Number(out.data.ats_score) || 0, readiness: out.data.readiness, missing_keywords: out.data.missing_keywords || [], domain_mismatch: !!out.data.domain_mismatch, mismatch_message: out.data.mismatch_message || '' }
      setAts(a)
      try { sessionStorage.setItem(SS.atsSuggestions, JSON.stringify({ missing_keywords: a.missing_keywords, quick_fixes: out.data.quick_fixes || [] })) } catch {}
    } catch (e) { setAtsErr(toUserMessage(e)) }
    setAtsBusy(false)
  })

  const confirmFit = (skip: boolean) => {
    setFit(prev => ({ matching: prev?.matching || [], missing: prev?.missing || [], confirmed: skip ? [] : [...checked], skipped: skip }))
    setStep(4)
  }

  // ── step 4: create ──────────────────────────────────────────────────────────
  const renderPdf = useCallback(async (data: CVData) => {
    setPhase('pdf')
    try {
      const res = await fetch(API.cvPdf, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cv: data, ac: pdfTemplateAccent[template], template }) })
      if (!res.ok) { setPhase('idle'); return }
      const blob = await res.blob()
      pdfBlobRef.current = blob
      setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob) })
    } catch {}
    setPhase('idle')
  }, [template])
  useEffect(() => { if (hydrated && step >= 4 && cvData && !pdfUrl && phase === 'idle') renderPdf(cvData) }, [hydrated, step, cvData, pdfUrl, phase, renderPdf])

  const generateLetter = async (data: CVData) => {
    if (!job) return
    setPhase('letter'); setLetterError(null)
    try {
      const res = await fetch(API.coverLetter, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cvText: cvTextFromTailored(data), job, tone: 'confident', length: 'medium', lang: outLang, market }) })
      const out = await readJsonOrError<{ coverLetter?: string }>(res)
      applyPricing(out.ok ? out.data : out.data)
      if (!out.ok || !out.data.coverLetter) { setLetterError(out.ok ? t.errors.letterFailed : out.message); return }
      setLetter(out.data.coverLetter)
      try { sessionStorage.setItem(SS.clLetter, out.data.coverLetter) } catch {}
    } catch (e) { setLetterError(toUserMessage(e)) }
  }

  const create = () => withCreditCheck(CREDIT_COST.tailorCv, async () => {
    if (!job || !cv.cvText) return
    setError(null); setLetterError(null); setPhase('cv')
    try {
      const res = await fetch(API.tailorCv, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cvText: cv.cvText, job, template, tone: 'professional', pages, lang: outLang, confirmedSkills: fit?.confirmed || [], returnJson: true, market }) })
      const out = await readJsonOrError<{ cv?: string }>(res)
      applyPricing(out.ok ? out.data : out.data)
      if (!out.ok) { setError({ message: out.message, status: out.status, retry: create }); setPhase('idle'); return }
      const parsed = parseCvJson(out.data.cv || '')
      if (!parsed) { setError({ message: t.errors.tryAgain, retry: create }); setPhase('idle'); return }
      setCvJson(out.data.cv || ''); setCvData(parsed); setPdfUrl(null); pdfBlobRef.current = null
      try { sessionStorage.setItem(SS.cvbTailored, out.data.cv || ''); sessionStorage.setItem(SS.cvbData, JSON.stringify(parsed)) } catch {}
      await generateLetter(parsed)
      await renderPdf(parsed)
    } catch (e) { setError({ message: toUserMessage(e), retry: create }); setPhase('idle') }
  })

  const [changeTarget, setChangeTarget] = useState<'cv' | 'letter'>('cv')
  const [changeText, setChangeText] = useState('')
  const [changeErr, setChangeErr] = useState<string | null>(null)
  const changeCost = changeIncluded ? 0 : (changeTarget === 'cv' ? CREDIT_COST.tailorCv : CREDIT_COST.coverLetter)

  const applyChange = (text: string, target: 'cv' | 'letter' = changeTarget) => withCreditCheck(changeCost, async () => {
    if (!job || !text.trim()) return
    setChangeErr(null); setPhase('change')
    try {
      if (target === 'cv') {
        const res = await fetch(API.tailorCv, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cvText: cv.cvText, job, template, tone: 'professional', pages, lang: outLang, returnJson: true, market, feedback: text.trim(), currentCv: cvJson }) })
        const out = await readJsonOrError<{ cv?: string }>(res)
        applyPricing(out.ok ? out.data : out.data)
        if (!out.ok) { setChangeErr(out.message); setPhase('idle'); return }
        const parsed = parseCvJson(out.data.cv || '')
        if (!parsed) { setChangeErr(t.errors.tryAgain); setPhase('idle'); return }
        setCvJson(out.data.cv || ''); setCvData(parsed); setPdfUrl(null); pdfBlobRef.current = null
        try { sessionStorage.setItem(SS.cvbTailored, out.data.cv || ''); sessionStorage.setItem(SS.cvbData, JSON.stringify(parsed)) } catch {}
        setChangeText('')
        await renderPdf(parsed)
      } else {
        const res = await fetch(API.coverLetter, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cvText: cvData ? cvTextFromTailored(cvData) : cv.cvText, job, tone: 'confident', length: 'medium', lang: outLang, market, feedback: text.trim(), currentLetter: letter }) })
        const out = await readJsonOrError<{ coverLetter?: string }>(res)
        applyPricing(out.ok ? out.data : out.data)
        if (!out.ok || !out.data.coverLetter) { setChangeErr(out.ok ? t.errors.tryAgain : out.message); setPhase('idle'); return }
        setLetter(out.data.coverLetter)
        try { sessionStorage.setItem(SS.clLetter, out.data.coverLetter) } catch {}
        setChangeText('')
        setPhase('idle')
      }
    } catch (e) { setChangeErr(toUserMessage(e)); setPhase('idle') }
  })

  const chips = useMemo(() => {
    const out: { label: string; text: string }[] = []
    const gaps = (cvData?.matchGaps || []).slice(0, 3)
    for (const g of gaps) if (g.requirement) out.push({ label: t.create.chipAddKeyword(g.requirement), text: `Emphasise or add evidence for "${g.requirement}" wherever my experience genuinely supports it.` })
    const unconfirmed = (fit?.missing || []).filter(m => !(fit?.confirmed || []).includes(m)).slice(0, 2)
    for (const m of unconfirmed) out.push({ label: t.create.chipEmphasise(m), text: `Emphasise ${m} where my experience genuinely supports it.` })
    out.push({ label: t.create.chipShorter, text: 'Make it fit on one page: tighten the summary and keep only the most relevant bullets per role.' })
    out.push({ label: t.create.chipSenior, text: 'Use a more senior, outcome-focused tone: lead every bullet with the result and scope.' })
    out.push({ label: t.create.chipSummary, text: 'Rewrite the summary as a direct pitch for this specific role, grounded only in my source CV.' })
    return out.slice(0, 6)
  }, [cvData, fit, t])

  // ── step 5: apply ───────────────────────────────────────────────────────────
  const [applyBusy, setApplyBusy] = useState(false)
  const [applyErr, setApplyErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const downloadCv = async () => {
    if (!cvData) return
    let blob = pdfBlobRef.current
    if (!blob) { await renderPdf(cvData); blob = pdfBlobRef.current }
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `CV_${(job?.employer_name || cvData.name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
  }
  const downloadLetter = async () => {
    if (!letter) return
    try {
      await downloadLetterPdf({ letter, name: cvData?.name, contact: [cvData?.email, cvData?.phone].filter(Boolean).join('  ·  '), jobTitle: job?.job_title, employer: job?.employer_name })
    } catch (e) { setApplyErr(toUserMessage(e)) }
  }
  const copyLetter = async () => {
    try { await navigator.clipboard.writeText(letter); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }
  const recordApplication = async (status: 'applied' | 'saved') => {
    if (!job) return
    setApplyBusy(true); setApplyErr(null)
    try {
      const res = await fetch(API.applications, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        company: job.employer_name || '—', role: job.job_title, status, location: job.job_city || null, job_url: job.job_apply_link || null,
        notes: 'Applied via Job-Lens Apply flow', applied_at: new Date().toISOString().slice(0, 10),
      }) })
      const out = await readJsonOrError(res)
      if (!out.ok) { setApplyErr(out.message); setApplyBusy(false); return }
      setApplied(status)
    } catch (e) { setApplyErr(toUserMessage(e)) }
    setApplyBusy(false)
  }
  const startAnother = () => {
    clearJob()
    try { sessionStorage.removeItem(SS.applyDraft); sessionStorage.removeItem(SS.cvbTailored); sessionStorage.removeItem(SS.cvbData); sessionStorage.removeItem(SS.clLetter) } catch {}
    setJob(null); setFit(null); setAts(null); setCvJson(''); setCvData(null); setLetter(''); setPdfUrl(null); pdfBlobRef.current = null; setApplied(null); setPricing(null)
    setUrl(''); setJdTitle(''); setJdCompany(''); setJdText(''); setJdUrl(''); setResults(null)
    setStep(2)
  }

  // ── UI helpers ──────────────────────────────────────────────────────────────
  const canGo = (s: Step): boolean => {
    if (s === 1) return true
    if (s === 2) return !!cv.cvText
    if (s === 3) return !!cv.cvText && !!job
    if (s === 4) return !!cv.cvText && !!job
    return !!cvData
  }
  const primaryBtn = (disabled?: boolean): React.CSSProperties => ({
    padding: '12px 22px', borderRadius: 10, border: 'none', fontFamily: f.heading, fontSize: 14, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? c.borderLight : `linear-gradient(135deg, ${accent}, ${accentDark})`, color: '#fff', opacity: disabled ? 0.7 : 1, transition: 'transform .12s, opacity .12s',
  })
  const ghostBtn: React.CSSProperties = { padding: '10px 16px', borderRadius: 10, border: `1px solid ${c.borderLight}`, background: c.bgCard, color: c.textMuted, fontFamily: f.body, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 10, border: `1px solid ${c.borderLight}`, fontSize: 14, fontFamily: f.body, color: c.text, background: c.bgCard, outline: 'none' }
  const card: React.CSSProperties = { background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, boxShadow: '0 8px 30px rgba(4,44,83,0.05)' }
  const chip = (active: boolean): React.CSSProperties => ({ padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${active ? accent : c.borderLight}`, background: active ? `${accent}14` : c.bgSubtle, color: active ? accent : c.textMuted, fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: f.body })
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: c.textFaint, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6, fontFamily: f.body }

  if (!hydrated) return <div style={{ minHeight: '60vh', background: c.bg }} />

  const busy = phase !== 'idle'
  const phaseLabel = phase === 'cv' ? t.create.progressCv : phase === 'letter' ? t.create.progressLetter : phase === 'pdf' ? t.create.progressPdf : phase === 'change' ? t.create.applying : ''

  return (
    <div style={{ background: c.bg, minHeight: 'calc(100vh - 56px)', fontFamily: f.body, color: c.text }}>
      <style>{`
        .af-wrap { max-width: 1020px; margin: 0 auto; padding: 28px 16px 60px; }
        .af-stepper { display: flex; gap: 6px; align-items: center; margin-bottom: 22px; }
        .af-step { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
        .af-step-label { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .af-two { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 18px; }
        .af-results { display: grid; gap: 10px; }
        @media (max-width: 900px) { .af-two { grid-template-columns: 1fr; } }
        @media (max-width: 640px) { .af-step-label { display: none; } .af-wrap { padding-top: 16px; } }
        .af-iframe { width: 100%; height: 720px; border: none; display: block; background: #fff; }
        @media (max-width: 640px) { .af-iframe { height: 480px; } }
        .af-btn:hover:not(:disabled) { transform: translateY(-1px); }
      `}</style>
      <div className="af-wrap">
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ fontFamily: f.heading, fontSize: 26, fontWeight: 800, margin: 0, color: c.primary, paddingLeft: 14, borderLeft: `3px solid ${accent}` }}>{t.title}</h1>
          <div style={{ color: c.textMuted, fontSize: 14, marginTop: 6, paddingLeft: 17 }}>{t.subtitle}</div>
        </div>

        {/* Stepper */}
        <div className="af-stepper" role="list">
          {STEPS.map((s, i) => {
            const done = s < step
            const active = s === step
            const clickable = canGo(s) && s !== step
            return (
              <button key={s} type="button" role="listitem" className="af-step" onClick={() => clickable && setStep(s)} disabled={!clickable}
                style={{ background: 'none', border: 'none', padding: 0, cursor: clickable ? 'pointer' : 'default', textAlign: 'left' }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0,
                  background: active ? accent : done ? c.successLight : c.bgCard, color: active ? '#fff' : done ? c.success : c.textFaint, border: `1.5px solid ${active ? accent : done ? c.successBorder : c.borderLight}` }}>
                  {done ? <SvgIcon name="check-circle" size={14} color={c.success} /> : s}
                </span>
                <span className="af-step-label" style={{ color: active ? c.primary : done ? c.success : c.textFaint }}>{t.steps[i]}</span>
                {i < STEPS.length - 1 && <span style={{ flex: 1, height: 2, background: done ? c.successBorder : c.border, minWidth: 8 }} />}
              </button>
            )
          })}
        </div>

        {/* ── Step 1: CV ── */}
        {step === 1 && (
          <div style={card}>
            <h2 style={{ fontFamily: f.heading, fontSize: 20, margin: '0 0 6px' }}>{t.cv.title}</h2>
            <div style={{ color: c.textMuted, fontSize: 13, marginBottom: 18 }}>{t.cv.hint}</div>
            {cv.loading ? (
              <div style={{ color: c.textFaint, fontSize: 13 }}>{tcv.reading}</div>
            ) : cv.cvText ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: c.successLight, border: `1px solid ${c.successBorder}`, flexWrap: 'wrap' }}>
                  <SvgIcon name="check-circle" size={18} color={c.success} />
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: c.text }}>{cv.fileName ? tcv.onFile(cv.fileName) : t.cv.ready}</div>
                    {cv.source === 'saved' && <div style={{ fontSize: 12, color: c.textMuted }}>{tcv.usingSaved}</div>}
                  </div>
                  <button type="button" style={ghostBtn} onClick={() => fileRef.current?.click()}>{tcv.replace}</button>
                  <button type="button" style={ghostBtn} onClick={() => { cv.clearCv(); setPasteText('') }}>{tcv.remove}</button>
                </div>
                {cvMsg && <div style={{ fontSize: 12, color: c.textMuted, marginTop: 8 }}>{cvMsg}</div>}
              </>
            ) : (
              <>
                <div onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const fl = e.dataTransfer.files?.[0]; if (fl) onFile(fl) }}
                  style={{ border: `1.5px dashed ${c.borderLight}`, borderRadius: 14, padding: '28px 16px', textAlign: 'center', cursor: 'pointer', background: c.bgSubtle }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><SvgIcon name="document" size={26} color={accent} /></div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cvBusy ? tcv.reading : t.cv.dropzone}</div>
                  <div style={{ fontSize: 12, color: c.textFaint, marginTop: 4 }}>{tcv.uploadHint}</div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div style={label}>{tcv.paste}</div>
                  <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={5} style={{ ...input, resize: 'vertical' }} />
                  {pasteText.trim().length >= 50 && (
                    <button type="button" className="af-btn" style={{ ...primaryBtn(), marginTop: 8, padding: '9px 16px', fontSize: 13 }} onClick={() => commitCv(pasteText, 'pasted-cv.txt')}>{t.next}</button>
                  )}
                </div>
              </>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={e => { const fl = e.target.files?.[0]; if (fl) onFile(fl); e.target.value = '' }} />
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 16, fontSize: 12, color: c.textMuted, cursor: 'pointer' }}>
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 2 }} />
              <span>{tcv.saveToAccount}</span>
            </label>
            {cvErr && <div style={{ marginTop: 12 }}><FlowError message={cvErr} compact /></div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button type="button" className="af-btn" style={primaryBtn(!cv.cvText)} disabled={!cv.cvText} onClick={() => setStep(2)}>{t.next} →</button>
            </div>
          </div>
        )}

        {/* ── Step 2: Job ── */}
        {step === 2 && (
          <div style={card}>
            <h2 style={{ fontFamily: f.heading, fontSize: 20, margin: '0 0 14px' }}>{t.job.title}</h2>
            {job && !shortWarn && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: c.primaryLight, marginBottom: 14, flexWrap: 'wrap' }}>
                <SvgIcon name="briefcase" size={16} color={c.primary} />
                <div style={{ flex: 1, minWidth: 160, fontWeight: 700, fontSize: 14 }}>{t.job.selected(job.job_title, job.employer_name)}</div>
                <button type="button" className="af-btn" style={{ ...primaryBtn(fetching), padding: '8px 14px', fontSize: 13 }} disabled={fetching} onClick={() => confirmJob(job, true)}>{fetching ? t.job.fetching : `${t.next} →`}</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {(['url', 'paste', 'search'] as JobTab[]).map(tab => (
                <button key={tab} type="button" style={chip(jobTab === tab)} onClick={() => setJobTab(tab)}>
                  {tab === 'url' ? t.job.tabUrl : tab === 'paste' ? t.job.tabPaste : t.job.tabSearch}
                </button>
              ))}
            </div>

            {jobTab === 'url' && (
              <div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input value={url} onChange={e => setUrl(e.target.value)} placeholder={t.job.urlPlaceholder} style={{ ...input, flex: 1, minWidth: 220 }} onKeyDown={e => e.key === 'Enter' && onFetchUrl()} />
                  <button type="button" className="af-btn" style={primaryBtn(fetching || !url.trim())} disabled={fetching || !url.trim()} onClick={onFetchUrl}>{fetching ? t.job.fetching : t.job.fetch}</button>
                </div>
              </div>
            )}

            {jobTab === 'paste' && (
              <div style={{ display: 'grid', gap: 10 }}>
                {fetchNote && <div style={{ fontSize: 12, color: c.warning, background: c.warningLight, border: `1px solid ${c.warningBorder}`, borderRadius: 10, padding: '8px 12px' }}>{fetchNote}</div>}
                <div className="af-two" style={{ gap: 10 }}>
                  <div><div style={label}>{t.job.pasteTitle} *</div><input value={jdTitle} onChange={e => setJdTitle(e.target.value)} style={input} /></div>
                  <div><div style={label}>{t.job.pasteCompany}</div><input value={jdCompany} onChange={e => setJdCompany(e.target.value)} style={input} /></div>
                </div>
                <div><div style={label}>{t.job.pasteJd}</div><textarea value={jdText} onChange={e => setJdText(e.target.value)} rows={9} style={{ ...input, resize: 'vertical' }} /></div>
                <div><div style={label}>{t.job.pasteUrl}</div><input value={jdUrl} onChange={e => setJdUrl(e.target.value)} placeholder="https://…" style={input} /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="af-btn" style={primaryBtn(!jdTitle.trim())} disabled={!jdTitle.trim()} onClick={onUsePasted}>{t.job.useThisJob} →</button>
                </div>
              </div>
            )}

            {jobTab === 'search' && (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input value={q} onChange={e => setQ(e.target.value)} placeholder={t.job.searchQuery} style={{ ...input, flex: 2, minWidth: 180 }} onKeyDown={e => e.key === 'Enter' && onSearch()} />
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder={t.job.searchCity} style={{ ...input, flex: 1, minWidth: 120 }} onKeyDown={e => e.key === 'Enter' && onSearch()} />
                  <select value={country} onChange={e => setCountry(e.target.value)} style={{ ...input, width: 'auto' }}>
                    {(market === MARKET.in ? ['in', 'de'] : ['de', 'at', 'ch']).map(cc => <option key={cc} value={cc}>{cc.toUpperCase()}</option>)}
                  </select>
                  <button type="button" className="af-btn" style={primaryBtn(searching || (!q.trim() && !city.trim()))} disabled={searching || (!q.trim() && !city.trim())} onClick={onSearch}>{searching ? t.job.searching : t.job.searchBtn}</button>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: c.textFaint }}>{t.job.postedWithin}:</span>
                  <button type="button" style={chip(posted === '')} onClick={() => setPosted('')}>{t.job.any}</button>
                  {POSTED_OPTIONS.map(o => <button key={o.value} type="button" style={chip(posted === o.value)} onClick={() => setPosted(o.value)}>{o.label}</button>)}
                  {market === MARKET.eu && (
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      <button type="button" style={chip(source === 'adzuna')} onClick={() => setSource('adzuna')}>Adzuna</button>
                      <button type="button" style={chip(source === 'ba')} onClick={() => setSource('ba')}>BA Jobbörse</button>
                    </span>
                  )}
                </div>
                {searchErr && <FlowError message={searchErr} compact onRetry={onSearch} />}
                {results && results.length === 0 && <div style={{ fontSize: 13, color: c.textMuted }}>{t.job.noResults}</div>}
                {results && results.length > 0 && (
                  <div className="af-results">
                    {results.map((r, i) => (
                      <div key={r.job_id || i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', borderRadius: 12, border: `1px solid ${c.border}`, background: c.bgSubtle, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{r.job_title}</div>
                          <div style={{ fontSize: 12, color: c.textMuted }}>{[r.employer_name, r.job_city].filter(Boolean).join(' · ')}</div>
                        </div>
                        {typeof r.score === 'number' && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 10, background: r.score >= 70 ? c.successLight : r.score >= 45 ? c.warningLight : c.bg, color: r.score >= 70 ? c.success : r.score >= 45 ? c.warning : c.textFaint }}>{r.score}% {t.job.match}</span>}
                        <button type="button" className="af-btn" style={{ ...primaryBtn(fetching), padding: '8px 14px', fontSize: 13 }} disabled={fetching} onClick={() => onPickResult(r)}>{t.job.useThisJob}</button>
                      </div>
                    ))}
                    <Link href={`${base}/jobs`} style={{ fontSize: 13, color: accent, fontWeight: 600, textDecoration: 'none' }}>{t.job.moreInJobSearch}</Link>
                  </div>
                )}
              </div>
            )}

            {shortWarn && job && (
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: c.warningLight, border: `1px solid ${c.warningBorder}`, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <SvgIcon name="warning" size={16} color={c.warning} />
                <div style={{ flex: 1, minWidth: 200, fontSize: 13, color: c.warning }}>{t.job.shortJd}</div>
                <button type="button" style={ghostBtn} onClick={() => { setShortWarn(false); setJobTab('paste'); setJdTitle(job.job_title); setJdCompany(job.employer_name); setJdText(job.job_description); setJdUrl(job.job_apply_link || '') }}>{t.job.tabPaste}</button>
                <button type="button" className="af-btn" style={{ ...primaryBtn(), padding: '8px 14px', fontSize: 13 }} onClick={() => confirmJob(job, true)}>{t.job.continueAnyway}</button>
              </div>
            )}
            {jobErr && <div style={{ marginTop: 12 }}><FlowError message={jobErr} compact /></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button type="button" style={ghostBtn} onClick={() => setStep(1)}>← {t.back}</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Fit ── */}
        {step === 3 && job && (
          <div style={card}>
            <h2 style={{ fontFamily: f.heading, fontSize: 20, margin: '0 0 4px' }}>{t.fit.title}</h2>
            <div style={{ color: c.textMuted, fontSize: 13, marginBottom: 16 }}>{t.job.selected(job.job_title, job.employer_name)} · <button type="button" onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}>{t.job.change}</button></div>
            {fitBusy && <div style={{ color: c.textFaint, fontSize: 13 }}>{t.fit.checking}</div>}
            {fitErr && <FlowError message={fitErr} compact onRetry={runFit} />}
            {fit && !fitBusy && (
              <div className="af-two">
                <div>
                  {fit.matching.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ ...label, color: c.success }}>{t.fit.matching}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{fit.matching.map(s => <span key={s} style={{ padding: '4px 10px', borderRadius: 20, background: c.successLight, border: `1px solid ${c.successBorder}`, fontSize: 12, color: c.success }}>{s}</span>)}</div>
                    </div>
                  )}
                  {fit.missing.length > 0 ? (
                    <div>
                      <div style={{ ...label, color: c.warning }}>{t.fit.missing}</div>
                      <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 8 }}>{t.fit.confirmHint}</div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {fit.missing.map(s => {
                          const on = checked.has(s)
                          return (
                            <label key={s} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 12px', borderRadius: 10, border: `1px solid ${on ? accent : c.border}`, background: on ? `${accent}10` : c.bgSubtle, cursor: 'pointer', fontSize: 13 }}>
                              <input type="checkbox" checked={on} onChange={() => setChecked(prev => { const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n })} />
                              <span style={{ fontWeight: on ? 700 : 500 }}>{s}</span>
                            </label>
                          )
                        })}
                      </div>
                      {fit.missing.length >= 6 && fit.matching.length <= 2 && <div style={{ marginTop: 10, fontSize: 12, color: c.warning }}>{t.fit.differentDirection}</div>}
                    </div>
                  ) : (
                    <div style={{ padding: '12px 14px', borderRadius: 12, background: c.successLight, border: `1px solid ${c.successBorder}`, fontSize: 13, color: c.success }}>{t.fit.none}</div>
                  )}
                </div>
                {market === MARKET.in && (
                  <div style={{ padding: 16, borderRadius: 14, background: c.bgSubtle, border: `1px solid ${c.border}` }}>
                    <div style={label}>{t.fit.atsTitle}</div>
                    {ats ? (
                      <div>
                        <div style={{ fontFamily: f.heading, fontSize: 40, fontWeight: 800, color: ats.ats_score >= 70 ? c.success : ats.ats_score >= 45 ? c.warning : c.danger, lineHeight: 1 }}>{ats.ats_score}<span style={{ fontSize: 16, color: c.textFaint }}>/100</span></div>
                        {ats.readiness && <div style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>{ats.readiness}</div>}
                        {ats.domain_mismatch && <div style={{ marginTop: 8, fontSize: 12, color: c.warning }}>{t.fit.atsMismatch}: {ats.mismatch_message}</div>}
                        {ats.missing_keywords.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: c.textFaint, marginBottom: 6 }}>{t.fit.atsMissing}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{ats.missing_keywords.slice(0, 12).map(k => <span key={k} style={{ padding: '3px 8px', borderRadius: 8, background: c.warningLight, border: `1px solid ${c.warningBorder}`, fontSize: 11, color: c.warning }}>{k}</span>)}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <button type="button" className="af-btn" style={{ ...primaryBtn(atsBusy || lacksCredits(CREDIT_COST.careerScan)), width: '100%', padding: '10px 14px', fontSize: 13 }} disabled={atsBusy || lacksCredits(CREDIT_COST.careerScan)} onClick={runAts}>{atsBusy ? t.fit.atsChecking : t.fit.atsBtn(CREDIT_COST.careerScan)}</button>
                        {atsErr && <div style={{ marginTop: 8 }}><FlowError message={atsErr} compact secondary={{ label: t.errors.topUp, href: `${base}/account` }} /></div>}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 10, flexWrap: 'wrap' }}>
              <button type="button" style={ghostBtn} onClick={() => setStep(2)}>← {t.back}</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" style={ghostBtn} onClick={() => confirmFit(true)}>{t.skip}</button>
                <button type="button" className="af-btn" style={primaryBtn(fitBusy)} disabled={fitBusy} onClick={() => confirmFit(false)}>{t.next} →</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Create ── */}
        {step === 4 && job && (
          <div style={card}>
            <h2 style={{ fontFamily: f.heading, fontSize: 20, margin: '0 0 4px' }}>{t.create.title}</h2>
            <div style={{ color: c.textMuted, fontSize: 13, marginBottom: 16 }}>{t.job.selected(job.job_title, job.employer_name)}</div>

            {!cvData && (
              <div>
                <div className="af-two" style={{ gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={label}>{t.create.template}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(['minimal', 'modern', 'executive'] as PdfTemplate[]).map(tp2 => <button key={tp2} type="button" style={chip(template === tp2)} onClick={() => setTemplate(tp2)}>{tp2[0].toUpperCase() + tp2.slice(1)}</button>)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <div style={label}>{t.create.pages}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" style={chip(pages === '1')} onClick={() => setPages('1')}>{t.create.page1}</button>
                        <button type="button" style={chip(pages === '2')} onClick={() => setPages('2')}>{t.create.page2}</button>
                      </div>
                    </div>
                    {market === MARKET.eu && (
                      <div>
                        <div style={label}>{t.create.language}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" style={chip(outLang === 'DE')} onClick={() => setOutLang('DE')}>DE</button>
                          <button type="button" style={chip(outLang === 'EN')} onClick={() => setOutLang('EN')}>EN</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button type="button" className="af-btn" style={{ ...primaryBtn(busy || lacksCredits(CREDIT_COST.tailorCv)), width: '100%', fontSize: 15 }} disabled={busy || lacksCredits(CREDIT_COST.tailorCv)} onClick={create}>
                  {busy ? phaseLabel : t.create.button(CREDIT_COST.tailorCv)}
                </button>
                <div style={{ fontSize: 12, color: c.textFaint, marginTop: 8, textAlign: 'center' }}>{tp.packageIncludes(BUNDLE.freeRevisions)}</div>
                {lacksCredits(CREDIT_COST.tailorCv) && <div style={{ marginTop: 10 }}><FlowError message={tr.coverLetter.sidebar.needCredits(CREDIT_COST.tailorCv, credits ?? 0)} compact secondary={{ label: t.errors.topUp, href: `${base}/account` }} /></div>}
                {error && <div style={{ marginTop: 12 }}><FlowError message={error.message} onRetry={error.retry} retryLabel={t.errors.tryAgain} secondary={error.status === 402 ? { label: t.errors.topUp, href: `${base}/account` } : undefined} /></div>}
              </div>
            )}

            {cvData && (
              <div>
                {busy && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: c.primaryLight, marginBottom: 12, fontSize: 13, color: c.primary }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${c.borderLight}`, borderTopColor: accent, animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                    {phaseLabel}
                  </div>
                )}
                <div className="af-two">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={label}>{t.create.previewCv}</div>
                      {pdfUrl && <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: accent, fontWeight: 600, textDecoration: 'none' }}>{t.create.openPdf}</a>}
                    </div>
                    <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${c.border}`, minHeight: 240, background: c.bgSubtle }}>
                      {pdfUrl ? <iframe className="af-iframe" src={pdfUrl} title={t.create.previewCv} /> : <div style={{ padding: 24, fontSize: 13, color: c.textFaint }}>{t.create.progressPdf}</div>}
                    </div>
                  </div>
                  <div>
                    <div style={label}>{t.create.previewLetter}</div>
                    {letterError ? (
                      <FlowError message={letterError} onRetry={() => generateLetter(cvData)} retryLabel={t.errors.retryLetter} />
                    ) : (
                      <textarea value={letter} onChange={e => { setLetter(e.target.value); try { sessionStorage.setItem(SS.clLetter, e.target.value) } catch {} }} rows={18} style={{ ...input, resize: 'vertical', fontSize: 13, lineHeight: 1.6 }} placeholder={phase === 'letter' ? t.create.progressLetter : ''} />
                    )}

                    <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: c.bgSubtle, border: `1px solid ${c.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        <div style={label}>{t.create.requestChange}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: changeIncluded ? c.success : c.textMuted }}>
                          {changeIncluded ? tp.changesLeft(revisionsLeft, until) : bundleActive ? tp.packageUsedUp(CREDIT_COST.tailorCv) : ''}
                        </span>
                      </div>
                      {chips.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                          {chips.map(ch => <button key={ch.label} type="button" style={chip(false)} disabled={busy} onClick={() => { setChangeTarget('cv'); setChangeText(ch.text) }}>{ch.label}</button>)}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <button type="button" style={chip(changeTarget === 'cv')} onClick={() => setChangeTarget('cv')}>{t.create.changeCv}</button>
                        <button type="button" style={chip(changeTarget === 'letter')} onClick={() => setChangeTarget('letter')} disabled={!letter}>{t.create.changeLetter}</button>
                      </div>
                      <textarea value={changeText} onChange={e => setChangeText(e.target.value)} rows={3} placeholder={t.create.changePlaceholder} style={{ ...input, resize: 'vertical', fontSize: 13 }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
                        <Link href={`${base}/cv-builder`} style={{ fontSize: 12, color: accent, fontWeight: 600, textDecoration: 'none' }}>{t.create.fineTune}</Link>
                        <button type="button" className="af-btn" style={{ ...primaryBtn(busy || !changeText.trim() || lacksCredits(changeCost)), padding: '9px 16px', fontSize: 13 }} disabled={busy || !changeText.trim() || lacksCredits(changeCost)} onClick={() => applyChange(changeText)}>
                          {changeIncluded ? tp.applyIncluded(revisionsLeft) : tp.applyCosts(changeCost || CREDIT_COST.tailorCv)}
                        </button>
                      </div>
                      {changeErr && <div style={{ marginTop: 8 }}><FlowError message={changeErr} compact secondary={{ label: t.errors.topUp, href: `${base}/account` }} /></div>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 10, flexWrap: 'wrap' }}>
              <button type="button" style={ghostBtn} onClick={() => setStep(3)}>← {t.back}</button>
              <button type="button" className="af-btn" style={primaryBtn(!cvData || busy)} disabled={!cvData || busy} onClick={() => setStep(5)}>{t.next} →</button>
            </div>
          </div>
        )}

        {/* ── Step 5: Apply ── */}
        {step === 5 && job && cvData && (
          <div style={card}>
            <h2 style={{ fontFamily: f.heading, fontSize: 20, margin: '0 0 4px' }}>{t.done.title}</h2>
            <div style={{ color: c.textMuted, fontSize: 13, marginBottom: 18 }}>{t.done.subtitle}</div>
            {applied ? (
              <div style={{ padding: 20, borderRadius: 14, background: c.successLight, border: `1px solid ${c.successBorder}` }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                  <SvgIcon name="check-circle" size={22} color={c.success} />
                  <div style={{ fontWeight: 700, fontSize: 15, color: c.success }}>{applied === 'applied' ? t.done.saved : t.done.savedLater}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link href={`${base}/tracker`} className="af-btn" style={{ ...primaryBtn(), textDecoration: 'none', display: 'inline-block' }}>{t.done.trackerLink}</Link>
                  <button type="button" style={ghostBtn} onClick={startAnother}>{t.done.another}</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                  <button type="button" style={ghostBtn} onClick={downloadCv}><SvgIcon name="document" size={14} color={c.textMuted} /> {t.done.downloadCv}</button>
                  <button type="button" style={ghostBtn} onClick={downloadLetter} disabled={!letter}><SvgIcon name="email" size={14} color={c.textMuted} /> {t.done.downloadLetter}</button>
                  <button type="button" style={ghostBtn} onClick={copyLetter} disabled={!letter}>{copied ? t.done.copied : t.done.copyLetter}</button>
                </div>
                <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: c.bgSubtle, border: `1px solid ${c.border}` }}>
                  {job.job_apply_link ? (
                    <a href={job.job_apply_link} target="_blank" rel="noreferrer" className="af-btn" style={{ ...primaryBtn(), textDecoration: 'none', display: 'inline-block' }}>{t.done.openPosting}</a>
                  ) : (
                    <div style={{ fontSize: 13, color: c.textMuted }}>{t.done.noLink}</div>
                  )}
                </div>
                {applyErr && <div style={{ marginTop: 12 }}><FlowError message={applyErr} compact /></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" style={ghostBtn} onClick={() => setStep(4)}>← {t.back}</button>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" style={ghostBtn} disabled={applyBusy} onClick={() => recordApplication('saved')}>{t.done.saveForLater}</button>
                    <button type="button" className="af-btn" style={primaryBtn(applyBusy)} disabled={applyBusy} onClick={() => recordApplication('applied')}>{applyBusy ? t.done.saving : `✓ ${t.done.iApplied}`}</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {cross && <CrossMarketModal cost={cross.cost} market={market} crossAmount={cross.amount} onConfirm={cross.onConfirm} onCancel={() => setCross(null)} />}
    </div>
  )
}

export type { JobSource }
