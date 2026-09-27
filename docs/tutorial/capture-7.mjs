import { launch } from './cdp.mjs'
const page = await launch()

async function logout() {
  await page.goto('http://localhost:3000/my-work', 1800)
  await page.click('Sign out', 2200)
}

// --- The writer finishes the draft ------------------------------------
await page.login('rohan@businessorbit.in', 'Quibbling47!')
await page.goto('http://localhost:3000/tasks/BO-TSK-00001', 2500)
await page.fill({
  'field:headline': 'How we choose a CRM',
  'field:draft': 'A short guide to picking a CRM without regretting it six months later. We compare three options against what a small team actually needs, and explain the one question that matters most.',
  'field:publish_by': '2026-10-15',
})
await page.wait(600)
await page.shot('17-task-filled', { fullPage: true })

await page.click('Complete Write the draft', 3200)
console.log('after complete:', await page.evaluate('location.pathname'))
await page.shot('18-handed-on', { fullPage: true })
await logout()

// --- The editor reviews it --------------------------------------------
await page.login('meera@businessorbit.in', 'Quibbling47!')
await page.goto('http://localhost:3000/my-work', 2500)
await page.shot('19-manager-my-work', { fullPage: true })
console.log('manager nav:', await page.evaluate(`
  JSON.stringify(Array.from(document.querySelectorAll('header nav a')).map(a => a.textContent.trim()))
`))

const link = await page.evaluate(`
  (() => { const a = document.querySelector('a[href^="/tasks/"]'); return a ? a.getAttribute('href') : null })()
`)
console.log('task link:', link)
await page.goto('http://localhost:3000' + link, 2500)
await page.shot('20-approval', { fullPage: true })
await page.close()
