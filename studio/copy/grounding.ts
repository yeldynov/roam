// Code half of the invention check: flags numbers, features, and names in a stay's copy that its
// typed fields don't back. The Agent Actions Prompt judge in write-copy.ts covers what words can't.

export type Facts = {
  title: string
  propertyType: string
  setting: string
  location: {city: string; region: string; country: string}
  maxGuests: number
  bedrooms: number
  beds: number
  bathrooms: number
  amenities: string[]
  petsAllowed: boolean
  tags?: string[]
  houseRules?: string[]
  checkInTime: string
  checkOutTime: string
}

/** The GROQ projection that produces Facts; the only fields copy may use */
export const FACTS_PROJECTION = `{title, propertyType, setting, location{city, region, country}, maxGuests, bedrooms, beds, bathrooms, amenities, petsAllowed, tags, houseRules, checkInTime, checkOutTime}`

// "one" is left out: "no one", "one of the" are too common to flag
const NUMBER_WORDS = ['zero', '', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']

// A feature term passes when its predicate holds or the facts' own text contains the matched words
const FEATURES: [RegExp, (f: Facts) => boolean][] = [
  [/\bhot ?tubs?\b|\bjacuzzi\b|\bspa\b/g, (f) => f.amenities.includes('hotTub')],
  [/\bpools?\b/g, (f) => f.amenities.includes('pool')],
  [/\bfireplaces?\b|\bwood ?stoves?\b/g, (f) => f.amenities.includes('fireplace')],
  [/\bfire ?pits?\b/g, () => false],
  [/\bwifi\b|\binternet\b/g, (f) => f.amenities.includes('wifi')],
  [/\bworkspaces?\b|\bdesks?\b|\bwork from\b/g, (f) => f.amenities.includes('workspace')],
  [/\bparking\b|\bgarage\b|\bdriveway\b/g, (f) => f.amenities.includes('parking')],
  [/\bkitchens?\b/g, (f) => f.amenities.includes('kitchen')],
  [/\bwashers?\b|\blaundry\b/g, (f) => f.amenities.includes('washer')],
  [/\bgrills?\b|\bbbq\b|\bbarbecue\b/g, (f) => f.amenities.includes('bbqGrill')],
  [/\bev\b|\bchargers?\b|\bcharging\b/g, (f) => f.amenities.includes('evCharger')],
  [/\bair[- ]condition\w*/g, (f) => f.amenities.includes('airConditioning')],
  [/\b(?:ocean|sea)(?:-| )?views?\b/g, (f) => f.amenities.includes('oceanView')],
  [/\bbeach\w*|\bocean\b|\bsea\b|\bsand\w*|\bwaves?\b|\bsurf\b|\bcoast\w*/g, (f) => f.setting === 'beach' || f.amenities.includes('oceanView')],
  [/\blake\w*/g, (f) => f.setting === 'lake'],
  [/\bmountains?\b|\bpeaks?\b|\bslopes?\b|\bski\w*/g, (f) => f.setting === 'mountains'],
  [/\bforest\w*|\bwoods\b|\bwooded\b|\bpines?\b/g, (f) => f.setting === 'forest'],
  [/\bdesert\b/g, (f) => f.setting === 'desert'],
  [/\bdogs?\b|\bpets?\b|\bcats?\b|\bpup\w*|\bfurry\b/g, (f) => f.petsAllowed],
  [/\bviews?\b|\bvistas?\b|\boverlook\w*/g, (f) => f.amenities.includes('oceanView')],
  [/\bbalcon\w*|\bterrace\w*|\bdecks?\b|\bporch\w*|\bpatio\w*|\bgardens?\b|\byards?\b|\blawn\b/g, () => false],
  [/\bbunk\w*|\bloft bed\b|\bsofa bed\b/g, () => false],
  [/\bboats?\b|\bkayaks?\b|\bcanoes?\b|\bpaddle\w*|\bbikes?\b|\btrails?\b|\bhik\w*/g, () => false],
  [/\bminutes?\b|\bmiles?\b|\bwalk(?:ing)? distance\b|\bsteps from\b|\bnearby\b/g, () => false],
]

const MONTHS_AND_DAYS = /\b(?:january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/

const FACT_KEYS = FACTS_PROJECTION.slice(1, -1).replace(/\{[^}]*\}/g, '').split(',').map((k) => k.trim())

function factText(f: Facts) {
  // Only the fact fields: a caller passing a whole document must not let its copy vouch for itself
  const only = Object.fromEntries(FACT_KEYS.map((k) => [k, f[k as keyof Facts]]))
  // camelCase amenity values read as words: hotTub -> "hot tub"
  const amenities = f.amenities.map((a) => a.replace(/([A-Z])/g, ' $1'))
  return normalize([JSON.stringify(only), ...amenities].join(' '))
}

const normalize = (s: string) => s.toLowerCase().replace(/wi-?fi/g, 'wifi')

function allowedNumbers(f: Facts, text: string) {
  const nums = new Set(text.match(/\d+(?:\.\d+)?/g) ?? [])
  for (const t of [f.checkInTime, f.checkOutTime]) {
    const hour = Number(t.split(':')[0])
    nums.add(String(hour % 12 || 12)) // "3 pm" for 15:00
  }
  return nums
}

/** Claims in `copy` the facts don't back. Empty means the code check passes. */
export function findUnsupported(copy: string, facts: Facts): string[] {
  // ponytail: word lists, not understanding; the Prompt judge catches paraphrases these miss
  const text = factText(facts)
  const lower = normalize(copy)
  const issues: string[] = []

  const nums = allowedNumbers(facts, text)
  for (const n of copy.match(/\d+(?:\.\d+)?/g) ?? []) {
    if (!nums.has(n)) issues.push(`number "${n}" isn't in the facts`)
  }
  NUMBER_WORDS.forEach((word, n) => {
    if (word && new RegExp(`\\b${word}\\b`).test(lower) && !nums.has(String(n))) {
      issues.push(`number "${word}" isn't in the facts`)
    }
  })

  for (const [pattern, backed] of FEATURES) {
    for (const match of new Set(lower.match(pattern) ?? [])) {
      if (!backed(facts) && !text.includes(match)) issues.push(`"${match}" isn't backed by the facts`)
    }
  }

  const when = lower.match(MONTHS_AND_DAYS)
  if (when && !text.includes(when[0])) issues.push(`"${when[0]}" isn't in the facts`)

  // Capitalized words that don't start a sentence are names: they must come from the facts
  for (const m of copy.matchAll(/(?<![.!?]\s|^|\n)\b([A-Z][\w'’-]*)/g)) {
    const word = normalize(m[1])
    if (!text.includes(word)) issues.push(`name "${m[1]}" isn't in the facts`)
  }

  return [...new Set(issues)]
}
