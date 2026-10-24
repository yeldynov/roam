import Constants from "expo-constants";
import PostHog from "posthog-react-native";

const extra = Constants.expoConfig?.extra;
const projectToken = extra?.posthogProjectToken as string | undefined;
const host = extra?.posthogHost as string | undefined;

if (__DEV__ && !projectToken) {
  console.error(
    new Error(
      "EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
    ),
  );
}

if (__DEV__ && !host) {
  console.error(
    new Error(
      "EXPO_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once EXPO_PUBLIC_POSTHOG_HOST is configured",
    ),
  );
}

export const posthog = projectToken && host
  ? new PostHog(projectToken, {
      host,
      captureAppLifecycleEvents: true,
      // Dev and production share one project; dashboards filter on this. A super property would be lost on reset().
      before_send: (event) => ({ ...event, properties: { ...event.properties, environment: __DEV__ ? "development" : "production" } }),
      logs: {
        serviceName: "roam-mobile",
        environment: __DEV__ ? "development" : "production",
        serviceVersion: Constants.expoConfig?.version,
      },
      errorTracking: {
        autocapture: {
          uncaughtExceptions: true,
          unhandledRejections: true,
        },
      },
    })
  : undefined;

// The client takes debug as a call, not an option
posthog?.debug(__DEV__);
