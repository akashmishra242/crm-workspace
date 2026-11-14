import { z } from 'zod'
import { toE164 } from './phone'
import type { Tag } from './tag'

export const CONTACT_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'company'] as const
export type ContactField = (typeof CONTACT_FIELDS)[number]

const emptyToNull = (value: string) => (value === '' ? null : value)
const emailFormat = z.email()

const firstName = z
  .string()
  .trim()
  .min(1, 'First name is required')
  .max(100, 'Keep first name under 100 characters')

const lastName = z.string().trim().max(100, 'Keep last name under 100 characters')

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long')
  .refine(
    (value) => value === '' || emailFormat.safeParse(value).success,
    'Enter a valid email address',
  )
  .transform(emptyToNull)
  .nullable()

const phone = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === '') return null
    const e164 = toE164(value)
    if (!e164) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid phone number' })
      return z.NEVER
    }
    return e164
  })
  .nullable()

const company = z
  .string()
  .trim()
  .max(120, 'Keep company under 120 characters')
  .transform(emptyToNull)
  .nullable()

/** Single source of truth for contact field rules: used by the API and by every form. */
export const contactFieldsSchema = z.object({ firstName, lastName, email, phone, company })
export type ContactFormValues = z.input<typeof contactFieldsSchema>
export type ContactFields = z.output<typeof contactFieldsSchema>

export const contactCreateSchema = contactFieldsSchema
  .partial({ lastName: true, email: true, phone: true, company: true })
  .extend({
    /** Tags to apply as the contact is created, each recorded as its own activity. */
    tagIds: z.array(z.uuid()).max(20, 'Choose at most 20 tags').optional(),
  })
export type ContactCreateInput = z.input<typeof contactCreateSchema>

export const contactUpdateSchema = contactFieldsSchema.partial().extend({
  version: z.int().positive(),
})
export type ContactUpdateInput = z.input<typeof contactUpdateSchema>

export type Contact = ContactFields & {
  id: string
  tags: Tag[]
  version: number
  createdAt: string
  updatedAt: string
  lastActivityAt: string | null
  /** Teammate ids; null when the change came from the seed script or the user was removed. */
  createdBy: string | null
  updatedBy: string | null
}
