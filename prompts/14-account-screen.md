# 14 · Account screen

Status: done

## Goal

The Profile tab becomes the account screen from the design. Guests can edit their name, photo, and home city, see their signed-in devices and sign the others out, sign out, and delete their account in the app.

## Decisions

- Clerk owns all account data and actions. Everything runs on the guest's session through `@clerk/expo` 4.13 (checked in `node_modules/@clerk/shared/dist/types/user.d.mts` and `session.d.mts`). There's no API route and no secret key.
- Profile editing covers the first name, last name and photo. The photo uses `expo-image-picker` (new dependency, an Expo module that works in Expo Go). The picked image goes to `user.setProfileImage({ file })` as a base64 data URL (`file: Blob | File | string`).
- The home city is free text in `user.updateMetadata({ unsafeMetadata: { homeCity } })`. `user.update({ unsafeMetadata })` is deprecated in 4.13. The line is hidden when empty, and the city never goes to PostHog.
- The stats card (Trips, Saved, Rating) and the "Roam Explorer" badge stay hidden until there's data for them.
- The gear opens `/account/settings`, which holds Devices, Sign out and Delete account. Personal info opens `/account/personal-info`.
- Payment methods and Notifications show the alert "Coming soon". Help & support opens `mailto:` to the support address. The Trips row opens the Trips tab (`router.navigate("/trips")`).
- The cancellation banner title is "Free cancellation". The design's subtitle "Full refund up to 7 days before check-in" matches no Roam policy. The real ones are Flexible 24 h, Moderate 5 days, and Strict with a 50% refund up to 7 days. So the subtitle becomes "See how cancellation works on Roam" and the banner opens an `InfoSheet` listing the three cancellation policies (title, `summary`, `body`, word for word), ordered by `freeCancellationHours desc`.
- Sessions use `user.getSessions()`, which lists device type, browser, city and `lastActiveAt` per session. This device is marked and can't be revoked here. Every other session gets "Sign out", which calls `session.revoke()`. Multi-session is off in Clerk, so there's no account switching.
- Deletion uses `user.delete()`, behind a native `Alert.alert` confirmation (destructive "Delete account" or "Cancel") and then reverification. After it succeeds the guard flips to onboarding, so the code never calls `router.replace`. If `user.deleteSelfEnabled` is false, the row is hidden.
- Clerk requires reverification (10-minute window) for `revoke()` and `delete()`. Wrap both in `useReverification(fn, { onNeedsReverification })`, which supplies `level`, `complete` and `cancel`. The custom `ReverifySheet` runs `session.startVerification({ level })`, then `session.prepareFirstFactorVerification({ strategy: "email_code", emailAddressId })`, then `attemptFirstFactorVerification({ strategy: "email_code", code })`, then `complete()`. Closing the sheet calls `cancel()`. Email code works for Google/Apple guests who have no password. The 6-digit input copies the hidden-input boxes from `src/app/verify.tsx`.
- Sign out keeps `signOut()` and the existing `user_signed_out` event.
- Analytics (no names, email, city, or device data): `profile_updated { fields: ("name"|"photo"|"city")[] }`, `session_revoked`, `account_deletion_started`, `account_deletion_cancelled { step: "confirm"|"reverify" }`, `account_deleted` (captured and flushed before `delete()` resolves the guard).
- Known gap: deleting the account leaves the PostHog person (email and name from `identify`). Deleting it needs a PostHog personal key on a server, which is for later.

## Out of scope

Stats, badge, trips/saved counts, guest rating, payment methods, notification settings, email or password change, account switching, deleting the PostHog person, and Clerk's native `UserProfileView` (needs `@clerk/expo-native-components` and a dev build).

## Design

Source: `prompt-imgs/profile.png` (≈2× scale, so every pt value is estimated from the image). It uses the white `bg-surface` screen and the native tab bar, Profile selected.

