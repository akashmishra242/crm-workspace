import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Lock } from 'lucide-react'
import { useState } from 'react'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { Checkbox } from './Checkbox'

export type SortableListItem<Id extends string> = {
  id: Id
  label: string
  visible: boolean
  /** Always shown, always first, and can't be dragged. */
  locked?: boolean
}

type SortableListProps<Id extends string> = {
  label: string
  items: ReadonlyArray<SortableListItem<Id>>
  onReorder: (orderedIds: Id[]) => void
  onVisibilityChange: (id: Id, visible: boolean) => void
}

/**
 * Keeps a dragged row inside the list, so it can't leave the popover holding it. The list is
 * measured on every move: dnd-kit's own `restrictToParentElement` measured it wrongly inside
 * a modal dialog and pinned every drag in place, which made reordering do nothing there.
 */
function keepInsideList(list: HTMLElement | null): Modifier {
  return ({ transform, activeNodeRect }) => {
    const bounds = list?.getBoundingClientRect()
    if (!bounds || !activeNodeRect) return transform
    const minY = bounds.top - activeNodeRect.top
    const maxY = bounds.bottom - activeNodeRect.bottom
    return { ...transform, y: Math.min(Math.max(transform.y, minY), maxY) }
  }
}

/**
 * Drag (or Space + arrow keys) to reorder; tick to show or hide. Locked items sit above the
 * others and stay there, so the list always shows the real order.
 */
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

  const [listElement, setListElement] = useState<HTMLUListElement | null>(null)
  const locked = items.filter((item) => item.locked)
  const movable = items.filter((item) => !item.locked)

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const ids = movable.map((item) => item.id)
    const from = ids.indexOf(active.id as Id)
    const to = ids.indexOf(over.id as Id)
    onReorder([...locked.map((item) => item.id), ...arrayMove(ids, from, to)])
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, keepInsideList(listElement)]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={movable.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul ref={setListElement} aria-label={label} className="space-y-1">
          {locked.map((item) => (
            <li
              key={item.id}
              className="flex h-9 items-center gap-2 rounded-md bg-gray-50 px-2 ring-1 ring-gray-200"
            >
              <Lock
                className="size-4 p-0.5 text-gray-400"
                role="img"
                aria-label={t.common.locked}
              />
              <label className="flex flex-1 items-center gap-2 text-sm text-gray-500">
                <Checkbox checked disabled />
                {item.label}
              </label>
            </li>
          ))}
          {movable.map((item) => (
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
        aria-label={t.common.reorder(item.label)}
        className="cursor-grab rounded p-0.5 text-gray-400 hover:text-gray-600 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <label className="flex flex-1 items-center gap-2 text-sm text-gray-700">
        <Checkbox
          checked={item.visible}
          onCheckedChange={(checked) => onVisibilityChange(item.id, checked === true)}
        />
        {item.label}
      </label>
    </li>
  )
}
