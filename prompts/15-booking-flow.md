# 15 · Booking flow

Status: built, deploy pending

## Goal

A signed-in guest picks dates and a guest count on a stay, sees the server's final price, pays with Stripe's native PaymentSheet, and gets a booking that exists only after Stripe confirms the payment. Confirmed bookings show on the Trips tab.

## Decisions

### Services and dependencies (approved in the brief)
- Payment: Stripe PaymentSheet with a PaymentIntent. App: `@stripe/stripe-react-native` (Expo SDK 57 recommends 0.64; it's in Expo Go for cards; Apple/Google Pay need a dev build and are out of scope). Server: `stripe` (Node SDK v23, API version `2026-09-30.endive`, `new Stripe(key, { httpClient: Stripe.createFetchHttpClient() })` because EAS Hosting runs on Cloudflare Workers).
- Bookings live in a new **private Sanity dataset `bookings`** in project `crc5fllu`. Never `production` (public). The app never reads it. Only API routes do, with a server token. Roam's Studio doesn't show it (no workspace for it in this plan).
- API routes run on **EAS Hosting**: `web.output` becomes `"server"`, and the `expo-router` plugin gets `origin` set to the hosting URL so native `fetch("/api/...")` resolves in production. In dev the dev server serves them.
- Clerk session check in every booking route with `@clerk/backend` `createClerkClient({ secretKey, publishableKey }).authenticateRequest(request, { jwtKey: CLERK_JWT_KEY })` (networkless). The app sends `Authorization: Bearer <await getToken()>`. `authorizedParties` stays unset because native session tokens carry no web origin (note in code).
- Server Sanity access is plain `fetch` like `src/lib/sanity.ts` (no client library): `https://crc5fllu.api.sanity.io/v2026-10-21/data/query/<dataset>` and `/data/mutate/bookings` with `Authorization: Bearer SANITY_BOOKINGS_TOKEN`. Stay prices are read from `production` through `api.sanity.io` (not `apicdn`) so price edits apply right away.

### Pricing and validation (pure code, `src/lib/booking.ts`, shared by app and server)
- Dates are `YYYY-MM-DD` strings. `checkIn >= today (UTC)`, `checkOut > checkIn`, 1 to 28 nights. `1 <= guests <= stay.maxGuests`. Stays have no timezone field, so UTC "today" is the rule (known ceiling: a guest west of UTC late at night can't pick their local today).
- Total = `nights × nightlyPrice` in whole USD, charged as `total × 100` cents, currency `usd`. No fees, no tax.
- The app shows its own estimate while picking. The server recomputes it, and the server's number is the one shown before paying and the one charged. A price the app sends is ignored.

### Data shape (dataset `bookings`)
- `booking` (Sanity-generated `_id`): `stayId` string (production `property._id`; a string, not a reference, because references can't cross datasets), `guestId` (Clerk user ID), `checkIn`, `checkOut`, `guests`, `nights`, `nightlyPrice`, `totalCents`, `currency`, `status` (`pending` | `confirmed` | `expired`), `paymentIntentId`, `expiresAt` (ISO, now + 15 min), `confirmedAt`.
- `night` lock, **fixed ID `night.<stayId>.<YYYY-MM-DD>`**, one per booked night (check-out night excluded): `stayId`, `date`, `paymentIntentId`. This is the one exception to "Let Sanity generate document IDs". The fixed ID is what makes the lock atomic.
- Double booking is impossible because the booking and all of its night locks are written in **one mutate request** (Sanity runs it as one transaction), with `create`, which fails if the ID exists. If any night is taken, nothing is written.
- Nights link to their booking by `paymentIntentId` (the PaymentIntent is created first, so the booking's generated ID isn't known inside the same transaction).

### Flow
1. `POST /api/bookings` `{ stayId, checkIn, checkOut, guests }`:
   1. Verify the Clerk session.
   2. Fetch the stay (`nightlyPrice`, `maxGuests`, title) from production, then validate and price it with `booking.ts`.
   3. Create a PaymentIntent with `amount`, `currency`, and `metadata { stay_id, guest_id, check_in, check_out }`. No `payment_method_types` (dynamic methods) and no Customer (no saved cards).
   4. Run one mutate: `create` the booking (`pending`) plus `create` each night.
   5. If the mutate gets a 409 (a night exists), find the conflicting nights' bookings. Release any that are `pending` and past `expiresAt`: cancel their PaymentIntent (`paymentIntents.cancel`); if that succeeds, delete their nights and mark them `expired` in one mutate. A cancel that fails (already paid or processing) means the night is taken. Retry the create once. If it's still taken, cancel our own PaymentIntent and return `409 { reason: "unavailable" }`.
   6. On success return `{ bookingId, clientSecret, nights, nightlyPrice, total }`.
   7. Validation errors are `400 { reason: "invalid_dates" | "too_many_guests" }`, and an unknown stay is `404`.
2. App: `initPaymentSheet({ paymentIntentClientSecret, merchantDisplayName: "Roam", returnURL: Linking.createURL("stripe-redirect") })`, then `presentPaymentSheet()`. `allowsDelayedPaymentMethods` stays false.
3. `POST /api/stripe/webhook` (no Clerk; verified with `stripe.webhooks.constructEventAsync(rawBody, sig, STRIPE_WEBHOOK_SECRET, undefined, Stripe.createSubtleCryptoProvider())`):
   - `payment_intent.succeeded` patches the booking with that `paymentIntentId` from `pending` (or `expired`, if its nights still exist) to `confirmed` with `confirmedAt`. It's idempotent.
   - `payment_intent.canceled` sets the booking to `expired` and deletes its nights.
   - Other events get a 200 and nothing else.
   - This handler is the only place a booking becomes `confirmed`. The app's PaymentSheet success never confirms anything.
4. After the sheet succeeds, the app polls `GET /api/bookings/[id]` (every 2 s, up to 30 s) until `confirmed`. A timeout shows "Payment received. Your booking will appear in Trips shortly."
5. A late payment is safe: an expired hold is only released by cancelling its PaymentIntent, so a guest can never pay for nights someone else now holds. No refund path is needed.

### Screens
- Stay details' "Book this stay" pushes `stay/[id]/book` (root Stack, signed-in group, `headerShown: true`, title "Book"). It has:
  - Check-in and check-out `DatePicker`s from `@expo/ui` (already installed; `.ios`/`.android` files like `sort-menu`).
  - A guest `Stepper` (1..maxGuests).
  - The price breakdown "$X × N nights" with the total.
  - The stay's cancellation policy `ListRow` (opens `InfoSheet`, reused from details).
  - A footer `Button` "Continue to payment".
  - States: idle, quoting (button loading), quote error (`Alert` with the reason text: "Those dates were just booked. Try other dates." / validation text / generic retry), paying, confirming, confirmed (check icon, "You're booked", dates, total, "View trips" → `router.navigate("/trips")`).
- Trips: `GET /api/bookings` returns the guest's `confirmed` bookings, with stay title, city and cover photo joined in from production, sorted by `checkIn`. It's split into Upcoming and Past and shown with `StayCard` style rows that push `stay/[id]` with `from=trips`. It has loading, error and empty states (the current empty copy stays).
- No design was attached. The screens use existing components and tokens only (no new tokens). If you have designs, attach them before building.

### Analytics (no dates, amounts, IDs other than `stay_id`, or error messages)
- `booking_started { stay_id }` when the book screen opens.
- `booking_quote_failed { stay_id, nights, guests, reason }`.
- `booking_payment_opened { stay_id, nights, guests }`.
- `booking_payment_cancelled { stay_id, nights, guests }`.
- `booking_payment_failed { stay_id, nights, guests, code }` (Stripe error `code` only).
- `booking_completed { stay_id, nights, guests }` when polling sees `confirmed`.
- The `stay_viewed` `source` gains `trips`.

### Secrets (`.env.example` names; EAS env visibility **sensitive**, because EAS Hosting can't deploy "secret" ones)
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`: public.
- `STRIPE_SECRET_KEY`: a restricted `rk_` key with PaymentIntents write only.
- `STRIPE_WEBHOOK_SECRET`.
- `SANITY_BOOKINGS_TOKEN`: robot token, Editor role. Known ceiling: Sanity tokens are project-wide, so it can also write `production`. Keep it server-only.
- `CLERK_JWT_KEY` (`CLERK_SECRET_KEY` already exists).
- Stripe development uses a separate Stripe **sandbox** (`stripe sandbox create`), not shared test mode.

## Out of scope

Guest cancellation and refunds, host payouts (Stripe Connect), Apple Pay / Google Pay, saved cards (Customer objects), greying out booked dates in the picker (add it when `booking_quote_failed reason=unavailable` is frequent), fees and taxes, a Studio workspace for bookings, a scheduled cleanup of expired holds (they're released when someone needs the nights), and email receipts beyond Stripe's own.

## Steps

### 1. Pricing and validation core
Create `src/lib/booking.ts` (pure, no UI or network): `nightsBetween(checkIn, checkOut)`, `nightDates(checkIn, checkOut)` (the `YYYY-MM-DD` list, check-out excluded), `validateBooking({ checkIn, checkOut, guests }, { maxGuests }, today)` returning `null` or a `reason`, `priceBooking(nights, nightlyPrice)` returning `{ nights, nightlyPrice, total, totalCents }`, and `nightLockId(stayId, date)`. Add `src/lib/booking.check.ts` (asserts, run with `npx tsx src/lib/booking.check.ts`) covering a month boundary, a leap day, 0 and 29 nights, a past date, `checkOut == checkIn`, and guests over max. Done when the check passes.

### 2. Private dataset, keys, dependencies
- Create dataset `bookings` with `aclMode: private` (Sanity MCP `create_dataset`), then confirm with `list_datasets`.
- Install with `npx expo install @stripe/stripe-react-native stripe @clerk/backend`, then pin `stripe` and `@stripe/stripe-react-native` to exact versions.
- Add the `@stripe/stripe-react-native` config plugin to `app.json` (no `merchantIdentifier` yet), set `web.output: "server"`, and add the `expo-router` plugin `origin` (filled in after the first deploy).
- Add the env names to `.env.example`.
- Wrap the signed-in tree in `StripeProvider` (`publishableKey`, `urlScheme: "roam"`) in the root layout.
- Done when `npx expo-doctor`, lint and tsc pass and the app still opens in Expo Go.

### 3. Server helpers
- Create `src/lib/server/` (imported only by `+api.ts` files): `auth.ts` (`requireUser(request)` returns the Clerk `userId` or throws a 401 `Response`), `stripe.ts` (the Stripe client), and `bookings-store.ts` (`queryBookings`, `mutateBookings`, `fetchStayForBooking` from production over `api.sanity.io`).
- Add a top-of-file comment that these files hold secrets and must never be imported from app code.
- Done when tsc passes.

### 4. `POST /api/bookings` and `GET /api/bookings[/id]`
- Create `src/app/api/bookings+api.ts` (POST creates the hold per Flow 1; GET lists the guest's confirmed bookings, joined with the stays) and `src/app/api/bookings/[id]+api.ts` (GET returns `{ status }` only when `guestId` matches, else 404).
- Done when, with `npx expo start`, a `curl` with a real session token shows each of these:
  - Creating a hold returns a `clientSecret`.
  - The same dates again return 409.
  - A past date returns 400.
  - No token returns 401.
  - The Sanity MCP (`query_documents` on dataset `bookings`) shows one `pending` booking plus its nights.

### 5. Stripe webhook
- Create `src/app/api/stripe/webhook+api.ts` per Flow 3, reading the raw body with `await request.text()`.
- Done when, with `stripe listen --forward-to localhost:8081/api/stripe/webhook` and the sandbox:
  - Paying a hold through `stripe payment_intents confirm <id> --payment-method pm_card_visa` makes the booking `confirmed`.
  - A replayed event (`stripe events resend`) changes nothing.
  - A tampered signature gets a 400.

### 6. Book screen
- Create `src/app/stay/[id]/book.tsx` (with its date picker component in `src/components/stays/`) per Screens.
- The stay details footer button pushes it.
- Wire PaymentSheet, polling and the analytics events.
- Done when booking with test card `4242 4242 4242 4242` reaches "You're booked", and card `4000 0000 0000 9995` shows the decline and leaves the booking `pending`.

### 7. Trips tab
- Replace the stub `src/app/(tabs)/trips.tsx` with a `useTrips()` hook (in `src/lib/stays.ts`, fetching `/api/bookings` with the token) and the Upcoming/Past list.
- Done when the booking from step 6 appears under Upcoming and opens its stay.

### 8. Deploy
- Run `npx expo export --platform web`, then `npx eas-cli@latest deploy`.
- Set the EAS env vars (sensitive) for production, set `origin` to the deployed URL, and add the production webhook endpoint in the Stripe sandbox dashboard (events `payment_intent.succeeded`, `payment_intent.canceled`) with its signing secret.
- Done when a booking from the phone against the deployed API confirms through the deployed webhook.

## Verification

- `npx tsx src/lib/booking.check.ts`, `npx expo lint`, `npx tsc --noEmit` and `npx expo-doctor` all pass.
- Booking flows on the phone:
  - Happy path: 4242 card → "You're booked" → the booking shows in Trips.
  - A declined card shows an error, nothing is confirmed, and retrying in the same sheet works.
  - Cancelling the sheet sends `booking_payment_cancelled`, and the hold stays `pending`.
  - Two holds for overlapping dates at once: the second gets 409 (run two `curl`s in parallel). Exactly one set of night docs exists.
  - An expired hold: set its `expiresAt` in the past with the MCP. A new hold for the same nights succeeds, the old PaymentIntent is `canceled` in Stripe, and the old booking is `expired`.
  - A webhook arriving while the app is closed: pay, kill the app right away, reopen. The booking is in Trips.
  - Tampered price: change `nightlyPrice` in Studio and wait for the CDN to lag. The server charges the new price shown in the quote.
  - API without a token returns 401. `GET /api/bookings/<someone else's id>` returns 404.
- Privacy: in PostHog's live events, the `booking_*` events carry only the listed properties. `grep -r "STRIPE_SECRET\|SANITY_BOOKINGS\|CLERK_JWT" src --include=*.tsx` finds nothing outside `src/lib/server` and `src/app/api`.
- Success metric: the funnel `stay_viewed` → `booking_started` → `booking_payment_opened` → `booking_completed` (baseline 0). Failure signals: the `booking_quote_failed` rate by `reason`, `booking_payment_failed` codes, and failed webhook deliveries in the Stripe dashboard.
- End to end: from a fresh sign-in, search "cabin", open a stay, book 2 nights for 2 guests with 4242, and see it under Upcoming in Trips. The Stripe sandbox shows one succeeded PaymentIntent for exactly `2 × nightlyPrice` USD.

## AGENTS.md updates

- Screens: replace "Book button says Coming soon until booking exists" with the `stay/[id]/book` flow. Trips is no longer a stub.
- Who owns what: add **Payments** (Stripe PaymentSheet + PaymentIntent, webhook-only confirmation, restricted key, sandbox for dev) and **Bookings** (private dataset `bookings`, night lock docs with fixed IDs `night.<stayId>.<date>`, the one exception to generated IDs; the app never reads it directly). Add **Hosting** (EAS Hosting on Workers, `web.output: server`, env vars "sensitive", `src/lib/server/` only imported by API routes).
- Rules: the secret keys list gains the Stripe secret key, the Stripe webhook secret, `SANITY_BOOKINGS_TOKEN` and `CLERK_JWT_KEY`. "Let Sanity generate document IDs" gains "except booking night locks".
- Analytics: add the `booking_*` events and the `trips` source.

## Result

Steps 1–7 are built. Step 8 (deploy to EAS Hosting) and the on-phone test are still open.

- Checked against the local dev server with real Clerk session tokens and the Stripe sandbox:
  - 401 without a token, 400 for a past date and for too many guests.
  - A hold returns a client secret, an overlapping hold gets 409, and two parallel requests leave exactly one hold and one set of night docs.
  - Paying through the CLI flips the booking to `confirmed` via the webhook, a replayed event changes nothing, and a bad signature gets 400.
  - An expired hold is released: its PaymentIntent is `canceled`, its booking `expired`, and the new hold owns the nights.
  - The same guest retrying after closing the sheet gets a new hold.
  - Polling returns 404 for an unknown or someone else's booking.
- Changes from the plan:
  - Sanity's mutate `results` don't keep mutation order, so the booking ID is picked as the one without the `night.` prefix.
  - A guest's own unpaid hold yields to their new attempt. Without that, closing the payment sheet blocked the guest's own retry.
  - `useTrips` and `apiFetch` live in `src/lib/booking-api.ts`, not `stays.ts`.
  - Trips keeps the committed Saved section; bookings sit above it.
- Test data in dataset `bookings` from these checks (test user): pending, expired and one confirmed booking for "East Austin Bungalow" and "Blue Ridge Log Cabin", dated 2026-12 to 2027-04. Delete it before launch.
