import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ACCEPTED_EXTENSIONS, fileResponseHeaders } from './file-types'

describe('what a download says it is', () => {
  it('takes the type from the extension, never from what the browser claimed', () => {
    const headers = fileResponseHeaders('report.png', 10)
    assert.equal(headers['Content-Type'], 'image/png')
  })

  it('is case-insensitive about the extension', () => {
    assert.equal(fileResponseHeaders('SCAN.PDF', 1)['Content-Type'], 'application/pdf')
  })

  it('never serves anything the browser could run as a page', () => {
    for (const name of ['x.html', 'x.htm', 'x.svg', 'x.xml', 'x.js', 'x']) {
      const headers = fileResponseHeaders(name, 1)
      assert.equal(headers['Content-Type'], 'application/octet-stream', name)
      assert.match(headers['Content-Disposition'], /^attachment/, name)
    }
  })

  it('stops the browser second-guessing the type', () => {
    assert.equal(fileResponseHeaders('a.pdf', 1)['X-Content-Type-Options'], 'nosniff')
    assert.equal(fileResponseHeaders('a.html', 1)['X-Content-Type-Options'], 'nosniff')
  })

  it('lets a PDF or image preview, and downloads everything else', () => {
    assert.match(fileResponseHeaders('a.pdf', 1)['Content-Disposition'], /^inline/)
    assert.match(fileResponseHeaders('a.jpg', 1)['Content-Disposition'], /^inline/)
    assert.match(fileResponseHeaders('a.docx', 1)['Content-Disposition'], /^attachment/)
    assert.match(fileResponseHeaders('a.xlsx', 1)['Content-Disposition'], /^attachment/)
  })

  it('reports the length it will send', () => {
    assert.equal(fileResponseHeaders('a.pdf', 1234)['Content-Length'], '1234')
  })

  it('is private to the signed-in viewer', () => {
    assert.match(fileResponseHeaders('a.pdf', 1)['Cache-Control'], /private/)
  })
})

describe('a filename in a header', () => {
  it('cannot break out of the quoted name or smuggle a line break', () => {
    const header = fileResponseHeaders('a"b\\c\r\nSet-Cookie: x=1.pdf', 1)['Content-Disposition']
    assert.doesNotMatch(header, /[\r\n]/)
    const quoted = header.match(/filename="([^"]*)"/)
    assert.ok(quoted, 'the plain filename is still quoted')
    assert.doesNotMatch(quoted[1], /["\\]/)
  })

  it('keeps a non-ASCII name intact for browsers that understand it', () => {
    const header = fileResponseHeaders('résumé.pdf', 1)['Content-Disposition']
    assert.match(header, /filename\*=UTF-8''r%C3%A9sum%C3%A9\.pdf/)
    assert.match(header, /filename="r_sum_\.pdf"/)
  })

  it('is a header the platform will accept', () => {
    const headers = new Headers(fileResponseHeaders('naïve “quote”\t.pdf', 1))
    assert.ok(headers.get('content-disposition'))
  })
})

describe('the accepted extensions', () => {
  it('include nothing script-capable', () => {
    for (const risky of ['html', 'htm', 'svg', 'xml', 'js', 'mjs', 'xhtml']) {
      assert.equal(ACCEPTED_EXTENSIONS.has(risky), false, risky)
    }
  })

  it('still include the document types the product depends on', () => {
    for (const needed of ['pdf', 'docx', 'xlsx', 'pptx', 'csv', 'png', 'jpg']) {
      assert.equal(ACCEPTED_EXTENSIONS.has(needed), true, needed)
    }
  })
})
