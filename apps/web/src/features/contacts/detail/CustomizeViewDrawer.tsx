import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { Drawer } from '../../../components/ui/Drawer'
import { ModalBody, ModalFooter } from '../../../components/ui/Modal'
import { MultiSelect } from '../../../components/ui/MultiSelect'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/Popover'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { fieldTriggerClasses } from '../../../components/ui/Select'
import { SortableList } from '../../../components/ui/SortableList'
import { Switch } from '../../../components/ui/Switch'
import { cn } from '../../../lib/cn'
import {
  CARD_FIELD_LABELS,
  CARD_FIELDS,
  DEFAULT_DETAIL_VIEW,
  MODULE_LABELS,
  moduleItemsOf,
  sameView,
  visibleModulesOf,
  type DetailLayout,
  type DetailModule,
  type DetailView,
  type DetailViewPreferences,
  type ModuleDisplay,
} from './useDetailViewPreferences'

type CustomizeViewDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  view: DetailView
}

export default function CustomizeViewDrawer({
  open,
  onOpenChange,
  view,
}: CustomizeViewDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Customize view"
      description="Choose how contact pages are laid out. Saved to your profile, so it follows you to other devices."
    >
      {/* Mounted on open, so every opening starts from what is saved. */}
      <CustomizeForm
        saved={view.preferences}
        onSave={(draft) => {
          view.save(draft)
          onOpenChange(false)
        }}
        onCancel={() => onOpenChange(false)}
      />
    </Drawer>
  )
}

type CustomizeFormProps = {
  saved: DetailViewPreferences
  onSave: (draft: DetailViewPreferences) => void
  onCancel: () => void
}

/** Changes are a draft until Save, so Cancel always means "leave it as it was". */
function CustomizeForm({ saved, onSave, onCancel }: CustomizeFormProps) {
  const [draft, setDraft] = useState(saved)
  const update = (patch: Partial<DetailViewPreferences>) =>
    setDraft((current) => ({ ...current, ...patch }))

  const changed = !sameView(draft, saved)
  const isDefault = sameView(draft, DEFAULT_DETAIL_VIEW)

  return (
    <>
      <ModalBody>
        <div className="space-y-6">
          <Section
            title="Layout"
            hint="Three panels need a screen at least 1,280 pixels wide. Narrower screens show two columns, and phones show one."
          >
            <SegmentedControl<DetailLayout>
              label="Layout"
              value={draft.layout}
              onChange={(layout) => update({ layout })}
              options={[
                { value: 'three-panel', label: 'Three panels' },
                { value: 'two-column', label: 'Two columns' },
              ]}
            />
          </Section>

          <Section
            title="Panels"
            hint={
              draft.layout === 'three-panel'
                ? 'Activity is always shown, in the middle. The others stack on the right in this order.'
                : 'Panels appear as tabs next to the contact details, in this order. Activity is always first.'
            }
          >
            <PanelsField draft={draft} onChange={update} />
            {draft.layout === 'two-column' && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700">Switch panels with</span>
                <SegmentedControl<ModuleDisplay>
                  label="Switch panels with"
                  value={draft.moduleDisplay}
                  onChange={(moduleDisplay) => update({ moduleDisplay })}
                  options={[
                    { value: 'tabs', label: 'Tabs' },
                    { value: 'dropdown', label: 'A dropdown' },
                  ]}
                />
              </div>
            )}
          </Section>

          <Section title="Contact card" hint="Details shown under the contact’s name.">
            <MultiSelect
              label="Contact card details"
              placeholder="Name only"
              options={CARD_FIELDS.map((field) => ({
                value: field,
                label: CARD_FIELD_LABELS[field],
              }))}
              value={draft.cardFields}
              onChange={(cardFields) => update({ cardFields })}
            />
          </Section>

          <Section title="Fields">
            <Switch
              label="Hide empty fields"
              description="Fields without a value are tucked away until you need them."
              checked={draft.hideEmptyFields}
              onCheckedChange={(hideEmptyFields) => update({ hideEmptyFields })}
            />
          </Section>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="ghost"
          className="mr-auto"
          disabled={isDefault}
          onClick={() => setDraft(DEFAULT_DETAIL_VIEW)}
        >
          Reset to default
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" disabled={!changed} onClick={() => onSave(draft)}>
          Save
        </Button>
      </ModalFooter>
    </>
  )
}

type PanelsFieldProps = {
  draft: DetailViewPreferences
  onChange: (patch: Partial<DetailViewPreferences>) => void
}

/** A dropdown holding the reorderable list, like "Manage fields" on the contacts table. */
function PanelsField({ draft, onChange }: PanelsFieldProps) {
  const shown = visibleModulesOf(draft).map((module) => MODULE_LABELS[module])

  function setVisible(module: DetailModule, visible: boolean) {
    onChange({
      hiddenModules: visible
        ? draft.hiddenModules.filter((hidden) => hidden !== module)
        : [...draft.hiddenModules, module],
    })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Panels" className={cn(fieldTriggerClasses, 'h-9 w-full')}>
          <span className="truncate">{shown.join(', ')}</span>
          <ChevronDown className="size-4 shrink-0 text-gray-400" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-3">
        <p className="mb-2 text-xs text-gray-500">Drag to reorder. Untick to hide.</p>
        <SortableList
          label="Panels"
          items={moduleItemsOf(draft)}
          onReorder={(moduleOrder) => onChange({ moduleOrder })}
          onVisibilityChange={setVisible}
        />
      </PopoverContent>
    </Popover>
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
