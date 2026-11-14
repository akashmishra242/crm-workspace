import type { Contact } from '@crm/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  activitiesOf,
  createTestApp,
  insertContact,
  insertTag,
  type TestContext,
} from './helpers/test-app'

let ctx: TestContext

beforeAll(async () => {
  ctx = await createTestApp()
})

afterAll(() => ctx.close())

function patch(id: string, payload: object) {
  return ctx.app.inject({ method: 'PATCH', url: `/api/v1/contacts/${id}`, payload })
}

describe('POST /api/v1/contacts', () => {
  it('creates a normalised contact and records CONTACT_CREATED', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/contacts',
      payload: { firstName: ' Ada ', email: 'ADA@Example.com', phone: '(415) 555-0100' },
    })

    expect(response.statusCode).toBe(201)
    const contact = response.json<Contact>()
    expect(contact).toMatchObject({
      firstName: 'Ada',
      lastName: '',
      email: 'ada@example.com',
      phone: '+14155550100',
      company: null,
      tags: [],
      version: 1,
    })
    expect(contact.lastActivityAt).not.toBeNull()
    const activities = await activitiesOf(ctx.db, contact.id)
    expect(activities.map((activity) => activity.type)).toEqual(['CONTACT_CREATED'])
  })

  it('applies tags chosen at creation, each with its own activity entry', async () => {
    const vip = await insertTag(ctx.db, 'Founder')
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/contacts',
      payload: { firstName: 'Katherine', tagIds: [vip.id, vip.id] },
    })

    expect(response.statusCode).toBe(201)
    const contact = response.json<Contact>()
    expect(contact.tags.map((tag) => tag.name)).toEqual(['Founder'])
    const activities = await activitiesOf(ctx.db, contact.id)
    expect(activities.map((activity) => activity.type).sort()).toEqual([
      'CONTACT_CREATED',
      'TAG_ADDED',
    ])
  })

  it('creates nothing when a chosen tag does not exist', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/contacts',
      payload: { firstName: 'Nobody', tagIds: ['00000000-0000-4000-8000-0000000000aa'] },
    })

    expect(response.statusCode).toBe(404)
    const search = await ctx.app.inject({ method: 'GET', url: '/api/v1/contacts?q=nobody' })
    expect(search.json<{ data: unknown[] }>().data).toEqual([])
  })
})

describe('PATCH /api/v1/contacts/:id', () => {
  it('applies the change, bumps the version and records the field diff', async () => {
    const contact = await insertContact(ctx.db, { firstName: 'Grace', company: 'Navy' })

    const response = await patch(contact.id, { version: 1, company: 'Yale', lastName: 'Hopper' })

    expect(response.statusCode).toBe(200)
    expect(response.json<Contact>()).toMatchObject({
      company: 'Yale',
      lastName: 'Hopper',
      version: 2,
    })
    const [activity] = await activitiesOf(ctx.db, contact.id)
    expect(activity).toMatchObject({
      type: 'CONTACT_UPDATED',
      payload: {
        changes: {
          company: { from: 'Navy', to: 'Yale' },
          lastName: { from: '', to: 'Hopper' },
        },
      },
    })
  })

  it('rejects a stale version and returns the latest contact for merging', async () => {
    const contact = await insertContact(ctx.db, { firstName: 'Alan' })
    await patch(contact.id, { version: 1, company: 'Bletchley' })

    const stale = await patch(contact.id, { version: 1, lastName: 'Turing' })

    expect(stale.statusCode).toBe(409)
    expect(stale.json()).toMatchObject({
      error: {
        code: 'VERSION_CONFLICT',
        details: { current: { id: contact.id, company: 'Bletchley', lastName: '', version: 2 } },
      },
    })
  })

  it('lets exactly one of two simultaneous edits of the same version win', async () => {
    const contact = await insertContact(ctx.db, { firstName: 'Katherine' })

    const results = await Promise.all([
      patch(contact.id, { version: 1, company: 'NASA' }),
      patch(contact.id, { version: 1, company: 'NACA' }),
    ])

    expect(results.map((result) => result.statusCode).sort()).toEqual([200, 409])
  })

  it('treats a change to identical values as a no-op', async () => {
    const contact = await insertContact(ctx.db, { firstName: 'Mary', email: 'mary@example.com' })

    const response = await patch(contact.id, {
      version: 1,
      firstName: ' Mary ',
      email: 'MARY@example.com',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json<Contact>().version).toBe(1)
    expect(await activitiesOf(ctx.db, contact.id)).toEqual([])
  })

  it('keeps email unique regardless of case, on create and on update', async () => {
    await insertContact(ctx.db, { firstName: 'Owner', email: 'taken@example.com' })
    const other = await insertContact(ctx.db, { firstName: 'Other' })
    const duplicateError = {
      error: { code: 'EMAIL_ALREADY_EXISTS', details: { field: 'email' } },
    }

    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/contacts',
      payload: { firstName: 'Copy', email: 'TAKEN@example.com' },
    })
    const updated = await patch(other.id, { version: 1, email: 'Taken@Example.com' })

    expect(created.statusCode).toBe(409)
    expect(created.json()).toMatchObject(duplicateError)
    expect(updated.statusCode).toBe(409)
    expect(updated.json()).toMatchObject(duplicateError)
  })

  it('allows any number of contacts without an email', async () => {
    const first = await insertContact(ctx.db, { firstName: 'NoEmailOne', email: 'one@example.com' })
    await insertContact(ctx.db, { firstName: 'NoEmailTwo' })

    const response = await patch(first.id, { version: 1, email: '' })

    expect(response.statusCode).toBe(200)
    expect(response.json<Contact>().email).toBeNull()
  })

  it('reports invalid fields in the validation envelope', async () => {
    const contact = await insertContact(ctx.db)

    const response = await patch(contact.id, { version: 1, email: 'nope', firstName: '' })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Some values are invalid',
        details: {
          issues: expect.arrayContaining([
            { path: 'email', message: 'Enter a valid email address' },
            { path: 'firstName', message: 'First name is required' },
          ]),
        },
      },
    })
  })

  it('answers 404 for an unknown contact and 400 for a malformed id', async () => {
    const missing = await patch('00000000-0000-4000-8000-000000000000', { version: 1 })
    const malformed = await patch('not-a-uuid', { version: 1 })

    expect(missing.statusCode).toBe(404)
    expect(missing.json()).toMatchObject({ error: { code: 'NOT_FOUND' } })
    expect(malformed.statusCode).toBe(400)
    expect(malformed.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR', details: { issues: [{ path: 'id' }] } },
    })
  })
})

describe('unknown routes', () => {
  it('use the standard error envelope', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/v1/nope' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } })
  })
})
