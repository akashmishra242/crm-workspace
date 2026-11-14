import {
  CONDITION_FIELDS,
  OPERATORS_BY_FIELD,
  operatorNeedsValue,
  type ConditionField,
  type ConditionOperator,
  type FieldCondition,
  type TagMatchMode,
} from '@crm/shared'
import { useQuery } from '@tanstack/react-query'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { DateRangePicker } from '../../../components/ui/DateRangePicker'
import { Drawer } from '../../../components/ui/Drawer'
import { ModalBody, ModalFooter } from '../../../components/ui/Modal'
import { MultiSelect } from '../../../components/ui/MultiSelect'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { Select } from '../../../components/ui/Select'
import { inputClasses } from '../../../components/ui/TextField'
import { t } from '../../../i18n'
import { cn } from '../../../lib/cn'
import { tagListQuery } from '../../tags/api/tagQueries'
import { TAG_DOT_CLASSES } from '../../tags/components/TagChip'
import type { ContactFilterValues } from '../api/contactsApi'
import { CONDITION_FIELD_LABELS, OPERATOR_LABELS, VALUE_PLACEHOLDERS } from './conditionLabels'
import {
  DATE_PRESETS,
  describeDateRange,
  matchPreset,
  presetRange,
  type DatePresetId,
} from './createdDateRange'
import { countActiveFilters } from './useContactListParams'

type FilterDraft = Omit<ContactFilterValues, 'q'>

/** "Any" means no condition on that field. */
type OperatorChoice = ConditionOperator | 'any'

type AdvancedFiltersDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: ContactFilterValues
  onApply: (filters: FilterDraft) => void
  onClear: () => void
}

export default function AdvancedFiltersDrawer({
  open,
  onOpenChange,
  filters,
  onApply,
  onClear,
}: AdvancedFiltersDrawerProps) {
  const close = () => onOpenChange(false)
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={t.contacts.filters.title}
      description={t.contacts.filters.description}
    >
      <FiltersForm
        applied={filters}
        onApply={(draft) => {
          onApply(draft)
          close()
        }}
        onClear={() => {
          onClear()
          close()
        }}
        onCancel={close}
      />
    </Drawer>
  )
}

/** Comparable form of a filter set: trimmed values and order-independent tags. */
function normalize(filters: FilterDraft): FilterDraft {
  const conditions = Object.fromEntries(
    CONDITION_FIELDS.map((field) => {
      const condition = filters[field]
      return [field, condition ? { ...condition, value: condition.value.trim() } : null]
    }),
  ) as Record<ConditionField, FieldCondition | null>
  return {
    ...filters,
    ...conditions,
    tagIds: [...filters.tagIds].sort(),
    tagMatch: filters.tagIds.length > 1 ? filters.tagMatch : 'any',
  }
}

/** Why a condition can't be applied yet, or null when it's fine. */
function conditionError(field: ConditionField, condition: FieldCondition | null): string | null {
  if (!condition || !operatorNeedsValue(condition.operator)) return null
  const value = condition.value.trim()
  if (value === '') return t.contacts.filters.enterValue
  if (field === 'phone' && !/\d/.test(value)) return t.contacts.filters.enterDigit
  return null
}

type FiltersFormProps = {
  /** Read once: the drawer content mounts on open, so every opening starts from the URL. */
  applied: FilterDraft
  onApply: (draft: FilterDraft) => void
  onClear: () => void
  onCancel: () => void
}

