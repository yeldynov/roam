import { router } from "expo-router";
import { Heart } from "lucide-react-native";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cardBadges } from "@/components/stays/amenity-icons";
import { Reflow } from "@/components/stays/reflow";
import { Alert, Button, Icon, ListingCard, Text } from "@/components/ui";
import { useSaved } from "@/lib/saved";
import { imageUrl } from "@/lib/sanity";
import { useSavedStays } from "@/lib/stays";

export default function Trips() {
  const insets = useSafeAreaInsets();
  const { ids, isSaved, toggle } = useSaved();
  const { stays, error, retry } = useSavedStays(ids);

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="gap-4 px-5 pb-6 pt-3"
      // iOS insets the first ScrollView under NativeTabs automatically; Android only gets the bottom inset
      contentContainerStyle={Platform.OS === "android" ? { paddingTop: insets.top + 12 } : undefined}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="gap-1">
        <Text variant="title">Trips</Text>
        <Text tone="muted">Stays you book will show up here.</Text>
      </View>

      <Text variant="headline" className="mt-2">
        Saved
      </Text>

      {error ? (
        <View className="gap-4">
          <Alert tone="danger" message="Couldn't load saved stays. Check your connection and try again." />
          <Button variant="secondary" title="Try again" icon={null} onPress={retry} />
        </View>
      ) : !stays ? (
        <View accessible accessibilityLabel="Loading saved stays" className="gap-4">
          {ids.slice(0, 3).map((id) => (
            <View key={id} className="h-37 rounded-sm bg-canvas" />
          ))}
        </View>
      ) : stays.length === 0 ? (
        <View className="items-center gap-2 py-12">
          <Icon icon={Heart} size="lg" className="text-placeholder" />
          <Text variant="headline" className="text-center">
            No saved stays yet
          </Text>
          <Text tone="muted" className="text-center">
            Tap the heart on a stay to save it here.
          </Text>
        </View>
      ) : (
        <View className="gap-4">
          {stays.map((s) => (
            <Reflow key={s.id}>
              <ListingCard
                image={imageUrl(s.image, 400)}
                title={s.title}
                location={s.location}
                rating={s.rating}
                reviews={s.reviewCount}
                price={s.nightlyPrice}
                amenities={cardBadges(s, [])}
                saved={isSaved(s.id)}
                onPress={() => router.push({ pathname: "/stay/[id]", params: { id: s.id, from: "saved" } })}
                onToggleSave={() => toggle(s.id, "trips")}
              />
            </Reflow>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
