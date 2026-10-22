// Turns a guest's sentence into exact filters (parsed in code, never guessed) and builds the GROQ for them.
// Pure: no React, no fetch, so `npx tsx src/lib/search.check.ts` runs it under Node.

export type Filters = {
  /** Whole USD per night */
  maxPrice?: number;
  guests?: number;
  bedrooms?: number;
  bathrooms?: number;
  /** `propertyType` values */
  types: string[];
  /** `setting` values */
  settings: string[];
  /** camelCase `amenities` values; a stay needs all of them */
  amenities: string[];
  pets: boolean;
  freeCancellation: boolean;
  /** A city, region or country exactly as stored on stays */
  place?: string;
  /** Leftover words that only rank (embeddings), never filter */
  soft: string[];
};

export type Sort = "best" | "priceAsc" | "priceDesc" | "rating";

export const SORTS: { key: Sort; label: string }[] = [
  { key: "best", label: "Best match" },
  { key: "priceAsc", label: "Price: low to high" },
  { key: "priceDesc", label: "Price: high to low" },
  { key: "rating", label: "Top rated" },
];

/** Loaded once from Sanity: what `place` can match, and which cancellation policies are free */
export type SearchMeta = { places: string[]; freeCancellationIds: string[] };

export const SEARCH_META_QUERY = `{
  "places": array::unique(*[_type == "property"].location.city) + array::unique(*[_type == "property"].location.region) + array::unique(*[_type == "property"].location.country),
  "freeCancellationIds": *[_type == "policy" && kind == "cancellation" && freeCancellationHours > 0]._id
}`;

/** What a search result card needs */
export type SearchStay = {
  id: string;
  title: string;
  /** "City, Region" */
  location: string;
  rating: number;
  reviewCount: number;
  nightlyPrice: number;
  amenities: string[];
  petsAllowed: boolean;
  /** Cover photo, Sanity CDN URL */
  image: string;
};

const PROJECTION = `{
  "id": _id,
  title,
  "location": location.city + ", " + location.region,
  rating,
  "reviewCount": coalesce(reviewCount, 0),
  nightlyPrice,
  "amenities": coalesce(amenities, []),
  petsAllowed,
  "image": photos[0].asset->url
}`;

export const PROPERTY_TYPES = ["cabin", "cottage", "house", "apartment", "loft", "villa", "bungalow"];
export const SETTINGS = ["mountains", "forest", "lake", "beach", "desert", "city", "countryside"];
export const AMENITIES = ["hotTub", "pool", "fireplace", "wifi", "kitchen", "workspace", "parking", "washer", "airConditioning", "bbqGrill", "evCharger", "oceanView"];

export const emptyFilters = (): Filters => ({ types: [], settings: [], amenities: [], pets: false, freeCancellation: false, soft: [] });

/** Clears every filter but the place and the soft words, which only the sentence sets */
export const clearFilters = (f: Filters): Filters => ({ ...emptyFilters(), place: f.place, soft: f.soft });

/** Names of the active filters, for analytics and the sheet's dot. Never their values */
export function filterKinds(f: Filters): string[] {
  const kinds: string[] = [];
  for (const k of ["maxPrice", "guests", "bedrooms", "bathrooms", "place"] as const) if (f[k] !== undefined) kinds.push(k);
  for (const k of ["types", "settings", "amenities"] as const) if (f[k].length) kinds.push(k);
  if (f.pets) kinds.push("pets");
  if (f.freeCancellation) kinds.push("freeCancellation");
  return kinds;
}

const WORD_NUMBERS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const NUM = `(\\d+|${WORD_NUMBERS.join("|")})`;
const toNumber = (s: string) => (/^\d+$/.test(s) ? Number(s) : WORD_NUMBERS.indexOf(s.toLowerCase()) + 1);

