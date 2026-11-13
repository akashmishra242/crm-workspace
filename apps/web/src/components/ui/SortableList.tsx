import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Lock } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Checkbox } from './Checkbox'

export type SortableListItem<Id extends string> = {
  id: Id
  label: string
  visible: boolean
  locked?: boolean
}

type SortableListProps<Id extends string> = {
  label: string
  items: ReadonlyArray<SortableListItem<Id>>
  onReorder: (orderedIds: Id[]) => void
  onVisibilityChange: (id: Id, visible: boolean) => void
}

/** Rows only move up and down, and never leave the list (or the popover holding it). */
const DRAG_MODIFIERS = [restrictToVerticalAxis, restrictToParentElement]

/** Drag (or Space + arrow keys) to reorder; tick to show or hide. */
export function SortableList<Id extends string>({
  label,
  items,
  onReorder,
  onVisibilityChange,
}: SortableListProps<Id>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const ids = items.map((item) => item.id)
    const from = ids.indexOf(active.id as Id)
    const to = ids.indexOf(over.id as Id)
    onReorder(arrayMove(ids, from, to))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={DRAG_MODIFIERS}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ul aria-label={label} className="space-y-1">
          {items.map((item) => (
            <SortableRow key={item.id} item={item} onVisibilityChange={onVisibilityChange} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

type SortableRowProps<Id extends string> = {
  item: SortableListItem<Id>
  onVisibilityChange: (id: Id, visible: boolean) => void
}

function SortableRow<Id extends string>({ item, onVisibilityChange }: SortableRowProps<Id>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex h-9 items-center gap-2 rounded-md bg-white px-2 ring-1 ring-gray-200',
        isDragging && 'relative z-10 shadow-md',
      )}
    >
      <button
        type="button"
        aria-label={`Reorder ${item.label}`}
        className="cursor-grab rounded p-0.5 text-gray-400 hover:text-gray-600 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <label className="flex flex-1 items-center gap-2 text-sm text-gray-700">
        <Checkbox
          checked={item.visible}
          disabled={item.locked}
          onCheckedChange={(checked) => onVisibilityChange(item.id, checked === true)}
        />
        {item.label}
      </label>
      {item.locked && (
        <Lock className="size-3.5 text-gray-400" aria-label="Always visible" role="img" />
      )}
    </li>
  )
}
