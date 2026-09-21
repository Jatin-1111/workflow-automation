import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  readAssignees,
  readFileId,
  readReason,
  readSubmission,
  readTaskId,
} from './form-parsing'

function form(entries: [string, string][]): FormData {
  const data = new FormData()
  for (const [name, value] of entries) data.append(name, value)
  return data
}

describe('readTaskId', () => {
  it('accepts a real task id', () => {
    assert.equal(readTaskId(form([['taskId', 'BO-TSK-00001']])), 'BO-TSK-00001')
  })

  it('refuses an id of the wrong kind', () => {
    // A user id where a task id belongs must not reach a database query.
    assert.equal(readTaskId(form([['taskId', 'BO-USR-00001']])), null)
  })

  it('refuses anything that is not an id at all', () => {
    assert.equal(readTaskId(form([['taskId', 'BO-TSK-1']])), null)
    assert.equal(readTaskId(form([['taskId', '../../etc/passwd']])), null)
    assert.equal(readTaskId(form([])), null)
  })
})

describe('readSubmission', () => {
  it('collects the stage fields and ignores the form controls', () => {
    const submission = readSubmission(
      form([
        ['taskId', 'BO-TSK-00001'],
        ['field:client_name', 'ABC Technologies'],
        ['field:value', '750000'],
        ['comment', 'Looks good'],
      ]),
    )

    assert.deepEqual(submission.fieldValues, {
      client_name: 'ABC Technologies',
      value: '750000',
    })
    assert.equal(submission.comment, 'Looks good')
  })

  it('collects ticked checklist items', () => {
    const submission = readSubmission(
      form([
        ['check:formatting', 'on'],
        ['check:grammar', 'on'],
      ]),
    )
    assert.deepEqual(submission.checkedItemKeys, ['formatting', 'grammar'])
  })

  it('reports nothing ticked when nothing was ticked', () => {
    // An unchecked box sends no value at all, which is how a cleared checklist
    // reaches the engine.
    assert.deepEqual(readSubmission(form([['taskId', 'BO-TSK-00001']])).checkedItemKeys, [])
  })

  it('treats a blank comment as no comment', () => {
    assert.equal(readSubmission(form([['comment', '   ']])).comment, undefined)
  })

  it('keeps a field whose name contains the prefix again', () => {
    const submission = readSubmission(form([['field:check:odd', 'value']]))
    assert.deepEqual(submission.fieldValues, { 'check:odd': 'value' })
  })

  it('does not confuse a checklist item for a field', () => {
    const submission = readSubmission(form([['check:formatting', 'on']]))
    assert.deepEqual(submission.fieldValues, {})
  })
})

describe('readAssignees', () => {
  it('keeps only real user ids', () => {
    const chosen = readAssignees(
      form([
        ['assignees', 'BO-USR-00001'],
        ['assignees', 'BO-TSK-00001'],
        ['assignees', 'nonsense'],
        ['assignees', 'BO-USR-00002'],
      ]),
    )
    assert.deepEqual(chosen, ['BO-USR-00001', 'BO-USR-00002'])
  })

  it('removes duplicates, so one person cannot be added twice', () => {
    const chosen = readAssignees(
      form([
        ['assignees', 'BO-USR-00001'],
        ['assignees', 'BO-USR-00001'],
      ]),
    )
    assert.deepEqual(chosen, ['BO-USR-00001'])
  })

  it('returns nothing when none were chosen', () => {
    assert.deepEqual(readAssignees(form([])), [])
  })
})

describe('readFileId and readReason', () => {
  it('accepts a real file id and refuses anything else', () => {
    assert.equal(readFileId(form([['finalFileId', 'BO-FIL-00003']])), 'BO-FIL-00003')
    assert.equal(readFileId(form([['finalFileId', 'BO-USR-00001']])), undefined)
    assert.equal(readFileId(form([])), undefined)
  })

  it('trims a reason and treats a blank one as absent', () => {
    assert.equal(readReason(form([['reason', '  On leave  ']])), 'On leave')
    assert.equal(readReason(form([['reason', '  ']])), undefined)
    assert.equal(readReason(form([])), undefined)
  })
})
