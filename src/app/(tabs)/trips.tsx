import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { Heart } from "lucide-react-native";
import { styled } from "nativewind";
import { useCallback, useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cardBadges } from "@/components/stays/amenity-icons";
import { Reflow } from "@/components/stays/reflow";
import { Alert, Button, Icon, ListingCard, Text } from "@/components/ui";
import { formatDate, localDateString } from "@/lib/booking";
import { useTrips, type Trip } from "@/lib/booking-api";
import { useSaved } from "@/lib/saved";
import { imageUrl } from "@/lib/sanity";
import { useSavedStays } from "@/lib/stays";

export default function Trips() {
  const insets = useSafeAreaInsets();
  const { ids, isSaved, toggle } = useSaved();
  const { stays, error, retry } = useSavedStays(ids);
  // Bookings refetch whenever the tab is shown, so one made a moment ago appears
  const [focusCount, setFocusCount] = useState(0);
  useFocusEffect(useCallback(() => setFocusCount((n) => n + 1), []));
  const bookings = useTrips(focusCount);
  const today = localDateString(new Date());
  const upcoming = bookings.trips?.filter((t) => t.checkOut >= today) ?? [];
  const past = bookings.trips?.filter((t) => t.checkOut < today).reverse() ?? [];

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
        {bookings.trips?.length === 0 && <Text tone="muted">Stays you book will show up here.</Text>}
      </View>

      {bookings.error ? (
        <View className="gap-4">
          <Alert tone="danger" message="Couldn't load your bookings. Check your connection and try again." />
          <Button variant="secondary" title="Try again" icon={null} onPress={bookings.retry} />
        </View>
      ) : !bookings.trips ? (
        <View accessible accessibilityLabel="Loading bookings" className="h-24 rounded-sm bg-canvas" />
      ) : (
        <>
          <BookingSection title="Upcoming" trips={upcoming} />
          <BookingSection title="Past" trips={past} />
        </>
      )}

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

const StyledImage = styled(Image, { className: "style" });

function BookingSection({ title, trips }: { title: string; trips: Trip[] }) {
  if (!trips.length) return null;
  return (
    <View className="gap-3">
      <Text variant="headline">{title}</Text>
      {trips.map((t) => (
        <BookingRow key={t.id} trip={t} />
      ))}
    </View>
  );
}

function BookingRow({ trip }: { trip: Trip }) {
  const title = trip.stay?.title ?? "Stay no longer listed";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatDate(trip.checkIn)} to ${formatDate(trip.checkOut)}`}
      disabled={!trip.stay}
      unstable_pressDelay={80}
      onPress={() => router.push({ pathname: "/stay/[id]", params: { id: trip.stayId, from: "trips" } })}
      className="flex-row items-center gap-4 rounded-md bg-canvas p-3 active:opacity-70"
    >
      <StyledImage source={trip.stay && imageUrl(trip.stay.image, 300)} contentFit="cover" className="size-18 rounded-sm bg-line" />
      <View className="flex-1 gap-1">
        <Text weight="semibold" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" tone="muted">
          {formatDate(trip.checkIn)} – {formatDate(trip.checkOut)} · {trip.guests} guest{trip.guests === 1 ? "" : "s"}
        </Text>
        {trip.stay && (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {trip.stay.location}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
