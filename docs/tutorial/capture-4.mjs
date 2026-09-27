import { launch } from './cdp.mjs'
const page = await launch()
await page.login('nitin@businessorbit.in', 'Quibbling47!')
await page.goto('http://localhost:3000/admin', 2200)

/** Tick a role inside the form that belongs to one person, and save it. */
async function giveRole(userId, roleId) {
  const opened = await page.evaluate(`
    (() => {
      const form = Array.from(document.forms).find(f =>
        f.elements['userId'] && f.elements['userId'].value === ${JSON.stringify(userId)} &&
        f.querySelector('input[name=roleIds]'))
      if (!form) return 'no form'
      const details = form.closest('li, div')?.querySelector('details')
      if (details) details.open = true
      const box = form.querySelector('input[name=roleIds][value=' + JSON.stringify(${JSON.stringify(roleId)}) + ']')
      if (!box) return 'no checkbox'
      if (!box.checked) box.click()
      return 'ticked'
    })()
  `)
  await page.wait(600)
  const saved = await page.evaluate(`
    (() => {
      const form = Array.from(document.forms).find(f =>
        f.elements['userId'] && f.elements['userId'].value === ${JSON.stringify(userId)} &&
        f.querySelector('input[name=roleIds]'))
      const b = form && Array.from(form.querySelectorAll('button[type=submit]')).find(x => /save roles/i.test(x.textContent))
      if (!b) return 'no button'
      b.click(); return 'saved'
    })()
  `)
  await page.wait(2500)
  return `${opened}/${saved}`
}

console.log('Rohan  -> Content Writer:', await giveRole('BO-USR-00003', 'BO-ROL-00001'))
console.log('Meera  -> Editor:', await giveRole('BO-USR-00002', 'BO-ROL-00002'))

await page.goto('http://localhost:3000/admin', 2200)
await page.evaluate(`Array.from(document.querySelectorAll('details')).forEach(d => d.open = true); true`)
await page.wait(600)
await page.shot('10-roles-assigned', { fullPage: true })

const summary = await page.evaluate(`
  JSON.stringify(Array.from(document.querySelectorAll('summary, [class*=roles]'))
    .map(e => e.textContent.trim()).filter(t => /role/i.test(t)).slice(0, 6))
`)
console.log(summary)
await page.close()
