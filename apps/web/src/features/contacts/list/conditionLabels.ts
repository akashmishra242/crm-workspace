import type { ConditionField, ConditionOperator, FieldCondition } from '@crm/shared'
import { operatorNeedsValue } from '@crm/shared'
import { t } from '../../../i18n'

export const CONDITION_FIELD_LABELS: Record<ConditionField, string> = t.contacts.filters.fields

/** Read after the field name: "Email does not contain …". */
export const OPERATOR_LABELS: Record<ConditionOperator, string> = t.contacts.filters.operators

export const VALUE_PLACEHOLDERS: Record<ConditionField, string> =
  t.contacts.filters.valuePlaceholders

export function describeCondition(field: ConditionField, condition: FieldCondition): string {
  const label = CONDITION_FIELD_LABELS[field]
  const operator = OPERATOR_LABELS[condition.operator]
  return operatorNeedsValue(condition.operator)
    ? t.contacts.filters.conditionWithValue(label, operator, condition.value)
    : t.contacts.filters.condition(label, operator)
}
