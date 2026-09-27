import { launch } from './cdp.mjs'
const page = await launch()
await page.login('meera@businessorbit.in', 'Quibbling47!')

// 19 — the editor's My Work, with the review waiting.
await page.goto('http://localhost:3000/my-work', 2800)
await page.shot('19-manager-my-work', { fullPage: true })

const link = await page.evaluate(`
  (() => {
    const a = Array.from(document.querySelectorAll('a')).find(x => (x.getAttribute('href') || '').indexOf('/tasks/') === 0)
    return a ? a.getAttribute('href') : null
  })()
`)
console.log('task link:', link)

// 20 — the approval itself.
await page.goto('http://localhost:3000' + link, 2800)
await page.shot('20-approval', { fullPage: true })

// Tick the checklist so the approve button is live, then capture it ready.
await page.evaluate(`
  (() => {
    document.querySelectorAll('input[type=checkbox][name^="check:"]').forEach(b => { if (!b.checked) b.click() })
    return true
  })()
`)
await page.wait(800)
await page.shot('21-approval-ready', { fullPage: true })
await page.close()
