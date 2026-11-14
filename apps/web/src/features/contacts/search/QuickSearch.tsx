import { DEFAULT_PAGE_SIZE } from '@crm/shared'
import { useQuery } from '@tanstack/react-query'
import { Command } from 'cmdk'
import { LoaderCircle, Search } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Avatar } from '../../../components/ui/Avatar'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useKeyboardShortcut } from '../../../hooks/useKeyboardShortcut'
import { t } from '../../../i18n'
import { contactListQuery } from '../api/contactQueries'
import type { ContactListRequest } from '../api/contactsApi'
import { NO_FILTERS } from '../list/useContactListParams'
import { contactDisplayName } from '../utils/contactDisplayName'

const RESULT_LIMIT = 8

const searchRequest = (q: string): ContactListRequest => ({
  q,
  ...NO_FILTERS,
  sort: 'name',
  order: 'asc',
  limit: DEFAULT_PAGE_SIZE,
  cursor: null,
  offset: null,
})

const SHORTCUT_LABEL = /Mac|iPhone|iPad/.test(navigator.userAgent)
  ? '⌘K'
  : `${t.shortcuts.keys.ctrl} K`

/** Ctrl/Cmd + K from anywhere: jump straight to a contact by name, email or phone. */
export function QuickSearch({ variant = 'sidebar' }: { variant?: 'sidebar' | 'icon' }) {
  const [open, setOpen] = useState(false)
  useKeyboardShortcut('k', () => setOpen(true), {
    mod: true,
    allowInInputs: true,
    allowInDialogs: true,
  })

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {variant === 'icon' ? (
        <DialogPrimitive.Trigger
          aria-keyshortcuts="Control+K Meta+K"
          aria-label={t.quickSearch.title}
          className="grid size-9 place-items-center rounded-md text-sidebar-muted hover:bg-white/10 hover:text-white"
        >
          <Search className="size-4" aria-hidden />
        </DialogPrimitive.Trigger>
      ) : (
        <DialogPrimitive.Trigger
          aria-keyshortcuts="Control+K Meta+K"
          className="flex h-9 w-full items-center gap-2 rounded-md bg-sidebar-hover/60 px-3 text-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1 text-left">{t.quickSearch.title}</span>
          <kbd className="rounded bg-sidebar px-1.5 font-sans text-[11px]">{SHORTCUT_LABEL}</kbd>
        </DialogPrimitive.Trigger>
      )}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 animate-fade-in bg-gray-900/40" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-[15vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 animate-fade-in overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-gray-200"
        >
          <DialogPrimitive.Title className="sr-only">{t.quickSearch.title}</DialogPrimitive.Title>
          <QuickSearchResults onDone={() => setOpen(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function QuickSearchResults({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const query = useDebouncedValue(search.trim(), 250)
  const results = useQuery({ ...contactListQuery(searchRequest(query)), enabled: query !== '' })
  // Only show results for exactly what is typed, so Enter can't open a match for older text.
  const settled = query !== '' && query === search.trim() && !results.isPlaceholderData
  const contacts = settled ? (results.data?.data.slice(0, RESULT_LIMIT) ?? []) : []

  return (
    <Command shouldFilter={false} label={t.quickSearch.title} loop>
      <div className="flex items-center gap-2 border-b border-gray-200 px-4">
        <Search className="size-4 text-gray-400" aria-hidden />
        <Command.Input
          maxLength={100}
          value={search}
          onValueChange={setSearch}
          placeholder={t.quickSearch.placeholder}
          className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
        {results.isFetching && (
          <LoaderCircle
            className="size-4 animate-spin text-gray-400"
            aria-label={t.common.searching}
          />
        )}
      </div>
      <Command.List className="max-h-80 overflow-y-auto p-2">
        {query === '' && (
          <p className="px-2 py-6 text-center text-sm text-gray-500">{t.quickSearch.prompt}</p>
        )}
        {settled && !results.isFetching && contacts.length === 0 && (
          <Command.Empty className="px-2 py-6 text-center text-sm text-gray-500">
            {results.isError ? t.quickSearch.unavailable : t.quickSearch.noResults}
          </Command.Empty>
        )}
        {contacts.map((contact) => (
          <Command.Item
            key={contact.id}
            value={contact.id}
            onSelect={() => {
              onDone()
              void navigate(`/contacts/${contact.id}`)
            }}
            className="flex cursor-default items-center gap-3 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-primary-50"
          >
            <Avatar id={contact.id} firstName={contact.firstName} lastName={contact.lastName} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-gray-900">
                {contactDisplayName(contact)}
              </span>
              <span className="block truncate text-xs text-gray-500">
                {[contact.email, contact.company].filter(Boolean).join(' · ') ||
                  t.quickSearch.noEmail}
              </span>
            </span>
          </Command.Item>
        ))}
      </Command.List>
      <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
        {t.quickSearch.hint}
      </p>
    </Command>
  )
}
