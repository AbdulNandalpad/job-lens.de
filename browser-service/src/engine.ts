import Anthropic from '@anthropic-ai/sdk'

export interface DetectedField {
  label: string
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'file' | 'checkbox' | 'radio' | 'date' | 'number' | 'url'
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

// ── Session store (Bucket 1: one browser, fill once, submit on same page) ────

interface BrowserSession {
  browser: import('playwright').Browser
  page: import('playwright').Page
  cvPath: string
  clPath: string
  createdAt: number
}

const sessions = new Map<string, BrowserSession>()
const SESSION_TTL = 10 * 60 * 1000

// Evict stale sessions every 60 s without preventing Node from exiting
setInterval(() => {
  const now = Date.now()
  for (const [id, s] of sessions) {
    if (now - s.createdAt > SESSION_TTL) {
      s.browser.close().catch(() => {})
      cleanupFiles(s.cvPath, s.clPath)
      sessions.delete(id)
    }
  }
}, 60_000).unref()

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseJson<T>(text: string, fallback: T): T {
  try {
    const arr = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)
    return arr ? (JSON.parse(arr[0]) as T) : fallback
  } catch {
    return fallback
  }
}

function cleanupFiles(...paths: string[]) {
  const { unlinkSync, existsSync } = require('fs') as typeof import('fs')
  for (const p of paths) {
    try { if (existsSync(p)) unlinkSync(p) } catch { /* ignore */ }
  }
}

// Generate a proper PDF from CV text — ATS systems reject plain .txt files
async function generateCvPdf(cvText: string): Promise<string> {
  const { join } = require('path') as typeof import('path')
  const { tmpdir } = require('os') as typeof import('os')
  const { writeFileSync } = require('fs') as typeof import('fs')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFDocument = require('pdfkit')

  const pdfPath = join(tmpdir(), `jl_cv_${Date.now()}.pdf`)

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' }) as NodeJS.EventEmitter & {
      font(name: string): unknown
      fontSize(n: number): unknown
      text(s: string, opts?: object): unknown
      end(): void
    }
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => {
      try {
        writeFileSync(pdfPath, Buffer.concat(chunks))
        resolve(pdfPath)
      } catch (e) { reject(e) }
    })
    doc.on('error', reject)

    doc.font('Helvetica')
    doc.fontSize(11)
    for (const line of cvText.split('\n')) {
      doc.text(line || ' ')
    }
    doc.end()
  })
}

// Normalize option text for fuzzy select matching
function normalizeOption(s: string): string {
  return s.toLowerCase().replace(/[-_\s]/g, '').replace(/[^a-z0-9]/g, '')
}

// Build a structured CV context with pre-extracted values as a reliable header
function buildCvContext(cvText: string, cvValues: CvValues): string {
  const lines = [
    cvValues.fullName  ? `Full Name: ${cvValues.fullName}`   : '',
    cvValues.email     ? `Email: ${cvValues.email}`           : '',
    cvValues.phone     ? `Phone: ${cvValues.phone}`           : '',
    cvValues.linkedin  ? `LinkedIn: ${cvValues.linkedin}`     : '',
  ].filter(Boolean)

  const header = lines.length
    ? `=== CONTACT INFO (AUTHORITATIVE) ===\n${lines.join('\n')}\n\n=== FULL CV TEXT ===\n`
    : ''

  return header + cvText.slice(0, 8000)
}

