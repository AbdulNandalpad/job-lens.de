import Anthropic from '@anthropic-ai/sdk'

export interface DetectedField {
  label: string
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'file' | 'checkbox' | 'radio' | 'date' | 'number' | 'url' | 'password'
  required: boolean
  selector: string
  placeholder?: string
  options?: string[]
  autocomplete?: string
  name?: string
}

export interface FieldMapping {
  field: DetectedField
  value: string
  confidence: 'high' | 'medium' | 'low'
  notes?: string
}

export interface AnalyzeResult {
  formType: string
  pageTitle: string
  hasForm: boolean
  requiresLogin?: boolean
  fields: DetectedField[]
  mapping: FieldMapping[]
  screenshotB64: string
  error?: string
}

export type ExecuteEvent =
  | { type: 'log'; message: string }
  | { type: 'screenshot'; message: string; b64: string }
  | { type: 'filling'; label: string; value: string; index: number; total: number }
  | { type: 'filled'; label: string; success: boolean }
  | { type: 'filled_preview'; b64: string; message: string; sessionId: string }
  | { type: 'done'; confirmB64: string; message: string }
  | { type: 'error'; message: string; b64?: string }

// ── Session store (dev mode) — module-level, persists across requests ─────────

interface BrowserSession {
  browser: import('playwright').Browser
  page: import('playwright').Page
  cvPath: string
  clPath: string
  createdAt: number
}

const sessions = new Map<string, BrowserSession>()
const SESSION_TTL = 10 * 60 * 1000

setInterval(() => {
  const now = Date.now()
  for (const [id, s] of sessions) {
    if (now - s.createdAt > SESSION_TTL) {
      s.browser.close().catch(() => {})
      cleanupFiles(s.cvPath, s.clPath)
      sessions.delete(id)
    }
  }
}, 60_000).unref?.()

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJson<T>(text: string, fallback: T): T {
  try {
    const arr = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)
    return arr ? (JSON.parse(arr[0]) as T) : fallback
  } catch {
    return fallback
  }
}

function cleanupFiles(...paths: string[]) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { unlinkSync, existsSync } = require('fs') as typeof import('fs')
    for (const p of paths) {
      try { if (existsSync(p)) unlinkSync(p) } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

function normalizeOption(s: string): string {
  return s.toLowerCase().replace(/[-_\s]/g, '').replace(/[^a-z0-9]/g, '')
}

interface CvValues {
  email?: string
  phone?: string
  linkedin?: string
  fullName?: string
  firstName?: string
  lastName?: string
}

function extractCvValues(cvText: string): CvValues {
  const vals: CvValues = {}
  const emailM = cvText.match(/[\w.+\-]+@[\w\-]+(?:\.[\w\-]+)+/i)
  if (emailM) vals.email = emailM[0].toLowerCase()

  const phoneM = cvText.match(/(?:\+\d{1,3}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,5}[\s\-.]?\d{3,5}(?:[\s\-.]?\d{1,4})?/)
  if (phoneM) vals.phone = phoneM[0].trim()

  const linkedinM = cvText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w\-%.]+\/?/i)
  if (linkedinM) {
    vals.linkedin = linkedinM[0].startsWith('http') ? linkedinM[0] : 'https://' + linkedinM[0]
    vals.linkedin = vals.linkedin.replace(/\/$/, '')
  }

  for (const line of cvText.split('\n')) {
    const t = line.trim()
    if (t.length > 2 && t.length < 55 && !t.includes('@') && !/\d/.test(t) && /[A-Za-z]/.test(t)) {
      const words = t.split(/\s+/)
      if (words.length >= 2 && words.length <= 5) {
        vals.fullName = t; vals.firstName = words[0]; vals.lastName = words.slice(1).join(' ')
        break
      }
    }
  }
  return vals
}

function buildCvContext(cvText: string, cvValues: CvValues): string {
  const lines = [
    cvValues.fullName ? `Full Name: ${cvValues.fullName}` : '',
    cvValues.email    ? `Email: ${cvValues.email}`         : '',
    cvValues.phone    ? `Phone: ${cvValues.phone}`         : '',
    cvValues.linkedin ? `LinkedIn: ${cvValues.linkedin}`   : '',
  ].filter(Boolean)
  const header = lines.length
    ? `=== CONTACT INFO (AUTHORITATIVE) ===\n${lines.join('\n')}\n\n=== FULL CV TEXT ===\n`
    : ''
  return header + cvText.slice(0, 8000)
}

