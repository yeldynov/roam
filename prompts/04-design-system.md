# 04 · Design system

Status: done

## Goal

Every screen draws from one set of tokens (`@theme` in `src/global.css`) and one set of shared components in `src/components/ui/`, matching `prompt-imgs/design.png`. A `/design-system` route previews every component in each of its states.

## Decisions

- Scope: all 15 sections of the design board (user choice).
- Tab bar: a custom JS bar built on `expo-glass-effect` `GlassView`, with the yellow active circle as designed (user choice). It falls back to `bg-glass` where liquid glass isn't available (Expo Go, Android, web). Wiring it into a real `(tabs)` navigator is out of scope here: it's previewed only.
- Toggle: React Native `Switch` tinted with `--color-primary` (user choice). It isn't wrapped beyond a `trackColor` default.
- Tokens stay in `@theme` in `src/global.css`. The draft already there was derived from the design and phone screens (`home.png`, `onboarding.png`) and is kept, plus the additions below. On-device sizes come from the phone screens, not the board's labels: the board says Display 56–64, but on a 390pt phone it measures about 40.
- Font: Plus Jakarta Sans (already in `assets/fonts/`), loaded with `useFonts` from `expo-font` in `src/app/_layout.tsx`. The splash stays up until the fonts load. Weight comes from the family (`font-bold` → `PlusJakartaSans-Bold`).
- Icons: `lucide-react-native` (already installed, pinned 1.59.0) wrapped with NativeWind's `styled(…, { className: { target: false, nativeStyleMapping: { color: true } } })`, so colors come from `text-*` token classes and never from hex. Default stroke width is 2.
- Class merging: no `tailwind-merge` (that would be a new dependency). Components split their props so classes never conflict: `variant` sets size and family, `tone` sets color, and the caller's `className` is for layout only (margins, flex, width).
- Every Pressable gets pressed feedback (`opacity-70` via the style function) and an `accessibilityRole`. Icon-only buttons require `accessibilityLabel`.
- The JS side reads token colors only through `useUnstableNativeVariable("--color-…")`, and only where a prop needs a raw color (Switch `trackColor`, TextInput `placeholderTextColor`, `cursorColor`).
- Brand wordmark "roam" and the Google "G" logo aren't in `assets/`. Placeholders: the wordmark is `Text variant="display"` in bold, marked `// placeholder: wordmark asset missing`, and the G is a lucide `Globe` icon (lucide 1.x has no brand icons), marked the same way. Both are listed under "You need to".
- ListingCard photos use a remote placeholder (`https://picsum.photos/…`) through `expo-image`, which is already installed.

### Tokens (final)

Kept from the draft: all colors, `--spacing: 4px`, radii `sm 12 / md 16 / lg 20 / xl 24 / full`, the four font families, and shadows `card` and `raised`.

Text ramp (size / line height / default family):

| token | size | lh | family | used for |
|---|---|---|---|---|
| display | 40 | 40 | bold | hero titles ("Find your next stay") |
| title | 28 | 34 | bold | section and card titles ("Modern Cabin with Hot Tub" on detail screens) |
| headline | 18 | 22 | bold | listing card title, row titles |
| body | 16 | 24 | regular | paragraphs |
| button | 17 | 20 | semibold | button labels |
| caption | 14 | 20 | medium | meta ("Lake Arrowhead, CA"), chip labels |
| small | 12 | 16 | medium | row subtitles, tab labels |

Proposed new tokens (values in the design with no token yet):

- `--color-lavender-ring: #a78bfa`: the focused input border (estimated from the image).
- `--color-ink-soft: #1c1c2e`: the selected segmented-control pill. It reads as near-ink; estimated. If it looks identical to `ink` on device, drop it and use `ink`.

### Components (`src/components/ui/`, one file each, plus `index.ts` re-exports)