// ── Field detection ──────────────────────────────────────────────────────────

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
      const id          = el.id
      const name        = el.name        || ''
      const autocomplete= el.getAttribute('autocomplete') || ''
      const inputType   = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase()
      const placeholder = el.placeholder || ''
      const required    = el.required || el.getAttribute('aria-required') === 'true'

      let label = ''

      if (id) {
        const lbl = document.querySelector(`label[for="${id}"]`)
        if (lbl) label = (lbl.textContent || '').trim().replace(/\s*\*\s*$/, '').trim()
      }
      if (!label) {
        const aria = el.getAttribute('aria-label')
        if (aria) label = aria.trim()
      }
      if (!label) {
        const lblId = el.getAttribute('aria-labelledby')
        if (lblId) {
          const lblEl = document.getElementById(lblId)
          if (lblEl) label = (lblEl.textContent || '').trim()
        }
      }
      if (!label) {
        const parent = el.closest('label, .form-group, .field, [class*="field"], [class*="input"], [class*="form"]')
        if (parent) {
          const lbl = parent.querySelector('label, .label, [class*="label"], legend')
          if (lbl && lbl !== el) label = (lbl.textContent || '').trim().replace(/\s*\*\s*$/, '').trim()
        }
      }
      if (!label) {
        if (autocomplete && autocomplete !== 'on' && autocomplete !== 'off') label = autocomplete
        else if (name) label = name.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
        else if (placeholder) label = placeholder
        else if (id) label = id.replace(/[-_]/g, ' ')
      }
      label = label.replace(/\s+/g, ' ').trim()

      let selector = ''
      if (id) selector = `#${id}`
      else if (name) selector = `[name="${name}"]`
      else if (autocomplete && autocomplete !== 'on' && autocomplete !== 'off') selector = `[autocomplete="${autocomplete}"]`
      else if (placeholder) selector = `${el.tagName.toLowerCase()}[placeholder="${placeholder}"]`
      else selector = el.tagName.toLowerCase()

      const options = el.tagName === 'SELECT'
        ? Array.from((el as unknown as HTMLSelectElement).options)
            .map(o => o.text.trim())
            .filter(t => t && t !== '--' && !t.startsWith('--'))
        : undefined

      if (label && selector) {
        results.push({ label, type: inputType, required, selector, placeholder, options, autocomplete, name })
      }
    }

    const seen = new Set<string>()
    return results.filter(f => {
      if (seen.has(f.selector)) return false
      seen.add(f.selector)
      return true
    })
  }) as Promise<DetectedField[]>
}

// ── CV-to-field mapping ──────────────────────────────────────────────────────

async function mapCvToFields(
  fields: DetectedField[],
  cvContext: string,
  coverLetter: string | undefined,
  anthropic: Anthropic,
): Promise<Array<{ label: string; value: string; confidence: 'high' | 'medium' | 'low'; notes?: string }>> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `You are an expert job application assistant. Map each form field below to the exact correct value from the candidate's CV. Be precise — the filled application must be 100% accurate.

FORM FIELDS:
${JSON.stringify(fields.map(f => ({
  label: f.label,
  type: f.type,
  required: f.required,
  options: f.options,
  autocomplete: f.autocomplete,
  name: f.name,
  placeholder: f.placeholder,
})), null, 2)}

CANDIDATE CV:
${cvContext}
${coverLetter ? `\nCOVER LETTER:\n${coverLetter.slice(0, 1000)}` : ''}

MAPPING RULES — follow exactly:
1. Name fields: split into first/last correctly. "Full Name" → full name.
2. Email: extract the EXACT email from the CONTACT INFO section at the top.
3. Phone: extract EXACTLY as written — do NOT change format.
4. LinkedIn: extract the full LinkedIn URL.
5. Location/City: use city name from CV header.
6. Current CTC / Salary: use exact number/amount written. If absent, leave "".
7. Notice Period: use exact value, match closest select option if needed.
8. Expected CTC: only if explicitly stated. Otherwise "".
9. File fields (CV/resume/attachment): use "__CV_FILE__". Cover letter files: "__CL_FILE__". Other file: "__SKIP_FILE__".
10. Select / dropdown: pick the CLOSEST matching option text from the options list (case-insensitive). Output the exact option text.
11. Checkbox: "true" or "false".
12. If a field cannot be answered from the CV, return "" with confidence "low".
13. DO NOT invent information. Extract only what is written.

Return ONLY a valid JSON array — no commentary:
[
  { "label": "Email", "value": "priya.sharma@gmail.com", "confidence": "high" },
  { "label": "First Name", "value": "Priya", "confidence": "high" }
]`,
    }],
  })

  return parseJson<Array<{ label: string; value: string; confidence: 'high' | 'medium' | 'low'; notes?: string }>>(
    (msg.content[0] as { text: string }).text,
    [],
  )
}

// ── Extract known values from CV text ────────────────────────────────────────

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
        vals.fullName  = t
        vals.firstName = words[0]
        vals.lastName  = words.slice(1).join(' ')
        break
      }
    }
  }

  return vals
}

// ── Deterministic overrides ───────────────────────────────────────────────────

