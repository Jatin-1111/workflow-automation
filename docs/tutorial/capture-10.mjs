import { launch } from './cdp.mjs'
const page = await launch()

async function logout() {
  await page.goto('http://localhost:3000/my-work', 1600)
  await page.click('Sign out', 2200)
}

async function startRun(title) {
  await page.goto('http://localhost:3000/my-work', 2200)
  await page.click('Start a workflow', 1400)
  await page.fill({ title })
  await page.wait(400)
  await page.click('Start it', 3200)
  return page.evaluate('location.pathname')
}

await page.login('rohan@businessorbit.in', 'Quibbling47!')

// Finish the run sitting at Publish.
await page.goto('http://localhost:3000/my-work?view=all', 2500)
const publishTask = await page.evaluate(`
  (() => {
    const row = Array.from(document.querySelectorAll('a')).find(a =>
      (a.getAttribute('href')||'').startsWith('/tasks/') && /publish/i.test(a.textContent))
    return row ? row.getAttribute('href') : null
  })()
`)
console.log('publish task:', publishTask)
if (publishTask) {
  await page.goto('http://localhost:3000' + publishTask, 2500)
  await page.fill({ 'field:live_url': 'https://example.com/choosing-a-crm' })
  await page.wait(400)
  await page.click('^Complete', 3200)
  console.log('finished run 1')
}

// A second run, taken as far as review.
const second = await startRun('Pricing page rewrite')
console.log('second at:', second)
await page.fill({
  'field:headline': 'A clearer pricing page',
  'field:draft': 'Three plans, one sentence each, and the answer to the question everybody actually asks.',
})
await page.wait(400)
await page.click('^Complete', 3200)

// A third, still being written.
console.log('third at:', await startRun('Case study: Ridgeline Foods'))
await page.shot('27-employee-busy', { fullPage: true })
await logout()

// --- Oversight, with work actually flowing ----------------------------
await page.login('meera@businessorbit.in', 'Quibbling47!')
for (const [path, name] of [
  ['/dashboard', '22-overview'],
  ['/board', '23-board'],
  ['/team', '24-team'],
  ['/projects', '25-projects'],
  ['/reports', '26-reports'],
]) {
  await page.goto('http://localhost:3000' + path, 3000)
  await page.shot(name, { fullPage: true })
}
await page.close()
console.log('done')
