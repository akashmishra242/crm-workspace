import { PAGE_SIZES, type PageSize } from '@crm/shared'
import { ChevronLeft, ChevronRight, ChevronsLeft } from 'lucide-react'
import { Button, IconButton } from '../../../components/ui/Button'
import { formatCount } from '../../../lib/format'

type PaginationFooterProps = {
  page: number
  pageSize: PageSize
  rowsOnPage: number
  total: number | undefined
  hasPrevious: boolean
  hasNext: boolean
  onFirst: () => void
  onPrevious: () => void
  onNext: () => void
  /** The pointer is on (or focus moved to) "Next": a good moment to prefetch. */
  onNextIntent: () => void
  onPageSizeChange: (size: PageSize) => void
}

export function PaginationFooter({
  page,
  pageSize,
  rowsOnPage,
  total,
  hasPrevious,
  hasNext,
  onFirst,
  onPrevious,
  onNext,
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
      <p>
        {rowsOnPage > 0 && (
          <span className="hidden sm:inline">
            {formatCount(firstRow)}–{formatCount(lastRow)}
            {total !== undefined && ` of ${formatCount(total)}`}
            <span className="mx-2 text-gray-300">·</span>
          </span>
        )}
        Page {formatCount(page)}
        {pageCount !== undefined && ` of ${formatCount(pageCount)}`}
      </p>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">
          <span className="hidden text-gray-500 sm:inline">Rows</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value) as PageSize)}
            aria-label="Rows per page"
            className="h-8 rounded-md border-0 bg-white pr-7 pl-2 text-sm ring-1 ring-gray-300 ring-inset focus:ring-2 focus:ring-primary-600"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
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
      </div>
    </nav>
  )
}