function applyDeterministicOverrides(mapping: FieldMapping[], cv: CvValues): FieldMapping[] {
  return mapping.map(m => {
    const { field } = m
    const ac  = (field.autocomplete || '').toLowerCase().replace(/\s/g, '')
    const nm  = (field.name        || '').toLowerCase().replace(/[-_\s]/g, '')
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
      if (/email/.test(lb))              return override(cv.email)    ?? m
      if (/phone|mobile|tel/.test(lb))   return override(cv.phone)   ?? m
      if (/linkedin/.test(lb))           return override(cv.linkedin) ?? m
    }

    return m
  })
}

// ── Fuzzy label matching ──────────────────────────────────────────────────────

function matchLabel(fieldLabel: string, mappedLabel: string): boolean {
  const fl = fieldLabel.toLowerCase().replace(/[^a-z0-9]/g, '')
  const ml = mappedLabel.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (fl === ml) return true
  if (fl.includes(ml) || ml.includes(fl)) return true
  const aliases: [string, string][] = [
    ['firstname', 'givenname'], ['lastname', 'familyname'], ['lastname', 'surname'],
    ['email', 'emailaddress'], ['phone', 'phonenumber'], ['phone', 'mobile'],
    ['phone', 'contactnumber'], ['linkedin', 'linkedinurl'], ['linkedin', 'linkedinprofile'],
    ['currentctc', 'currentsalary'], ['expectedctc', 'expectedsalary'],
    ['noticeperiod', 'availability'], ['fullname', 'name'], ['resume', 'cv'],
  ]
  return aliases.some(([a, b]) => (fl === a && ml === b) || (fl === b && ml === a))
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
      const filePath = value === '__CV_FILE__' ? cvPath : value === '__CL_FILE__' ? clPath : null
      if (!filePath) return false
      await page.setInputFiles(field.selector, filePath)
        .catch(() => page.getByLabel(field.label, { exact: false }).setInputFiles(filePath))
      return true
    }

    if (field.type === 'select') {
      const normValue = normalizeOption(value)
      // 1. Exact label match
      const ok = await page.selectOption(field.selector, { label: value }).then(() => true).catch(() => false)
      if (ok) return true
      // 2. Normalized match against known options
      if (field.options) {
        const opt = field.options.find(o => normalizeOption(o) === normValue)
        if (opt) {
          return page.selectOption(field.selector, { label: opt }).then(() => true).catch(() => false)
        }
        // 3. Partial normalized match (e.g. "fulltime" matches "Full Time Employment")
        const partOpt = field.options.find(o => normalizeOption(o).includes(normValue) || normValue.includes(normalizeOption(o)))
        if (partOpt) {
          return page.selectOption(field.selector, { label: partOpt }).then(() => true).catch(() => false)
        }
      }
      // 4. Raw value fallback
      return page.selectOption(field.selector, value).then(() => true).catch(() => false)
    }

    if (field.type === 'checkbox') {
      const check = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes'
      if (check) await page.check(field.selector).catch(() => {})
      else await page.uncheck(field.selector).catch(() => {})
      return true
    }

    // text / email / tel / textarea / date / number / url
    return page.fill(field.selector, value).then(() => true)
      .catch(() => page.getByLabel(field.label, { exact: false }).fill(value).then(() => true)
        .catch(() => field.placeholder
          ? page.getByPlaceholder(field.placeholder, { exact: false }).fill(value).then(() => true).catch(() => false)
          : Promise.resolve(false)
        )
      )
  } catch {
    return false
  }
}

// ── Mapping helper (used by analyzeForm in both direct and post-login paths) ──

async function buildMapping(fields: DetectedField[], cvText: string, coverLetter: string | undefined, anthropic: Anthropic): Promise<FieldMapping[]> {
  const cvValues  = extractCvValues(cvText)
  const cvContext = buildCvContext(cvText, cvValues)
  const rawMapping = await mapCvToFields(fields, cvContext, coverLetter, anthropic)
  return applyDeterministicOverrides(
    fields.map(field => {
      const match = rawMapping.find(m => matchLabel(field.label, m.label))
      return { field, value: match?.value ?? '', confidence: match?.confidence ?? 'low', notes: match?.notes }
    }),
    cvValues,
  )
}

// ── Analyze form ──────────────────────────────────────────────────────────────

