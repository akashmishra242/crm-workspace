import type { ConditionField, ConditionOperator, FieldCondition } from '@crm/shared'
import { operatorNeedsValue } from '@crm/shared'

export const CONDITION_FIELD_LABELS: Record<ConditionField, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone',
  company: 'Company',
}

/** Read after the field name: "Email does not contain …". */
export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  exists: 'exists',
  notExists: 'does not exist',
  is: 'is',
  isNot: 'is not',
  contains: 'contains',
  notContains: 'does not contain',
}

export const VALUE_PLACEHOLDERS: Record<ConditionField, string> = {
  firstName: 'e.g. Ada',
  lastName: 'e.g. Lovelace',
  email: 'e.g. acme.com',
  phone: 'e.g. 415 555',
  company: 'e.g. Acme',
}

export function describeCondition(field: ConditionField, condition: FieldCondition): string {
  const base = `${CONDITION_FIELD_LABELS[field]} ${OPERATOR_LABELS[condition.operator]}`
  return operatorNeedsValue(condition.operator) ? `${base} “${condition.value}”` : base
}
