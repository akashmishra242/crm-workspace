import type { Contact, ContactPage } from '@crm/shared'
import { countDistinct, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { contacts, contactTags } from '../src/db/schema'
import {
  createTestApp,
  insertContact,
  insertContacts,
  insertTag,
  type TestContext,
} from './helpers/test-app'

let ctx: TestContext
let vipId: string
let customerId: string

const TWIN_COUNT = 45

beforeAll(async () => {
  ctx = await createTestApp()
  const vip = await insertTag(ctx.db, 'VIP')
  const customer = await insertTag(ctx.db, 'Customer')
  vipId = vip.id
  customerId = customer.id

  const ada = await insertContact(ctx.db, {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@analytical.io',
    phone: '+14155550123',
    company: 'Analytical Engines',
    createdAt: new Date('2025-01-10T12:00:00Z'),
  })
  const grace = await insertContact(ctx.db, {
    firstName: 'Grace',
    lastName: 'Hopper',
    email: 'grace@navy.mil',
    company: 'US Navy',
    createdAt: new Date('2025-03-05T08:00:00Z'),
  })
  await insertContact(ctx.db, {
    firstName: 'Alan',
    lastName: 'Turing',
    phone: '+442079460000',
    company: 'Bletchley 100%',
    createdAt: new Date('2025-06-20T18:30:00Z'),
  })
  await ctx.db.insert(contactTags).values([
    { contactId: ada.id, tagId: vipId },
    { contactId: ada.id, tagId: customerId },
    { contactId: grace.id, tagId: customerId },
  ])

  // Identical names and identical created_at values (one statement shares one now(), down to the
  // microsecond) force pagination to rely on the id tie-breaker.
  await insertContacts(
    ctx.db,
    Array.from({ length: TWIN_COUNT }, () => ({ firstName: 'Sam', lastName: 'Twin' })),
  )
})

afterAll(() => ctx.close())

async function getJson<T>(url: string): Promise<{ status: number; body: T }> {
  const response = await ctx.app.inject({ method: 'GET', url })
  return { status: response.statusCode, body: response.json<T>() }
}

async function namesFor(query: string): Promise<string[]> {
  const { status, body } = await getJson<ContactPage>(
    `/api/v1/contacts?sort=name&order=asc&${query}`,
  )
  if (status !== 200) throw new Error(`${query} → ${status} ${JSON.stringify(body)}`)
  return body.data.map((contact) => `${contact.firstName} ${contact.lastName}`)
}

describe('GET /api/v1/contacts — search and filters', () => {
  it('searches by name, email and phone, ignoring phone formatting', async () => {
    expect(await namesFor('q=lovelace')).toEqual(['Ada Lovelace'])
    expect(await namesFor('q=ada%20lov')).toEqual(['Ada Lovelace'])
    expect(await namesFor('q=navy.mil')).toEqual(['Grace Hopper'])
    expect(await namesFor(`q=${encodeURIComponent('(415) 555-01')}`)).toEqual(['Ada Lovelace'])
  })

  it('matches LIKE wildcards literally', async () => {
    expect(await namesFor('q=%25')).toEqual([])
    expect(await namesFor(`company=${encodeURIComponent('contains:y 100%')}`)).toEqual([
      'Alan Turing',
    ])
  })

  it('filters by any or all of the selected tags', async () => {
    const tags = `tagIds=${vipId},${customerId}`
    expect(await namesFor(`${tags}&tagMatch=any`)).toEqual(['Ada Lovelace', 'Grace Hopper'])
    expect(await namesFor(`${tags}&tagMatch=all`)).toEqual(['Ada Lovelace'])
  })

  it('filters a field by exists, is, contains and their opposites', async () => {
    // Leaves out the 45 "Sam Twin" contacts used by the pagination tests.
    const real = 'firstName=isNot:sam'
    expect(await namesFor(`${real}&email=notExists`)).toEqual(['Alan Turing'])
    expect(await namesFor(`${real}&email=exists`)).toEqual(['Ada Lovelace', 'Grace Hopper'])
    expect(await namesFor(`${real}&email=is:GRACE@navy.mil`)).toEqual(['Grace Hopper'])
    // "Is not" and "does not contain" include contacts with no value at all.
    expect(await namesFor(`${real}&email=isNot:grace@navy.mil`)).toEqual([
      'Ada Lovelace',
      'Alan Turing',
    ])
    expect(await namesFor(`${real}&company=contains:ENGINE`)).toEqual(['Ada Lovelace'])
    expect(await namesFor(`${real}&company=notContains:engine`)).toEqual([
      'Alan Turing',
      'Grace Hopper',
    ])
    expect(await namesFor(`${real}&company=is:bletchley%20100%25`)).toEqual(['Alan Turing'])
    expect(await namesFor(`${real}&company=contains:100%25`)).toEqual(['Alan Turing'])
    expect(await namesFor(`firstName=is:ADA`)).toEqual(['Ada Lovelace'])
  })

  it('compares phones by digits, whatever the formatting', async () => {
    expect(await namesFor('phone=contains:(415)%20555')).toEqual(['Ada Lovelace'])
    expect(await namesFor('phone=is:415-555-0123')).toEqual(['Ada Lovelace'])
    expect(await namesFor('phone=notExists&firstName=isNot:sam')).toEqual(['Grace Hopper'])
  })

  it('rejects conditions a field does not support or that are missing a value', async () => {
    for (const query of [
      'firstName=exists',
      'email=contains:',
      'phone=contains:abc',
      'email=near:x',
    ]) {
      const { status } = await getJson(`/api/v1/contacts?${query}`)
      expect(status, query).toBe(400)
    }
  })

  it('filters by created date', async () => {
    expect(await namesFor('createdFrom=2025-03-05&createdTo=2025-06-20')).toEqual([
      'Alan Turing',
      'Grace Hopper',
    ])
  })

  it('counts with the same filters', async () => {
    const { body } = await getJson<{ count: number }>(`/api/v1/contacts/count?tagIds=${customerId}`)
    expect(body).toEqual({ count: 2 })
  })

  it('rejects unsupported page sizes and inverted date ranges', async () => {
    const pageSize = await getJson('/api/v1/contacts?limit=7')
    const dates = await getJson('/api/v1/contacts?createdFrom=2025-02-01&createdTo=2025-01-01')

    expect(pageSize.status).toBe(400)
    expect(dates.status).toBe(400)
    expect(dates.body).toMatchObject({
      error: { code: 'VALIDATION_ERROR', details: { issues: [{ path: 'createdTo' }] } },
    })
  })
})

describe('GET /api/v1/contacts — keyset pagination', () => {
  const sortings = [
    { sort: 'name', order: 'asc' },
    { sort: 'name', order: 'desc' },
    { sort: 'createdAt', order: 'asc' },
    { sort: 'createdAt', order: 'desc' },
  ] as const

  it.each(sortings)(
    'walks every row once, forwards and back ($sort $order)',
    async ({ sort, order }) => {
      const base = `/api/v1/contacts?q=sam%20twin&limit=20&sort=${sort}&order=${order}`
      const forward: Contact[][] = []
      let page = (await getJson<ContactPage>(base)).body
      expect(page.page.prevCursor).toBeNull()
      forward.push(page.data)
      while (page.page.nextCursor) {
        page = (await getJson<ContactPage>(`${base}&cursor=${page.page.nextCursor}`)).body
        forward.push(page.data)
      }

      const ids = forward.flat().map((contact) => contact.id)
      expect(forward.map((rows) => rows.length)).toEqual([20, 20, 5])
      expect(new Set(ids).size).toBe(TWIN_COUNT)
      expect(ids).toEqual(order === 'asc' ? [...ids].sort() : [...ids].sort().reverse())

      const backward: Contact[][] = [page.data]
      while (page.page.prevCursor) {
        page = (await getJson<ContactPage>(`${base}&cursor=${page.page.prevCursor}`)).body
        backward.unshift(page.data)
      }
      expect(backward).toEqual(forward)
    },
  )

  it('rejects a malformed cursor and a cursor issued for another sort', async () => {
    const { body: firstPage } = await getJson<ContactPage>(
      '/api/v1/contacts?q=sam%20twin&sort=name&order=asc',
    )

    const malformed = await getJson('/api/v1/contacts?cursor=not-a-cursor')
    const wrongSort = await getJson(
      `/api/v1/contacts?sort=createdAt&order=asc&cursor=${firstPage.page.nextCursor}`,
    )

    for (const response of [malformed, wrongSort]) {
      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({
        error: { code: 'VALIDATION_ERROR', details: { issues: [{ path: 'cursor' }] } },
      })
    }
  })

  it('walks createdAt over rows sharing one microsecond-precision timestamp', async () => {
    // Precondition for the walk above: a cursor that lost microseconds would repeat these rows.
    const rows = await ctx.db
      .select({ timestamps: countDistinct(contacts.createdAt) })
      .from(contacts)
      .where(eq(contacts.lastName, 'Twin'))
    expect(rows).toEqual([{ timestamps: 1 }])
  })
})

describe('GET /api/v1/contacts — jumping to a page', () => {
  it('skips rows with an offset, then continues with cursors from there', async () => {
    const base = '/api/v1/contacts?q=sam%20twin&limit=20&sort=name&order=asc'
    const { body: first } = await getJson<ContactPage>(base)
    const { body: second } = await getJson<ContactPage>(`${base}&cursor=${first.page.nextCursor}`)
    const { body: jumped } = await getJson<ContactPage>(`${base}&offset=20`)

    expect(jumped.data).toEqual(second.data)
    expect(jumped.page.prevCursor).not.toBeNull()
    const { body: back } = await getJson<ContactPage>(`${base}&cursor=${jumped.page.prevCursor}`)
    expect(back.data).toEqual(first.data)
  })

  it('refuses a cursor and an offset together', async () => {
    const { body: first } = await getJson<ContactPage>('/api/v1/contacts?q=sam%20twin')
    const { status } = await getJson(
      `/api/v1/contacts?q=sam%20twin&offset=20&cursor=${first.page.nextCursor}`,
    )
    expect(status).toBe(400)
  })
})

describe('GET /api/v1/contacts/:id', () => {
  it('returns the contact with its tags sorted by name', async () => {
    const { body: page } = await getJson<ContactPage>('/api/v1/contacts?q=lovelace')
    const { status, body } = await getJson<Contact>(`/api/v1/contacts/${page.data[0]?.id}`)

    expect(status).toBe(200)
    expect(body.tags.map((tag) => tag.name)).toEqual(['Customer', 'VIP'])
  })
})