export async function analyzeForm(
  jobUrl: string,
  cvText: string,
  coverLetter: string | undefined,
  anthropic: Anthropic,
  credentials?: { username: string; password: string },
): Promise<AnalyzeResult> {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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
    else if (url.includes('recruitee.com')) formType = 'Recruitee'
    else if (url.includes('personio.de') || url.includes('personio.com')) formType = 'Personio'
    else if (url.includes('taleo')) formType = 'Taleo'

    // Detect login walls — check DOM first (handles shadow DOM miss), also check URL/title patterns
    const hasPasswordField = await page.locator('input[type="password"]').first().isVisible({ timeout: 2000 }).catch(() => false)
      || await page.$('input[type="password"]').then(el => !!el).catch(() => false)
    const urlLower = url.toLowerCase()
    const titleLower = pageTitle.toLowerCase()
    const isLoginWall = hasPasswordField ||
      /\/(login|signin|sign-in|authenticate|auth\/login|account\/login)/.test(urlLower) ||
      /log\s?in|sign\s?in|create\s?account|sign\s?up|register/i.test(titleLower) && !/apply|application|job|career/i.test(titleLower)

    if (isLoginWall) {
      // If credentials provided, attempt to log in and continue
      if (credentials?.username && credentials?.password) {
        try {
          // Fill email/username field
          const emailSel = page.locator('input[type="email"], input[name*="email" i], input[name*="user" i], input[autocomplete="username"], input[autocomplete="email"]').first()
          await emailSel.fill(credentials.username, { timeout: 5000 }).catch(() => {})
          // Fill password field
          await page.locator('input[type="password"]').first().fill(credentials.password, { timeout: 5000 }).catch(() => {})
          // Click the primary submit/login button
          const loginBtn = page.locator('button[type="submit"], input[type="submit"], button:text-matches("Sign In|Log In|Login|Continue|Submit", "i")').first()
          await loginBtn.click({ timeout: 5000 }).catch(() => {})
          // Wait for navigation after login
          await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
          await page.waitForTimeout(3000)
          // Check if login succeeded (no longer on a login page)
          const newUrl = page.url()
          const newTitle = await page.title()
          const stillOnLoginPage = await page.locator('input[type="password"]').first().isVisible({ timeout: 2000 }).catch(() => false)
          const loginShot = (await page.screenshot({ fullPage: false })).toString('base64')
          if (stillOnLoginPage) {
            return {
              formType, pageTitle: newTitle, hasForm: false, requiresLogin: true,
              fields: [], mapping: [], screenshotB64: loginShot,
              error: 'Login failed — please check your username and password and try again.',
            }
          }
          // Re-detect form type after login
          if (newUrl.includes('myworkday') || newUrl.includes('workday.com')) formType = 'Workday'
          // Continue analysis on the post-login page
          const postFields = await grabFieldsFromDom(page)
          const postTitle = newTitle
          const postShot = loginShot
          if (postFields.some(f => f.type === 'password')) {
            return { formType, pageTitle: postTitle, hasForm: false, requiresLogin: true, fields: [], mapping: [], screenshotB64: postShot, error: 'Still on a login page after signing in.' }
          }
          if (postFields.length === 0) {
            return { formType, pageTitle: postTitle, hasForm: false, requiresLogin: false, fields: [], mapping: [], screenshotB64: postShot, error: 'Logged in but no application form found on this page. The form may be on a different URL.' }
          }
          const postMapping = await buildMapping(postFields, cvText, coverLetter, anthropic)
          return { formType, pageTitle: postTitle, hasForm: true, fields: postFields, mapping: postMapping, screenshotB64: postShot }
        } catch (loginErr) {
          console.error('[analyzeForm] login attempt failed:', loginErr)
          return {
            formType, pageTitle, hasForm: false, requiresLogin: true,
            fields: [], mapping: [], screenshotB64,
            error: 'Login attempt failed. Please check your credentials and try again.',
          }
        }
      }

      return {
        formType,
        pageTitle,
        hasForm: false,
        requiresLogin: true,
        fields: [],
        mapping: [],
        screenshotB64,
        error: 'This page requires you to log in before accessing the application form.',
      }
    }

    let fields = await grabFieldsFromDom(page)

    // Second-pass check: if extracted fields contain password inputs, it's still a login wall
    if (fields.some(f => f.type === 'password')) {
      if (credentials?.username && credentials?.password) {
        // Same login attempt for second-pass detection
        try {
          await page.locator('input[type="email"], input[name*="email" i], input[name*="user" i]').first().fill(credentials.username, { timeout: 5000 }).catch(() => {})
          await page.locator('input[type="password"]').first().fill(credentials.password, { timeout: 5000 }).catch(() => {})
          await page.locator('button[type="submit"], input[type="submit"], button:text-matches("Sign In|Log In|Login|Continue|Submit", "i")').first().click({ timeout: 5000 }).catch(() => {})
          await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
          await page.waitForTimeout(3000)
          const stillOnLogin = await page.locator('input[type="password"]').first().isVisible({ timeout: 2000 }).catch(() => false)
          const postShot = (await page.screenshot({ fullPage: false })).toString('base64')
          if (stillOnLogin) {
            return { formType, pageTitle, hasForm: false, requiresLogin: true, fields: [], mapping: [], screenshotB64: postShot, error: 'Login failed — please check your username and password.' }
          }
          const postFields = await grabFieldsFromDom(page)
          if (!postFields.length) return { formType, pageTitle, hasForm: false, requiresLogin: false, fields: [], mapping: [], screenshotB64: postShot, error: 'Logged in but no application form found.' }
          const postMapping = await buildMapping(postFields, cvText, coverLetter, anthropic)
          return { formType, pageTitle: await page.title(), hasForm: true, fields: postFields, mapping: postMapping, screenshotB64: postShot }
        } catch { /* fall through */ }
      }
      return {
        formType,
        pageTitle,
        hasForm: false,
        requiresLogin: true,
        fields: [],
        mapping: [],
        screenshotB64,
        error: 'This page appears to be a login or registration form, not a job application form.',
      }
    }

    if (fields.length === 0) {
      const visionMsg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshotB64 } },
            {
              type: 'text',
              text: `List every visible input field in this job application form. Return ONLY JSON:
{"hasForm":true,"fields":[{"label":"First Name","type":"text","required":true,"selector":"input[name='firstName']","placeholder":"","autocomplete":"given-name","name":"firstName"}]}
If no form visible: {"hasForm":false,"fields":[]}`,
            },
          ],
        }],
      })

      const vd = parseJson<{ hasForm: boolean; fields: DetectedField[] }>(
        (visionMsg.content[0] as { text: string }).text,
        { hasForm: false, fields: [] },
      )
      fields = vd.fields
    }

    if (fields.length === 0) {
      return { formType, pageTitle, hasForm: false, fields: [], mapping: [], screenshotB64, error: 'No application form fields detected.' }
    }

    const mapping = await buildMapping(fields, cvText, coverLetter, anthropic)
    return { formType, pageTitle, hasForm: true, fields, mapping, screenshotB64 }
  } finally {
    await browser.close()
  }
}

