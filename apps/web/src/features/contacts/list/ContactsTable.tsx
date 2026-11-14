import type { Contact, ContactSortField, SortOrder } from '@crm/shared'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ChevronsUpDown, Mail, Phone } from 'lucide-react'
import {
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { Link, useNavigate } from 'react-router'
import { Avatar } from '../../../components/ui/Avatar'
import { Checkbox } from '../../../components/ui/Checkbox'
import { cn } from '../../../lib/cn'
import { formatDateTime, formatPhone, formatRelative } from '../../../lib/format'
import { TagList } from '../../tags/components/TagList'
import { contactDisplayName } from '../utils/contactDisplayName'
import type { ContactSelection } from './useContactSelection'
import { ColumnResizeHandle } from './ColumnResizeHandle'
import { COLUMN_LABELS, type ColumnWidths, type ListColumnId } from './useListColumns'

const EMPTY = <span className="text-gray-400">—</span>

type RowContext = {
  href: string
  onLinkKeyDown: (event: KeyboardEvent<HTMLAnchorElement>) => void
  onLinkClick: (event: MouseEvent<HTMLAnchorElement>) => void
}

type ColumnDefinition = {
  sortField?: ContactSortField
  className?: string
  cell: (contact: Contact, row: RowContext) => ReactNode
}

const COLUMNS: Record<ListColumnId, ColumnDefinition> = {
  name: {
    sortField: 'name',
    cell: (contact, row) => (
      <Link
        to={row.href}
        data-row-link
        onKeyDown={row.onLinkKeyDown}
        onClick={row.onLinkClick}
        title={contactDisplayName(contact)}
        className="flex items-center gap-2.5 rounded font-medium text-gray-900 hover:text-primary-700"
      >
        <Avatar id={contact.id} firstName={contact.firstName} lastName={contact.lastName} />
        <span className="truncate">{contactDisplayName(contact)}</span>
      </Link>
    ),
  },
  phone: {
    cell: (contact) =>
      contact.phone ? (
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <Phone className="size-3.5 text-gray-400" aria-hidden />
          {formatPhone(contact.phone)}
        </span>
      ) : (
        EMPTY
      ),
  },
  email: {
    cell: (contact) =>
      contact.email ? (
        <span className="flex items-center gap-1.5">
          <Mail className="size-3.5 shrink-0 text-gray-400" aria-hidden />
          <span className="truncate" title={contact.email}>
            {contact.email}
          </span>
        </span>
      ) : (
        EMPTY
      ),
  },
  company: {
    cell: (contact) =>
      contact.company ? (
        <span className="block truncate" title={contact.company}>
          {contact.company}
        </span>
      ) : (
        EMPTY
      ),
  },
  createdAt: {
    sortField: 'createdAt',
    className: 'truncate',
    cell: (contact) => formatDateTime(contact.createdAt),
  },
  lastActivityAt: {
    className: 'truncate',
    cell: (contact) =>
      contact.lastActivityAt ? (
        <time dateTime={contact.lastActivityAt} title={formatDateTime(contact.lastActivityAt)}>
          {formatRelative(contact.lastActivityAt)}
        </time>
      ) : (
        EMPTY
      ),
  },
  tags: {
    cell: (contact) => <TagList tags={contact.tags} />,
  },
}

const CHECKBOX_COLUMN_PX = 44
/** Hovering this long counts as intent to open the row; a quick sweep across rows doesn't. */
const ROW_INTENT_DELAY_MS = 150
const ROW_HEIGHT_PX = 48
/**
 * Up to 100 rows render as a plain table, so the browser's own find (Ctrl+F) still works.
 * Bigger pages (200 to 1,000 rows) render only the rows in view plus a margin.
 */
const VIRTUALIZE_ABOVE = 100
const OVERSCAN_ROWS = 12

const DEFAULT_ORDER: Record<ContactSortField, SortOrder> = { name: 'asc', createdAt: 'desc' }

type ContactsTableProps = {
  contacts: Contact[]
  columns: ListColumnId[]
  /** Percentage of the table width per column. */
  widths: ColumnWidths
  onResize: (widths: ColumnWidths) => void
  sort: ContactSortField
  order: SortOrder
  onSortChange: (sort: ContactSortField, order: SortOrder) => void
  selection: ContactSelection
  contactHref: (id: string) => string
  /** Set only when preloading on hover is turned on. */
  onRowIntent?: (id: string) => void
  /** The scrolling element around the table; virtualization measures it. */
  scrollRef: RefObject<HTMLDivElement | null>
}

export function ContactsTable({
  contacts,
  columns,
  widths,
  onResize,
  sort,
  order,
  onSortChange,
  selection,
  contactHref,
  onRowIntent,
  scrollRef,
}: ContactsTableProps) {
  const navigate = useNavigate()
  const virtualize = contacts.length > VIRTUALIZE_ABOVE
  // The React Compiler isn't used here; the virtualizer re-renders through its own state.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: contacts.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
    overscan: OVERSCAN_ROWS,
    enabled: virtualize,
  })
  const virtualRows = virtualize ? virtualizer.getVirtualItems() : null
  const rowIndexes = virtualRows
    ? virtualRows.map((item) => item.index)
    : contacts.map((_, index) => index)
  const paddingTop = virtualRows?.[0]?.start ?? 0
  const paddingBottom = virtualRows
    ? virtualizer.getTotalSize() - (virtualRows.at(-1)?.end ?? 0)
    : 0
  /** Where a Shift+click range starts: the last row toggled by hand. */
  const rangeAnchor = useRef<number | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  /** Widths while a column edge is being dragged; saved only when the drag ends. */
  const [dragWidths, setDragWidths] = useState<ColumnWidths | null>(null)
  const shownWidths = { ...widths, ...dragWidths }
  const intentTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pageIds = contacts.map((contact) => contact.id)
  const selectedOnPage = pageIds.filter(selection.isSelected).length
  const headerChecked =
    selectedOnPage === 0 ? false : selectedOnPage === pageIds.length ? true : 'indeterminate'

  function toggleSort(field: ContactSortField) {
    const nextOrder = field === sort ? (order === 'asc' ? 'desc' : 'asc') : DEFAULT_ORDER[field]
    onSortChange(field, nextOrder)
  }

  /** Toggles one row, or with Shift every row from the last toggled one to this one. */
  function toggleRow(index: number, withShift: boolean) {
    const contact = contacts[index]
    if (!contact) return
    const select = !selection.isSelected(contact.id)
    const anchor = rangeAnchor.current
    if (withShift && anchor !== null && anchor !== index) {
      const [from, to] = anchor < index ? [anchor, index] : [index, anchor]
      selection.setMany(
        contacts.slice(from, to + 1).map((item) => item.id),
        select,
      )
    } else {
      selection.toggle(contact.id, select)
    }
    rangeAnchor.current = index
  }

  /**
   * Clicking a row opens the contact. Once anything is selected the table is in selection
   * mode: a click anywhere on the row, the name included, adds or removes it, and Shift+click
   * selects a range. Ctrl/Cmd-click, middle-click and selecting text are left to the browser.
   */
  function onRowClick(event: MouseEvent<HTMLTableRowElement>, index: number) {
    const target = event.target as HTMLElement
    if (target.closest('a, button, [role="checkbox"], label')) return
    if (event.metaKey || event.ctrlKey || event.button !== 0) return
    if (selection.count > 0) {
      toggleRow(index, event.shiftKey)
      return
    }
    if (event.shiftKey || window.getSelection()?.toString()) return
    const contact = contacts[index]
    if (contact) void navigate(contactHref(contact.id))
  }

  /** The name link opens the contact, except in selection mode, where a click toggles. */
  function onLinkClick(event: MouseEvent<HTMLAnchorElement>, index: number) {
    // detail is 0 when Enter activates the focused link: Enter always opens the contact.
    if (selection.count === 0 || event.detail === 0) return
    if (event.metaKey || event.ctrlKey || event.button !== 0) return
    event.preventDefault()
    toggleRow(index, event.shiftKey)
  }

  /** ↑/↓ move between rows, Space selects or deselects; Enter is the link's own behaviour. */
  function onLinkKeyDown(event: KeyboardEvent<HTMLAnchorElement>, index: number) {
    if (event.key === ' ') {
      event.preventDefault()
      if (!event.repeat) toggleRow(index, event.shiftKey)
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const rows = event.currentTarget.closest('tbody')
    const links = [...(rows?.querySelectorAll<HTMLElement>('[data-row-link]') ?? [])]
    const next = links.indexOf(event.currentTarget) + (event.key === 'ArrowDown' ? 1 : -1)
    // ↑ from the first row goes back to the search box.
    const target =
      next < 0 ? document.querySelector<HTMLElement>('[role="search"] input') : links[next]
    target?.focus()
  }

  return (
    <table
      ref={tableRef}
      aria-rowcount={virtualize ? contacts.length + 1 : undefined}
      className="w-full min-w-[960px] table-fixed text-left text-sm"
    >
      <colgroup>
        <col style={{ width: CHECKBOX_COLUMN_PX }} />
        {columns.map((columnId, index) => (
          // The last column takes whatever is left after the fixed checkbox column.
          <col
            key={columnId}
            style={{
              width: index === columns.length - 1 ? undefined : `${shownWidths[columnId] ?? 0}%`,
            }}
          />
        ))}
      </colgroup>
      <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-medium text-gray-500">
        <tr className="border-b border-gray-200">
          <th scope="col" className="px-4 py-2.5">
            <Checkbox
              aria-label="Select all contacts on this page"
              checked={headerChecked}
              onCheckedChange={(checked) => {
                selection.setMany(pageIds, checked === true)
                rangeAnchor.current = null
              }}
            />
          </th>
          {columns.map((columnId, index) => {
            const { sortField } = COLUMNS[columnId]
            const label = COLUMN_LABELS[columnId]
            const isSorted = sortField === sort
            const nextColumn = columns[index + 1]
            return (
              <th
                key={columnId}
                scope="col"
                className="relative px-3 py-2.5 font-medium"
                aria-sort={isSorted ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                <div className="truncate">
                  {sortField ? (
                    <SortableHeader
                      label={label}
                      direction={isSorted ? order : null}
                      onClick={() => toggleSort(sortField)}
                    />
                  ) : (
                    label
                  )}
                </div>
                {nextColumn && (
                  <ColumnResizeHandle
                    columnLabel={label}
                    pair={{
                      left: shownWidths[columnId] ?? 0,
                      right: shownWidths[nextColumn] ?? 0,
                    }}
                    getTableWidth={() =>
                      (tableRef.current?.offsetWidth ?? CHECKBOX_COLUMN_PX + 1) - CHECKBOX_COLUMN_PX
                    }
                    onPreview={({ left, right }) =>
                      setDragWidths({ [columnId]: left, [nextColumn]: right })
                    }
                    onCommit={({ left, right }) => {
                      setDragWidths(null)
                      onResize({ [columnId]: left, [nextColumn]: right })
                    }}
                  />
                )}
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {paddingTop > 0 && <tr aria-hidden style={{ height: paddingTop }} />}
        {rowIndexes.map((index) => {
          const contact = contacts[index]
          if (!contact) return null
          const selected = selection.isSelected(contact.id)
          const row: RowContext = {
            href: contactHref(contact.id),
            onLinkKeyDown: (event) => onLinkKeyDown(event, index),
            onLinkClick: (event) => onLinkClick(event, index),
          }
          const preload = onRowIntent
          return (
            <tr
              key={contact.id}
              aria-rowindex={virtualize ? index + 2 : undefined}
              onClick={(event) => onRowClick(event, index)}
              onPointerEnter={
                preload &&
                (() => {
                  clearTimeout(intentTimer.current)
                  intentTimer.current = setTimeout(() => preload(contact.id), ROW_INTENT_DELAY_MS)
                })
              }
              onPointerLeave={() => clearTimeout(intentTimer.current)}
              onFocus={preload && (() => preload(contact.id))}
              className={cn(
                'h-12 cursor-pointer text-gray-700 transition-colors',
                selected ? 'bg-primary-50/60' : 'hover:bg-gray-50 focus-within:bg-gray-50',
              )}
            >
              <td className="px-4">
                <Checkbox
                  aria-label={`Select ${contactDisplayName(contact)}`}
                  checked={selected}
                  onClick={(event) => {
                    event.preventDefault()
                    toggleRow(index, event.shiftKey)
                  }}
                />
              </td>
              {columns.map((columnId) => (
                <td
                  key={columnId}
                  className={cn('overflow-hidden px-3', COLUMNS[columnId].className)}
                >
                  {COLUMNS[columnId].cell(contact, row)}
                </td>
              ))}
            </tr>
          )
        })}
        {paddingBottom > 0 && <tr aria-hidden style={{ height: paddingBottom }} />}
      </tbody>
    </table>
  )
}

type SortableHeaderProps = {
  label: string
  direction: SortOrder | null
  onClick: () => void
}

function SortableHeader({ label, direction, onClick }: SortableHeaderProps) {
  const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ChevronsUpDown
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-gray-200/60 hover:text-gray-900',
        direction && 'text-gray-900',
      )}
    >
      {label}
      <Icon className="size-3.5" aria-hidden />
    </button>
  )
}
