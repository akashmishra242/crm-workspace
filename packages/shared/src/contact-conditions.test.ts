import { describe, expect, it } from 'vitest'
import { conditionSchema, parseCondition, serializeCondition } from './contact-conditions'

describe('field conditions', () => {
  it('round-trips through the URL form, keeping colons inside the value', () => {
    const condition = { operator: 'contains', value: 'acme:west' } as const
    expect(serializeCondition(condition)).toBe('contains:acme:west')
    expect(parseCondition('contains:acme:west')).toEqual(condition)
    expect(parseCondition('exists')).toEqual({ operator: 'exists', value: '' })
  })

  it('rejects unknown operators, missing values and values where none belong', () => {
    expect(parseCondition('near:acme')).toBeNull()
    expect(parseCondition('contains:  ')).toBeNull()
    expect(parseCondition('exists:acme')).toBeNull()
  })

  it('only allows operators that make sense for the field', () => {
    expect(conditionSchema('firstName').safeParse('exists').success).toBe(false)
    expect(conditionSchema('email').safeParse('exists').success).toBe(true)
    expect(conditionSchema('phone').safeParse('contains:abc').success).toBe(false)
  })
})
