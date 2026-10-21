# 08 · Home, search, and native tabs

Status: done

## Goal

Signed-in guests land on a Home tab that matches the design: greeting, a one-sentence search field, category chips, and featured stay cards from realistic local data. Typing in the Home search field and submitting opens the Search tab with that sentence already filled in and matching stays listed. Navigation is a native tab bar (Home, Search, Trips, Profile).

## Decisions

- **Tabs:** `NativeTabs` from `expo-router/unstable-native-tabs` (SDK 57 component API: `NativeTabs.Trigger.Icon` / `.Label`). It's the platform's own bar: liquid glass on iOS 26, Material 3 on Android. The design's yellow selected pill can't be drawn inside a native bar, so the selected tab uses the system indicator with an `ink` tint (Android `indicatorColor` = `primary`). The existing JS `TabBar` component stays in the design system, unused by screens.
- **Tab colors from tokens:** `tintColor` comes through `styled(NativeTabs, { className: { target: false, nativeStyleMapping: { color: "tintColor" } } })` with `className="text-ink"`, following the AGENTS.md rule for JS color props. `indicatorColor` uses a second mapping (`backgroundColor` → `indicatorColor`, class `bg-primary`) if the mapping accepts two keys; otherwise Android keeps its default indicator.
- **Tab icons:** SF Symbols with Material fallbacks: Home `house` / `house.fill` + `md="home"`, Search `magnifyingglass` + `search`, Trips `calendar` + `calendar_today`, Profile `person` / `person.fill` + `person`. No custom images.
- **Search tab:** a plain tab (user choice), not `role="search"`. The Search screen has its own search field.
- **Routes:** a `(tabs)` group replaces `src/app/home.tsx`:
  - `src/app/(tabs)/_layout.tsx` NativeTabs
  - `src/app/(tabs)/home.tsx`, `search.tsx`, `trips.tsx`, `profile.tsx`
  
  URLs stay `/home`, `/search`, `/trips`, `/profile`. The root layout's signed-in guard holds `(tabs)` instead of `home`, so the guard flip still lands on Home (first trigger).
- **Home → Search:** submitting the Home field (keyboard Search key or the ↗ button) calls `router.navigate({ pathname: "/search", params: { q } })`. Empty input does nothing. The Search screen reads `q` with `useLocalSearchParams` and copies it into its field whenever `q` changes. The Home field clears after navigating.
- **Local data:** `src/data/properties.ts` exports 10 realistic stays typed as `Property`: `id`, `title`, `location`, `category` (`cabin | beach | city | villa`), `price` (whole dollars/night), `rating`, `reviews`, `guests`, `petsAllowed`, `amenities` (labels from a fixed list, each mapped to a lucide icon), `tags` (soft words like quiet, cozy, secluded), `image` (remote Unsplash URL, allowed as a sample photo). It stands in for Sanity until the content plan; field names follow the planned schema so the swap only changes the source.
- **Local search** (`src/lib/search.ts`, pure function `searchStays(query, stays)`): code parses "under $300" / "below 300" / "max $300" / "$300" into a price ceiling and "pet(s) friendly" / "dogs" into `petsAllowed`, both as hard filters. The rest of the sentence is lowercased, stop words dropped, and each remaining word scores +1 when it appears in the stay's title, location, category, amenities, or tags. Stays with score 0 are dropped unless the query had no words left (then all stays that pass the filters show), sorted by score then rating. This is a stand-in for GROQ filters + embeddings and is replaced, not extended, by the search plan. One assert-based check `src/lib/search.check.ts` runs with `npx tsx` (no test framework).
- **Search screen states:** empty query → all stays, with heading "All stays". Results → "N stays" heading and `ListingCard` rows. No match → empty state "No stays match “…”" plus "Try fewer words or a higher price." Data is local, so no loading or error state.
- **Home categories:** chips All Stays / Cabins / Beach / City / Villas filter the featured list by `category`. Default All Stays. Selection is local state.
- **Cards:** not pressable (user choice). The › button is decorative (`accessibilityElementsHidden`), so it's not announced as a button that does nothing.
- **Avatar and greeting:** Clerk `user.imageUrl` in `expo-image`, greeting "Hey, {firstName} 👋" ("Hey there 👋" without a first name).
- **Sign out** moves to the Profile tab stub (name, email, Sign out button). Trips is a stub: "No trips yet" empty state.
- **Gradient** under the card text: NativeWind's `bg-linear-to-t from-scrim to-transparent` (react-native-css compiles gradients to `experimental_backgroundImage`). If it doesn't render on native, an arbitrary class `bg-[linear-gradient(to_top,var(--color-scrim),transparent)]`. No new dependency either way.
- **Animation** (expo-animation skill gate):
  - Tab switches: none, native bar default (100+/day).
  - Press feedback (tens/day, purpose: feedback): scale 0.97, 120 ms, `cubicBezier(0.23, 1, 0.32, 1)`, Reanimated CSS transition on `transform`. A new `PressableScale` in `src/components/ui/` wraps the Home search ↗ button, the Home search icon button, and category chips. Only the Home screen uses it; existing components keep `active:opacity-70`.
  - List reflow when a chip changes or the search query changes (purpose: preventing a jarring change): Reanimated layout animations on each card, `entering={FadeIn.duration(200)}`, `exiting={FadeOut.duration(150)}`, `layout={LinearTransition.duration(200).easing(EASE_OUT)}`. Lists are short `ScrollView`s (10 items), not virtualized, so `entering` on rows is allowed.
  - No mount entrance on Home (opens on every launch) and no chip color animation.
  - Reduced motion: layout animations default to `ReduceMotion.System` (skipped when the setting is on). Press scale stays: it's under 150 ms and has no translation.
  - All on the UI thread. No shared values, gestures, or `setState` per frame. No `GestureHandlerRootView` needed.
  - Haptics skipped: `expo-haptics` isn't installed. Add on approval later if wanted.
