import {
  CONTACT_FIELDS,
  type Contact,
  type ContactField,
  type ContactFormValues,
  type DuplicateFieldDetails,
  type ValidationErrorDetails,
} from '@crm/shared'
import type { UseFormSetError } from 'react-hook-form'
import { t } from '../../../i18n'
import { formatPhone } from '../../../lib/format'
import { isApiError } from '../../../lib/http'

export const FIELD_LABELS: Record<ContactField, string> = t.contacts.form.fields

export const EMPTY_CONTACT_FORM: ContactFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
}

export function toFormValues(contact: Contact): ContactFormValues {
  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email ?? '',
    phone: contact.phone ? formatPhone(contact.phone) : '',
    company: contact.company ?? '',
  }
}

const isContactField = (path: string): path is ContactField =>
  (CONTACT_FIELDS as readonly string[]).includes(path)

/**
 * Puts server-side validation failures next to the field they belong to.
 * Returns false when the error is not field-specific and needs a general message.
 */
export function applyServerFieldErrors(
  error: unknown,
  setError: UseFormSetError<ContactFormValues>,
): boolean {
  if (isApiError(error, 'EMAIL_ALREADY_EXISTS')) {
    const { field } = error.details as DuplicateFieldDetails
    if (isContactField(field)) {
      setError(field, { message: t.contacts.form.emailTaken }, { shouldFocus: true })
      return true
    }
  }
  if (isApiError(error, 'VALIDATION_ERROR')) {
    const issues = (error.details as ValidationErrorDetails | undefined)?.issues ?? []
    const fieldIssues = issues.filter((issue) => isContactField(issue.path))
    fieldIssues.forEach((issue, index) => {
      setError(issue.path as ContactField, { message: issue.message }, { shouldFocus: index === 0 })
    })
    return fieldIssues.length > 0
  }
  return false
}
