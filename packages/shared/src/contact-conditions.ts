import { z } from 'zod'

/** Contact fields that can be filtered with a condition such as "email contains acme". */
export const CONDITION_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'company'] as const
export type ConditionField = (typeof CONDITION_FIELDS)[number]

export const CONDITION_OPERATORS = [
  'exists',
  'notExists',
  'is',
  'isNot',
  'contains',
  'notContains',
] as const
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number]

/** First name is required on every contact, so "exists" would always be true for it. */
export const OPERATORS_BY_FIELD: Record<ConditionField, readonly ConditionOperator[]> = {
  firstName: ['is', 'isNot', 'contains', 'notContains'],
  lastName: CONDITION_OPERATORS,
  email: CONDITION_OPERATORS,
  phone: CONDITION_OPERATORS,
  company: CONDITION_OPERATORS,
}

export type FieldCondition = {
  operator: ConditionOperator
  /** Empty for "exists" and "notExists". */
  value: string
}

export const MAX_CONDITION_VALUE_LENGTH = 120

export const operatorNeedsValue = (operator: ConditionOperator) =>
  operator !== 'exists' && operator !== 'notExists'

const isOperator = (value: string): value is ConditionOperator =>
  (CONDITION_OPERATORS as readonly string[]).includes(value)

/**
 * URL and query-string form of a condition: `exists` or `contains:acme`. Only the first
 * colon separates, so values may contain colons themselves.
 */
export function serializeCondition({ operator, value }: FieldCondition): string {
  return operatorNeedsValue(operator) ? `${operator}:${value}` : operator
}

export function parseCondition(raw: string): FieldCondition | null {
  const separator = raw.indexOf(':')
  const operator = separator === -1 ? raw : raw.slice(0, separator)
  const value = separator === -1 ? '' : raw.slice(separator + 1).trim()
  if (!isOperator(operator)) return null
  if (operatorNeedsValue(operator) !== (value !== '')) return null
  return { operator, value }
}

/** Validates one field's condition from a query string. */
export function conditionSchema(field: ConditionField) {
  return z.string().transform((raw, ctx) => {
    const condition = parseCondition(raw)
    if (!condition || !OPERATORS_BY_FIELD[field].includes(condition.operator)) {
      ctx.addIssue({ code: 'custom', message: 'This filter is not supported' })
      return z.NEVER
    }
    if (condition.value.length > MAX_CONDITION_VALUE_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        message: `Keep filter values under ${MAX_CONDITION_VALUE_LENGTH} characters`,
      })
      return z.NEVER
    }
    if (
      field === 'phone' &&
      operatorNeedsValue(condition.operator) &&
      !/\d/.test(condition.value)
    ) {
      ctx.addIssue({ code: 'custom', message: 'Phone filters need at least one digit' })
      return z.NEVER
    }
    return condition
  })
}