1. **Header row:** `Wordmark size="hero"` on the left, `IconButton` (soft, `size="sm"`, `Settings` icon) on the right, centered vertically, `px-5`, same top as Home.
2. **Profile card:** `bg-canvas rounded-xl p-4`, row with `gap-4`.
   - Avatar is a circle of about 104 (`size-26 rounded-full`), using the `imageUrl` from `expo-image`.
   - Right column, vertically centered: name in `Text variant="title"`. Under it, when a city is set, `MapPin` (muted, sm) plus the city in `Text tone="muted"` (body).
   - The badge is hidden (see Decisions).
3. **Stats card:** hidden.
4. **Section groups** "Account" and "Preferences", `mt-4` apart:
   - Outer `bg-canvas rounded-xl p-2`, title `Text variant="headline"` with `px-3 pt-3 pb-2`.
   - Inner `bg-surface rounded-lg px-3`.
   - Rows are about 50 tall: icon tile (`size-10 rounded-md bg-canvas`, icon `lg` ink), title in `Text` body, `ChevronRight` at the end.
   - Dividers are `border-line`, inset to start after the tile, with no divider under the last row.
   - Account: Personal info (`User`), Payment methods (`CreditCard`), Trips (`Briefcase`). Preferences: Notifications (`Bell`), Help & support (`CircleHelp`).
5. **Banner:** `ListRow variant="policy"` (lavender-soft card, lavender-ink chevron) with icon `FileText` and the title and subtitle above. The design shows the icon bare, with no white tile behind it, so it adds `ListRow` `iconTile={false}`.
6. **Settings and Personal info** have no design. They use the root Stack header (`headerShown: true`, titles "Settings" and "Personal info") and the same section-group styling.
   - Settings: a "Devices" group, one row per session (`Smartphone`/`Monitor` icon, "iPhone · Safari", caption "This device" or "San Francisco · 2 days ago", trailing `Button variant="secondary" size sm` "Sign out" for other sessions). Under it, `Button variant="secondary" icon={LogOut}` "Sign out". At the bottom, a danger-toned "Delete account" row.
   - Personal info: tappable avatar with a "Change photo" link, `Input label` fields First name, Last name, Home city, email shown read-only as muted text, and a primary `Button` "Save" (disabled until something changes, loading while it saves), with errors through `Alert tone="danger"` and `authMessage`.

New UI pieces:
- `ListRow variant="menu"` (tile row).
- `ListRow` `iconTile` prop.
- `ListRow tone="danger"`.
- `ListGroup` (titled section card that draws the inset dividers).

All of them use existing tokens. No new tokens are proposed.

## Steps

### 1. UI pieces

Add `ListGroup` (`src/components/ui/list-group.tsx`, export from `index.ts`). Extend `ListRow` with `variant="menu"`, `iconTile` (default true, policy only) and `tone="danger"` (text-danger title and icon). Add all of them to `/design-system`.
Done: the design-system screen shows a group like the design, and lint and tsc pass.

### 2. Profile tab

Rewrite `src/app/(tabs)/profile.tsx` to the design (Design 1, 2, 4 and 5).
- The first child is a `ScrollView` with `contentInsetAdjustmentBehavior="automatic"`, and Android adds the top inset by hand.
- While `useUser` is loading it shows a canvas skeleton card.
- Row actions follow Decisions. The banner reads cancellation policies through a new `useCancellationPolicies()` in `src/lib/stays.ts` (`sanityFetch`, `*[_type=="policy" && kind=="cancellation"] | order(freeCancellationHours desc){title, summary, body}`). The sheet shows loading, an error with retry, and an empty state.
- The support email comes from the `SUPPORT_EMAIL` constant, in `src/lib/ask.ts` next to `NO_ANSWER`: `yeldynov@gmail.com`.
Done: the screen matches the design minus the hidden parts, and the rows behave as decided.

### 3. Personal info

