import { launch } from './cdp.mjs'
const page = await launch()
await page.login('nitin@businessorbit.in', 'Quibbling47!')

// 11 — the Workflows list, with one draft on it.
await page.goto('http://localhost:3000/workflows', 2200)
await page.shot('11-workflows-list', { fullPage: true })

// 12 — the builder, with the process laid out.
await page.goto('http://localhost:3000/workflows/BO-WFL-00001/1', 3000)
await page.shot('12-builder', { fullPage: true })

// 13 — publishing it.
const published = await page.click('Publish version', 3000)
console.log('publish clicked:', published)
await page.shot('13-published', { fullPage: true })
console.log('status text:', await page.evaluate(`
  JSON.stringify(Array.from(document.querySelectorAll('[role=status]')).map(e => e.innerText).filter(Boolean))
`))
await page.close()
