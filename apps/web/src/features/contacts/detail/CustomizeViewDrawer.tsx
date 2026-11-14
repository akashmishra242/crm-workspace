import { useState, type ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { Drawer, DrawerFooter, DrawerToolbar, useDrawerGuard } from '../../../components/ui/Drawer'
import { ModalBody } from '../../../components/ui/Modal'
import { MultiSelect } from '../../../components/ui/MultiSelect'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { SortableList } from '../../../components/ui/SortableList'
import { Switch } from '../../../components/ui/Switch'
import { t } from '../../../i18n'
import {
  CARD_FIELD_LABELS,
  CARD_FIELDS,
  DEFAULT_DETAIL_VIEW,
  moduleItemsOf,
  sameView,
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
  /** Shows the draft on the page behind while it's being edited; null when done. */
  onPreview: (draft: DetailViewPreferences | null) => void
}

export default function CustomizeViewDrawer({
  open,
  onOpenChange,
  view,
  onPreview,
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
        onPreview={onPreview}
        onSave={(draft) => {
          view.save(draft)
          onOpenChange(false)
        }}
      />
    </Drawer>
  )
}

type CustomizeFormProps = {
  saved: DetailViewPreferences
  onPreview: (draft: DetailViewPreferences) => void
  onSave: (draft: DetailViewPreferences) => void
}

/**
 * Each change shows on the page behind at once, but stays a draft until Save, so Cancel
 * always means "leave it as it was".
 */
function CustomizeForm({ saved, onPreview, onSave }: CustomizeFormProps) {
  const [draft, setDraft] = useState(saved)
  const changed = !sameView(draft, saved)
  const isDefault = sameView(draft, DEFAULT_DETAIL_VIEW)
  const close = useDrawerGuard(changed)

  function change(next: DetailViewPreferences) {
    setDraft(next)
    onPreview(next)
  }
  const update = (patch: Partial<DetailViewPreferences>) => change({ ...draft, ...patch })

  function setPanelVisible(module: DetailModule, visible: boolean) {
    update({
      hiddenModules: visible
        ? draft.hiddenModules.filter((hidden) => hidden !== module)
        : [...draft.hiddenModules, module],
    })
  }

  return (
    <>
      <ModalBody>
        <DrawerToolbar>
          <Button
            size="sm"
            variant="ghost"
            disabled={isDefault}
            onClick={() => change(DEFAULT_DETAIL_VIEW)}
          >
            {t.contacts.customize.resetToDefault}
          </Button>
        </DrawerToolbar>
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
            <SortableList
              label={t.contacts.customize.panels}
              items={moduleItemsOf(draft)}
              onReorder={(moduleOrder) => update({ moduleOrder })}
              onVisibilityChange={setPanelVisible}
            />
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
      <DrawerFooter>
        <Button onClick={close}>{t.common.cancel}</Button>
        <Button variant="primary" disabled={!changed} onClick={() => onSave(draft)}>
          {t.common.save}
        </Button>
      </DrawerFooter>
    </>
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
