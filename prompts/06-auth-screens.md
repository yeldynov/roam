# 06 · Auth screens (mocked)

Status: done

## Goal

Guests can create an account, enter an emailed code, and sign in, through three screens that match `prompt-imgs/auth.png` (sign-up). Auth is mocked: no Clerk yet, and every success lands on a stub home screen.

## Decisions

- Only sign-up is in the design. Verification and sign-in reuse its chrome (back button, wordmark, title, muted subtitle, fields, primary button, footer link), and their copy is ours.
- Success (verify, sign in, social) lands on a stub `src/app/home.tsx` with a Sign out button back to onboarding (user choice). Success uses `router.dismissAll()` then `router.replace("/home")`, so Back can't return into the auth flow.
- Apple logo: downloaded from Simple Icons (`simple-icons@13.21.0/icons/apple.svg`, single black path) into `assets/images/Apple.svg` (user choice). It renders through `expo-image` like Google.
- Code entry: six boxes driven by one hidden `TextInput` (`keyboardType="number-pad"`, `textContentType="oneTimeCode"`, `autoComplete="one-time-code"`, `maxLength={6}`), so iOS can autofill from Mail (user choice).
- Google and Apple buttons mock success: about 600 ms of loading on the pressed button, then home (user choice).
- Mock lives in one file, `src/lib/mock-auth.ts`, so Clerk replaces one module. Each call waits 600 ms. `signUp` and `signIn` always succeed for valid input. `verify(code)` succeeds only for `424242` (Clerk's test-mode code), so the error state can be tried. `resend` succeeds.
- Validation runs in code on submit: name not blank, email matches `/^\S+@\S+\.\S+$/`, password at least 8 characters, code exactly 6 digits. The first failure shows in a danger `Alert` above the primary button. Editing any field clears it. No inline per-field errors (no design for them).
- Sign-up footer "Sign in" and sign-in footer "Create account" use `router.replace`, so switching between them doesn't stack screens. Back from either returns to onboarding. Back from verification returns to sign-up with the fields kept.
- Verification gets the email as a route param (`/verify?email=…`) and shows it in the subtitle.
- Each screen is a `ScrollView` with `automaticallyAdjustKeyboardInsets` and `keyboardShouldPersistTaps="handled"`: native, no keyboard library. Return key moves to the next field (`returnKeyType="next"`), and `go` on the last one submits.
- Inputs set `textContentType`/`autoComplete`: `name`, `email`, `newPassword` on sign-up, `password` on sign-in, `autoCapitalize="none"` for email.
- Routes stay flat (`sign-up`, `sign-in`, `verify`, `home`). Root `Stack` gets `screenOptions={{ headerShown: false }}` and `design-system` sets `headerShown: true` itself, replacing the per-screen entries.
- No "Forgot password?" link: not in the design, and it needs real auth.

### Layout (pt on a 390-wide phone; estimated from the image at about 1.74 px/pt)

All three screens: `bg-surface` (the design's page is white), `px-6`, `paddingTop: insets.top + 8`, `paddingBottom: insets.bottom + 16`.

- **Top row:** row, space-between, items-center. Back: `IconButton icon={ChevronLeft} variant="outline" size="sm"` (44 round, white, `border border-line`, no shadow; the design measures about 43). Right: `Wordmark size="sm"` (20 tall, about 77 wide; the design measures about 72 × 19).
- **Title:** `Text variant="display"`, `mt-7`. Sign-up: "Create your account" wrapping as "Create / your account" (it does at 40pt on 342 width). The design's title measures closer to 36 than 40 (estimated). Keep `display`, same as onboarding.
- **Subtitle:** `Text tone="muted"` (body, 16/24), `mt-3`. The design's line spacing is about 22 and its gray a little lighter than `muted` (estimated). Keep the tokens.
- **Fields:** `mt-6`, column `gap-3`. Labeled `Input` (new `label` prop below): 60 tall, `rounded-md`, `bg-canvas`, `px-5 gap-5`, icon `lg`. Label `Text variant="caption"` ink, medium. Value and placeholder `text-caption` (14/20), placeholder color `placeholder`. Focus keeps the existing lavender border and fill.
  - Full name: `User` icon, placeholder "e.g. Adrian Hajdin" (from the design).
  - Email address: `Mail`, "you@example.com".
  - Password: `Lock`, "At least 8 characters", `secure` (existing eye toggle; hidden shows `EyeOff`, as in the design).
- **Error:** `Alert tone="danger"`, `mt-6`, only when set.
- **Primary button:** `Button` (primary, trailing arrow, h-13), `mt-6`. The design measures 52, which matches.
- **Divider:** `mt-6`, row items-center `gap-4`: `h-px flex-1 bg-line`, `Text variant="small" tone="muted"` "or", `h-px flex-1 bg-line`.
- **Social:** `mt-5`, column `gap-3`: `Button variant="secondary" title="Continue with Google" leading={<GoogleLogo />}` and the same with `AppleLogo`. The design's are about 46 tall with about 30 between logo and label; the component's are 52 with 12. Keep the component.
- **Footer:** pushed to the bottom (`flex-grow` spacer in the scroll content), centered row: `Text variant="caption" tone="muted"` + a `Pressable` with `Text variant="caption" weight="semibold" underline`.

Screens:

1. **Sign-up** (`/sign-up`): as above. Title "Create your account". Subtitle "Join roam to save your stays, get personalized recommendations and access them across all your devices." Button "Create account". Footer "Already have an account?" / "Sign in". Submit: validate, `mockAuth.signUp`, then `router.push({ pathname: "/verify", params: { email } })`.
2. **Verify** (`/verify`): title "Check your email". Subtitle "We sent a 6-digit code to {email}. Enter it below." Code boxes `mt-6`: row `gap-2`, six `h-14 flex-1 rounded-md bg-canvas items-center justify-center`, digit `Text variant="title"`. The box at the cursor gets `border border-lavender-ring bg-lavender-soft` while focused (matches `Input` focus). Tapping the row focuses the hidden input. Button "Verify". Then a centered row `mt-6`: "Didn't get a code?" + "Resend" (same link style), which shows a success `Alert` "We sent a new code." No divider, social buttons, or footer. Submit on the sixth digit too.
3. **Sign-in** (`/sign-in`): title "Welcome back". Subtitle "Sign in to see your saved stays and pick up where you left off." Fields: email and password only. Button "Sign in". Divider and social as sign-up. Footer "New to roam?" / "Create account".
4. **Home stub** (`/home`): `// stub: replaced by the home plan`. `bg-canvas`, safe-area padding, `Wordmark`, `Text variant="title"` "You're signed in", `Text tone="muted"` "Auth is mocked for now.", `Button variant="secondary" title="Sign out" icon={LogOut}` that calls `router.replace("/")`.

### Component changes

- `Input`: optional `label?: string`. With it, the field is `h-15 px-5 gap-5` and the text column stacks the label over a `TextInput` set to `text-caption` (h-5). Without it, nothing changes. The label isn't the a11y label by accident: pass `accessibilityLabel={label}` to the `TextInput` when no other one is set.
- `IconButton`: `variant="outline"` (`bg-surface border border-line`) and `size?: "md" | "sm"` (`size-14` default, `size-11`).
- `Wordmark`: `sm: 20` size.
- `google-logo.tsx` becomes `brand-logo.tsx`, exporting `GoogleLogo` and `AppleLogo` (same `expo-image` render, different `require`). The barrel export changes, import sites don't.
- `Text`: `underline?: boolean` (adds the `underline` class), so `className` stays layout only.

### New tokens

None. `h-15`, `size-11`, and `gap-5` are spacing-scale values (`--spacing: 4px`).

## Out of scope

- Clerk, real OAuth, sessions, and gating (onboarding still shows on every launch).
- Forgot password and password reset.
- Analytics events.
- Per-field inline errors and password-strength hints.

## Steps

### 1. Components

- `src/components/ui/brand-logo.tsx` (rename `google-logo.tsx`): add `AppleLogo`. Update `index.ts`.
- `Input` `label`, `IconButton` `outline` + `size`, `Wordmark` `sm`, `Text` `underline`, as above.
- `/design-system`: add a labeled `Input`, the outline small back button, `Wordmark size="sm"`, and an Apple button next to Google.

Done when `/design-system` shows them and tsc and lint pass.

### 2. Mock and shared auth chrome

- `src/lib/mock-auth.ts`: `signUp`, `signIn`, `verify`, `resend`, `social`, each `async`, 600 ms delay, `verify` throws `Error("That code isn't right. Try again.")` unless `424242`. `// mock: replaced by Clerk`.
- `src/components/auth/auth-screen.tsx`: `AuthScreen({ title, subtitle, children, footer? })` renders safe area, scroll view, top row (back calls `router.back()`), title, and subtitle, then `children`, then a spacer and `footer`. `src/components/auth/social-buttons.tsx`: divider plus Google and Apple buttons with their own loading state, calling `mockAuth.social` then `onSuccess`. `src/components/auth/text-link.tsx`: the footer's "prompt + link" row. Three users each, so they're shared.
- `src/lib/validate.ts`: `isEmail`, plus the messages used by the screens.

### 3. Screens and navigation

- `src/app/sign-up.tsx` (replaces the stub), `src/app/verify.tsx`, `src/app/sign-in.tsx`, `src/app/home.tsx` as described.
- `src/app/_layout.tsx`: `screenOptions={{ headerShown: false }}`, drop the per-screen entries. `src/app/design-system.tsx`: `headerShown: true` in its `Stack.Screen` options.

Done when the flows in Verification work.

## Verification

- `npx tsc --noEmit` and `npx expo lint` pass.
- On the iPhone through iPhone Mirroring (user runs `npx expo start`), compare sign-up with `prompt-imgs/auth.png`: back button size and border, wordmark size, title wrap, subtitle color and wrap, field height, label/placeholder sizes, icon positions, eye icon, button heights and gaps, divider, social logos, footer position and underline. List every difference, fix, and repeat.
- Flows:
  - Onboarding → Get started (×3) → sign-up. Submit empty: "Enter your name." Bad email: email error. 7-character password: password error. Valid: loading, then verify showing the email.
  - Verify: `111111` shows the error. Resend shows the success alert. `424242` (typed or autofilled) lands on home. Back from home is not possible (no back button, swipe does nothing).
  - Home → Sign out → onboarding.
  - Sign-up footer → sign-in. Sign-in footer → sign-up. Back from either → onboarding.
  - Sign-in with valid email and password → home.
  - Google and Apple on both screens: the pressed button spins, then home.
  - Keyboard: fields and the primary button stay reachable on a small phone, Next moves between fields, Go submits.

## AGENTS.md updates

- **Routes** (Expo section): `sign-up` → `verify` → `home`, and `sign-in` → `home`. Auth is mocked in `src/lib/mock-auth.ts` (test code `424242`) until Clerk lands. `home` is a stub. Replaces the "`sign-up` is a stub" note.
- **Design system:** `GoogleLogo` and `AppleLogo` live in `brand-logo.tsx` (`assets/images/*.svg` via `expo-image`). `Input` takes `label` for the two-line auth field. `IconButton` has `outline` and `size="sm"`. `Text` takes `underline` for links.

## Result

Built as planned. Device check (iPhone 17 via iPhone Mirroring) found and fixed: sign-up title wrapped "Create your / account" (now an explicit break, "Create / your account"); a wrong verification code dropped the keyboard and kept the digits (input stays focused and clears now); sign-in placeholder now "Your password". Known differences, kept for tokens/components: title about 36 in the design vs `display` 40, social buttons 46 vs 52, subtitle gray a little lighter than `muted`. Together they push sign-up's footer slightly below the fold on a 402pt phone, so it scrolls. Deviation: `src/lib/validate.ts` is one `validate(form)` function, not `isEmail` plus messages.
