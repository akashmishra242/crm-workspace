import { describe, expect, it } from 'vitest'
import { contactFieldsSchema, contactUpdateSchema } from './contact'
import { normalizeSearchTerm } from './phone'

const valid = {
  firstName: '  Ada ',
  lastName: 'Lovelace',
  email: ' Ada@Example.COM ',
  phone: '(415) 555-0123',
  company: '',
}

describe('contactFieldsSchema', () => {
  it('normalises values into their stored form', () => {
    expect(contactFieldsSchema.parse(valid)).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '+14155550123',
      company: null,
    })
  })

  it('treats blank optional fields as cleared', () => {
    const result = contactFieldsSchema.parse({ ...valid, email: '  ', phone: '' })
    expect(result.email).toBeNull()
    expect(result.phone).toBeNull()
  })

  it('reports a message per invalid field', () => {
    const result = contactFieldsSchema.safeParse({
      ...valid,
      firstName: ' ',
      email: 'not-an-email',
      phone: '12',
    })
    expect(result.success).toBe(false)
    const messages = Object.fromEntries(
      result.error!.issues.map((issue) => [issue.path.join('.'), issue.message]),
    )
    expect(messages).toEqual({
      firstName: 'First name is required',
      email: 'Enter a valid email address',
      phone: 'Enter a valid phone number',
    })
  })
})

describe('contactUpdateSchema', () => {
  it('requires the version the client edited', () => {
    expect(contactUpdateSchema.safeParse({ firstName: 'Ada' }).success).toBe(false)
    expect(contactUpdateSchema.parse({ firstName: 'Ada', version: 3 })).toEqual({
      firstName: 'Ada',
      version: 3,
    })
  })
})

describe('normalizeSearchTerm', () => {
  it('reduces phone-like input to digits', () => {
    expect(normalizeSearchTerm(' (415) 555-01 ')).toBe('41555501')
  })

  it('keeps text input as lower-case text', () => {
    expect(normalizeSearchTerm('  Ada L ')).toBe('ada l')
    expect(normalizeSearchTerm('@acme.io')).toBe('@acme.io')
  })
})
