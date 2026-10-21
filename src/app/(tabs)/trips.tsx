// stub: replaced by the trips plan
import { CalendarDays } from "lucide-react-native";
import { View } from "react-native";

import { Icon, Text } from "@/components/ui";

export default function Trips() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-surface px-5">
      <Icon icon={CalendarDays} size="lg" className="text-placeholder" />
      <Text variant="headline">No trips yet</Text>
      <Text tone="muted" className="text-center">
        Stays you book will show up here.
      </Text>
    </View>
  );
}
