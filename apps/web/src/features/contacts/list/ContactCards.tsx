import type { Contact } from '@crm/shared'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Mail, Phone } from 'lucide-react'
import type { RefObject } from 'react'
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
  scrollRef: RefObject<HTMLDivElement | null>
}

/** Same threshold as the table. Cards vary in height, so each one is measured once shown. */
const VIRTUALIZE_ABOVE = 100
const ESTIMATED_CARD_PX = 96

/** Phone layout: a wide table is unusable at 375px, so each contact becomes a card. */
export function ContactCards({ contacts, selection, contactHref, scrollRef }: ContactCardsProps) {
  const virtualize = contacts.length > VIRTUALIZE_ABOVE
  // The React Compiler isn't used here; the virtualizer re-renders through its own state.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: contacts.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_CARD_PX,
    overscan: 8,
    enabled: virtualize,
  })
  const virtualItems = virtualize ? virtualizer.getVirtualItems() : null
  const indexes = virtualItems ? virtualItems.map((item) => item.index) : contacts.map((_, i) => i)

  return (
    <ul
      className="relative divide-y divide-gray-100 bg-white"
      style={virtualize ? { height: virtualizer.getTotalSize() } : undefined}
    >
      {indexes.map((index, position) => {
        const contact = contacts[index]
        if (!contact) return null
        const selected = selection.isSelected(contact.id)
        const name = contactDisplayName(contact)
        const start = virtualItems?.[position]?.start
        return (
          <li
            key={contact.id}
            data-index={index}
            ref={virtualize ? virtualizer.measureElement : undefined}
            style={
              start === undefined
                ? undefined
                : {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${start}px)`,
                  }
            }
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
                if (selection.count === 0 || event.detail === 0) return
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
