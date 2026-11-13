import type { ApiErrorBody, ErrorCode, ValidationIssue } from '@crm/shared'
import type { FastifyInstance } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'
import { AppError } from './app-error'

type ErrorResponse = {
  statusCode: number
  body: ApiErrorBody
}

const UNIQUE_VIOLATION = '23505'

const uniqueConstraintErrors: Record<string, { code: ErrorCode; message: string; field: string }> =
  {
    contacts_email_unique: {
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'Another contact already uses this email address',
      field: 'email',
    },
    tags_name_unique: {
      code: 'TAG_ALREADY_EXISTS',
      message: 'A tag with this name already exists',
      field: 'name',
    },
  }

export function registerErrorHandling(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    const body = errorBody('NOT_FOUND', `Route ${request.method} ${request.url} does not exist`)
    return reply.code(404).send(body)
  })

  app.setErrorHandler((error, request, reply) => {
    const response = toErrorResponse(error)
    if (response.statusCode >= 500) {
      request.log.error({ err: error }, 'Unhandled error')
    }
    return reply.code(response.statusCode).send(response.body)
  })
}

function toErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: errorBody(error.code, error.message, error.details),
    }
  }

  if (hasZodFastifySchemaValidationErrors(error)) {
    const issues: ValidationIssue[] = error.validation.map((issue) => ({
      path: issue.instancePath.replace(/^\//, '').replaceAll('/', '.'),
      message: issue.message ?? 'Invalid value',
    }))
    return {
      statusCode: 400,
      body: errorBody('VALIDATION_ERROR', 'Some values are invalid', { issues }),
    }
  }

  const constraint = violatedUniqueConstraint(error)
  const duplicate = constraint ? uniqueConstraintErrors[constraint] : undefined
  if (duplicate) {
    return {
      statusCode: 409,
      body: errorBody(duplicate.code, duplicate.message, { field: duplicate.field }),
    }
  }

  // Fastify's own client errors, e.g. malformed JSON or an oversized body.
  const statusCode = clientErrorStatus(error)
  if (statusCode) {
    const message = error instanceof Error ? error.message : 'Bad request'
    return { statusCode, body: errorBody('VALIDATION_ERROR', message) }
  }

  return {
    statusCode: 500,
    body: errorBody('INTERNAL_ERROR', 'Something went wrong on our side. Please try again.'),
  }
}

function errorBody(code: ErrorCode, message: string, details?: unknown): ApiErrorBody {
  return { error: details === undefined ? { code, message } : { code, message, details } }
}

/** Drizzle wraps driver errors, so the Postgres error may sit anywhere in the `cause` chain. */
function violatedUniqueConstraint(error: unknown): string | undefined {
  for (let current: unknown = error; isRecord(current); current = current.cause) {
    if (current.code === UNIQUE_VIOLATION && typeof current.constraint === 'string') {
      return current.constraint
    }
  }
  return undefined
}

function clientErrorStatus(error: unknown): number | undefined {
  if (!isRecord(error) || typeof error.statusCode !== 'number') return undefined
  return error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
