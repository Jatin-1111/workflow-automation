/** The administrator's occasional jobs, and reassignment. */
import { launch } from './cdp.mjs'
const page = await launch()
await page.login('nitin@businessorbit.in', 'Quibbling47!')

// Reassignment, on a task somebody else holds.
await page.goto('http://localhost:3000/tasks/BO-TSK-00006', 2800)
console.log('reassign opened:', await page.click('^Reassign$', 1600))
await page.shot('31-reassign', { fullPage: true })

// Set password / deactivate, on the people list.
await page.goto('http://localhost:3000/admin', 2800)
await page.shot('35-admin-people', { fullPage: true })

// Departments, teams and projects, lower down the same page.
await page.shot('36-admin-structure', { fullPage: true })

// Editing a published workflow makes the next version.
await page.goto('http://localhost:3000/workflows', 2600)
await page.shot('37-new-version', { fullPage: true })

await page.close()
console.log('done')