- **Chip:** gains `size="soft"` (changed during the build from a `soft` prop): `h-12 px-3.5 gap-1.5`, caption text, md icon, idle `bg-canvas`, so three fit per row as designed. Chip now presses with `PressableScale` everywhere.

### Design spec (estimated from the image at ~1.74 px/pt)

Screen `bg-surface`, horizontal padding 20 (`px-5`), top = safe area + 12, bottom content inset handled by NativeTabs automatic insets (the `ScrollView` is the screen's first child).

| Element | Spec | Tokens |
| --- | --- | --- |
| Header row | `Wordmark size="md"` left, avatar right, `justify-between items-start` | — |
| Avatar | 88 circle, photo cover, `bg-primary-soft` behind (yellow ring look) | `size-22 rounded-full bg-primary-soft` |
| Greeting | "Hey, Joanna 👋", mt-2 | `Text variant="body" weight="semibold" tone="muted"` |
| Title | "Find your next stay" two lines, flex-1 | `Text variant="display"` |
| Search icon button | 64 × 88 tall rounded rect, `Search` icon lg, right of title | `w-16 h-22 rounded-xl bg-canvas` |
| Search field | 60 tall pill, mt-6. `Sparkles` icon lg ink, `TextInput` (placeholder "quiet pet friendly cabin with hot tub", returnKeyType search), right 44 white circle with `ArrowUpRight` | `h-15 rounded-full bg-lavender pl-5 pr-2 gap-3`, input `text-body font-medium text-ink placeholder:text-ink-soft`, button `size-11 rounded-full bg-white` |
| Chips | wrap, mt-4, gap 8 | `Chip soft` (h-12 px-6), selected `tone="primary"` |
| Card | full width, 268 tall, mt-6, gap 20 between cards, radius 24 | `h-67 rounded-xl overflow-hidden` |
| Rating badge | top-right inset 12, white pill, filled `Star` + "4.9" | `bg-white rounded-full px-3 h-10`, `Text variant="headline"` |
| Card text | bottom-left inset 20 over gradient; `MapPin` filled white sm + location `caption` white; title 2 lines | `Text variant="title" tone="white"` |
| › button | bottom-right inset 16, 56 white circle, `ChevronRight` | `IconButton variant="surface"` style, decorative |
| Tab bar | native (see Decisions) | — |

No new tokens. Estimated values: avatar 88, search button 64×88, card height 268, insets 12/16/20. All map to existing spacing steps.

## Out of scope

- Stay detail screen and card navigation.
- Sanity content, GROQ, embeddings, and Jev; the real search plan replaces `src/lib/search.ts`.
- Real Trips and Profile screens, saved stays (the `ListingCard` heart toggles local state on Search only).
- Haptics, PostHog events.
- Web tab layout (`_layout.web.tsx`); web gets whatever NativeTabs renders there.

## Steps

### 1. Tabs group and route move

- Create `src/app/(tabs)/_layout.tsx` with the styled NativeTabs and four triggers (Home, Search, Trips, Profile) per Decisions.
- Move `src/app/home.tsx` → `src/app/(tabs)/home.tsx` (stub for now). Add stubs `search.tsx`, `trips.tsx` ("No trips yet"), `profile.tsx` (name, email, Sign out, moved from the home stub).
- `src/app/_layout.tsx`: the signed-in `Stack.Protected` holds `<Stack.Screen name="(tabs)" />`.

Done when sign-in lands on Home with the native tab bar, all four tabs switch, and Sign out on Profile returns to onboarding. Lint and tsc pass.

### 2. Data and search

- `src/data/properties.ts`: `Property` type, amenity → lucide icon map, 10 stays across the four categories (prices $120–$650, mix of pets/no pets, hot tub, wifi, fireplace, pool, ocean view…, Lake Arrowhead "Modern Cabin with Hot Tub" 4.9 first).
- `src/lib/search.ts`: `searchStays` per Decisions.
- `src/lib/search.check.ts`: asserts that "quiet pet friendly cabin with a hot tub under $300 a night" returns only pet-friendly stays ≤ $300 with a cabin first; "beach villa" ranks beach/villa stays first; "zzz" returns none; "" returns all.

Done when `npx tsx src/lib/search.check.ts` passes.

### 3. Home screen

- `src/components/ui/pressable-scale.tsx` (press feedback per Decisions), exported from `index.ts`, added to `/design-system`.
- `Chip`: `soft` prop.
- `src/components/home/stay-card.tsx`: the featured card per the design spec.
- `src/app/(tabs)/home.tsx`: header, greeting, title + search button (navigates to `/search` with no query), search field (submit → `/search?q=`), chips, filtered cards with layout animations.

Done when Home matches the spec and chips filter with the reflow animation.

### 4. Search screen

- `src/app/(tabs)/search.tsx`: lavender field (same look as Home's) prefilled from `q`, live results as the guest types via `searchStays`, `ListingCard` rows with layout animations, heading and empty state per Decisions.

Done when typing on Home and submitting opens Search with the sentence and its results.

### 5. Device check

Per AGENTS.md "Building from designs": iPhone Mirroring capture of Home, compare with the design, list and fix differences, repeat. Then Search with a query and with no match.

## Verification

- `npx expo lint` and `npx tsc --noEmit` pass. `npx tsx src/lib/search.check.ts` passes.
- Cold start signed in → Home tab, native bar shows four tabs, Home selected.
- Home: chips filter cards (Cabins shows only cabins, All Stays shows all), cards fade and reflow in ~200 ms. Press scale visible on chips and the ↗ button.
- Type "quiet pet friendly cabin with hot tub under $300" on Home, press ↗ → Search tab, field shows the sentence, results are pet-friendly ≤ $300 with a cabin first.
- Edit the query on Search → results update with reflow. "zzz" → empty state. Clear → "All stays".
- Search icon button on Home → Search tab with empty field.
- Profile → Sign out → onboarding.
- Reduce Motion on → no fade/reflow animation, press scale still works.
- Screenshot comparison of Home against the design via iPhone Mirroring.

## AGENTS.md updates

- Expo, Screens: replace "`home` is a stub" with: signed-in screens live in the `(tabs)` group under `NativeTabs` (Home, Search, Trips, Profile; Trips and Profile are stubs). Sign out is on Profile. The signed-in guard holds `(tabs)`.
- Who owns what, Content: note that `src/data/properties.ts` and `src/lib/search.ts` are local stand-ins until stays come from Sanity; replace, don't extend.
- Design system: `PressableScale` (press feedback: scale 0.97, 120 ms) for pressables that need it; `Chip` has `soft`. Native tab colors come through `styled(NativeTabs, …nativeStyleMapping)`.
- New "Motion" line under Who owns what: Reanimated CSS transitions and layout animations per the expo-animation skill; tab switches never animate.

## Result

Built as planned, checked on the iPhone through mirroring. Changes made during the build:

- **Search field font:** the inline `style={{ lineHeight: undefined }}` on `TextInput` made react-native-css drop the whole `className` (system font, no `flex-1`, so the ↗ button was pushed off screen). Removed it. `Input` in `src/components/ui/input.tsx` passes the same inline style and likely has the same bug (not changed here).
- **Placeholder** shortened to "quiet pet friendly cabin, hot tub" (user choice): the design copy doesn't fit at 14pt in Plus Jakarta.
- **New sizes** (user choice): `--text-hero` 46px (`Text variant="hero"`) for the Home title, and `Wordmark size="hero"` (38). Named `hero` because Wordmark's `lg` is already 48.
- **Chips:** `soft` became a size so three fit per row (the md size wrapped 2/2/1).
- **Gradient:** `bg-linear-to-t from-scrim to-transparent` renders on native; no fallback needed.
- Data icons moved to `src/components/stays/amenity-icons.ts`, so `search.check.ts` runs under Node without React Native. The check uses its own `assert` (no `@types/node`).
