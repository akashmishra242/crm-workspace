import { en } from './en'

/**
 * The app ships in English only. Another language would be a file like `hi.ts` exporting a
 * `Messages` object, so TypeScript reports any key it is missing; which one `t` points at
 * would then be a user preference rather than this constant.
 */
export type Messages = typeof en

export const t: Messages = en

/** Dates and numbers follow the same language as the copy. */
export const LOCALE = 'en-US'
