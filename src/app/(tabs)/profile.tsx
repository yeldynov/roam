// stub: replaced by the profile plan
import { useClerk, useUser } from "@clerk/expo";
import { LogOut } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Text } from "@/components/ui";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { signOut } = useClerk();
  const { user } = useUser();
  return (
    <View className="flex-1 gap-3 bg-surface px-5" style={{ paddingTop: insets.top + 12 }}>
      <Text variant="title">{user?.fullName || "Profile"}</Text>
      <Text tone="muted">{user?.primaryEmailAddress?.emailAddress}</Text>
      {/* The root layout's guard moves to onboarding once the session ends */}
      <Button variant="secondary" title="Sign out" icon={LogOut} onPress={() => signOut()} className="mt-4" />
    </View>
  );
}
