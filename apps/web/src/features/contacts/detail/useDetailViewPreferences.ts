import { z } from 'zod'
import type { SortableListItem } from '../../../components/ui/SortableList'
import { t } from '../../../i18n'
import { usePreference } from '../../preferences/usePreference'

export const DETAIL_MODULES = ['activity', 'tags', 'record'] as const
export type DetailModule = (typeof DETAIL_MODULES)[number]

export const MODULE_LABELS: Record<DetailModule, string> = t.contacts.detail.modules

export const CARD_FIELDS = ['email', 'phone', 'company', 'tags'] as const
export type CardField = (typeof CARD_FIELDS)[number]

export const CARD_FIELD_LABELS: Record<CardField, string> = t.contacts.detail.cardFields

const preferencesSchema = z.object({
  layout: z.enum(['three-panel', 'two-column']),
  moduleDisplay: z.enum(['tabs', 'dropdown']),
  moduleOrder: z.array(z.enum(DETAIL_MODULES)),
  hiddenModules: z.array(z.enum(DETAIL_MODULES)),
  cardFields: z.array(z.enum(CARD_FIELDS)),
  hideEmptyFields: z.boolean(),
})
export type DetailViewPreferences = z.infer<typeof preferencesSchema>
export type DetailLayout = DetailViewPreferences['layout']
export type ModuleDisplay = DetailViewPreferences['moduleDisplay']

export const DEFAULT_DETAIL_VIEW: DetailViewPreferences = {
  layout: 'three-panel',
  moduleDisplay: 'tabs',
  moduleOrder: [...DETAIL_MODULES],
  hiddenModules: [],
  cardFields: ['email', 'phone'],
  hideEmptyFields: false,
}

/**
 * Activity is the contact's history: it is always shown and always first, which in the
 * three-panel layout means the middle panel. Same rule as the locked "Contact name" column.
 */
const LOCKED_MODULE: DetailModule = 'activity'

/** Saved order with the locked panel first and any panel added in a later version at the end. */
export function moduleOrderOf(preferences: DetailViewPreferences): DetailModule[] {
  const rest = [
    ...preferences.moduleOrder,
    ...DETAIL_MODULES.filter((module) => !preferences.moduleOrder.includes(module)),
  ].filter((module) => module !== LOCKED_MODULE)
  return [LOCKED_MODULE, ...rest]
}

export function visibleModulesOf(preferences: DetailViewPreferences): DetailModule[] {
  return moduleOrderOf(preferences).filter(
    (module) => module === LOCKED_MODULE || !preferences.hiddenModules.includes(module),
  )
}

export function moduleItemsOf(
  preferences: DetailViewPreferences,
): SortableListItem<DetailModule>[] {
  const visible = visibleModulesOf(preferences)
  return moduleOrderOf(preferences).map((id) => ({
    id,
    label: MODULE_LABELS[id],
    visible: visible.includes(id),
    locked: id === LOCKED_MODULE,
  }))
}

export const sameView = (a: DetailViewPreferences, b: DetailViewPreferences) =>
  JSON.stringify(a) === JSON.stringify(b)

/**
 * Layout of the contact page, saved per teammate and synced across devices. Named views
 * shared by role would need real accounts, so there is one view per person.
 */
export function useDetailViewPreferences() {
  const [preferences, setPreferences] = usePreference(
    'contacts.detailView',
    preferencesSchema,
    DEFAULT_DETAIL_VIEW,
  )

  return {
    preferences,
    visibleModules: visibleModulesOf(preferences),
    save: setPreferences,
    setHideEmptyFields: (hideEmptyFields: boolean) =>
      setPreferences((current) => ({ ...current, hideEmptyFields })),
  }
}

export type DetailView = ReturnType<typeof useDetailViewPreferences>

const panelSchema = z.enum(DETAIL_MODULES)

/** The tab last opened in the two-column layout, so the page reopens where you left it. */
export function useActivePanel() {
  return usePreference('contacts.detailPanel', panelSchema, LOCKED_MODULE)
}
