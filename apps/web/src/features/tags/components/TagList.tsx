import type { Tag } from '@crm/shared'
import { Tooltip } from '../../../components/ui/Tooltip'
import { t } from '../../../i18n'
import { cn } from '../../../lib/cn'
import { TagChip } from './TagChip'

type TagListProps = {
  tags: Tag[]
  /** Chips shown before collapsing the rest into "+n", as in a dense table cell. */
  max?: number
  /** Table rows keep chips on one line so every row has the same height. */
  wrap?: boolean
}

export function TagList({ tags, max = 2, wrap = false }: TagListProps) {
  if (tags.length === 0) {
    return <span className="text-gray-400">—</span>
  }
  const visible = tags.slice(0, max)
  const hidden = tags.slice(max)

  return (
    <span className={cn('flex items-center gap-1', wrap ? 'flex-wrap' : 'flex-nowrap')}>
      {visible.map((tag) => (
        <TagChip key={tag.id} tag={tag} />
      ))}
      {hidden.length > 0 && (
        <Tooltip content={hidden.map((tag) => tag.name).join(', ')}>
          <button
            type="button"
            className="inline-flex h-6 shrink-0 items-center rounded-md bg-gray-100 px-1.5 text-xs font-medium text-gray-600"
          >
            +{hidden.length}
            <span className="sr-only">{t.tags.more(hidden.map((tag) => tag.name).join(', '))}</span>
          </button>
        </Tooltip>
      )}
    </span>
  )
}
