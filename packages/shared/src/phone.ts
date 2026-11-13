import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min'

/** Numbers typed without a "+country" prefix are read as US numbers. */
const DEFAULT_PHONE_COUNTRY: CountryCode = 'US'

export function toE164(input: string): string | null {
  const phone = parsePhoneNumberFromString(input, DEFAULT_PHONE_COUNTRY)
  return phone?.isValid() ? phone.number : null
}

export function formatPhone(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164
}

const PHONE_LIKE = /^[\d\s()+.-]+$/

/**
 * Search terms that look like a phone number are reduced to digits so "(415) 555-01"
 * matches the stored "+14155550123". Anything else is matched as lower-cased text.
 */
export function normalizeSearchTerm(raw: string): string {
  const term = raw.trim().toLowerCase()
  if (PHONE_LIKE.test(term) && /\d/.test(term)) {
    return term.replace(/\D/g, '')
  }
  return term
}
