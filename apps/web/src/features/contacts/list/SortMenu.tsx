import type { ContactSortField, SortOrder } from '@crm/shared'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import {
  Menu,
  MenuContent,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from '../../../components/ui/Menu'

const SORT_OPTIONS: ReadonlyArray<{ sort: ContactSortField; order: SortOrder; label: string }> = [
  { sort: 'createdAt', order: 'desc', label: 'Newest first' },
  { sort: 'createdAt', order: 'asc', label: 'Oldest first' },
  { sort: 'name', order: 'asc', label: 'Name A → Z' },
  { sort: 'name', order: 'desc', label: 'Name Z → A' },
]

type SortMenuProps = {
  sort: ContactSortField
  order: SortOrder
  onChange: (sort: ContactSortField, order: SortOrder) => void
}

export function SortMenu({ sort, order, onChange }: SortMenuProps) {
  const current = SORT_OPTIONS.find((option) => option.sort === sort && option.order === order)

  return (
    <Menu>
      <MenuTrigger asChild>
        <Button aria-label={`Sort: ${current?.label ?? 'custom'}`}>
          <ArrowUpDown className="size-4 text-gray-500" aria-hidden />
          <span className="hidden sm:inline">{current?.label ?? 'Sort'}</span>
        </Button>
      </MenuTrigger>
      <MenuContent>
        <MenuLabel>Sort contacts by</MenuLabel>
        <MenuRadioGroup
          value={`${sort}:${order}`}
          onValueChange={(value) => {
            const option = SORT_OPTIONS.find((item) => `${item.sort}:${item.order}` === value)
            if (option) onChange(option.sort, option.order)
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <MenuRadioItem key={option.label} value={`${option.sort}:${option.order}`}>
              {option.label}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  )
}
