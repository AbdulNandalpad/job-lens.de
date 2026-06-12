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
  | { type: 'filled_preview'; b64: string; message: string }
  | { type: 'done'; confirmB64: string; message: string }
  | { type: 'error'; message: string; b64?: string }

function parseJson<T>(text: string, fallback: T): T {
  try {
    const arr = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)
    return arr ? (JSON.parse(arr[0]) as T) : fallback
  } catch {
    return fallback
  }
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

      // ── Label resolution (4 strategies) ───────────────────────────────────
      let label = ''

      // 1. Explicit <label for="id">
      if (id) {
        const lbl = document.querySelector(`label[for="${id}"]`)
        if (lbl) label = (lbl.textContent || '').trim().replace(/\s*\*\s*$/, '').trim()
      }
      // 2. aria-label / aria-labelledby
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
      // 3. Nearest ancestor label or field wrapper
      if (!label) {
        const parent = el.closest('label, .form-group, .field, [class*="field"], [class*="input"], [class*="form"]')
        if (parent) {
          const lbl = parent.querySelector('label, .label, [class*="label"], legend')
          if (lbl && lbl !== el) label = (lbl.textContent || '').trim().replace(/\s*\*\s*$/, '').trim()
        }
      }
      // 4. Fall back to autocomplete → name → placeholder → id
      if (!label) {
        if (autocomplete && autocomplete !== 'on' && autocomplete !== 'off') label = autocomplete
        else if (name) label = name.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
        else if (placeholder) label = placeholder
        else if (id) label = id.replace(/[-_]/g, ' ')
      }
      label = label.replace(/\s+/g, ' ').trim()

      // ── Selector (prefer stable attributes) ───────────────────────────────
      let selector = ''
      if (id) selector = `#${id}`
      else if (name) selector = `[name="${name}"]`
      else if (autocomplete && autocomplete !== 'on' && autocomplete !== 'off') selector = `[autocomplete="${autocomplete}"]`
      else if (placeholder) selector = `${el.tagName.toLowerCase()}[placeholder="${placeholder}"]`
      else selector = el.tagName.toLowerCase()

      // ── Options for <select> ───────────────────────────────────────────────
      const options = el.tagName === 'SELECT'
        ? Array.from((el as unknown as HTMLSelectElement).options).map(o => o.text.trim()).filter(t => t && t !== '--' && !t.startsWith('--'))
        : undefined

      if (label && selector) {
        results.push({ label, type: inputType, required, selector, placeholder, options, autocomplete, name })
      }
    }

    // Deduplicate by selector
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
  cvText: string,
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
${cvText.slice(0, 6000)}
${coverLetter ? `\nCOVER LETTER:\n${coverLetter.slice(0, 1000)}` : ''}

MAPPING RULES — follow exactly:
1. Name fields: split into first/last correctly. "Full Name" → full name.
2. Email: extract the EXACT email address from the CV (look for @ symbol).
3. Phone: extract EXACTLY as written in the CV — do NOT change format.
4. LinkedIn: extract the full LinkedIn URL from the CV.
5. Location/City: use city name from CV header.
6. Current CTC / Salary: use exact number/amount written in CV. If not present, leave "".
7. Notice Period: use exact value from CV, match closest select option if needed.
8. Expected CTC: only if explicitly stated in CV. Otherwise "".
9. File fields (CV/resume/attachment): use "__CV_FILE__". Cover letter files: "__CL_FILE__". Other file: "__SKIP_FILE__".
10. Select / dropdown: pick the CLOSEST matching option text from the options list.
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

// ── Extract known values from CV text via regex ──────────────────────────────

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

  // Email — most reliable: look for @ pattern
  const emailM = cvText.match(/[\w.+\-]+@[\w\-]+(?:\.[\w\-]+)+/i)
  if (emailM) vals.email = emailM[0].toLowerCase()

  // Phone — lines or tokens that look like phone numbers
  const phoneM = cvText.match(/(?:\+\d{1,3}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,5}[\s\-.]?\d{3,5}(?:[\s\-.]?\d{1,4})?/)
  if (phoneM) vals.phone = phoneM[0].trim()

  // LinkedIn URL
  const linkedinM = cvText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w\-%.]+\/?/i)
  if (linkedinM) {
    vals.linkedin = linkedinM[0].startsWith('http') ? linkedinM[0] : 'https://' + linkedinM[0]
    vals.linkedin = vals.linkedin.replace(/\/$/, '')
  }

  // Full name — first non-empty line that is short, has no digits, no @
  for (const line of cvText.split('\n')) {
    const t = line.trim()
    if (t.length > 2 && t.length < 55 && !t.includes('@') && !/\d/.test(t) && /[A-Za-z]/.test(t)) {
      const words = t.split(/\s+/)
      if (words.length >= 2 && words.length <= 5) {
        vals.fullName = t
        vals.firstName = words[0]
        vals.lastName = words.slice(1).join(' ')
        break
      }
    }
  }

  return vals
}

