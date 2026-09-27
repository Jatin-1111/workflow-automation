/**
 * Reassignment, seen by a manager.
 *
 * Taken as an administrator while managers could not open a task they did
 * not hold. They can now, and Part 3 is addressed to them, so the picture
 * should be the one they will actually see.
 */
import { launch } from './cdp.mjs'
const page = await launch()
await page.login('meera@businessorbit.in', 'Quibbling47!')

await page.goto('http://localhost:3000/tasks/BO-TSK-00006', 2800)
console.log('opened:', await page.evaluate(`document.querySelector('h1')?.textContent`))
console.log('reassign opened:', await page.click('^Reassign$', 1600))
console.log('controls:', await page.evaluate(`
  JSON.stringify({
    reassignButton: Array.from(document.querySelectorAll('button')).some(b => /Reassign task/i.test(b.textContent)),
    cancelControl: document.body.innerText.includes('Cancel this workflow'),
    hold: document.body.innerText.includes('Put this on hold'),
    whoHolds: document.body.innerText.includes('Rohan Das'),
  })
`))
await page.shot('31-reassign', { fullPage: true })
await page.close()
