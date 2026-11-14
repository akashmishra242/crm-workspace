import { Filter, Plus, SearchX, UserPlus, Users } from 'lucide-react'
import { useRef, useState } from 'react'
import { PageHeader } from '../../../components/layout/PageHeader'
import { Button } from '../../../components/ui/Button'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/States'
import { useKeyboardShortcut } from '../../../hooks/useKeyboardShortcut'
import { useIsMdUp } from '../../../hooks/useMediaQuery'
import { cn } from '../../../lib/cn'
import { isApiError } from '../../../lib/http'
import { formatCount, pluralize } from '../../../lib/format'
import { CreateContactDrawer } from '../create/CreateContactDrawer'
import { ActiveFilterChips } from './ActiveFilterChips'
import { AdvancedFiltersDrawer } from './AdvancedFiltersDrawer'
import { BulkActionBar } from './BulkActionBar'
import { ContactCards } from './ContactCards'
import { ContactSearch } from './ContactSearch'
import { ContactsTable } from './ContactsTable'
import { ManageFieldsPopover } from './ManageFieldsPopover'
import { PaginationFooter } from './PaginationFooter'
import { SortMenu } from './SortMenu'
import { countActiveFilters, serializeContactListParams } from './useContactListParams'
import { useContactSelection } from './useContactSelection'
import { useContactsList } from './useContactsList'
import { useListColumns } from './useListColumns'

