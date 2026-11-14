import { z } from 'zod'
import type { User } from './user'

export const TAG_COLORS = [
  'gray',
  'blue',
  'green',
  'amber',
  'red',
  'purple',
  'pink',
  'teal',
] as const
export type TagColor = (typeof TAG_COLORS)[number]

export type Tag = {
  id: string
  name: string
  color: TagColor
}

export const tagCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tag name is required')
    .max(40, 'Keep tag names under 40 characters'),
  color: z.enum(TAG_COLORS).default('gray'),
})
export type TagCreateInput = z.input<typeof tagCreateSchema>

export const tagListQuerySchema = z.object({
  q: z.string().trim().max(40).optional(),
})

export const assignTagSchema = z.object({
  tagId: z.uuid(),
})

const BULK_TAG_ACTIONS = ['add', 'remove'] as const
export type BulkTagAction = (typeof BULK_TAG_ACTIONS)[number]

/** Matches the largest page size, so "select all on this page" always fits in one request. */
export const BULK_TAG_LIMIT = 1000

export const bulkTagSchema = z.object({
  contactIds: z.array(z.uuid()).min(1).max(BULK_TAG_LIMIT),
  tagId: z.uuid(),
  action: z.enum(BULK_TAG_ACTIONS),
})
export type BulkTagInput = z.infer<typeof bulkTagSchema>

export type BulkTagResult = {
  updatedCount: number
  unchangedCount: number
  notFoundIds: string[]
}

/** One bulk request, kept so the team can see who changed what in bulk and with what result. */
export type BulkActionRecord = {
  id: string
  action: BulkTagAction
  /** A snapshot: the tag may be renamed or deleted later. */
  tag: { id: string | null; name: string; color: TagColor }
  requestedCount: number
  updatedCount: number
  unchangedCount: number
  notFoundCount: number
  actor: User | null
  status: 'completed'
  createdAt: string
  completedAt: string
}

export const bulkActionListQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
})

export const BULK_ACTION_PAGE_SIZE = 25

export type BulkActionPage = {
  data: BulkActionRecord[]
  nextCursor: string | null
}
