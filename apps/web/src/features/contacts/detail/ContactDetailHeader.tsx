import { ArrowLeft, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router'
import { Button, IconButton } from '../../../components/ui/Button'
import { useKeyboardShortcut } from '../../../hooks/useKeyboardShortcut'
import { formatCount } from '../../../lib/format'
import { serializeContactListParams, useContactListParams } from '../list/useContactListParams'
import { useContactNeighbors } from './useContactNeighbors'

type ContactDetailHeaderProps = {
  contactId: string
  onCustomize?: () => void
}

export function ContactDetailHeader({ contactId, onCustomize }: ContactDetailHeaderProps) {
  const { params } = useContactListParams()
  const neighbors = useContactNeighbors(contactId)

  useKeyboardShortcut('ArrowLeft', () => neighbors?.goPrevious(), {
    enabled: Boolean(neighbors?.hasPrevious),
  })
  useKeyboardShortcut('ArrowRight', () => neighbors?.goNext(), {
    enabled: Boolean(neighbors?.hasNext),
  })

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4 sm:px-6">
      <Link
        to={serializeContactListParams('/contacts', params)}
        className="inline-flex items-center gap-2 rounded-md py-1 pr-2 text-sm font-semibold text-gray-900 hover:text-primary-700"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Contact details
      </Link>

      {neighbors && (
        <div className="ml-2 flex items-center gap-1 text-sm text-gray-500">
          <span aria-live="polite" className="tabular-nums">
            {formatCount(neighbors.position)}
            {neighbors.total !== undefined && ` / ${formatCount(neighbors.total)}`}
          </span>
          <IconButton
            variant="ghost"
            size="sm"
            label="Previous contact (←)"
            icon={<ChevronLeft className="size-4" />}
            disabled={!neighbors.hasPrevious}
            onClick={neighbors.goPrevious}
          />
          <IconButton
            variant="ghost"
            size="sm"
            label="Next contact (→)"
            icon={<ChevronRight className="size-4" />}
            disabled={!neighbors.hasNext}
            onClick={neighbors.goNext}
          />
        </div>
      )}

      {onCustomize && (
        <Button size="sm" className="ml-auto" onClick={onCustomize}>
          <SlidersHorizontal className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Customize view</span>
        </Button>
      )}
    </header>
  )
}
