import { z } from 'zod'

export const contactIdParams = z.object({
  id: z.uuid('Contact id must be a UUID'),
})

export const contactTagParams = contactIdParams.extend({
  tagId: z.uuid('Tag id must be a UUID'),
})
