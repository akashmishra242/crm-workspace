import type { Contact } from '@crm/shared'
import { Building2, Mail, Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar } from '../../../components/ui/Avatar'
import { formatPhone } from '../../../lib/format'
import { TagList } from '../../tags/components/TagList'
import { contactDisplayName } from '../utils/contactDisplayName'
import type { CardField } from './useDetailViewPreferences'

type ContactCardProps = {
  contact: Contact
  fields: CardField[]
}

export function ContactCard({ contact, fields }: ContactCardProps) {
  const lines: Record<CardField, ReactNode> = {
    email: contact.email && (
      <CardLine icon={<Mail className="size-3.5" aria-hidden />}>
        <a href={`mailto:${contact.email}`} className="truncate hover:text-primary-700">
          {contact.email}
        </a>
      </CardLine>
    ),
    phone: contact.phone && (
      <CardLine icon={<Phone className="size-3.5" aria-hidden />}>
        <a href={`tel:${contact.phone}`} className="hover:text-primary-700">
          {formatPhone(contact.phone)}
        </a>
      </CardLine>
    ),
    company: contact.company && (
      <CardLine icon={<Building2 className="size-3.5" aria-hidden />}>{contact.company}</CardLine>
    ),
    tags: contact.tags.length > 0 && (
      <div className="pt-1">
        <TagList tags={contact.tags} max={4} wrap />
      </div>
    ),
  }

  return (
    <section aria-label="Contact summary" className="flex gap-3">
      <Avatar id={contact.id} firstName={contact.firstName} lastName={contact.lastName} size="lg" />
      <div className="min-w-0 flex-1 space-y-1">
        <h1 className="truncate text-base font-semibold text-gray-900">
          {contactDisplayName(contact)}
        </h1>
        {fields.map((field) => (
          <div key={field}>{lines[field]}</div>
        ))}
      </div>
    </section>
  )
}

function CardLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-sm text-gray-600">
      <span className="shrink-0 text-gray-400">{icon}</span>
      {children}
    </p>
  )
}
