import type { ContactFields } from '@crm/shared'
import { describe, expect, it } from 'vitest'
import { applyChoices, changedFields, resolveConflict } from './resolveConflict'

const base: ContactFields = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '+14155550123',
  company: 'Analytical Engines',
}

describe('resolveConflict', () => {
  it('takes their change when I left the field alone', () => {
    const result = resolveConflict(base, base, { ...base, phone: '+14155550999' })
    expect(result.conflicts).toEqual([])
    expect(result.merged.phone).toBe('+14155550999')
    expect(result.autoMerged).toEqual([{ field: 'phone', side: 'theirs' }])
  })

  it('keeps my change when they left the field alone', () => {
    const result = resolveConflict(base, { ...base, company: 'Babbage & Co' }, base)
    expect(result.conflicts).toEqual([])
    expect(result.merged.company).toBe('Babbage & Co')
    expect(result.autoMerged).toEqual([{ field: 'company', side: 'mine' }])
  })

  it('merges independent edits to different fields', () => {
    const result = resolveConflict(
      base,
      { ...base, email: 'ada@new.dev' },
      { ...base, phone: '+14155550999' },
    )
    expect(result.conflicts).toEqual([])
    expect(result.merged).toEqual({ ...base, email: 'ada@new.dev', phone: '+14155550999' })
  })

  it('does not flag a conflict when both sides made the same change', () => {
    const change = { ...base, lastName: 'King' }
    const result = resolveConflict(base, change, change)
    expect(result.conflicts).toEqual([])
    expect(result.autoMerged).toEqual([])
  })

  it('flags fields both sides changed to different values', () => {
    const result = resolveConflict(
      base,
      { ...base, email: 'mine@example.com' },
      { ...base, email: 'theirs@example.com' },
    )
    expect(result.conflicts).toEqual(['email'])
    expect(result.merged.email).toBe('theirs@example.com')
  })
})

describe('applyChoices', () => {
  const mine = { ...base, email: 'mine@example.com', company: null }
  const theirs = { ...base, email: 'theirs@example.com', company: 'Engines Ltd' }
  const resolution = resolveConflict(base, mine, theirs)

  it('defaults every conflict to my value', () => {
    expect(applyChoices(resolution, mine, {})).toMatchObject({
      email: 'mine@example.com',
      company: null,
    })
  })

  it('uses their value where the user picked theirs', () => {
    expect(applyChoices(resolution, mine, { email: 'theirs' })).toMatchObject({
      email: 'theirs@example.com',
      company: null,
    })
  })
})

describe('changedFields', () => {
  it('returns only the fields that differ', () => {
    expect(changedFields(base, { ...base, email: null, company: 'New' })).toEqual({
      email: null,
      company: 'New',
    })
  })
})
