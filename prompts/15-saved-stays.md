# 15 · Saved stays

Status: done

## Goal

A guest's saved stays stick to their account. A heart saved on Search shows filled on the stay screen, after relaunch, and on another device, and the Trips tab lists every saved stay.

## Decisions

- Storage is Clerk `user.unsafeMetadata.saved`, a map `{ [stayId]: savedAtISO }`. Clerk's `unsafeMetadata` is readable and writable only by the signed-in user through the Frontend API. It isn't in the session token, and it's deleted with the account. There's no API route, no secret key, and no new service or dependency, and it works in Expo Go. Compared with the alternatives (privateMetadata through an API route, a private Sanity dataset, Supabase or Convex, device-only storage), it's the only one that needs no hosting, since `web.output` is `"static"`. A real database comes when bookings do.
- Writes use `user.updateMetadata({ unsafeMetadata: { saved: { [id]: new Date().toISOString() } } })` to save and `{ saved: { [id]: null } }` to unsave (`@clerk/expo` 4.13; deep merge, and `null` removes the key; `user.update({ unsafeMetadata })` is deprecated per https://clerk.com/docs/guides/development/upgrading/upgrade-guides/2026-05-12). Because a map deep-merges, two devices toggling different stays never overwrite each other, which a plain array would.
- Capacity: Clerk metadata is 8 KB in total, shared with plan 14's `homeCity`. Stay IDs are 22 characters, so one entry is about 47 bytes and the map holds about 170 stays. Past 150 saved, saving shows the native alert "You've saved the maximum number of stays. Remove one to save another." (`ponytail:` ceiling; move to a database with bookings).
- Shared state is `useSaved()` in `src/lib/saved.ts`. It reads `useUser().user.unsafeMetadata.saved` (with `{}` while loading) and returns `{ isSaved(id), toggle(id, source), ids }` with `ids` newest first. `toggle` flips local optimistic state at once, then calls `updateMetadata`. On failure it reverts, logs `posthogLogger.error("stay save failed", { error_name })`, and shows the existing `Alert` toast "Couldn't update saved stays. Try again." (or the native alert if the screen has no toast). Clerk re-renders `useUser` after the write, so the optimistic override clears once the metadata matches. Taps on the same stay while its write is pending are ignored.
- Hearts: Search's `ListingCard` and the stay screen's top-bar heart use `useSaved()` in place of their local state. Home's `StayCard` gets no heart (the design stays as it is).
- Trips tab: a "Saved" section lists saved stays as `ListingCard`s, newest saved first. Tapping a card pushes `stay/[id]` with `from=saved`, and the heart unsaves (the card leaves the list through `Reflow`). Bookings don't exist yet, so the old stub copy moves under a "Trips" heading as one muted line.
- Saved cards are fetched by `useSavedStays(ids)` in `src/lib/stays.ts`: `*[_type == "property" && _id in $ids]` with the `SearchStay` projection (export `PROJECTION` from `src/lib/search.ts`), ordered in code by `ids`. It refetches when the set of IDs changes, not when only the order or timestamps do. A saved ID with no published stay is dropped from view (not deleted from metadata).
- Trips states: loading (skeleton cards like Search), error (the existing retry pattern), empty ("No saved stays yet" / "Tap the heart on a stay to save it here." with the `Heart` icon), and list.
- Analytics: `stay_saved` and `stay_unsaved` keep `stay_id` and add `source: "search" | "stay" | "trips"`. They're sent after the write succeeds, not on tap. `stay_viewed` `source` gains `"saved"`. No saved list or count goes to PostHog.

## Out of scope

Hearts on Home cards, named wishlists or collections, saving while signed out, sharing a saved list, a saved count on Profile (plan 14 keeps the stats card hidden), migrating to a database, and cleaning up IDs of deleted stays.

## Steps

### 1. `useSaved` hook

Create `src/lib/saved.ts` with the type `SavedMap = Record<string, string>` and `useSaved()` as described in Decisions, built on `useUser()` from `@clerk/expo` and `user.updateMetadata`. Keep it free of UI imports except the toast and alert callback the caller passes, or use `Alert.alert` from `react-native` for the cap message. Plan 14 is mid-build and also writes `unsafeMetadata.homeCity`; deep merge keeps the two keys apart, so don't touch `src/lib/account.ts` or `profile.tsx`.
Done when: `npx tsc --noEmit` passes.

### 2. Hearts on Search and the stay screen

In `src/app/(tabs)/search.tsx`, remove the `saved` `Set` state and use `useSaved()`; `onToggleSave` calls `toggle(s.id, "search")`. In `src/app/stay/[id]/index.tsx`, remove the `saved` boolean in `Details` and use `useSaved()` with `toggle(stay.id, "stay")`. Move the `stay_saved` and `stay_unsaved` captures into the hook (after a successful write). Widen the `from` param type to include `"saved"`.
Done when: a save on Search shows filled on the stay screen, and both survive a reload.

### 3. Saved stays on Trips

Add `useSavedStays(ids: string[])` to `src/lib/stays.ts` (same shape as `useStays`: `stays`, `error`, `loading`, `retry`), and export `PROJECTION` from `src/lib/search.ts`. Rewrite `src/app/(tabs)/trips.tsx`: the first child is a `ScrollView` with `contentInsetAdjustmentBehavior="automatic"` and the Android top inset (copy the pattern from `profile.tsx`), a `title` "Trips" heading with the muted line "Stays you book will show up here.", then a `headline` "Saved" section with the states from Decisions. Rows use `ListingCard` (`imageUrl(s.image, 400)`, `cardBadges(s, [])`) inside `Reflow` with `unstable_pressDelay={80}`. Use only existing components and tokens; there's no design, so no new tokens.
Done when: Trips shows saved stays newest first, and unsaving one removes it.

## Verification

1. `npx expo lint` and `npx tsc --noEmit` pass.
2. Save two stays on Search. The stay screen shows both filled, and Trips lists them newest first.
3. Reload the app (`r`). Hearts and Trips are unchanged.
4. Sign out, then sign back in. The saves are still there. Sign in as a second account and check that it has none.
5. Unsave from the stay screen, then from Trips. Search's heart updates, and the Trips card leaves.
6. Airplane mode: tap a heart. It reverts and shows the error toast, and `stay save failed` is in PostHog logs.
7. Check in the Clerk dashboard (or `npx clerk@latest api /users/<id>`) that `unsafe_metadata.saved` holds the IDs and `homeCity` is untouched.
8. PostHog: `stay_saved` and `stay_unsaved` carry `source`; `stay_viewed` from Trips has `source=saved`; no event carries a list or count. Record the baseline: `stay_saved` per weekly active user over the 30 days before ship.
9. Success metric: the share of guests who send `stay_viewed` with `source=saved` in a later session. Failure signal: `stay save failed` logs, or saves with no later `source=saved` views.
10. End to end on the iPhone: save on Search → open from Trips → unsave → relaunch → Trips is empty with the empty state.

## AGENTS.md updates

- Who owns what, **Auth**: Clerk also holds the guest's saved stays in `unsafeMetadata.saved` (`{ [stayId]: savedAtISO }`, written only with `user.updateMetadata`, about 150 max). Move to a database when bookings arrive.
- Expo, screens: Trips lists saved stays (newest first) under "Saved"; hearts on Search and the stay screen share `useSaved()` (`src/lib/saved.ts`).
- Analytics: `stay_saved` and `stay_unsaved` carry `stay_id` and `source` (`search`, `stay`, `trips`) and are sent after the write succeeds; `stay_viewed` `source` adds `saved`.
- Replace the line "Trips and Profile are stubs" with the new Trips description.

## Result

Built as planned in `src/lib/saved.ts` (new), `src/lib/stays.ts` (`useSavedStays`), `src/lib/search.ts` (exported `PROJECTION`), `src/app/(tabs)/search.tsx`, `src/app/stay/[id]/index.tsx` and `src/app/(tabs)/trips.tsx`. Write failures use the native alert (the `Alert` component is inline, not a toast). Lint, type check and the live GROQ query passed; the on-device checks (Verification 2–8, 10) haven't been run yet.
