import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { sql } from 'drizzle-orm'
import Fastify, { type FastifyServerOptions } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import type { Database } from './db/client'
import { registerErrorHandling } from './errors/error-handler'
import { USER_ID_HEADER } from '@crm/shared'
import { activityRoutes } from './modules/activities/activities.routes'
import { contactRoutes } from './modules/contacts/contacts.routes'
import { preferenceRoutes } from './modules/preferences/preferences.routes'
import { tagRoutes } from './modules/tags/tags.routes'
import { registerCurrentUser } from './modules/users/current-user'
import { userRoutes } from './modules/users/users.routes'

type AppOptions = {
  db: Database
  corsOrigins: string[]
  logger: FastifyServerOptions['logger']
}

export async function buildApp({ db, corsOrigins, logger }: AppOptions) {
  const app = Fastify({ logger }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(helmet)
  await app.register(cors, {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['content-type', USER_ID_HEADER],
  })
  registerErrorHandling(app)

  // Liveness: answers without touching the database, so the host's health checks and the
  // keep-awake ping never wake a database that is allowed to sleep when idle.
  app.get('/health', async () => ({ status: 'ok' }))

  // Readiness: 503 when the database is unreachable, for checks that need to know.
  app.get('/health/db', async (_request, reply) => {
    try {
      await db.execute(sql`select 1`)
      return { status: 'ok' }
    } catch {
      return reply.code(503).send({ status: 'unavailable' })
    }
  })

  await app.register(
    async (api) => {
      registerCurrentUser(api, db)
      await api.register(userRoutes, { db })
      await api.register(preferenceRoutes, { db })
      await api.register(contactRoutes, { db })
      await api.register(tagRoutes, { db })
      await api.register(activityRoutes, { db })
    },
    { prefix: '/api/v1' },
  )

  return app
}
