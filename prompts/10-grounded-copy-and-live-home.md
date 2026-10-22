# 10 · Grounded stay copy and live Home

Status: done

## Goal

Every stay's description is written by Sanity Agent Actions from that stay's own typed fields, and a check proves it adds nothing the fields don't say. Home shows the live stays from Sanity instead of the local list.

## Decisions

- **Embeddings:** already enabled and `ready` on `production` (plan 09). Nothing to turn on. New descriptions are re-embedded automatically, usually within a minute.
- **Facts (user choice): typed fields only.** The copy may use `title`, `propertyType`, `setting`, `location` (city, region, country), `maxGuests`, `bedrooms`, `beds`, `bathrooms`, `amenities`, `petsAllowed`, `tags`, `houseRules`, `checkInTime`, `checkOutTime`. It never sees the old description, the host, the price or the rating. Price and rating change often, so copy must not repeat them. No schema change.
- **Why rewrite:** the plan 09 seed descriptions invent things no field says (elk, Haystack Rock, terrazzo floors, ski-in on Peak 8). The check's first run on them shows this, then the rewrite replaces them.
- **Generate:** `client.agent.action.generate` with `noWrite: true`, `targetDocument: {operation: 'create', _type: 'property'}` (an in-memory document, so the old text isn't in context), `target: {path: 'description'}`, and the facts as a `groq` instruction param (`*[_id == $id][0]{…fact fields}`). Instruction: 2 short paragraphs, 60–110 words, plain text with a blank line between paragraphs. Use only `$facts`. No price, rating, distances, nearby places, landmarks, history, materials, views, or features not listed. Mention pets only as `petsAllowed` and the house rules say. API version `vX`, schema ID from the deployed schema.
- **Invention check, two layers.** A stay passes only when both come back empty:
  1. **Code** (`studio/copy/grounding.ts`, pure, no Sanity): every number in the copy (digits, or words one to twelve) must match a number in the facts. Every feature term from a fixed list (hot tub, pool, fireplace, wood stove, fire pit, Wi-Fi, parking, garage, kitchen, washer, grill, EV charger, ocean/sea view, beach, lake, mountain, forest, desert, dog, pet, cat…) must be backed by an amenity, the setting, `petsAllowed`, or the facts' own text. Capitalized words mid-sentence must appear in the facts (catches invented place names). Deterministic, but it's a heuristic with a known ceiling: a `ponytail:` comment names it.
  2. **Agent Actions Prompt as judge:** `client.agent.action.prompt` with `format: 'json'`, `temperature: 0`, `$facts` (same groq param) and `$copy` (constant). It returns `{"unsupported": [{"claim", "why"}]}` and is asked to flag every claim the facts don't state or directly imply.
- **Retries and failure (user choice):** up to 3 generate attempts per stay. Each retry gets the previous attempt's flagged claims as a `$avoid` constant. Pass → the script patches `description` on the published document (it writes itself, since Agent Actions only write drafts). Still failing after 3 → the last copy goes into `drafts.<id>` (published fields + new description) for review in Studio, the published stay keeps its text, and the flagged claims are printed.
- **Script:** `studio/copy/write-copy.ts`, run from `studio/` with `npx sanity exec copy/write-copy.ts --with-user-token`. It uses the CLI login, so no token goes in `.env`, and it runs stays one at a time. `-- --check` mode runs only the two checks on the current published descriptions and writes nothing. Each run prints pass/fail per stay and a total. Uses AI quota: about 60–90 Agent Actions calls for 30 stays.
- **Seed stops owning copy:** `studio/seed/data.ts` drops `description`. For an existing stay, `seed.ts` sets the fact fields with `patch().set()` instead of `createOrReplace`, so it never touches `description`. A new stay is created without one; run the copy script after seeding new stays. Studio still requires `description` before an editor can publish.
- **Home data path (user choice):** plain `fetch` to Sanity's query CDN (`https://crc5fllu.apicdn.sanity.io/v2026-10-21/data/query/production`). The dataset is public, so no token and no new dependency. GROQ params are sent as `$name=<JSON>` query parameters. Helpers live in `src/lib/sanity.ts`. CDN answers can lag edits by up to a minute.
- **Home list (user choice):** one query loads every stay, highest rating first (ties by title), with only the card fields: `_id`, `title`, `"location": city + ", " + region`, `propertyType`, `setting`, `rating`, cover photo URL. Chips filter the loaded list: All, Cabins → `propertyType == "cabin"`, Beach → `setting == "beach"`, City → `setting == "city"`, Villas → `propertyType == "villa"`. The `Reflow` animation stays. This is browsing, not guest-typed constraints, so the GROQ-filter rule for search doesn't apply.
- **Images:** the cover is the Sanity CDN URL with `?w=1200&auto=format` (no image-URL library).
- **Fetch hook:** `useStays()` in `src/lib/stays.ts` holds `useState` + `useEffect` with an `AbortController`. It returns `{ stays, error, loading, retry }`. No React Query: one screen, one query.
- **States** (no design for these yet; existing components only):
  - Loading: 3 placeholder cards (`h-67 rounded-xl bg-canvas`), announced as "Loading stays".
  - Error: `Alert tone="danger"` "Couldn't load stays. Check your connection and try again." and a `Button` "Try again" that calls `retry`.
  - Empty for a chip: muted text "No {chip label} yet", centered.
- `StayCard` takes the live card type instead of `Property`. Cards still open nothing (stay details is a later plan).

## Out of scope

- Search tab: it keeps `src/data/properties.ts` and `src/lib/search.ts` until the search plan.
- Stay details screen, pull to refresh, offline cache.
- Host and policy copy.

## Steps

### 1. Grounding check (pure)

- `studio/copy/grounding.ts`: `type Facts` and `findUnsupported(copy, facts): string[]` per Decisions (code layer).
- `studio/copy/grounding.check.ts`: asserts that an invented landmark, a wrong number, and an unlisted hot tub are flagged, and that copy using only listed facts passes.

Done when `npx tsx copy/grounding.check.ts` passes in `studio/`.

### 2. Copy script

- `studio/copy/write-copy.ts`: list stays, check mode, generate → code check → Prompt judge → retry → patch published or write draft, per Decisions.
- Run `-- --check` first and record how many current descriptions fail.

Done when check mode reports per stay without writing anything.

### 3. Seed stops owning copy

- Remove `description` from `StaySeed` and the 30 stays in `studio/seed/data.ts`. `seed.ts` uses `patch().set()` for existing stays.

Done when a seed run reports 0 created / 46 updated and the descriptions are unchanged (compared by MCP query before and after).

### 4. Write the copy

- Run the script, then run `-- --check` again.

Done when every published description passes both checks. Any stay that fails ends up as a draft and is listed.

### 5. Live Home

- `src/lib/sanity.ts`: project constants, `sanityFetch<T>(query, params, signal)` (throws on non-2xx), `imageUrl(url, width)`.
- `src/lib/stays.ts`: `StaySummary` type, `STAYS_QUERY`, `useStays()`.
- `src/components/stays/stay-card.tsx`: takes `StaySummary`.
- `src/app/(tabs)/home.tsx`: `useStays()`, chip predicates, and the loading, error and empty states.

Done when lint and tsc pass and Home shows Sanity stays on the phone.

## Verification

- `studio/`: `npx tsx copy/grounding.check.ts`, own-file `tsc`, `sanity schema validate`. Root: `npx expo lint`, `npx tsc --noEmit`, `npx tsx src/lib/search.check.ts`.
- Check mode before and after: the old seed copy is flagged; after the rewrite, 30/30 pass (or the failures are listed as drafts).
- Read 3 rewritten descriptions next to their facts (MCP query) and report them.
- Seed after the rewrite leaves descriptions unchanged.
- Semantic query from plan 09 ("quiet secluded place to unwind", ≤ $300) still puts quiet/secluded stays on top. Report the top 5.
- iPhone via mirroring (you navigate): Home shows Sanity stays by rating; each chip filters correctly (Cabins 7, Beach 7, City 6, Villas 4); the loading cards show briefly; with Wi-Fi off and a cold start, the error and Try again appear, and Try again recovers once Wi-Fi is back.
- Edit a stay title in Studio, publish, reload the app within a minute or two → Home shows the new title. Then revert the title.

## AGENTS.md updates

- Content: the copy script (`copy/write-copy.ts`, `-- --check`), the grounding rule (copy uses typed fields only, code check + Prompt judge, failures become drafts), and that the seed never writes `description`.
- Content / local stand-in: Home reads live stays through `src/lib/sanity.ts` (public CDN, plain fetch, no token). The local stand-in is now Search only.
- Commands: the copy script and its check.

## Result

Built as planned. 30/30 published descriptions pass both checks, with no drafts. Home reads live stays from Sanity. Changes and findings during the build:

- **Bug caught before writing:** the first check-mode run passed whole documents as facts, so each old description vouched for itself in the code check. `factText` now reads only `FACTS_PROJECTION` fields, and `grounding.check.ts` covers it.
- **Resumable runs:** the first write run stopped on a network `ETIMEDOUT` after 29 stays. Its last save had most likely already reached Sanity, since the resumed run found all 30 passing. Write mode now keeps any description that already passes, and logs and skips a stay whose request errors.
- **Strict state names:** the code check rejects "Tennessee" when the facts say "TN". Retries fixed every case, at the cost of extra calls.
- **Copy quality:** grounded but plain. It restates fields and house rules and uses 24-hour times ("15:00"). Both checks missed one small misstatement in Sunny Brooklyn Loft ("The fourth-floor building has no elevator"; the rule says the loft is on the fourth floor).
- **Ranking:** after the rewrite, the top 4 for "quiet secluded place to unwind" (≤ $300) are still quiet/secluded stays; 5th changed from Joshua Tree to Jungle Beach Bungalow.
- **Not verified on device:** the error state and an edit appearing live (both skipped by the user). A bad host returns 404, which `sanityFetch` throws on; the CDN served an edited title within 10 s (then reverted).
