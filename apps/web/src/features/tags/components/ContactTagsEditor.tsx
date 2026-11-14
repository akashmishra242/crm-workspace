import type { Tag } from '@crm/shared'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
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
      {tags.length === 0 && <span className="text-gray-500">No tags yet.</span>}
      {tags.map((tag) => (
        <TagChip key={tag.id} tag={tag} onRemove={() => setPendingRemoval(tag)} />
      ))}
      <TagPicker
        label="Add a tag to this contact"
        excludeIds={tags.map((tag) => tag.id)}
        onSelect={(tag) => addTag.mutate(tag)}
      >
        <Button size="sm" variant="ghost" className="text-primary-700">
          <Plus className="size-3.5" aria-hidden />
          Add tag
        </Button>
      </TagPicker>
      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title={`Remove “${pendingRemoval?.name ?? ''}”?`}
        description={`${contactName} will no longer have this tag. You can add it back at any time.`}
        confirmLabel="Remove tag"
        destructive
        onConfirm={() => pendingRemoval && removeTag.mutate(pendingRemoval)}
      />
    </div>
  )
}
