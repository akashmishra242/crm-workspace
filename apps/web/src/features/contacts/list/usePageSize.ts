import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '@crm/shared'
import { z } from 'zod'
import { usePreference } from '../../preferences/usePreference'

const pageSizeSchema = z.literal(PAGE_SIZES)

/** Remembered, and synced across devices, rather than resetting on every visit. */
export function usePageSize() {
  return usePreference('contacts.pageSize', pageSizeSchema, DEFAULT_PAGE_SIZE)
}
