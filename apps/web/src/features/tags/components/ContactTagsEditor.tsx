import type { Tag } from '@crm/shared'
import { Plus } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { useContactTagMutations } from '../api/useContactTagMutations'
import { TagChip } from './TagChip'
import { TagPicker } from './TagPicker'

type ContactTagsEditorProps = {
  contactId: string
  tags: Tag[]
}

export function ContactTagsEditor({ contactId, tags }: ContactTagsEditorProps) {
  const { addTag, removeTag } = useContactTagMutations(contactId)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.length === 0 && <span className="text-gray-500">No tags yet.</span>}
      {tags.map((tag) => (
        <TagChip key={tag.id} tag={tag} onRemove={() => removeTag.mutate(tag)} />
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
    </div>
  )
}
