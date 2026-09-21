import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { safePhotoUrl } from './validation'

describe('safePhotoUrl', () => {
  it('keeps an ordinary web address', () => {
    assert.equal(
      safePhotoUrl('https://example.com/riya.jpg'),
      'https://example.com/riya.jpg',
    )
    assert.equal(safePhotoUrl('  http://example.com/a.png  '), 'http://example.com/a.png')
  })

  it('drops a scheme the browser would execute', () => {
    // These reach an <img src>, where the browser acts on the scheme.
    assert.equal(safePhotoUrl('javascript:alert(1)'), undefined)
    assert.equal(safePhotoUrl('data:text/html;base64,PHNjcmlwdD4='), undefined)
    assert.equal(safePhotoUrl('vbscript:msgbox'), undefined)
    assert.equal(safePhotoUrl('file:///etc/passwd'), undefined)
  })

  it('drops something that is not a URL at all', () => {
    assert.equal(safePhotoUrl('not a url'), undefined)
    assert.equal(safePhotoUrl(''), undefined)
    assert.equal(safePhotoUrl(undefined), undefined)
  })
})
