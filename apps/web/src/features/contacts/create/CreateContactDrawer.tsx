import { contactFieldsSchema, type ContactFields, type ContactFormValues } from '@crm/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { Button } from '../../../components/ui/Button'
import { Drawer } from '../../../components/ui/Drawer'
import { ModalBody, ModalFooter } from '../../../components/ui/Modal'
import { notify } from '../../../components/ui/Toast'
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
      title="Add contact"
      description="Only the first name is required."
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
        notify.success('Contact added', contactDisplayName(contact))
        onClose()
        void navigate(`/contacts/${contact.id}`)
      },
      onError: (error) => {
        if (!applyServerFieldErrors(error, setError)) {
          notify.error("Couldn't add the contact", error.message)
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
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          type="submit"
          disabled={!isDirty}
          loading={createContact.isPending}
        >
          Save contact
        </Button>
      </ModalFooter>
    </form>
  )
}
