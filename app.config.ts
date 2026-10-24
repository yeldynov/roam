import type { ConfigContext, ExpoConfig } from "expo/config";

// app.json is the static base; this adds the PostHog values from env at build time
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  extra: {
    ...config.extra,
    posthogProjectToken: process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  },
});
