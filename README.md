# CRM Workspace

A CRM contacts workspace: browse, search, filter and sort a large contact list, edit contacts
without overwriting a teammate's changes, tag contacts one at a time or in bulk, and see who
changed what.

- **Live app:** https://crm-workspace-flame.vercel.app (the free API may take ~50 s to wake up)
- **Walkthrough video:** [Google Drive folder](https://drive.google.com/drive/folders/1zlfCcFtLt7Dwm2nYGbvzvHzTildGAJjW?usp=sharing)
- **Design notes:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), with diagrams

## Running it locally

You need Node 22+ and pnpm (`corepack enable`). Nothing else: locally the API uses PGlite, an
embedded build of Postgres that keeps its data in `apps/api/.data/`.

```bash
pnpm install
pnpm db:seed      # creates the schema and loads 2,000 sample contacts (run with the API stopped)
pnpm dev          # API on http://localhost:4000, app on http://localhost:5173
```

| Command                                         | What it does                                 |
| ----------------------------------------------- | -------------------------------------------- |
| `pnpm test`                                     | Shared, API and frontend tests               |
| `pnpm lint` / `pnpm typecheck` / `format:check` | ESLint, strict TypeScript, Prettier          |
| `pnpm build`                                    | Production builds of the API and the app     |
| `pnpm db:seed -- --count 100000`                | A bigger data set                            |
| `pnpm --filter @crm/api db:benchmark`           | Times the real queries on 1,000,000 contacts |

To use a hosted Postgres instead of PGlite, set `DATABASE_URL` in `apps/api/.env`.

There is no login. The teammate picker at the bottom of the sidebar decides who you're acting as,
and each browser tab can be a different teammate, which is the easiest way to try two people
editing the same contact.

## Deployment

| Part     | Where  | Notes                                                                               |
| -------- | ------ | ----------------------------------------------------------------------------------- |
| Database | Neon   | 100,000 seeded contacts: `DATABASE_URL=… pnpm db:seed -- --count 100000`            |
| API      | Render | Defined in `render.yaml`; runs migrations on start. Needs `DATABASE_URL`            |
| App      | Vercel | Root `apps/web`. `vercel.json` forwards `/api` to the API, so both share one origin |

The app always calls `/api` on its own origin (Vite forwards it in development, Vercel in
production), so there's no CORS setup, no preflight request and no API URL to configure.

## What it covers

| The brief asks for                                | Where it is                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Browse and view contacts                          | Contacts table (cards on phones), contact page                                 |
| Search by name, email or phone                    | One search box; phone search ignores formatting, so `(415) 555` finds `+1415…` |
| Filter on at least two attributes                 | Tags (any/all), created date, and a condition per field: see below             |
| Sort by name and created date                     | Column headers and the sort menu                                               |
| Paginated results, done by the backend            | 20 to 1,000 rows per page, Prev/Next, or type a page number                    |
| Update a contact                                  | Inline form, validation, Ctrl/Cmd + S                                          |
| View, add and remove tags                         | Tag panel on the contact page; create a tag from the picker                    |
| Bulk tag selected contacts                        | Select rows, then add or remove a tag; a history page lists every run          |
| Email unique when present                         | Partial unique index; clear error next to the field                            |
| Detect stale updates                              | Version check, 409, and a merge dialog (see "Concurrent updates")              |
| Activity history                                  | Created, updated (with before/after), tag added/removed, with the teammate     |
| Loading, empty, invalid, failure, conflict states | Skeletons, two kinds of empty state, field errors, retry, merge dialog         |

**Field filters.** First name, last name, email, phone and company each take a condition: _exists_,
_does not exist_, _is_, _is not_, _contains_ or _does not contain_ (first name has no "exists",
since it is required). "Is not" and "does not contain" also match contacts with no value at all. The
URL holds them as `email=contains:acme`, so a filtered view can be bookmarked or shared.

