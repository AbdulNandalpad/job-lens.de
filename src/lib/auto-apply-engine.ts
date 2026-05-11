import Anthropic from '@anthropic-ai/sdk'

export interface DetectedField {
  label: string
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'file' | 'checkbox' | 'radio' | 'date' | 'number' | 'url'
  required: boolean
  selector: string
  placeholder?: string
  options?: string[]
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
  | { type: 'submitting' }
  | { type: 'done'; confirmB64: string; message: string }
  | { type: 'error'; message: string; b64?: string }

// ─── helpers ────────────────────────────────────────────────────────────────

function parseJson<T>(text: string, fallback: T): T {
  try {
    const arr = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)
    return arr ? (JSON.parse(arr[0]) as T) : fallback
  } catch {
    return fallback
  }
}

async function grabFieldsFromDom(page: import('playwright').Page): Promise<DetectedField[]> {
  return page.evaluate(() => {
    const results: Array<{
      label: string; type: string; required: boolean;
      selector: string; placeholder: string; options: string[] | undefined
    }> = []

    const els = Array.from(document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea'
    )) as HTMLInputElement[]

    for (const el of els) {
      const id = el.id
      const name = el.name
      const type = el.type || el.tagName.toLowerCase()
      const placeholder = el.placeholder || ''
      const required = el.required || el.getAttribute('aria-required') === 'true'

      // Derive label text
      let label = ''
      if (id) {
        const lbl = document.querySelector(`label[for="${id}"]`)
        if (lbl) label = (lbl.textContent || '').trim().replace(/\s*\*\s*$/, '').trim()
      }
      if (!label) {
        const ariaLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')
        if (ariaLabel) {
          const lblEl = document.getElementById(ariaLabel)
          label = lblEl ? (lblEl.textContent || '').trim() : ariaLabel
        }
      }
      if (!label) {
        const parent = el.closest('label, .form-group, .field, [class*="field"], [class*="input"]')
        if (parent) {
          const lbl = parent.querySelector('label, .label, [class*="label"]')
          if (lbl && lbl !== el) label = (lbl.textContent || '').trim().replace(/\s*\*\s*$/, '').trim()
        }
      }
      if (!label) label = placeholder || name || id || type

      // Build the most reliable selector
      let selector = ''
      if (id) selector = `#${id}`
      else if (name) selector = `[name="${name}"]`
      else if (placeholder) selector = `${el.tagName.toLowerCase()}[placeholder="${placeholder}"]`
      else selector = el.tagName.toLowerCase()

      const options = el.tagName === 'SELECT'
        ? Array.from((el as unknown as HTMLSelectElement).options).map(o => o.text.trim()).filter(Boolean)
        : undefined

      if (label && selector) {
        results.push({ label, type, required, selector, placeholder, options })
      }
    }

    // De-duplicate by selector
    const seen = new Set<string>()
    return results.filter(f => {
      if (seen.has(f.selector)) return false
      seen.add(f.selector)
      return true
    })
  }) as Promise<DetectedField[]>
}

async function mapCvToFields(
  fields: DetectedField[],
  cvText: string,
  coverLetter: string | undefined,
  anthropic: Anthropic
): Promise<Array<{ label: string; value: string; confidence: 'high' | 'medium' | 'low'; notes?: string }>> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are filling in a job application form on behalf of a candidate. Map each form field to the correct value from the CV.

FORM FIELDS:
${JSON.stringify(fields.map(f => ({ label: f.label, type: f.type, required: f.required, options: f.options })), null, 2)}

CANDIDATE CV:
${cvText.slice(0, 3500)}
${coverLetter ? `\nCOVER LETTER (use for cover letter / motivation fields):\n${coverLetter.slice(0, 800)}` : ''}

Return ONLY a JSON array — no explanation, no markdown:
[
  { "label": "First Name", "value": "Maria", "confidence": "high", "notes": "from CV header" },
  { "label": "Cover Letter", "value": "Dear Hiring Manager...", "confidence": "high" }
]

