import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { Tooltip } from '../../../components/ui/Tooltip'
import { t } from '../../../i18n'

/** No column can be squeezed below this share of the table width. */
const MIN_WIDTH_PERCENT = 6
const KEYBOARD_STEP_PERCENT = 1

type Pair = { left: number; right: number }

type ColumnResizeHandleProps = {
  columnLabel: string
  /** Current widths (percent) of the column on each side of the handle. */
  pair: Pair
  getTableWidth: () => number
  /** Called on every pointer move for a live preview. */
  onPreview: (pair: Pair) => void
  /** Called once when the drag ends, or on each arrow-key step. */
  onCommit: (pair: Pair) => void
}

/**
 * Dragging moves width between two neighbouring columns, so the total stays at 100% and the
 * table never overflows. Uses pointer capture, so no window listeners are needed.
 */
export function ColumnResizeHandle({
  columnLabel,
  pair,
  getTableWidth,
  onPreview,
  onCommit,
}: ColumnResizeHandleProps) {
  const drag = useRef<{ startX: number; start: Pair; latest: Pair } | null>(null)
  const total = pair.left + pair.right

  const resized = (left: number): Pair => {
    const clamped = Math.min(Math.max(left, MIN_WIDTH_PERCENT), total - MIN_WIDTH_PERCENT)
    return { left: clamped, right: total - clamped }
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startX: event.clientX, start: pair, latest: pair }
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return
    const deltaPercent = ((event.clientX - drag.current.startX) / getTableWidth()) * 100
    drag.current.latest = resized(drag.current.start.left + deltaPercent)
    onPreview(drag.current.latest)
  }

  function endDrag() {
    if (!drag.current) return
    const { start, latest } = drag.current
    drag.current = null
    if (latest.left !== start.left) onCommit(latest)
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = { ArrowLeft: -KEYBOARD_STEP_PERCENT, ArrowRight: KEYBOARD_STEP_PERCENT }[event.key]
    if (step === undefined) return
    event.preventDefault()
    onCommit(resized(pair.left + step))
  }

  return (
    <Tooltip content={t.contacts.table.resizeTooltip}>
      <button
        type="button"
        aria-label={t.contacts.table.resizeColumn(columnLabel)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={onKeyDown}
        className="group absolute inset-y-0 -right-1.5 z-10 flex w-3 cursor-col-resize touch-none items-center justify-center outline-none"
      >
        <span className="h-4 w-px rounded bg-gray-300 transition-all group-hover:h-full group-hover:w-0.5 group-hover:bg-primary-400 group-focus-visible:h-full group-focus-visible:w-1 group-focus-visible:bg-primary-600 group-active:h-full group-active:bg-primary-600" />
      </button>
    </Tooltip>
  )
}
