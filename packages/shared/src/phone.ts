import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min'

export type { CountryCode }

/** Numbers typed without a "+country" prefix are read as US numbers. */
const DEFAULT_PHONE_COUNTRY: CountryCode = 'US'

export function toE164(input: string): string | null {
  const phone = parsePhoneNumberFromString(input, DEFAULT_PHONE_COUNTRY)
  return phone?.isValid() ? phone.number : null
}

export function formatPhone(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164
}

/** Every country libphonenumber knows, for the country picker next to phone inputs. */
export const PHONE_COUNTRIES: readonly CountryCode[] = getCountries()

export const isPhoneCountry = (value: string): value is CountryCode =>
  (PHONE_COUNTRIES as readonly string[]).includes(value)

export const callingCode = (country: CountryCode) => `+${getCountryCallingCode(country)}`

/** Formats the national part while it is typed, e.g. "9876543210" → "98765 43210" for India. */
export const formatNationalAsYouType = (country: CountryCode, input: string) =>
  new AsYouType(country).input(input)

/**
 * Splits a stored or typed number into the country picker's value and the national part.
 * Anything that doesn't parse stays in the national part, under the fallback country.
 */
export function splitPhone(
  value: string,
  fallback: CountryCode,
): { country: CountryCode; national: string } {
  const parsed = value.trim().startsWith('+') ? parsePhoneNumberFromString(value) : undefined
  if (!parsed?.country) return { country: fallback, national: value }
  return {
    country: parsed.country,
    national: formatNationalAsYouType(parsed.country, parsed.nationalNumber),
  }
}

/** "+91 98765 43210": always international, so it parses the same whatever the default. */
export function joinPhone(country: CountryCode, national: string): string {
  const trimmed = national.trim()
  return trimmed === '' ? '' : `${callingCode(country)} ${trimmed}`
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
