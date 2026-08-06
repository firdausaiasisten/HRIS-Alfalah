import { describe, it, expect } from 'vitest'
import { computeProfileCompletion, COMPLETION_FIELDS } from './profileCompletion'

describe('computeProfileCompletion', () => {
  it('returns 0% and all fields missing for null/undefined employee', () => {
    expect(computeProfileCompletion(null).percent).toBe(0)
    expect(computeProfileCompletion(null).missing).toHaveLength(COMPLETION_FIELDS.length)
    expect(computeProfileCompletion(undefined).percent).toBe(0)
  })

  it('returns 100% and empty missing list when every field is filled', () => {
    const emp = Object.fromEntries(COMPLETION_FIELDS.map(([k]) => [k, 'x']))
    const { percent, missing } = computeProfileCompletion(emp)
    expect(percent).toBe(100)
    expect(missing).toEqual([])
  })

  it('treats empty string and whitespace-only as NOT filled', () => {
    const emp = Object.fromEntries(COMPLETION_FIELDS.map(([k]) => [k, 'x']))
    emp.photo_url = ''
    emp.phone = '   '
    const { missing } = computeProfileCompletion(emp)
    expect(missing).toEqual(['Foto', 'No. HP'])
  })

  it('computes exact percentage for a partial profile (matches the design brief example: missing Emergency Contact, Photo, NPWP)', () => {
    const emp = Object.fromEntries(COMPLETION_FIELDS.map(([k]) => [k, 'x']))
    emp.photo_url = null
    emp.tax_number = null
    emp.emergency_contact_name = null
    const { percent, missing } = computeProfileCompletion(emp)
    // 10 fields total, 3 missing -> 7/10 = 70%
    expect(percent).toBe(70)
    expect(missing).toEqual(['Foto', 'NPWP', 'Kontak Darurat'])
  })

  it('a value of 0 (falsy but a real value) still counts as filled', () => {
    const emp = Object.fromEntries(COMPLETION_FIELDS.map(([k]) => [k, 'x']))
    emp.phone = 0 // pathological but shouldn't be treated as "missing"
    const { missing } = computeProfileCompletion(emp)
    expect(missing).toEqual([])
  })
})
