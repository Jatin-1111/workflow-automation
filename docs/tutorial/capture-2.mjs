import { launch } from './cdp.mjs'
const page = await launch()
await page.login('nitin@businessorbit.in', 'Quibbling47!')

await page.goto('http://localhost:3000/admin', 2200)

// --- Step 1: add the people -------------------------------------------
await page.click('Add a person', 1200)
console.log('person form:', await page.fill({
  name: 'Meera Nair',
  email: 'meera@businessorbit.in',
  password: 'Quibbling47!',
  phone: '+91 98200 11223',
  joiningDate: '2026-01-05',
}))
await page.evaluate(`
  (() => {
    const s = Array.from(document.querySelectorAll('select')).find(x => x.name === 'accessLevel')
    if (s) {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, 'manager')
      s.dispatchEvent(new Event('change', { bubbles: true }))
    }
    return true
  })()
`)
await page.wait(500)
await page.shot('06-add-person', { fullPage: true })

await page.click('^Add person$', 2600)
console.log('after add 1:', await page.evaluate(`document.body.innerText.includes('Meera Nair')`))

// A second person, an ordinary employee.
await page.click('Add a person', 1200)
await page.fill({
  name: 'Rohan Das',
  email: 'rohan@businessorbit.in',
  password: 'Quibbling47!',
})
await page.click('^Add person$', 2600)
console.log('after add 2:', await page.evaluate(`document.body.innerText.includes('Rohan Das')`))

await page.shot('07-people', { fullPage: true })
await page.close()
console.log('done')
