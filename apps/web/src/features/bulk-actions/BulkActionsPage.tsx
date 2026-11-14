import type { BulkActionRecord } from '@crm/shared'
import { useInfiniteQuery } from '@tanstack/react-query'
import { CheckCircle2, History } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { cn } from '../../lib/cn'
import {
  formatCount,
  formatDateTime,
  formatRelative,
  pluralize,
  timeZoneLabel,
} from '../../lib/format'
import { TAG_DOT_CLASSES } from '../tags/components/TagChip'
import { bulkActionListQuery } from './bulkActionQueries'

/**
 * Every bulk tag change, newest first: who ran it, on how many contacts, and what changed.
 * Bulk requests finish within the request today, so each one is "Completed"; the same table
 * would hold queued and running jobs once bulk work moves to a background worker.
 */
export function BulkActionsPage() {
  const actions = useInfiniteQuery(bulkActionListQuery())
  const records = actions.data?.pages.flatMap((page) => page.data) ?? []

  return (
    <div className="flex h-full min-h-0 flex-col">
      <title>Bulk actions · CRM Workspace</title>
      <PageHeader
        title="Bulk actions"
        meta={<span className="text-sm text-gray-500">Times in {timeZoneLabel}</span>}
      />
      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4 sm:px-6">
        <section
          aria-label="Bulk action history"
          className="overflow-hidden rounded-lg bg-white ring-1 ring-gray-200"
        >
          {actions.isPending ? (
            <div role="status" aria-label="Loading bulk actions" className="space-y-3 p-4">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-6 w-full" />
              ))}
            </div>
          ) : !actions.data ? (
            <ErrorState
              title="Couldn't load bulk actions"
              message={actions.error?.message ?? 'Please try again.'}
              onRetry={() => void actions.refetch()}
              retrying={actions.isFetching}
            />
          ) : records.length === 0 ? (
            <EmptyState
              icon={<History className="size-5" aria-hidden />}
              title="No bulk actions yet"
              description="Select contacts in the list and add or remove a tag. Each run is recorded here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-gray-50 text-xs font-medium text-gray-500">
                  <tr className="border-b border-gray-200">
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Action
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Result
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Run by
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      When
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
              Show older
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function BulkActionRow({ record }: { record: BulkActionRecord }) {
  const verb = record.action === 'add' ? 'Add tag' : 'Remove tag'
  const details = [
    record.unchangedCount > 0 &&
      `${formatCount(record.unchangedCount)} ${record.action === 'add' ? 'already had it' : 'didn’t have it'}`,
    record.notFoundCount > 0 && `${formatCount(record.notFoundCount)} no longer exist`,
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
          {pluralize(record.requestedCount, 'contact')} selected
        </span>
      </td>
      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="size-3.5" aria-hidden />
          Completed
        </span>
      </td>
      <td className="px-3 py-3">
        <span className="block">{pluralize(record.updatedCount, 'contact')} updated</span>
        {details.length > 0 && (
          <span className="block text-xs text-gray-500">{details.join(' · ')}</span>
        )}
      </td>
      <td className="px-3 py-3">{record.actor?.name ?? 'Unknown'}</td>
      <td className="px-3 py-3">
        <time dateTime={record.createdAt} title={formatDateTime(record.createdAt)}>
          {formatRelative(record.createdAt)}
        </time>
        <span className="block text-xs text-gray-500">{formatDateTime(record.createdAt)}</span>
      </td>
    </tr>
  )
}
