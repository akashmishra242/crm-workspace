import type { ContactField, ContactFormValues } from '@crm/shared'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { TextField } from '../../../components/ui/TextField'
import { FIELD_LABELS } from './contactForm'

const INPUT_PROPS: Record<
  ContactField,
  { type?: string; autoComplete: string; placeholder?: string }
> = {
  firstName: { autoComplete: 'given-name' },
  lastName: { autoComplete: 'family-name' },
  email: { type: 'email', autoComplete: 'email', placeholder: 'name@company.com' },
  phone: { type: 'tel', autoComplete: 'tel', placeholder: '+1 415 555 0123' },
  company: { autoComplete: 'organization' },
}

type ContactFieldInputsProps = {
  register: UseFormRegister<ContactFormValues>
  errors: FieldErrors<ContactFormValues>
  /** Fields left out of the layout, e.g. empty ones when "Hide empty fields" is on. */
  hiddenFields?: ReadonlySet<ContactField>
}

export function ContactFieldInputs({ register, errors, hiddenFields }: ContactFieldInputsProps) {
  const visible = (field: ContactField) => !hiddenFields?.has(field)

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
      {(['email', 'phone', 'company'] as const).filter(visible).map((field) => (
        <TextField
          key={field}
          label={FIELD_LABELS[field]}
          error={errors[field]?.message}
          className="col-span-2"
          {...INPUT_PROPS[field]}
          {...register(field)}
        />
      ))}
    </div>
  )
}
