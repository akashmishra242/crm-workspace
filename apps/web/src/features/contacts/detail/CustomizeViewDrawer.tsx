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
import { t } from '../../../i18n'
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
      title={t.contacts.customize.title}
      description={t.contacts.customize.description}
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
          <Section title={t.contacts.customize.layout} hint={t.contacts.customize.layoutHint}>
            <SegmentedControl<DetailLayout>
              label={t.contacts.customize.layout}
              value={draft.layout}
              onChange={(layout) => update({ layout })}
              options={[
                { value: 'three-panel', label: t.contacts.customize.layouts.threePanel },
                { value: 'two-column', label: t.contacts.customize.layouts.twoColumn },
              ]}
            />
          </Section>

          <Section
            title={t.contacts.customize.panels}
            hint={
              draft.layout === 'three-panel'
                ? t.contacts.customize.panelsHintThreePanel
                : t.contacts.customize.panelsHintTwoColumn
            }
          >
            <PanelsField draft={draft} onChange={update} />
            {draft.layout === 'two-column' && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700">
                  {t.contacts.customize.switchPanelsWith}
                </span>
                <SegmentedControl<ModuleDisplay>
                  label={t.contacts.customize.switchPanelsWith}
                  value={draft.moduleDisplay}
                  onChange={(moduleDisplay) => update({ moduleDisplay })}
                  options={[
                    { value: 'tabs', label: t.contacts.customize.tabs },
                    { value: 'dropdown', label: t.contacts.customize.dropdown },
                  ]}
                />
              </div>
            )}
          </Section>

          <Section title={t.contacts.customize.card} hint={t.contacts.customize.cardHint}>
            <MultiSelect
              label={t.contacts.customize.cardDetails}
              placeholder={t.contacts.customize.nameOnly}
              options={CARD_FIELDS.map((field) => ({
                value: field,
                label: CARD_FIELD_LABELS[field],
              }))}
              value={draft.cardFields}
              onChange={(cardFields) => update({ cardFields })}
            />
          </Section>

          <Section title={t.contacts.customize.fields}>
            <Switch
              label={t.contacts.customize.hideEmpty}
              description={t.contacts.customize.hideEmptyDescription}
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
          {t.contacts.customize.resetToDefault}
        </Button>
        <Button onClick={onCancel}>{t.common.cancel}</Button>
        <Button variant="primary" disabled={!changed} onClick={() => onSave(draft)}>
          {t.common.save}
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
        <button
          type="button"
          aria-label={t.contacts.customize.panels}
          className={cn(fieldTriggerClasses, 'h-9 w-full')}
        >
          <span className="truncate">{shown.join(', ')}</span>
          <ChevronDown className="size-4 shrink-0 text-gray-400" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-3">
        <p className="mb-2 text-xs text-gray-500">{t.contacts.customize.panelsReorderHint}</p>
        <SortableList
          label={t.contacts.customize.panels}
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
