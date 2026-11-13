import { useQuery } from '@tanstack/react-query'
import { ChevronsUpDown } from 'lucide-react'
import { Avatar } from '../../../components/ui/Avatar'
import {
  Menu,
  MenuContent,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from '../../../components/ui/Menu'
import { cn } from '../../../lib/cn'
import { setCurrentUserId, useCurrentUserId } from '../../../lib/session'
import { userListQuery } from '../api/userQueries'

const splitName = (name: string) => {
  const [firstName = '', ...rest] = name.split(' ')
  return { firstName, lastName: rest.join(' ') }
}

/**
 * Stands in for a signed-in account. Switching teammates shows who made each change and
 * lets two tabs act as two different people when trying out conflicting edits.
 */
export function UserMenu({ tone }: { tone: 'sidebar' | 'header' }) {
  const users = useQuery(userListQuery())
  const currentUserId = useCurrentUserId()
  const current = users.data?.find((user) => user.id === currentUserId)
  if (!current) return null

  return (
    <Menu>
      <MenuTrigger
        className={cn(
          'flex min-w-0 items-center gap-2.5 rounded-md p-2 text-left',
          tone === 'sidebar' ? 'w-full hover:bg-sidebar-hover' : 'hover:bg-white/10',
        )}
        aria-label={`Acting as ${current.name}. Switch teammate`}
      >
        <Avatar id={current.id} {...splitName(current.name)} />
        <span className={cn('min-w-0 flex-1', tone === 'header' && 'hidden sm:block')}>
          <span className="block truncate text-sm font-medium text-white">{current.name}</span>
          <span className="block truncate text-xs text-sidebar-muted">{current.email}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-sidebar-muted" aria-hidden />
      </MenuTrigger>
      <MenuContent
        align={tone === 'sidebar' ? 'start' : 'end'}
        side={tone === 'sidebar' ? 'top' : 'bottom'}
        className="w-64"
      >
        <MenuLabel>Acting as (demo, no sign-in)</MenuLabel>
        <MenuRadioGroup value={current.id} onValueChange={setCurrentUserId}>
          {users.data?.map((user) => (
            <MenuRadioItem key={user.id} value={user.id} className="h-auto py-1.5">
              <span className="min-w-0">
                <span className="block truncate">{user.name}</span>
                <span className="block truncate text-xs text-gray-500">{user.email}</span>
              </span>
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  )
}
