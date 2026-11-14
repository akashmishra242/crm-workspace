import { contactFieldsSchema, type ContactFields, type ContactFormValues } from '@crm/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { Button } from '../../../components/ui/Button'
import { Drawer } from '../../../components/ui/Drawer'
import { ModalBody, ModalFooter } from '../../../components/ui/Modal'
import { notify } from '../../../components/ui/Toast'
import { t } from '../../../i18n'
import { useCreateContact } from '../api/useContactMutations'
import { ContactFieldInputs } from '../form/ContactFieldInputs'
import { applyServerFieldErrors, EMPTY_CONTACT_FORM } from '../form/contactForm'
import { contactDisplayName } from '../utils/contactDisplayName'

type CreateContactDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CreateContactDrawer({ open, onOpenChange }: CreateContactDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={t.contacts.create.title}
      description={t.contacts.create.description}
    >
      <CreateContactForm onClose={() => onOpenChange(false)} />
    </Drawer>
  )
}

/** Mounted only while the drawer is open, so every opening starts with an empty form. */
function CreateContactForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const createContact = useCreateContact()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<ContactFormValues, unknown, ContactFields>({
    resolver: zodResolver(contactFieldsSchema),
    defaultValues: EMPTY_CONTACT_FORM,
  })

  const submit = handleSubmit((fields) => {
    createContact.mutate(fields, {
      onSuccess: (contact) => {
        notify.success(t.toasts.contactAdded, contactDisplayName(contact))
        onClose()
        void navigate(`/contacts/${contact.id}`)
      },
      onError: (error) => {
        if (!applyServerFieldErrors(error, setError)) {
          notify.error(t.toasts.addContactFailed, error.message)
        }
      },
    })
  })

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <ModalBody>
        <ContactFieldInputs register={register} errors={errors} />
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>{t.common.cancel}</Button>
        <Button
          variant="primary"
          type="submit"
          disabled={!isDirty}
          loading={createContact.isPending}
        >
          {t.contacts.create.save}
        </Button>
      </ModalFooter>
    </form>
  )
}
