import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  newestTimestamp,
  redactedTarget,
  renderReport,
  type CollectionSummary,
} from './inspect'

const NOW = new Date('2026-11-27T12:00:00.000Z')

describe('naming the database without leaking how to open it', () => {
  it('shows the host and database, never the credentials', () => {
    const target = redactedTarget(
      'mongodb://orbit:s3cr3t@db.example.com:27017/business_orbit?authSource=admin',
      'business_orbit',
    )
    assert.equal(target, 'db.example.com:27017 / business_orbit')
    assert.doesNotMatch(target, /s3cr3t|orbit:|authSource/)
  })

  it('handles an SRV address with an encoded password', () => {
    const target = redactedTarget(
      'mongodb+srv://admin:p%40ss%2Fword@cluster0.abc12.mongodb.net/?retryWrites=true',
      'orbit',
    )
    assert.equal(target, 'cluster0.abc12.mongodb.net / orbit')
    assert.doesNotMatch(target, /p%40ss|admin/)
  })

  it('handles a replica set listing several hosts', () => {
    const target = redactedTarget('mongodb://u:pw@h1:27017,h2:27017,h3:27017/db', 'db')
    assert.equal(target, 'h1:27017,h2:27017,h3:27017 / db')
    assert.doesNotMatch(target, /pw/)
  })

  it('handles an address with no credentials', () => {
    assert.equal(redactedTarget('mongodb://localhost:27018/x', 'x'), 'localhost:27018 / x')
  })

  it('never echoes back something it cannot read', () => {
    const target = redactedTarget('not a uri but has hunter2 in it', 'db')
    assert.doesNotMatch(target, /hunter2/)
    assert.match(target, /unreadable/i)
  })
})

describe('the newest thing in a collection', () => {
  it('is the latest of whichever timestamp fields the documents carry', () => {
    const newest = newestTimestamp({
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-06-01T00:00:00Z'),
      at: null,
      uploadedAt: undefined,
    })
    assert.equal(newest?.toISOString(), '2026-06-01T00:00:00.000Z')
  })

  it('ignores anything that is not a date', () => {
    assert.equal(newestTimestamp({ createdAt: 'yesterday', at: 5 }), null)
  })

  it('is nothing for an empty collection', () => {
    assert.equal(newestTimestamp(null), null)
  })
})

describe('the report', () => {
  const rows: CollectionSummary[] = [
    { name: 'users', documents: 12, newest: new Date('2026-11-20T12:00:00Z') },
    { name: 'tasks', documents: 340, newest: new Date('2026-11-27T11:00:00Z') },
    { name: 'comments', documents: 0, newest: null },
  ]
  const report = renderReport('h.example / orbit', rows, NOW)

  it('names the target, each collection and its count', () => {
    assert.match(report, /h\.example \/ orbit/)
    for (const row of rows) assert.match(report, new RegExp(row.name))
    assert.match(report, /340/)
  })

  it('totals the documents', () => {
    assert.match(report, /Total.*352/)
  })

  it('says how long ago the newest activity was, and says none when there is none', () => {
    assert.match(report, /7 days ago/)
    assert.match(report, /today/)
    assert.match(report, /comments\s+0\s+none/)
  })

  it('says plainly that it shows no document contents', () => {
    assert.match(report, /no document contents/i)
  })

  it('copes with a database that has no collections', () => {
    assert.match(renderReport('h / d', [], NOW), /no collections/i)
  })
})
