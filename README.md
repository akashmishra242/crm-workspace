# CRM Workspace

A CRM contacts workspace: browse, search, filter and sort a large contact list, edit contacts
without overwriting a teammate's changes, tag contacts one at a time or in bulk, and see who
changed what.

- **Live app:** https://crm-workspace-flame.vercel.app (the free API may take ~50 s to wake up)
- **Walkthrough video:** _link added after recording_
- **Design notes:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Running it locally

You need Node 22+ and pnpm (`corepack enable`). There is nothing else to install: locally the API
uses PGlite, an embedded build of Postgres that stores its data in `apps/api/.data/`.

```bash
pnpm install
pnpm db:seed      # creates the schema and loads 2,000 sample contacts (run with the API stopped)
pnpm dev          # API on http://localhost:4000, app on http://localhost:5173
```

Other commands:

| Command                          | What it does                             |
| -------------------------------- | ---------------------------------------- |
| `pnpm test`                      | Shared, API and frontend tests           |
| `pnpm lint` / `pnpm typecheck`   | ESLint and strict TypeScript             |
| `pnpm build`                     | Production builds of the API and the app |
| `pnpm db:seed -- --count 100000` | Load a bigger data set                   |

To use a hosted Postgres instead of PGlite, set `DATABASE_URL` in `apps/api/.env`.

There is no login. A teammate picker at the bottom of the sidebar decides who you are acting as;
each browser tab can be a different teammate, which is the easiest way to try two people editing
the same contact.

## Deployment

| Part     | Where  | Notes                                                                               |
| -------- | ------ | ----------------------------------------------------------------------------------- |
| Database | Neon   | Seeded once with `DATABASE_URL=… pnpm db:seed -- --count 10000`                     |
| API      | Render | Defined in `render.yaml`; runs migrations on start. Needs `DATABASE_URL`            |
| App      | Vercel | Root `apps/web`. `vercel.json` forwards `/api` to the API, so both share one origin |

The app always calls `/api` on its own origin: Vite forwards it to the API in development and
`vercel.json` does in production. That means no CORS setup, no preflight requests and no API URL
to configure per environment. (The API's `CORS_ORIGIN` setting is only needed if someone calls it
from another domain.)

## Tech stack

| Part     | Choice                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, React Router, nuqs, TanStack Query, React Hook Form, Radix UI, Tailwind CSS |
| Backend  | Node, Fastify, Drizzle ORM                                                                              |
| Database | PostgreSQL (Neon in production, PGlite locally and in tests)                                            |
| Shared   | Zod schemas used by both the API and the forms                                                          |
| Tooling  | Vitest, Testing Library, MSW, ESLint, Prettier, GitHub Actions                                          |

```
apps/api         Fastify API: routes, services (business rules), repositories (SQL)
apps/web         React app, organised by feature: contacts, tags, activity, preferences, users, help
packages/shared  Validation schemas and the request/response types both sides use
```

## What it covers

- **Contacts** with first name, last name, email, phone, company, tags, created and updated dates.
- **Search** by name, email or phone. Phone search ignores formatting, so `(415) 555-01` finds
  `+14155550123`.
- **Filters** by tags (any or all), company, created date, and whether email or phone is present.
- **Sorting** by name or created date, and **pagination** with 20, 50 or 100 rows per page.
- **Contact page** with inline editing, validation, a save bar that appears once something changes,
  and Ctrl/Cmd + S to save.
- **Tags:** add, remove, create on the fly, and add or remove a tag for many selected contacts at once.
- **Activity history** for every change (contact created or updated, tag added or removed), with
  the teammate who made it and a before/after view of edited fields.
- **Concurrent edits** are detected, and the user resolves them in a merge dialog instead of
  silently losing work.
- **All the awkward states:** loading skeletons, "no contacts yet" vs "no matches", failed requests
  with retry, invalid input, offline, and conflicts.

On top of the brief:

- Show, hide, reorder and resize table columns.
- Change the contact page layout (three panels or two columns, panel order, which details show on
  the contact card).
