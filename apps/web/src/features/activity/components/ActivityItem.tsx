import { CONTACT_FIELDS, type Activity, type ActivityType, type ContactField } from '@crm/shared'
import { Pencil, Tag, TagsIcon, UserPlus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar } from '../../../components/ui/Avatar'
import { LOCALE, t } from '../../../i18n'
import { cn } from '../../../lib/cn'
import { formatDateTime, formatPhone, formatTime } from '../../../lib/format'
import { FIELD_LABELS } from '../../contacts/form/contactForm'
import { TagChip } from '../../tags/components/TagChip'

const APPEARANCE: Record<ActivityType, { icon: typeof Pencil; badge: string }> = {
  CONTACT_CREATED: { icon: UserPlus, badge: 'bg-violet-50 text-violet-600 ring-violet-100' },
  CONTACT_UPDATED: { icon: Pencil, badge: 'bg-sky-50 text-sky-600 ring-sky-100' },
  TAG_ADDED: { icon: Tag, badge: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
  TAG_REMOVED: { icon: TagsIcon, badge: 'bg-rose-50 text-rose-600 ring-rose-100' },
}

const listFormat = new Intl.ListFormat(LOCALE, { type: 'conjunction' })

function displayValue(field: ContactField, value: string | null) {
  if (value === null || value === '') return null
  return field === 'phone' ? formatPhone(value) : value
}

function ChangeRow({
  field,
  from,
  to,
}: {
  field: ContactField
  from: string | null
  to: string | null
}) {
  const before = displayValue(field, from)
  const after = displayValue(field, to)
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
      <span className="w-16 shrink-0 text-gray-500">{FIELD_LABELS[field]}</span>
      {before ? (
        <del className="rounded bg-red-50 px-1.5 py-0.5 break-all text-red-700">{before}</del>
      ) : (
        <span className="text-gray-400 italic">{t.activity.empty}</span>
      )}
      <span aria-hidden className="text-gray-400">
        →
      </span>
      <span className="sr-only">{t.activity.changedTo}</span>
      {after ? (
        <ins className="rounded bg-emerald-50 px-1.5 py-0.5 break-all text-emerald-700 no-underline">
          {after}
        </ins>
      ) : (
        <span className="text-gray-400 italic">{t.activity.cleared}</span>
      )}
    </div>
  )
}

function describe(activity: Activity): { title: ReactNode; body?: ReactNode } {
  switch (activity.type) {
    case 'CONTACT_CREATED':
      return { title: t.activity.contactCreated }
    case 'CONTACT_UPDATED': {
      const { changes } = activity.payload
      const fields = CONTACT_FIELDS.filter((field) => changes[field])
      return {
        title: t.activity.updated(
          listFormat.format(fields.map((field) => FIELD_LABELS[field].toLowerCase())),
        ),
        body: (
          <div className="mt-2 space-y-1.5">
            {fields.map((field) => {
              const change = changes[field]
              return change && <ChangeRow key={field} field={field} {...change} />
            })}
          </div>
        ),
      }
    }
    case 'TAG_ADDED':
    case 'TAG_REMOVED': {
      const { tagId, tagName, tagColor, source } = activity.payload
      const added = activity.type === 'TAG_ADDED'
      return {
        title: (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {added ? t.activity.tagAdded : t.activity.tagRemoved}
            <span className={cn(!added && 'line-through decoration-rose-400 opacity-70')}>
              <TagChip tag={{ id: tagId, name: tagName, color: tagColor }} />
            </span>
            {source === 'bulk' && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                {t.activity.bulkAction}
              </span>
            )}
          </span>
        ),
      }
    }
  }
}

function Actor({ actor }: { actor: Activity['actor'] }) {
  if (!actor) return <span className="text-gray-400">{t.activity.system}</span>
  const [firstName = '', ...rest] = actor.name.split(' ')
  return (
    <span className="flex min-w-0 items-center gap-1.5" title={actor.email}>
      <Avatar id={actor.id} firstName={firstName} lastName={rest.join(' ')} size="xs" />
      <span className="truncate font-medium text-gray-600">{actor.name}</span>
      <span className="hidden truncate text-gray-400 sm:inline">{actor.email}</span>
    </span>
  )
}

export function ActivityItem({ activity }: { activity: Activity }) {
  const { icon: Icon, badge } = APPEARANCE[activity.type]
  const { title, body } = describe(activity)

  return (
    <li className="group relative flex gap-3 pb-5 last:pb-0">
      <span
        aria-hidden
        className="absolute top-8 bottom-0 left-[15px] w-px bg-gray-200 group-last:hidden"
      />
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-full ring-4', badge)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <time
            dateTime={activity.createdAt}
            title={formatDateTime(activity.createdAt)}
            className="shrink-0 pt-0.5 text-xs text-gray-500"
          >
            {formatTime(activity.createdAt)}
          </time>
        </div>
        {body}
        <div className="mt-1.5 flex items-center text-xs">
          <Actor actor={activity.actor} />
        </div>
      </div>
    </li>
  )
}
