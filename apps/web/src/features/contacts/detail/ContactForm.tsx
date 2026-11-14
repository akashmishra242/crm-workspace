import {
  CONTACT_FIELDS,
  contactFieldsSchema,
  type Contact,
  type ContactFields,
  type ContactFormValues,
  type VersionConflictDetails,
} from '@crm/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { ModalBody, ModalFooter } from '../../../components/ui/Modal'
import { notify } from '../../../components/ui/Toast'
import { useKeyboardShortcut } from '../../../hooks/useKeyboardShortcut'
import { useUnsavedChangesGuard } from '../../../hooks/useUnsavedChangesGuard'
import { isApiError } from '../../../lib/http'
import { useUpdateContact } from '../api/useContactMutations'
import { ContactFieldInputs } from '../form/ContactFieldInputs'
import { applyServerFieldErrors, toFormValues } from '../form/contactForm'
import { changedFields, pickContactFields } from '../utils/resolveConflict'
import { ConflictDialog, type ConflictState } from './ConflictDialog'

const SAVE_SHORTCUT_LABEL = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘S' : 'Ctrl S'

type ContactFormProps = {
  /** The saved version this form was opened with; edits are checked against its version. */
  base: Contact
  /** The newest version the client knows about, which may be ahead of `base`. */
  latest: Contact
  hideEmptyFields: boolean
  onHideEmptyFieldsChange: (hide: boolean) => void
  /** Called with the version the form should restart from (after a save or a reload). */
  onRebase: (contact: Contact) => void
}

/**
 * Fields are always editable and a save bar appears once something changes. Saving sends only changed fields plus the version they were based on.
 * Values never change under the user's cursor: newer server data is offered, not forced.
 */
export function ContactForm({
  base,
  latest,
  hideEmptyFields,
  onHideEmptyFieldsChange,
  onRebase,
}: ContactFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<ContactFormValues, unknown, ContactFields>({
    resolver: zodResolver(contactFieldsSchema),
    defaultValues: toFormValues(base),
  })
  const update = useUpdateContact(base.id)
  const [conflict, setConflict] = useState<ConflictState | null>(null)
  const blocker = useUnsavedChangesGuard(isDirty)
  const isStale = latest.version > base.version

  function submit(next: ContactFields, against: Contact) {
    const changes = changedFields(pickContactFields(against), next)
    if (Object.keys(changes).length === 0) {
      // E.g. the phone was retyped in another format: nothing to send, so clear the edits.
      setConflict(null)
      if (against.version === base.version) {
        reset(toFormValues(base))
        notify.success('Nothing to save', 'The values match what is already saved.')
      } else {
        onRebase(against)
      }
      return
    }
    update.mutate(
      { ...changes, version: against.version },
      {
        onSuccess: (saved) => {
          setConflict(null)
          notify.success('Changes saved')
          onRebase(saved)
        },
        onError: (error) => {
          if (isApiError(error, 'VERSION_CONFLICT')) {
            const { current } = error.details as VersionConflictDetails
            setConflict({ base: pickContactFields(against), mine: next, theirs: current })
            return
          }
          setConflict(null)
          if (!applyServerFieldErrors(error, setError)) {
            notify.error("Couldn't save changes", error.message)
          }
        },
      },
    )
  }

  const save = handleSubmit((fields) => submit(fields, base))
  const reviewConflict = handleSubmit((fields) =>
    setConflict({ base: pickContactFields(base), mine: fields, theirs: latest }),
  )

  useKeyboardShortcut('s', () => void save(), {
    mod: true,
    allowInInputs: true,
    enabled: isDirty && !update.isPending,
  })

  const initialValues = toFormValues(base)
  const emptyFields = CONTACT_FIELDS.filter((field) => !initialValues[field] && !dirtyFields[field])
  const hiddenFields = hideEmptyFields ? new Set(emptyFields) : undefined

  return (
    <form onSubmit={save} noValidate aria-label="Contact details">
      {isStale && (
        <div
          role="status"
          className="mb-4 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="flex-1">
            {isDirty
              ? 'This contact was updated after you started editing.'
              : 'This contact was updated after you opened it.'}
            <button
              type="button"
              className="ml-1 font-medium underline"
              onClick={() => (isDirty ? void reviewConflict() : onRebase(latest))}
            >
              {isDirty ? 'Review changes' : 'Show latest'}
            </button>
          </div>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Contact</h2>
        {emptyFields.length > 0 && (
          <button
            type="button"
            onClick={() => onHideEmptyFieldsChange(!hideEmptyFields)}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900"
          >
            {hideEmptyFields ? (
              <Eye className="size-3.5" aria-hidden />
            ) : (
              <EyeOff className="size-3.5" aria-hidden />
            )}
            {hideEmptyFields ? `Show ${emptyFields.length} empty` : 'Hide empty fields'}
          </button>
        )}
      </div>

      <ContactFieldInputs register={register} errors={errors} hiddenFields={hiddenFields} />

      {isDirty && (
        <div className="sticky bottom-0 -mx-4 mt-6 flex items-center gap-2 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
          <span className="mr-auto flex items-center gap-2 text-sm text-gray-600">
            <span aria-hidden className="size-2 rounded-full bg-amber-500" />
            Unsaved changes
          </span>
          <Button onClick={() => reset()} disabled={update.isPending}>
            Discard
          </Button>
          <Button variant="primary" type="submit" loading={update.isPending}>
            Save
            <kbd className="hidden rounded bg-white/20 px-1 font-sans text-[10px] sm:inline">
              {SAVE_SHORTCUT_LABEL}
            </kbd>
          </Button>
        </div>
      )}

      <ConflictDialog
        conflict={conflict}
        saving={update.isPending}
        onSaveMerged={(merged) => conflict && submit(merged, conflict.theirs)}
        onUseTheirs={() => conflict && onRebase(conflict.theirs)}
        onCancel={() => setConflict(null)}
      />

      <Dialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title="Discard unsaved changes?"
        description="You have edits to this contact that haven't been saved."
      >
        <ModalBody>
          <p className="text-sm text-gray-600">Leaving this page will lose them.</p>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => blocker.reset?.()}>Keep editing</Button>
          <Button variant="danger" onClick={() => blocker.proceed?.()}>
            Discard changes
          </Button>
        </ModalFooter>
      </Dialog>
    </form>
  )
}
