import { Dialog } from '../../components/ui/Dialog'
import { ModalBody } from '../../components/ui/Modal'
import { HELP_KEY, MOD_KEY } from '../../hooks/useKeyboardShortcut'
import { t } from '../../i18n'

type Shortcut = { keys: string[][]; action: string }

const { keys: keyCaps, sections, actions } = t.shortcuts

/** Each entry is checked against what the app really does; `keys` lists alternatives. */
const SECTIONS: ReadonlyArray<{ title: string; shortcuts: ReadonlyArray<Shortcut> }> = [
  {
    title: sections.anywhere,
    shortcuts: [
      { keys: [[MOD_KEY, 'K']], action: actions.findContact },
      { keys: [[MOD_KEY, HELP_KEY], ['?']], action: actions.showShortcuts },
    ],
  },
  {
    title: sections.list,
    shortcuts: [
      { keys: [['/']], action: actions.searchList },
      { keys: [['N']], action: actions.addContact },
      { keys: [['↓']], action: actions.intoList },
      { keys: [['↑', '↓']], action: actions.moveBetween },
      { keys: [[keyCaps.enter]], action: actions.openContact },
      { keys: [[keyCaps.space]], action: actions.toggleSelection },
      { keys: [[keyCaps.shift, keyCaps.space]], action: actions.selectRange },
      { keys: [[keyCaps.esc]], action: actions.clearSelection },
    ],
  },
  {
    title: sections.contact,
    shortcuts: [
      { keys: [[MOD_KEY, 'S']], action: actions.saveChanges },
      { keys: [['←', '→']], action: actions.previousOrNext },
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
      title={t.shortcuts.title}
      description={t.shortcuts.description}
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
                          {index > 0 && <span>{t.shortcuts.or}</span>}
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
