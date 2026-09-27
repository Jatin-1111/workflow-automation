/**
 * A very small Chrome DevTools Protocol client, for capturing the tutorial.
 *
 * No dependency: Chrome is already installed and Node has a WebSocket, so
 * driving it directly is a hundred lines and avoids adding a headless
 * browser to a project that ships none.
 */

import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9333

export async function launch({ width = 1280, height = 900 } = {}) {
  const profile = `${process.env.TEMP}\\bo-tutorial-profile`
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`,
      '--hide-scrollbars',
      '--force-device-scale-factor=2',
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: 'ignore', detached: false },
  )

  // Wait for the debugging endpoint to answer.
  let target
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await sleep(250)
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const list = await res.json()
      target = list.find((t) => t.type === 'page')
      if (target) break
    } catch {
      /* not up yet */
    }
  }
  if (!target) throw new Error('Chrome did not expose a debugging target.')

  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })

  let nextId = 1
  const pending = new Map()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    const waiter = pending.get(message.id)
    if (!waiter) return
    pending.delete(message.id)
    if (message.error) waiter.reject(new Error(JSON.stringify(message.error)))
    else waiter.resolve(message.result)
  })

  function send(method, params = {}) {
    const id = nextId++
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      socket.send(JSON.stringify({ id, method, params }))
    })
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: false,
  })

  const page = {
    send,
    /**
     * Hide the dev-only chrome.
     *
     * Next's dev indicator is a dark circle in the corner of every page.
     * It is not part of the product and a reader would reasonably ask
     * what it does.
     */
    async tidy() {
      await page.evaluate(`
        (() => {
          let style = document.getElementById('tutorial-tidy')
          if (!style) {
            style = document.createElement('style')
            style.id = 'tutorial-tidy'
            document.head.appendChild(style)
          }
          style.textContent = 'nextjs-portal, [data-nextjs-toast] { display: none !important }'
          return true
        })()
      `)
    },

    /**
     * Sign in through the real form, so the session is a real one.
     *
     * The browser profile is reused between runs, so somebody may already
     * be signed in — /login then redirects away and there is no form to
     * fill. Sign whoever it is out first.
     */
    async login(email, password) {
      await page.goto('http://localhost:3000/login', 1600)

      const needsSignOut = await page.evaluate(`
        (() => {
          const form = document.querySelector('form')
          return !(form && form.elements['email'])
        })()
      `)
      if (needsSignOut) {
        await page.goto('http://localhost:3000/my-work', 1600)
        await page.evaluate(`
          (() => {
            const b = Array.from(document.querySelectorAll('button'))
              .find(x => x.textContent.trim() === 'Sign out')
            if (b) b.click()
            return Boolean(b)
          })()
        `)
        await sleep(2400)
        await page.goto('http://localhost:3000/login', 1600)
      }

      await page.evaluate(`
        (() => {
          const form = document.querySelector('form')
          const set = (name, value) => {
            const el = form.elements[name]
            const setter = Object.getOwnPropertyDescriptor(
              el.constructor.prototype, 'value',
            ).set
            setter.call(el, value)
            el.dispatchEvent(new Event('input', { bubbles: true }))
          }
          set('email', ${JSON.stringify(email)})
          set('password', ${JSON.stringify(password)})
          form.querySelector('button[type=submit]').click()
          return true
        })()
      `)
      await sleep(2600)
    },
    /**
     * Set a field the way a person would.
     *
     * React tracks the value on the DOM node, so assigning `.value`
     * directly is ignored on the next render. Going through the
     * prototype setter and firing an input event is what makes the
     * component actually see it.
     */
    async fill(fields, formIndex) {
      return page.evaluate(`
        (() => {
          const forms = Array.from(document.forms)
          const form = ${formIndex === undefined ? 'null' : formIndex}
          const target = form !== null
            ? forms[form]
            : forms.find(f => ${JSON.stringify(Object.keys(fields))}.every(n => f.elements[n]))
          if (!target) return 'form not found'
          const entries = ${JSON.stringify(fields)}
          for (const [name, value] of Object.entries(entries)) {
            const el = target.elements[name]
            if (!el) return 'missing field: ' + name
            const proto = el.tagName === 'SELECT'
              ? HTMLSelectElement.prototype
              : el.tagName === 'TEXTAREA'
                ? HTMLTextAreaElement.prototype
                : HTMLInputElement.prototype
            Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
            el.dispatchEvent(new Event('input', { bubbles: true }))
            el.dispatchEvent(new Event('change', { bubbles: true }))
          }
          return 'ok'
        })()
      `)
    },

    /** Click the first button or link whose text matches. */
    async click(text, settle = 1500) {
      const found = await page.evaluate(`
        (() => {
          const re = new RegExp(${JSON.stringify(text)}, 'i')
          const el = Array.from(document.querySelectorAll('button, a, summary'))
            .find(x => re.test(x.textContent.trim()))
          if (!el) return false
          el.click()
          return true
        })()
      `)
      await sleep(settle)
      return found
    },

    /** Tick a checkbox by its value, e.g. a role id. */
    async check(name, value) {
      return page.evaluate(`
        (() => {
          const el = document.querySelector(
            'input[name=' + JSON.stringify(${JSON.stringify(name)}) + '][value=' + JSON.stringify(${JSON.stringify(value)}) + ']'
          )
          if (!el) return false
          if (!el.checked) el.click()
          return true
        })()
      `)
    },
    async goto(url, settle = 1400) {
      await send('Page.navigate', { url })
      await sleep(settle)
    },
    async evaluate(expression) {
      const result = await send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      })
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description ?? 'evaluate failed')
      }
      return result.result.value
    },
    async wait(ms) {
      await sleep(ms)
    },
    /** Capture the whole page, not just the window. */
    async shot(file, { fullPage = false } = {}) {
      mkdirSync('docs/tutorial/shots', { recursive: true })
      await page.tidy()
      let clip
      if (fullPage) {
        const size = await page.evaluate(
          `JSON.stringify({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight })`,
        )
        const { w, h } = JSON.parse(size)
        clip = { x: 0, y: 0, width: w, height: Math.min(h, 4000), scale: 1 }
      }
      const { data } = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: fullPage,
        ...(clip ? { clip } : {}),
      })
      writeFileSync(`docs/tutorial/shots/${file}.png`, Buffer.from(data, 'base64'))
      return `${file}.png`
    },
    async close() {
      socket.close()
      chrome.kill()
    },
  }
  return page
}