Rules:
- For CV / resume file upload fields: set value to "__CV_FILE__"
- For cover letter file upload fields: set value to "__CL_FILE__"
- For any other file upload fields (portfolio, certificates, etc.): set value to "__SKIP_FILE__"
- For select fields: pick the closest matching option text from the options list
- For checkbox fields: set value to "true" or "false"
- Leave value as "" if genuinely unknown (confidence: "low")
- confidence: "high" = exact data found | "medium" = reasonable inference | "low" = guess`
    }],
  })

  return parseJson<Array<{ label: string; value: string; confidence: 'high' | 'medium' | 'low'; notes?: string }>>(
    (msg.content[0] as { text: string }).text,
    []
  )
}

// ─── public API ─────────────────────────────────────────────────────────────

export async function analyzeForm(
  jobUrl: string,
  cvText: string,
  coverLetter: string | undefined,
  anthropic: Anthropic
): Promise<AnalyzeResult> {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    })
    const page = await ctx.newPage()

    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    // Extra wait for JS-rendered forms (Workday, Greenhouse, etc.)
    await page.waitForTimeout(3000)

    const pageTitle = await page.title()
    const screenshotB64 = (await page.screenshot({ fullPage: false })).toString('base64')

    // Detect ATS type from URL / page source
    const url = page.url()
    let formType = 'direct'
    if (url.includes('myworkday') || url.includes('workday.com')) formType = 'Workday'
    else if (url.includes('greenhouse.io')) formType = 'Greenhouse'
    else if (url.includes('lever.co')) formType = 'Lever'
    else if (url.includes('smartrecruiters.com')) formType = 'SmartRecruiters'
    else if (url.includes('recruitee.com')) formType = 'Recruitee'
    else if (url.includes('personio.de') || url.includes('personio.com')) formType = 'Personio'

    // Try DOM extraction first
    let fields = await grabFieldsFromDom(page)

    // Fallback: Claude vision if DOM extraction found nothing
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
{
  "hasForm": true,
  "fields": [
    { "label": "First Name", "type": "text", "required": true, "selector": "input[name='firstName']", "placeholder": "" }
  ]
}
If no form is visible, return { "hasForm": false, "fields": [] }`,
            },
          ],
        }],
      })

      const vd = parseJson<{ hasForm: boolean; fields: DetectedField[] }>(
        (visionMsg.content[0] as { text: string }).text,
        { hasForm: false, fields: [] }
      )
      fields = vd.fields
    }

    if (fields.length === 0) {
      return {
        formType,
        pageTitle,
        hasForm: false,
        fields: [],
        mapping: [],
        screenshotB64,
        error:
          'No application form fields detected. The page may load the form dynamically after login, or the URL may be a job listing rather than the application itself.',
      }
    }

    // Map CV to fields
    const rawMapping = await mapCvToFields(fields, cvText, coverLetter, anthropic)

    const mapping: FieldMapping[] = fields.map(field => {
      const match = rawMapping.find(
        m => m.label.toLowerCase().trim() === field.label.toLowerCase().trim()
      )
      return {
        field,
        value: match?.value ?? '',
        confidence: match?.confidence ?? 'low',
        notes: match?.notes,
      }
    })

    return { formType, pageTitle, hasForm: true, fields, mapping, screenshotB64 }
  } finally {
    await browser.close()
  }
}

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

  // Write CV and cover letter to temp files so Playwright can attach them
  const ts = Date.now()
  const cvPath = join(tmpdir(), `jl_cv_${ts}.txt`)
  const clPath = join(tmpdir(), `jl_cl_${ts}.txt`)
  writeFileSync(cvPath, cvText || 'CV not provided', 'utf8')
  writeFileSync(clPath, coverLetter || 'Cover letter not provided', 'utf8')

  const isLocal = process.env.NODE_ENV === 'development'
  const browser = await chromium.launch({ headless: !isLocal })

  try {
    yield { type: 'log', message: `Browser launched (${isLocal ? 'visible' : 'headless'} mode)` }

    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    })
    const page = await ctx.newPage()

    yield { type: 'log', message: 'Navigating to application page...' }
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2500)

    const loadScreenshot = (await page.screenshot({ fullPage: false })).toString('base64')
    yield { type: 'screenshot', message: 'Page loaded', b64: loadScreenshot }

    const fillable = mapping.filter(m => m.value && m.value.trim())
    yield { type: 'log', message: `Filling ${fillable.length} of ${mapping.length} fields...` }

    for (let i = 0; i < fillable.length; i++) {
      const { field, value } = fillable[i]
      yield { type: 'filling', label: field.label, value: value.startsWith('__') ? `[file: ${value}]` : value, index: i + 1, total: fillable.length }

      let success = false
      try {
        // ── File upload fields ──────────────────────────────────────────
        if (field.type === 'file') {
          if (value === '__SKIP_FILE__') {
            yield { type: 'filled', label: field.label, success: false }
            continue
          }
          const filePath = value === '__CV_FILE__' ? cvPath : value === '__CL_FILE__' ? clPath : null
          if (filePath) {
            await page.setInputFiles(field.selector, filePath)
              .catch(async () => {
                const byLabel = page.getByLabel(field.label, { exact: false })
                await byLabel.setInputFiles(filePath)
              })
            success = true
          }
        } else if (field.type === 'select') {
          // Try matching by visible text, then by value
          await page
            .selectOption(field.selector, { label: value })
            .catch(() => page.selectOption(field.selector, value))
          success = true
        } else if (field.type === 'checkbox') {
          const check = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes'
          if (check) {
            await page.check(field.selector).catch(() => {})
          } else {
            await page.uncheck(field.selector).catch(() => {})
          }
          success = true
        } else {
          // text / email / tel / textarea / date / number / url
          const filled = await page
            .fill(field.selector, value)
            .then(() => true)
            .catch(async () => {
              // Fallback 1: aria-label
              const byLabel = page.getByLabel(field.label, { exact: false })
              return byLabel
                .fill(value)
                .then(() => true)
                .catch(async () => {
                  // Fallback 2: placeholder
                  if (field.placeholder) {
                    return page
                      .getByPlaceholder(field.placeholder, { exact: false })
                      .fill(value)
                      .then(() => true)
                      .catch(() => false)
                  }
                  return false
                })
            })
          success = filled
        }
      } catch {
        success = false
      }

      yield { type: 'filled', label: field.label, success }
      await page.waitForTimeout(400)
    }

    // Screenshot after filling
    const filledShot = (await page.screenshot({ fullPage: false })).toString('base64')
    yield { type: 'screenshot', message: 'All fields filled — review before submitting', b64: filledShot }

    yield { type: 'submitting' }

    // Try common submit button patterns
    const submitted = await page
      .getByRole('button', { name: /submit application|apply now|send application|submit/i })
      .first()
      .click({ timeout: 5000 })
      .then(() => true)
      .catch(() => false)

    if (!submitted) {
      // Fallback: evaluate click
      await page.evaluate(() => {
        const btn = document.querySelector(
          'button[type="submit"], input[type="submit"]'
        ) as HTMLElement | null
        if (btn) btn.click()
      })
    }

    await page.waitForTimeout(4000)
    const confirmShot = (await page.screenshot({ fullPage: false })).toString('base64')
    yield {
      type: 'done',
      confirmB64: confirmShot,
      message: 'Form submitted. Check the screenshot to confirm success.',
    }
  } catch (err) {
    yield { type: 'error', message: String(err) }
  } finally {
    await browser.close()
    // Clean up temp files
    try { if (existsSync(cvPath)) unlinkSync(cvPath) } catch { /* ignore */ }
    try { if (existsSync(clPath)) unlinkSync(clPath) } catch { /* ignore */ }
  }
}