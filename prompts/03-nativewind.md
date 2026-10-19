# 03 · NativeWind v5 setup

Status: done

## Goal

Developers can style any React Native component with Tailwind classes through `className`, on iOS, Android, and web.

## Decisions

- Follow https://www.nativewind.dev/v5/llms-full.txt (NativeWind v5 RC0 with Tailwind CSS 4). The user asked for v5, not the stable v4.
- The project matches the guide's tested target exactly: Expo 57, React Native 0.86.3, React 19.2.3, Reanimated 4.5.1, Worklets 0.10.1. No upgrades needed.
- Pin exact versions: `nativewind@5.0.0-rc.0`, `react-native-css@3.1.0-rc.0`, `tailwindcss@4.1.12`, `@tailwindcss/postcss@4.1.12`, `lightningcss@1.30.1`. `postcss` takes the latest version, pinned exactly.
- Install with `npm install --save-exact`, not `npx expo install`. These packages aren't in Expo's version map, and the RC pair has to be pinned exactly.
- `lightningcss` is pinned with an `overrides` entry in `package.json` (npm). Without it, builds can fail to deserialize `global.css`.
- `reanimated`, `worklets`, `safe-area-context`, and `expo-system-ui` are already installed at SDK versions, so nothing to add there.
- `global.css` lives at `src/global.css` (keeps the root clean; `src/` already holds the app). It is imported once in `src/app/_layout.tsx` as `@/global.css`.
- No `babel.config.js`: the project has none, and v5 doesn't need the v4 Babel preset.
- `nativewind-env.d.ts` goes in the root and in the tsconfig `include` list.
- Dark mode: `app.json` already has `"userInterfaceStyle": "automatic"`. Nothing to change.
- No theme tokens yet. Design tokens come later, from the designs (see AGENTS.md "Building from designs").
- ESLint: `eslint`, `eslint-config-expo`, and `eslint.config.js` were added when `npx expo lint` first set itself up. They stay, since AGENTS.md requires lint to pass. Already in the working tree, approved with this plan.
- Skip `prettier-plugin-tailwindcss` (optional in the guide, not needed now).

## Out of scope

- Design tokens and theme (`@theme` in `global.css`).
- Converting screens beyond the one `index.tsx` smoke test.
- A development build. Expo Go works because NativeWind v5 adds no native code of its own.

## Steps

### 1. Install packages

```bash
npm install --save-exact nativewind@5.0.0-rc.0 react-native-css@3.1.0-rc.0
npm install --save-dev --save-exact tailwindcss@4.1.12 @tailwindcss/postcss@4.1.12 postcss lightningcss@1.30.1
```

Add `"overrides": { "lightningcss": "1.30.1" }` to `package.json` and run `npm install`. Done when `npm ls lightningcss` shows a single 1.30.1 everywhere, including under `@expo/metro-config`. `@tailwindcss/oxide`'s postinstall may be blocked by npm's install-scripts policy. That's fine as long as `node_modules/@tailwindcss/oxide-darwin-arm64` exists.

### 2. Config files

- `postcss.config.mjs` (not `.cjs`, which Expo 57 ignores):
  ```js
  export default { plugins: { "@tailwindcss/postcss": {} } };
  ```
- `src/global.css`. Keep the utilities import unlayered so React Native Web defaults don't override it:
  ```css
  @import "tailwindcss/theme.css" layer(theme);
  @import "tailwindcss/preflight.css" layer(base);
  @import "tailwindcss/utilities.css";

  @import "nativewind/theme";
  ```
- `metro.config.js`:
  ```js
  const { getDefaultConfig } = require("expo/metro-config");
  const { withNativewind } = require("nativewind/metro");

  /** @type {import('expo/metro-config').MetroConfig} */
  const config = getDefaultConfig(__dirname);

  module.exports = withNativewind(config);
  ```
- `nativewind-env.d.ts`: `/// <reference types="react-native-css/types" />`, plus add it to `include` in `tsconfig.json`.

### 3. Wire up and smoke test

- Add `import "@/global.css";` as the first line of `src/app/_layout.tsx`.
- In `src/app/index.tsx`, replace the `StyleSheet` container with `className="flex-1 items-center justify-center"` and remove the unused `StyleSheet` import.

Done when the welcome text renders centered, as it did before.

## Verification

- `npx tsc --noEmit` passes, and `className` on `View` type-checks.
- `npx expo lint` passes.
- `npx expo-doctor` reports no new issues.
- `npx expo export --platform web` emits a CSS file containing `.flex-1`, `.items-center`, and `.justify-center`.
- `npx expo export --platform ios` bundles without lightningcss errors. Native styles compile into JS, so an empty web CSS file in this export is expected.
- End to end: `npx expo start --clear`, open on the iOS simulator and on web, and confirm "Welcome to Roam!" is centered. This machine has no Xcode CLI (`xcrun simctl` is missing), so the user runs the iOS check if it isn't installed first.

## AGENTS.md updates

Under "Who owns what", add:

- **Styling:** NativeWind v5 RC (Tailwind 4) via `className`. Setup follows https://www.nativewind.dev/v5/llms-full.txt: `src/global.css` (imported once in `src/app/_layout.tsx`), `metro.config.js`, `postcss.config.mjs`. Keep `nativewind`, `react-native-css`, `tailwindcss`, `@tailwindcss/postcss`, and `lightningcss` pinned to exact versions, with the `lightningcss` override in `package.json`.

## Result

Built as planned. `tsc`, `expo lint`, and `expo-doctor` (21/21) pass. The web export emits `.flex-1`, `.items-center`, and `.justify-center`, and the iOS export bundles cleanly. Visual checks on the iOS simulator and in the browser weren't run, because this machine has no Xcode CLI.
