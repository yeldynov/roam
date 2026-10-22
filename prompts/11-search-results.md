# 11 · Search results from Sanity

Status: done

## Goal

A guest types one sentence ("cabins in California under $300 with a hot tub") and sees ranked Sanity stays on a Search screen that matches `prompt-imgs/search.png`. They can narrow results with the four chips or a filter sheet and change the sort. Every completed search is tracked in PostHog as either "results shown" or "no results".

## Decisions

### Search behavior
- **When it runs (user choice): on submit.** A search runs when the guest presses the keyboard's Search key, arrives from Home with `?q=`, toggles a chip, applies the filter sheet, or changes the sort. Typing alone doesn't query, because each semantic query counts against the embeddings quota.
- **Where it runs:** in the app, over the public query CDN through `sanityFetch` (no token, no API route). Checked: `score(text::semanticSimilarity($q))` works anonymously on `apicdn` (117 ms). No Jev and no LLM here. This is all exact constraints plus embeddings ranking, and code parses every value.
- **Filters state:** submitting text replaces the filters with `parseQuery(text)`. Chips and the sheet then edit those filters directly and leave the text alone. So after deselecting Cabins, the field can still say "Cabins in California". Submitting again re-parses and drops any chip or sheet edits.
- **Empty field** (opened from the tab bar or Home's search button): all stays, highest rated first, with no event sent.

### Parsing (code, `src/lib/search.ts`, pure)
`parseQuery(text, places)` returns `Filters`:
- `maxPrice`: "under / below / less than / max / up to $300", "$300", "300 a night".
- `guests`: "4 guests / people / adults", "family of 4", and number words one to twelve.
- `bedrooms`, `bathrooms`: "2 bedrooms", "2br", "2-bedroom", "2 baths".
- `types[]`: the schema's property types and their plurals (cabin, cottage, house, apartment, loft, villa, bungalow).
- `settings[]`: the schema's settings plus a short synonym list (beachfront/coast → beach, woods → forest, lakefront → lake, urban/downtown → city, rural/farm → countryside, mountain → mountains).
- `amenities[]`: phrases mapped to camelCase values (hot tub/jacuzzi → hotTub, pool, fireplace, wifi/wi-fi/internet → wifi, kitchen, workspace/desk, parking, washer/laundry, a/c/air conditioning, bbq/grill → bbqGrill, ev charger, ocean/sea view → oceanView).
- `pets`: pet(s), dog(s), cat(s), pet friendly.
- `freeCancellation`: "free cancellation", "flexible cancellation", "refundable".
- `place`: the longest match in the query against the stays' own cities, regions, and countries (loaded from Sanity), plus US state names mapped to their codes ("California" → `CA`, a 50-entry constant). Matched as `location.city == $place || location.region == $place || location.country == $place`.
- `soft[]`: whatever words remain after the parsed phrases and stopwords are removed ("quiet", "cozy", "romantic"). These are the only words sent to embeddings.
- Dates are out of scope: stays have no availability data.

### Query (code, `buildSearchQuery(filters, sort, meta)` in `src/lib/search.ts`)
- Code adds a fixed GROQ clause for each active filter. Values are always params (`$maxPrice`, `$types`, …), never put into the string. Amenities must all match: `count(amenities[@ in $amenities]) == count($amenities)`. Free cancellation uses `cancellationPolicy._ref in $freeIds`. The IDs come from the meta query (fetch IDs first, per AGENTS.md).
- **Meta query**, cached in memory once per app session: the distinct cities, regions, and countries, plus the IDs of cancellation policies with `freeCancellationHours > 0`.
- **Best match:** with soft words, `| score(text::semanticSimilarity($soft), boost(tags match $softWords, 1)) | order(_score desc, rating desc)`. Without soft words, `order(rating desc, title asc)`. The tag boost exists because "quiet" alone ranked a Nashville loft second. The verification step checks whether it's needed.
- **Sorts:** Best match (default), Price: low to high, Price: high to low, Top rated.
- **Projection:** the current card fields plus `nightlyPrice`, `reviewCount`, `amenities`, `petsAllowed`. No pagination: 30 stays. (`ponytail:` note: add a `[0...50]` slice and paging past a few hundred stays.)
- **Hook:** `useStaySearch(filters, sort)` in `src/lib/stays.ts`, built like `useStays` (AbortController, `{ stays, error, loading, retry }`, posthogLogger on failure). Each search aborts the previous one.

### Screen (design, values estimated from the image at about 1.82 px per pt)
- **Header row**, `flex-row gap-3`: a back button, a 52 pt `bg-canvas` circle with `ChevronLeft` (lg) that goes to Home with `router.navigate("/home")`, since Search is a tab. Next to it, the search field: h-13 (52), `rounded-full bg-canvas`, `Search` icon (lg) at about 16 pt from the left, a `TextInput` with a 16 pt medium ink placeholder "Search stays" and `returnKeyType="search"`, and a `SlidersHorizontal` icon button on the right that opens the filter sheet. When the sheet has active filters that the text doesn't show, a small dot appears on the icon: `size-2 rounded-full bg-lavender-ink`. That dot is my addition; the design has no badge.
- **Chips:** a horizontal `ScrollView` row, mt-3, gap-2.5, existing `Chip size="sm"` with the lavender selected tone: **Cabins** (`types` includes cabin), **Under $300** (`maxPrice == 300`, or less than 300 parsed from the text), **Pet Friendly** (`pets`), **Quiet** (`soft` includes quiet). Toggling a chip edits the filters and runs the search.
- **Count row**, mt-5, `flex-row justify-between items-center`: "{n} stays" (or "1 stay") in body medium ink, and the sort trigger: "Sort by " in caption regular ink, the sort label in caption bold, then `ChevronDown` (sm).
- **Sort menu:** a native menu. On iOS, `@expo/ui/swift-ui` `Menu` with our RN text as its label through `RNHostView`. On Android, `@expo/ui/jetpack-compose` `DropdownMenu`. Both are already installed and included in Expo Go. I'll read the v57 docs before building. If the label can't be an RN view, I'll stop and explain instead of switching approaches.
- **Results:** `gap-4`, each row wrapped in `Reflow`. The `ListingCard` gets reworked to match the design:
  - The card is `flex-row gap-3 rounded-sm bg-surface shadow-card` with no padding. The image sits flush left, about 142×148 pt (`w-36 h-37 rounded-sm`).
  - Right column, `flex-1 py-1.5 gap-2`:
    - Title: `headline`, 2 lines, with right padding for the heart.
    - Location: `MapPin` sm placeholder and caption muted regular.
    - Rating: `Star` sm filled primary, rating in caption ink, then "(reviews)" in muted regular.
    - Two badges.
    - Price: "$289" in `headline` with "/ night" in caption placeholder regular.
  - **Heart:** moves from the image to the top-right of the card as `IconButton variant="soft" size="sm"` (44 pt canvas circle) with the `Heart` icon. Filled `text-danger` when saved. Saving is local state, as today.
  - **Badges:** `Badge size="sm"` becomes the design's pill: `h-7 px-2.5 rounded-full bg-canvas`, icon sm, caption text. It's only used by `ListingCard` and the design-system screen.
  - **Which badges:** the amenities the guest filtered on come first, then hotTub, pool, Pet Friendly (from `petsAllowed`), oceanView, fireplace, then the rest. The card shows the first two. On the seeded stays this reproduces the design's pairs.
  - Pressing a card opens nothing (stay details is a later plan). It keeps the press scale.
- **Amenity labels and icons:** `src/components/stays/amenity-icons.ts` becomes `AMENITY_BADGES: Record<amenity value, { label, icon }>` for all 12 schema values plus `pets`. Labels are in the design's Title Case: "Hot Tub", "Ocean View", "Pet Friendly".
- **States:**
  - Loading: 3 rows `h-37 rounded-sm bg-canvas`, announced as "Loading stays".
  - Error: `Alert tone="danger"` "Couldn't search stays. Check your connection and try again." with a `Button variant="secondary"` "Try again".
  - Empty: `SearchX` icon, headline "No stays match", muted "Try removing a filter.", and a secondary `Button` "Clear filters" that keeps the text but clears everything except `soft` and `place`.
- **Tab bar:** stays native. The design's floating glass bar is iOS 26's own `NativeTabs` look.

### Filter sheet (user choice: build it; no design exists)
- RN `Modal` with `presentationStyle="pageSheet"` and `animationType="slide"`, inside the Search screen. Filters stay in local state, so there's no new route and no store.
- Layout: `px-5 pt-6`. Header: "Filters" (`title`) and an `IconButton` with `X` (sm, soft). Sections are separated by `gap-6`, and each heading uses `headline`:
  - **Max price per night:** `Input` with a number pad and a "$" leading icon (`DollarSign`). Empty means any.
  - **Guests, Bedrooms, Bathrooms:** a `Stepper` per row, `min 0` with 0 shown as "Any" in a muted label beside it. Bathrooms step by 1.
  - **Type:** wrapping `Chip size="sm"`, multi-select, for the 7 property types (Title Case labels).
  - **Setting:** the same, for the 7 settings.
  - **Amenities:** the same, for the 12 amenities, with their icons.
  - **Pets allowed** and **Free cancellation:** `Toggle` rows.
  - **Footer:** pinned, `flex-row gap-3`. `Button variant="secondary"` "Clear all" clears every filter except place and soft words. Primary `Button` "Show stays" applies the filters, closes the sheet, and runs the search.
- Edits apply only on "Show stays". Swiping the sheet down discards them.

### Analytics (user choice: two events)
- `stay_search_results_shown` or `stay_search_no_results`, sent once per completed search (not on error or abort, and not for the empty landing list).
- Properties:
  - `results_count`
  - `query_length`
  - `trigger`: `submit`, `home`, `chip`, `filters`, or `sort`
  - `sort`
  - `filter_kinds`: names only, such as `["types","place","maxPrice"]`
  - `property_types`, `settings`, `amenities`: schema enum values, not guest text
  - `pets`, `free_cancellation`, `has_soft_intent`
- Never sent: the text, place names, prices, soft words.
- Replaces `stay_search_refined`. Home's `stay_search_submitted` stays.
- Failures go through `posthogLogger.error("stay search failed", { source: "sanity_cdn", error_name })`.

### Stand-in removal
- Delete `src/data/properties.ts`. `src/lib/search.ts` and `src/lib/search.check.ts` are rewritten: the check now covers `parseQuery` and `buildSearchQuery`.
- `design-system.tsx` gets inline sample props for `ListingCard`.

## Out of scope

- Stay details screen and card navigation, saved stays persisting past the session.
- Dates and availability, a minimum price, map view, pagination.
- Policy questions (Jev and Context endpoint).

## Steps

### 1. Parser and query builder (pure)
`src/lib/search.ts`: `Filters`, `Sort`, `SearchMeta` types, `parseQuery`, `buildSearchQuery`, `emptyFilters`, and the US states constant, as described in Decisions. `src/lib/search.check.ts` asserts:
- "Cabins in California under $300" → types [cabin], place CA, maxPrice 300, soft [].
- "quiet pet friendly cabin with a hot tub under $300 a night" → pets, hotTub, maxPrice 300, soft [quiet].
- "beachfront villa for 6 guests with 3 bedrooms" → setting beach, villa, guests 6, bedrooms 3.
- "free cancellation in Tuscany" → freeCancellation, place Tuscany.
- `buildSearchQuery` puts no filter value in the query string and includes only active clauses.

Done when `npx tsx src/lib/search.check.ts` passes.

### 2. Data hook
`src/lib/stays.ts`: `SearchStay` type, a cached `loadSearchMeta()`, and `useStaySearch(filters, sort, runId)`, where `runId` increments on each submit so the same filters can re-run. Done when tsc passes and the 4 sample queries, run with `sanityFetch` params through curl or MCP, return the expected stays (report counts).

### 3. Card, badges, amenity map
Rework `ListingCard` and `Badge size="sm"` per Decisions, rewrite `amenity-icons.ts`, and update `design-system.tsx`. Done when lint and tsc pass.

### 4. Search screen
Rewrite `src/app/(tabs)/search.tsx`: header, chips, count and sort row, results, the three states, and the analytics events. Add `src/components/stays/sort-menu.tsx` (with `.ios.tsx` if the platforms differ). Delete `src/data/properties.ts`. Done when lint and tsc pass and the screen works on the phone.

### 5. Filter sheet
`src/components/stays/filter-sheet.tsx` per Decisions, wired to the sliders button and the dot. Done when apply, clear, and swipe-to-discard work on the phone.

## Verification

- `npx expo lint`, `npx tsc --noEmit`, `npx tsx src/lib/search.check.ts`.
- Realistic queries run in the app, each reported with results and the explanation of any miss (missing data, parse, query, or code):
  1. "Cabins in California" → 2 (Lake Arrowhead, Big Bear).
  2. "quiet pet friendly cabin with a hot tub under $300 a night" → Lake Arrowhead, Catskills, Blue Ridge.
  3. "romantic beach house" → setting beach, type house, ranked by "romantic".
  4. "loft in Brooklyn" → 1.
  5. "igloo on the moon" → empty state, and a `stay_search_no_results` event.
  6. "cozy" with no filters → cozy-tagged stays on top.
- Chips toggle correctly and rerun. Each sort orders correctly. The filter sheet's apply, clear, and swipe-discard work, and the dot shows.
- PostHog: both events arrive with only the listed properties (checked through the PostHog MCP after the runs above).
- iPhone via mirroring: compare with `prompt-imgs/search.png`, list every difference, fix, and repeat. Also check loading, empty, and error (Wi-Fi off) states.

## AGENTS.md updates

- Who owns what: remove the "Local stand-in (Search only)" line. Add a Search line: the code parser (`src/lib/search.ts`, checked by `search.check.ts`) builds GROQ filters from the sentence, soft words go to `semanticSimilarity` with a tag boost, the query runs over the public CDN with a cached meta query (places plus free-cancellation policy IDs), and searches run on submit, chip, sheet, or sort, never per keystroke.
- Screens: Search has back to Home, chips (Cabins, Under $300, Pet Friendly, Quiet), sort menu (`@expo/ui`), and a filter sheet (RN `Modal` pageSheet). Chips and sheet edit parsed filters, not text.
- Design system: `ListingCard` (heart as a soft `IconButton` on the card, flush image) and `Badge size="sm"` as a pill.
- Analytics: the two search events, their properties, and the never-sent list.

## Result

Built as planned. Search reads Sanity with code-parsed GROQ filters plus embeddings ranking, and matches the design on the phone. Changes and findings during the build:

- **Tag boost syntax:** `boost(count(tags[@ in $w]) > 0, 1)` is rejected inside `score()`, so the build uses `boost(tags match $softWords, 1)`. With it, the top 5 for "quiet" are all quiet-tagged stays (without it, a Nashville loft came second). With several soft words, `match` needs all of them in the tags.
- **Soft-only sentences never come back empty.** "igloo on the moon" returns all 30 stays, because leftover words only rank. Only a filter mismatch empties the list, for example "cabin in Italy" or "free cancellation in Tuscany". The only Tuscany stay has a strict policy, so the latter is a data result.
- **Badge text (user choice):** the design's text is about 1.3× smaller than our tokens, while its boxes match ours. Two badges didn't fit one row at 14 pt, so a `tiny` token (11 pt, line 14) was added for `Badge size="sm"` only.
- **Sort menu:** a `matchContents` `Host` came out 0 wide in the flex row. An invisible RN copy of the label now sizes it, with the `Host` absolutely filling it.
- **Filter dot:** shown only when the sheet applied filters (`fromSheet`), so "Cabins in California" shows no dot, as in the design.
- **Pre-existing tsc error fixed:** `debug` isn't a `PostHog` client option, so `posthog.ts` now calls `posthog.debug(__DEV__)`.
- **Live queries** (CDN, in a scratch script): "Cabins in California" → 2. "quiet pet friendly cabin with a hot tub under $300 a night" → Blue Ridge, Catskills, Lake Arrowhead. "romantic beach house" → Oceanfront, Big Sur, Outer Banks. "loft in Brooklyn" → 1.
- **PostHog:** `stay_search_results_shown` arrived with the planned properties (trigger home/sort, `filter_kinds` ["place","types"], no text or place names).
- **Not verified on device (user is testing):** chips, filter sheet, empty and error states, and the `stay_search_no_results` event. The Android sort menu was never run.
