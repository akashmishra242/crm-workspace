import { cn } from '../../lib/cn'
import { initials } from '../../lib/format'

const PALETTE = [
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-indigo-100 text-indigo-700',
]

/** Same contact, same colour — across lists, pages and sessions. */
function paletteFor(seed: string): string {
  let hash = 0
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return PALETTE[hash % PALETTE.length] ?? 'bg-gray-100 text-gray-700'
}

type AvatarProps = {
  id: string
  firstName: string
  lastName: string
  size?: 'xs' | 'sm' | 'lg'
}

export function Avatar({ id, firstName, lastName, size = 'sm' }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full font-medium',
        { xs: 'size-5 text-[9px]', sm: 'size-7 text-[11px]', lg: 'size-11 text-sm' }[size],
        paletteFor(id),
      )}
    >
      {initials(firstName, lastName)}
    </span>
  )
}