On top of the brief: resizable, reorderable columns; a customisable contact page; stepping through
contacts with ← / →; Ctrl/Cmd + K to find any contact; keyboard selection; a bulk action history;
"created by" and "last changed by" on each contact; settings and layout that follow you to other
devices; changes made in one tab appear in your other tabs; lists you've seen open instantly and
stay readable offline; and the app can be installed.

## Tech stack, and why each piece

### Frontend

| Choice                              | Why                                                                                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **React 19 + TypeScript**           | The brief prefers Vue. React is what I'm fastest and most precise in, and the structure (feature folders, query hooks, shared schemas) maps onto Vue 1:1. |
| **Vite**                            | Fast dev server, and Rollup for production code splitting.                                                                                                |
| **TanStack Query**                  | Server data needs caching, request cancellation, deduplication and background refresh. Writing that by hand is where bugs come from.                      |
| **nuqs**                            | Search, filters, sort and page live in the URL, typed and validated, without copying the URL into component state.                                        |
| **TanStack Virtual**                | A 1,000-row page renders about 30 rows at a time. Pages up to 100 render normally, so the browser's own find still works.                                 |
| **Radix primitives + Tailwind**     | Radix gives tested keyboard and screen-reader behaviour for dialogs, menus, selects and switches; Tailwind lets me style them to one look.                |
| **cmdk, react-day-picker, dnd-kit** | Searchable dropdowns and quick find; the date range calendar; drag-to-reorder that also works from the keyboard.                                          |
| **React Hook Form + Zod**           | Dirty tracking for the save bar and the minimal PATCH; the same Zod schemas as the API.                                                                   |
| **vite-plugin-pwa + IndexedDB**     | The app shell is precached and the query cache is persisted, so return visits are instant and lists stay readable offline.                                |
| **Sonner, lucide-react**            | Toasts with a countdown; one icon set.                                                                                                                    |

