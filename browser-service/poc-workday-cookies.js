/**
 * POC: Workday login -> extract session cookies
 *
 * Usage (cmd):
 *   set WD_EMAIL=you@email.com
 *   set WD_PASS=yourpassword
 *   node poc-workday-cookies.js
 *
 * Output: workday-session.json
 */

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const EMAIL   = process.env.WD_EMAIL
const PASS    = process.env.WD_PASS

// Go directly to the Rolls-Royce Workday login page — skip the apply/create-account flow
const LOGIN_URL = 'https://rollsroyce.wd3.myworkdayjobs.com/en-US/rrpowersystems/login'
const JOB_URL   = 'https://rollsroyce.wd3.myworkdayjobs.com/en-US/rrpowersystems/job/Friedrichshafen/Product-Owner-Global-CRM--m-w-d-_JR6153981/apply/applyManually'

if (!EMAIL || !PASS) {
  console.error('Set WD_EMAIL and WD_PASS environment variables.')
  process.exit(1)
}

;(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 })
  const context = await browser.newContext()
  const page    = await context.newPage()

  // Go directly to login page
  console.log('Navigating to login page...')
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)
  console.log('URL:', page.url())

  // If redirected back to create account, look for the Sign In tab/link on that page
  const currentUrl = page.url()
  if (currentUrl.includes('createAccount') || currentUrl.includes('create-account')) {
    console.log('Landed on Create Account — looking for Sign In link...')
    const signInLink = page.locator('a:has-text("Sign In"), button:has-text("Sign In"), [data-automation-id="signIn"]').first()
    await signInLink.waitFor({ timeout: 5000 })
    await signInLink.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    console.log('URL after Sign In click:', page.url())
  }

  // Take a screenshot so we can see what page we're on
  await page.screenshot({ path: 'debug-login-page.png' })
  console.log('Screenshot saved: debug-login-page.png')

  // Fill email
  console.log('Filling email...')
  const emailField = page.locator('[data-automation-id="email"], input[type="email"], input[autocomplete="username"]').first()
  await emailField.waitFor({ timeout: 5000 })
  await emailField.fill(EMAIL)

  // Handle Next step if present (email-first flow)
  try {
    const next = page.locator('[data-automation-id="continue"], button:has-text("Next"), button:has-text("Continue")').first()
    if (await next.isVisible({ timeout: 2000 })) {
      console.log('Clicking Next...')
      await next.click()
      await page.waitForTimeout(2000)
    }
  } catch {}

  // Fill password
  console.log('Filling password...')
  const passField = page.locator('[data-automation-id="password"], input[type="password"]').first()
  await passField.waitFor({ timeout: 5000 })
  await passField.fill(PASS)

  // Take screenshot before submit
  await page.screenshot({ path: 'debug-before-submit.png' })
  console.log('Screenshot saved: debug-before-submit.png')

  // Submit
  console.log('Submitting...')
  const submit = page.locator('[data-automation-id="signIn"], button[type="submit"], button:has-text("Sign In")').first()
  await submit.waitFor({ timeout: 5000 })
  await submit.click()

  console.log('Waiting for post-login...')
  await page.waitForLoadState('networkidle', { timeout: 30000 })
  await page.waitForTimeout(3000)
  console.log('Post-login URL:', page.url())

  // Screenshot after login
  await page.screenshot({ path: 'debug-post-login.png' })
  console.log('Screenshot saved: debug-post-login.png')

  // Now navigate to the job apply page
  console.log('Navigating to job apply page...')
  await page.goto(JOB_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'debug-apply-page.png' })
  console.log('Apply page URL:', page.url())

  // Save session
  const storageState = await context.storageState()
  const outPath = path.join(__dirname, 'workday-session.json')
  fs.writeFileSync(outPath, JSON.stringify(storageState, null, 2))
  console.log(`\nSession saved to: ${outPath}`)

  console.log('\nCookies captured:')
  storageState.cookies.forEach(c => {
    console.log(`  ${c.name.padEnd(40)} domain=${c.domain}`)
  })

  console.log('\nBrowser stays open for 60s — confirm you are logged in.')
  await page.waitForTimeout(60000)
  await browser.close()
})()
