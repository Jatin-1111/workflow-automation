import { launch } from './cdp.mjs'
const page = await launch({ width: 900, height: 1250 })
const base = 'file:///D:/Web%20Development/Poppy%20Pie/workflow-automation/Business-Orbit-User-Guide.pdf'
for (let n = 1; n <= 23; n += 1) {
  await page.goto('about:blank', 250)
  await page.goto(`${base}#page=${n}&zoom=page-fit`, 2400)
  await page.shot(`pdfp-${String(n).padStart(2, '0')}`)
}
await page.close()
