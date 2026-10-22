import appJson from "./app.json";

const appConfig = appJson.expo;
const existingExtra = (appConfig as { extra?: Record<string, unknown> }).extra;

export default {
  ...appConfig,
  extra: {
    ...existingExtra,
    posthogProjectToken: process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  },
};
