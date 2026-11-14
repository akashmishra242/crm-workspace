/**
 * Loads a large synthetic data set into an in-memory database and times the list queries
 * the app actually runs. It never connects to DATABASE_URL, so it can't touch a real database.
 *
 *   pnpm --filter @crm/api db:benchmark -- --count 1000000
 */
import { parseArgs } from 'node:util'
import { contactFiltersSchema, contactListQuerySchema } from '@crm/shared'
import { sql } from 'drizzle-orm'
import { countContacts } from '../modules/contacts/contacts.repository'
import { listContacts } from '../modules/contacts/contacts.service'
import { encodeContactCursor } from '../modules/contacts/cursor'
import { connectDatabase } from './client'
import { tags } from './schema'

const CHUNK = 100_000
const RUNS = 5

const FIRST_NAMES = [
  'Ada',
  'Alan',
  'Grace',
  'Linus',
  'Margaret',
  'Dennis',
  'Barbara',
  'Ken',
  'Radia',
  'Tim',
  'Frances',
  'John',
  'Mary',
  'James',
  'Priya',
  'Arjun',
  'Sofia',
  'Maya',
  'Jordan',
  'Wei',
  'Fatima',
  'Omar',
  'Elena',
  'Lucas',
  'Hana',
  'Kenji',
  'Amara',
  'Diego',
  'Nora',
  'Ivan',
  'Zara',
  'Leo',
  'Ines',
  'Raj',
  'Chloe',
  'Mateo',
  'Aisha',
  'Noah',
  'Mia',
  'Eli',
]
const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Lee',
  'Garcia',
  'Patel',
  'Khan',
  'Nguyen',
  'Brown',
  'Lovelace',
  'Hopper',
  'Turing',
  'Torvalds',
  'Hamilton',
  'Ritchie',
  'Liskov',
  'Thompson',
  'Perlman',
  'Berners',
  'Allen',
  'Rao',
  'Silva',
  'Muller',
  'Rossi',
  'Kim',
  'Tanaka',
  'Haddad',
  'Okafor',
  'Novak',
  'Fischer',
  'Costa',
  'Ivanova',
  'Jensen',
  'Moreau',
  'Ali',
  'Chen',
  'Wright',
]

const textArray = (values: string[]) =>
  sql.raw(`ARRAY[${values.map((value) => `'${value}'`).join(',')}]`)

// pnpm forwards the `--` separator, so drop it before parsing (same as the seed script).
const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== '--'),
  options: { count: { type: 'string', default: '1000000' } },
})
const count = Number(values.count)
if (!Number.isInteger(count) || count < 1) {
  throw new Error(`--count must be a whole number above 0, got "${values.count}"`)
}

const { db, migrate, close } = await connectDatabase({})
await migrate()
const [tag] = await db.insert(tags).values({ name: 'VIP', color: 'amber' }).returning()
if (!tag) throw new Error('Could not create the benchmark tag')

console.info(`Loading ${count.toLocaleString('en-US')} contacts…`)
const loadStart = performance.now()
for (let start = 1; start <= count; start += CHUNK) {
  const end = Math.min(start + CHUNK - 1, count)
  await db.execute(sql`
    INSERT INTO contacts (first_name, last_name, email, phone, company, created_at, updated_at)
    SELECT
      (${textArray(FIRST_NAMES)})[1 + (g * 7) % ${FIRST_NAMES.length}],
      (${textArray(LAST_NAMES)})[1 + (g * 13) % ${LAST_NAMES.length}],
      CASE WHEN g % 10 = 0 THEN NULL ELSE 'user' || g || '@example.com' END,
      '+1' || (200 + g % 700) || lpad((g % 10000000)::text, 7, '0'),
      CASE WHEN g % 5 = 0 THEN NULL ELSE 'Company ' || (g % 5000) END,
      now() - make_interval(secs => (g * 37) % 63072000),
      now()
    FROM generate_series(${start}::int, ${end}::int) AS g`)
}
await db.execute(sql`
  INSERT INTO contact_tags (contact_id, tag_id)
  SELECT id, ${tag.id} FROM contacts WHERE abs(hashtext(id::text)) % 20 = 0`)
await db.execute(sql`ANALYZE`)
console.info(`Loaded in ${((performance.now() - loadStart) / 1000).toFixed(0)} s\n`)

async function time(run: () => Promise<unknown>): Promise<number> {
  await run()
  const samples: number[] = []
  for (let i = 0; i < RUNS; i += 1) {
    const started = performance.now()
    await run()
    samples.push(performance.now() - started)
  }
  samples.sort((a, b) => a - b)
  return samples[Math.floor(samples.length / 2)] ?? 0
}

const list = (query: Record<string, string>) => () =>
  listContacts(db, contactListQuerySchema.parse(query))
const deepCursor = encodeContactCursor({
  sort: 'name',
  order: 'asc',
  value: 'zara',
  id: '00000000-0000-4000-8000-000000000000',
  direction: 'next',
})
const deepOffset = Math.floor(count * 0.98)

const scenarios: Array<[string, () => Promise<unknown>]> = [
  ['First page, newest first', list({})],
  ['First page, by name', list({ sort: 'name', order: 'asc' })],
  [
    'Page ~98% deep by name (keyset cursor)',
    list({ sort: 'name', order: 'asc', cursor: deepCursor }),
  ],
  [
    `Same depth with OFFSET ${deepOffset.toLocaleString('en-US')} (for comparison)`,
    () =>
      db.execute(sql`SELECT id FROM contacts ORDER BY sort_name, id OFFSET ${deepOffset} LIMIT 20`),
  ],
  ['Search "lovelace"', list({ q: 'lovelace' })],
  ['Search by phone "415 000 12"', list({ q: '415 000 12' })],
  ['Filter by tag (5% of contacts)', list({ tagIds: tag.id })],
  ['Count all contacts', () => countContacts(db, contactFiltersSchema.parse({}))],
  [
    'Count search "lovelace"',
    () => countContacts(db, contactFiltersSchema.parse({ q: 'lovelace' })),
  ],
]

console.info(`| Query (${count.toLocaleString('en-US')} contacts, median of ${RUNS}) | Time |`)
console.info('| --- | ---: |')
for (const [label, run] of scenarios) {
  console.info(`| ${label} | ${(await time(run)).toFixed(1)} ms |`)
}

await close()
