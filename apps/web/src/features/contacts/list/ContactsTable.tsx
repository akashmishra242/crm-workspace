import type { Contact, ContactSortField, SortOrder } from '@crm/shared'
import { ArrowDown, ArrowUp, ChevronsUpDown, Mail, Phone } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
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
  onRowIntent: (id: string) => void
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
}: ContactsTableProps) {
  const navigate = useNavigate()
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

  /**
   * Clicking a row opens the contact. Once anything is selected the table is in selection
   * mode, and a row click adds or removes that row instead; the name link still opens it.
   * Ctrl/Cmd-click, middle-click and selecting text are left to the browser.
   */
  function onRowClick(event: MouseEvent<HTMLTableRowElement>, id: string) {
    const target = event.target as HTMLElement
    if (target.closest('a, button, [role="checkbox"], label')) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    if (window.getSelection()?.toString()) return
    if (selection.count > 0) selection.toggle(id, !selection.isSelected(id))
    else void navigate(contactHref(id))
  }

  /** ↑/↓ move between rows, Space selects or deselects; Enter is the link's own behaviour. */
  function onLinkKeyDown(event: KeyboardEvent<HTMLAnchorElement>, id: string) {
    if (event.key === ' ') {
      event.preventDefault()
      if (!event.repeat) selection.toggle(id, !selection.isSelected(id))
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
    <table ref={tableRef} className="w-full min-w-[960px] table-fixed text-left text-sm">
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
              onCheckedChange={(checked) => selection.setMany(pageIds, checked === true)}
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
        {contacts.map((contact) => {
          const selected = selection.isSelected(contact.id)
          const row: RowContext = {
            href: contactHref(contact.id),
            onLinkKeyDown: (event) => onLinkKeyDown(event, contact.id),
          }
          return (
            <tr
              key={contact.id}
              onClick={(event) => onRowClick(event, contact.id)}
              onPointerEnter={() => {
                clearTimeout(intentTimer.current)
                intentTimer.current = setTimeout(() => onRowIntent(contact.id), ROW_INTENT_DELAY_MS)
              }}
              onPointerLeave={() => clearTimeout(intentTimer.current)}
              onFocus={() => onRowIntent(contact.id)}
              className={cn(
                'h-12 cursor-pointer text-gray-700 transition-colors',
                selected ? 'bg-primary-50/60' : 'hover:bg-gray-50 focus-within:bg-gray-50',
              )}
            >
              <td className="px-4">
                <Checkbox
                  aria-label={`Select ${contactDisplayName(contact)}`}
                  checked={selected}
                  onCheckedChange={(checked) => selection.toggle(contact.id, checked === true)}
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
