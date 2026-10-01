import { launch } from './cdp.mjs'
const page = await launch({ width: 900, height: 1250 })
const base = 'file:///D:/Web%20Development/Poppy%20Pie/workflow-automation/Business-Orbit-User-Guide.pdf'
const total = Number(process.argv[2] || 22)
for (let n = 1; n <= total; n += 1) {
  await page.goto('about:blank', 250)
  await page.goto(`${base}#page=${n}&zoom=page-fit`, 2300)
  await page.shot(`pdfp-${String(n).padStart(2, '0')}`)
}
await page.close()
