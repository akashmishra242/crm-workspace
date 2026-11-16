import { Filter, Plus, SearchX, UserPlus, Users } from 'lucide-react'
import { Suspense, useState } from 'react'
import { PageHeader } from '../../../components/layout/PageHeader'
import { Button } from '../../../components/ui/Button'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/States'
import { useKeyboardShortcut } from '../../../hooks/useKeyboardShortcut'
import { useIsMdUp } from '../../../hooks/useMediaQuery'
import { t } from '../../../i18n'
import { cn } from '../../../lib/cn'
import { isApiError } from '../../../lib/http'
import { formatCount, pluralize } from '../../../lib/format'
import { lazyWithPreload } from '../../../lib/lazyWithPreload'
import { ActiveFilterChips } from './ActiveFilterChips'
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

// Drawers are separate chunks: most visits never open them. Hovering the button that opens
// one starts the download, so it is usually ready by the time of the click.
export const AdvancedFiltersDrawer = lazyWithPreload(() => import('./AdvancedFiltersDrawer'))
export const CreateContactDrawer = lazyWithPreload(() => import('../create/CreateContactDrawer'))

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
  // State, not a ref: the virtualized table must re-render once the scroll container exists.
  // With a ref it measured before the container was attached, and a page restored from the
  // cache (pressing Back) rendered no rows at all.
  const [resultsElement, setResultsElement] = useState<HTMLDivElement | null>(null)

  useKeyboardShortcut('n', () => setCreateOpen(true))
  useKeyboardShortcut('Escape', selection.clear, { enabled: selection.count > 0 })

  const activeFilterCount = countActiveFilters(filters)
  const isFiltered = activeFilterCount > 0 || filters.q.trim() !== ''
  const isRefreshing = isSearchPending || (contacts.isFetching && contacts.isPlaceholderData)
  const contactPage = contacts.data
  const contactHref = (id: string) =>
    serializeContactListParams(`/contacts/${id}`, listParams.params)

  function goToPage(cursor: string | null, nextPage: number) {
    listParams.goToPage(cursor, Math.max(1, nextPage))
    resultsElement?.scrollTo({ top: 0 })
  }

  function renderResults() {
    if (contacts.isPending) return <SkeletonRows rows={8} />
    if (!contactPage) {
      if (isApiError(contacts.error, 'VALIDATION_ERROR')) {
        return (
          <ErrorState
            title={t.contacts.list.invalidFilters}
            message={contacts.error.message}
            onRetry={listParams.clearSearchAndFilters}
            retryLabel={t.contacts.list.resetSearchAndFilters}
          />
        )
      }
      return (
        <ErrorState
          title={t.contacts.list.loadFailed}
          message={contacts.error?.message ?? t.common.pleaseTryAgain}
          onRetry={() => void contacts.refetch()}
          retrying={contacts.isFetching}
        />
      )
    }
    if (contactPage.data.length === 0 && page > 1) {
      return (
        <EmptyState
          icon={<SearchX className="size-5" aria-hidden />}
          title={t.contacts.list.emptyPage}
          description={t.contacts.list.emptyPageDescription}
          action={
            <Button onClick={() => goToPage(null, 1)}>{t.contacts.list.goToFirstPage}</Button>
          }
        />
      )
    }
    if (contactPage.data.length === 0) {
      return isFiltered ? (
        <EmptyState
          icon={<SearchX className="size-5" aria-hidden />}
          title={t.contacts.list.noMatches}
          description={t.contacts.list.noMatchesDescription}
          action={
            <Button onClick={listParams.clearSearchAndFilters}>
              {t.contacts.list.clearSearchAndFilters}
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={<Users className="size-5" aria-hidden />}
          title={t.contacts.list.noContacts}
          description={t.contacts.list.noContactsDescription}
          action={
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <UserPlus className="size-4" aria-hidden />
              {t.contacts.list.addContact}
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
        scrollElement={resultsElement}
      />
    ) : (
      <ContactCards
        contacts={contactPage.data}
        selection={selection}
        contactHref={contactHref}
        scrollElement={resultsElement}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title={t.contacts.list.title}
        meta={
          count.data ? (
            <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
              {pluralize(count.data.count, t.contacts.list.count.one, t.contacts.list.count.other)}
            </span>
          ) : (
            count.isPending && <Skeleton className="h-5 w-24 rounded-full" />
          )
        }
        actions={
          <Button
            variant="primary"
            aria-keyshortcuts="N"
            onPointerEnter={CreateContactDrawer.preload}
            onFocus={CreateContactDrawer.preload}
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t.contacts.list.addContact}</span>
            <span className="sm:hidden">{t.contacts.list.add}</span>
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onPointerEnter={AdvancedFiltersDrawer.preload}
            onFocus={AdvancedFiltersDrawer.preload}
            onClick={() => setFiltersOpen(true)}
            variant={activeFilterCount > 0 ? 'selected' : 'secondary'}
          >
            <Filter className="size-4" aria-hidden />
            {t.contacts.list.advancedFilters}
            {activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Button>
          <SortMenu sort={sort} order={order} onChange={listParams.setSort} />
          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            <ContactSearch
              value={filters.q}
              onChange={listParams.setSearch}
              isPending={isSearchPending}
              onArrowDown={() =>
                resultsElement?.querySelector<HTMLElement>('[data-row-link]')?.focus()
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
            {t.contacts.list.refreshFailed}{' '}
            <button
              type="button"
              className="font-medium underline"
              onClick={() => void contacts.refetch()}
            >
              {t.common.tryAgain}
            </button>
          </p>
        )}

        <section
          aria-label={t.contacts.list.results}
          aria-busy={isRefreshing}
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-white ring-1 ring-gray-200"
        >
          {isRefreshing && <ProgressBar />}
          <div
            ref={setResultsElement}
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
              canJump={!contacts.isPlaceholderData}
              onFirst={() => goToPage(null, 1)}
              onPrevious={() => goToPage(contactPage.page.prevCursor, page - 1)}
              onNext={() => goToPage(contactPage.page.nextCursor, page + 1)}
              onJump={(target) => goToPage(null, target)}
              onNextIntent={
                prefetchPage && contactPage.page.nextCursor
                  ? () => prefetchPage(contactPage.page.nextCursor as string)
                  : undefined
              }
              onPageSizeChange={changePageSize}
            />
          )}
        </section>
      </div>

      <p aria-live="polite" className="sr-only">
        {count.data && !isRefreshing ? t.contacts.list.found(formatCount(count.data.count)) : ''}
      </p>

      <Suspense>
        {filtersOpen && (
          <AdvancedFiltersDrawer
            open
            onOpenChange={setFiltersOpen}
            filters={filters}
            onApply={listParams.setFilters}
          />
        )}
        {createOpen && <CreateContactDrawer open onOpenChange={setCreateOpen} />}
      </Suspense>
    </div>
  )
}

function SkeletonRows({ rows }: { rows: number }) {
  return (
    <div role="status" aria-label={t.contacts.list.loading} className="divide-y divide-gray-100">
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
        {t.contacts.list.wakingUp}
      </p>
    </div>
  )
}
