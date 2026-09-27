import { launch } from './cdp.mjs'
const page = await launch({ width: 900, height: 1250 })
const base = 'file:///D:/Web%20Development/Poppy%20Pie/workflow-automation/Business-Orbit-User-Guide.pdf'
for (const n of [15, 16]) {
  await page.goto('about:blank', 250)
  await page.goto(`${base}#page=${n}&zoom=page-fit`, 2600)
  await page.shot(`pdfp-${n}`)
}
await page.close()
