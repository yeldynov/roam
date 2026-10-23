import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft, ChevronRight, FileText, Heart, MapPin, MessagesSquare, Share as ShareIcon, Star } from "lucide-react-native";
import { styled } from "nativewind";
import { useEffect, useState, type ReactNode } from "react";
import { Alert as NativeAlert, Pressable, ScrollView, Share, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cardBadges, SETTING_BADGES } from "@/components/stays/amenity-icons";
import { InfoSheet, Paragraphs } from "@/components/stays/info-sheet";
import { Alert, Button, Icon, IconButton, ListRow, Text } from "@/components/ui";
import { posthog } from "@/lib/posthog";
import { imageUrl } from "@/lib/sanity";
import { useSaved } from "@/lib/saved";
import { useStay, type StayDetails } from "@/lib/stays";

const StyledImage = styled(Image, { className: "style" });

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function StayScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: "home" | "search" | "saved" }>();
  const { stay, error, retry } = useStay(id);

  useEffect(() => {
    if (!stay) return;
    posthog?.capture("stay_viewed", {
      stay_id: stay.id,
      source: from ?? "link",
      property_type: stay.propertyType,
      setting: stay.setting,
    });
  }, [stay, from]);

  if (stay) return <Details stay={stay} />;

  return (
    <View className="flex-1 bg-surface">
      {error ? (
        <View className="flex-1 justify-center gap-4 px-5">
          <Alert tone="danger" message="Couldn't load this stay. Check your connection and try again." />
          <Button variant="secondary" title="Try again" icon={null} onPress={retry} />
        </View>
      ) : stay === null ? (
        <View className="flex-1 justify-center gap-2 px-5">
          <Text variant="headline" className="text-center">
            This stay isn&apos;t available
          </Text>
          <Text tone="muted" className="text-center">
            It may have been removed.
          </Text>
          <Button variant="secondary" title="Back" icon={null} className="mt-2" onPress={() => router.back()} />
        </View>
      ) : (
        <View accessible accessibilityLabel="Loading stay">
          <View className="h-84 bg-canvas" />
          <View className="gap-3 px-5 pt-6">
            <View className="h-8 w-3/4 rounded-sm bg-canvas" />
            <View className="h-5 w-1/2 rounded-sm bg-canvas" />
            <View className="mt-4 h-20 rounded-md bg-canvas" />
          </View>
        </View>
      )}
      <TopBar />
    </View>
  );
}

