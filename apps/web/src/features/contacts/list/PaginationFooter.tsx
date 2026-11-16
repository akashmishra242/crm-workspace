import { MAX_PAGE_OFFSET, PAGE_SIZES, type PageSize } from '@crm/shared'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Button, IconButton } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { t } from '../../../i18n'
import { formatCount } from '../../../lib/format'

type PaginationFooterProps = {
  page: number
  pageSize: PageSize
  rowsOnPage: number
  total: number | undefined
  hasPrevious: boolean
  hasNext: boolean
  /** False while a page is loading, so repeated clicks can't skip pages. */
  canJump: boolean
  onFirst: () => void
  onPrevious: () => void
  onNext: () => void
  onJump: (page: number) => void
  /** The pointer is on (or focus moved to) "Next"; only set when preloading is turned on. */
  onNextIntent?: () => void
  onPageSizeChange: (size: PageSize) => void
}

const PAGE_SIZE_OPTIONS = PAGE_SIZES.map((size) => ({
  value: String(size),
  label: formatCount(size),
}))

/** A jump is fetched by offset, which the API caps; pages past it are reached with Next. */
const furthestJump = (pageSize: PageSize) => Math.floor(MAX_PAGE_OFFSET / pageSize) + 1

export function PaginationFooter({
  page,
  pageSize,
  rowsOnPage,
  total,
  hasPrevious,
  hasNext,
  canJump,
  onFirst,
  onPrevious,
  onNext,
  onJump,
  onNextIntent,
  onPageSizeChange,
}: PaginationFooterProps) {
  const pageCount = total === undefined ? undefined : Math.max(1, Math.ceil(total / pageSize))
  const maxJump = furthestJump(pageSize)
  const lastTooFar = pageCount !== undefined && pageCount > maxJump
  const firstRow = (page - 1) * pageSize + 1
  const lastRow = firstRow + rowsOnPage - 1

  return (
    <nav
      aria-label={t.contacts.pagination.label}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600"
    >
      <p className="hidden tabular-nums sm:block">
        {t.contacts.pagination.range(
          formatCount(firstRow),
          formatCount(lastRow),
          total === undefined ? undefined : formatCount(total),
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden text-gray-500 sm:inline">{t.contacts.pagination.rows}</span>
        <Select
          label={t.contacts.pagination.rowsPerPage}
          size="sm"
          className="w-20"
          value={String(pageSize)}
          options={PAGE_SIZE_OPTIONS}
          onChange={(size) => onPageSizeChange(Number(size) as PageSize)}
        />
        <PageJump
          // Remounts with the new page, so the box always starts from the page on screen.
          key={page}
          page={page}
          pageCount={pageCount}
          maxJump={maxJump}
          disabled={!canJump}
          onJump={onJump}
        />
        <IconButton
          size="sm"
          label={t.contacts.pagination.firstPage}
          icon={<ChevronsLeft className="size-4" />}
          disabled={!hasPrevious}
          onClick={onFirst}
        />
        <Button size="sm" disabled={!hasPrevious} onClick={onPrevious}>
          <ChevronLeft className="size-4" aria-hidden />
          {t.contacts.pagination.previous}
        </Button>
        <Button
          size="sm"
          disabled={!hasNext}
          onClick={onNext}
          onPointerEnter={onNextIntent}
          onFocus={onNextIntent}
        >
          {t.contacts.pagination.next}
          <ChevronRight className="size-4" aria-hidden />
        </Button>
        <IconButton
          size="sm"
          label={t.contacts.pagination.lastPage}
          icon={<ChevronsRight className="size-4" />}
          disabled={!hasNext || pageCount === undefined || !canJump || lastTooFar}
          disabledReason={lastTooFar ? t.contacts.pagination.lastPageTooFar : undefined}
          onClick={() => pageCount !== undefined && onJump(pageCount)}
        />
      </div>
    </nav>
  )
}

type PageJumpProps = {
  page: number
  pageCount: number | undefined
  /** The furthest page a jump can reach (see `furthestJump`). */
  maxJump: number
  disabled: boolean
  onJump: (page: number) => void
}

/** "Page [ 3 ] of 5,000": type a number and press Enter to go straight there. */
function PageJump({ page, pageCount, maxJump, disabled, onJump }: PageJumpProps) {
  const [draft, setDraft] = useState(String(page))
  // Escape blurs the box, and blur commits: this tells that blur to cancel instead.
  const cancelled = useRef(false)
  const digits = String(pageCount ?? page).length

  function commit(event?: FormEvent) {
    event?.preventDefault()
    const target = Number(draft)
    const valid =
      Number.isInteger(target) &&
      target >= 1 &&
      target <= maxJump &&
      (pageCount === undefined || target <= pageCount)
    if (valid && target !== page) onJump(target)
    else setDraft(String(page))
  }

  return (
    <form onSubmit={commit} className="flex items-center gap-1.5 tabular-nums">
      <label htmlFor="page-jump">{t.contacts.pagination.page}</label>
      <input
        id="page-jump"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={draft}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, '').slice(0, 7))}
        onBlur={() => {
          if (cancelled.current) {
            cancelled.current = false
            setDraft(String(page))
          } else {
            commit()
          }
        }}
        onFocus={(event) => event.target.select()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            cancelled.current = true
            event.currentTarget.blur()
          }
        }}
        aria-describedby="page-jump-hint"
        style={{ width: `${Math.max(2, digits) + 2}ch` }}
        className="h-8 rounded-md bg-white px-1.5 text-center text-sm text-gray-900 ring-1 ring-gray-300 ring-inset hover:ring-gray-400 focus:ring-2 focus:ring-primary-600 focus:outline-none disabled:text-gray-400"
      />
      {pageCount !== undefined && (
        <span>{t.contacts.pagination.pageCount(formatCount(pageCount))}</span>
      )}
      <span id="page-jump-hint" className="sr-only">
        {t.contacts.pagination.jumpHint}
      </span>
    </form>
  )
}