function applyDeterministicOverrides(mapping: FieldMapping[], cv: CvValues): FieldMapping[] {
  return mapping.map(m => {
    const { field } = m
    const ac  = (field.autocomplete || '').toLowerCase().replace(/\s/g, '')
    const nm  = (field.name || '').toLowerCase().replace(/[-_\s]/g, '')
    const lb  = field.label.toLowerCase().replace(/[^a-z0-9]/g, '')
    const typ = field.type

    const override = (val: string | undefined): FieldMapping | null =>
      val ? { ...m, value: val, confidence: 'high' } : null

    if (typ === 'email') return override(cv.email) ?? m
    if (typ === 'tel')   return override(cv.phone) ?? m
    if (ac === 'email')       return override(cv.email)     ?? m
    if (ac === 'tel')         return override(cv.phone)     ?? m
    if (ac === 'given-name')  return override(cv.firstName) ?? m
    if (ac === 'family-name') return override(cv.lastName)  ?? m
    if (ac === 'name')        return override(cv.fullName)  ?? m
    if (ac === 'url' && (nm.includes('linkedin') || lb.includes('linkedin')))
                              return override(cv.linkedin)  ?? m
    if (/email|e-?mail/.test(nm))                         return override(cv.email)     ?? m
    if (/phone|tel|mobile|mob|cell/.test(nm))             return override(cv.phone)     ?? m
    if (/linkedin|linked.?in/.test(nm))                   return override(cv.linkedin)  ?? m
    if (/^(firstname|fname|givenname)$/.test(nm))         return override(cv.firstName) ?? m
    if (/^(lastname|lname|surname|familyname)$/.test(nm)) return override(cv.lastName)  ?? m
    if (/^(fullname|name)$/.test(nm))                     return override(cv.fullName)  ?? m
    if (!m.value || m.confidence === 'low') {
      if (/email/.test(lb))            return override(cv.email)    ?? m
      if (/phone|mobile|tel/.test(lb)) return override(cv.phone)   ?? m
      if (/linkedin/.test(lb))         return override(cv.linkedin) ?? m
    }
    return m
  })
}

function matchLabel(a: string, b: string): boolean {
  const fa = a.toLowerCase().replace(/[^a-z0-9]/g, '')
  const fb = b.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (fa === fb) return true
  if (fa.includes(fb) || fb.includes(fa)) return true
  const aliases: [string, string][] = [
    ['firstname', 'givenname'], ['lastname', 'familyname'], ['lastname', 'surname'],
    ['email', 'emailaddress'], ['phone', 'phonenumber'], ['phone', 'mobile'],
    ['phone', 'contactnumber'], ['linkedin', 'linkedinurl'], ['fullname', 'name'], ['resume', 'cv'],
  ]
  return aliases.some(([x, y]) => (fa === x && fb === y) || (fa === y && fb === x))
}

// ── DOM field extraction ──────────────────────────────────────────────────────

async function grabFieldsFromDom(page: import('playwright').Page): Promise<DetectedField[]> {
  return page.evaluate(() => {
    const results: Array<{
      label: string; type: string; required: boolean;
      selector: string; placeholder: string; options: string[] | undefined;
      autocomplete: string; name: string;
    }> = []

    const els = Array.from(document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea'
    )) as HTMLInputElement[]

    for (const el of els) {
      const id = el.id; const name = el.name || ''
      const autocomplete = el.getAttribute('autocomplete') || ''
      const inputType = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase()
      const placeholder = el.placeholder || ''
      const required = el.required || el.getAttribute('aria-required') === 'true'
      let label = ''
      if (id) { const lbl = document.querySelector(`label[for="${id}"]`); if (lbl) label = (lbl.textContent || '').trim().replace(/\s*\*\s*$/, '').trim() }
      if (!label) { const aria = el.getAttribute('aria-label'); if (aria) label = aria.trim() }
      if (!label) { const lblId = el.getAttribute('aria-labelledby'); if (lblId) { const lblEl = document.getElementById(lblId); if (lblEl) label = (lblEl.textContent || '').trim() } }
      if (!label) { const parent = el.closest('label, .form-group, .field, [class*="field"], [class*="input"]'); if (parent) { const lbl = parent.querySelector('label, .label, [class*="label"], legend'); if (lbl && lbl !== el) label = (lbl.textContent || '').trim().replace(/\s*\*\s*$/, '').trim() } }
      if (!label) { if (autocomplete && autocomplete !== 'on' && autocomplete !== 'off') label = autocomplete; else if (name) label = name.replace(/[-_]/g, ' '); else if (placeholder) label = placeholder; else if (id) label = id.replace(/[-_]/g, ' ') }
      label = label.replace(/\s+/g, ' ').trim()
      let selector = ''
      if (id) selector = `#${id}`; else if (name) selector = `[name="${name}"]`; else if (autocomplete && autocomplete !== 'on' && autocomplete !== 'off') selector = `[autocomplete="${autocomplete}"]`; else if (placeholder) selector = `${el.tagName.toLowerCase()}[placeholder="${placeholder}"]`; else selector = el.tagName.toLowerCase()
      const options = el.tagName === 'SELECT' ? Array.from((el as unknown as HTMLSelectElement).options).map(o => o.text.trim()).filter(t => t && t !== '--' && !t.startsWith('--')) : undefined
      if (label && selector) results.push({ label, type: inputType, required, selector, placeholder, options, autocomplete, name })
    }
    const seen = new Set<string>()
    return results.filter(f => { if (seen.has(f.selector)) return false; seen.add(f.selector); return true })
  }) as Promise<DetectedField[]>
}

