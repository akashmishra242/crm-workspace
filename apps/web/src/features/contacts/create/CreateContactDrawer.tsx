import { contactFieldsSchema, type ContactFields, type ContactFormValues } from '@crm/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { Button } from '../../../components/ui/Button'
import { Drawer } from '../../../components/ui/Drawer'
import { ModalBody, ModalFooter } from '../../../components/ui/Modal'
import { MultiSelect } from '../../../components/ui/MultiSelect'
import { notify } from '../../../components/ui/Toast'
import { t } from '../../../i18n'
import { cn } from '../../../lib/cn'
import { tagListQuery } from '../../tags/api/tagQueries'
import { useCreateTag } from '../../tags/api/useTagMutations'
import { TAG_DOT_CLASSES } from '../../tags/components/TagChip'
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
  const tags = useQuery(tagListQuery())
  const createTag = useCreateTag()
  const [tagIds, setTagIds] = useState<string[]>([])
  const {
    register,
    control,
    setValue,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<ContactFormValues, unknown, ContactFields>({
    resolver: zodResolver(contactFieldsSchema),
    defaultValues: EMPTY_CONTACT_FORM,
  })

  const submit = handleSubmit((fields) => {
    createContact.mutate(
      { ...fields, tagIds },
      {
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
      },
    )
  })

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <ModalBody>
        <ContactFieldInputs
          register={register}
          control={control}
          setValue={setValue}
          errors={errors}
        />
        <div className="mt-4">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            {t.contacts.create.tags}
          </span>
          <MultiSelect
            label={t.contacts.create.tags}
            placeholder={t.contacts.create.noTags}
            searchPlaceholder={t.contacts.create.searchTags}
            options={(tags.data ?? []).map((tag) => ({
              value: tag.id,
              label: tag.name,
              icon: (
                <span
                  aria-hidden
                  className={cn('size-2 rounded-full', TAG_DOT_CLASSES[tag.color])}
                />
              ),
            }))}
            value={tagIds}
            onChange={setTagIds}
            status={tags.isPending ? 'loading' : tags.isError ? 'error' : undefined}
            onCreate={async (name) => {
              try {
                return (await createTag.mutateAsync(name)).id
              } catch (error) {
                notify.error(t.toasts.createTagFailed, (error as Error).message)
                return undefined
              }
            }}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>{t.common.cancel}</Button>
        <Button
          variant="primary"
          type="submit"
          disabled={!isDirty && tagIds.length === 0}
          loading={createContact.isPending}
        >
          {t.contacts.create.save}
        </Button>
      </ModalFooter>
    </form>
  )
}
