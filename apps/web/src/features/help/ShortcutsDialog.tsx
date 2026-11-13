import { Keyboard } from 'lucide-react'
import { useState } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { ModalBody } from '../../components/ui/Modal'
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut'

const MOD = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl'

const SECTIONS: ReadonlyArray<{ title: string; shortcuts: ReadonlyArray<[string[], string]> }> = [
  {
    title: 'Anywhere',
    shortcuts: [
      [[MOD, 'K'], 'Find a contact'],
      [['?'], 'Show this help'],
    ],
  },
  {
    title: 'Contacts list',
    shortcuts: [
      [['/'], 'Search the list'],
      [['N'], 'Add a contact'],
      [['↑', '↓'], 'Move between contacts'],
      [['Space'], 'Select or deselect'],
      [['Enter'], 'Open contact'],
      [['Esc'], 'Clear selection'],
    ],
  },
  {
    title: 'Contact page',
    shortcuts: [
      [[MOD, 'S'], 'Save changes'],
      [['←', '→'], 'Previous or next contact'],
    ],
  },
]

const TIPS = [
  'Drag a column edge to resize it. Your layout follows you to other devices.',
  'Open a contact in two tabs as two teammates to see how conflicting edits are handled.',
]

/** Shortcut reference, opened with ? or from the sidebar. */
export function ShortcutsDialog() {
  const [open, setOpen] = useState(false)
  useKeyboardShortcut('?', () => setOpen(true))

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="?"
        className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
      >
        <Keyboard className="size-4" aria-hidden />
        <span className="flex-1 text-left">Shortcuts</span>
        <kbd className="rounded bg-sidebar px-1.5 font-sans text-[11px]">?</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen} title="Keyboard shortcuts">
        <ModalBody>
          <div className="space-y-5">
            {SECTIONS.map((section) => (
              <section key={section.title}>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  {section.title}
                </h3>
                <dl className="space-y-1.5">
                  {section.shortcuts.map(([keys, action]) => (
                    <div key={action} className="flex items-center justify-between gap-4 text-sm">
                      <dt className="text-gray-700">{action}</dt>
                      <dd className="flex gap-1">
                        {keys.map((key) => (
                          <kbd
                            key={key}
                            className="min-w-6 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-center font-sans text-xs text-gray-700"
                          >
                            {key}
                          </kbd>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            <ul className="space-y-1 rounded-md bg-primary-50 px-3 py-2.5 text-xs text-primary-700">
              {TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        </ModalBody>
      </Dialog>
    </>
  )
}
