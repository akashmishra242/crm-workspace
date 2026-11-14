import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { IconButton } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { notify } from '../../../components/ui/Toast'
import { DISCARD_EDITS_STATE } from '../../../hooks/useUnsavedChangesGuard'
import { t } from '../../../i18n'
import { restoreContactAndRefresh, useDeleteContact } from '../api/useContactMutations'
import { serializeContactListParams, useContactListParams } from '../list/useContactListParams'

type DeleteContactButtonProps = {
  contactId: string
  contactName: string
}

/** Asks first, deletes, returns to the list and offers Undo for a few seconds. */
export function DeleteContactButton({ contactId, contactName }: DeleteContactButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const deleteContact = useDeleteContact()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { params } = useContactListParams()

  async function undo() {
    try {
      await restoreContactAndRefresh(queryClient, contactId)
      notify.success(t.contacts.detail.restored, contactName)
      void navigate(`/contacts/${contactId}`)
    } catch (error) {
      notify.error(t.contacts.detail.restoreFailed, (error as Error).message)
    }
  }

  function confirmDelete() {
    deleteContact.mutate(contactId, {
      onSuccess: () => {
        // The contact is gone, so unsaved edits to it can't be kept: leave without asking.
        void navigate(serializeContactListParams('/contacts', params), {
          state: DISCARD_EDITS_STATE,
        })
        notify.success(t.contacts.detail.deleted, contactName, {
          label: t.contacts.detail.undo,
          onClick: () => void undo(),
        })
      },
      onError: (error) => notify.error(t.contacts.detail.deleteFailed, error.message),
    })
  }

  return (
    <>
      <IconButton
        size="sm"
        variant="ghost"
        label={t.contacts.detail.delete}
        icon={<Trash2 className="size-4" />}
        loading={deleteContact.isPending}
        onClick={() => setConfirming(true)}
        className="text-gray-500 hover:text-red-600"
      />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t.contacts.detail.deleteTitle(contactName)}
        description={t.contacts.detail.deleteDescription}
        confirmLabel={t.contacts.detail.delete}
        destructive
        onConfirm={confirmDelete}
      />
    </>
  )
}
