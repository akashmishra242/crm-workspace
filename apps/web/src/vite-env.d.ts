/// <reference types="vite/client" />

/** Unique per build; used to discard client caches written by an older version. */
declare const __BUILD_ID__: string

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
}