const PRICE = /(?:\b(?:under|below|less than|max(?:imum)?|up to|at most)\s*)?\$\s?(\d+)(?:\s*(?:a|per|\/)\s*night)?|\b(?:under|below|less than|max(?:imum)?|up to|at most)\s+(\d+)(?:\s*(?:dollars|usd))?(?:\s*(?:a|per|\/)\s*night)?|\b(\d+)\s*(?:dollars\s*|usd\s*)?(?:a|per|\/)\s*night\b/i;
const GUESTS = new RegExp(`\\b(?:family of|sleeps|group of)\\s+${NUM}\\b|\\b${NUM}\\s+(?:guests?|people|persons|adults|of us)\\b`, "i");
const BEDROOMS = new RegExp(`\\b${NUM}[\\s-]?(?:bedrooms?|br|bdr)\\b`, "i");
const BATHROOMS = new RegExp(`\\b${NUM}[\\s-]?(?:bathrooms?|baths?)\\b`, "i");
const FREE_CANCELLATION = /\b(?:free|flexible) cancell?ation\b|\b(?:fully )?refundable\b|\bcancel for free\b/i;
const PETS = /\b(?:pet|dog)[\s-]?friendly\b|\bpets?(?: (?:allowed|welcome|ok))?\b|\bdogs?\b|\bcats?\b|\bpupp(?:y|ies)\b/gi;

const AMENITY_PHRASES: [RegExp, string][] = [
  [/\bhot ?tubs?\b|\bjacuzzis?\b/gi, "hotTub"],
  [/\b(?:ocean|sea)[\s-]?views?\b/gi, "oceanView"],
  [/\bev charg(?:er|ers|ing)\b|\belectric car charg\w*/gi, "evCharger"],
  [/\b(?:swimming )?pools?\b/gi, "pool"],
  [/\bfireplaces?\b/gi, "fireplace"],
  [/\bwi-?fi\b|\binternet\b/gi, "wifi"],
  [/\bkitchens?\b/gi, "kitchen"],
  [/\bworkspaces?\b|\bdesks?\b/gi, "workspace"],
  [/\bparking\b/gi, "parking"],
  [/\bwashers?\b|\blaundry\b|\bwashing machine\b/gi, "washer"],
  [/\bair[\s-]?con(?:ditioning|ditioned)?\b|\ba\/c\b/gi, "airConditioning"],
  [/\bbbq\b|\bbarbecue\b|\bgrills?\b/gi, "bbqGrill"],
];

const TYPE_PHRASES: [RegExp, string][] = [
  [/\bcabins?\b/gi, "cabin"],
  [/\bcottages?\b/gi, "cottage"],
  [/\bhouses?\b/gi, "house"],
  [/\bapartments?\b|\bapts?\b|\bflats?\b/gi, "apartment"],
  [/\blofts?\b/gi, "loft"],
  [/\bvillas?\b/gi, "villa"],
  [/\bbungalows?\b/gi, "bungalow"],
];

const SETTING_PHRASES: [RegExp, string][] = [
  [/\bbeach(?:es|front)?\b|\bcoast(?:al)?\b|\bseaside\b|\boceanfront\b/gi, "beach"],
  [/\bmountains?\b|\balpine\b/gi, "mountains"],
  [/\bforests?\b|\bwoods\b|\bwoodland\b/gi, "forest"],
  [/\blakes?\b|\blake(?:front|side)\b/gi, "lake"],
  [/\bdeserts?\b/gi, "desert"],
  [/\bcity\b|\bcities\b|\burban\b|\bdowntown\b/gi, "city"],
  [/\bcountryside\b|\brural\b/gi, "countryside"],
];

const US_STATES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT",
  delaware: "DE", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI",
  minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC",
  "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};

