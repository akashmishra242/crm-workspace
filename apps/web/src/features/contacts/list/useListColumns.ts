import { z } from 'zod'
import type { SortableListItem } from '../../../components/ui/SortableList'
import { usePreference } from '../../preferences/usePreference'

const LIST_COLUMNS = [
  'name',
  'phone',
  'email',
  'company',
  'createdAt',
  'lastActivityAt',
  'tags',
] as const
export type ListColumnId = (typeof LIST_COLUMNS)[number]

export const COLUMN_LABELS: Record<ListColumnId, string> = {
  name: 'Contact name',
  phone: 'Phone',
  email: 'Email',
  company: 'Company',
  createdAt: 'Created',
  lastActivityAt: 'Last activity',
  tags: 'Tags',
}

const LOCKED_COLUMN: ListColumnId = 'name'

/**
 * Widths are relative shares, not pixels: each visible column gets its share of whatever
 * width the table has, so a layout saved on a laptop still fits a wide monitor or a tablet.
 */
const DEFAULT_WIDTHS: Record<ListColumnId, number> = {
  name: 22,
  phone: 14,
  email: 22,
  company: 15,
  createdAt: 15,
  lastActivityAt: 12,
  tags: 20,
}

const columnPreferencesSchema = z.object({
  order: z.array(z.enum(LIST_COLUMNS)),
  hidden: z.array(z.enum(LIST_COLUMNS)),
  widths: z.partialRecord(z.enum(LIST_COLUMNS), z.number().positive()),
})
type ColumnPreferences = z.infer<typeof columnPreferencesSchema>

/** Company is hidden by default to keep the table readable on a laptop screen. */
const DEFAULT_PREFERENCES: ColumnPreferences = {
  order: [...LIST_COLUMNS],
  hidden: ['company'],
  widths: {},
}

/**
 * The locked column always comes first. Columns added in later versions are appended, so
 * saved preferences never hide them.
 */
function completeOrder(order: ListColumnId[]): ListColumnId[] {
  const rest = [...order, ...LIST_COLUMNS.filter((column) => !order.includes(column))]
  return [LOCKED_COLUMN, ...rest.filter((column) => column !== LOCKED_COLUMN)]
}

export type ColumnWidths = Partial<Record<ListColumnId, number>>

export function useListColumns() {
  const [preferences, setPreferences] = usePreference(
    'contacts.columns',
    columnPreferencesSchema,
    DEFAULT_PREFERENCES,
  )
  const order = completeOrder(preferences.order)
  const visibleColumns = order.filter(
    (id) => id === LOCKED_COLUMN || !preferences.hidden.includes(id),
  )

  const shares = visibleColumns.map((id) => preferences.widths[id] ?? DEFAULT_WIDTHS[id])
  const total = shares.reduce((sum, share) => sum + share, 0)
  const widths: ColumnWidths = Object.fromEntries(
    visibleColumns.map((id, index) => [id, ((shares[index] ?? 0) / total) * 100]),
  )

  const items: SortableListItem<ListColumnId>[] = order.map((id) => ({
    id,
    label: COLUMN_LABELS[id],
    visible: visibleColumns.includes(id),
    locked: id === LOCKED_COLUMN,
  }))

  return {
    visibleColumns,
    /** Percentage of the table width for each visible column; together they make 100. */
    widths,
    items,
    reorder: (nextOrder: ListColumnId[]) =>
      setPreferences((current) => ({ ...current, order: nextOrder })),
    setVisible: (id: ListColumnId, visible: boolean) =>
      setPreferences((current) => ({
        ...current,
        hidden: visible
          ? current.hidden.filter((column) => column !== id)
          : [...current.hidden, id],
      })),
    resize: (next: ColumnWidths) =>
      // Keeps the saved shares of hidden columns, so they come back at their old width.
      setPreferences((current) => ({
        ...current,
        widths: { ...current.widths, ...widths, ...next },
      })),
    reset: () => setPreferences(DEFAULT_PREFERENCES),
    isCustomized:
      preferences.hidden.join() !== DEFAULT_PREFERENCES.hidden.join() ||
      Object.keys(preferences.widths).length > 0 ||
      order.some((id, index) => id !== LIST_COLUMNS[index]),
  }
}
