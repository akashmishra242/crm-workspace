import type { Contact, ErrorCode, ValidationIssue } from '@crm/shared'

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly statusCode: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function notFound(entity: 'Contact' | 'Tag'): AppError {
  return new AppError('NOT_FOUND', 404, `${entity} not found`)
}

export function invalidInput(issues: ValidationIssue[]): AppError {
  return new AppError('VALIDATION_ERROR', 400, 'Some values are invalid', { issues })
}

export function versionConflict(current: Contact): AppError {
  return new AppError(
    'VERSION_CONFLICT',
    409,
    'This contact was changed by someone else after you opened it',
    { current },
  )
}
