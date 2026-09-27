import { launch } from './cdp.mjs'
const page = await launch()

// --- The employee, before anything has been sent to them --------------
await page.login('rohan@businessorbit.in', 'Quibbling47!')
await page.goto('http://localhost:3000/my-work', 2500)
await page.shot('14-employee-empty', { fullPage: true })
console.log('employee nav:', await page.evaluate(`
  JSON.stringify(Array.from(document.querySelectorAll('nav a')).map(a => a.textContent.trim()))
`))

// --- Raising a piece of work ------------------------------------------
await page.click('Start a workflow', 1500)
await page.fill({ title: 'How we choose a CRM' })
await page.wait(500)
await page.shot('15-start-a-workflow', { fullPage: true })

await page.click('Start it', 3200)
console.log('landed on:', await page.evaluate('location.pathname'))
await page.shot('16-the-task', { fullPage: true })
await page.close()