- Step through contacts from the detail page (← / →).
- Keyboard-friendly: ↑/↓ through the list, Space to select, Enter to open, N for a new contact,
  Ctrl/Cmd + K to jump to any contact. Press `?` for the full list.
- Once you select a contact, clicking other rows adds them to the selection instead of opening
  them, which makes bulk tagging quick.
- Layout and page size follow you to another device.
- Edits in one tab show up in your other tabs straight away.
- Lists you've already viewed open instantly on the next visit and stay readable offline.

## Decisions and trade-offs

**React rather than Vue.** The brief prefers Vue. I went with React because it is what I know best
and can defend line by line, and because two libraries I wanted (nuqs for URL state, React Hook Form)
fit the problem well. The structure (feature folders, query hooks, shared schemas) would carry over
to Vue almost unchanged.

**Postgres, even though the brief allows something lighter.** "Email is unique when present" is a
partial unique index, so the database enforces it even when two saves race. Substring search over
millions of rows needs a trigram index (`pg_trgm`), which SQLite doesn't have. Transactions keep a
change and its activity entry together. PGlite runs the same Postgres locally with no setup, so I
didn't have to trade "easy to run" for "correct at scale".

**Keyset pagination instead of `OFFSET`.** With `OFFSET`, page 50,000 makes the database read and
throw away a million rows; with a cursor on `(sort value, id)` every page costs the same. The UI
still shows "Page 3 of 500" because the total comes from a separate count request that runs in
parallel. The trade-off is that you can't jump straight to page 37. In practice people filter
rather than page that deep.

**Optimistic concurrency with a merge step.** Every contact has a `version`. Saving sends the
version the form started from; if someone saved in between, the API answers `409 Conflict` with the
latest contact. When two people save at the same moment, the row lock makes one of them win with
`200 OK` and the other get the `409`. The app then does a three-way merge: fields only one person changed are combined
automatically, and only fields both people changed are shown side by side to choose from. Locking a
record while someone types would be worse for everyone else.

**Tags don't bump the version.** Adding or removing a tag can't conflict with a field edit, so it
would be wrong for a colleague tagging a contact to block your phone-number change. Tag changes
are applied instantly on screen and rolled back if the server refuses them.

**The URL holds the list state.** Search, filters, sort and page live in the query string (via
nuqs), so a view can be bookmarked, shared, reloaded and navigated with Back. Nothing copies the URL
into component state with effects. Typing updates the URL right away, while the request waits until
typing pauses for 300 ms. Changing a filter resets to page 1 in the same handler.

**One set of validation rules.** The Zod schemas in `packages/shared` trim names, lowercase
emails, convert phones to E.164 and produce the error messages. The API and every form use the same
schemas, so the two can't drift apart.

**Preferences are local-first.** Column layout, page size and the contact page layout apply
instantly from localStorage, then sync to the server in the background. Writes are debounced (one
request after a column drag, not one per pixel), flushed when the tab is hidden, and retried when the
connection comes back. If another device saved something newer, it wins. Column widths are
stored as percentages, so a layout saved on a laptop still fits a large monitor.

**A teammate picker instead of authentication.** Real login was out of scope, but "who changed
this?" matters in a CRM. The app sends the chosen teammate's id with each request and the API
records it on every activity entry.

**What I deliberately left out.**

- _Row virtualisation and Web Workers._ The server never sends more than 100 rows and does all the
  searching and sorting, so there is nothing heavy to offload.
- _Offline editing with a write queue._ An edit replayed hours later would most likely hit a
  conflict, long after the person thought it was saved. Reading works offline; saving needs a
  connection, fails straight away without one, and the app says so.

**Caching, offline and the service worker.** The service worker caches only the app itself (HTML,
JS, CSS, fonts), so it loads instantly and opens offline. Data is cached separately: TanStack Query's
cache is saved to IndexedDB, so lists you've seen show up immediately on the next visit and are
refreshed in the background. Single contacts are always fetched fresh, so an edit never starts
from an old copy. I used TanStack's own persister rather than Dexie: I
only need to store and restore the cache, not query it, and this keeps one source of truth for
server data.

