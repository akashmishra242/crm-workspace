import { ACTIVITY_TYPES, type ActivityType } from '@crm/shared'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { createParser, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { NavLink } from 'react-router'
import { z } from 'zod'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { timeZoneLabel } from '../../lib/format'
import { ActivityItem } from '../activity/components/ActivityItem'
import { groupByDay } from '../activity/components/ActivityTimeline'
import { userListQuery } from '../users/api/userQueries'
import { BulkActionHistory } from './BulkActionHistory'
import { activityFeedQuery } from './historyQueries'

export type HistoryTab = 'contacts' | 'bulk'

const TABS: ReadonlyArray<{ id: HistoryTab; to: string; label: string }> = [
  { id: 'contacts', to: '/history', label: t.history.tabs.contacts },
  { id: 'bulk', to: '/history/bulk', label: t.history.tabs.bulk },
]

/** Every change, as an audit trail: one tab per kind of record. */
export function HistoryPage({ tab }: { tab: HistoryTab }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <title>{t.shell.documentTitle(t.history.title)}</title>
      <PageHeader
        title={t.history.title}
        meta={<span className="text-sm text-gray-500">{t.history.timesIn(timeZoneLabel)}</span>}
      />
      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4 sm:px-6">
        <nav aria-label={t.history.title} className="mb-4 flex gap-4 border-b border-gray-200">
          {TABS.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end
              aria-current={item.id === tab ? 'page' : undefined}
              className={cn(
                '-mb-px h-10 border-b-2 text-sm font-medium',
                item.id === tab
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900',
              )}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        {tab === 'contacts' ? <ContactChanges /> : <BulkActionHistory />}
      </div>
    </div>
  )
}

const parseAsUserId = createParser({
  parse: (value) => (z.uuid().safeParse(value).success ? value : null),
  serialize: (value: string) => value,
})

const feedParsers = {
  type: parseAsStringLiteral(ACTIVITY_TYPES),
  by: parseAsUserId,
}

type TypeChoice = ActivityType | 'all'

function ContactChanges() {
  const [filters, setFilters] = useQueryStates(feedParsers)
  const users = useQuery(userListQuery())
  const feed = useInfiniteQuery(activityFeedQuery({ type: filters.type, actorId: filters.by }))
  const items = feed.data?.pages.flatMap((page) => page.data) ?? []
  const filtered = filters.type !== null || filters.by !== null

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Select<TypeChoice>
          label={t.history.filters.kind}
          className="w-52"
          value={filters.type ?? 'all'}
          onChange={(type) => void setFilters({ type: type === 'all' ? null : type })}
          options={[
            { value: 'all', label: t.history.filters.allKinds },
            ...ACTIVITY_TYPES.map((type) => ({ value: type, label: t.history.kinds[type] })),
          ]}
        />
        <Select
          label={t.history.filters.teammate}
          className="w-52"
          value={filters.by ?? 'all'}
          onChange={(by) => void setFilters({ by: by === 'all' ? null : by })}
          options={[
            { value: 'all', label: t.history.filters.everyone },
            ...(users.data ?? []).map((user) => ({ value: user.id, label: user.name })),
          ]}
        />
      </div>

      <section
        aria-label={t.history.tabs.contacts}
        className="rounded-lg bg-white p-4 ring-1 ring-gray-200"
      >
        {feed.isPending ? (
          <div role="status" aria-label={t.history.loading} className="space-y-4">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : !feed.data ? (
          <ErrorState
            title={t.history.loadFailed}
            message={feed.error?.message ?? t.common.pleaseTryAgain}
            onRetry={() => void feed.refetch()}
            retrying={feed.isFetching}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<History className="size-5" aria-hidden />}
            title={filtered ? t.history.noMatches : t.history.none}
            action={
              filtered && (
                <Button onClick={() => void setFilters({ type: null, by: null })}>
                  {t.common.clearAll}
                </Button>
              )
            }
          />
        ) : (
          groupByDay(items).map((group) => (
            <section key={group.day} aria-label={group.day} className="mb-4">
              <h3 className="mb-3 flex justify-center">
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {group.day}
                </span>
              </h3>
              <ol>
                {group.items.map((item) => (
                  <ActivityItem
                    key={item.id}
                    activity={item}
                    subject={
                      <NavLink
                        to={`/contacts/${item.contactId}`}
                        className="text-primary-700 hover:underline"
                      >
                        {item.contactName}
                      </NavLink>
                    }
                  />
                ))}
              </ol>
            </section>
          ))
        )}
      </section>
      {feed.hasNextPage && (
        <div className="mt-3 flex justify-center">
          <Button
            size="sm"
            variant="ghost"
            loading={feed.isFetchingNextPage}
            onClick={() => void feed.fetchNextPage()}
          >
            {t.history.showOlder}
          </Button>
        </div>
      )}
    </div>
  )
}
