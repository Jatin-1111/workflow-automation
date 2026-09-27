import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { optionalText, requiredText, tooLong } from './form-text'

function form(entries: [string, string][]): FormData {
  const data = new FormData()
  for (const [key, value] of entries) data.append(key, value)
  return data
}

describe('tooLong', () => {
  const limits = { name: 10, description: 20 }

  it('passes text that fits', () => {
    assert.equal(tooLong(form([['name', 'Short']]), limits), null)
  })

  it('refuses text that does not, naming the field', () => {
    const message = tooLong(form([['name', 'a'.repeat(11)]]), limits)
    assert.equal(message, 'The name must be 10 characters or fewer.')
  })

  it('measures what would be stored, not what was typed', () => {
    // The value is trimmed before it is saved, so trailing space must not
    // be what pushes somebody over the limit.
    assert.equal(tooLong(form([['name', `${'a'.repeat(10)}    `]]), limits), null)
  })

  it('says nothing about a field the form did not carry', () => {
    // A narrow form that omits description must not be told its
    // description is too long, and must not have it blanked either.
    assert.equal(tooLong(form([['name', 'Short']]), limits), null)
  })

  it('accepts exactly the limit', () => {
    assert.equal(tooLong(form([['name', 'a'.repeat(10)]]), limits), null)
  })

  it('uses a word a person would use, not the input name', () => {
    // "The body must be 5000 characters or fewer" is the form's own
    // vocabulary leaking out; nobody calls what they typed a body.
    const message = tooLong(form([['body', 'aaa']]), { body: 2 })
    assert.equal(message, 'The comment must be 2 characters or fewer.')
  })

  it('reads a camelCase field name as words', () => {
    const message = tooLong(form([['helpText', 'a'.repeat(5)]]), { helpText: 2 })
    assert.equal(message, 'The help text must be 2 characters or fewer.')
  })

  it('ignores a field that arrived as a file rather than text', () => {
    const data = new FormData()
    data.append('name', new File(['x'], 'x.txt'))
    assert.equal(tooLong(data, limits), null)
  })
})

describe('requiredText', () => {
  it('trims what it returns', () => {
    assert.equal(requiredText('  Sales  ', 10), 'Sales')
  })

  it('refuses blank', () => {
    assert.equal(requiredText('', 10), null)
    assert.equal(requiredText('   ', 10), null)
  })

  it('refuses over-length rather than shortening it', () => {
    assert.equal(requiredText('a'.repeat(11), 10), null)
  })

  it('refuses something that is not text at all', () => {
    assert.equal(requiredText(undefined, 10), null)
    assert.equal(requiredText(42, 10), null)
  })
})

describe('optionalText', () => {
  it('is undefined when blank', () => {
    assert.equal(optionalText(''), undefined)
    assert.equal(optionalText('   '), undefined)
    assert.equal(optionalText(undefined), undefined)
  })

  it('trims what it keeps', () => {
    assert.equal(optionalText('  note  '), 'note')
  })

  it('never shortens what it was given', () => {
    // An earlier version took a limit and truncated to it, which is the
    // silent data loss this whole exercise exists to remove: the form
    // would report success having thrown away the end of a paragraph.
    const long = 'a'.repeat(10_000)
    assert.equal(optionalText(long), long)
  })
})

describe('the browser and the server agree', () => {
  it('no input carries a hand-written limit', async () => {
    // A form whose browser limit differs from its server limit either
    // rejects work the server would have taken, or takes work the server
    // refuses after somebody has typed it. Both sides read one table, and
    // a literal here is how that quietly stops being true.
    const { readdirSync, readFileSync, statSync } = await import('node:fs')
    const { join } = await import('node:path')

    function walk(dir: string): string[] {
      return readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry)
        return statSync(path).isDirectory() ? walk(path) : path.endsWith('.tsx') ? [path] : []
      })
    }

    const offenders = walk('src')
      .map((path) => ({ path, source: readFileSync(path, 'utf8') }))
      .filter(({ source }) => /(?:max|min)Length=\{\d+\}/.test(source))
      .map(({ path }) => path)

    assert.deepEqual(offenders, [], `hand-written length limits in: ${offenders.join(', ')}`)
  })
})
