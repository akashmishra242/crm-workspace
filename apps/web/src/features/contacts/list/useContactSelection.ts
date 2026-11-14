import { useState } from 'react'

const NOTHING_SELECTED: ReadonlySet<string> = new Set()

/**
 * Selected contact ids, kept across pages. The selection belongs to one result set: when
 * `scope` (the active search and filters) changes it is cleared during render, React's
 * pattern for adjusting state to new props, rather than in an effect after a stale paint.
 */
export function useContactSelection(scope: string) {
  const [selection, setSelection] = useState({ scope, ids: NOTHING_SELECTED })
  if (selection.scope !== scope) {
    setSelection({ scope, ids: NOTHING_SELECTED })
  }
  const ids = selection.scope === scope ? selection.ids : NOTHING_SELECTED

  // Works from the latest state, so a callback that finishes later (a bulk action) doesn't
  // undo rows toggled while it was running.
  function update(change: (next: Set<string>) => void) {
    setSelection((current) => {
      if (current.scope !== scope) return current
      const next = new Set(current.ids)
      change(next)
      return { scope, ids: next }
    })
  }

  return {
    ids,
    count: ids.size,
    isSelected: (id: string) => ids.has(id),
    toggle: (id: string, selected: boolean) =>
      update((next) => (selected ? next.add(id) : next.delete(id))),
    setMany: (contactIds: string[], selected: boolean) =>
      update((next) => contactIds.forEach((id) => (selected ? next.add(id) : next.delete(id)))),
    clear: () => setSelection({ scope, ids: NOTHING_SELECTED }),
  }
}

export type ContactSelection = ReturnType<typeof useContactSelection>
