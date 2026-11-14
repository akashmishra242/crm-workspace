import type { Contact } from './contact'

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'NOT_FOUND',
  'VERSION_CONFLICT',
  'EMAIL_ALREADY_EXISTS',
  'TAG_ALREADY_EXISTS',
  'CLIENT_OUTDATED',
  'INTERNAL_ERROR',
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]

export type ApiErrorBody = {
  error: {
    code: ErrorCode
    message: string
    details?: unknown
  }
}

export type ValidationIssue = {
  path: string
  message: string
}

export type ValidationErrorDetails = { issues: ValidationIssue[] }
export type VersionConflictDetails = { current: Contact }
export type DuplicateFieldDetails = { field: string }