// ── Deterministic overrides: trust HTML attrs over Claude when confident ──────

function applyDeterministicOverrides(mapping: FieldMapping[], cv: CvValues): FieldMapping[] {
  return mapping.map(m => {
    const { field } = m
    const ac  = (field.autocomplete || '').toLowerCase().replace(/\s/g, '')
    const nm  = (field.name        || '').toLowerCase().replace(/[-_\s]/g, '')
    const lb  = field.label.toLowerCase().replace(/[^a-z0-9]/g, '')
    const typ = field.type

    // Helper: upgrade a mapping if we have a confident value
    const override = (val: string | undefined): FieldMapping | null =>
      val ? { ...m, value: val, confidence: 'high' } : null

    // 1. HTML type="email" — definitive
    if (typ === 'email') return override(cv.email) ?? m

    // 2. HTML type="tel" — definitive
    if (typ === 'tel')   return override(cv.phone) ?? m

    // 3. autocomplete attribute — very reliable
    if (ac === 'email')       return override(cv.email)     ?? m
    if (ac === 'tel')         return override(cv.phone)     ?? m
    if (ac === 'given-name')  return override(cv.firstName) ?? m
    if (ac === 'family-name') return override(cv.lastName)  ?? m
    if (ac === 'name')        return override(cv.fullName)  ?? m
    if (ac === 'url' && (nm.includes('linkedin') || lb.includes('linkedin')))
                              return override(cv.linkedin)  ?? m

    // 4. name attribute patterns — reliable
    if (/email|e-?mail/.test(nm))                         return override(cv.email)     ?? m
    if (/phone|tel|mobile|mob|cell/.test(nm))             return override(cv.phone)     ?? m
    if (/linkedin|linked.?in/.test(nm))                   return override(cv.linkedin)  ?? m
    if (/^(firstname|fname|givenname)$/.test(nm))         return override(cv.firstName) ?? m
    if (/^(lastname|lname|surname|familyname)$/.test(nm)) return override(cv.lastName)  ?? m
    if (/^(fullname|name)$/.test(nm))                     return override(cv.fullName)  ?? m

    // 5. Label fallback — catch anything Claude missed for high-certainty fields
    if (!m.value || m.confidence === 'low') {
      if (/email/.test(lb))    return override(cv.email)    ?? m
      if (/phone|mobile|tel/.test(lb)) return override(cv.phone) ?? m
      if (/linkedin/.test(lb)) return override(cv.linkedin) ?? m
    }

    return m
  })
}

// ── Fuzzy label matching ─────────────────────────────────────────────────────

function matchLabel(fieldLabel: string, mappedLabel: string): boolean {
  const fl = fieldLabel.toLowerCase().replace(/[^a-z0-9]/g, '')
  const ml = mappedLabel.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (fl === ml) return true
  if (fl.includes(ml) || ml.includes(fl)) return true
  // common aliases
  const aliases: [string, string][] = [
    ['firstname', 'givenname'], ['lastname', 'familyname'], ['lastname', 'surname'],
    ['email', 'emailaddress'], ['phone', 'phonenumber'], ['phone', 'mobile'],
    ['phone', 'contactnumber'], ['linkedin', 'linkedinurl'], ['linkedin', 'linkedinprofile'],
    ['currentctc', 'currentsalary'], ['expectedctc', 'expectedsalary'],
    ['noticeperiod', 'availability'], ['fullname', 'name'], ['resume', 'cv'],
  ]
  return aliases.some(([a, b]) => (fl === a && ml === b) || (fl === b && ml === a))
}

// ── Analyze form ─────────────────────────────────────────────────────────────

