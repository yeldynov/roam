# 17 · Portfolio release (TestFlight)

Status: approved

> Progress (2026-10-24): steps 1–3 built. Step 4 is paused. The 10 env vars exist in the EAS `production` environment, but `npx expo export --platform web` fails: `web.output: "server"` renders every screen for web, and `@stripe/stripe-react-native` (imported by `_layout.tsx` and `stay/[id]/book.tsx`) is native-only. Resume by picking a web stub for it (a Metro resolver rule on web, or a `.web.ts` platform shim), then keep going from step 4.2.

## Goal

Anyone with the TestFlight link installs Roam on an iPhone and uses every feature end to end: sign up, search, book with a Stripe test card, see the trip, edit a stay as a host. The API routes run on EAS Hosting, and nothing in the app is a template default.

## Decisions

- **Release type: portfolio demo.** iOS only, on TestFlight with an external group and a public link. No App Store or Play Store listing.
- **Clerk stays on the development instance** (`pk_test`/`sk_test`, the existing `CLERK_JWT_KEY`). There's no domain yet, so the production instance waits. That also means users, host companies, and org settings don't need to be redone. Dev limits apply: 100 users, and a "Development mode" notice may show on Clerk's hosted pages (Google and Apple sign-in).
- **Stripe stays in the "RN Roam" sandbox.** Testers pay with `4242 4242 4242 4242`. The existing `rk_test` key is reused. Production adds a **sandbox** webhook endpoint at the hosted URL, which has its own `whsec_`. `stripe listen` stays for local development.
- **PostHog: one project, split by environment.** Every event carries a super property `environment` (`development` | `production`, from `__DEV__`), added by the client's `before_send` in `src/lib/posthog.ts` (not `register`: `reset()` on sign-out clears super properties). Dashboards filter on it.
- **PostHog: no personal data.** `identify(user.id)` drops `$set` email and name in `src/app/_layout.tsx`. Persons created before this keep their old properties, and that's accepted for dev data.
- **EAS:** the project is created with `npx eas-cli@latest init` under the logged-in account (`shangnik`, confirmed by the user before step 1). `eas.json` has `development` (dev client, internal), `preview` (internal), and `production` (store distribution, `autoIncrement: true`) profiles, with `cli.appVersionSource: "remote"`.
- **Identity:** `name: "Roam"`, `ios.bundleIdentifier: "com.yeldynov.roam"`. Android `package` is the same ID, set now so it's ready later, even though there's no Android build in this plan.
- **Export compliance:** `ios.config.usesNonExemptEncryption: false`. Check the key name against the SDK 57 app config docs before using it. The app only uses HTTPS, so TestFlight skips the encryption question.
- **Production origin:** the `expo-router` plugin gets `origin: "https://<subdomain>.expo.app"`, which is the URL the first `eas deploy --prod` prints.
- **Server env on EAS Hosting:** the `production` environment holds `CLERK_SECRET_KEY`, `CLERK_JWT_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (the hosted endpoint's), `SANITY_BOOKINGS_TOKEN`, and `SANITY_API_WRITE_TOKEN`, all with "sensitive" visibility.
- **App env on EAS Build:** the `production` environment holds `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN`, and `EXPO_PUBLIC_POSTHOG_HOST`, with "plain text" visibility since they're bundled anyway. `.env.local` is gitignored, so EAS Build never sees it.
- **app.config.ts** switches to the `({ config }) => ({ ...config, extra })` form. That clears expo-doctor's false "not using app.json" warning and keeps the same output.
- **Patch updates:** `npx expo install --fix` (expo 57.0.31, expo-router 57.0.29, @expo/ui 57.0.26).
- **Branding:** the splash background becomes `--color-primary` (#ffc629) and the Android adaptive icon background `--color-primary` too. The app icon, Android adaptive layers, and splash mark are rendered from `assets/images/roam-wordmark.svg` (ink wordmark on #ffc629, headless Chrome). iOS uses the plain 1024 PNG `icon`, and the Expo template `assets/expo.icon` bundle is removed. Delete the unused template images (`expo-badge*.png`, `expo-logo.png`, `logo-glow.png`, `react-logo*.png`, `tutorial-web.png`): none are referenced by `src/` or `app.json`.
- **Privacy policy:** a `PRIVACY.md` in the repo, linked from App Store Connect, since TestFlight's external testing asks for a privacy policy URL. It lists:
  - Clerk: account email, name, photo, home city, saved stays
  - Stripe: card data, which Stripe handles and Roam never sees
  - Sanity: booking records (stay, dates, guest ID)
  - PostHog: usage events and crashes keyed by a random user ID
  - account deletion in Profile → Settings
- **Beta App Review demo account:** the existing `USER_TEST_EMAIL`/`USER_TEST_PASSWORD` Clerk test user, entered in App Store Connect and never in the repo.

## Out of scope

- Clerk production instance, custom domain, own Google/Apple OAuth credentials.
- Live Stripe, Apple Pay, Google Pay.
- Android build and Play Console.
- App Store listing (screenshots, description, App Store review).
- `expo-updates` / EAS Update (new dependency; add later if fixes need to skip TestFlight builds).
- Rate limiting `POST /api/bookings` (one account can keep re-holding a stay's nights). Acceptable for a demo, but required before a public launch.
- PostHog source map upload, a separate production project, deleting persons on account deletion.
- `SUPPORT_EMAIL` stays the personal address.

## Steps

### 1. EAS project and app config

Before starting, the user confirms the EAS account (`npx eas-cli@latest whoami` shows `shangnik`).

1. Run `npx eas-cli@latest init`. It writes `extra.eas.projectId` and `owner`.
2. Add `eas.json` with the profiles from Decisions.
3. In `app.json`: `name: "Roam"`, `ios.bundleIdentifier`, `ios.config.usesNonExemptEncryption: false` (checked against https://docs.expo.dev/versions/v57.0.0/config/app/), and `android.package`.
4. Convert `app.config.ts` to the function form.
5. Run `npx expo install --fix`.

Done when `npx expo-doctor` passes all checks, `npx expo config --type public` shows the new fields and the PostHog extra, and lint and tsc pass.

### 2. Branding cleanup

1. Set the splash `backgroundColor` to #ffc629 and `android.adaptiveIcon.backgroundColor` to #ffffff in `app.json`.
2. Delete the unused template images after grepping `src/`, `app.json`, and `README.md` once more.
3. Done: icon, adaptive foreground, background and monochrome, and the splash mark (`imageWidth` 200) were rendered from the wordmark. The adaptive background is #ffc629.

Done when lint and tsc pass and the dev build launches with the new splash colour.

### 3. PostHog privacy and environment

1. In `src/app/_layout.tsx`, change `identify` to `posthog.identify(user.id)`.
2. In `src/lib/posthog.ts`, add a `before_send` option that sets `properties.environment` to `__DEV__ ? "development" : "production"` on every event.

Done when an event from the dev app shows `environment: development` in PostHog (`posthog:exec` query) and a fresh person has no email or name.

### 4. Deploy API routes to EAS Hosting

1. Create the six server variables in the EAS `production` environment as "sensitive". Use the current values for now; `STRIPE_WEBHOOK_SECRET` is replaced in step 4.5.
2. Run `npx expo export --platform web`, then `npx eas-cli@latest deploy --prod`.
3. Note the URL and set it as the `expo-router` plugin `origin`.
4. In the Stripe sandbox Dashboard (or `stripe webhook_endpoints create`), add the endpoint `<origin>/api/stripe/webhook` for `payment_intent.succeeded` and `payment_intent.canceled`.
5. Put its `whsec_` into the hosted `STRIPE_WEBHOOK_SECRET`, and redeploy.

Done when:
- `curl -i <origin>/api/bookings` returns 401
- `curl -i -X POST <origin>/api/stripe/webhook` returns 400 `bad_signature`
- `stripe trigger payment_intent.succeeded` shows a 200 delivery on the hosted endpoint in the Dashboard

### 5. Build and ship to TestFlight

1. Create the four `EXPO_PUBLIC_` variables in the EAS `production` environment.
2. Run `npx eas-cli@latest build -p ios --profile production`. Let EAS manage credentials (it asks for the Apple Developer login).
3. Run `npx eas-cli@latest submit -p ios --latest`.
4. In App Store Connect:
   - Create an external TestFlight group with a public link.
   - Fill in Test Information: the feedback email, the `PRIVACY.md` GitHub URL, and the demo account.
   - Submit for Beta App Review.

Done when the build is "Ready to Test" for the internal group, and the external group is either in review or approved.

### 6. Privacy policy

Write `PRIVACY.md` from Decisions, and link it from README.md. The step-5 Test Information needs its URL, so this step can run before step 5.

## Verification

- `npx expo lint`, `npx tsc --noEmit`, `npx expo-doctor` all pass.
- The step-4 curl checks against the hosted origin.
- On the TestFlight build, signed out, from a fresh install:
  1. Sign up with a new email and code, and land on Home.
  2. Search "quiet cabin under $300". Results appear.
  3. Open a stay and use Book. Pick dates, pay with 4242, and see "Confirming…", then confirmed. This proves the hosted webhook works.
  4. On Trips, the booking is under Upcoming.
  5. Save a stay, and see it under Saved.
  6. Ask about policies. The Pets chip returns a card.
  7. As a host company member, open Hosting, change a stay's price, save, and see the new price on the stay screen within about a minute.
  8. In Settings, sign out, then sign back in.
- PostHog: the session's events carry `environment: production`, and the person has no email or name.
- Stripe sandbox: the PaymentIntent succeeded, and the hosted webhook delivery returned 200.

## AGENTS.md updates

- **Hosting:** add the production origin, the EAS project and owner, which env vars live in which EAS environment (server "sensitive" on Hosting, `EXPO_PUBLIC_` plain text for Build), and the hosted sandbox webhook (its own `whsec_`).
- **Analytics:** identify by Clerk user ID only (no email or name). Every event has `environment`. Replace "Deleting leaves the PostHog person (email, name) behind…" with a note that persons from before plan 17 still hold those.
- **Auth / Payments:** the release runs on the Clerk development instance and the Stripe sandbox until there's a domain. Add the steps for going live (production instance, recreate orgs, re-point `host.clerkOrgId`, live keys, rate-limit holds) as one line.
- **Commands:** add `eas deploy --prod` and `eas build -p ios --profile production` / `eas submit`.
