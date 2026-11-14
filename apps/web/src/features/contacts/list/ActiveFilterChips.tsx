import { CONDITION_FIELDS } from '@crm/shared'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { tagListQuery } from '../../tags/api/tagQueries'
import type { ContactFilterValues } from '../api/contactsApi'
import { describeCondition } from './conditionLabels'
import { describeDateRange } from './createdDateRange'

type ActiveFilterChipsProps = {
  filters: ContactFilterValues
  onChange: (patch: Partial<ContactFilterValues>) => void
  onClearAll: () => void
}

export function ActiveFilterChips({ filters, onChange, onClearAll }: ActiveFilterChipsProps) {
  const tags = useQuery(tagListQuery())
  const tagNames = filters.tagIds.map(
    (id) => tags.data?.find((tag) => tag.id === id)?.name ?? 'Unknown tag',
  )
  const tagJoiner = filters.tagMatch === 'all' ? ' and ' : ' or '

  const chips: Array<{ key: string; label: string; clear: () => void }> = []
  if (filters.tagIds.length > 0) {
    chips.push({
      key: 'tags',
      label: `Tag: ${tagNames.join(tagJoiner)}`,
      clear: () => onChange({ tagIds: [], tagMatch: 'any' }),
    })
  }
  if (filters.createdFrom || filters.createdTo) {
    chips.push({
      key: 'created',
      label: `Created: ${describeDateRange(filters)}`,
      clear: () => onChange({ createdFrom: null, createdTo: null }),
    })
  }
  for (const field of CONDITION_FIELDS) {
    const condition = filters[field]
    if (condition) {
      chips.push({
        key: field,
        label: describeCondition(field, condition),
        clear: () => onChange({ [field]: null }),
      })
    }
  }

  if (chips.length === 0) return null

  return (
    <ul aria-label="Active filters" className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li
          key={chip.key}
          className="inline-flex h-7 items-center gap-1 rounded-full bg-primary-50 pr-1 pl-3 text-xs font-medium text-primary-700 ring-1 ring-primary-100"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.clear}
            aria-label={`Remove filter: ${chip.label}`}
            className="grid size-5 place-items-center rounded-full hover:bg-primary-100"
          >
            <X className="size-3" aria-hidden />
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={onClearAll}
          className="h-7 rounded px-2 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          Clear all
        </button>
      </li>
    </ul>
  )
}
