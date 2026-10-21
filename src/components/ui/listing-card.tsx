import { Image } from "expo-image";
import { Heart, MapPin, Star, type LucideIcon } from "lucide-react-native";
import { styled } from "nativewind";
import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";

import { Badge } from "./badge";
import { Icon } from "./icon";
import { pressScale } from "./pressable-scale";
import { Text } from "./text";

const StyledImage = styled(Image, { className: "style" });

export type ListingCardProps = {
  image: string;
  title: string;
  location: string;
  rating: number;
  reviews: number;
  amenities: { label: string; icon: LucideIcon }[];
  /** Nightly price in whole dollars */
  price: number;
  saved?: boolean;
  onToggleSave?: () => void;
  onPress?: () => void;
  /** Layout only */
  className?: string;
};

export function ListingCard({ image, title, location, rating, reviews, amenities, price, saved, onToggleSave, onPress, className }: ListingCardProps) {
  const [pressed, setPressed] = useState(false);
  return (
    // The save button overlays the card as a sibling: nested buttons are invalid on web and for screen readers
    <View className={className}>
    <Animated.View style={pressScale(pressed)}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${location}, $${price} per night`}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      // A scroll that starts on the card shouldn't flash the press
      unstable_pressDelay={80}
      pressRetentionOffset={16}
      className="flex-row gap-4 rounded-lg bg-surface p-3 shadow-card"
    >
      <StyledImage source={image} contentFit="cover" className="size-40 rounded-md" />
      <View className="flex-1 justify-center gap-2">
        <Text variant="headline" numberOfLines={2}>
          {title}
        </Text>
        <View className="flex-row items-center gap-1">
          <Icon icon={MapPin} size="sm" className="text-placeholder" />
          <Text variant="caption" tone="muted" weight="regular" numberOfLines={1}>
            {location}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Icon icon={Star} size="sm" filled className="text-primary" />
          <Text variant="caption">{rating.toFixed(1)}</Text>
          <Text variant="caption" tone="muted" weight="regular">
            ({reviews})
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {amenities.map((a) => (
            <Badge key={a.label} label={a.label} icon={a.icon} size="sm" />
          ))}
        </View>
        <View className="flex-row items-baseline gap-1">
          <Text variant="headline">${price}</Text>
          <Text variant="caption" tone="placeholder" weight="regular">
            / night
          </Text>
        </View>
      </View>
    </Pressable>
    {/* Top-right of the 160 image: card padding 12 + 160 - 8 inset - 32 size = left 132 */}
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? "Remove from saved" : "Save"}
      accessibilityState={{ selected: !!saved }}
      hitSlop={8}
      onPress={onToggleSave}
      className="absolute left-33 top-5 size-8 items-center justify-center rounded-full bg-white active:opacity-70"
    >
      <Icon icon={Heart} size="sm" filled={saved} className={saved ? "text-danger" : "text-ink"} />
    </Pressable>
    </Animated.View>
    </View>
  );
}
