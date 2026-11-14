import { lazy, type ComponentType } from 'react'

/**
 * `React.lazy` plus a `preload()` to start downloading the chunk before it's needed, for
 * example when the pointer reaches the button that opens it. Both share one request.
 */
export function lazyWithPreload<Props extends object>(
  load: () => Promise<{ default: ComponentType<Props> }>,
) {
  let pending: Promise<{ default: ComponentType<Props> }> | undefined
  const preload = () => (pending ??= load())
  return Object.assign(lazy(preload), { preload })
}

/** Runs work after the browser has painted and gone quiet, so it never delays the page. */
export function whenIdle(work: () => void) {
  if ('requestIdleCallback' in window) window.requestIdleCallback(work, { timeout: 4000 })
  else setTimeout(work, 1500)
}
