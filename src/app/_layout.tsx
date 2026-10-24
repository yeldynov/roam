import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { StripeProvider } from "@stripe/stripe-react-native";
import "@/global.css";
import Constants from "expo-constants";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { PostHogProvider } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { posthog } from "@/lib/posthog";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (!publishableKey) throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local");

const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

if (!stripeKey) throw new Error("Missing EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env.local");

// Where 3D Secure and bank redirects return to; Expo Go needs the `/--/` form
const stripeUrlScheme = Constants.appOwnership === "expo" ? Linking.createURL("/--/") : Linking.createURL("");

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "PlusJakartaSans-Regular": require("@/assets/fonts/PlusJakartaSans-Regular.ttf"),
    "PlusJakartaSans-Medium": require("@/assets/fonts/PlusJakartaSans-Medium.ttf"),
    "PlusJakartaSans-SemiBold": require("@/assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "PlusJakartaSans-Bold": require("@/assets/fonts/PlusJakartaSans-Bold.ttf"),
    "PlusJakartaSans-ExtraBold": require("@/assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
  });

  const app = (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <StripeProvider publishableKey={stripeKey} urlScheme={stripeUrlScheme}>
        {/* A font error falls back to the system font rather than a blank app */}
        <RootStack fontsReady={loaded || !!error} />
      </StripeProvider>
    </ClerkProvider>
  );

  return posthog ? <PostHogProvider client={posthog}>{app}</PostHogProvider> : app;
}

// Guard flips do the navigation: signing in drops the auth screens from history and lands on home, signing out lands on onboarding
function RootStack({ fontsReady }: { fontsReady: boolean }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const identifiedUserId = useRef<string | null>(null);
  const ready = fontsReady && isLoaded;

  // Identify once at the Clerk session boundary so lifecycle events, captures, and errors share this stable user id.
  useEffect(() => {
    if (!posthog || !isLoaded || !isUserLoaded) return;

    if (isSignedIn && user?.id) {
      if (identifiedUserId.current === user.id) return;
      if (identifiedUserId.current) posthog.reset();

      // Clerk user ID only: no email or name in PostHog, so account deletion leaves nothing personal behind
      posthog.identify(user.id);
      identifiedUserId.current = user.id;
    } else if (!isSignedIn && identifiedUserId.current) {
      posthog.reset();
      identifiedUserId.current = null;
    }
  }, [isLoaded, isSignedIn, isUserLoaded, user?.id]);

  // The splash covers session restore, so a signed-in launch never flashes onboarding
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!isSignedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="stay/[id]/index" />
        <Stack.Screen name="stay/[id]/ask" />
        <Stack.Screen name="stay/[id]/book" />
        <Stack.Screen name="account/settings" />
        <Stack.Screen name="account/personal-info" />
        <Stack.Screen name="host/index" />
        <Stack.Screen name="host/stay/[id]" />
        <Stack.Screen name="host/team" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="verify" />
      </Stack.Protected>
    </Stack>
  );
}
