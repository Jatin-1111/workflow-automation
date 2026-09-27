import { launch } from './cdp.mjs'
const page = await launch()
await page.login('nitin@businessorbit.in', 'Quibbling47!')
await page.goto('http://localhost:3000/admin', 2200)

/** Fill the form whose submit button reads `label`. Several forms here share field names. */
async function fillFormWithButton(label, fields) {
  return page.evaluate(`
    (() => {
      const re = new RegExp(${JSON.stringify(label)}, 'i')
      const form = Array.from(document.forms).find(f =>
        Array.from(f.querySelectorAll('button[type=submit]')).some(b => re.test(b.textContent.trim())))
      if (!form) return 'form not found'
      for (const [name, value] of Object.entries(${JSON.stringify(fields)})) {
        const el = form.elements[name]
        if (!el) return 'missing ' + name
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }
      return 'ok'
    })()
  `)
}

async function submitFormWithButton(label, settle = 2500) {
  const ok = await page.evaluate(`
    (() => {
      const re = new RegExp(${JSON.stringify(label)}, 'i')
      const b = Array.from(document.querySelectorAll('button[type=submit]')).find(x => re.test(x.textContent.trim()))
      if (!b) return false
      b.click(); return true
    })()
  `)
  await page.wait(settle)
  return ok
}

// --- Step 2: the roles work is assigned to ----------------------------
console.log('role form:', await fillFormWithButton('^Add role$', {
  name: 'Content Writer',
  description: 'Writes the first draft',
}))
await page.shot('08-add-role', { fullPage: true })
await submitFormWithButton('^Add role$')

await fillFormWithButton('^Add role$', { name: 'Editor', description: 'Reviews and approves' })
await submitFormWithButton('^Add role$')

// A project, so work can be grouped by initiative.
await page.click('Add a project', 1200)
await fillFormWithButton('^Add project$', {
  name: 'Website Content',
  description: 'Everything published on the site',
})
await submitFormWithButton('^Add project$')

const state = await page.evaluate(`
  JSON.stringify({
    roles: Array.from(document.querySelectorAll('input[name=roleIds]')).map(e => e.value),
    hasWriter: document.body.innerText.includes('Content Writer'),
    hasEditor: document.body.innerText.includes('Editor'),
    hasProject: document.body.innerText.includes('Website Content'),
  })
`)
console.log('after roles:', state)
await page.shot('09-roles-created', { fullPage: true })
await page.close()
