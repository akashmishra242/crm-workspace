import { Tabs } from 'radix-ui'
import { useState, type ReactNode } from 'react'
import { inputClasses } from '../../../components/ui/TextField'
import { cn } from '../../../lib/cn'
import { MODULE_LABELS, type DetailModule, type ModuleDisplay } from './useDetailViewPreferences'

type ModuleSwitcherProps = {
  modules: DetailModule[]
  display: ModuleDisplay
  renderModule: (module: DetailModule) => ReactNode
}

/** Shows one panel at a time, picked with tabs or a dropdown. */
export function ModuleSwitcher({ modules, display, renderModule }: ModuleSwitcherProps) {
  const [selected, setSelected] = useState<DetailModule | undefined>(modules[0])
  const active = selected && modules.includes(selected) ? selected : modules[0]
  if (!active) return null

  return (
    <Tabs.Root
      value={active}
      onValueChange={(value) => setSelected(value as DetailModule)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="border-b border-gray-200 px-4">
        {display === 'tabs' ? (
          <Tabs.List aria-label="Contact panels" className="-mb-px flex gap-4">
            {modules.map((module) => (
              <Tabs.Trigger
                key={module}
                value={module}
                className={cn(
                  'h-11 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-900',
                  'data-[state=active]:border-primary-600 data-[state=active]:text-primary-700',
                )}
              >
                {MODULE_LABELS[module]}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        ) : (
          <div className="py-2">
            <select
              aria-label="Contact panel"
              value={active}
              onChange={(event) => setSelected(event.target.value as DetailModule)}
              className={cn(inputClasses, 'w-48')}
            >
              {modules.map((module) => (
                <option key={module} value={module}>
                  {MODULE_LABELS[module]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {modules.map((module) => (
        <Tabs.Content key={module} value={module} className="min-h-0 flex-1 overflow-y-auto">
          {renderModule(module)}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  )
}
