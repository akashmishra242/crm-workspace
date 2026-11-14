import type { Contact, ContactField, ContactFields } from '@crm/shared'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { ModalBody, ModalFooter } from '../../../components/ui/Modal'
import { t } from '../../../i18n'
import { cn } from '../../../lib/cn'
import { formatPhone } from '../../../lib/format'
import { FIELD_LABELS } from '../form/contactForm'
import { applyChoices, resolveConflict, type ConflictSide } from '../utils/resolveConflict'

export type ConflictState = {
  /** The saved values the user's edits started from. */
  base: ContactFields
  /** The user's draft. */
  mine: ContactFields
  /** The newer saved version that caused the conflict. */
  theirs: Contact
}

type ConflictDialogProps = {
  conflict: ConflictState | null
  saving: boolean
  onSaveMerged: (fields: ContactFields) => void
  onUseTheirs: () => void
  onCancel: () => void
}

export function ConflictDialog({
  conflict,
  saving,
  onSaveMerged,
  onUseTheirs,
  onCancel,
}: ConflictDialogProps) {
  return (
    <Dialog
      open={conflict !== null}
      onOpenChange={(open) => !open && onCancel()}
      size="lg"
      title={t.contacts.conflict.title}
      description={t.contacts.conflict.description}
    >
      {conflict && (
        <ConflictResolver
          key={conflict.theirs.version}
          conflict={conflict}
          saving={saving}
          onSaveMerged={onSaveMerged}
          onUseTheirs={onUseTheirs}
        />
      )}
    </Dialog>
  )
}

type ConflictResolverProps = Omit<ConflictDialogProps, 'conflict' | 'onCancel'> & {
  conflict: ConflictState
}

function ConflictResolver({ conflict, saving, onSaveMerged, onUseTheirs }: ConflictResolverProps) {
  const { base, mine, theirs } = conflict
  const resolution = resolveConflict(base, mine, theirs)
  const [choices, setChoices] = useState<Partial<Record<ContactField, ConflictSide>>>({})

  const keptMine = resolution.autoMerged.filter((item) => item.side === 'mine')
  const tookTheirs = resolution.autoMerged.filter((item) => item.side === 'theirs')
  const labels = (items: typeof keptMine) =>
    items.map((item) => FIELD_LABELS[item.field].toLowerCase()).join(', ')

  return (
    <>
      <ModalBody>
        <div className="space-y-4">
          {resolution.conflicts.length > 0 ? (
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm text-gray-700">
                {t.contacts.conflict.bothChanged(resolution.conflicts.length)}
              </legend>
              {resolution.conflicts.map((field) => (
                <div key={field} className="rounded-lg ring-1 ring-gray-200">
                  <p className="border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600">
                    {FIELD_LABELS[field]}
                  </p>
                  <div className="grid gap-2 p-2 sm:grid-cols-2">
                    {(['mine', 'theirs'] as const).map((side) => {
                      const selected = (choices[field] ?? 'mine') === side
                      const value = side === 'mine' ? mine[field] : theirs[field]
                      return (
                        <label
                          key={side}
                          className={cn(
                            'flex cursor-pointer items-start gap-2 rounded-md p-2 ring-1',
                            selected
                              ? 'bg-primary-50 ring-primary-300'
                              : 'ring-gray-200 hover:bg-gray-50',
                          )}
                        >
                          <input
                            type="radio"
                            name={`conflict-${field}`}
                            checked={selected}
                            onChange={() =>
                              setChoices((current) => ({ ...current, [field]: side }))
                            }
                            className="mt-0.5 accent-primary-600"
                          />
                          <span className="min-w-0">
                            <span className="block text-xs text-gray-500">
                              {side === 'mine'
                                ? t.contacts.conflict.yourChange
                                : t.contacts.conflict.theirValue}
                            </span>
                            <span className="block font-medium break-words text-gray-900">
                              {displayValue(field, value)}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </fieldset>
          ) : (
            <p className="text-sm text-gray-700">{t.contacts.conflict.noOverlap}</p>
          )}

          {(keptMine.length > 0 || tookTheirs.length > 0) && (
            <ul className="space-y-1 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
              {keptMine.length > 0 && <li>{t.contacts.conflict.keepingYours(labels(keptMine))}</li>}
              {tookTheirs.length > 0 && (
                <li>{t.contacts.conflict.takingTheirs(labels(tookTheirs))}</li>
              )}
            </ul>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onUseTheirs} disabled={saving}>
          {t.contacts.conflict.useTheirs}
        </Button>
        <Button
          variant="primary"
          loading={saving}
          onClick={() => onSaveMerged(applyChoices(resolution, mine, choices))}
        >
          {t.contacts.conflict.saveMerged}
        </Button>
      </ModalFooter>
    </>
  )
}

function displayValue(field: ContactField, value: string | null): string {
  if (value === null || value === '') return t.contacts.conflict.emptyValue
  return field === 'phone' ? formatPhone(value) : value
}
