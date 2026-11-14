import type { ContactField, ContactFormValues } from '@crm/shared'
import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form'
import { TextField } from '../../../components/ui/TextField'
import { t } from '../../../i18n'
import { FIELD_LABELS } from './contactForm'
import { suggestEmail } from './emailSuggestion'
import { PhoneField } from './PhoneField'

const INPUT_PROPS: Record<
  Exclude<ContactField, 'phone'>,
  { type?: string; autoComplete: string; placeholder?: string; autoCapitalize?: string }
> = {
  firstName: { autoComplete: 'given-name', autoCapitalize: 'words' },
  lastName: { autoComplete: 'family-name', autoCapitalize: 'words' },
  email: { type: 'email', autoComplete: 'email', placeholder: t.contacts.form.placeholders.email },
  company: { autoComplete: 'organization', autoCapitalize: 'words' },
}

type ContactFieldInputsProps = {
  register: UseFormRegister<ContactFormValues>
  control: Control<ContactFormValues>
  setValue: UseFormSetValue<ContactFormValues>
  errors: FieldErrors<ContactFormValues>
  /** Fields left out of the layout, e.g. empty ones when "Hide empty fields" is on. */
  hiddenFields?: ReadonlySet<ContactField>
}

export function ContactFieldInputs({
  register,
  control,
  setValue,
  errors,
  hiddenFields,
}: ContactFieldInputsProps) {
  const visible = (field: ContactField) => !hiddenFields?.has(field)
  const email = useWatch({ control, name: 'email' }) ?? ''
  const emailSuggestion = errors.email ? null : suggestEmail(email)

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4">
      {(['firstName', 'lastName'] as const).filter(visible).map((field) => (
        <TextField
          key={field}
          label={FIELD_LABELS[field]}
          error={errors[field]?.message}
          className="col-span-2 sm:col-span-1"
          {...INPUT_PROPS[field]}
          {...register(field)}
        />
      ))}
      {visible('email') && (
        <div className="col-span-2">
          <TextField
            label={FIELD_LABELS.email}
            error={errors.email?.message}
            {...INPUT_PROPS.email}
            {...register('email')}
          />
          {emailSuggestion && (
            <p className="mt-1 text-xs text-gray-600">
              {t.contacts.form.didYouMean}{' '}
              <button
                type="button"
                className="font-medium text-primary-700 hover:underline"
                onClick={() =>
                  setValue('email', emailSuggestion, { shouldDirty: true, shouldValidate: true })
                }
              >
                {emailSuggestion}
              </button>
              ?
            </p>
          )}
        </div>
      )}
      {visible('phone') && (
        <div className="col-span-2">
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <PhoneField
                label={FIELD_LABELS.phone}
                name={field.name}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                error={errors.phone?.message}
              />
            )}
          />
        </div>
      )}
      {visible('company') && (
        <TextField
          label={FIELD_LABELS.company}
          error={errors.company?.message}
          className="col-span-2"
          {...INPUT_PROPS.company}
          {...register('company')}
        />
      )}
    </div>
  )
}
