import { Link } from "expo-router";
import { View } from "react-native";

import { Text } from "@/components/ui";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-canvas p-4">
      <Text variant="display">Find your next stay</Text>
      <Link href="/design-system">
        <Text variant="caption" tone="lavender">Open design system</Text>
      </Link>
    </View>
  );
}
