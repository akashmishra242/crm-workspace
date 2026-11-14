import { BULK_TAG_LIMIT, type BulkTagAction, type BulkTagResult, type Tag } from '@crm/shared'
import { Tag as TagIcon, TagsIcon, X } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { notify } from '../../../components/ui/Toast'
import { pluralize } from '../../../lib/format'
import { useBulkTagMutation } from '../../tags/api/useTagMutations'
import { TagPicker } from '../../tags/components/TagPicker'
import type { ContactSelection } from './useContactSelection'

/** Toast title and details for a finished bulk action. */
function describeResult(
  action: BulkTagAction,
  tag: Tag,
  result: BulkTagResult,
): [string, string | undefined] {
  const updated = pluralize(result.updatedCount, 'contact')
  const title =
    action === 'add'
      ? `Tagged ${updated} with “${tag.name}”`
      : `Removed “${tag.name}” from ${updated}`
  const details: string[] = []
  if (result.unchangedCount > 0) {
    const reason = action === 'add' ? 'already had it' : 'didn’t have it'
    details.push(`${pluralize(result.unchangedCount, 'contact')} ${reason}`)
  }
  if (result.notFoundIds.length > 0) {
    details.push(`${pluralize(result.notFoundIds.length, 'contact')} not found`)
  }
  return [title, details.length > 0 ? details.join(' · ') : undefined]
}

type BulkActionBarProps = {
  selection: ContactSelection
}

export function BulkActionBar({ selection }: BulkActionBarProps) {
  const bulkTag = useBulkTagMutation()
  const overLimit = selection.count > BULK_TAG_LIMIT
  // One bulk request at a time: both pickers wait for the running one.
  const unavailable = overLimit || bulkTag.isPending

  function apply(action: BulkTagAction, tag: Tag) {
    if (bulkTag.isPending) return
    const contactIds = [...selection.ids]
    bulkTag.mutate(
      { contactIds, tagId: tag.id, action },
      {
        onSuccess: (result) => {
          notify.success(...describeResult(action, tag, result))
          // Only the contacts that were sent; rows picked meanwhile stay selected.
          selection.setMany(contactIds, false)
        },
        onError: (error) => notify.error('Bulk update failed', error.message),
      },
    )
  }

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="flex flex-wrap items-center gap-2 rounded-lg bg-primary-50 px-3 py-2 ring-1 ring-primary-100"
    >
      <span role="status" className="mr-2 text-sm font-medium text-primary-700">
        {pluralize(selection.count, 'contact')} selected
      </span>
      <span className="hidden text-xs text-primary-700/80 xl:inline">
        Click rows to add or remove · Esc to clear
      </span>
      {overLimit && (
        <span role="status" className="text-sm text-amber-700">
          Bulk actions work on up to {BULK_TAG_LIMIT} contacts at a time.
        </span>
      )}
      <TagPicker label="Add tag to selected contacts" onSelect={(tag) => apply('add', tag)}>
        <Button
          size="sm"
          disabled={unavailable}
          loading={bulkTag.isPending && bulkTag.variables.action === 'add'}
        >
          <TagIcon className="size-3.5" aria-hidden />
          Add tag
        </Button>
      </TagPicker>
      <TagPicker
        label="Remove tag from selected contacts"
        allowCreate={false}
        onSelect={(tag) => apply('remove', tag)}
      >
        <Button
          size="sm"
          disabled={unavailable}
          loading={bulkTag.isPending && bulkTag.variables.action === 'remove'}
        >
          <TagsIcon className="size-3.5" aria-hidden />
          Remove tag
        </Button>
      </TagPicker>
      <Button size="sm" variant="ghost" className="ml-auto" onClick={selection.clear}>
        <X className="size-3.5" aria-hidden />
        Clear selection
      </Button>
    </div>
  )
}
