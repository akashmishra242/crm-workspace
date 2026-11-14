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
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { useForm } from 'react-hook-form'
import { Button } from '../../../components/ui/Button'
import { notify } from '../../../components/ui/Toast'
import { useKeyboardShortcut } from '../../../hooks/useKeyboardShortcut'
import { useUnsavedChangesGuard } from '../../../hooks/useUnsavedChangesGuard'
import { t } from '../../../i18n'
import { isApiError } from '../../../lib/http'
import { useUpdateContact } from '../api/useContactMutations'
import { ContactFieldInputs } from '../form/ContactFieldInputs'
import { applyServerFieldErrors, toFormValues } from '../form/contactForm'
import { changedFields, pickContactFields } from '../utils/resolveConflict'
import { ConflictDialog, type ConflictState } from './ConflictDialog'

const SAVE_SHORTCUT_LABEL = /Mac|iPhone|iPad/.test(navigator.userAgent)
  ? '⌘S'
  : `${t.shortcuts.keys.ctrl} S`

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
    control,
    setValue,
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
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const blocker = useUnsavedChangesGuard(isDirty)
  const isStale = latest.version > base.version

  function submit(next: ContactFields, against: Contact) {
    const changes = changedFields(pickContactFields(against), next)
    if (Object.keys(changes).length === 0) {
      // E.g. the phone was retyped in another format: nothing to send, so clear the edits.
      setConflict(null)
      if (against.version === base.version) {
        reset(toFormValues(base))
        notify.success(t.toasts.nothingToSave, t.toasts.nothingToSaveDescription)
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
          notify.success(t.toasts.changesSaved)
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
            notify.error(t.toasts.saveFailed, error.message)
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
    <form
      onSubmit={save}
      noValidate
      aria-label={t.contacts.form.label}
      className="flex flex-1 flex-col"
    >
      {isStale && (
        <div
          role="status"
          className="mb-4 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="flex-1">
            {isDirty ? t.contacts.form.updatedWhileEditing : t.contacts.form.updatedSinceOpened}
            <button
              type="button"
              className="ml-1 font-medium underline"
              onClick={() => (isDirty ? void reviewConflict() : onRebase(latest))}
            >
              {isDirty ? t.contacts.form.reviewChanges : t.contacts.form.showLatest}
            </button>
          </div>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">{t.contacts.form.heading}</h2>
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
            {hideEmptyFields
              ? t.contacts.form.showEmpty(emptyFields.length)
              : t.contacts.form.hideEmpty}
          </button>
        )}
      </div>

      <ContactFieldInputs
        register={register}
        control={control}
        setValue={setValue}
        errors={errors}
        hiddenFields={hiddenFields}
      />

      {isDirty && <div aria-hidden className="h-6 shrink-0" />}
      {isDirty && (
        // Pinned to the bottom of the panel, flush with its edges, like a drawer footer.
        <div className="sticky bottom-0 -mx-4 -mb-4 mt-auto border-t border-gray-200 bg-white/95 px-4 pt-3 pb-4 backdrop-blur">
          <p className="mb-2 flex items-center gap-2 text-sm text-gray-600">
            <span aria-hidden className="size-2 rounded-full bg-amber-500" />
            {t.contacts.form.unsaved}
          </p>
          {/* Same layout as drawer footers: both actions side by side at full width. */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setConfirmingDiscard(true)} disabled={update.isPending}>
              {t.contacts.form.discard}
            </Button>
            <Button variant="primary" type="submit" loading={update.isPending}>
              {t.common.save}
              <kbd className="hidden rounded bg-white/20 px-1 font-sans text-[10px] sm:inline">
                {SAVE_SHORTCUT_LABEL}
              </kbd>
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmingDiscard}
        onOpenChange={setConfirmingDiscard}
        title={t.common.discardTitle}
        description={t.common.discardDescription}
        confirmLabel={t.common.discard}
        destructive
        onConfirm={() => reset()}
      />

      <ConflictDialog
        conflict={conflict}
        saving={update.isPending}
        onSaveMerged={(merged) => conflict && submit(merged, conflict.theirs)}
        onUseTheirs={() => conflict && onRebase(conflict.theirs)}
        onCancel={() => setConflict(null)}
      />

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title={t.contacts.form.leaveTitle}
        description={`${t.contacts.form.leaveDescription} ${t.contacts.form.leaveWarning}`}
        cancelLabel={t.contacts.form.keepEditing}
        confirmLabel={t.contacts.form.discardChanges}
        destructive
        onConfirm={() => blocker.proceed?.()}
      />
    </form>
  )
}
