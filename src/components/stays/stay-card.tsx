import { Image } from "expo-image";
import { ChevronRight, MapPin, Star } from "lucide-react-native";
import { styled } from "nativewind";
import { View } from "react-native";

import { Icon, Text } from "@/components/ui";
import { imageUrl } from "@/lib/sanity";
import type { StaySummary } from "@/lib/stays";

const StyledImage = styled(Image, { className: "style" });

// Featured stay on Home. Not pressable until the stay detail plan; the › button is decorative
export function StayCard({ stay }: { stay: StaySummary }) {
  return (
    <View
      accessible
      accessibilityLabel={`${stay.title}, ${stay.location}, rated ${stay.rating.toFixed(1)}`}
      className="h-67 overflow-hidden rounded-xl bg-canvas"
    >
      <StyledImage source={imageUrl(stay.image, 1200)} contentFit="cover" transition={200} className="absolute inset-0" />
      <View className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-scrim to-transparent" />
      <View className="absolute right-3 top-3 h-10 flex-row items-center gap-1 rounded-full bg-white px-3">
        <Icon icon={Star} size="md" filled />
        <Text variant="headline">{stay.rating.toFixed(1)}</Text>
      </View>
      <View className="absolute bottom-5 left-5 right-24 gap-1">
        <View className="flex-row items-center gap-1">
          <Icon icon={MapPin} size="sm" className="text-white" />
          <Text variant="caption" tone="white" numberOfLines={1}>
            {stay.location}
          </Text>
        </View>
        <Text variant="title" tone="white" numberOfLines={2}>
          {stay.title}
        </Text>
      </View>
      <View className="absolute bottom-4 right-4 size-14 items-center justify-center rounded-full bg-white shadow-card">
        <Icon icon={ChevronRight} size="lg" />
      </View>
    </View>
  );
}
