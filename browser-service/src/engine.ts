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
  anthropic: Anthropic,
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
${coverLetter ? `\nCOVER LETTER:\n${coverLetter.slice(0, 800)}` : ''}

Return ONLY a JSON array:
[
  { "label": "First Name", "value": "Maria", "confidence": "high" }
]

Rules:
- CV/resume file: value "__CV_FILE__"
- Cover letter file: value "__CL_FILE__"
- Other file fields: value "__SKIP_FILE__"
- Select fields: pick closest matching option text
- Checkbox: "true" or "false"
- Unknown: value "" confidence "low"`,
    }],
  })

  return parseJson<Array<{ label: string; value: string; confidence: 'high' | 'medium' | 'low'; notes?: string }>>(
    (msg.content[0] as { text: string }).text,
    [],
  )
}

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

    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
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
{"hasForm":true,"fields":[{"label":"First Name","type":"text","required":true,"selector":"input[name='firstName']","placeholder":""}]}
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

    const mapping: FieldMapping[] = fields.map(field => {
      const match = rawMapping.find(m => m.label.toLowerCase().trim() === field.label.toLowerCase().trim())
      return { field, value: match?.value ?? '', confidence: match?.confidence ?? 'low', notes: match?.notes }
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

  const ts = Date.now()
  const cvPath = join(tmpdir(), `jl_cv_${ts}.txt`)
  const clPath = join(tmpdir(), `jl_cl_${ts}.txt`)
  writeFileSync(cvPath, cvText || 'CV not provided', 'utf8')
  writeFileSync(clPath, coverLetter || 'Cover letter not provided', 'utf8')

  const browser = await chromium.launch({ headless: true })

  try {
    yield { type: 'log', message: 'Browser launched (headless mode)' }

    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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
        if (field.type === 'file') {
          if (value === '__SKIP_FILE__') { yield { type: 'filled', label: field.label, success: false }; continue }
          const filePath = value === '__CV_FILE__' ? cvPath : value === '__CL_FILE__' ? clPath : null
          if (filePath) {
            await page.setInputFiles(field.selector, filePath)
              .catch(async () => { await page.getByLabel(field.label, { exact: false }).setInputFiles(filePath) })
            success = true
          }
        } else if (field.type === 'select') {
          await page.selectOption(field.selector, { label: value }).catch(() => page.selectOption(field.selector, value))
          success = true
        } else if (field.type === 'checkbox') {
          const check = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes'
          if (check) await page.check(field.selector).catch(() => {})
          else await page.uncheck(field.selector).catch(() => {})
          success = true
        } else {
          success = await page.fill(field.selector, value).then(() => true)
            .catch(async () => page.getByLabel(field.label, { exact: false }).fill(value).then(() => true)
              .catch(async () => field.placeholder
                ? page.getByPlaceholder(field.placeholder, { exact: false }).fill(value).then(() => true).catch(() => false)
                : false
              )
            )
        }
      } catch { success = false }

      yield { type: 'filled', label: field.label, success }
      await page.waitForTimeout(400)
    }

    const filledShot = (await page.screenshot({ fullPage: false })).toString('base64')
    yield { type: 'screenshot', message: 'All fields filled — review before submitting', b64: filledShot }
    yield { type: 'submitting' }

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
    yield { type: 'done', confirmB64: confirmShot, message: 'Form submitted. Check the screenshot to confirm success.' }
  } catch (err) {
    yield { type: 'error', message: String(err) }
  } finally {
    await browser.close()
    try { if (existsSync(cvPath)) unlinkSync(cvPath) } catch { /* ignore */ }
    try { if (existsSync(clPath)) unlinkSync(clPath) } catch { /* ignore */ }
  }
}
