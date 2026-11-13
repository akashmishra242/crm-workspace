import type { Activity } from '@crm/shared'
import { useInfiniteQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/States'
import { formatDate } from '../../../lib/format'
import { contactActivityQuery } from '../api/activityQueries'
import { ActivityItem } from './ActivityItem'

/** Groups newest-first activity under one heading per calendar day. */
function groupByDay(activities: Activity[]): Array<{ day: string; items: Activity[] }> {
  const groups: Array<{ day: string; items: Activity[] }> = []
  for (const activity of activities) {
    const day = formatDate(activity.createdAt)
    const last = groups.at(-1)
    if (last?.day === day) last.items.push(activity)
    else groups.push({ day, items: [activity] })
  }
  return groups
}

export function ActivityTimeline({ contactId }: { contactId: string }) {
  const activity = useInfiniteQuery(contactActivityQuery(contactId))

  if (activity.isPending) {
    return (
      <div role="status" aria-label="Loading activity" className="space-y-4 p-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex gap-3">
            <Skeleton className="size-7 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!activity.data) {
    return (
      <ErrorState
        title="Couldn't load activity"
        message={activity.error?.message ?? 'Please try again.'}
        onRetry={() => void activity.refetch()}
        retrying={activity.isFetching}
      />
    )
  }

  const activities = activity.data.pages.flatMap((page) => page.data)
  if (activities.length === 0) {
    return <EmptyState icon={<History className="size-5" aria-hidden />} title="No activity yet" />
  }

  return (
    <div className="p-4">
      {groupByDay(activities).map((group) => (
        <section key={group.day} aria-label={group.day} className="mb-4">
          <h3 className="mb-3 flex justify-center">
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {group.day}
            </span>
          </h3>
          <ol>
            {group.items.map((item) => (
              <ActivityItem key={item.id} activity={item} />
            ))}
          </ol>
        </section>
      ))}
      {activity.isFetchNextPageError && (
        <p role="alert" className="mb-2 text-center text-xs text-red-600">
          Couldn't load older activity.
        </p>
      )}
      {activity.hasNextPage && (
        <div className="flex justify-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void activity.fetchNextPage()}
            loading={activity.isFetchingNextPage}
          >
            Show older activity
          </Button>
        </div>
      )}
    </div>
  )
}
