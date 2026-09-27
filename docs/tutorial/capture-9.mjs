import { launch } from './cdp.mjs'
const page = await launch()
await page.login('meera@businessorbit.in', 'Quibbling47!')

// Approve it, so the manager views have a finished stage to report on.
await page.goto('http://localhost:3000/tasks/BO-TSK-00002', 2800)
await page.evaluate(`
  (() => {
    document.querySelectorAll('input[type=checkbox][name^="check:"]').forEach(b => { if (!b.checked) b.click() })
    return true
  })()
`)
await page.wait(700)
const approved = await page.click('^Approve', 3200)
console.log('approved:', approved, '->', await page.evaluate(`
  JSON.stringify(Array.from(document.querySelectorAll('[role=alert],[role=status]')).map(e=>e.innerText).filter(Boolean))
`))

// --- The manager's oversight -----------------------------------------
await page.goto('http://localhost:3000/dashboard', 3000)
await page.shot('22-overview', { fullPage: true })

await page.goto('http://localhost:3000/board', 3000)
await page.shot('23-board', { fullPage: true })

await page.goto('http://localhost:3000/team', 2800)
await page.shot('24-team', { fullPage: true })

await page.goto('http://localhost:3000/projects', 2800)
await page.shot('25-projects', { fullPage: true })

await page.goto('http://localhost:3000/reports', 2800)
await page.shot('26-reports', { fullPage: true })

await page.close()
