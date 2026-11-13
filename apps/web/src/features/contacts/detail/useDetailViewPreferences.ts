import { z } from 'zod'
import type { SortableListItem } from '../../../components/ui/SortableList'
import { usePreference } from '../../preferences/usePreference'

const DETAIL_MODULES = ['activity', 'tags', 'record'] as const
export type DetailModule = (typeof DETAIL_MODULES)[number]

export const MODULE_LABELS: Record<DetailModule, string> = {
  activity: 'Activity',
  tags: 'Tags',
  record: 'Record info',
}

export const CARD_FIELDS = ['email', 'phone', 'company', 'tags'] as const
export type CardField = (typeof CARD_FIELDS)[number]

export const CARD_FIELD_LABELS: Record<CardField, string> = {
  email: 'Email',
  phone: 'Phone',
  company: 'Company',
  tags: 'Tags',
}

const preferencesSchema = z.object({
  layout: z.enum(['three-panel', 'two-column']),
  moduleDisplay: z.enum(['tabs', 'dropdown']),
  moduleOrder: z.array(z.enum(DETAIL_MODULES)),
  hiddenModules: z.array(z.enum(DETAIL_MODULES)),
  cardFields: z.array(z.enum(CARD_FIELDS)),
  hideEmptyFields: z.boolean(),
})
type DetailViewPreferences = z.infer<typeof preferencesSchema>
export type DetailLayout = DetailViewPreferences['layout']
export type ModuleDisplay = DetailViewPreferences['moduleDisplay']

const DEFAULT_PREFERENCES: DetailViewPreferences = {
  layout: 'three-panel',
  moduleDisplay: 'tabs',
  moduleOrder: [...DETAIL_MODULES],
  hiddenModules: [],
  cardFields: ['email', 'phone'],
  hideEmptyFields: false,
}

/** Activity is the contact's history, so it can be moved but never hidden. */
const LOCKED_MODULE: DetailModule = 'activity'

/**
 * Layout of the contact page, saved per teammate and synced across devices. Named views
 * shared by role would need real accounts, so there is one view per person.
 */
export function useDetailViewPreferences() {
  const [preferences, setPreferences] = usePreference(
    'contacts.detailView',
    preferencesSchema,
    DEFAULT_PREFERENCES,
  )
  const update = (change: (current: DetailViewPreferences) => Partial<DetailViewPreferences>) =>
    setPreferences((current) => ({ ...current, ...change(current) }))

  const moduleOrder = [
    ...preferences.moduleOrder,
    ...DETAIL_MODULES.filter((module) => !preferences.moduleOrder.includes(module)),
  ]
  const visibleModules = moduleOrder.filter(
    (module) => module === LOCKED_MODULE || !preferences.hiddenModules.includes(module),
  )

  const moduleItems: SortableListItem<DetailModule>[] = moduleOrder.map((id) => ({
    id,
    label: MODULE_LABELS[id],
    visible: visibleModules.includes(id),
    locked: id === LOCKED_MODULE,
  }))

  return {
    preferences,
    visibleModules,
    moduleItems,
    setLayout: (layout: DetailLayout) => update(() => ({ layout })),
    setModuleDisplay: (moduleDisplay: ModuleDisplay) => update(() => ({ moduleDisplay })),
    reorderModules: (moduleOrder: DetailModule[]) => update(() => ({ moduleOrder })),
    setModuleVisible: (module: DetailModule, visible: boolean) =>
      update(({ hiddenModules }) => ({
        hiddenModules: visible
          ? hiddenModules.filter((hidden) => hidden !== module)
          : [...hiddenModules, module],
      })),
    setCardField: (field: CardField, shown: boolean) =>
      update(({ cardFields }) => ({
        cardFields: shown
          ? CARD_FIELDS.filter((item) => item === field || cardFields.includes(item))
          : cardFields.filter((item) => item !== field),
      })),
    setHideEmptyFields: (hideEmptyFields: boolean) => update(() => ({ hideEmptyFields })),
    reset: () => setPreferences(DEFAULT_PREFERENCES),
  }
}

export type DetailView = ReturnType<typeof useDetailViewPreferences>
