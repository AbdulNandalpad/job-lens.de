/**
 * POC: Workday login → extract session cookies
 *
 * Usage:
 *   WD_EMAIL=you@email.com WD_PASS='YourPass' WD_URL='https://...' node poc-workday-cookies.js
 *
 * Output: workday-session.json  (cookies + localStorage — load with storageState)
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
  const browser = await chromium.launch({ headless: false, slowMo: 100 })
  const context = await browser.newContext()
  const page    = await context.newPage()

  console.log('Opening job page…')
  await page.goto(JOB_URL, { waitUntil: 'domcontentloaded' })

  // Look for "Sign In" link — Workday shows this before the apply form
  try {
    const signIn = page.locator('text=Sign In').first()
    if (await signIn.isVisible({ timeout: 5000 })) {
      console.log('Clicking Sign In…')
      await signIn.click()
      await page.waitForLoadState('networkidle')
    }
  } catch { /* already on login page */ }

  // Fill email
  console.log('Filling credentials…')
  await page.fill('input[type="email"], input[autocomplete="username"], input[name*="email" i]', EMAIL)

  // Some Workday instances have a "Next" step before password
  try {
    const next = page.locator('button:has-text("Next"), button:has-text("Continue")').first()
    if (await next.isVisible({ timeout: 3000 })) {
      await next.click()
      await page.waitForTimeout(1500)
    }
  } catch { /* single-page login */ }

  // Fill password
  await page.fill('input[type="password"]', PASS)

  // Submit
  const submit = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")').first()
  await submit.click()

  console.log('Waiting for post-login state…')
  await page.waitForLoadState('networkidle', { timeout: 30000 })
  await page.waitForTimeout(2000)

  // Dump cookies + storage state
  const storageState = await context.storageState()
  const outPath = path.join(__dirname, 'workday-session.json')
  fs.writeFileSync(outPath, JSON.stringify(storageState, null, 2))
  console.log(`\nSession saved to: ${outPath}`)

  // Print cookies summary (no values in console — just names + domains)
  console.log('\nCookies captured:')
  storageState.cookies.forEach(c => {
    console.log(`  ${c.name.padEnd(35)} domain=${c.domain}  httpOnly=${c.httpOnly}  secure=${c.secure}`)
  })

  console.log('\nFull session (with values) is in workday-session.json — do not commit this file.')
  console.log('\nBrowser stays open for 30s so you can inspect the page state…')
  await page.waitForTimeout(30000)

  await browser.close()
})()
