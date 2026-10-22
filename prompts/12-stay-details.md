# 12 · Stay details

Status: done

## Goal

A guest taps a stay on Home or Search and sees its details screen, matching `prompt-imgs/property-details.png`, filled from Sanity: photos, title, rating, location, features, cancellation policy, house rules, Roam's policies, host, description, and price. "Book this stay" shows "Coming soon". PostHog records each opened stay.

## Decisions

### Answers
- **"Ask about policies" (user choice):** opens a policies sheet. It shows this stay's check-in and check-out times and house rules, then Roam's policies for every stay (check-in, payment, pets, damage, conduct): title plus body, word for word. Policy Q&A (Jev + Context) replaces this sheet later.
- **Design lines with no data (user choice):** drop both. The host row shows only "Hosted by {first name}" (no "Superhost"). The footer shows only "$189 / night" (no total, since stays have no dates).
- **Below the host row (user choice):** a "{maxGuests} guests · {bedrooms} bedrooms · {beds} beds · {bathrooms} baths" line, then the description paragraphs (blank-line split), scrolling above the footer. "1 bedroom", "1 bath", and "Studio" for 0 bedrooms.

### Route and data
- **Route:** `src/app/stay/[id].tsx`, registered as `<Stack.Screen name="stay/[id]" />` inside the root layout's signed-in `Stack.Protected`. It pushes over the tabs (no tab bar). `id` is the Sanity `_id`. A `from` param (`home` | `search`) is used only for analytics.
- **Opening it:** Search's `ListingCard onPress` and Home's `StayCard` call `router.push({ pathname: "/stay/[id]", params: { id, from } })`. `StayCard` becomes pressable with `PressableScale` (it already sits in a scroll view, so `unstable_pressDelay={80}`), and its › stops being decorative.
- **Fetch:** `useStay(id)` in `src/lib/stays.ts`, built like `useStays` (AbortController, `{ stay, error, loading, retry }`, `posthogLogger.error("stay load failed", …)`). One query over the CDN with `$id` as a param:
  - The stay: `title`, `location` (city, region), `rating`, `reviewCount`, `nightlyPrice`, `amenities`, `petsAllowed`, `setting`, `propertyType`, `maxGuests`, `bedrooms`, `beds`, `bathrooms`, `checkInTime`, `checkOutTime`, `houseRules`, `description`, `photos[]{ "url": asset->url, alt }`.
  - `host->{ name, bio, "photo": photo.asset->url }`.
  - `cancellationPolicy->{ title, summary, freeCancellationHours, body }`.
  - `"policies": *[_type == "policy" && kind != "cancellation"] | order(title asc){ title, body }`.
- A `null` stay (unpublished or deleted) shows the not-found state.

