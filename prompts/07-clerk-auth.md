# 07 · Clerk auth

Status: done

## Goal

Guests create an account with email, password, and an emailed code, sign in with email and password, or continue with Google or Apple, all on Roam's existing custom screens. The session survives app restarts, signed-out guests can't reach `home`, signed-in guests skip onboarding and auth, and Sign out returns to onboarding.

## Decisions

- **Clerk app:** "Roam" (development instance). Planned as the app the Clerk MCP manages (user choice); during the build the user created a new "Roam" app in their own dashboard workspace instead, and `clerk link` + `clerk env pull` wrote its keys (see Result). `.env.local` currently holds keys for a different app ("rn-roam"). Replace `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` with the Roam publishable key (from the MCP `list_applications`). The user replaces `CLERK_SECRET_KEY` from the dashboard (nothing reads it yet; API routes will). Add `.env.example` with both names.
- **Instance config (read through the MCP):** email required, verified by `email_code`; password required; first and last name enabled (optional); Google and Apple enabled; captcha off; MFA off; device trust on (a password sign-in on a new device needs an emailed code: `needs_client_trust`). Password `min_length` is 15. Lower it to 8 through the MCP (`patch_instance_config`) so the app's validation and the "At least 8 characters" placeholder stay as designed (user choice). The breached-password (HIBP) check stays on.
- **SDK:** `@clerk/expo` 4.13 (already installed), using the current method-based API: `useSignUp()` and `useSignIn()` return `{ signUp | signIn, errors, fetchStatus }`. Methods resolve to `{ error }`, and a `complete` attempt is activated with `finalize()`. Never the legacy `create` + `prepare…` + `setActive` flow. Verified against `node_modules/@clerk/shared/dist/types/sign{In,Up}Future.d.ts`.
- **New dependencies** (`npx expo install`): `expo-secure-store` (required by `tokenCache` from `@clerk/expo/token-cache`, which persists the session; without it the import crashes), and `expo-auth-session` + `expo-crypto` (required by `useSSO` for Google and Apple). All are Expo modules in Expo Go, so no dev build is needed.
- **Separate screens kept.** Sign-up and sign-in stay separate, as designed (not Clerk's combined flow).
- **Full name** is split at the first space: `firstName` = the first word, `lastName` = the rest (or omitted). Both go to `signUp.password({ emailAddress, password, firstName, lastName })`.
- **Verify screen serves both flows:** `/verify?email=…&flow=sign-up|sign-in`.
  - `sign-up`: `signUp.verifications.verifyEmailCode({ code })`, resend with `signUp.verifications.sendEmailCode()`.
  - `sign-in` (new-device check): `signIn.mfa.verifyEmailCode({ code })`, resend with `signIn.mfa.sendEmailCode()`.
  - Then `finalize()` when status is `complete`. The in-progress attempt lives in Clerk's client state, so the screens pass only `email` and `flow`.
- **Sign-in statuses:** `complete` → `finalize()`. `needs_client_trust` → `signIn.mfa.sendEmailCode()`, then push `/verify` with `flow=sign-in`. Any other status (MFA is off, so none is expected) shows "We couldn't finish signing you in. Contact support." in the danger `Alert`.
- **Errors:** Clerk's own message is shown in the existing danger `Alert`. A small `authMessage(error)` helper reads `error.errors?.[0]?.longMessage ?? error.message`, with "Something went wrong. Try again." as the fallback. Clerk's messages are written for end users ("Password is incorrect…", "That email address is taken…"). The existing local `validate()` still runs first, so empty or short input never hits the network.
- **Social:** Google and Apple through `useSSO().startSSOFlow({ strategy: "oauth_google" | "oauth_apple" })` from `@clerk/expo` (browser session, works in Expo Go), user choice. A `createdSessionId` → `setActive({ session })`. No session and no error means the user cancelled, so nothing is shown. A `signUp` with status `missing_requirements` (shouldn't happen: only email is required, and the provider supplies it) or a thrown error is shown in the screen's `Alert` through a new `onError` prop on `SocialButtons`. The redirect uses the default `sso-callback` path on the existing `roam` scheme. `ClerkProvider` completes the auth session itself, so no `maybeCompleteAuthSession` call.
- **Protected routes:** `Stack.Protected` in the root layout, reading `useAuth()`:
  - `guard={isSignedIn}`: `home`, declared first so it's the screen the router falls back to after sign-in.
  - `guard={!isSignedIn}`: `index` (onboarding), `sign-up`, `sign-in`, `verify`.
  - `design-system` stays unguarded.

  When the guard flips, Expo Router removes the now-hidden screens from history and moves to the first available screen. So sign-in lands on `home` with no Back into auth, and sign-out lands on onboarding. That replaces `enterApp()` (deleted).
- **Persistent session and launch:** `ClerkProvider` gets `tokenCache`. The splash screen stays up until both the fonts and Clerk (`isLoaded`) are ready, so a signed-in launch goes straight to `home` with no onboarding flash. Onboarding still shows on every signed-out launch.
- **Sign out:** the `home` button calls `useClerk().signOut()`, and the guard moves the guest to onboarding. Home's stub copy "Auth is mocked for now." becomes "Signed in as {primary email}" (`useUser()`).
- **Bot protection:** `<View nativeID="clerk-captcha" />` rendered once in `AuthScreen`, so every screen that can create a sign-up (including social on sign-in) has the mount point. Captcha is off on the instance today; this keeps sign-up working if it's turned on.
- **Native API:** Clerk Dashboard → Native applications must be enabled. The MCP config doesn't expose this toggle, so the user checks it.
- **Mock removed:** `src/lib/mock-auth.ts` is deleted and `authMessage` lives in a new `src/lib/auth.ts`.

## Out of scope

- Forgot password and password reset.
- Native Google/Apple sheets (`useSignInWithGoogle`/`useSignInWithApple`, dev build only). Browser SSO covers both for now.
- Verifying Clerk sessions in API routes (no API routes exist yet).
- PostHog identify through Clerk.
- Profile, account deletion, and the real home screen.
- Production Clerk instance and production OAuth credentials (the dev instance uses Clerk's shared credentials).

## Steps

### 1. Clerk instance, keys, dependencies

- Patch the Roam dev instance through the MCP: `auth_password.min_length` = 8. Read it back to confirm.
- `.env.local`: set the new publishable key. Leave `CLERK_SECRET_KEY` for the user. Create `.env.example` with `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=` and `CLERK_SECRET_KEY=`.
- `npx expo install expo-secure-store expo-auth-session expo-crypto`.

Done when `npx expo-doctor` reports no new problems and the app still opens (still mocked).

### 2. Root layout: provider, splash, guards

- `src/app/_layout.tsx`: `ClerkProvider` (`publishableKey`, `tokenCache`) wraps a `RootStack` component in the same file. `RootStack` reads `useAuth()`, keeps the splash until `fontsReady && isLoaded`, and renders `Stack` (`headerShown: false`) with the two `Stack.Protected` groups described above. The fonts stay loaded in `RootLayout`, and readiness is passed down.
- Keep the missing-key error, shortened to "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local".

Done when a cold start with no session shows onboarding, and `router.push("/home")` from onboarding is refused.

### 3. Email flows

- `src/lib/auth.ts`: `authMessage(error: unknown): string`, as above.
- `src/app/sign-up.tsx`: replace `mockAuth.signUp` with `signUp.password({...})`, then `signUp.verifications.sendEmailCode()`, then push `/verify` with `email` and `flow: "sign-up"`. `loading` comes from the local state that already exists (it also covers the two-call sequence).
- `src/app/sign-in.tsx`: `signIn.password({ emailAddress, password })`, then branch on status as above.
- `src/app/verify.tsx`: read `flow`, verify and resend per flow, then `finalize()`. A wrong code keeps the current behavior: clear the boxes, keep focus, show the message. Resend shows "We sent a new code." on success and the Clerk message on failure.
- `src/components/auth/auth-screen.tsx`: delete `enterApp`, add the captcha `View`.
- Delete `src/lib/mock-auth.ts`.

Done when the email flows in Verification work against the real instance.

### 4. Social and sign out

- `src/components/auth/social-buttons.tsx`: `useSSO`, `onError(message)` replaces `onSuccess`, and per-button loading stays. Sign-up and sign-in pass `onError={setError}`.
- `src/app/home.tsx`: `signOut()` and the "Signed in as" line.

Done when Google and Apple each reach `home`, cancelling returns quietly, and Sign out lands on onboarding.

## Verification

- `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor` pass.
- On the iPhone (user runs `npx expo start`, Expo Go), with a real inbox the user can read:
  - Sign up with a new email → code arrives → wrong code shows Clerk's error → right code → `home` showing the email. Swipe back does nothing.
  - Sign up again with the same email → "taken" error on sign-up.
  - Kill and relaunch the app → straight to `home` (session persisted), no onboarding flash.
  - Sign out → onboarding. Relaunch → onboarding.
  - Sign in with a wrong password → Clerk's error. Right password → `home`, or `verify` (`flow=sign-in`) if Clerk asks for a new-device code, then `home`.
  - Resend on both verify flows shows the success alert.
  - Google, then Apple, from sign-in and sign-up → `home`. Cancel the browser → back on the screen, no error.
  - Signed in, try `roam:///sign-in` via a link → stays on `home`.
- Check the user appears in the Clerk dashboard (or MCP `list_users`) with first and last name.

## AGENTS.md updates

- **Expo → Screens:** replace the mock-auth sentence: auth is Clerk (`@clerk/expo` custom flows). The root layout guards routes with `Stack.Protected` on `useAuth()`: `home` is signed-in only, and onboarding plus auth screens are signed-out only, so guard flips do the navigation (no `enterApp`). `verify` takes `flow=sign-up|sign-in` (sign-in uses it for Clerk's new-device check).
- **Who owns what → Auth:** the Clerk app is "Roam", managed through the Clerk MCP. Use the method-based flows (`signUp.password`, `finalize`), never `@clerk/expo/legacy`. Social is `useSSO` browser flow. Password `min_length` 8 matches `validate.ts`; change both together.

## Result

Built as planned, against a different Clerk app than the plan named. The user's dashboard didn't show the MCP's "Roam" app (another workspace), so they created a new "Roam" app and pulled its keys with `clerk link` + `clerk env pull`. The MCP can't see that app, so its config was changed with the Clerk CLI (`npx clerk@latest config patch`, dry run first): password `min_length` 15 → 8, Apple enabled. Checked through the instance's public settings. The "Roam" app in the MCP workspace was also patched to 8 early on; it's unused.

Device check (iPhone via iPhone Mirroring, Expo Go), all done by the user, with the result seen on screen: sign-up with a real email → code → home showing the email; kill and relaunch → straight to home; sign out → onboarding; sign in with a wrong password shows Clerk's error, the right one → home; Google and Apple → home; cancelling the browser returns quietly.
