import type { ActivityFeedPage, Contact, ContactPage } from '@crm/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp, insertContact, insertTag, type TestContext } from './helpers/test-app'

let ctx: TestContext

beforeAll(async () => {
  ctx = await createTestApp()
})

afterAll(() => ctx.close())

const call = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
  ctx.app.inject({ method, url: `/api/v1${url}`, payload })

describe('deleting a contact', () => {
  it('hides it everywhere but keeps its history, and the email can be reused', async () => {
    const contact = await insertContact(ctx.db, {
      firstName: 'Hedy',
      lastName: 'Lamarr',
      email: 'hedy@example.com',
    })

    expect((await call('DELETE', `/contacts/${contact.id}`)).statusCode).toBe(204)

    expect((await call('GET', `/contacts/${contact.id}`)).statusCode).toBe(404)
    expect(
      (await call('PATCH', `/contacts/${contact.id}`, { version: 1, company: 'X' })).statusCode,
    ).toBe(404)
    const tag = await insertTag(ctx.db, 'Inventor')
    expect((await call('POST', `/contacts/${contact.id}/tags`, { tagId: tag.id })).statusCode).toBe(
      404,
    )
    const bulk = await call('POST', '/contacts/bulk/tags', {
      contactIds: [contact.id],
      tagId: tag.id,
      action: 'add',
    })
    expect(bulk.json()).toMatchObject({ updatedCount: 0, notFoundIds: [contact.id] })

    const search = (await call('GET', '/contacts?q=lamarr')).json<ContactPage>()
    expect(search.data).toEqual([])
    expect((await call('GET', '/contacts/count?q=lamarr')).json()).toEqual({ count: 0 })

    const feed = (await call('GET', '/activities?type=CONTACT_DELETED')).json<ActivityFeedPage>()
    expect(feed.data[0]).toMatchObject({
      contactId: contact.id,
      contactName: 'Hedy Lamarr',
      contactDeleted: true,
      payload: { name: 'Hedy Lamarr' },
    })

    const reused = await call('POST', '/contacts', { firstName: 'New', email: 'hedy@example.com' })
    expect(reused.statusCode).toBe(201)
  })

  it('restores a deleted contact, unless its email has been taken since', async () => {
    const kept = await insertContact(ctx.db, { firstName: 'Annie', email: 'annie@example.com' })
    const taken = await insertContact(ctx.db, { firstName: 'Mary', email: 'mary@example.com' })
    await call('DELETE', `/contacts/${kept.id}`)
    await call('DELETE', `/contacts/${taken.id}`)
    await call('POST', '/contacts', { firstName: 'Other Mary', email: 'mary@example.com' })

    const restored = await call('POST', `/contacts/${kept.id}/restore`)
    expect(restored.statusCode).toBe(200)
    expect(restored.json<Contact>()).toMatchObject({ id: kept.id, version: 1 })
    expect((await call('GET', `/contacts/${kept.id}`)).statusCode).toBe(200)

    const conflict = await call('POST', `/contacts/${taken.id}/restore`)
    expect(conflict.statusCode).toBe(409)
    expect(conflict.json()).toMatchObject({ error: { code: 'EMAIL_ALREADY_EXISTS' } })
  })

  it('answers 404 for a contact that does not exist', async () => {
    const response = await call('DELETE', '/contacts/00000000-0000-4000-8000-0000000000ff')
    expect(response.statusCode).toBe(404)
  })
})
