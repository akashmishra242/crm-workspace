import type { Contact } from '@crm/shared'
import { Mail, Phone } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar } from '../../../components/ui/Avatar'
import { Checkbox } from '../../../components/ui/Checkbox'
import { cn } from '../../../lib/cn'
import { formatPhone, formatRelative } from '../../../lib/format'
import { TagList } from '../../tags/components/TagList'
import { contactDisplayName } from '../utils/contactDisplayName'
import type { ContactSelection } from './useContactSelection'

type ContactCardsProps = {
  contacts: Contact[]
  selection: ContactSelection
  contactHref: (id: string) => string
}

/** Phone layout: a wide table is unusable at 375px, so each contact becomes a card. */
export function ContactCards({ contacts, selection, contactHref }: ContactCardsProps) {
  return (
    <ul className="divide-y divide-gray-100 bg-white">
      {contacts.map((contact) => {
        const selected = selection.isSelected(contact.id)
        const name = contactDisplayName(contact)
        return (
          <li
            key={contact.id}
            className={cn('flex gap-3 px-4 py-3', selected && 'bg-primary-50/60')}
          >
            <Checkbox
              className="mt-1.5"
              aria-label={`Select ${name}`}
              checked={selected}
              onCheckedChange={(checked) => selection.toggle(contact.id, checked === true)}
            />
            <Link
              to={contactHref(contact.id)}
              data-row-link
              onClick={(event) => {
                // Same rule as the table: while selecting, a tap adds or removes the contact.
                if (selection.count === 0) return
                event.preventDefault()
                selection.toggle(contact.id, !selected)
              }}
              className="flex min-w-0 flex-1 gap-3"
            >
              <Avatar id={contact.id} firstName={contact.firstName} lastName={contact.lastName} />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-medium text-gray-900">{name}</p>
                  {contact.lastActivityAt && (
                    <time
                      dateTime={contact.lastActivityAt}
                      className="shrink-0 text-xs text-gray-500"
                    >
                      {formatRelative(contact.lastActivityAt)}
                    </time>
                  )}
                </div>
                {contact.email && (
                  <p className="flex items-center gap-1.5 truncate text-gray-600">
                    <Mail className="size-3.5 shrink-0 text-gray-400" aria-hidden />
                    {contact.email}
                  </p>
                )}
                {contact.phone && (
                  <p className="flex items-center gap-1.5 text-gray-600">
                    <Phone className="size-3.5 shrink-0 text-gray-400" aria-hidden />
                    {formatPhone(contact.phone)}
                  </p>
                )}
                {contact.tags.length > 0 && <TagList tags={contact.tags} max={3} wrap />}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
