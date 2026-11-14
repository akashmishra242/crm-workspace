import { PAGE_SIZES, type PageSize } from '@crm/shared'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button, IconButton } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
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
  const firstRow = (page - 1) * pageSize + 1
  const lastRow = firstRow + rowsOnPage - 1

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600"
    >
      <p className="hidden tabular-nums sm:block">
        {formatCount(firstRow)}–{formatCount(lastRow)}
        {total !== undefined && ` of ${formatCount(total)}`}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden text-gray-500 sm:inline">Rows</span>
        <Select
          label="Rows per page"
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
          disabled={!canJump}
          onJump={onJump}
        />
        <IconButton
          size="sm"
          label="First page"
          icon={<ChevronsLeft className="size-4" />}
          disabled={!hasPrevious}
          onClick={onFirst}
        />
        <Button size="sm" disabled={!hasPrevious} onClick={onPrevious}>
          <ChevronLeft className="size-4" aria-hidden />
          Prev
        </Button>
        <Button
          size="sm"
          disabled={!hasNext}
          onClick={onNext}
          onPointerEnter={onNextIntent}
          onFocus={onNextIntent}
        >
          Next
          <ChevronRight className="size-4" aria-hidden />
        </Button>
        <IconButton
          size="sm"
          label="Last page"
          icon={<ChevronsRight className="size-4" />}
          disabled={!hasNext || pageCount === undefined || !canJump}
          onClick={() => pageCount !== undefined && onJump(pageCount)}
        />
      </div>
    </nav>
  )
}

type PageJumpProps = {
  page: number
  pageCount: number | undefined
  disabled: boolean
  onJump: (page: number) => void
}

/** "Page [ 3 ] of 5,000": type a number and press Enter to go straight there. */
function PageJump({ page, pageCount, disabled, onJump }: PageJumpProps) {
  const [draft, setDraft] = useState(String(page))
  const digits = String(pageCount ?? page).length

  function commit(event?: FormEvent) {
    event?.preventDefault()
    const target = Number(draft)
    const valid =
      Number.isInteger(target) && target >= 1 && (pageCount === undefined || target <= pageCount)
    if (valid && target !== page) onJump(target)
    else setDraft(String(page))
  }

  return (
    <form onSubmit={commit} className="flex items-center gap-1.5 tabular-nums">
      <label htmlFor="page-jump">Page</label>
      <input
        id="page-jump"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={draft}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, '').slice(0, 7))}
        onBlur={() => commit()}
        onFocus={(event) => event.target.select()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setDraft(String(page))
            event.currentTarget.blur()
          }
        }}
        aria-describedby="page-jump-hint"
        style={{ width: `${Math.max(2, digits) + 2}ch` }}
        className="h-8 rounded-md bg-white px-1.5 text-center text-sm text-gray-900 ring-1 ring-gray-300 ring-inset hover:ring-gray-400 focus:ring-2 focus:ring-primary-600 focus:outline-none disabled:text-gray-400"
      />
      {pageCount !== undefined && <span>of {formatCount(pageCount)}</span>}
      <span id="page-jump-hint" className="sr-only">
        Type a page number and press Enter
      </span>
    </form>
  )
}