export async function analyzeForm(
  jobUrl: string,
  cvText: string,
  coverLetter: string | undefined,
  anthropic: Anthropic,
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

    let fields = await grabFieldsFromDom(page)

    // Vision fallback if DOM scan found nothing
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

    const rawMapping = await mapCvToFields(fields, cvText, coverLetter, anthropic)
    const cvValues   = extractCvValues(cvText)

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

// ── Fill form (without submitting) ──────────────────────────────────────────
// Yields events during fill, then yields filled_preview and closes.
// The client shows the screenshot and asks the user to confirm before submitting.

export async function* executeApply(
  jobUrl: string,
  mapping: FieldMapping[],
  cvText: string,
  coverLetter: string,
): AsyncGenerator<ExecuteEvent> {
  const { chromium } = await import('playwright')
  const { writeFileSync, unlinkSync, existsSync } = await import('fs')
  const { join } = await import('path')
  const { tmpdir } = await import('os')

  const ts = Date.now()
  const cvPath = join(tmpdir(), `jl_cv_${ts}.txt`)
  const clPath = join(tmpdir(), `jl_cl_${ts}.txt`)
  writeFileSync(cvPath, cvText || 'CV not provided', 'utf8')
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

      let success = false
      try {
        if (field.type === 'file') {
          if (value === '__SKIP_FILE__') { yield { type: 'filled', label: field.label, success: false }; continue }
          const filePath = value === '__CV_FILE__' ? cvPath : value === '__CL_FILE__' ? clPath : null
          if (filePath) {
            await page.setInputFiles(field.selector, filePath)
              .catch(async () => page.getByLabel(field.label, { exact: false }).setInputFiles(filePath))
            success = true
          }
        } else if (field.type === 'select') {
          await page.selectOption(field.selector, { label: value })
            .catch(() => page.selectOption(field.selector, value))
          success = true
        } else if (field.type === 'checkbox') {
          const check = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes'
          if (check) await page.check(field.selector).catch(() => {})
          else await page.uncheck(field.selector).catch(() => {})
          success = true
        } else {
          // Try selector first, then aria-label, then placeholder — triple fallback
          success = await page.fill(field.selector, value).then(() => true)
            .catch(() => page.getByLabel(field.label, { exact: false }).fill(value).then(() => true)
              .catch(() => field.placeholder
                ? page.getByPlaceholder(field.placeholder, { exact: false }).fill(value).then(() => true).catch(() => false)
                : Promise.resolve(false)
              )
            )
        }
      } catch { success = false }

      yield { type: 'filled', label: field.label, success }
      await page.waitForTimeout(300)
    }

    // Scroll to top so the screenshot shows the full form from the top
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)
    const filledShot = (await page.screenshot({ fullPage: true })).toString('base64')

    // Stop here — do NOT submit. Client will show screenshot and ask for confirmation.
    yield {
      type: 'filled_preview',
      b64: filledShot,
      message: `All ${fillable.length} fields filled. Review the form above and confirm to submit.`,
    }
  } catch (err) {
    const errShot = await (async () => {
      try {
        const p = await browser.contexts()[0]?.pages()[0]
        return p ? (await p.screenshot({ fullPage: false })).toString('base64') : undefined
      } catch { return undefined }
    })()
    yield { type: 'error', message: String(err), b64: errShot }
  } finally {
    await browser.close()
    try { if (existsSync(cvPath)) unlinkSync(cvPath) } catch { /* ignore */ }
    try { if (existsSync(clPath)) unlinkSync(clPath) } catch { /* ignore */ }
  }
}

// ── Submit the filled form ───────────────────────────────────────────────────
// Re-opens browser, re-fills all fields quickly, then clicks submit.

export async function* submitApply(
  jobUrl: string,
  mapping: FieldMapping[],
  cvText: string,
  coverLetter: string,
): AsyncGenerator<ExecuteEvent> {
  const { chromium } = await import('playwright')
  const { writeFileSync, unlinkSync, existsSync } = await import('fs')
  const { join } = await import('path')
  const { tmpdir } = await import('os')

  const ts = Date.now()
  const cvPath = join(tmpdir(), `jl_cv_submit_${ts}.txt`)
  const clPath = join(tmpdir(), `jl_cl_submit_${ts}.txt`)
  writeFileSync(cvPath, cvText || 'CV not provided', 'utf8')
  writeFileSync(clPath, coverLetter || 'Cover letter not provided', 'utf8')

  const browser = await chromium.launch({ headless: true })

  try {
    yield { type: 'log', message: 'Re-opening browser for submission…' }
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    })
    const page = await ctx.newPage()
    await page.goto(jobUrl, { waitUntil: 'networkidle', timeout: 40000 })
    await page.waitForTimeout(2500)
    yield { type: 'log', message: 'Re-filling fields…' }

    const fillable = mapping.filter(m => m.value && m.value.trim())
    for (const { field, value } of fillable) {
      try {
        if (field.type === 'file') {
          if (value === '__SKIP_FILE__') continue
          const filePath = value === '__CV_FILE__' ? cvPath : value === '__CL_FILE__' ? clPath : null
          if (filePath) await page.setInputFiles(field.selector, filePath).catch(async () => page.getByLabel(field.label, { exact: false }).setInputFiles(filePath))
        } else if (field.type === 'select') {
          await page.selectOption(field.selector, { label: value }).catch(() => page.selectOption(field.selector, value))
        } else if (field.type === 'checkbox') {
          const check = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes'
          if (check) await page.check(field.selector).catch(() => {})
          else await page.uncheck(field.selector).catch(() => {})
        } else {
          await page.fill(field.selector, value)
            .catch(() => page.getByLabel(field.label, { exact: false }).fill(value)
              .catch(() => field.placeholder ? page.getByPlaceholder(field.placeholder, { exact: false }).fill(value).catch(() => {}) : Promise.resolve())
            )
        }
      } catch { /* continue */ }
      await page.waitForTimeout(200)
    }

    yield { type: 'log', message: 'Clicking submit button…' }
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
    try { if (existsSync(cvPath)) unlinkSync(cvPath) } catch { /* ignore */ }
    try { if (existsSync(clPath)) unlinkSync(clPath) } catch { /* ignore */ }
  }
}
