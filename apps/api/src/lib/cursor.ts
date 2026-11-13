import type { z } from 'zod'
import { invalidInput } from '../errors/app-error'

/** Cursors are opaque to clients: base64url-encoded JSON validated on the way back in. */
export function encodeCursor(payload: object): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

export function decodeCursor<T>(raw: string, schema: z.ZodType<T>): T {
  const result = schema.safeParse(parseJson(Buffer.from(raw, 'base64url').toString('utf8')))
  if (!result.success) {
    throw invalidCursor()
  }
  return result.data
}

export function invalidCursor() {
  return invalidInput([{ path: 'cursor', message: 'Cursor is invalid or no longer applies' }])
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