| file | API | design spec |
|---|---|---|
| `text.tsx` | `Text` `variant` (ramp above, default `body`), `tone` `ink｜muted｜placeholder｜white｜success｜danger｜info｜lavender` (default `ink`), `weight?` overrides the family | RN `Text` + classes |
| `icon.tsx` | `Icon` `icon: LucideIcon`, `size` `sm 16｜md 20｜lg 24` (default `md`), `className` for `text-*` color | styled lucide |
| `button.tsx` | `Button` `variant` `primary｜secondary`, `title`, `icon?` (trailing for primary, leading for secondary), `loading`, `disabled`, `onPress` | primary: `bg-primary`, h-14 (56), `rounded-full`, centered `button` text, trailing `ArrowRight`. Secondary: `bg-surface`, `border border-line`, leading icon. Disabled `opacity-40`. Loading swaps the label for `ActivityIndicator` and keeps the a11y label |
| `icon-button.tsx` | `IconButton` `icon`, `accessibilityLabel` (required), `variant` `soft｜surface` | 56×56 `rounded-full`, `bg-canvas` (soft) or `bg-surface shadow-card` (surface), icon `lg` |
| `input.tsx` | `Input` (TextInput props) + `icon?` (leading), `trailing?` (ReactNode), `secure?` (adds eye/eye-off toggle) | h-14, `rounded-md`, `bg-canvas`, `px-4`, gap-3. Focused: `bg-lavender-soft border border-lavender-ring`. Placeholder color `--color-placeholder`, cursor `--color-lavender-ink`. Text `body` |
| `chip.tsx` | `Chip` `label`, `icon?`, `selected`, `tone` `lavender｜primary` (selected color), `size` `md｜sm` | md (filters): h-12, px-6, `rounded-full`, `bg-surface border border-line`, selected `bg-lavender` + semibold. sm (categories): h-10, px-4, `bg-canvas`, icon `sm`, selected `bg-primary` + bold. `accessibilityState.selected` |
| `badge.tsx` | `Badge` `label`, `icon?`, `tone` `primary｜success｜danger｜info｜neutral` | h-10, px-5, `rounded-full`, `bg-{tone}-soft`, text `caption` in tone color (`ink` for primary). `neutral` = `bg-canvas`, used for amenity tags ("Hot Tub") at h-8 px-3 `rounded-sm` |
| `alert.tsx` | `Alert` `tone` `success｜danger`, `message`, `onDismiss?` | h-12, px-4, `rounded-sm`, `bg-{tone}-soft`. Leading filled circle icon (`CircleCheck` / `CircleAlert`) in tone. `caption` text in tone. Trailing `X` button labelled "Dismiss" |
| `segmented-control.tsx` | `SegmentedControl` `options: {label, icon}[]`, `value`, `onChange` | track `bg-surface rounded-full p-1 shadow-card`. Selected pill `bg-ink-soft` with white icon and text, unselected ink. Each segment h-11, px-8. `accessibilityRole="tab"` |
| `stepper.tsx` | `Stepper` `value`, `min`, `max`, `onChange` | `bg-surface border border-line rounded-full h-12 px-4`, `Minus` / value (`headline`) / `Plus`. Ends disable at min/max. Labelled "Decrease" / "Increase" |
| `toggle.tsx` | `Toggle` = RN `Switch` with `trackColor={{ true: primary }}` | native |
| `list-row.tsx` | `ListRow` `icon`, `title`, `subtitle?`, `variant` `policy｜plain`, `onPress` | policy: `bg-lavender-soft rounded-md p-4`, 44 icon tile `bg-white rounded-sm` with `text-lavender-ink` icon, `headline`-ish title (`caption` semibold ink) + `small` muted subtitle, `ChevronRight` lavender-ink. plain (profile): no bg, py-4, icon `lg` ink, `caption` title, muted `ChevronRight`, hairline `border-b border-line` between rows (applied by the parent) |
| `listing-card.tsx` | `ListingCard` `image`, `title`, `location`, `rating`, `reviews`, `amenities: {label, icon}[]`, `price`, `saved`, `onToggleSave`, `onPress` | horizontal: 160×160 `rounded-md` image with a 32 white circle heart top-right. Right column gap-2: `headline` title (2 lines), `MapPin` + muted caption location, `Star` (filled primary) + rating `caption` ink + `(342)` muted, neutral Badges, `$280` `title`-weight bold 20 + `/ night` muted caption. Card `bg-surface rounded-lg p-3 shadow-card` |
| `tab-bar.tsx` | `TabBar` `tabs: {key, label, icon}[]`, `active`, `onChange` | `GlassView` `rounded-full`, h-18 (72), px-2, row of equal tabs. Each tab is an icon `lg` above a `small` label. Active tab: 64 circle `bg-primary` behind it, with ink icon and label. Fallback: `bg-glass border border-white shadow-raised` |

Every color, size, radius, and shadow above maps to a token. Spacing uses the 4px scale (`p-4` = 16).

## Out of scope