The UI follows a few rules so screens feel the same everywhere: a single choice from a list is a
`Select`, several choices are a `MultiSelect` dropdown (it scales to hundreds of tags where open
checkboxes don't), an ordered list is a sortable list inside a dropdown, an on/off setting is a
`Switch`, removing something asks first in a `ConfirmDialog`, and buttons are disabled only when
pressing them would do nothing. No browser-native `<select>` or date input is left, because they
look different in every browser.

All interface text lives in one typed message file (`apps/web/src/i18n/en.ts`). Adding a language
means adding a file of the same shape; TypeScript reports any missing message.

### Backend and tooling

| Choice                               | Why                                                                                                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fastify**                          | Fast, small, and schema-first: routes validate with the shared Zod schemas through `fastify-type-provider-zod`.                                                          |
| **PostgreSQL** (Neon / PGlite)       | See "Decisions". PGlite runs the same Postgres in-process for local development and tests, with no install.                                                              |
| **Drizzle ORM**                      | Typed queries that stay close to SQL, so keyset conditions and generated columns read as what they are; SQL migrations in git.                                           |
| **pnpm workspaces**                  | Three packages share one lockfile; `workspace:*` links `packages/shared` without publishing; strict installs catch undeclared dependencies; faster and smaller than npm. |
| **Vitest, Testing Library, MSW**     | One test runner everywhere; tests that act like a user against a mocked network.                                                                                         |
| **ESLint, Prettier, GitHub Actions** | CI runs format check, lint, typecheck, tests and build on every push.                                                                                                    |

## Decisions and trade-offs

### Frontend

**The URL is the list's state.** Search, filters, sort and page live in the query string, so a view
survives a reload and works with Back. Typing updates the URL at once; the request waits until
typing pauses for 300 ms, and older requests are aborted. Changing a filter resets to page 1 in the
same update.

**Server data lives in TanStack Query, nowhere else.** Previous results stay on screen, dimmed,
while the next ones load. Next/Prev and the page box are disabled while a page loads, so a double
click moves one page. Saving a contact isn't optimistic (it can conflict); tag changes are, and roll
back if the server refuses.

**Big pages are virtualized; small ones aren't.** The page-size menu goes to 1,000, and above 100
rows only the visible rows exist in the DOM. Keeping small pages plain keeps the browser's own
find-in-page working.

**Code is split by what you use.** Drawers, dialogs, the contact page and the bulk actions page are
separate chunks. Hovering the button that opens one starts loading it, and the rest load when the
browser is idle. Libraries are split into long-cached vendor chunks, so a deploy only re-downloads
the app's own code (about 40 kB gzipped for the main entry).

**Preferences are local-first and synced.** Columns, page size, the contact page layout, the last
open panel and settings apply instantly from localStorage, then sync in the background: one request
a second after the last change, sent on tab close, retried when back online, and the newest write
wins. Other tabs follow through the `storage` event. Column widths are percentages, so a layout made
on a laptop fits a big monitor.

**Preloading on hover is opt-in.** Resting the pointer on a row or on Next can load it before the
click. It's a setting, off by default, because it spends requests on rows that may never be opened.

**Offline: read, don't queue writes.** The service worker caches only the app itself, never API
responses. Lists you've seen are restored from IndexedDB. Saving needs a connection and says so;
an edit replayed hours later would most likely conflict.

### Backend

**Postgres, though the brief allows something lighter.** "Email is unique when present" is a partial
unique index, so the database enforces it even when two saves race. Substring search over millions
of rows needs a trigram index; SQLite only offers that through a separate FTS5 table I'd have to
keep in sync. Postgres gives the trigram index on a generated column, the partial unique index and
row locks in one place.

**Keyset pagination, with a jump.** Next and Prev use a cursor on `(sort value, id)`, so every page
costs the same however deep it is. Typing a page number uses `OFFSET` once, and from there Next and
Prev continue with cursors. A jump to page 4,000 of 100,000 contacts reads and skips 80,000 rows,
which is fine for an occasional jump but not for every page; the offset is capped at 1,000,000.

**One set of validation rules.** The Zod schemas in `packages/shared` trim names, lowercase emails,
convert phones to E.164 and produce the error messages. The API and every form use them, so the two
can't drift.

**A teammate picker instead of authentication.** Login was out of scope, but "who changed this?"
matters in a CRM. The app sends the chosen teammate's id with each request; the API records it on
every activity entry, on the contact (created by, last changed by) and on each bulk run.

## Concurrent updates

Every contact has a `version`. Saving sends only the changed fields plus the version the form started
from. The API locks the row (`SELECT … FOR UPDATE`), and if the version moved on it answers
`409 Conflict` with the current contact. Of two simultaneous saves, one gets `200` and the other the
`409`. The app then does a three-way merge between what the form started from, your edits and the
latest copy: fields only one person changed are combined automatically, and only fields you both
changed are shown side by side. Locking a record while someone types would block everyone else.

Tags don't bump the version: a colleague tagging a contact shouldn't block your phone-number edit.
The cost is a real edge case: if a tag means something about a field ("Invalid email" while you fix
the email), the two can disagree without a conflict. A workflow like that would need the tag change
to carry the version too.

## Data model

```
contacts            id, first_name, last_name, email (unique when present), phone (E.164), company,
                    version, created_at, updated_at, last_activity_at, created_by, updated_by,
                    sort_name   (generated: lower-cased full name, for sorting)
                    search_text (generated: name, email and phone digits, trigram-indexed)
tags                id, name (unique, case-insensitive), color
contact_tags        contact_id + tag_id (primary key), created_at
contact_activities  id, contact_id, actor_id, type, payload (JSON snapshot), created_at
bulk_actions        id, action, tag snapshot, requested/updated/unchanged/not-found counts, actor_id, created_at
users               id, name, email
user_preferences    user_id + key (primary key), value (JSON), updated_at
```

Indexes: trigram on `search_text` and on `lower(company)`; `(sort_name, id)` and `(created_at, id)`
for paging; `(tag_id, contact_id)` for tag filters; `(contact_id, created_at, id)` for the timeline.

## Testing

Tests target what is most likely to break. 95 in total.

- **API (49, real SQL on PGlite):** stale saves and simultaneous saves; email uniqueness with case
  and missing emails; no-op saves; activity and authors; bulk counts and the bulk log; every filter
  operator, including phone formatting and literal `%`; walking every page both ways over identical
  names; jumping by offset and continuing with cursors; preference sync never letting an older write
  win.
- **Frontend (37, Testing Library + MSW):** URL and debounced search; empty, error and invalid-filter
  states; a condition filter end to end; page jumps; a double click on Next; selection mode with
  Shift ranges and Enter; bulk tagging; saving only changed fields; the conflict merge; tag removal
  asking first and the activity updating at once; the customize drawer's draft and locked panel;
  hover preloading only when switched on; the preference store's sync rules.
- **Shared (9):** normalisation, validation messages and the condition format.

## Scale considerations

Measured on 1,000,000 synthetic contacts (`db:benchmark`, in-memory Postgres on a laptop, median
of 5):

| Query                                  |     Time |
| -------------------------------------- | -------: |
| First page, newest first / by name     |    ~2 ms |
| Page 98% deep by name, keyset cursor   |   2.3 ms |
| Same page with `OFFSET 980000`         | 3,972 ms |
| Search "lovelace" / phone "415 000 12" |    ~5 ms |
| Filter by one tag (5% of contacts)     |   5.7 ms |
| Exact count of all / of a search       |  ~200 ms |

What I would change in production:

- **Millions of contacts per large account:** put the account id first in every index and partition
  contacts by account, so one big customer can't slow the others. Replace exact counts with
  maintained counters or estimates for large results.
- **Millions of updates a day:** that's only about 12 writes a second on average, each a single-row
  transaction, but bursts come from imports and bulk work. Bulk changes become background jobs that
  work in chunks (the `bulk_actions` table already gives them a home and a status). Partition the
  activity table by month and archive old months.
- **Frequent searches and filters:** move search to OpenSearch or Elasticsearch, fed from the
  database's change stream, for typo tolerance, ranking, custom fields and cheap counts. Cache
  common filtered counts briefly.
- **Many simultaneous users:** the API keeps no session state, so it scales out behind a load
  balancer; add a connection pooler and read replicas, rate-limit per account, and push "contact
  changed" events over SSE so conflicts show up before anyone presses Save (today that only happens
  between tabs of one browser).

