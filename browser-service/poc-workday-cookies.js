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

  // Navigate to login page (Workday lands on Create Account — Sign In link is at the bottom)
  console.log('Navigating to login page...')
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)
  console.log('URL:', page.url())

  await page.screenshot({ path: 'debug-login-page.png' })
  console.log('Screenshot saved: debug-login-page.png')

  // Click "Already have an account? Sign In" link
  console.log('Clicking Sign In link...')
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a, button'))
    const signIn = links.find(el => el.textContent.trim() === 'Sign In')
    if (signIn) signIn.click()
    else throw new Error('Sign In link not found')
  })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  console.log('URL after Sign In click:', page.url())
  await page.screenshot({ path: 'debug-signin-page.png' })
  console.log('Screenshot saved: debug-signin-page.png')

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

  // Submit — aria-hidden blocks Playwright click, use JS directly
  console.log('Submitting...')
  await page.evaluate(() => {
    const btn = document.querySelector('[data-automation-id="auth_signin_link"]')
    if (btn) btn.click()
    else throw new Error('Submit button not found in DOM')
  })

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
