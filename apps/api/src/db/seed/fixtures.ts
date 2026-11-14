import { toE164, type TagColor } from '@crm/shared'
import { Faker, en } from '@faker-js/faker'

/** Fixed ids, so a browser that picked a teammate keeps working after a reseed. */
export const SEED_USERS: ReadonlyArray<{ id: string; name: string; email: string }> = [
  {
    id: '0b6d2c1e-6f0a-4a51-9c3e-1d2f3a4b5c64',
    name: 'Akash Mishra',
    email: 'akash.mishra@acme-demo.com',
  },
  {
    id: '0b6d2c1e-6f0a-4a51-9c3e-1d2f3a4b5c61',
    name: 'Maya Patel',
    email: 'maya.patel@acme-demo.com',
  },
  {
    id: '0b6d2c1e-6f0a-4a51-9c3e-1d2f3a4b5c62',
    name: 'Jordan Lee',
    email: 'jordan.lee@acme-demo.com',
  },
  {
    id: '0b6d2c1e-6f0a-4a51-9c3e-1d2f3a4b5c63',
    name: 'Sofia García',
    email: 'sofia.garcia@acme-demo.com',
  },
]

export const SEED_TAGS: ReadonlyArray<{ name: string; color: TagColor }> = [
  { name: 'Lead', color: 'blue' },
  { name: 'Prospect', color: 'purple' },
  { name: 'Customer', color: 'green' },
  { name: 'VIP', color: 'amber' },
  { name: 'Partner', color: 'teal' },
  { name: 'Newsletter', color: 'gray' },
  { name: 'Churn risk', color: 'red' },
  { name: 'Event 2026', color: 'pink' },
]

/** Tag frequencies are skewed like real CRM data: plenty of leads, few VIPs. */
const TAG_WEIGHTS = [30, 18, 22, 6, 5, 20, 5, 8]

const US_AREA_CODES = [212, 213, 305, 312, 404, 415, 512, 617, 646, 702, 718, 805, 917, 972]

/** Share of contacts that get one edit after creation, so timelines show real diffs. */
const EDITED_SHARE = 0.25

/** Indexes into SEED_USERS and SEED_TAGS keep the fixtures independent of database ids. */
export type SeedContact = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  company: string | null
  createdAt: Date
  createdBy: number
  tags: Array<{ tagIndex: number; addedBy: number }>
  /** The contact's current value is the edit's result; `from` is what it replaced. */
  edit: { field: 'company' | 'phone'; from: string | null; at: Date; by: number } | null
}

export function generateContacts(count: number, now: Date): SeedContact[] {
  const faker = new Faker({ locale: [en] })
  faker.seed(20261113)

  const companies = Array.from({ length: Math.max(20, Math.round(count / 25)) }, () =>
    faker.company.name(),
  )
  const usedEmails = new Set<string>()
  const teammate = () => faker.number.int({ min: 0, max: SEED_USERS.length - 1 })

  return Array.from({ length: count }, () => {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const company = faker.datatype.boolean(0.8) ? faker.helpers.arrayElement(companies) : null
    const phone = faker.datatype.boolean(0.88) ? usPhone(faker) : null
    const createdAt = faker.date.past({ years: 2, refDate: now })

    const editable = (['company', 'phone'] as const).filter((field) =>
      field === 'company' ? company !== null : phone !== null,
    )
    const editField =
      editable.length > 0 && faker.datatype.boolean(EDITED_SHARE)
        ? faker.helpers.arrayElement(editable)
        : null

    return {
      id: faker.string.uuid(),
      firstName,
      lastName,
      email: faker.datatype.boolean(0.92)
        ? uniqueEmail(faker.internet.email({ firstName, lastName }).toLowerCase(), usedEmails)
        : null,
      phone,
      company,
      createdAt,
      createdBy: teammate(),
      tags: pickTags(faker).map((tagIndex) => ({ tagIndex, addedBy: teammate() })),
      edit: editField
        ? {
            field: editField,
            from:
              editField === 'company'
                ? faker.helpers.arrayElement([
                    null,
                    ...companies.filter((name) => name !== company),
                  ])
                : usPhone(faker),
            at: faker.date.between({ from: createdAt, to: now }),
            by: teammate(),
          }
        : null,
    }
  })
}

function uniqueEmail(candidate: string, used: Set<string>): string {
  let email = candidate
  for (let suffix = 2; used.has(email); suffix += 1) {
    email = candidate.replace('@', `${suffix}@`)
  }
  used.add(email)
  return email
}

function usPhone(faker: Faker): string | null {
  const areaCode = faker.helpers.arrayElement(US_AREA_CODES)
  const exchange = faker.number.int({ min: 201, max: 989 })
  const line = faker.string.numeric(4)
  return toE164(`+1${areaCode}${exchange}${line}`)
}

function pickTags(faker: Faker): number[] {
  const tagCount = faker.helpers.weightedArrayElement([
    { value: 0, weight: 15 },
    { value: 1, weight: 40 },
    { value: 2, weight: 30 },
    { value: 3, weight: 15 },
  ])
  const picked = new Set<number>()
  while (picked.size < tagCount) {
    picked.add(
      faker.helpers.weightedArrayElement(
        TAG_WEIGHTS.map((weight, index) => ({ value: index, weight })),
      ),
    )
  }
  return [...picked]
}
