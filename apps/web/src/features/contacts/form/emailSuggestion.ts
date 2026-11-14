/** Domains people mistype most; a near miss of one of these is almost always a typo. */
const COMMON_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.co.uk',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'aol.com',
  'protonmail.com',
  'rediffmail.com',
  // Real domains that sit one letter away from the ones above.
  'mail.com',
  'ymail.com',
  'me.com',
  'msn.com',
]

/** Edit distance, capped: only distances of 0–2 matter here. */
function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      )
    }
    previous = current
  }
  return previous[b.length] ?? 3
}

/**
 * "ada@gmial.com" → "ada@gmail.com". Returns null when the domain is already a known one,
 * or isn't close to any.
 */
export function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at < 1) return null
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase()
  if (domain.length < 4 || COMMON_DOMAINS.includes(domain)) return null
  const match = COMMON_DOMAINS.find((known) => distance(domain, known) <= 2)
  return match ? `${email.slice(0, at)}@${match}` : null
}