const STOP = new Set(
  ("a an and the with without for to in on of at by near around close from night nights per stay stays place places " +
    "somewhere spot some i we me my us our want need looking look find show get any that has have is are it this please " +
    "friendly allowed welcome ok under below max than less up most dollars usd")
    .split(" "),
);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Parses a guest's sentence. `places` are the stays' own cities, regions and countries. */
export function parseQuery(text: string, places: string[]): Filters {
  const f = emptyFilters();
  let rest = ` ${text} `;
  const take = (re: RegExp) => {
    const m = rest.match(re);
    if (m) rest = rest.replace(m[0], " ");
    return m;
  };
  const takeAll = (re: RegExp) => {
    const hit = re.test(rest);
    rest = rest.replace(re, " ");
    re.lastIndex = 0;
    return hit;
  };

  const price = take(PRICE);
  if (price) f.maxPrice = Number(price[1] ?? price[2] ?? price[3]);
  const guests = take(GUESTS);
  if (guests) f.guests = toNumber(guests[1] ?? guests[2]);
  const bedrooms = take(BEDROOMS);
  if (bedrooms) f.bedrooms = toNumber(bedrooms[1]);
  const bathrooms = take(BATHROOMS);
  if (bathrooms) f.bathrooms = toNumber(bathrooms[1]);
  f.freeCancellation = !!take(FREE_CANCELLATION);
  for (const [re, value] of AMENITY_PHRASES) if (takeAll(re)) f.amenities.push(value);
  f.pets = takeAll(PETS);

  // Place before settings, so "Lake Placid" and "Miami Beach" stay places. Longest name wins.
  // Short codes (CA, OR, HI) only match in capitals: "or" and "hi" are words.
  const candidates = [...places.map((p) => [p, p]), ...Object.entries(US_STATES)]
    .filter(([, value]) => places.includes(value))
    .sort((a, b) => b[0].length - a[0].length);
  for (const [name, value] of candidates) {
    const re = new RegExp(`(?<![\\w-])${escape(name)}(?![\\w-])`, name.length <= 3 && name === name.toUpperCase() ? "" : "i");
    if (re.test(rest)) {
      f.place = value;
      rest = rest.replace(re, " ");
      break;
    }
  }

  for (const [re, value] of TYPE_PHRASES) if (takeAll(re)) f.types.push(value);
  for (const [re, value] of SETTING_PHRASES) if (takeAll(re)) f.settings.push(value);

  f.soft = [...new Set(rest.toLowerCase().match(/[a-z][a-z'-]*[a-z]/g) ?? [])].filter((w) => !STOP.has(w));
  return f;
}

/** GROQ for the filters: fixed clauses for the active filters, every value a param */
export function buildSearchQuery(f: Filters, sort: Sort, meta: SearchMeta): { query: string; params: Record<string, unknown> } {
  const clauses = ['_type == "property"', "defined(photos[0].asset)"];
  const params: Record<string, unknown> = {};
  const add = (clause: string, key: string, value: unknown) => {
    clauses.push(clause);
    params[key] = value;
  };
  if (f.maxPrice !== undefined) add("nightlyPrice <= $maxPrice", "maxPrice", f.maxPrice);
  if (f.guests !== undefined) add("maxGuests >= $guests", "guests", f.guests);
  if (f.bedrooms !== undefined) add("bedrooms >= $bedrooms", "bedrooms", f.bedrooms);
  if (f.bathrooms !== undefined) add("bathrooms >= $bathrooms", "bathrooms", f.bathrooms);
  if (f.types.length) add("propertyType in $types", "types", f.types);
  if (f.settings.length) add("setting in $settings", "settings", f.settings);
  if (f.amenities.length) add("count(amenities[@ in $amenities]) == count($amenities)", "amenities", f.amenities);
  if (f.pets) clauses.push("petsAllowed == true");
  if (f.freeCancellation) add("cancellationPolicy._ref in $freeIds", "freeIds", meta.freeCancellationIds);
  if (f.place !== undefined) add("(location.city == $place || location.region == $place || location.country == $place)", "place", f.place);

  const ranked = sort === "best" && f.soft.length > 0;
  if (ranked) {
    params.soft = f.soft.join(" ");
    params.softWords = f.soft;
  }
  const order = {
    best: ranked ? "_score desc, rating desc" : "rating desc, title asc",
    priceAsc: "nightlyPrice asc, rating desc",
    priceDesc: "nightlyPrice desc, rating desc",
    rating: "rating desc, reviewCount desc",
  }[sort];
  // Tags naming the soft words lift the stay: embeddings alone ranked a Nashville loft second for "quiet".
  // `match` with several words needs all of them in the tags
  const score = ranked ? " | score(text::semanticSimilarity($soft), boost(tags match $softWords, 1))" : "";
  return { query: `*[${clauses.join(" && ")}]${score} | order(${order})${PROJECTION}`, params };
}