### Screen (values estimated from the image at about 1.7 px per pt)
- **Photo pager:** full width, about 336 pt tall (`h-84`). A horizontal `ScrollView` with `pagingEnabled`, one `expo-image` per photo at screen width, `imageUrl(url, 1200)`, `accessibilityLabel` = the photo's `alt`. The counter pill bottom-right (`right-4 bottom-10`, above the panel's overlap): `rounded-full bg-scrim px-3 py-1.5`, caption white, "{n} / {count}", updated on `onMomentumScrollEnd`. Seeded stays have 4 photos.
- **Top buttons:** `IconButton variant="surface"` (56 pt white circles), absolute at the safe-area top + 8, `left-4` and `right-4`, `gap-3`:
  - Back: `ChevronLeft`, `router.back()`.
  - Share: `Share` icon. RN's built-in `Share.share({ message: "{title} in {location} on Roam" })`. No URL, since there's no public web page for a stay.
  - Save: `Heart`, filled `text-danger` when saved. Local state, like Search (saved stays don't persist yet).
- **Panel:** `bg-surface rounded-t-xl -mt-6 px-5 pt-6`, overlapping the photo.
  - **Title row:** `flex-row gap-4 items-start`. Title `title` variant, `flex-1`. Rating box `rounded-md bg-canvas px-3 py-2 items-center`: `Star` md filled primary + rating in headline, then "({reviewCount})" in caption muted regular.
  - **Location:** mt-2, `MapPin` lg + "{city}, {region}" in body medium.
  - **Features:** mt-6, 4 equal columns, each `items-center gap-2`: icon lg, label caption regular. The first 3 come from `AMENITY_BADGES` in card-badge priority (hot tub, pool, pet friendly, ocean view, fireplace, then the rest), then the stay's setting from a new `SETTING_BADGES` map (mountains `Mountain`, forest `Trees`, lake `Sailboat`, beach `Umbrella`, desert `Sun`, city `Building2`, countryside `Wheat`; labels "Forest", "Lake", …). Labels come from data, so "Wi-Fi", not the design's "Fast Wi-Fi", and "Forest", not "Forest Views".
  - **Divider:** mt-5, `h-px bg-line`.
  - **Rows:** mt-4, `gap-3`, `ListRow variant="policy"`:
    - `MessagesSquare` "Ask about policies", subtitle "Cancellation, house rules, pets, check-in and more." Opens the policies sheet.
    - `FileText`: if `freeCancellationHours > 0`, title "Free cancellation", otherwise the policy's own title ("Strict cancellation"). The subtitle is the policy `summary`, word for word. Opens the cancellation sheet.
  - **Divider**, then the **host row** (`ListRow`-like, plain): 64 pt round photo (`size-16 rounded-full`), "Hosted by {first name}" headline, `ChevronRight`. Opens the host sheet (photo, full name, bio).
  - **Divider**, then the room-counts line (caption muted) and the description paragraphs (body), `gap-3`, pb-6.
- **Footer:** pinned below the scroll view, `border-t border-line bg-surface px-5 pt-4`, safe-area bottom padding. `flex-row items-center justify-between`: "$189" in title + " / night" in body regular, and `Button` "Book this stay" (`icon={null}`, `flex-1 ml-6`). Press: `Alert.alert("Coming soon", "Booking isn't available yet.")` (RN's native alert).
- **Sheets:** one new `InfoSheet` (`src/components/stays/info-sheet.tsx`): RN `Modal` pageSheet with the filter sheet's header (title + close `IconButton X sm`) and a `ScrollView` body. The screen keeps one `sheet` state (`"policies" | "cancellation" | "host" | null`). Bodies:
  - Policies: "Check-in after {checkInTime} · Check-out before {checkOutTime}", the "House rules" heading with each rule as a line, then each Roam policy's title (headline) and body paragraphs.
  - Cancellation: the policy title as the sheet title, body paragraphs.
  - Host: photo, name, bio.
- **ListRow changes to match the design:** title moves from caption semibold to `headline`, and the subtitle from small to caption regular muted. Its only other user is `/design-system`.
- **States:**
  - Loading: a `bg-canvas` block where the photo goes, with the back button, and 3 grey bars in the panel, announced as "Loading stay".
  - Error: `Alert tone="danger"` "Couldn't load this stay. Check your connection and try again." plus `Button variant="secondary"` "Try again", with the back button.
  - Not found: headline "This stay isn't available", muted "It may have been removed.", and a secondary "Back" button.
- **Status bar:** `expo-status-bar` `style="light"` over the photo. Will check it on the phone; drop it if a photo is too bright.

### Analytics
- `stay_viewed`, sent once when the stay loads: `stay_id`, `source` (`home` | `search` | `link`), `property_type`, `setting`. No price, place, or title. Not sent on error or not-found.
- Load failures go through `posthogLogger.error("stay load failed", { source: "sanity_cdn", error_name })`.

## Out of scope

- Booking, dates, totals, availability.
- Policy Q&A (Jev + Context endpoint). The policies sheet is the stand-in.
- Saved stays that persist or sync between Search and the details screen.
- A share URL or web page for a stay.
- Fullscreen photo viewer, host profile screen, reviews list, map.

## Steps

### 1. Data hook
Add `StayDetails` type and `useStay(id)` to `src/lib/stays.ts` per Decisions. Done when tsc passes and the query, run over the CDN for 3 stays (one each with a flexible, moderate, and strict policy), returns host, policy, the 5 Roam policies, and 4 photos.

### 2. Badges and shared components
- Add `SETTING_BADGES` to `src/components/stays/amenity-icons.ts`, and let `cardBadges` take a count (default 2).
- Restyle `ListRow`.
- Add `info-sheet.tsx`.

Done when lint and tsc pass and `/design-system` still renders.

### 3. Screen and route
Add `src/app/stay/[id].tsx` with photo pager, panel, rows, sheets, footer, the three states, and `stay_viewed`. Register it in `src/app/_layout.tsx`. Done when lint and tsc pass.

### 4. Entry points
Wire Search's `ListingCard onPress` and Home's `StayCard` (pressable, `from` param). Done when both open the right stay on the phone.

### 5. Compare with the design
iPhone Mirroring, compare with `prompt-imgs/property-details.png`, list differences, fix, repeat.

## Verification

- `npx expo lint`, `npx tsc --noEmit`.
- On the phone:
  - Open a stay from Home and one from Search. Swipe photos and check the counter.
  - Share opens the native share sheet. The heart toggles. Back returns to the list.
  - Each of the 3 rows opens its sheet with text matching Sanity word for word: checked against an MCP query for the same stay.
  - A strict-policy stay shows "Strict cancellation" and its summary, not "Free cancellation".
  - "Book this stay" shows "Coming soon".
  - Loading and error states (Wi-Fi off), and not-found by opening `roam://stay/missing`.
- PostHog: `stay_viewed` arrives with only `stay_id`, `source`, `property_type`, `setting` (checked through the PostHog MCP).

## AGENTS.md updates

- Expo/Screens: `stay/[id]` is a root Stack screen in the signed-in group, pushed from Home and Search with a `from` param. It has a photo pager, policies, cancellation, and host sheets (`InfoSheet`), and a "Coming soon" Book button.
- Who owns what/App reads: `useStay(id)` fetches one stay with host, cancellation policy, and the all-stay policies in one CDN query.
- Design system: `ListRow` titles are headline, subtitles caption. `SETTING_BADGES` sits next to `AMENITY_BADGES`.
- Analytics: `stay_viewed` and its properties.
- Home's `StayCard` is pressable (remove "not pressable" from its comment).

## Result

Built as planned: `src/app/stay/[id].tsx`, `useStay` in `src/lib/stays.ts`, `InfoSheet` + `Paragraphs` in `src/components/stays/info-sheet.tsx`, `SETTING_BADGES` and a `count` on `cardBadges`, `ListRow` policy type restyled, Home and Search cards open the stay.

- **Query:** checked on the CDN for a flexible (Pine A-Frame Retreat), moderate (Desert Villa with Pool), and strict (Big Sur Cliffside Retreat) stay. Each returns host with photo, its policy, 5 Roam policies, 4 photos, and house rules. A missing id returns `null`. `amenities` is coalesced to `[]`.
- **Save heart:** a plain `Pressable` styled like `IconButton variant="surface"`, since `IconButton` has no filled or tinted icon.
- **Not verified:** the phone comparison with the design, the sheets, states, and the `stay_viewed` event. The user is testing on the phone.
