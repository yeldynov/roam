# 05 · Onboarding

Status: approved

## Goal

On launch, guests see three swipeable onboarding slides that match `prompt-imgs/onboarding.png`. Get started, Continue with Google, and Skip take them into the auth flow, which is a stub `/sign-up` screen until the auth plan lands.

## Decisions

- Three slides (user choice). Slide 1 is the design. Slides 2 and 3 reuse its layout with new photos and copy. Get started moves to the next slide, and on the last slide it opens `/sign-up`.
- Auth target: a stub `src/app/sign-up.tsx` (user choice). The real "Create your account" screen (`prompt-imgs/auth.png`) and Clerk are a separate plan. Continue with Google also opens `/sign-up` for now.
- Skip goes to `/sign-up` from any slide (user choice).
- Google logo: the user added `assets/images/Google.svg` (user choice). It renders through `expo-image`, which supports SVG on iOS, Android, and web. Metro's default `assetExts` already includes `svg` (checked: `getDefaultConfig().resolver.assetExts.includes('svg') === true`), so there's no new dependency or metro change. The SVG has two `<filter>` elements. If iOS drops them, the G still renders, just without the soft blur: check on device.
- Onboarding replaces the placeholder `src/app/index.tsx`, so it's the launch screen. `/design-system` stays reachable at `roam://design-system`. The placeholder's link to it goes away.
- Onboarding shows on every launch for now. "Seen onboarding" or "signed in" gating needs storage or Clerk, so it comes with the auth plan.
- Slides are a horizontal `FlatList` with `pagingEnabled`. Each page holds its own photo, location pill, and sheet text, including progress bars that show that page's index, so the bars swipe with the content. The wordmark, Skip, and both buttons are a fixed overlay. The index comes from `onMomentumScrollEnd` (`Math.round(x / width)`).
- Photos are remote Unsplash URLs through `expo-image` (`contentFit="cover"`, `transition={200}`), requested at `?w=1200&q=80&auto=format&fit=crop`. All three return HTTP 200 (checked):
  1. `photo-1510798831971-661eb04b3739`: lakeside lodge with lit windows, snowy pines, mountains. Pill: "Emerald Lake, BC".
  2. `photo-1601918774946-25832a4be0d6`: A-frame cabin in tall pines with warm string lights on the porch. Pill: "Cascade Mountains, WA". (Replaced twice: the golden-hour cabin was mostly blank sky at phone crop, and the user wanted something cozier than Lago di Braies.)
  3. `photo-1520250497591-112f2f40a3f4`: tropical villa pool under karst cliffs. Pill: "Krabi, Thailand".
  The pill places are sample copy. The design's own pill reads "Whistler, BC" over its own photo, so slide 1 uses a place that fits the Unsplash photo instead.
- Copy:
  1. "Find a stay that fits your story" / "From mountain cabins to oceanfront villas, roam helps you find unforgettable stays for every kind of trip." (from the design)
  2. "Describe it in one line" / "Try “quiet pet friendly cabin with a hot tub under $300 a night” and get stays ranked for you."
  3. "Answers from the source" / "Ask about check-in, pets, or cancellations and see the stay's own policy, word for word."
- Primary yellow: the design's button reads a little more orange than `--color-primary` (#ffc629), while `auth.png` matches the token. Keep the token and don't add a new one.

### Layout (pt on a 390×844 phone; estimated from the image at about 1.615 px/pt)

