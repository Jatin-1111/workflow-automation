/** The screens the first draft of the guide left out. */
import { launch } from './cdp.mjs'
const page = await launch()

// ---------- Manager / everyday screens ----------
await page.login('meera@businessorbit.in', 'Quibbling47!')

await page.goto('http://localhost:3000/notifications', 2600)
await page.shot('28-notifications', { fullPage: true })

await page.goto('http://localhost:3000/profile', 2600)
await page.click('Change my password', 1400)
await page.shot('29-profile', { fullPage: true })

// The approval, scrolled to the decision itself.
await page.goto('http://localhost:3000/tasks/BO-TSK-00005', 2800)
await page.evaluate(`
  (() => {
    document.querySelectorAll('input[type=checkbox][name^="check:"]').forEach(b => { if (!b.checked) b.click() })
    return true
  })()
`)
await page.wait(800)
await page.shot('30-approve-or-send-back', { fullPage: true })

// Reassignment, on a task somebody else holds.
await page.goto('http://localhost:3000/tasks/BO-TSK-00006', 2800)
const reassign = await page.click('^Reassign$', 1600)
console.log('reassign panel opened:', reassign)
await page.shot('31-reassign', { fullPage: true })

await page.goto('http://localhost:3000/search?q=CRM', 2600)
await page.shot('32-search', { fullPage: true })

await page.goto('http://localhost:3000/projects/BO-PRJ-00001', 2600)
await page.shot('33-project', { fullPage: true })

await page.goto('http://localhost:3000/help', 2600)
await page.shot('34-help', { fullPage: true })

await page.close()
console.log('done')
