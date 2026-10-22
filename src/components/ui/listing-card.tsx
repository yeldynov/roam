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
      className="flex-row gap-3 rounded-sm bg-surface shadow-card"
    >
      <StyledImage source={image} contentFit="cover" transition={200} className="h-37 w-36 rounded-sm bg-canvas" />
      <View className="flex-1 justify-center gap-1.5 py-2">
        {/* Clear of the 44pt save button */}
        <Text variant="headline" numberOfLines={2} className="pr-12">
          {title}
        </Text>
        <View className="flex-row items-center gap-1">
          <Icon icon={MapPin} size="sm" className="text-placeholder" />
          <Text variant="caption" tone="muted" weight="regular" numberOfLines={1} className="flex-1">
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
        <View className="flex-row flex-wrap gap-1.5">
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? "Remove from saved" : "Save"}
      accessibilityState={{ selected: !!saved }}
      hitSlop={4}
      onPress={onToggleSave}
      className="absolute right-1 top-1 size-11 items-center justify-center rounded-full bg-canvas active:opacity-70"
    >
      <Icon icon={Heart} size="lg" filled={saved} className={saved ? "text-danger" : "text-ink"} />
    </Pressable>
    </Animated.View>
    </View>
  );
}
