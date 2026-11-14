import { Columns3 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/Popover'
import { SortableList } from '../../../components/ui/SortableList'
import { t } from '../../../i18n'
import type { useListColumns } from './useListColumns'

type ManageFieldsPopoverProps = {
  columns: ReturnType<typeof useListColumns>
}

export function ManageFieldsPopover({ columns }: ManageFieldsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button aria-label={t.contacts.table.manageFields}>
          <Columns3 className="size-4 text-gray-500" aria-hidden />
          <span className="hidden lg:inline">{t.contacts.table.manageFields}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">{t.contacts.table.tableColumns}</p>
          {columns.isCustomized && (
            <button
              type="button"
              onClick={columns.reset}
              className="text-xs font-medium text-primary-700 hover:underline"
            >
              {t.common.reset}
            </button>
          )}
        </div>
        <p className="mb-3 text-xs text-gray-500">{t.contacts.table.columnsHint}</p>
        <SortableList
          label={t.contacts.table.tableColumns}
          items={columns.items}
          onReorder={columns.reorder}
          onVisibilityChange={columns.setVisible}
        />
      </PopoverContent>
    </Popover>
  )
}