// ── Execute (fill form, keep browser alive) ───────────────────────────────────
// Bucket 1: browser stays open. Session stored by UUID. Submit resumes same page.

export async function* executeApply(
  jobUrl: string,
  mapping: FieldMapping[],
  cvText: string,
  coverLetter: string,
): AsyncGenerator<ExecuteEvent> {
  const { chromium } = await import('playwright')
  const { randomUUID } = await import('crypto')
  const { join } = require('path') as typeof import('path')
  const { tmpdir } = require('os') as typeof import('os')
  const { writeFileSync } = require('fs') as typeof import('fs')

  const ts = Date.now()
  const sessionId = randomUUID()
  let cvPath: string
  let clPath: string

  // Generate PDF for CV — accepted by ATS, .txt is not
  try {
    cvPath = await generateCvPdf(cvText || 'CV not provided')
  } catch {
    cvPath = join(tmpdir(), `jl_cv_${ts}.txt`)
    writeFileSync(cvPath, cvText || 'CV not provided', 'utf8')
  }
  clPath = join(tmpdir(), `jl_cl_${ts}.txt`)
  writeFileSync(clPath, coverLetter || 'Cover letter not provided', 'utf8')

  const browser = await chromium.launch({ headless: true })

  try {
    yield { type: 'log', message: 'Opening browser…' }

    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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
      yield {
        type: 'filling',
        label: field.label,
        value: value.startsWith('__') ? `[file: ${value}]` : value,
        index: i + 1,
        total: fillable.length,
      }
      const success = await fillField(page, field, value, cvPath, clPath)
      yield { type: 'filled', label: field.label, success }
      await page.waitForTimeout(300)
    }

    // ── Multi-page form: click Next/Continue until Submit is reachable ─────────
    const MAX_PAGES = 8
    const cvValues = extractCvValues(cvText || '')
    for (let pageNum = 2; pageNum <= MAX_PAGES; pageNum++) {
      await page.waitForTimeout(800)

      // If a submit button is visible we've reached the last page — stop advancing
      const submitVisible = await page
        .getByRole('button', { name: /submit application|apply now|send application|^submit$/i })
        .first().isVisible().catch(() => false)
      if (submitVisible) { yield { type: 'log', message: 'Submit button detected — ready to confirm.' }; break }

      // Look for a Next / Continue button
      const nextBtn = page.locator([
        'button:text-matches("Next|Continue|Save and Continue|Proceed|Weiter|Nächste", "i")',
        '[data-automation-id*="next"i]',
        '[data-automation-id*="continue"i]',
        '[class*="next-button"i]',
        '[class*="nextBtn"i]',
      ].join(', ')).first()
      const nextVisible = await nextBtn.isVisible().catch(() => false)
      if (!nextVisible) break  // no more pages

      yield { type: 'log', message: `Multi-page form: clicking Next (page ${pageNum})…` }
      await nextBtn.click()
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(2500)

      const pageShot = (await page.screenshot({ fullPage: false })).toString('base64')
      yield { type: 'screenshot', message: `Page ${pageNum} loaded`, b64: pageShot }

      // Extract new fields and map against existing mapping + CV values
      const newFields = await grabFieldsFromDom(page)
      if (newFields.length === 0) break

      const newMapping = applyDeterministicOverrides(
        newFields.map(field => {
          const existing = mapping.find(m => matchLabel(field.label, m.field.label))
          return { field, value: existing?.value ?? '', confidence: existing?.confidence ?? 'low' }
        }),
        cvValues,
      )

      const newFillable = newMapping.filter(m => m.value && m.value.trim())
      if (newFillable.length === 0) continue

      yield { type: 'log', message: `Page ${pageNum}: filling ${newFillable.length} fields…` }
      for (let i = 0; i < newFillable.length; i++) {
        const { field, value } = newFillable[i]
        yield {
          type: 'filling',
          label: `[p${pageNum}] ${field.label}`,
          value: value.startsWith('__') ? `[file: ${value}]` : value,
          index: i + 1,
          total: newFillable.length,
        }
        const success = await fillField(page, field, value, cvPath, clPath)
        yield { type: 'filled', label: `[p${pageNum}] ${field.label}`, success }
        await page.waitForTimeout(300)
      }
    }

    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)
    const filledShot = (await page.screenshot({ fullPage: true })).toString('base64')

    // Store session — browser stays alive so submit can click on the already-filled page
    sessions.set(sessionId, { browser, page, cvPath, clPath, createdAt: Date.now() })

    yield {
      type: 'filled_preview',
      b64: filledShot,
      message: `All ${fillable.length} fields filled. Review the form above and confirm to submit.`,
      sessionId,
    }
    // Do NOT close browser here — session store owns it now
  } catch (err) {
    const errShot = await (async () => {
      try {
        const p = browser.contexts()[0]?.pages()[0]
        return p ? (await p.screenshot({ fullPage: false })).toString('base64') : undefined
      } catch { return undefined }
    })()
    yield { type: 'error', message: String(err), b64: errShot }
    // On error, close and clean up (no session stored)
    await browser.close()
    cleanupFiles(cvPath!, clPath)
  }
}

// ── Submit (resume stored session, click submit) ──────────────────────────────
// Bucket 1: the page is already filled. We just click the submit button.

export async function* submitApply(sessionId: string): AsyncGenerator<ExecuteEvent> {
  const session = sessions.get(sessionId)

  if (!session) {
    yield { type: 'error', message: 'Session expired. Please go back and re-fill the form (sessions last 10 minutes).' }
    return
  }

  // Consume — each session can only be submitted once
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
