import { z } from 'zod'
import type { ContactField } from './contact'
import type { TagColor } from './tag'
import type { User } from './user'

export const ACTIVITY_TYPES = [
  'CONTACT_CREATED',
  'CONTACT_UPDATED',
  'TAG_ADDED',
  'TAG_REMOVED',
] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export type FieldChange = {
  from: string | null
  to: string | null
}

export type ContactChanges = Partial<Record<ContactField, FieldChange>>

export type TagActivityPayload = {
  tagId: string
  tagName: string
  tagColor: TagColor
  source: 'single' | 'bulk'
}

type ActivityBase = {
  id: string
  contactId: string
  /** Who made the change; null for system changes such as the initial import. */
  actor: User | null
  createdAt: string
}

export type Activity = ActivityBase &
  (
    | { type: 'CONTACT_CREATED'; payload: Record<string, never> }
    | { type: 'CONTACT_UPDATED'; payload: { changes: ContactChanges } }
    | { type: 'TAG_ADDED' | 'TAG_REMOVED'; payload: TagActivityPayload }
  )

export const ACTIVITY_PAGE_SIZE = 20

export const activityListQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
})

export type ActivityPage = {
  data: Activity[]
  nextCursor: string | null
}