Run `npx expo install expo-image-picker` and add its photo permission text through the config plugin in `app.json`. Create `src/app/account/personal-info.tsx` and register it in the signed-in `Stack.Protected` in `src/app/_layout.tsx` with a header.
- Saving calls `user.update({ firstName, lastName })` when either changed, `user.updateMetadata({ unsafeMetadata: { homeCity } })` when the city changed (trimmed, empty becomes `null`), and `setProfileImage` for a new photo (picker `base64: true`, square crop, quality 0.7, sent as `data:image/jpeg;base64,…`).
- It captures `profile_updated` with only the field kinds.
Done: edits show on Profile right after saving and survive an app restart.

### 4. Reverification sheet

Create `src/components/account/reverify-sheet.tsx` (RN `Modal` pageSheet like `InfoSheet`) and a `useReverifiedAction` hook, both in `src/lib/account.ts`. The hook wraps `useReverification` and drives the sheet (Decisions).
- Errors go through `authMessage`, and there's a "Resend code" link.
- Sheet copy: title "Confirm it's you", body "We sent a code to {email}."
Done: calling a wrapped no-op twice asks for a code the first time and not the second, within 10 minutes.

### 5. Settings: devices, sign out, delete

Create `src/app/account/settings.tsx` (registered like step 3).
- Load `user.getSessions()` on focus, current session first (`session.id === useSession().session?.id`), with loading, error-with-retry, and only-this-device states.
- Revoking goes through the reverified action, then reloads the list.
- Sign out works as today.
- Delete: confirm alert (`account_deletion_started`), then the reverified `user.delete()`, then `account_deleted` with `posthog.flush()` awaited before the call. On cancel, `account_deletion_cancelled`.
Done: a second device's session disappears and that device lands on onboarding on its next request. Deleting the test account lands on onboarding, the user is gone in Clerk, and signing in with it fails.

### 6. Wire the gear

Header gear → `router.push("/account/settings")`, and Personal info row → `/account/personal-info`.
Done: both push with a back button to Profile.

## Verification

- `npx expo lint` and `npx tsc --noEmit` pass.
- On the iPhone through iPhone Mirroring, compare Profile with `prompt-imgs/profile.png` and list every difference. The expected differences are the hidden stats and badge, the banner subtitle, and a bare city line.
- Profile: name, photo and city edits, an empty city (line hidden), a Google-only account (photo from Google, editable), and save errors with no network.
- Devices: sign in on a second device (or simulator or web) and revoke it from the phone. Reverification appears once, the device list updates, and the code sheet's Cancel leaves both sessions.
- Delete a throwaway account end to end. Check in the Clerk dashboard (`npx clerk@latest` users list) that it's gone.
- PostHog (`posthog:exec`): the five events arrive with only the listed properties, and no name, email, city or device in any of them.
- Flip the deletion toggle off. The Delete row disappears.

## AGENTS.md updates

- Expo screens: replace "Trips and Profile are stubs; Sign out is on Profile" with the Profile layout, `account/settings` (Devices, Sign out, Delete) and `account/personal-info`, as signed-in root Stack screens with headers.
- Auth: account edits use `user.update`, `user.updateMetadata` (home city in `unsafeMetadata.homeCity`) and `setProfileImage`. Sensitive actions (`session.revoke`, `user.delete`) go through `useReverifiedAction` (email-code `ReverifySheet`). The self-delete dashboard toggle gates the Delete row.
- Analytics: the account events and their properties, and the PostHog-person-on-delete gap.
- Design system: `ListGroup`, `ListRow variant="menu"`, `iconTile` and `tone="danger"`.

## Result

Built as planned, with lint, tsc and expo-doctor (the two pre-existing failures only) passing. Clerk's environment confirms `delete_self` is on and `email_code` is a first factor. Changes from the plan:
- The device "Sign out" is an underlined text action, since `Button` has no small size.
- The reverify hook lives with its sheet in `src/components/account/reverify-sheet.tsx`, because data files import no UI.
- `account_deleted` is captured after `delete()` succeeds, then flushed.
- `verify.tsx` now uses the shared `CodeInput`.

Not yet checked on a device: the iPhone comparison, revoking a session, and deleting an account end to end.
