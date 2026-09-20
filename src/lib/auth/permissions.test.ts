import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CAPABILITIES,
  CAPABILITIES_BY_ACCESS_LEVEL,
  can,
  canAll,
  landingPath,
} from './permissions'
import { ACCESS_LEVELS } from '@/lib/types/status'

describe('capability tiers', () => {
  it('grants employees everyday work only', () => {
    assert.equal(can('employee', 'task.complete_assigned'), true)
    assert.equal(can('employee', 'file.upload'), true)
    assert.equal(can('employee', 'team.view_workload'), false)
    assert.equal(can('employee', 'admin.manage_users'), false)
    assert.equal(can('employee', 'instance.view_all'), false)
  })

  it('gives managers oversight but not administration', () => {
    assert.equal(can('manager', 'team.view_workload'), true)
    assert.equal(can('manager', 'task.reassign'), true)
    assert.equal(can('manager', 'management.view_dashboard'), true)
    assert.equal(can('manager', 'admin.manage_workflows'), false)
  })

  it('gives admins every capability', () => {
    assert.equal(
      CAPABILITIES_BY_ACCESS_LEVEL.admin.length,
      CAPABILITIES.length,
      'admin should hold the full capability set',
    )
  })

  it('is cumulative, so each tier keeps everything the tier below has', () => {
    for (const capability of CAPABILITIES_BY_ACCESS_LEVEL.employee) {
      assert.equal(can('manager', capability), true, `manager lost ${capability}`)
    }
    for (const capability of CAPABILITIES_BY_ACCESS_LEVEL.manager) {
      assert.equal(can('admin', capability), true, `admin lost ${capability}`)
    }
  })

  it('never grants a capability outside the declared set', () => {
    for (const level of ACCESS_LEVELS) {
      for (const capability of CAPABILITIES_BY_ACCESS_LEVEL[level]) {
        assert.ok(CAPABILITIES.includes(capability), `${capability} is not declared`)
      }
    }
  })
})

describe('canAll', () => {
  it('requires every listed capability', () => {
    assert.equal(canAll('manager', ['task.reassign', 'team.view_workload']), true)
    assert.equal(canAll('manager', ['task.reassign', 'admin.manage_users']), false)
    assert.equal(canAll('employee', []), true)
  })
})

describe('landingPath', () => {
  it('sends employees to My Work and oversight roles to the dashboard', () => {
    assert.equal(landingPath('employee'), '/my-work')
    assert.equal(landingPath('manager'), '/dashboard')
    assert.equal(landingPath('admin'), '/dashboard')
  })
})
