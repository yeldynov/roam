import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import "@/global.css";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { PostHogProvider } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { posthog } from "@/lib/posthog";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (!publishableKey) throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local");

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
      {/* A font error falls back to the system font rather than a blank app */}
      <RootStack fontsReady={loaded || !!error} />
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

      posthog.identify(user.id, {
        $set: {
          ...(user.primaryEmailAddress?.emailAddress && { email: user.primaryEmailAddress.emailAddress }),
          ...(user.fullName && { name: user.fullName }),
        },
      });
      identifiedUserId.current = user.id;
    } else if (!isSignedIn && identifiedUserId.current) {
      posthog.reset();
      identifiedUserId.current = null;
    }
  }, [isLoaded, isSignedIn, isUserLoaded, user?.fullName, user?.id, user?.primaryEmailAddress?.emailAddress]);

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
