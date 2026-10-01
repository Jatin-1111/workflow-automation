/** The people list again, now that it carries Delete. */
import { launch } from './cdp.mjs'
const page = await launch()
await page.login('nitin@businessorbit.in', 'Quibbling47!')
await page.goto('http://localhost:3000/admin', 3200)
console.log('rows:', await page.evaluate(`
  JSON.stringify(Array.from(document.forms)
    .filter(f => f.elements['status'] && f.elements['userId'])
    .map(f => {
      const li = f.closest('li')
      const buttons = Array.from(li.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => /password|activate|Delete/i.test(t))
      return li.querySelector('p').textContent.trim().split(' ')[0] + ': ' + buttons.join(' | ')
    }))
`))
await page.shot('35-admin-people', { fullPage: true })
await page.shot('36-admin-structure', { fullPage: true })
await page.close()
