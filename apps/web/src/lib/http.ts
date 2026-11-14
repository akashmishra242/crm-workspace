import { USER_ID_HEADER, type ApiErrorBody, type ErrorCode } from '@crm/shared'
import { t } from '../i18n'
import { clearCurrentUserId, getCurrentUserId } from './session'

/** Always same-origin: Vite proxies /api in development and vercel.json does in production. */
const API_BASE = '/api/v1'

type ClientErrorCode = ErrorCode | 'NETWORK_ERROR'

export class ApiError extends Error {
  readonly status: number
  readonly code: ClientErrorCode
  readonly details: unknown

  constructor(status: number, code: ClientErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function isApiError(error: unknown, code?: ClientErrorCode): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code)
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  /** Lets the request finish after the page is hidden or closed. */
  keepalive?: boolean
  /** Send as this teammate instead of the current one (for saving a previous teammate's data). */
  asUser?: string
}

function requestHeaders(hasBody: boolean, userId: string | null): HeadersInit {
  const headers: Record<string, string> = {}
  if (userId) headers[USER_ID_HEADER] = userId
  if (hasBody) headers['Content-Type'] = 'application/json'
  return headers
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, keepalive, asUser } = options
  const sentUserId = asUser ?? getCurrentUserId()
  let response: Response
  try {
    response = await fetch(new URL(`${API_BASE}${path}`, window.location.origin), {
      method,
      signal,
      keepalive,
      headers: requestHeaders(body !== undefined, sentUserId),
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError(0, 'NETWORK_ERROR', t.errors.network)
  }

  if (response.ok) {
    return (await response.json()) as T
  }
  const error = await toApiError(response)
  // The teammate this request was sent as no longer exists (e.g. the database was reset).
  // Forget it and send the request again as whoever is current now, which is never the
  // same stale id, so this retries at most once.
  if (error.code === 'UNAUTHENTICATED' && !asUser && sentUserId) {
    if (getCurrentUserId() === sentUserId) clearCurrentUserId()
    return request<T>(path, options)
  }
  throw error
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null
  if (body?.error) {
    return new ApiError(response.status, body.error.code, body.error.message, body.error.details)
  }
  return new ApiError(response.status, 'INTERNAL_ERROR', t.errors.server)
}

export function toSearchParams(
  values: Record<string, string | number | boolean | readonly string[] | null | undefined>,
): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === '') continue
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(','))
      continue
    }
    params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}