- **Photo:** top 62% of the screen (`height * 0.62`), behind everything, on a `bg-ink-soft` page. The sheet covers everything below about 56%, so cropping to the visible area keeps each photo's subject in view.
- **Top bar** (fixed overlay, `absolute` top at `insets.top + 12`, `px-6`, row, space-between, items-center):
  - `Wordmark size="md"` (32 tall, about 124 wide; the design measures 31×132), ink.
  - Skip: pill `h-10 px-5 rounded-full`, `GlassView` with the tab-bar fallback (`bg-glass border border-white shadow-raised` when liquid glass isn't available). Label `Text variant="caption" weight="semibold"`. `accessibilityRole="button"`, label "Skip".
- **Location pill** (per page, bottom-left, `left-6`, sits 16 above the sheet's top-left): `h-10 px-4 gap-2 rounded-full flex-row items-center`, `bg-scrim border border-glass-line` (new tokens below). `Icon MapPin size="sm" filled className="text-white"`. Label `Text variant="caption" tone="white"`. Filled lucide `MapPin` also fills the pin's hole, while the design shows a hole. This is a known small difference.
- **Sheet** (per page, `absolute bottom-0 inset-x-0`):
  - Curved top: a `react-native-svg` `Path`, full width × 56, `preserveAspectRatio="none"`, `viewBox="0 0 390 56"`, `d="M0 56 V28 Q0 4 28 4 C160 0 300 14 360 34 Q390 44 390 56 Z"`. The top-left starts high with a rounded corner and slopes down to the right edge. Fill comes from `text-surface` through the same `styled(…, { nativeStyleMapping: { color: true } })` pattern as `Wordmark`, never hex.
  - Body `bg-surface px-6`, sitting under the curve (the sheet's left top edge is about 470 from the screen top on 844).
  - Progress: row `gap-2`, three bars `h-1 w-8 rounded-full`. Active `bg-lavender-ring`, others `bg-line`. `accessibilityLabel="Slide N of 3"`.
  - Title `Text variant="display"`, `mt-5`.
  - Body `Text variant="body" tone="muted"`, `mt-2`. Every title must wrap to two lines on a 390pt phone: the sheet grows with its text, so a three-line title raises the sheet by 40. The design's line height looks closer to 20 than 24 (estimated). Keep the `body` token.
  - Spacer equal to the fixed button block height, so the text never sits under the buttons.
- **Buttons** (fixed overlay, `absolute bottom-0 inset-x-0 px-6 gap-3`, `paddingBottom: insets.bottom + 8`):
  - `Button title="Get started"` (primary, h-14, trailing arrow: already the default). The design measures about 50 tall. Keep the component's 56.
  - `Button variant="secondary" title="Continue with Google" leading={<GoogleLogo />}`.

### New tokens (`src/global.css` `@theme`)

- `--text-lead: 16px` with line height `1.25` (20): the onboarding body copy, which the design sets tighter than `body` (user choice, added after the first device check). `Text variant="lead"`.
- Button height drops from 56 to 52 (`h-13`) app-wide, closer to the design's ~50 (user choice).

- `--color-scrim: rgba(11, 11, 26, 0.45)`: the dark translucent location pill (estimated).
- `--color-glass-line: rgba(255, 255, 255, 0.4)`: the pill's light hairline (estimated).

## Out of scope

- The real auth screen, Clerk, and the Google OAuth flow.
- Remembering that onboarding was seen, and redirecting signed-in guests.
- Analytics events.
- Animated progress bars and parallax: the bars change on page settle.

## Steps

### 1. Tokens, Google logo, Button `leading`

- `src/global.css`: add `--color-scrim` and `--color-glass-line` (values above) to the colors in `@theme`.
- `src/components/ui/google-logo.tsx`: `GoogleLogo({ size = 24 })` renders `expo-image` `Image` with `source={require("@/assets/images/Google.svg")}`, `style={{ width: size, height: size }}`, and `accessibilityElementsHidden` (the button already carries the label). Export it from `index.ts`.
- `src/components/ui/button.tsx`: add `leading?: ReactNode`, rendered before the label on secondary in place of `icon` when given. Keep the existing `icon` behavior.
- `src/app/design-system.tsx`: replace the `Globe` placeholder on "Continue with Google" with `leading={<GoogleLogo />}`, and remove the placeholder comment and the unused `Globe` import.

Done when `/design-system` shows the real G, and tsc and lint pass.

### 2. Sign-up stub and navigation

- `src/app/sign-up.tsx`: `bg-canvas`, safe-area padding, `px-6`. Top row: `IconButton icon={ChevronLeft} variant="surface" accessibilityLabel="Back"` calling `router.back()`, and `Wordmark` on the right. Then `Text variant="display"` "Create your account" and `Text tone="muted"` "Sign-up arrives with the auth flow." Mark it `// stub: replaced by the auth plan`.
- `src/app/_layout.tsx`: keep `<Stack>`, and add `<Stack.Screen name="index" options={{ headerShown: false }} />` and the same for `sign-up`.

Done when `roam://sign-up` shows the stub and Back returns.

### 3. Onboarding screen

- `src/app/index.tsx`: replace the placeholder with the onboarding screen described under Layout. Keep the slide data (photo URL, place, title, body) in a `const` array in the file. `useSafeAreaInsets` from `react-native-safe-area-context`. `useWindowDimensions` for page width.
- The curved sheet top is a small styled-SVG component in the same file: one use, so it stays local.
- Get started: `listRef.current?.scrollToIndex({ index: i + 1 })` when `i < 2`, else `router.push("/sign-up")`. Skip and Google: `router.push("/sign-up")`.
- If the photo fails to load, the page shows `bg-ink-soft` behind it (set on the page view), so the white sheet and text stay readable.

Done when all three slides swipe, the bars track the page, and every button lands on `/sign-up`.

## Verification

- `npx tsc --noEmit` and `npx expo lint` pass.
- On the iPhone through iPhone Mirroring (user runs `npx expo start`), compare slide 1 with `prompt-imgs/onboarding.png`: wordmark position and size, Skip pill, location pill, curve shape, bar sizes and colors, title wrap ("Find a stay that / fits your story"), body color, button heights and gap, bottom inset. List every difference, fix, and repeat.
- Swipe to slides 2 and 3: the bars move and the copy fits above the buttons without overlap.
- Get started on slides 1 and 2 advances. On slide 3 it opens sign-up. Skip and Google open sign-up from any slide. Back returns to onboarding.
- Airplane mode: the photo falls back to the dark background, and the text and buttons still work.
- `/design-system` shows the real Google G.

## AGENTS.md updates

- **Design system:** `GoogleLogo` (`assets/images/Google.svg` via `expo-image`, no SVG transformer) is the Google mark. `Button` takes `leading` for a non-lucide leading element.
- **Routes** (Expo section): `index` is onboarding and `sign-up` is a stub until the auth plan. Onboarding shows on every launch until auth adds gating.
