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
const JOB_URL = process.env.WD_URL || 'https://rollsroyce.wd3.myworkdayjobs.com/en-US/rrpowersystems/job/Friedrichshafen/Product-Owner-Global-CRM--m-w-d-_JR6153981/apply/applyManually'

if (!EMAIL || !PASS) {
  console.error('Set WD_EMAIL and WD_PASS environment variables.')
  process.exit(1)
}

;(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 })
  const context = await browser.newContext()
  const page    = await context.newPage()

  console.log('Opening job page...')
  await page.goto(JOB_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)

  // Workday shows "Create Account" page with a "Sign In" link at the top
  // We need to click "Sign In" to get to the login form
  console.log('Looking for Sign In link...')
  const signInSelectors = [
    'a:has-text("Sign In")',
    'button:has-text("Sign In")',
    '[data-automation-id="signIn"]',
    'a[href*="login"]',
    'text=Already have an account',
  ]

  let clicked = false
  for (const sel of signInSelectors) {
    try {
      const el = page.locator(sel).first()
      if (await el.isVisible({ timeout: 2000 })) {
        console.log(`Clicking: ${sel}`)
        await el.click()
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)
        clicked = true
        break
      }
    } catch {}
  }

  if (!clicked) {
    console.log('No Sign In link found — may already be on login form')
  }

  // Fill email
  console.log('Filling email...')
  const emailSelectors = [
    '[data-automation-id="email"]',
    'input[type="email"]',
    'input[autocomplete="username"]',
    'input[name*="email" i]',
    'input[placeholder*="email" i]',
  ]

  for (const sel of emailSelectors) {
    try {
      const el = page.locator(sel).first()
      if (await el.isVisible({ timeout: 2000 })) {
        await el.fill(EMAIL)
        console.log(`Email filled via: ${sel}`)
        break
      }
    } catch {}
  }

  // Some Workday flows: email -> Next -> password
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
  const passSelectors = [
    '[data-automation-id="password"]',
    'input[type="password"]',
    'input[name*="password" i]',
  ]

  for (const sel of passSelectors) {
    try {
      const el = page.locator(sel).first()
      if (await el.isVisible({ timeout: 2000 })) {
        await el.fill(PASS)
        console.log(`Password filled via: ${sel}`)
        break
      }
    } catch {}
  }

  // Submit login
  console.log('Submitting...')
  const submitSelectors = [
    '[data-automation-id="click_filter"]',
    '[data-automation-id="signIn"]',
    'button[type="submit"]',
    'button:has-text("Sign In")',
    'button:has-text("Log In")',
  ]

  for (const sel of submitSelectors) {
    try {
      const el = page.locator(sel).first()
      if (await el.isVisible({ timeout: 2000 })) {
        console.log(`Submitting via: ${sel}`)
        await el.click()
        break
      }
    } catch {}
  }

  console.log('Waiting for post-login...')
  await page.waitForLoadState('networkidle', { timeout: 30000 })
  await page.waitForTimeout(3000)

  console.log('Current URL:', page.url())

  // Save session
  const storageState = await context.storageState()
  const outPath = path.join(__dirname, 'workday-session.json')
  fs.writeFileSync(outPath, JSON.stringify(storageState, null, 2))
  console.log(`\nSession saved to: ${outPath}`)

  console.log('\nCookies captured:')
  storageState.cookies.forEach(c => {
    console.log(`  ${c.name.padEnd(40)} domain=${c.domain}`)
  })

  console.log('\nBrowser stays open for 60s — inspect the page to confirm login worked.')
  await page.waitForTimeout(60000)
  await browser.close()
})()
