// stub: replaced by the home plan
import { router } from "expo-router";
import { LogOut } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Text, Wordmark } from "@/components/ui";

export default function Home() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 gap-3 bg-canvas px-6" style={{ paddingTop: insets.top + 12 }}>
      <Wordmark />
      <Text variant="title" className="mt-7">
        You&apos;re signed in
      </Text>
      <Text tone="muted">Auth is mocked for now.</Text>
      <Button variant="secondary" title="Sign out" icon={LogOut} onPress={() => router.replace("/")} className="mt-4" />
    </View>
  );
}
