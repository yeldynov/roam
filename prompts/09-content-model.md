# 09 · Content model and seed

Status: done

## Goal

Roam's content lives in Sanity: stays, hosts, and policies, modeled from the screens built so far and the planned search and stay details screens. The schema is deployed, the hosted Studio shows it, embeddings are on, and a re-runnable script seeds 30 realistic stays with photo galleries. The app keeps using its local stand-in until the search plan swaps the source.

## Decisions

- **Deploy route (user choice):** schema lives in `studio/schemaTypes/` and is deployed from `studio/` with `npx sanity@latest schema deploy`, plus `npx sanity@latest deploy` for the hosted Studio that Context needs. The Sanity MCP refuses `deploy_schema` when a local Studio exists and its CLI has no `schema deploy`. The MCP still verifies the deployed schema, enables embeddings, and checks content. This replaces AGENTS.md's "Schema deploys … go through the Sanity MCP".
- **Seed route (user choice):** `studio/seed/seed.ts`, run with `npx sanity exec seed/seed.ts --with-user-token` from `studio/`. It uses the CLI login's token through `getCliClient()`: no write token in `.env`, no new dependency.
- **Idempotent seed:** every document is found by `slug.current` + `_type`. Found → `createOrReplace` with the existing `_id`. Missing → `create` with no `_id`, so Sanity generates it. References use the `_id`s returned by those lookups or creates. Order: policies → hosts → properties. Array `_key`s are fixed (`photo-0`, `rule-0`…) so a re-run changes nothing. Photos are downloaded from Unsplash and uploaded with `client.assets.upload`. Sanity dedupes assets by content hash, so re-runs reuse the same asset. The script never deletes. A stay removed from the seed file stays in the dataset until deleted by hand.
- **Published, not drafts:** the seed writes published documents (no `drafts.` prefix), so GROQ sees them right away.
- **Detail screen needs (user choice):** photo gallery. No host card, map, or review documents. So the model has no geopoint and no `review` type. Hosts keep only name, photo, and bio.
- **Filters the search plan will use (user choice):** price, guests, property type, setting, amenities, pets, place, **bedrooms and bathrooms**, and **free cancellation**. Each one is a typed field. No dates or instant book.
- **Type vs setting:** the Home chips mix two things ("Cabins" is a type, "Beach" is a setting), so the model splits them: `propertyType` (what it is) and `setting` (where it is). Chips map as Cabins → `propertyType == "cabin"`, Beach → `setting == "beach"`, City → `setting == "city"`, Villas → `propertyType == "villa"`. The mapping is the search plan's job.
- **Amenities** are a fixed string list stored as camelCase values. The app maps each value to a label and icon (`amenity-icons.ts`, in the search plan). Pets moves out of amenities into `petsAllowed`, because it's a filter with its own rule.
- **Free cancellation:** a typed `freeCancellationHours` on cancellation policies. The search plan finds the policy IDs with `freeCancellationHours > 0` first, then filters `cancellationPolicy._ref in $ids`, which avoids a join in the filter.
- **Shared vs per-stay:** hosts and policies are documents. A property references its host and its cancellation policy. Roam-wide policies (booking and payment, pets, damage, check-in, conduct) apply to every stay and aren't referenced; Context reads them by `kind`. House rules and check-in/out times are per stay, so they're fields on the property.
- **Plain text, not Portable Text,** for `description`, host `bio`, and policy `body`. Answers quote them word for word, and the app has no Portable Text renderer. Paragraphs are separated by blank lines.
- **Embeddings:** enabled on `production` through the MCP CLI with a property-only projection, so policies and hosts don't compete in stay ranking:
  `{ _type == "property" => { title, description, tags, propertyType, setting, amenities, houseRules, "city": location.city, "region": location.region } }`
  Generating embeddings is free; semantic queries count against the plan's quota.
- **Icons:** `@sanity/icons` subpath imports (rules require icons on every type). It's already installed under `sanity`; it becomes a direct dependency in `studio/package.json` with `npm install @sanity/icons` in `studio/` (Studio isn't Expo, so `npx expo install` doesn't apply).
- **Root checks skip the Studio:** root `tsconfig.json` gets `"exclude": ["studio"]` and `eslint.config.js` ignores `studio/*`. The Studio type-checks on its own.
- **Studio host:** `studioHost: 'roam-stays'` in `studio/sanity.cli.ts`. If the name is taken, I'll ask you before picking another.

### Schema

`property` (document, icon `HomeIcon`)