function FiltersForm({ applied, onApply, onClear, onCancel }: FiltersFormProps) {
  const [draft, setDraft] = useState<FilterDraft>(applied)
  const [datePreset, setDatePreset] = useState<DatePresetId>(() => matchPreset(applied))
  const tags = useQuery(tagListQuery())

  const update = (patch: Partial<FilterDraft>) => setDraft((current) => ({ ...current, ...patch }))

  function choosePreset(presetId: DatePresetId) {
    setDatePreset(presetId)
    if (presetId !== 'custom') update(presetRange(presetId))
  }

  const dateRangeInvalid =
    draft.createdFrom !== null && draft.createdTo !== null && draft.createdFrom > draft.createdTo
  const conditionErrors = CONDITION_FIELDS.filter((field) => conditionError(field, draft[field]))
  const hasChanges = JSON.stringify(normalize(draft)) !== JSON.stringify(normalize(applied))
  const nothingToClear = countActiveFilters(applied) === 0 && countActiveFilters(draft) === 0
  const canApply = hasChanges && !dateRangeInvalid && conditionErrors.length === 0

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (canApply) onApply(normalize(draft))
  }

  const tagOptions = (tags.data ?? []).map((tag) => ({
    value: tag.id,
    label: tag.name,
    icon: <span aria-hidden className={cn('size-2 rounded-full', TAG_DOT_CLASSES[tag.color])} />,
  }))

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <ModalBody>
        <div className="space-y-6">
          <FilterSection title={t.contacts.filters.tags}>
            <MultiSelect
              label={t.contacts.filters.tags}
              placeholder={t.contacts.filters.anyTag}
              searchPlaceholder={t.contacts.filters.searchTags}
              emptyMessage={t.contacts.filters.noTagsMatch}
              options={tagOptions}
              value={draft.tagIds}
              onChange={(tagIds) => update({ tagIds })}
              status={tags.isPending ? 'loading' : tags.isError ? 'error' : undefined}
            />
            {draft.tagIds.length > 1 && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-gray-600">{t.contacts.filters.contactMustHave}</span>
                <SegmentedControl<TagMatchMode>
                  label={t.contacts.filters.tagMatch}
                  value={draft.tagMatch}
                  onChange={(tagMatch) => update({ tagMatch })}
                  options={[
                    { value: 'any', label: t.contacts.filters.anyOfThese },
                    { value: 'all', label: t.contacts.filters.allOfThese },
                  ]}
                />
              </div>
            )}
          </FilterSection>

          <FilterSection title={t.contacts.filters.created}>
            <Select<DatePresetId>
              label={t.contacts.filters.created}
              value={datePreset}
              onChange={choosePreset}
              options={[
                ...DATE_PRESETS.map((preset) => ({ value: preset.id, label: preset.label })),
                { value: 'custom', label: t.contacts.filters.customRange },
              ]}
            />
            {datePreset === 'custom' && (
              <div className="mt-3">
                <DateRangePicker
                  label={t.contacts.filters.customRangeLabel}
                  placeholder={t.contacts.filters.pickStartAndEnd}
                  value={{ from: draft.createdFrom, to: draft.createdTo }}
                  onChange={({ from, to }) => update({ createdFrom: from, createdTo: to })}
                  describe={({ from, to }) =>
                    describeDateRange({ createdFrom: from, createdTo: to })
                  }
                  invalid={dateRangeInvalid}
                />
              </div>
            )}
          </FilterSection>

          <FilterSection title={t.contacts.filters.contactFields}>
            <div className="space-y-3">
              {CONDITION_FIELDS.map((field) => (
                <ConditionRow
                  key={field}
                  field={field}
                  condition={draft[field]}
                  error={conditionError(field, draft[field])}
                  onChange={(condition) => update({ [field]: condition })}
                />
              ))}
            </div>
          </FilterSection>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" className="mr-auto" disabled={nothingToClear} onClick={onClear}>
          {t.common.clearAll}
        </Button>
        <Button onClick={onCancel}>{t.common.cancel}</Button>
        <Button variant="primary" type="submit" disabled={!canApply}>
          {t.contacts.filters.apply}
        </Button>
      </ModalFooter>
    </form>
  )
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

type ConditionRowProps = {
  field: ConditionField
  condition: FieldCondition | null
  error: string | null
  onChange: (condition: FieldCondition | null) => void
}

function ConditionRow({ field, condition, error, onChange }: ConditionRowProps) {
  const label = CONDITION_FIELD_LABELS[field]
  const operator: OperatorChoice = condition?.operator ?? 'any'
  const errorId = `${field}-condition-error`
  const valueRef = useRef<HTMLInputElement>(null)
  // Only complain once something is typed; an empty box just shows the hint.
  const showError = error !== null && condition !== null && condition.value !== ''

  function chooseOperator(next: OperatorChoice) {
    if (next === 'any') return onChange(null)
    // Switching between "contains" and "is" keeps what was typed.
    onChange({ operator: next, value: operatorNeedsValue(next) ? (condition?.value ?? '') : '' })
  }

  return (
    <div>
      <div className="grid grid-cols-[6.5rem_1fr] items-center gap-2">
        <span className="text-sm text-gray-700">{label}</span>
        <Select<OperatorChoice>
          label={t.contacts.filters.conditionLabel(label)}
          value={operator}
          onChange={chooseOperator}
          // After picking "contains", typing should go into the value box, not the menu.
          onCloseAutoFocus={(event) => {
            if (!valueRef.current) return
            event.preventDefault()
            valueRef.current.focus()
          }}
          options={[
            { value: 'any', label: t.contacts.filters.anyValue },
            ...OPERATORS_BY_FIELD[field].map((value) => ({ value, label: OPERATOR_LABELS[value] })),
          ]}
        />
      </div>
      {condition && operatorNeedsValue(condition.operator) && (
        <div className="mt-2 pl-[7rem]">
          <input
            ref={valueRef}
            aria-label={t.contacts.filters.condition(label, OPERATOR_LABELS[condition.operator])}
            aria-invalid={showError || undefined}
            aria-describedby={error ? errorId : undefined}
            className={inputClasses}
            placeholder={VALUE_PLACEHOLDERS[field]}
            maxLength={120}
            value={condition.value}
            onChange={(event) => onChange({ ...condition, value: event.target.value })}
          />
          {error && (
            <p
              id={errorId}
              className={cn('mt-1 text-xs', showError ? 'text-red-600' : 'text-gray-500')}
            >
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
