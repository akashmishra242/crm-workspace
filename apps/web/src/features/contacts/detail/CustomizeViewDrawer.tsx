import type { ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { Checkbox } from '../../../components/ui/Checkbox'
import { Drawer } from '../../../components/ui/Drawer'
import { ModalBody, ModalFooter } from '../../../components/ui/Modal'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { SortableList } from '../../../components/ui/SortableList'
import {
  CARD_FIELD_LABELS,
  CARD_FIELDS,
  type DetailLayout,
  type DetailView,
  type ModuleDisplay,
} from './useDetailViewPreferences'

type CustomizeViewDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  view: DetailView
}

export function CustomizeViewDrawer({ open, onOpenChange, view }: CustomizeViewDrawerProps) {
  const { preferences } = view

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Customize view"
      description="Changes apply immediately and are saved on this device."
    >
      <ModalBody>
        <div className="space-y-6">
          <Section
            title="Layout"
            hint="Three panels on wide screens; smaller screens always stack."
          >
            <SegmentedControl<DetailLayout>
              label="Layout"
              value={preferences.layout}
              onChange={view.setLayout}
              options={[
                { value: 'three-panel', label: 'Three-panel' },
                { value: 'two-column', label: 'Two-column' },
              ]}
            />
          </Section>

          <Section
            title="Panels"
            hint={
              preferences.layout === 'three-panel'
                ? 'Activity stays in the centre; the others stack in the right panel.'
                : 'Panels appear in this order next to the contact details.'
            }
          >
            <SortableList
              label="Panels"
              items={view.moduleItems}
              onReorder={view.reorderModules}
              onVisibilityChange={view.setModuleVisible}
            />
            {preferences.layout === 'two-column' && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-gray-700">Show panels as</span>
                <SegmentedControl<ModuleDisplay>
                  label="Show panels as"
                  value={preferences.moduleDisplay}
                  onChange={view.setModuleDisplay}
                  options={[
                    { value: 'tabs', label: 'Tabs' },
                    { value: 'dropdown', label: 'Dropdown' },
                  ]}
                />
              </div>
            )}
          </Section>

          <Section
            title="Contact card"
            hint="Shown under the name at the top of the details panel."
          >
            <ul className="space-y-1">
              {CARD_FIELDS.map((field) => (
                <li key={field}>
                  <label className="flex h-8 items-center gap-2 text-gray-700">
                    <Checkbox
                      checked={preferences.cardFields.includes(field)}
                      onCheckedChange={(checked) => view.setCardField(field, checked === true)}
                    />
                    {CARD_FIELD_LABELS[field]}
                  </label>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Fields">
            <label className="flex items-center gap-2 text-gray-700">
              <Checkbox
                checked={preferences.hideEmptyFields}
                onCheckedChange={(checked) => view.setHideEmptyFields(checked === true)}
              />
              Hide empty fields
            </label>
          </Section>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" className="mr-auto" onClick={view.reset}>
          Reset to default
        </Button>
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      </ModalFooter>
    </Drawer>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{title}</h3>
      {hint && <p className="mt-0.5 mb-2 text-xs text-gray-500">{hint}</p>}
      <div className={hint ? undefined : 'mt-2'}>{children}</div>
    </section>
  )
}
