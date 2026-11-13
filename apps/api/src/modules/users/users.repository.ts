import type { User } from '@crm/shared'
import { asc, eq } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { users } from '../../db/schema'

const userColumns = { id: users.id, name: users.name, email: users.email }

export function findUsers(db: Database): Promise<User[]> {
  return db.select(userColumns).from(users).orderBy(asc(users.name))
}

export async function findUserById(db: Database, id: string): Promise<User | undefined> {
  const [user] = await db.select(userColumns).from(users).where(eq(users.id, id))
  return user
}
