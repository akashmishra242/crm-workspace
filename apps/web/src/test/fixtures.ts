import type { Contact, ContactPage, Tag, User } from '@crm/shared'

export const TEAMMATE: User = {
  id: '5d8a1f2e-3b4c-4d5e-8f6a-7b8c9d0e1f2a',
  name: 'Maya Patel',
  email: 'maya.patel@acme-demo.com',
}

export const TAGS: Tag[] = [
  { id: '7b1c7a52-5d8e-4f5a-9c3e-0c4b1f0b8a01', name: 'Customer', color: 'green' },
  { id: '7b1c7a52-5d8e-4f5a-9c3e-0c4b1f0b8a02', name: 'Lead', color: 'blue' },
  { id: '7b1c7a52-5d8e-4f5a-9c3e-0c4b1f0b8a03', name: 'VIP', color: 'amber' },
]

let sequence = 0

export function makeContact(overrides: Partial<Contact> = {}): Contact {
  sequence += 1
  const suffix = String(sequence).padStart(12, '0')
  return {
    id: `0f4f6a2e-1c2b-4d3e-8f9a-${suffix}`,
    firstName: 'Ada',
    lastName: `Lovelace ${sequence}`,
    email: `ada${sequence}@example.com`,
    phone: '+14155550123',
    company: 'Analytical Engines',
    tags: [],
    version: 1,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    lastActivityAt: '2026-11-01T10:00:00.000Z',
    createdBy: null,
    updatedBy: null,
    ...overrides,
  }
}

export function makePage(
  contacts: Contact[],
  page: Partial<ContactPage['page']> = {},
): ContactPage {
  return { data: contacts, page: { nextCursor: null, prevCursor: null, ...page } }
}