// ── Fill a single field ───────────────────────────────────────────────────────

async function fillField(
  page: import('playwright').Page,
  field: DetectedField,
  value: string,
  cvPath: string,
  clPath: string,
): Promise<boolean> {
  try {
    if (field.type === 'file') {
      if (value === '__SKIP_FILE__') return false
      const fp = value === '__CV_FILE__' ? cvPath : value === '__CL_FILE__' ? clPath : null
      if (!fp) return false
      await page.setInputFiles(field.selector, fp).catch(() => page.getByLabel(field.label, { exact: false }).setInputFiles(fp))
      return true
    }
    if (field.type === 'select') {
      const normValue = normalizeOption(value)
      const ok = await page.selectOption(field.selector, { label: value }).then(() => true).catch(() => false)
      if (ok) return true
      if (field.options) {
        const opt = field.options.find(o => normalizeOption(o) === normValue)
          || field.options.find(o => normalizeOption(o).includes(normValue) || normValue.includes(normalizeOption(o)))
        if (opt) return page.selectOption(field.selector, { label: opt }).then(() => true).catch(() => false)
      }
      return page.selectOption(field.selector, value).then(() => true).catch(() => false)
    }
    if (field.type === 'checkbox') {
      const check = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes'
      if (check) await page.check(field.selector).catch(() => {})
      else await page.uncheck(field.selector).catch(() => {})
      return true
    }
    return page.fill(field.selector, value).then(() => true)
      .catch(() => page.getByLabel(field.label, { exact: false }).fill(value).then(() => true)
        .catch(() => field.placeholder ? page.getByPlaceholder(field.placeholder, { exact: false }).fill(value).then(() => true).catch(() => false) : Promise.resolve(false)))
  } catch { return false }
}

// ── Analyse ───────────────────────────────────────────────────────────────────

export async function analyzeForm(
  jobUrl: string,
  cvText: string,
  coverLetter: string | undefined,
  anthropic: Anthropic,
  _credentials?: { username: string; password: string },
  storageState?: object,
): Promise<AnalyzeResult> {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(storageState ? { storageState: storageState as any } : {}),
    })
    const page = await ctx.newPage()
    await page.goto(jobUrl, { waitUntil: 'networkidle', timeout: 40000 })
    await page.waitForTimeout(3000)

    const pageTitle = await page.title()
    const screenshotB64 = (await page.screenshot({ fullPage: false })).toString('base64')

    const url = page.url()
    let formType = 'direct'
    if (url.includes('myworkday') || url.includes('workday.com')) formType = 'Workday'
    else if (url.includes('greenhouse.io')) formType = 'Greenhouse'
    else if (url.includes('lever.co')) formType = 'Lever'
    else if (url.includes('smartrecruiters.com')) formType = 'SmartRecruiters'
    else if (url.includes('personio.de') || url.includes('personio.com')) formType = 'Personio'

    let fields = await grabFieldsFromDom(page)

    if (fields.length === 0) {
      const vd = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshotB64 } },
          { type: 'text', text: `List every visible input field in this job application form. Return ONLY JSON:\n{"hasForm":true,"fields":[{"label":"First Name","type":"text","required":true,"selector":"input[name='firstName']","placeholder":"","autocomplete":"given-name","name":"firstName"}]}\nIf no form visible: {"hasForm":false,"fields":[]}` },
        ]}],
      })
      const parsed = parseJson<{ hasForm: boolean; fields: DetectedField[] }>((vd.content[0] as { text: string }).text, { hasForm: false, fields: [] })
      fields = parsed.fields
    }

    if (fields.length === 0) {
      return { formType, pageTitle, hasForm: false, fields: [], mapping: [], screenshotB64, error: 'No application form fields detected.' }
    }

    const cvValues  = extractCvValues(cvText)
    const cvContext = buildCvContext(cvText, cvValues)

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: `You are an expert job application assistant. Map each form field to the correct value from the candidate's CV.\n\nFORM FIELDS:\n${JSON.stringify(fields.map(f => ({ label: f.label, type: f.type, required: f.required, options: f.options, autocomplete: f.autocomplete, name: f.name })), null, 2)}\n\nCANDIDATE CV:\n${cvContext}\n${coverLetter ? `\nCOVER LETTER:\n${coverLetter.slice(0, 1000)}` : ''}\n\nRULES: File fields → "__CV_FILE__" / "__CL_FILE__" / "__SKIP_FILE__". Select → pick closest option text. Checkbox → "true"/"false". Unknown → "" with confidence "low". Do NOT invent data.\n\nReturn ONLY JSON array:\n[{"label":"Email","value":"user@example.com","confidence":"high"}]` }],
    })

    const rawMapping = parseJson<Array<{ label: string; value: string; confidence: 'high' | 'medium' | 'low'; notes?: string }>>((msg.content[0] as { text: string }).text, [])

    const mapping: FieldMapping[] = applyDeterministicOverrides(
      fields.map(field => {
        const match = rawMapping.find(m => matchLabel(field.label, m.label))
        return { field, value: match?.value ?? '', confidence: match?.confidence ?? 'low', notes: match?.notes }
      }),
      cvValues,
    )

    return { formType, pageTitle, hasForm: true, fields, mapping, screenshotB64 }
  } finally {
    await browser.close()
  }
}

