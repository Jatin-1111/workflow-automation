import { launch } from './cdp.mjs'
const page = await launch()

// 01 — the sign-in page, signed out.
await page.goto('http://localhost:3000/login', 1800)
await page.shot('01-sign-in')

await page.login('nitin@businessorbit.in', 'Quibbling47!')

// 02 — what the founder sees first, on an organisation of one.
await page.goto('http://localhost:3000/my-work', 2200)
await page.shot('02-first-look', { fullPage: true })

// 03 — the setup checklist, opened.
const opened = await page.evaluate(`
  (() => {
    const d = document.querySelector('details')
    if (d) { d.open = true; return 'details' }
    const b = Array.from(document.querySelectorAll('button,summary'))
      .find(x => /getting started/i.test(x.textContent))
    if (b) { b.click(); return 'button' }
    return 'none'
  })()
`)
await page.wait(900)
await page.shot('03-getting-started', { fullPage: true })
console.log('checklist opened via:', opened)

// 04 — Admin, before anything exists.
await page.goto('http://localhost:3000/admin', 2200)
await page.shot('04-admin-empty', { fullPage: true })

// 05 — Workflows, before anything exists.
await page.goto('http://localhost:3000/workflows', 2000)
await page.shot('05-workflows-empty', { fullPage: true })

await page.close()
console.log('done')
