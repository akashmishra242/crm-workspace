import type { ContactFields } from '@crm/shared'

export function contactDisplayName({
  firstName,
  lastName,
}: Pick<ContactFields, 'firstName' | 'lastName'>) {
  return [firstName, lastName].filter(Boolean).join(' ')
}