export function ContactsPage() {
  const {
    listParams,
    pageSize,
    changePageSize,
    contacts,
    count,
    isSearchPending,
    prefetchPage,
    prefetchContact,
  } = useContactsList()
  const { filters, sort, order, page } = listParams
  const isMdUp = useIsMdUp()
  const columns = useListColumns()
  const selection = useContactSelection(JSON.stringify(filters))
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  useKeyboardShortcut('n', () => setCreateOpen(true))
  useKeyboardShortcut('Escape', selection.clear, { enabled: selection.count > 0 })

  const activeFilterCount = countActiveFilters(filters)
  const isFiltered = activeFilterCount > 0 || filters.q.trim() !== ''
  const isRefreshing = isSearchPending || (contacts.isFetching && contacts.isPlaceholderData)
  const contactPage = contacts.data
  const contactHref = (id: string) =>
    serializeContactListParams(`/contacts/${id}`, listParams.params)

  function goToPage(cursor: string | null, nextPage: number) {
    listParams.goToPage(nextPage <= 1 ? null : cursor, Math.max(1, nextPage))
    resultsRef.current?.scrollTo({ top: 0 })
  }

  function renderResults() {
    if (contacts.isPending) return <SkeletonRows rows={8} />
    if (!contactPage) {
      if (isApiError(contacts.error, 'VALIDATION_ERROR')) {
        return (
          <ErrorState
            title="These filters aren't valid"
            message={contacts.error.message}
            onRetry={listParams.clearSearchAndFilters}
            retryLabel="Reset search and filters"
          />
        )
      }
      return (
        <ErrorState
          title="Couldn't load contacts"
          message={contacts.error?.message ?? 'Please try again.'}
          onRetry={() => void contacts.refetch()}
          retrying={contacts.isFetching}
        />
      )
    }
    if (contactPage.data.length === 0 && page > 1) {
      return (
        <EmptyState
          icon={<SearchX className="size-5" aria-hidden />}
          title="This page is empty"
          description="The contacts that were here have changed since the page was loaded."
          action={<Button onClick={() => goToPage(null, 1)}>Go to first page</Button>}
        />
      )
    }
    if (contactPage.data.length === 0) {
      return isFiltered ? (
        <EmptyState
          icon={<SearchX className="size-5" aria-hidden />}
          title="No contacts match"
          description="Try a different search term or remove some filters."
          action={
            <Button onClick={listParams.clearSearchAndFilters}>Clear search and filters</Button>
          }
        />
      ) : (
        <EmptyState
          icon={<Users className="size-5" aria-hidden />}
          title="No contacts yet"
          description="Contacts you add will show up here."
          action={
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <UserPlus className="size-4" aria-hidden />
              Add contact
            </Button>
          }
        />
      )
    }
    return isMdUp ? (
      <ContactsTable
        contacts={contactPage.data}
        columns={columns.visibleColumns}
        widths={columns.widths}
        onResize={columns.resize}
        sort={sort}
        order={order}
        onSortChange={listParams.setSort}
        selection={selection}
        contactHref={contactHref}
        onRowIntent={prefetchContact}
      />
    ) : (
      <ContactCards contacts={contactPage.data} selection={selection} contactHref={contactHref} />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Contacts"
        meta={
          count.data ? (
            <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
              {pluralize(count.data.count, 'Contact')}
            </span>
          ) : (
            count.isPending && <Skeleton className="h-5 w-24 rounded-full" />
          )
        }
        actions={
          <Button variant="primary" aria-keyshortcuts="N" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            <span className="hidden sm:inline">Add contact</span>
            <span className="sm:hidden">Add</span>
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setFiltersOpen(true)}
            className={cn(
              activeFilterCount > 0 && 'bg-primary-50 text-primary-700 ring-primary-200',
            )}
          >
            <Filter className="size-4" aria-hidden />
            Advanced filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Button>
          <SortMenu sort={sort} order={order} onChange={listParams.setSort} />
          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            <ContactSearch
              value={filters.q}
              onChange={listParams.setSearch}
              isPending={isSearchPending}
              onArrowDown={() =>
                resultsRef.current?.querySelector<HTMLElement>('[data-row-link]')?.focus()
              }
            />
            {isMdUp && <ManageFieldsPopover columns={columns} />}
          </div>
        </div>

        <ActiveFilterChips
          filters={filters}
          onChange={listParams.setFilters}
          onClearAll={listParams.clearFilters}
        />

        {selection.count > 0 && <BulkActionBar selection={selection} />}

        {contacts.isError && contactPage && (
          <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Couldn't refresh the results, so you're seeing the previous ones.{' '}
            <button
              type="button"
              className="font-medium underline"
              onClick={() => void contacts.refetch()}
            >
              Try again
            </button>
          </p>
        )}

        <section
          aria-label="Contact results"
          aria-busy={isRefreshing}
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-white ring-1 ring-gray-200"
        >
          {isRefreshing && <ProgressBar />}
          <div
            ref={resultsRef}
            className={cn(
              'min-h-0 flex-1 overflow-auto transition-opacity',
              isRefreshing && 'opacity-60',
            )}
          >
            {renderResults()}
          </div>
          {contactPage && contactPage.data.length > 0 && (
            <PaginationFooter
              page={page}
              pageSize={pageSize}
              rowsOnPage={contactPage.data.length}
              total={count.data?.count}
              // While the next page loads, the cursors still belong to the page on screen.
              hasPrevious={!contacts.isPlaceholderData && contactPage.page.prevCursor !== null}
              hasNext={!contacts.isPlaceholderData && contactPage.page.nextCursor !== null}
              onFirst={() => goToPage(null, 1)}
              onPrevious={() => goToPage(contactPage.page.prevCursor, page - 1)}
              onNext={() => goToPage(contactPage.page.nextCursor, page + 1)}
              onNextIntent={() => {
                if (contactPage.page.nextCursor) prefetchPage(contactPage.page.nextCursor)
              }}
              onPageSizeChange={changePageSize}
            />
          )}
        </section>
      </div>

      <p aria-live="polite" className="sr-only">
        {count.data && !isRefreshing ? `${formatCount(count.data.count)} contacts found` : ''}
      </p>

      <AdvancedFiltersDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onApply={listParams.setFilters}
        onClear={listParams.clearFilters}
      />
      <CreateContactDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

function SkeletonRows({ rows }: { rows: number }) {
  return (
    <div role="status" aria-label="Loading contacts" className="divide-y divide-gray-100">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex h-12 items-center gap-4 px-4">
          <Skeleton className="size-4" />
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="hidden h-3 w-28 md:block" />
          <Skeleton className="hidden h-3 w-48 md:block" />
          <Skeleton className="ml-auto h-5 w-20" />
        </div>
      ))}
      {/* Revealed by CSS after a few seconds: only a cold-starting server takes this long. */}
      <p className="animate-[fade-in_300ms_ease-out_4s_both] px-4 py-6 text-center text-sm text-gray-500">
        Waking up the server. The free hosting tier sleeps when idle, so this can take up to a
        minute.
      </p>
    </div>
  )
}
