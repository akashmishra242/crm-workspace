import { USER_ID_HEADER, type User } from '@crm/shared'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { Database } from '../../db/client'
import { AppError } from '../../errors/app-error'
import { findUserById } from './users.repository'

declare module 'fastify' {
  interface FastifyRequest {
    /** The teammate named by the user header, or null when the header is absent. */
    currentUser: User | null
  }
}

const userIdSchema = z.uuid()

const unknownUser = () => new AppError('UNAUTHENTICATED', 401, 'Unknown user')

/**
 * There is no login: the client sends a teammate's id in a header. That is enough to
 * attribute changes and to keep preferences per person; it is not access control.
 */
export function registerCurrentUser(app: FastifyInstance, db: Database): void {
  app.decorateRequest('currentUser', null)
  app.addHook('onRequest', async (request) => {
    const header = request.headers[USER_ID_HEADER]
    if (header === undefined) return

    const userId = userIdSchema.safeParse(header)
    if (!userId.success) throw unknownUser()
    const user = await findUserById(db, userId.data)
    if (!user) throw unknownUser()
    request.currentUser = user
  })
}

export function requireUser(request: FastifyRequest): User {
  if (!request.currentUser) {
    throw new AppError('UNAUTHENTICATED', 401, 'Pick a teammate to use this feature')
  }
  return request.currentUser
}

export const actorIdOf = (request: FastifyRequest): string | null => request.currentUser?.id ?? null
