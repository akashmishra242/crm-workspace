import type { Tag, TagColor } from '@crm/shared'
import { X } from 'lucide-react'
import { cn } from '../../../lib/cn'

export const TAG_DOT_CLASSES: Record<TagColor, string> = {
  gray: 'bg-gray-400',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  purple: 'bg-violet-500',
  pink: 'bg-pink-500',
  teal: 'bg-teal-500',
}

type TagChipProps = {
  tag: Tag
  onRemove?: () => void
}

export function TagChip({ tag, onRemove }: TagChipProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 max-w-32 min-w-0 items-center gap-1.5 rounded-md bg-gray-100 pl-2 text-xs font-medium text-gray-700',
        onRemove ? 'pr-0.5' : 'pr-2',
      )}
    >
      <span
        aria-hidden
        className={cn('size-1.5 shrink-0 rounded-full', TAG_DOT_CLASSES[tag.color])}
      />
      <span className="truncate">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove tag ${tag.name}`}
          className="grid size-5 place-items-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-800"
        >
          <X className="size-3" aria-hidden />
        </button>
      )}
    </span>
  )
}
