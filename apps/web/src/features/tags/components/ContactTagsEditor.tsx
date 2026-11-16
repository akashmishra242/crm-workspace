import type { Tag } from '@crm/shared'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { t } from '../../../i18n'
import { useContactTagMutations } from '../api/useContactTagMutations'
import { TagChip } from './TagChip'
import { TagPicker } from './TagPicker'

type ContactTagsEditorProps = {
  contactId: string
  contactName: string
  tags: Tag[]
}

export function ContactTagsEditor({ contactId, contactName, tags }: ContactTagsEditorProps) {
  const { addTag, removeTag } = useContactTagMutations(contactId)
  const [pendingRemoval, setPendingRemoval] = useState<Tag | null>(null)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.length === 0 && <span className="text-gray-500">{t.tags.none}</span>}
      {tags.map((tag) => (
        <TagChip key={tag.id} tag={tag} onRemove={() => setPendingRemoval(tag)} />
      ))}
      <TagPicker
        label={t.tags.addToContact}
        excludeIds={tags.map((tag) => tag.id)}
        onSelect={(tag) => addTag.mutate(tag)}
      >
        <Button size="sm" variant="ghostPrimary">
          <Plus className="size-3.5" aria-hidden />
          {t.tags.addTag}
        </Button>
      </TagPicker>
      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title={t.tags.removeTitle(pendingRemoval?.name ?? '')}
        description={t.tags.removeDescription(contactName)}
        confirmLabel={t.tags.removeTag}
        destructive
        onConfirm={() => pendingRemoval && removeTag.mutate(pendingRemoval)}
      />
    </div>
  )
}
