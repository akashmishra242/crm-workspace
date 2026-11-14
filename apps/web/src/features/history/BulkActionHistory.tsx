import type { BulkActionRecord } from '@crm/shared'
import { useInfiniteQuery } from '@tanstack/react-query'
import { CheckCircle2, History } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatCount, formatDateTime, formatRelative, pluralize } from '../../lib/format'
import { TAG_DOT_CLASSES } from '../tags/components/TagChip'
import { bulkActionListQuery } from './historyQueries'

/**
 * Every bulk tag change, newest first: who ran it, on how many contacts, and what changed.
 * Bulk requests finish within the request today, so each one is "Completed"; the same table
 * would hold queued and running jobs once bulk work moves to a background worker.
 */
export function BulkActionHistory() {
  const actions = useInfiniteQuery(bulkActionListQuery())
  const records = actions.data?.pages.flatMap((page) => page.data) ?? []

  return (
    <div>
      <div>
        <section
          aria-label={t.bulkActions.history}
          className="overflow-hidden rounded-lg bg-white ring-1 ring-gray-200"
        >
          {actions.isPending ? (
            <div role="status" aria-label={t.bulkActions.loading} className="space-y-3 p-4">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-6 w-full" />
              ))}
            </div>
          ) : !actions.data ? (
            <ErrorState
              title={t.bulkActions.loadFailed}
              message={actions.error?.message ?? t.common.pleaseTryAgain}
              onRetry={() => void actions.refetch()}
              retrying={actions.isFetching}
            />
          ) : records.length === 0 ? (
            <EmptyState
              icon={<History className="size-5" aria-hidden />}
              title={t.bulkActions.none}
              description={t.bulkActions.noneDescription}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-gray-50 text-xs font-medium text-gray-500">
                  <tr className="border-b border-gray-200">
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      {t.bulkActions.columns.action}
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      {t.bulkActions.columns.status}
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      {t.bulkActions.columns.result}
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      {t.bulkActions.columns.runBy}
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      {t.bulkActions.columns.when}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((record) => (
                    <BulkActionRow key={record.id} record={record} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {actions.hasNextPage && (
          <div className="mt-3 flex justify-center">
            <Button
              size="sm"
              variant="ghost"
              loading={actions.isFetchingNextPage}
              onClick={() => void actions.fetchNextPage()}
            >
              {t.bulkActions.showOlder}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

const contacts = (count: number) => pluralize(count, t.common.contact.one, t.common.contact.other)

function BulkActionRow({ record }: { record: BulkActionRecord }) {
  const verb = record.action === 'add' ? t.bulkActions.addTag : t.bulkActions.removeTag
  const unchanged = formatCount(record.unchangedCount)
  const details = [
    record.unchangedCount > 0 &&
      (record.action === 'add'
        ? t.contacts.bulk.alreadyHadIt(unchanged)
        : t.contacts.bulk.didNotHaveIt(unchanged)),
    record.notFoundCount > 0 && t.bulkActions.noLongerExist(formatCount(record.notFoundCount)),
  ].filter(Boolean)

  return (
    <tr className="text-gray-700">
      <td className="px-4 py-3">
        <span className="flex items-center gap-2">
          {verb}
          <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium">
            <span
              aria-hidden
              className={cn('size-1.5 rounded-full', TAG_DOT_CLASSES[record.tag.color])}
            />
            {record.tag.name}
          </span>
        </span>
        <span className="mt-0.5 block text-xs text-gray-500">
          {t.bulkActions.selected(contacts(record.requestedCount))}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="size-3.5" aria-hidden />
          {t.bulkActions.completed}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className="block">{t.bulkActions.updated(contacts(record.updatedCount))}</span>
        {details.length > 0 && (
          <span className="block text-xs text-gray-500">{details.join(' · ')}</span>
        )}
      </td>
      <td className="px-3 py-3">{record.actor?.name ?? t.bulkActions.unknownActor}</td>
      <td className="px-3 py-3">
        <time dateTime={record.createdAt} title={formatDateTime(record.createdAt)}>
          {formatRelative(record.createdAt)}
        </time>
        <span className="block text-xs text-gray-500">{formatDateTime(record.createdAt)}</span>
      </td>
    </tr>
  )
}
