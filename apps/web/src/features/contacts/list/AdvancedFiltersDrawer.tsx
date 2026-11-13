import type { TagMatchMode } from '@crm/shared'
import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { Checkbox } from '../../../components/ui/Checkbox'
import { Drawer } from '../../../components/ui/Drawer'
import { ModalBody, ModalFooter } from '../../../components/ui/Modal'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { inputClasses, TextField } from '../../../components/ui/TextField'
import { cn } from '../../../lib/cn'
import { tagListQuery } from '../../tags/api/tagQueries'
import { TAG_DOT_CLASSES } from '../../tags/components/TagChip'
import type { ContactFilterValues } from '../api/contactsApi'
import { DATE_PRESETS, matchPreset, presetRange, type DatePresetId } from './createdDateRange'
import { countActiveFilters } from './useContactListParams'

type FilterDraft = Omit<ContactFilterValues, 'q'>

type PresenceOption = 'any' | 'yes' | 'no'

const PRESENCE_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'yes', label: 'Present' },
  { value: 'no', label: 'Missing' },
] as const

const toPresence = (value: boolean | null): PresenceOption =>
  value === null ? 'any' : value ? 'yes' : 'no'
const fromPresence = (option: PresenceOption): boolean | null =>
  option === 'any' ? null : option === 'yes'

type AdvancedFiltersDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: ContactFilterValues
  onApply: (filters: FilterDraft) => void
  onClear: () => void
}

export function AdvancedFiltersDrawer({
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
      title="Advanced filters"
      description="Narrow the list down. Filters combine with your search."
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

/** Comparable form of a filter set: trimmed text and order-independent tags. */
const normalize = (filters: FilterDraft): FilterDraft => ({
  ...filters,
  company: filters.company.trim(),
  tagIds: [...filters.tagIds].sort(),
  tagMatch: filters.tagIds.length > 1 ? filters.tagMatch : 'any',
})

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

  function toggleTag(tagId: string, selected: boolean) {
    update({
      tagIds: selected
        ? [...draft.tagIds, tagId]
        : draft.tagIds.filter((existing) => existing !== tagId),
    })
  }

  function choosePreset(presetId: DatePresetId) {
    setDatePreset(presetId)
    if (presetId !== 'custom') update(presetRange(presetId))
  }

  const dateRangeInvalid =
    draft.createdFrom !== null && draft.createdTo !== null && draft.createdFrom > draft.createdTo
  const hasChanges = JSON.stringify(normalize(draft)) !== JSON.stringify(normalize(applied))
  const nothingToClear = countActiveFilters(applied) === 0 && countActiveFilters(draft) === 0

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (dateRangeInvalid || !hasChanges) return
    onApply(normalize(draft))
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <ModalBody>
        <div className="space-y-6">
          <FilterSection title="Tags">
            {tags.isPending && <p className="text-gray-500">Loading tags…</p>}
            {tags.isError && <p className="text-red-600">Couldn't load tags.</p>}
            <ul className="grid grid-cols-2 gap-1">
              {tags.data?.map((tag) => (
                <li key={tag.id}>
                  <label className="flex h-8 items-center gap-2 rounded px-1.5 hover:bg-gray-50">
                    <Checkbox
                      checked={draft.tagIds.includes(tag.id)}
                      onCheckedChange={(checked) => toggleTag(tag.id, checked === true)}
                    />
                    <span
                      aria-hidden
                      className={cn('size-2 rounded-full', TAG_DOT_CLASSES[tag.color])}
                    />
                    <span className="truncate text-gray-700">{tag.name}</span>
                  </label>
                </li>
              ))}
            </ul>
            {draft.tagIds.length > 1 && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-gray-600">Contact must have</span>
                <SegmentedControl<TagMatchMode>
                  label="Tag match"
                  value={draft.tagMatch}
                  onChange={(tagMatch) => update({ tagMatch })}
                  options={[
                    { value: 'any', label: 'Any of these' },
                    { value: 'all', label: 'All of these' },
                  ]}
                />
              </div>
            )}
          </FilterSection>

          <FilterSection title="Company">
            <TextField
              label="Company name starts with"
              hideLabel
              placeholder="Company name starts with…"
              value={draft.company}
              onChange={(event) => update({ company: event.target.value })}
            />
          </FilterSection>

          <FilterSection title="Created">
            <select
              aria-label="Created date range"
              value={datePreset}
              onChange={(event) => choosePreset(event.target.value as DatePresetId)}
              className={inputClasses}
            >
              {DATE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
              <option value="custom">Custom range</option>
            </select>
            {datePreset === 'custom' && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <TextField
                  type="date"
                  label="From"
                  value={draft.createdFrom ?? ''}
                  onChange={(event) => update({ createdFrom: event.target.value || null })}
                />
                <TextField
                  type="date"
                  label="To"
                  value={draft.createdTo ?? ''}
                  onChange={(event) => update({ createdTo: event.target.value || null })}
                  error={dateRangeInvalid ? 'End date is before start date' : undefined}
                />
              </div>
            )}
          </FilterSection>

          <FilterSection title="Contact details">
            <div className="space-y-3">
              <PresenceRow
                label="Email"
                value={toPresence(draft.hasEmail)}
                onChange={(option) => update({ hasEmail: fromPresence(option) })}
              />
              <PresenceRow
                label="Phone"
                value={toPresence(draft.hasPhone)}
                onChange={(option) => update({ hasPhone: fromPresence(option) })}
              />
            </div>
          </FilterSection>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" className="mr-auto" disabled={nothingToClear} onClick={onClear}>
          Clear all
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" disabled={!hasChanges || dateRangeInvalid}>
          Apply filters
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

type PresenceRowProps = {
  label: string
  value: PresenceOption
  onChange: (value: PresenceOption) => void
}

function PresenceRow({ label, value, onChange }: PresenceRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-700">{label}</span>
      <SegmentedControl
        label={label}
        value={value}
        onChange={onChange}
        options={PRESENCE_OPTIONS}
      />
    </div>
  )
}
