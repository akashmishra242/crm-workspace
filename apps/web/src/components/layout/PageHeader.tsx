import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: ReactNode
  /** Rendered next to the title, e.g. a record count. */
  meta?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, meta, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-5 pb-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate text-xl font-semibold text-gray-900">{title}</h1>
        {meta}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
