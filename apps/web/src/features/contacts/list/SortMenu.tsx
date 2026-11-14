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
import { t } from '../../../i18n'

const SORT_OPTIONS: ReadonlyArray<{ sort: ContactSortField; order: SortOrder; label: string }> = [
  { sort: 'createdAt', order: 'desc', label: t.contacts.sort.newestFirst },
  { sort: 'createdAt', order: 'asc', label: t.contacts.sort.oldestFirst },
  { sort: 'name', order: 'asc', label: t.contacts.sort.nameAsc },
  { sort: 'name', order: 'desc', label: t.contacts.sort.nameDesc },
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
        <Button aria-label={t.contacts.sort.label(current?.label ?? t.contacts.sort.custom)}>
          <ArrowUpDown className="size-4 text-gray-500" aria-hidden />
          <span className="hidden sm:inline">{current?.label ?? t.contacts.sort.button}</span>
        </Button>
      </MenuTrigger>
      <MenuContent>
        <MenuLabel>{t.contacts.sort.menuLabel}</MenuLabel>
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
