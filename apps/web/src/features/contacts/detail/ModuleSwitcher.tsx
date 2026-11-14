import { Tabs } from 'radix-ui'
import type { ReactNode } from 'react'
import { Select } from '../../../components/ui/Select'
import { cn } from '../../../lib/cn'
import {
  MODULE_LABELS,
  useActivePanel,
  type DetailModule,
  type ModuleDisplay,
} from './useDetailViewPreferences'

type ModuleSwitcherProps = {
  modules: DetailModule[]
  display: ModuleDisplay
  renderModule: (module: DetailModule) => ReactNode
}

/** Shows one panel at a time, picked with tabs or a dropdown. The last pick is remembered. */
export function ModuleSwitcher({ modules, display, renderModule }: ModuleSwitcherProps) {
  const [selected, setSelected] = useActivePanel()
  // A remembered panel that has since been hidden falls back to the first one.
  const active = modules.includes(selected) ? selected : modules[0]
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
            <Select<DetailModule>
              label="Contact panel"
              className="w-48"
              value={active}
              onChange={setSelected}
              options={modules.map((module) => ({ value: module, label: MODULE_LABELS[module] }))}
            />
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