## Data model

```
contacts            id, first_name, last_name, email (unique when present), phone (E.164), company,
                    version, created_at, updated_at, last_activity_at,
                    sort_name   (generated: lower-cased full name, for sorting)
                    search_text (generated: name, email and phone digits, trigram-indexed)
tags                id, name (unique, case-insensitive), color
contact_tags        contact_id + tag_id (primary key), created_at
contact_activities  id, contact_id, actor_id, type, payload (JSON), created_at
users               id, name, email
user_preferences    user_id + key (primary key), value (JSON), updated_at
```

Indexes:

- `contacts`: trigram search; `(sort_name, id)` and `(created_at, id)` for paging; a company prefix
  index.
- `contact_tags`: `(tag_id, contact_id)` for tag filters.
- `contact_activities`: `(contact_id, created_at, id)` for the timeline.

## Testing

I focused the tests on the places most likely to break.

**API (42 tests, real SQL on PGlite):**

- stale saves get a 409, and of two simultaneous saves exactly one wins;
- email uniqueness, including case and missing emails;
- a save with no real changes writes nothing;
- activity entries and their author;
- bulk tagging is idempotent and reports correct counts;
- search by formatted phone;
- walking every page forwards and backwards over hundreds of identical names, with no duplicates
  or gaps;
- preference sync where an older write never overwrites a newer one.

**Frontend (26 tests, Testing Library + MSW):**

- search updates the URL, resets the page and sends a single request;
- empty, error and invalid-filter states recover;
- bulk tagging;
- only changed fields are sent on save;
- validation and duplicate-email errors appear on the right field;
- the full conflict-merge flow;
- keyboard navigation, selection mode and the N / ? shortcuts;
- the preference store's sync rules, including a change made while an earlier save is in
  flight.

**Shared (6 tests):** validation and normalisation.

## Scale

The brief asks what changes with millions of contacts, millions of updates a day, frequent
searches and many users.

**What this design already handles:**

- **Millions of contacts:** every list query uses an index, and a cursor page costs the same
  however deep it is.
- **Millions of updates a day:** that is about 12 writes a second on average, each a single-row
  transaction.
- **Many users:** the API keeps no session state, so it can run as many instances as needed.

**What I would change in production:**

1. **Accounts:** add an account id as the first column of every index and partition the contacts
   table by it, so one big customer doesn't slow down the rest.
2. **Search:** move it to OpenSearch or Elasticsearch, fed from the database's change stream. That
   brings typo tolerance, relevance ranking, custom-field filters and cheap counts.
3. **Counts:** keep per-tag and per-account counters instead of counting rows on every request.
4. **Bulk work:** "tag all 2 million matching contacts" becomes a background job that works through
   the list in chunks and reports progress.
5. **Activity:** partition the activity table by month and archive old months.
6. **Reads:** add read replicas and a connection pooler, and rate-limit per account.
7. **Live updates:** push "contact changed" events to open browsers over SSE or WebSockets, so
   conflicts show up before anyone presses Save. Today that only happens between tabs of the same
   browser.

## Known issues

- No real authentication; the teammate picker is for demonstration only.
- Pagination is First / Previous / Next; there's no jumping to an arbitrary page number.
- Bulk actions work on up to 500 selected contacts at a time.
- Date filters use UTC days.
- One- and two-character searches can't use the trigram index, so on a very large account they are
  slower.
- The free hosting tier sleeps when idle; the first request after a pause can take about 50
  seconds, and the app shows a message while it waits. A GitHub Actions job
  (`keep-api-warm.yml`) pings the API every 10 minutes during Indian daytime to avoid this. It
  hits a liveness endpoint that never queries the database, so the database still sleeps when
  nobody is using the app.
- Viewed lists stay in the browser's IndexedDB for up to a day, which matters on a shared
  computer. A real deployment would clear them on sign-out.
- Single-key shortcuts (`/`, `N`, `?`) can't be switched off yet. They never fire while typing
  in a field.