function Details({ stay }: { stay: StayDetails }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [photo, setPhoto] = useState(0);
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(stay.id);
  const [sheet, setSheet] = useState<"cancellation" | "host" | null>(null);
  const location = `${stay.location.city}, ${stay.location.region}`;
  const policy = stay.cancellationPolicy;
  const features = [...cardBadges(stay, [], 3), SETTING_BADGES[stay.setting]].filter(Boolean);
  const rooms = [
    plural(stay.maxGuests, "guest"),
    stay.bedrooms ? plural(stay.bedrooms, "bedroom") : "Studio",
    plural(stay.beds, "bed"),
    plural(stay.bathrooms, "bath"),
  ].join(" · ");

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style="light" />
      <ScrollView className="flex-1" contentInsetAdjustmentBehavior="never">
        <View className="h-84">
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPhoto(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {stay.photos.map((p) => (
              <StyledImage
                key={p.url}
                source={imageUrl(p.url, 1200)}
                accessibilityLabel={p.alt}
                contentFit="cover"
                transition={200}
                className="h-84 bg-canvas"
                style={{ width }}
              />
            ))}
          </ScrollView>
          {stay.photos.length > 1 && (
            <View className="absolute bottom-10 right-4 rounded-full bg-scrim px-3 py-1.5">
              <Text variant="caption" tone="white">
                {photo + 1} / {stay.photos.length}
              </Text>
            </View>
          )}
        </View>

        <View className="-mt-6 rounded-t-xl bg-surface px-5 pb-6 pt-6">
          <View className="flex-row items-start gap-4">
            <Text variant="title" className="flex-1">
              {stay.title}
            </Text>
            <View
              accessible
              accessibilityLabel={`Rated ${stay.rating.toFixed(1)} from ${stay.reviewCount} reviews`}
              className="items-center rounded-md bg-canvas px-3 py-2"
            >
              <View className="flex-row items-center gap-1">
                <Icon icon={Star} size="md" filled className="text-primary" />
                <Text variant="headline">{stay.rating.toFixed(1)}</Text>
              </View>
              <Text variant="caption" tone="muted" weight="regular">
                ({stay.reviewCount})
              </Text>
            </View>
          </View>
          <View className="mt-2 flex-row items-center gap-2">
            <Icon icon={MapPin} size="lg" />
            <Text weight="medium">{location}</Text>
          </View>

          <View className="mt-6 flex-row">
            {features.map((f) => (
              <View key={f.label} className="flex-1 items-center gap-2">
                <Icon icon={f.icon} size="lg" />
                <Text variant="caption" weight="regular" className="text-center">
                  {f.label}
                </Text>
              </View>
            ))}
          </View>

          <View className="mt-5 h-px bg-line" />
          <View className="mt-4 gap-3">
            <ListRow
              variant="policy"
              icon={MessagesSquare}
              title="Ask about policies"
              subtitle="Cancellation, house rules, pets, check-in and more."
              onPress={() => router.push({ pathname: "/stay/[id]/ask", params: { id: stay.id } })}
            />
            <ListRow
              variant="policy"
              icon={FileText}
              title={policy.freeCancellationHours > 0 ? "Free cancellation" : policy.title}
              subtitle={policy.summary ?? undefined}
              onPress={() => setSheet("cancellation")}
            />
          </View>

          <View className="mt-4 h-px bg-line" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Hosted by ${stay.host.name}`}
            onPress={() => setSheet("host")}
            className="flex-row items-center gap-4 py-4 active:opacity-70"
          >
            <StyledImage source={stay.host.photo && imageUrl(stay.host.photo, 200)} contentFit="cover" className="size-16 rounded-full bg-canvas" />
            <Text variant="headline" className="flex-1">
              Hosted by {stay.host.name.split(" ")[0]}
            </Text>
            <Icon icon={ChevronRight} size="lg" />
          </Pressable>

          <View className="h-px bg-line" />
          <View className="mt-5 gap-3">
            <Text variant="caption" tone="muted">
              {rooms}
            </Text>
            <Paragraphs text={stay.description} />
          </View>
        </View>
      </ScrollView>

      <View className="flex-row items-center gap-6 border-t border-line bg-surface px-5 pt-4" style={{ paddingBottom: insets.bottom + 8 }}>
        <View className="flex-row items-baseline gap-1">
          <Text variant="title">${stay.nightlyPrice}</Text>
          <Text>/ night</Text>
        </View>
        <Button title="Book this stay" icon={null} className="flex-1" onPress={() => NativeAlert.alert("Coming soon", "Booking isn't available yet.")} />
      </View>

      <TopBar>
        <IconButton
          variant="surface"
          icon={ShareIcon}
          accessibilityLabel="Share"
          onPress={() => Share.share({ message: `${stay.title} in ${location} on Roam` })}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? "Remove from saved" : "Save"}
          accessibilityState={{ selected: saved }}
          onPress={() => toggle(stay.id, "stay")}
          className="size-14 items-center justify-center rounded-full bg-surface shadow-card active:opacity-70"
        >
          <Icon icon={Heart} size="lg" filled={saved} className={saved ? "text-danger" : "text-ink"} />
        </Pressable>
      </TopBar>

      <InfoSheet visible={sheet === "cancellation"} title={policy.title} onClose={() => setSheet(null)}>
        <Paragraphs text={policy.body} />
      </InfoSheet>
      <InfoSheet visible={sheet === "host"} title={stay.host.name} onClose={() => setSheet(null)}>
        <StyledImage source={stay.host.photo && imageUrl(stay.host.photo, 400)} contentFit="cover" className="size-24 rounded-full bg-canvas" />
        {stay.host.bio && <Paragraphs text={stay.host.bio} />}
      </InfoSheet>
    </View>
  );
}

// Back on the left, the screen's actions on the right, over the photo
function TopBar({ children }: { children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="absolute inset-x-4 flex-row justify-between" style={{ top: insets.top + 8 }}>
      <IconButton variant="surface" icon={ChevronLeft} accessibilityLabel="Back" onPress={() => router.back()} />
      <View className="flex-row gap-3">{children}</View>
    </View>
  );
}
