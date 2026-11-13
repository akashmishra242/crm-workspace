import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres'
import { migrate as migrateNodePg } from 'drizzle-orm/node-postgres/migrator'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import pg from 'pg'
import type { Env } from '../config/env'
import * as schema from './schema'

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>

type DatabaseConnection = {
  db: Database
  migrate: () => Promise<void>
  close: () => Promise<void>
}

type ConnectOptions =
  /** Hosted Postgres (Neon in production). */
  | { url: string }
  /** Embedded Postgres. Omit `dataDir` for an in-memory database (tests). */
  | { dataDir?: string }

const migrationsFolder = path.resolve(process.cwd(), 'drizzle')

export function connectionOptionsFromEnv(env: Env): ConnectOptions {
  return env.DATABASE_URL ? { url: env.DATABASE_URL } : { dataDir: env.PGLITE_DATA_DIR }
}

export async function connectDatabase(options: ConnectOptions): Promise<DatabaseConnection> {
  if ('url' in options) {
    const pool = new pg.Pool({ connectionString: options.url, max: 10 })
    const db = drizzleNodePg(pool, { schema, casing: 'snake_case' })
    return {
      db,
      migrate: () => migrateNodePg(db, { migrationsFolder }),
      close: () => pool.end(),
    }
  }

  if (options.dataDir) {
    await mkdir(options.dataDir, { recursive: true })
  }
  const client = await PGlite.create(options.dataDir, { extensions: { pg_trgm } })
  const db = drizzlePglite(client, { schema, casing: 'snake_case' })
  return {
    db,
    migrate: () => migratePglite(db, { migrationsFolder }),
    close: () => client.close(),
  }
}
