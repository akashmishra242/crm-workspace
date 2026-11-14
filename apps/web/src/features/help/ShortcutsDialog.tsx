import { Dialog } from '../../components/ui/Dialog'
import { ModalBody } from '../../components/ui/Modal'
import { MOD_KEY } from '../../hooks/useKeyboardShortcut'

type Shortcut = { keys: string[][]; action: string }

/** Each entry is checked against what the app really does; `keys` lists alternatives. */
const SECTIONS: ReadonlyArray<{ title: string; shortcuts: ReadonlyArray<Shortcut> }> = [
  {
    title: 'Anywhere',
    shortcuts: [
      { keys: [[MOD_KEY, 'K']], action: 'Find a contact' },
      { keys: [[MOD_KEY, '/'], ['?']], action: 'Show keyboard shortcuts' },
    ],
  },
  {
    title: 'Contacts list',
    shortcuts: [
      { keys: [['/']], action: 'Search the list' },
      { keys: [['N']], action: 'Add a contact' },
      { keys: [['↓']], action: 'From search, move into the list' },
      { keys: [['↑', '↓']], action: 'Move between contacts' },
      { keys: [['Enter']], action: 'Open the contact' },
      { keys: [['Space']], action: 'Select or deselect' },
      { keys: [['Shift', 'Space']], action: 'Select a range' },
      { keys: [['Esc']], action: 'Clear the selection' },
    ],
  },
  {
    title: 'Contact page',
    shortcuts: [
      { keys: [[MOD_KEY, 'S']], action: 'Save changes' },
      { keys: [['←', '→']], action: 'Previous or next contact' },
    ],
  },
]

type ShortcutsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Keyboard shortcuts"
      description="Shortcuts don’t fire while you type in a field."
    >
      <ModalBody>
        <div className="space-y-5">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                {section.title}
              </h3>
              <dl className="space-y-1.5">
                {section.shortcuts.map(({ keys, action }) => (
                  <div key={action} className="flex items-center justify-between gap-4 text-sm">
                    <dt className="text-gray-700">{action}</dt>
                    <dd className="flex items-center gap-1.5 text-xs text-gray-400">
                      {keys.map((combo, index) => (
                        <span key={combo.join('+')} className="flex items-center gap-1">
                          {index > 0 && <span>or</span>}
                          {combo.map((key) => (
                            <Kbd key={key}>{key}</Kbd>
                          ))}
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </ModalBody>
    </Dialog>
  )
}

export function Kbd({ children }: { children: string }) {
  return (
    <kbd className="min-w-6 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-center font-sans text-xs text-gray-700">
      {children}
    </kbd>
  )
}
