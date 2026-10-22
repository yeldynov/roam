import { ChevronDown } from "lucide-react-native";
import { View } from "react-native";

import { Icon, Text } from "@/components/ui";

// The "Sort by Best match ⌄" trigger; the native menu around it handles the tap
export function SortLabel({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-1 py-2">
      <Text variant="caption" weight="regular">
        Sort by
      </Text>
      <Text variant="caption" weight="bold">
        {label}
      </Text>
      <Icon icon={ChevronDown} size="md" />
    </View>
  );
}