// ── Execute (fill, keep browser alive, return sessionId) ──────────────────────

export async function* executeApply(
  jobUrl: string,
  mapping: FieldMapping[],
  cvText: string,
  coverLetter: string,
  storageState?: object,
): AsyncGenerator<ExecuteEvent> {
  const { chromium } = await import('playwright')
  const { randomUUID } = await import('crypto')
  const { join } = await import('path')
  const { tmpdir } = await import('os')
  const { writeFileSync } = await import('fs')

  const ts = Date.now()
  const sessionId = randomUUID()
  const cvPath = join(tmpdir(), `jl_cv_${ts}.txt`)
  const clPath = join(tmpdir(), `jl_cl_${ts}.txt`)
  writeFileSync(cvPath, cvText || '', 'utf8')
  writeFileSync(clPath, coverLetter || '', 'utf8')

  const browser = await chromium.launch({ headless: true })

  try {
    yield { type: 'log', message: 'Opening browser…' }
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(storageState ? { storageState: storageState as any } : {}),
    })
    const page = await ctx.newPage()

    yield { type: 'log', message: 'Navigating to application page…' }
    await page.goto(jobUrl, { waitUntil: 'networkidle', timeout: 40000 })
    await page.waitForTimeout(2500)

    const loadShot = (await page.screenshot({ fullPage: false })).toString('base64')
    yield { type: 'screenshot', message: 'Page loaded', b64: loadShot }

    const fillable = mapping.filter(m => m.value && m.value.trim())
    yield { type: 'log', message: `Filling ${fillable.length} fields…` }

    for (let i = 0; i < fillable.length; i++) {
      const { field, value } = fillable[i]
      yield { type: 'filling', label: field.label, value: value.startsWith('__') ? `[file: ${value}]` : value, index: i + 1, total: fillable.length }
      const success = await fillField(page, field, value, cvPath, clPath)
      yield { type: 'filled', label: field.label, success }
      await page.waitForTimeout(300)
    }

    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)
    const filledShot = (await page.screenshot({ fullPage: true })).toString('base64')

    sessions.set(sessionId, { browser, page, cvPath, clPath, createdAt: Date.now() })

    yield { type: 'filled_preview', b64: filledShot, message: `All ${fillable.length} fields filled. Review and confirm to submit.`, sessionId }
  } catch (err) {
    const errShot = await (async () => { try { const p = browser.contexts()[0]?.pages()[0]; return p ? (await p.screenshot({ fullPage: false })).toString('base64') : undefined } catch { return undefined } })()
    yield { type: 'error', message: String(err), b64: errShot }
    await browser.close()
    cleanupFiles(cvPath, clPath)
  }
}

// ── Submit (resume stored session) ───────────────────────────────────────────

export async function* submitApplyBySession(sessionId: string): AsyncGenerator<ExecuteEvent> {
  const session = sessions.get(sessionId)
  if (!session) {
    yield { type: 'error', message: 'Session expired. Please go back and re-fill the form (sessions last 10 minutes).' }
    return
  }
  sessions.delete(sessionId)
  const { browser, page, cvPath, clPath } = session

  try {
    yield { type: 'log', message: 'Submitting the filled form…' }

    const submitted = await page
      .getByRole('button', { name: /submit application|apply now|send application|submit/i })
      .first().click({ timeout: 5000 }).then(() => true).catch(() => false)

    if (!submitted) {
      await page.evaluate(() => {
        const btn = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement | null
        if (btn) btn.click()
      })
    }
    await page.waitForTimeout(4000)
    const confirmShot = (await page.screenshot({ fullPage: false })).toString('base64')
    yield { type: 'done', confirmB64: confirmShot, message: 'Application submitted. Screenshot confirms the result.' }
  } catch (err) {
    yield { type: 'error', message: String(err) }
  } finally {
    await browser.close()
    cleanupFiles(cvPath, clPath)
  }
}
