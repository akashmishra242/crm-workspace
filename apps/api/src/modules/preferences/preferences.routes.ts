import { PREFERENCE_KEYS, preferenceWriteSchema } from '@crm/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { Database } from '../../db/client'
import { requireUser } from '../users/current-user'
import { findPreferences, savePreference } from './preferences.repository'

const preferenceParams = z.object({ key: z.enum(PREFERENCE_KEYS) })

export const preferenceRoutes: FastifyPluginAsyncZod<{ db: Database }> = async (app, { db }) => {
  app.get('/me/preferences', (request) => findPreferences(db, requireUser(request).id))

  app.put(
    '/me/preferences/:key',
    { schema: { params: preferenceParams, body: preferenceWriteSchema } },
    (request) => savePreference(db, requireUser(request).id, request.params.key, request.body),
  )
}
