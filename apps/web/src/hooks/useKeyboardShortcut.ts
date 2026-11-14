import { useEffect, useEffectEvent } from 'react'
import { t } from '../i18n'

type ShortcutOptions = {
  /** Require Ctrl (Windows/Linux) or Cmd (macOS). */
  mod?: boolean
  /** Fire even while the user is typing in a field. */
  allowInInputs?: boolean
  /** Fire even while a dialog is open (for app-wide shortcuts). */
  allowInDialogs?: boolean
  enabled?: boolean
}

/** Page shortcuts must not act behind an open dialog, drawer, menu or picker. */
const OVERLAY_SELECTOR =
  '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]'

function isInsideOverlay(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(OVERLAY_SELECTOR) !== null
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

export function useKeyboardShortcut(
  key: string,
  handler: (event: KeyboardEvent) => void,
  {
    mod = false,
    allowInInputs = false,
    allowInDialogs = false,
    enabled = true,
  }: ShortcutOptions = {},
) {
  const onShortcut = useEffectEvent(handler)

  useEffect(() => {
    if (!enabled) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== key.toLowerCase()) return
      if (mod !== (event.ctrlKey || event.metaKey)) return
      if (!allowInInputs && isTypingTarget(event.target)) return
      if (!allowInDialogs && isInsideOverlay(event.target)) return
      if (event.defaultPrevented) return
      event.preventDefault()
      onShortcut(event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, mod, allowInInputs, allowInDialogs, enabled])
}

export const IS_APPLE = /Mac|iPhone|iPad/.test(navigator.userAgent)

/** How the platform writes the modifier key: ⌘ on Apple devices, Ctrl elsewhere. */
export const MOD_KEY = IS_APPLE ? '⌘' : t.shortcuts.keys.ctrl

/**
 * The key that opens the shortcut list with the modifier: Ctrl+H on Windows and Linux (the
 * page claims it before the browser's History shortcut, as Google Docs does). On a Mac, ⌘H
 * hides the whole app before the page ever sees it, so the Mac uses ⌘/ instead.
 */
export const HELP_KEY = IS_APPLE ? '/' : 'H'
