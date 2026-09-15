// Canonical "the job I'm applying to" — one shape, one sessionStorage key.
// Every writer (job search, Kira, the Apply flow, manual entry) and every reader
// (CV Builder, cover letter, ATS check, Apply flow) goes through here so they agree.
import { SS } from '@/lib/constants'
import { hashString } from '@/lib/cv'

export type JobSource = 'adzuna' | 'ba' | 'url' | 'paste' | 'kira' | 'manual'

export interface JobRef {
  job_id?: string
  job_title: string
  employer_name: string
  job_description: string
  job_city?: string
  job_country?: string
  job_apply_link?: string
  job_source?: JobSource
  job_employment_type?: string
  job_min_salary?: number | null
  job_max_salary?: number | null
  job_salary_currency?: string
  job_posted_at_datetime_utc?: string
}

const str = (v: unknown, max = 500): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Coerce anything job-shaped (Adzuna row, BA row, old session blobs) into a JobRef. */
export function normalizeJob(raw: unknown): JobRef | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const job_title = str(r.job_title ?? r.title, 200)
  const employer_name = str(r.employer_name ?? r.company, 200)
  if (!job_title && !employer_name) return null
  const link = str(r.job_apply_link ?? r.redirect_url ?? r.url, 1000)
  return {
    job_id: str(r.job_id ?? r.id, 120) || undefined,
    job_title,
    employer_name,
    job_description: str(r.job_description ?? r.description, 20000),
    job_city: str(r.job_city ?? r.location, 120) || undefined,
    job_country: str(r.job_country, 8) || undefined,
    job_apply_link: link.startsWith('https://') ? link : undefined,
    job_source: (['adzuna', 'ba', 'url', 'paste', 'kira', 'manual'] as const).includes(r.job_source as JobSource) ? (r.job_source as JobSource) : undefined,
    job_employment_type: str(r.job_employment_type, 60) || undefined,
    job_min_salary: typeof r.job_min_salary === 'number' ? r.job_min_salary : null,
    job_max_salary: typeof r.job_max_salary === 'number' ? r.job_max_salary : null,
    job_salary_currency: str(r.job_salary_currency, 8) || undefined,
    job_posted_at_datetime_utc: str(r.job_posted_at_datetime_utc, 40) || undefined,
  }
}

export function readJob(): JobRef | null {
  if (typeof window === 'undefined') return null
  for (const key of [SS.cvbJob, SS.inSelectedJob]) {
    try {
      const v = sessionStorage.getItem(key)
      if (!v) continue
      const job = normalizeJob(JSON.parse(v))
      if (job) return job
    } catch {
      // ignore a corrupt blob and fall through to the next key
    }
  }
  return null
}

export function writeJob(job: JobRef): void {
  if (typeof window === 'undefined') return
  try { sessionStorage.setItem(SS.cvbJob, JSON.stringify(job)) } catch {}
}

export function clearJob(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(SS.cvbJob)
    sessionStorage.removeItem(SS.inSelectedJob)
  } catch {}
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** Client-side identity of a job (title + employer) — used to detect "the job changed". */
export function jobDraftKey(job: JobRef | null | undefined): string {
  if (!job) return ''
  return hashString(`${norm(job.job_title)}|${norm(job.employer_name)}`)
}