| Field | Type | Rules / notes |
| --- | --- | --- |
| `title` | string | required, max 60 |
| `slug` | slug from `title` | required; seed key and future `/stay/[slug]` route |
| `propertyType` | string list: `cabin`, `cottage`, `house`, `apartment`, `loft`, `villa`, `bungalow` | required, radio |
| `setting` | string list: `mountains`, `forest`, `lake`, `beach`, `desert`, `city`, `countryside` | required, radio |
| `location` | object `{ city, region, country }` (strings) | all required; `region` is the short display form ("CA", "Tuscany"); card shows `city, region` |
| `nightlyPrice` | number | required, integer, min 1; whole USD |
| `maxGuests` | number | required, integer, 1–16 |
| `bedrooms` | number | required, integer, min 0 (0 = studio) |
| `beds` | number | required, integer, min 1 |
| `bathrooms` | number | required, min 0.5, multiple of 0.5 |
| `amenities` | array of string, list: `hotTub`, `pool`, `fireplace`, `wifi`, `kitchen`, `workspace`, `parking`, `washer`, `airConditioning`, `bbqGrill`, `evCharger`, `oceanView` | unique, grid checkboxes |
| `petsAllowed` | boolean | required, initial `false` |
| `rating` | number | 0–5, one decimal |
| `reviewCount` | number | integer, min 0 |
| `photos` | array of image (hotspot) with required `alt` string | min 1, max 8; first is the cover |
| `description` | text (8 rows) | required; plain paragraphs; embedded, so soft intent (quiet, secluded) lives here |
| `tags` | array of string (tags layout) | soft vibe words: quiet, cozy, romantic… |
| `host` | reference → `host` | required |
| `cancellationPolicy` | reference → `policy` | required; picker filtered to `kind == "cancellation"` |
| `checkInTime`, `checkOutTime` | string | required, `HH:MM` 24-hour regex |
| `houseRules` | array of string | each shown word for word |

Preview: `title`, subtitle `city, region · $price`, media `photos[0]`. Field groups: Basics, Location & capacity, Pricing & policy, Content.

`host` (document, icon `UserIcon`): `name` (required), `slug` from name (required, seed key), `photo` (image, hotspot, `alt`), `bio` (text). Preview name + photo.

`policy` (document, icon `DocumentTextIcon`): `title` (required), `slug` (required), `kind` (list: `cancellation`, `booking`, `payment`, `pets`, `damage`, `checkIn`, `conduct`; required), `summary` (string, max 120, the one-line version shown on a stay), `freeCancellationHours` (number, integer, min 0, shown only when `kind == "cancellation"`; 0 = no free cancellation), `body` (text, required; quoted word for word). Preview title + kind.

### Seed content

- **Policies (8):** cancellation Flexible (free until 24 h before check-in), Moderate (free until 5 days before), Strict (no free cancellation, 50% refund until 7 days before; `freeCancellationHours: 0`). Roam-wide: Booking & payment, Pets & service animals, Damage & security deposit, Check-in & access, Guest conduct & parties. Each body is 2–4 short realistic paragraphs.
- **Hosts (8):** realistic names, Unsplash portrait photo, 2–3 sentence bio.
- **Stays (30):** spread over every `propertyType` and `setting`, mostly US with a few abroad (Tulum, Tuscany, Lisbon, Banff), $85–$950 a night, 1–16 guests, half pet friendly, a mix of cancellation policies. They include the 10 local stand-in stays (same titles and places) so results look familiar after the swap. Each has 4 Unsplash photos with alt text, a 2–3 paragraph description written for soft-intent ranking, 3–6 tags, 3–6 house rules, and check-in/out times. The search check sentence ("quiet pet friendly cabin with a hot tub under $300 a night") matches at least 3 stays.
- Photo IDs are checked before seeding: the script fails with the stay title if a download isn't a 200 image, and writes nothing for that stay.

## Out of scope

- App changes: the app still reads `src/data/properties.ts`. Swapping it for GROQ, the amenity map, and chip mapping belong to the search plan.
- GROQ search queries, Jev, and the Context endpoint (created in the Dashboard in its own plan).
- Host card, map, review documents, dates/availability, instant book (not chosen).
- Agent Actions copy generation: descriptions are written into the seed file.
- Deleting content: the seed only creates and replaces.

## Steps

### 1. Schema in the Studio

