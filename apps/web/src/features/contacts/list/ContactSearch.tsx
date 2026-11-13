import { LoaderCircle, Search, X } from 'lucide-react'
import { useRef } from 'react'
import { useKeyboardShortcut } from '../../../hooks/useKeyboardShortcut'
import { inputClasses } from '../../../components/ui/TextField'
import { cn } from '../../../lib/cn'

type ContactSearchProps = {
  value: string
  onChange: (value: string) => void
  isPending: boolean
  /** ↓ from the search box moves focus into the results. */
  onArrowDown: () => void
}

export function ContactSearch({ value, onChange, isPending, onArrowDown }: ContactSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  useKeyboardShortcut('/', () => inputRef.current?.focus())

  return (
    <div role="search" className="relative w-full sm:w-80">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) onChange('')
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            onArrowDown()
          }
        }}
        placeholder="Search name, email or phone"
        aria-label="Search contacts by name, email or phone"
        aria-keyshortcuts="/"
        className={cn(inputClasses, 'pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden')}
      />
      <span className="absolute top-1/2 right-2 -translate-y-1/2">
        {isPending ? (
          <LoaderCircle className="size-4 animate-spin text-gray-400" aria-label="Searching" />
        ) : value ? (
          <button
            type="button"
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
            className="grid size-6 place-items-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : (
          <kbd className="hidden rounded border border-gray-200 px-1.5 font-sans text-xs text-gray-400 sm:inline">
            /
          </kbd>
        )}
      </span>
    </div>
  )
}
