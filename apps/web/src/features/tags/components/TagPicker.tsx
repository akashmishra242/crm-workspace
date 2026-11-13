import type { Tag } from '@crm/shared'
import { useQuery } from '@tanstack/react-query'
import { Command } from 'cmdk'
import { Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/Popover'
import { notify } from '../../../components/ui/Toast'
import { cn } from '../../../lib/cn'
import { tagListQuery } from '../api/tagQueries'
import { useCreateTag } from '../api/useTagMutations'
import { TAG_DOT_CLASSES } from './TagChip'

type TagPickerProps = {
  /** The button that opens the picker. */
  children: ReactNode
  label: string
  onSelect: (tag: Tag) => void
  /** Tags that can't be picked, e.g. the ones a contact already has. */
  excludeIds?: readonly string[]
  /** Offer "Create …" when the search matches no existing tag. */
  allowCreate?: boolean
}

const itemClasses =
  'flex h-8 cursor-default items-center gap-2 rounded px-2 text-sm text-gray-700 select-none data-[selected=true]:bg-gray-100 data-[selected=true]:text-gray-900'

export function TagPicker({
  children,
  label,
  onSelect,
  excludeIds = [],
  allowCreate = true,
}: TagPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const tags = useQuery(tagListQuery())
  const createTag = useCreateTag()

  const trimmed = search.trim()
  const available = (tags.data ?? []).filter((tag) => !excludeIds.includes(tag.id))
  const canCreate =
    allowCreate &&
    trimmed !== '' &&
    !(tags.data ?? []).some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase())

  function choose(tag: Tag) {
    onSelect(tag)
    setOpen(false)
    setSearch('')
  }

  function create() {
    createTag.mutate(trimmed, {
      onSuccess: choose,
      onError: (error) => notify.error("Couldn't create the tag", error.message),
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command label={label} loop>
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search or create a tag"
            className="h-10 w-full border-b border-gray-200 bg-transparent px-3 text-sm outline-none placeholder:text-gray-400"
          />
          <Command.List className="max-h-64 overflow-y-auto p-1">
            {tags.isPending && <Command.Loading>Loading tags…</Command.Loading>}
            {tags.isError && <p className="px-2 py-3 text-sm text-red-600">Couldn't load tags.</p>}
            <Command.Empty className="px-2 py-3 text-sm text-gray-500">
              {canCreate ? null : 'No matching tags'}
            </Command.Empty>
            {available.map((tag) => (
              <Command.Item
                key={tag.id}
                value={tag.name}
                onSelect={() => choose(tag)}
                className={itemClasses}
              >
                <span
                  aria-hidden
                  className={cn('size-2 rounded-full', TAG_DOT_CLASSES[tag.color])}
                />
                {tag.name}
              </Command.Item>
            ))}
            {canCreate && (
              <Command.Item
                value={`create ${trimmed}`}
                onSelect={create}
                disabled={createTag.isPending}
                className={cn(itemClasses, 'text-primary-700')}
              >
                <Plus className="size-4" aria-hidden />
                Create “{trimmed}”
              </Command.Item>
            )}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