- `npm install @sanity/icons` in `studio/`.
- `studio/schemaTypes/property.ts`, `host.ts`, `policy.ts` per the Schema tables, using `defineType` / `defineField` / `defineArrayMember` and subpath icon imports. Register them in `studio/schemaTypes/index.ts`.
- `studio/sanity.cli.ts`: add `studioHost: 'roam-stays'`.
- Root `tsconfig.json` excludes `studio`; root `eslint.config.js` ignores `studio/*`.

Done when `npx tsc --noEmit` and `npx sanity schema validate` pass in `studio/`, and root `npx expo lint` and `npx tsc --noEmit` pass.

### 2. Deploy schema and Studio

- From `studio/`: `npx sanity@latest schema deploy`, then `npx sanity@latest deploy`.
- MCP: `list_workspace_schemas` shows a Studio-deployed schema; `get_schema` for `property` shows every field.

Done when the hosted Studio loads with Stays, Hosts, Policies and the MCP sees the schema.

### 3. Seed script and data

- `studio/seed/data.ts`: the policies, hosts, and stays (plain objects keyed by slug; stays point at host and policy slugs).
- `studio/seed/seed.ts`: `getCliClient({ apiVersion: '2026-10-21' })`. For each policy, host, then stay: look up `_id` by `_type` + `slug.current`, upload photos (stays and hosts), build the document with references from the looked-up IDs, and `createOrReplace` or `create`. Log `created` / `updated` per document and a final count.
- Run it twice.

Done when the first run creates 8 + 8 + 30 documents and the second run reports 46 updated, 0 created, with the same `_id`s and asset count.

### 4. Embeddings

- MCP CLI: `datasets embeddings enable production --project-id crc5fllu --projection='<projection from Decisions>'`, then `datasets embeddings status production` until it reports `ready`.

Done when status is `ready`.

## Verification

- `studio/`: `npx tsc --noEmit`, `npx sanity schema validate`. Root: `npx expo lint`, `npx tsc --noEmit`, `npx tsx src/lib/search.check.ts` (the app is unchanged).
- MCP `get_schema` shows `property`, `host`, `policy` with the fields above.
- Counts by MCP query: 30 properties, 8 hosts, 8 policies; every property has a host, a cancellation policy, 4 photos with alt text.
- Idempotence: seed run twice → same counts, same `_id`s, `count(*[_type == "sanity.imageAsset"])` unchanged after the second run.
- Typed filters by MCP GROQ with params: `petsAllowed == true && nightlyPrice <= $max && "hotTub" in amenities && propertyType == "cabin"` returns ≥ 3; `bedrooms >= $beds`; the free-cancellation two-step returns only Flexible/Moderate stays.
- Semantic ranking: once embeddings are `ready`, `*[_type == "property" && nightlyPrice <= 300] | score(text::semanticSimilarity("quiet secluded place to unwind")) | order(_score desc)[0...5]{title}` puts the secluded/quiet stays on top. Report the result as is.
- Open the hosted Studio: a stay shows its gallery, host, and policy references.

## AGENTS.md updates

- Who owns what, Content: replace "Schema deploys and content changes go through the Sanity MCP" with: schema lives in `studio/schemaTypes/` and deploys from `studio/` with `npx sanity@latest schema deploy` and `npx sanity@latest deploy` (`roam-stays`). The MCP verifies schema, runs content queries and changes, and manages embeddings. Seed with `npx sanity exec seed/seed.ts --with-user-token` from `studio/` (upserts by slug, never deletes).
- Content model line: `property` (typed filter fields, embedded `description`/`tags`, refs to `host` and a `cancellation` `policy`), `host`, `policy` (`kind`, `summary`, `body`, `freeCancellationHours`). Home chips map Cabins/Villas → `propertyType`, Beach/City → `setting`. Long text is plain text, not Portable Text.
- Soft intent line: add the embeddings projection (property only).
- Commands: add the Studio commands. Note root tsc and lint skip `studio/`.

## Result

Built as planned. Schema deployed from `studio/` with the CLI, hosted Studio at https://rn-roam.sanity.studio, 46 documents seeded, embeddings enabled. Changes made during the build:

- **Studio host:** `roam-stays` was taken; `rn-roam` (user choice). `sanity.cli.ts` also holds the `appId` the first deploy created.
- **Porto instead of Lisbon** for the Portugal stay: the verified photos show Porto's Ribeira.
- **Photos:** 134 Unsplash IDs were checked (all 200) and viewed on numbered contact sheets; every alt text describes the picture it's on. Some interior photos are reused across stays (101 unique stay photos for 120 slots).
- **Studio `tsc`** reports one error inside `node_modules/eventsource` (a shipped `.ts` file). It isn't from our files; our files type-check clean.