## Known issues

- No real authentication; the teammate picker is for demonstration only.
- Bulk actions work on the selected contacts (up to 1,000 at a time), not on "everything matching
  the filter".
- Deep page jumps use `OFFSET`; jumping near the end of a huge account is slower than stepping.
- Date filters use UTC days.
- Searches of one or two characters can't use the trigram index, so they're slower on very large
  accounts.
- The free API sleeps when idle; the first request after a pause can take about 50 s, and the app
  says so while it waits. A GitHub Actions job pings a database-free health check every 10 minutes
  during Indian daytime, so the database still sleeps when nobody is using it.
- Viewed lists stay in IndexedDB for up to a day, which matters on a shared computer; a real
  deployment would clear them on sign-out.
- Only English is written; the message file is ready for more.

## AI usage

I built this with AI tools as a force multiplier: **Claude Code** for most of the work, and
**ChatGPT** now and then for a second opinion. They drafted most of the code, tests and these docs,
proposed options for the architecture, and reviewed changes for bugs. The decisions were mine: the
stack and hosting (React over Vue, Postgres over SQLite, free Neon, Render and Vercel), the scope and
the UX, which of the proposed designs to keep, and the trade-offs above. I reviewed the output,
tested it in the browser and pushed back where it fell short.

Suggestions I changed or rejected:

- **Preloading on hover was on for everyone.** I made it an opt-in setting, off by default: it
  spends requests on rows that are never opened, and the API runs on a free tier.
- **The first seed had 10,000 contacts.** The brief talks about millions, so I asked for 100,000 in
  the live database and a benchmark on 1,000,000 to back the claims with numbers.
- **Filters started as open tag checkboxes and present/missing toggles.** That doesn't scale past a
  handful of tags and can't say "email contains acme", so I asked for a searchable tag dropdown and a
  condition per field.
- **Locked columns and panels could still be dragged.** I wanted them pinned first and fixed, so the
  list always shows the real order.
