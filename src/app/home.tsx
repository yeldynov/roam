// stub: replaced by the home plan
import { useClerk, useUser } from "@clerk/expo";
import { LogOut } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Text, Wordmark } from "@/components/ui";

export default function Home() {
  const insets = useSafeAreaInsets();
  const { signOut } = useClerk();
  const { user } = useUser();
  return (
    <View className="flex-1 gap-3 bg-canvas px-6" style={{ paddingTop: insets.top + 12 }}>
      <Wordmark />
      <Text variant="title" className="mt-7">
        You&apos;re signed in
      </Text>
      <Text tone="muted">Signed in as {user?.primaryEmailAddress?.emailAddress}</Text>
      {/* The root layout's guard moves to onboarding once the session ends */}
      <Button variant="secondary" title="Sign out" icon={LogOut} onPress={() => signOut()} className="mt-4" />
    </View>
  );
}