- Real navigation tabs and the actual screens (home, search, and so on).
- Dark mode (the app is light only).
- Animations beyond pressed opacity.
- Real wordmark and Google logo assets (placeholders until provided).

## Steps

### 1. Tokens and fonts

- `src/global.css`: add `--color-lavender-ring` and `--color-ink-soft`. Keep the rest of the draft.
- `src/app/_layout.tsx`: `useFonts` with the four `PlusJakartaSans-*.ttf` files, keyed by family name, and `SplashScreen.preventAutoHideAsync()` / `hideAsync()` once loaded. Return `null` until then.
- `src/app/index.tsx`: remove the smoke-test classes that don't exist (`text-orange-600`, and the stray `bg-primary`, `rounded-md`, and `shadow-card` on the root).

Done when the app boots, text renders in Plus Jakarta, and tsc and lint pass.

### 2. Text and Icon

`src/components/ui/text.tsx`, `icon.tsx`, and `index.ts`. Done when `<Icon icon={Heart} className="text-danger" />` renders red, proving the styled mapping.

### 3. Controls

`button.tsx`, `icon-button.tsx`, `input.tsx`, `chip.tsx`, `badge.tsx`, `alert.tsx`, `segmented-control.tsx`, `stepper.tsx`, `toggle.tsx`, built to the spec table.

### 4. Composites

`list-row.tsx`, `listing-card.tsx`, `tab-bar.tsx`.

### 5. Preview route

`src/app/design-system.tsx`: a `ScrollView` on `bg-canvas` with one white `rounded-xl p-5` section per design-board section (01–15, same titles and the same sample copy as the board), showing every variant and state (input default, focused, and password; chip selected and unselected; button loading and disabled). Use local state so chips, segmented control, stepper, toggle, and tabs respond to taps. Add a `Link` to `/design-system` from `index.tsx`.

## Verification

- `npx tsc --noEmit` and `npx expo lint` pass.
- `grep -rnE "#[0-9a-fA-F]{3,8}|fontSize|fontFamily" src --include=*.tsx` returns nothing. Hex values appear only in `global.css`.
- iPhone Mirroring: open `/design-system`, compare each section with `design.png`, list the differences, fix them, and re-capture. Ask the user to tap through the chip, segmented, stepper, toggle, and tab states, and to focus the input.
- Font proof: the bold "Find your next stay" shows Plus Jakarta's single-story `a`, which the system font doesn't have.

## AGENTS.md updates

The design-system line under "Who owns what" already exists in the working tree. Add to it: components split `variant` / `tone` / `className` (layout only) because there is no class merging; and raw colors in JS come only from `useUnstableNativeVariable`.

## Result

Built as planned: tokens in `src/global.css`, fonts in `src/app/_layout.tsx`, and 14 components in `src/components/ui/`, all previewed on `/design-system`. Deviations and fixes found while verifying:

- Line heights are unitless ratios (`1.2222` and so on, with the pt value in a comment), not px. The native compiler drops `px`, and the runtime multiplies a bare number by the font size, so `22px` rendered as 396pt.
- Raw colors in JS go through a `styled(…, { className: { target: false, nativeStyleMapping: { color: true } } })` base (`Icon`, `Toggle`), not `useUnstableNativeVariable`, which throws on web. On web, that mapping passes an RN-web style object in `className` instead of a color; `Icon` forwards it as `style`, and the web Switch keeps its default track.
- `Chip` picks its idle or selected colors exclusively. Two `bg-*` classes together resolve by stylesheet order, not by position.
- `ListingCard`'s save button overlays the card as a sibling (nested buttons are invalid).
- The tab bar's active circle wraps the icon instead of sitting absolutely behind it (on web it painted over the icon).
- Checked on web only (Chrome). Not yet compared on the iPhone's native build.
- Follow-up: the wordmark is now `Wordmark` (`src/components/ui/wordmark.tsx`), generated from the Plus Jakarta Sans Bold outlines with tracking -40 and a 36-unit stroke for extra weight. The source asset is `assets/images/roam-wordmark.svg`. The Google "G" is still a placeholder.
- Follow-up: Display and Title use Plus Jakarta Sans ExtraBold (800, downloaded from tokotype/PlusJakartaSans v2.071) with -3% and -2% tracking (`--text-*--letter-spacing` in px), matching the board's weight. The board's "Bold" label undersold it. Preview section titles are SemiBold.
