import type { Contact, User } from '@crm/shared'
import { useQuery } from '@tanstack/react-query'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { notify } from '../../../components/ui/Toast'
import { Tooltip } from '../../../components/ui/Tooltip'
import { t } from '../../../i18n'
import { formatDateTime, formatRelative, timeZoneLabel } from '../../../lib/format'
import { userListQuery } from '../../users/api/userQueries'

/** "by Maya Patel", or nothing when the change came from the seed data. */
function ByLine({ userId, users }: { userId: string | null; users: User[] | undefined }) {
  if (!userId) return null
  const name = users?.find((user) => user.id === userId)?.name ?? t.contacts.record.formerTeammate
  return <span className="block text-xs text-gray-500">{t.contacts.record.by(name)}</span>
}

export function RecordInfo({ contact }: { contact: Contact }) {
  const [copied, setCopied] = useState(false)
  const users = useQuery(userListQuery()).data

  async function copyId() {
    try {
      await navigator.clipboard.writeText(contact.id)
      setCopied(true)
    } catch {
      notify.error(t.toasts.copyIdFailed, t.toasts.clipboardBlocked)
    }
  }

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-gray-500">{t.contacts.record.created}</dt>
      <dd className="text-gray-900">
        <time dateTime={contact.createdAt}>{formatDateTime(contact.createdAt)}</time>
        <ByLine userId={contact.createdBy} users={users} />
      </dd>
      <dt className="text-gray-500">{t.contacts.record.lastUpdated}</dt>
      <dd className="text-gray-900">
        <time dateTime={contact.updatedAt} title={formatDateTime(contact.updatedAt)}>
          {formatRelative(contact.updatedAt)}
        </time>
        <ByLine userId={contact.updatedBy} users={users} />
      </dd>
      <dt className="text-gray-500">{t.contacts.record.timeZone}</dt>
      <dd className="text-gray-900">{t.contacts.record.timesShownIn(timeZoneLabel)}</dd>
      <dt className="text-gray-500">{t.contacts.record.version}</dt>
      <dd className="text-gray-900 tabular-nums">{contact.version}</dd>
      <dt className="text-gray-500">{t.contacts.record.contactId}</dt>
      <dd className="flex min-w-0 items-center gap-1">
        <code className="truncate text-xs text-gray-700">{contact.id}</code>
        <Tooltip content={t.contacts.record.copyId}>
          <button
            type="button"
            onClick={() => void copyId()}
            onBlur={() => setCopied(false)}
            aria-label={copied ? t.contacts.record.copied : t.contacts.record.copyId}
            className="grid size-6 shrink-0 place-items-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            {copied ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <Copy className="size-3.5" aria-hidden />
            )}
          </button>
        </Tooltip>
      </dd>
    </dl>
  )
}
