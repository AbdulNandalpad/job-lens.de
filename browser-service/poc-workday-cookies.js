/**
 * POC: Workday cookie capture — manual login approach
 *
 * Opens a real browser, navigates to the job apply page.
 * YOU log in manually. Script waits, then captures all cookies.
 *
 * Usage (cmd):
 *   node poc-workday-cookies.js
 *
 * Output: workday-session.json
 */

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const JOB_URL = 'https://rollsroyce.wd3.myworkdayjobs.com/en-US/rrpowersystems/job/Friedrichshafen/Product-Owner-Global-CRM--m-w-d-_JR6153981/apply/applyManually'

function waitForEnter(prompt) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(prompt, () => { rl.close(); resolve() })
  })
}

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page    = await context.newPage()

  console.log('Opening Workday job page...')
  await page.goto(JOB_URL, { waitUntil: 'domcontentloaded' })

  console.log('\n========================================================')
  console.log('  Browser is open.')
  console.log('  1. Accept cookies if prompted')
  console.log('  2. Click Sign In (not Create Account)')
  console.log('  3. Log in with your credentials')
  console.log('  4. Once you are logged in and can see the apply form,')
  console.log('     come back here and press ENTER')
  console.log('========================================================\n')

  await waitForEnter('Press ENTER once you are logged in...')

  console.log('Capturing session...')
  const storageState = await context.storageState()
  const outPath = path.join(__dirname, 'workday-session.json')
  fs.writeFileSync(outPath, JSON.stringify(storageState, null, 2))

  console.log(`\nSession saved to: ${outPath}`)
  console.log(`Total cookies: ${storageState.cookies.length}`)
  console.log('\nCookies captured:')
  storageState.cookies.forEach(c => {
    console.log(`  ${c.name.padEnd(40)} domain=${c.domain}  expires=${c.expires > 0 ? new Date(c.expires * 1000).toISOString() : 'session'}`)
  })

  console.log('\nDone. You can close the browser.')
  await page.waitForTimeout(5000)
  await browser.close()
})()
