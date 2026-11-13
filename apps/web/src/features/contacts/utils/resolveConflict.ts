import { CONTACT_FIELDS, type ContactField, type ContactFields } from '@crm/shared'

export type ConflictSide = 'mine' | 'theirs'

export type ConflictResolution = {
  /** Field values that could be decided without asking the user. */
  merged: ContactFields
  /** Fields both sides changed to different values: the user has to choose. */
  conflicts: ContactField[]
  /** Fields that were merged silently, and from which side. */
  autoMerged: Array<{ field: ContactField; side: ConflictSide }>
}

/**
 * Three-way merge of a stale edit. `base` is what the form was loaded with, `mine` is the
 * draft, `theirs` is the latest saved version. Only fields that both sides changed — to
 * different values — are real conflicts.
 */
export function resolveConflict(
  base: ContactFields,
  mine: ContactFields,
  theirs: ContactFields,
): ConflictResolution {
  const merged = { ...theirs }
  const conflicts: ContactField[] = []
  const autoMerged: ConflictResolution['autoMerged'] = []

  for (const field of CONTACT_FIELDS) {
    const mineChanged = mine[field] !== base[field]
    const theirsChanged = theirs[field] !== base[field]

    if (!mineChanged) {
      if (theirsChanged) autoMerged.push({ field, side: 'theirs' })
      continue
    }
    if (!theirsChanged) {
      Object.assign(merged, { [field]: mine[field] })
      autoMerged.push({ field, side: 'mine' })
      continue
    }
    if (mine[field] !== theirs[field]) conflicts.push(field)
  }

  return { merged, conflicts, autoMerged }
}

export function applyChoices(
  resolution: ConflictResolution,
  mine: ContactFields,
  choices: Partial<Record<ContactField, ConflictSide>>,
): ContactFields {
  const result = { ...resolution.merged }
  for (const field of resolution.conflicts) {
    if ((choices[field] ?? 'mine') === 'mine') {
      Object.assign(result, { [field]: mine[field] })
    }
  }
  return result
}

/** The subset of `next` that differs from `current`, i.e. what a PATCH needs to send. */
export function changedFields(current: ContactFields, next: ContactFields): Partial<ContactFields> {
  const changes: Partial<ContactFields> = {}
  for (const field of CONTACT_FIELDS) {
    if (next[field] !== current[field]) Object.assign(changes, { [field]: next[field] })
  }
  return changes
}

export function pickContactFields(contact: ContactFields): ContactFields {
  const { firstName, lastName, email, phone, company } = contact
  return { firstName, lastName, email, phone, company }
}
