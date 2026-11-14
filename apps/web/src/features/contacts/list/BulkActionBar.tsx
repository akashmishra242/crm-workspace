import { BULK_TAG_LIMIT, type BulkTagAction, type BulkTagResult, type Tag } from '@crm/shared'
import { Tag as TagIcon, TagsIcon, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { notify } from '../../../components/ui/Toast'
import { t } from '../../../i18n'
import { pluralize } from '../../../lib/format'
import { useBulkTagMutation } from '../../tags/api/useTagMutations'
import { TagPicker } from '../../tags/components/TagPicker'
import type { ContactSelection } from './useContactSelection'

const contacts = (count: number) => pluralize(count, t.common.contact.one, t.common.contact.other)

/** Toast title and details for a finished bulk action. */
function describeResult(
  action: BulkTagAction,
  tag: Tag,
  result: BulkTagResult,
): [string, string | undefined] {
  const updated = contacts(result.updatedCount)
  const title =
    action === 'add'
      ? t.toasts.bulkTagged(updated, tag.name)
      : t.toasts.bulkUntagged(tag.name, updated)
  const details: string[] = []
  if (result.unchangedCount > 0) {
    const unchanged = contacts(result.unchangedCount)
    details.push(
      action === 'add'
        ? t.contacts.bulk.alreadyHadIt(unchanged)
        : t.contacts.bulk.didNotHaveIt(unchanged),
    )
  }
  if (result.notFoundIds.length > 0) {
    details.push(t.contacts.bulk.notFound(contacts(result.notFoundIds.length)))
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
  /** Removing asks first; adding doesn't, since nothing is lost. */
  const [pendingRemoval, setPendingRemoval] = useState<Tag | null>(null)

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
        onError: (error) => notify.error(t.toasts.bulkFailed, error.message),
      },
    )
  }

  return (
    <div
      role="region"
      aria-label={t.contacts.bulk.label}
      className="flex flex-wrap items-center gap-2 rounded-lg bg-primary-50 px-3 py-2 ring-1 ring-primary-100"
    >
      <span role="status" className="mr-2 text-sm font-medium text-primary-700">
        {t.contacts.bulk.selected(contacts(selection.count))}
      </span>
      <span className="hidden text-xs text-primary-700/80 xl:inline">{t.contacts.bulk.hint}</span>
      {overLimit && (
        <span role="status" className="text-sm text-amber-700">
          {t.contacts.bulk.overLimit(BULK_TAG_LIMIT)}
        </span>
      )}
      <TagPicker label={t.contacts.bulk.addTagLabel} onSelect={(tag) => apply('add', tag)}>
        <Button
          size="sm"
          disabled={unavailable}
          loading={bulkTag.isPending && bulkTag.variables.action === 'add'}
        >
          <TagIcon className="size-3.5" aria-hidden />
          {t.tags.addTag}
        </Button>
      </TagPicker>
      <TagPicker
        label={t.contacts.bulk.removeTagLabel}
        allowCreate={false}
        onSelect={setPendingRemoval}
      >
        <Button
          size="sm"
          disabled={unavailable}
          loading={bulkTag.isPending && bulkTag.variables.action === 'remove'}
        >
          <TagsIcon className="size-3.5" aria-hidden />
          {t.tags.removeTag}
        </Button>
      </TagPicker>
      <Button size="sm" variant="ghost" className="ml-auto" onClick={selection.clear}>
        <X className="size-3.5" aria-hidden />
        {t.contacts.bulk.clearSelection}
      </Button>
      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title={t.tags.removeTitle(pendingRemoval?.name ?? '')}
        description={t.contacts.bulk.removeDescription(
          pluralize(
            selection.count,
            t.contacts.bulk.selectedContact.one,
            t.contacts.bulk.selectedContact.other,
          ),
        )}
        confirmLabel={t.tags.removeTag}
        destructive
        onConfirm={() => pendingRemoval && apply('remove', pendingRemoval)}
      />
    </div>
  )
}
