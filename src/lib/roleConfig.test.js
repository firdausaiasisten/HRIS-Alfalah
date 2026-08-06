import { describe, it, expect } from 'vitest'
import { can, hasTab, getRoleConfig } from './roleConfig'

describe('roleConfig (ported from original ROLE_CONFIG)', () => {
  it('admin has full permissions', () => {
    expect(can('admin', 'canEdit')).toBe(true)
    expect(can('admin', 'canApproveLeave')).toBe(true)
    expect(can('admin', 'canImport')).toBe(true)
    expect(can('admin', 'canManageRoles')).toBe(true)
    expect(can('admin', 'canViewSalary')).toBe(true)
    expect(can('admin', 'canViewDisciplinary')).toBe(true)
    expect(can('admin', 'canManageEvents')).toBe(true)
  })

  it('hrd_staff can edit/approve but not import/manage roles/view salary/manage events', () => {
    expect(can('hrd_staff', 'canEdit')).toBe(true)
    expect(can('hrd_staff', 'canApproveLeave')).toBe(true)
    expect(can('hrd_staff', 'canImport')).toBe(false)
    expect(can('hrd_staff', 'canManageRoles')).toBe(false)
    expect(can('hrd_staff', 'canViewSalary')).toBe(false)
    expect(can('hrd_staff', 'canManageEvents')).toBe(false)
  })

  it('pimpinan cannot edit, approve, import, or manage anything -- read + export only', () => {
    expect(can('pimpinan', 'canEdit')).toBe(false)
    expect(can('pimpinan', 'canApproveLeave')).toBe(false)
    expect(can('pimpinan', 'canImport')).toBe(false)
    expect(can('pimpinan', 'canExport')).toBe(true)
    expect(can('pimpinan', 'canManageEvents')).toBe(false)
  })

  it('unknown/pending role falls back to zero permissions, zero tabs, without throwing', () => {
    expect(() => getRoleConfig('pending')).not.toThrow()
    expect(getRoleConfig('pending').tabs).toEqual([])
    expect(can('pending', 'canEdit')).toBe(false)
    expect(can(undefined, 'canEdit')).toBe(false)
  })

  it('hasTab matches each role\'s tab list exactly', () => {
    expect(hasTab('admin', 'leave_management')).toBe(true)
    expect(hasTab('pimpinan', 'leave_management')).toBe(false)
    expect(hasTab('pimpinan', 'dashboard')).toBe(true)
    expect(hasTab('hrd_staff', 'export_import')).toBe(true)
  })
})
